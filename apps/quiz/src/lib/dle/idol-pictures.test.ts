// Kpopdle (idol) pictures: the order trivia, then KpopCards, then initials; what never resolves (a locked subject, a photo that is not live, an unlicensed or uncredited one, one with no
// file of ours, an ambiguous Wikidata id); the credit of the photos used; the server markup of a tile with a picture. No network, no database.
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { creditSections, HubCreditsPage } from '@/components/hub/credits/hub-credits';
import { Avatar } from '@/components/hub/dle/dle-avatar';

import { cardLicence, nameKey, resolveIdolPictures } from './idol-pictures';

import type { CardsEntityRow, CardsPhotoRow, PoolIdol } from './idol-pictures';
import type { PublicPicture } from '@/lib/photos/public-read';

const BASE = 'https://proj.supabase.co';
const idol = (id: string, name: string, qid: string | null, thumb: string | null = null): PoolIdol => ({ id, name, thumb, qid });
const entity = (id: string, name: string, qid: string | null, over: Partial<CardsEntityRow> = {}): CardsEntityRow => ({ id, kind: 'idol', name, qid, active: true, ...over });
let n = 0;
const photo = (entityId: string, over: Partial<CardsPhotoRow> = {}): CardsPhotoRow => ({
  id: ++n, entity_id: entityId, slot: 1, status: 'auto', source_page: 'https://commons.wikimedia.org/wiki/File:A.jpg', author: 'Jane Doe', author_url: null, licence: 'CC BY 4.0',
  licence_url: 'https://creativecommons.org/licenses/by/4.0', share_alike: false, focal_x: 50, focal_y: 30, storage_path: `cards/${entityId.replace(':', '-')}-${n}`,
  source_path: null, file_focal_x: 50, file_focal_y: 30, small_2x: false, ...over,
});
const trivia = (slug: string, over: Partial<PublicPicture> = {}): PublicPicture => ({
  site: 'kpop', kind: 'idol', slug, url: `https://s/${slug}.webp`, thumb: `https://s/${slug}-96.webp`, position: '50% 40%', name: 'x', needsCredit: true, sourceUrl: null, author: 'T', license: 'cc_by', licenseNote: null, updatedAt: '', ...over,
});
const run = (idols: PoolIdol[], entities: CardsEntityRow[], photos: CardsPhotoRow[], extra: { trivia?: PublicPicture[]; locked?: string[] } = {}) =>
  resolveIdolPictures({ idols, trivia: extra.trivia ?? [], entities, photos, locked: new Set(extra.locked ?? []), base: BASE });

describe('the order: trivia, then KpopCards, then initials', () => {
  it('the pool thumb wins over a KpopCards photo and over a verified row', () => {
    const r = run([idol('1', 'Ana', 'Q1', 'https://s/1-96.webp')], [entity('idol:ana', 'Ana', 'Q1')], [photo('idol:ana')], { trivia: [trivia('1')] });
    expect(r.thumbs['1']).toBeUndefined();
    expect(r.counts).toEqual({ trivia: 1, cards: 0, none: 0 });
    expect(r.credits).toEqual([]);
  });

  it('a verified row beats a KpopCards photo when the pool has not caught up', () => {
    const r = run([idol('1', 'Ana', 'Q1')], [entity('idol:ana', 'Ana', 'Q1')], [photo('idol:ana')], { trivia: [trivia('1')] });
    expect(r.thumbs['1']).toEqual({ src: 'https://s/1-96.webp', position: '50% 40%', from: 'trivia' });
    expect(r.counts.trivia).toBe(1);
    expect(r.credits).toEqual([]);
  });

  it('KpopCards when there is no trivia picture: the cut card file, the face position, the large picture of the result', () => {
    const p = photo('idol:ana');
    const r = run([idol('1', 'Ana', 'Q1')], [entity('idol:ana', 'Ana', 'Q1')], [p]);
    expect(r.thumbs['1']).toEqual({ src: `${BASE}/storage/v1/object/public/cards/${p.storage_path}-1x.webp`, position: '50% 24%', from: 'cards' });
    expect(r.pictures['1']!.url).toBe(r.thumbs['1']!.src);
    expect(r.counts).toEqual({ trivia: 0, cards: 1, none: 0 });
  });

  it('initials (nothing) for an idol with no Wikidata id, no subject or no photo', () => {
    const r = run([idol('1', 'Ana', null), idol('2', 'Bo', 'Q2'), idol('3', 'Cy', 'Q3')], [entity('idol:bo', 'Bo', 'Q2')], [photo('idol:bo', { status: 'pending' })]);
    expect(r.thumbs).toEqual({});
    expect(r.counts).toEqual({ trivia: 0, cards: 0, none: 3 });
  });
});

describe('what never resolves (fail closed)', () => {
  const one = (e: Partial<CardsEntityRow>, p: Partial<CardsPhotoRow>, locked: string[] = []) =>
    run([idol('1', 'Ana', 'Q1')], [entity('idol:ana', 'Ana', 'Q1', e)], [photo('idol:ana', p)], { locked });

  it('a locked (minor) subject, even with a live photo', () => {
    expect(one({ age_lock: true }, {}, ['idol:ana']).counts.cards).toBe(0);
    expect(one({ age_lock: true }, {}, []).counts.cards).toBe(1); // the database says it is open
  });
  it('an inactive subject, a photo not live (pending, rejected, removed)', () => {
    expect(one({ active: false }, {}).counts.cards).toBe(0);
    for (const status of ['pending', 'rejected', 'removed']) expect(one({}, { status }).counts.cards).toBe(0);
    expect(one({}, { status: 'approved' }).counts.cards).toBe(1);
  });
  it('an unlicensed photo: NC, ND, an unknown licence, no author', () => {
    for (const licence of ['CC BY-NC 4.0', 'CC BY-ND 2.0', 'All rights reserved', '']) expect(one({}, { licence }).counts.cards).toBe(0);
    expect(one({}, { author: '  ' }).counts.cards).toBe(0);
  });
  it('a photo with no file of ours (the harvest before the owner publishes the card files) and a non-https file', () => {
    expect(one({}, { storage_path: null, source_path: null }).counts.cards).toBe(0);
    const r = run([idol('1', 'Ana', 'Q1')], [entity('idol:ana', 'Ana', 'Q1')], [photo('idol:ana')]);
    expect(r.thumbs['1']!.src.startsWith('https://')).toBe(true);
    const http = resolveIdolPictures({ idols: [idol('1', 'Ana', 'Q1')], trivia: [], entities: [entity('idol:ana', 'Ana', 'Q1')], photos: [photo('idol:ana')], locked: new Set(), base: 'http://x' });
    expect(http.counts.cards).toBe(0);
  });
  it('the next live photo is taken when the first one is refused, the lowest slot first', () => {
    const bad = photo('idol:ana', { slot: 1, licence: 'CC BY-NC 2.0' });
    const good2 = photo('idol:ana', { slot: 2 });
    const good3 = photo('idol:ana', { slot: 3 });
    const r = run([idol('1', 'Ana', 'Q1')], [entity('idol:ana', 'Ana', 'Q1')], [good3, bad, good2]);
    expect(r.thumbs['1']!.src).toContain(good2.storage_path!);
  });
  it('a Wikidata id held by two card subjects resolves nobody', () => {
    const r = run([idol('1', 'Ana', 'Q1')], [entity('idol:a', 'Ana', 'Q1'), entity('idol:b', 'Ana', 'Q1')], [photo('idol:a'), photo('idol:b')]);
    expect(r.counts.cards).toBe(0);
  });
  it('a card subject of another kind never matches', () => {
    expect(run([idol('1', 'Ana', 'Q1')], [entity('group:ana', 'Ana', 'Q1', { kind: 'group' })], [photo('group:ana')]).counts.cards).toBe(0);
  });
});

describe('two idol rows of one Wikidata id (Kai, DK, The8, S.Coups)', () => {
  const subject = entity('idol:kai-exo', 'Kai', 'Q9');
  const p = photo('idol:kai-exo');
  it('only the row of the subject\'s name gets the photo', () => {
    const r = run([idol('175', 'Kai', 'Q9'), idol('900', 'Kim Jong-in', 'Q9')], [subject], [p]);
    expect(Object.keys(r.thumbs)).toEqual(['175']);
  });
  it('nobody when no row or two rows have the name', () => {
    expect(run([idol('1', 'Jongin', 'Q9'), idol('2', 'Kim Jong-in', 'Q9')], [subject], [p]).counts.cards).toBe(0);
    expect(run([idol('1', 'Kai', 'Q9'), idol('2', 'KAI', 'Q9')], [subject], [p]).counts.cards).toBe(0);
  });
  it('a single row needs no name check', () => {
    expect(run([idol('175', 'Kim Jong-in', 'Q9')], [subject], [p]).counts.cards).toBe(1);
  });
});

describe('licences and the credit', () => {
  it('maps the free licences, refuses the rest', () => {
    expect(['CC BY 4.0', 'CC BY 2.0 kr', 'CC BY-SA 3.0', 'CC0', 'Public domain', 'CC BY-NC 4.0', 'GFDL'].map(cardLicence)).toEqual(['cc_by', 'cc_by', 'cc_by_sa', 'cc0', 'public_domain', null, null]);
    expect(nameKey('Cha Eun-woo')).toBe('chaeunwoo');
  });

  it('a CC BY photo is credited on /credits (idols section), CC0 and public domain need none', () => {
    const r = run([idol('1', 'Ana', 'Q1'), idol('2', 'Bo', 'Q2'), idol('3', 'Cy', 'Q3')], [entity('idol:a', 'Ana', 'Q1'), entity('idol:b', 'Bo', 'Q2'), entity('idol:c', 'Cy', 'Q3')],
      [photo('idol:a', { author: 'Jane Doe', licence: 'CC BY-SA 4.0', licence_url: 'https://creativecommons.org/licenses/by-sa/4.0' }), photo('idol:b', { licence: 'CC0' }), photo('idol:c', { licence: 'Public domain' })]);
    expect(r.counts.cards).toBe(3);
    expect(r.credits.map((c) => c.slug)).toEqual(['1']);
    const sections = creditSections(r.credits, [], {}, {});
    expect(sections.map((s) => s.id)).toEqual(['idols']);
    const html = renderToStaticMarkup(HubCreditsPage({ sections }));
    expect(html).toContain('Ana');
    expect(html).toContain('Photo: <a href="https://commons.wikimedia.org/wiki/File:A.jpg"');
    expect(html).toContain('Jane Doe');
    expect(html).toContain('href="https://creativecommons.org/licenses/by-sa/4.0"');
  });

  it('a photo shown on a tile only because no trivia picture exists: a trivia idol is never credited as a card photo', () => {
    const r = run([idol('1', 'Ana', 'Q1')], [entity('idol:a', 'Ana', 'Q1')], [photo('idol:a')], { trivia: [trivia('1')] });
    expect(r.credits).toEqual([]);
  });
});

describe('the server markup of a tile', () => {
  const entityOf = { name: 'Manon', thumb: null } as const;
  it('shows the resolved picture, decorative, with its crop', () => {
    const html = renderToStaticMarkup(Avatar({ entity: entityOf, tone: 'KATSEYE', size: 40, radius: 10, font: 13, look: { thumb: 'https://x/c.webp', position: '50% 24%' } }));
    expect(html).toContain('class="hub-dle-thumb"');
    expect(html).toContain('<img src="https://x/c.webp" alt=""');
    expect(html).toContain('object-position:50% 24%');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('>MA<');
  });
  it('the pool\'s own thumb stays first, and with nothing the initials stay', () => {
    expect(renderToStaticMarkup(Avatar({ entity: { name: 'Manon', thumb: 'https://x/p.webp' }, tone: 'K', look: { thumb: 'https://x/c.webp' } }))).toContain('https://x/p.webp');
    const none = renderToStaticMarkup(Avatar({ entity: entityOf, tone: 'K' }));
    expect(none).toContain('hub-dle-thumb-pat');
    expect(none).toContain('MA');
  });
});
