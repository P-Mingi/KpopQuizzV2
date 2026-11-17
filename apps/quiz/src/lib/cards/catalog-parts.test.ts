// Lot 7: the catalog payload for a group photo in 2 or 3 cards and its panorama (pure buildCatalog, no database).
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));

import { buildCatalog, cardImage, partSuffix } from './catalog';

import type { PanoramaRow } from './catalog';

const base = 'https://x.supabase.co';
const pub = (path: string): string => `${base}/storage/v1/object/public/cards/${path}`;
const src = `${base}/storage/v1/object/public/images/group-photos/aurora.jpg`;

const entities = [
  { id: 'group:Q1', kind: 'group' as const, name: 'Aurora', group_id: null, debut_year: 2020, sort_key: 'aurora', lock_reasons: null },
  { id: 'group:Q9', kind: 'group' as const, name: 'Zenith', group_id: null, debut_year: 2021, sort_key: 'zenith', lock_reasons: null, age_lock: true },
];
const photoRow = (id: number, o: Record<string, unknown> = {}) => ({
  id, slot: 1, source: 'commons' as const, source_page: 'p', author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'l', share_alike: false, modified: 'm',
  focal_x: 50, focal_y: 30, storage_path: 'aurora', source_path: 'images/group-photos/aurora.jpg', file_focal_x: 50 as number | null, file_focal_y: 30 as number | null, small_2x: false, ...o,
});
const cardRow = (n: number, entity: string, part: number, rarity: 'C' | 'U', photo: number, o: Record<string, unknown> = {}) => ({
  card_no: n, num: `BV1-${String(n).padStart(4, '0')}`, entity_id: entity, rarity, edition: rarity === 'C' ? ('std' as const) : ('stage' as const), photo_id: photo, part, small_2x: false, ...o,
});
const pano = (no: number, entity: string, rarity: 'C' | 'U', photo: number, parts: number): PanoramaRow => ({
  pano_no: no, num: `P-${String(no).padStart(4, '0')}`, entity_id: entity, rarity, edition: rarity === 'C' ? 'std' : 'stage', photo_id: photo, parts, first_card: 1,
});

const three = [cardRow(1, 'group:Q1', 1, 'C', 1), cardRow(2, 'group:Q1', 2, 'C', 1), cardRow(3, 'group:Q1', 3, 'C', 1)];
const two = [cardRow(4, 'group:Q1', 1, 'U', 2), cardRow(5, 'group:Q1', 2, 'U', 2)];

describe('the part files', () => {
  it('partSuffix: -h1/-h2 for a pair (default), -t1..-t3 for a photo in 3, nothing for a whole card or a part beyond the photo', () => {
    expect([0, 1, 2].map((x) => partSuffix(x as 0 | 1 | 2))).toEqual(['', '-h1', '-h2']);
    expect([1, 2, 3].map((x) => partSuffix(x as 1 | 2 | 3, 3))).toEqual(['-t1', '-t2', '-t3']);
    expect(partSuffix(3, 2)).toBe('');
    expect(partSuffix(0, 3)).toBe('');
  });
  it('a part of a photo in 3 uses its third when the files were cut for 3 at the focal point; a pair keeps its halves', () => {
    const p3 = photoRow(1, { parts: 3, file_parts: 3 });
    expect(cardImage(p3, base, { part: 3 })).toMatchObject({ url: pub('aurora-t3-1x.webp'), url2x: pub('aurora-t3-2x.webp'), css: false, part: 3, parts: 3 });
    expect(cardImage(photoRow(2), base, { part: 2 })).toMatchObject({ url: pub('aurora-h2-1x.webp'), css: false, part: 2, parts: 2 });
    expect(cardImage(photoRow(2, { parts: 2, file_parts: null }), base, { part: 1 }).url).toBe(pub('aurora-h1-1x.webp'));
  });
  it('files cut for another number of parts are never used: the source photo is cropped in CSS', () => {
    for (const row of [photoRow(1, { parts: 3, file_parts: 2 }), photoRow(1, { parts: 3, file_parts: null }), photoRow(1, { parts: 2, file_parts: 3 })]) {
      expect(cardImage(row, base, { part: 1 })).toMatchObject({ url: src, url2x: null, css: true });
    }
    // A whole card is not a part: its file does not depend on file_parts.
    expect(cardImage(photoRow(1, { parts: 3, file_parts: 2 }), base, { part: 0 }).css).toBe(false);
  });
  it('a part narrower than 640 px has no 2x', () => {
    expect(cardImage(photoRow(1, { parts: 3, file_parts: 3 }), base, { part: 2, small_2x: true }).url2x).toBeNull();
  });
});

describe('the catalog of a photo in 3 and in 2, with their panoramas', () => {
  const photos = [photoRow(1, { parts: 3, file_parts: 3, file_pano: true }), photoRow(2, { parts: 2, file_parts: 2, file_pano: false })];
  const pl = buildCatalog([...three, ...two], entities, photos, 'now', base, new Set(), [pano(1, 'group:Q1', 'C', 1, 3), pano(2, 'group:Q1', 'U', 2, 2)]);

  it('each part carries part, parts, setNs and pano; pairN stays on a pair and is null on a photo in 3', () => {
    const c = (n: number) => pl.cards.find((x) => x.n === n)!;
    expect(c(2)).toMatchObject({ part: 2, parts: 3, setNs: [1, 2, 3], pano: 1, pairN: null });
    expect(c(3)).toMatchObject({ part: 3, parts: 3, setNs: [1, 2, 3], pano: 1 });
    expect(c(4)).toMatchObject({ part: 1, parts: 2, setNs: [4, 5], pano: 2, pairN: 5 });
    expect(c(5)).toMatchObject({ part: 2, parts: 2, setNs: [4, 5], pano: 2, pairN: 4 });
    expect(c(3).image?.url).toBe(pub('aurora-t3-1x.webp'));
  });
  it('the panorama of a photo in 3 uses its -p3 file and its 2x; its parts and credit are listed', () => {
    const p = pl.panoramas!.find((x) => x.p === 1)!;
    expect(p).toMatchObject({ num: 'P-0001', entity: 'group:Q1', rarity: 'C', edition: 'std', name: 'Aurora', parts: 3, cards: [1, 2, 3] });
    expect(p.photo?.id).toBe(1);
    expect(p.image).toEqual({ url: pub('aurora-p3-1x.webp'), url2x: pub('aurora-p3-2x.webp'), partUrls: null, sourceUrl: src, focalX: 50, focalY: 30, small2x: false });
  });
  it('without the panorama file the parts left to right are used (halves of a pair, thirds of 3)', () => {
    const p = pl.panoramas!.find((x) => x.p === 2)!;
    expect(p.image).toMatchObject({ url: null, url2x: null, partUrls: [pub('aurora-h1-1x.webp'), pub('aurora-h2-1x.webp')], sourceUrl: src });
    const t = buildCatalog(three, entities, [photoRow(1, { parts: 3, file_parts: 3, file_pano: false })], 'now', base, new Set(), [pano(1, 'group:Q1', 'C', 1, 3)]);
    expect(t.panoramas![0]!.image!.partUrls).toEqual([pub('aurora-t1-1x.webp'), pub('aurora-t2-1x.webp'), pub('aurora-t3-1x.webp')]);
  });
  it('when nothing matches (the focal point moved, or the files were cut for 2 and the photo is now 3) the source photo is cropped in CSS', () => {
    for (const row of [photoRow(1, { parts: 3, file_parts: 3, file_pano: true, focal_x: 60 }), photoRow(1, { parts: 3, file_parts: 2, file_pano: true }), photoRow(1, { parts: 3, file_parts: null, file_pano: true })]) {
      const t = buildCatalog(three, entities, [row], 'now', base, new Set(), [pano(1, 'group:Q1', 'C', 1, 3)]);
      expect(t.panoramas![0]!.image).toMatchObject({ url: null, url2x: null, partUrls: null, sourceUrl: src });
    }
  });
  it('the panorama has no 2x when a part is narrower than 640 px', () => {
    const rows = three.map((r, i) => (i === 1 ? { ...r, small_2x: true } : r));
    const t = buildCatalog(rows, entities, [photoRow(1, { parts: 3, file_parts: 3, file_pano: true })], 'now', base, new Set(), [pano(1, 'group:Q1', 'C', 1, 3)]);
    expect(t.panoramas![0]!.image).toMatchObject({ url: pub('aurora-p3-1x.webp'), url2x: null, small2x: true });
  });
  it('a panorama is listed only when every part is in packs and its subject is not age-locked', () => {
    const missing = buildCatalog([three[0]!, three[2]!], entities, photos, 'now', base, new Set(), [pano(1, 'group:Q1', 'C', 1, 3)]);
    expect(missing.panoramas).toEqual([]);
    expect(missing.cards.every((c) => c.pano === undefined)).toBe(true);
    const lockedRows = [cardRow(10, 'group:Q9', 1, 'C', 1), cardRow(11, 'group:Q9', 2, 'C', 1)];
    const locked = buildCatalog([...three, ...lockedRows], entities, photos, 'now', base, new Set(['group:Q9']), [pano(1, 'group:Q1', 'C', 1, 3), pano(3, 'group:Q9', 'C', 1, 2)]);
    expect(locked.panoramas!.map((x) => x.p)).toEqual([1]);
    expect(locked.cards.some((c) => c.entity === 'group:Q9')).toBe(false);
  });
  it('before file 118 (no panorama read) the payload has no panoramas key, and parts read as a pair', () => {
    const old = buildCatalog(two, entities, [photoRow(2)], 'now', base);
    expect(old).not.toHaveProperty('panoramas');
    expect(old.cards[0]).toMatchObject({ part: 1, parts: 2, pairN: 5, setNs: [4, 5] });
    expect(old.cards[0]).not.toHaveProperty('pano');
  });
});
