import { describe, expect, it } from 'vitest';

import { buildCatalog, cardImage } from './catalog';
import { KIND_RARITIES, SOURCE_NAMES } from './rules';
import { fromPayload } from './ui-catalog';
import { buildSlim, photoPicture } from './ui-model';

const BASE = 'https://x.supabase.co';
const ph = (over: Record<string, unknown> = {}) => ({
  id: 1, slot: 1, source: 'commons' as const, source_page: 'p', author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'l',
  share_alike: false, modified: 'm', focal_x: 50, focal_y: 30, storage_path: 'jennie', source_path: 'images/group-photos/jennie.jpg',
  file_focal_x: 50 as number | null, file_focal_y: 30 as number | null, small_2x: false, ...over,
});
const catalogWith = (over: Record<string, unknown>) => fromPayload(buildCatalog(
  [{ card_no: 1, num: 'BV1-0001', entity_id: 'idol:Q1', rarity: 'C', edition: 'std', photo_id: 1 }],
  [{ id: 'idol:Q1', kind: 'idol', name: 'Jennie', group_id: null, debut_year: 2016, sort_key: 'j', lock_reasons: null }],
  [ph(over)], '2026-11-12T00:00:00Z', BASE));
const pic = (over: Record<string, unknown> = {}) => photoPicture(catalogWith(over).cards[0]!.photo);

describe('the picture of a card follows the file focal point', () => {
  it('serves the cropped WebP with a 1x/2x srcset while the file focal point is the current one', () => {
    expect(pic()).toEqual({ src: `${BASE}/storage/v1/object/public/cards/jennie-1x.webp`, srcSet: `${BASE}/storage/v1/object/public/cards/jennie-1x.webp 1x, ${BASE}/storage/v1/object/public/cards/jennie-2x.webp 2x`, cut: true });
  });
  it('a small_2x photo has the 1x file and no srcset', () => {
    expect(pic({ small_2x: true })).toMatchObject({ srcSet: null, cut: true });
  });
  it('serves the source photo (cropped by CSS) once the focal point moved, when no file exists, or when the file focal point is unknown', () => {
    const source = { src: `${BASE}/storage/v1/object/public/images/group-photos/jennie.jpg`, srcSet: null, cut: false };
    expect(pic({ focal_x: 60 })).toEqual(source);
    expect(pic({ storage_path: null })).toEqual(source);
    expect(pic({ file_focal_x: null, file_focal_y: null })).toEqual(source);
  });
  it('the slim card keeps the focal point for object-position', () => {
    const c = buildSlim(catalogWith({ focal_x: 60 })).cards[0]!;
    expect([c.fx, c.fy]).toEqual([60, 30]);
  });
  it('the payload image and the UI photo hold the same facts (no second mapping)', () => {
    const i = cardImage(ph(), BASE);
    const p = catalogWith({}).cards[0]!.photo!;
    expect([p.url, p.url2x, p.fileFocalX, p.fileFocalY, p.sourceUrl, p.focalX, p.focalY]).toEqual([i.url, i.url2x, i.fileFocalX, i.fileFocalY, i.sourceUrl, i.focalX, i.focalY]);
  });
});

describe('rules shared with the UI', () => {
  it('a group exists in C, U, R, UR (amendment 1)', () => {
    expect(KIND_RARITIES.group).toEqual(['C', 'U', 'R', 'UR']);
  });
  it('SOURCE_NAMES names the four sources', () => {
    expect(SOURCE_NAMES.commons).toBe('Wikimedia Commons');
    expect(Object.keys(SOURCE_NAMES).sort()).toEqual(['commons', 'dvids', 'flickr', 'koreanet']);
  });
});

describe('review 1 finding 5: an entity with no card has no pocket', () => {
  it('the group line of a person (BLACKPINK for Jennie) gets no locked pocket, no section of its own and no binder page', async () => {
    const { paginate } = await import('./ui-model');
    const cat = fromPayload(buildCatalog(
      [1, 2, 3, 4].map((n, i) => ({ card_no: n, num: `BV1-000${n}`, entity_id: 'idol:jennie', rarity: (['C', 'U', 'R', 'UR'] as const)[i]!, edition: (['std', 'stage', 'holo', 'gold'] as const)[i]!, photo_id: 1 })),
      [
        { id: 'group:blackpink', kind: 'group', name: 'BLACKPINK', group_id: null, debut_year: 2016, sort_key: 'blackpink|1|blackpink', lock_reasons: {} },
        { id: 'group:twice', kind: 'group', name: 'TWICE', group_id: null, debut_year: 2015, sort_key: 'twice|1|twice', lock_reasons: {} },
        { id: 'idol:jennie', kind: 'idol', name: 'Jennie', group_id: 'group:blackpink', debut_year: 2016, sort_key: 'blackpink|0|jennie', lock_reasons: { SR: 'one', L: 'one' } },
      ],
      [ph()], '2026-11-12T00:00:00Z', BASE));
    const slim = buildSlim(cat);
    expect(slim.items.filter((it) => it.locked && it.entity !== 'idol:jennie')).toEqual([]);
    expect(slim.items.map((it) => (it.locked ? `lock:${it.rarity}` : it.card.num))).toEqual(['BV1-0001', 'BV1-0002', 'BV1-0003', 'lock:SR', 'BV1-0004', 'lock:L']);
    expect(slim.sections.map((x) => [x.name, x.ns])).toEqual([['BLACKPINK', [1, 2, 3, 4]]]);
    expect(Object.keys(slim.locks)).toEqual(['idol:jennie']);
    expect(paginate(slim.items).length).toBe(1);
  });
});
