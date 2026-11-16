// Bunnyverse Cards lot 6, part C: the pages and the API of the age lock. Invented subjects: a group with one minor member (a locked group, a
// locked member, two adults with cards), a second group with a locked member only, and a normal soloist. Proved:
//   - the public payload carries a boolean `locked` and never a month or a date (asserted on the serialized text), a locked subject has no card
//     in it, an answer from the database that is missing or late locks (fail closed);
//   - the binder shows a pocket "Carte à venir" for each locked subject (a pair for a group), in its group's section, and nothing counts it:
//     the cards, a section's card numbers, the completion by kind, the locks and editions of the ladder, the odds;
//   - a locked subject is never a search result, a missing, owned or favourite card, a focus pack or a lobby group; it has no star, no heart,
//     no "new" mark and no link; no ranking line, set, goal, almost-there line, idol page, theme or pack of the day is made of it;
//   - the admin reads the opening month (and "inconnue" when it is null), the pages never.
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h } from 'react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  tables: {} as Record<string, unknown[]>,
  rpcs: [] as string[],
  rpc: { data: null as unknown, error: null as { message: string } | null },
}));
vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return 'hub'; } }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    rpc: async (fn: string) => { db.rpcs.push(fn); return db.rpc; },
    from: (t: string) => {
      const b: Record<string, unknown> = {};
      for (const m of ['select', 'eq', 'in', 'order', 'gt']) b[m] = () => b;
      b.range = async () => ({ data: db.tables[t] ?? [], error: null });
      b.limit = () => Promise.resolve({ data: db.tables[t] ?? [], error: null });
      b.then = (res: (v: unknown) => void) => res({ data: db.tables[t] ?? [], error: null });
      return b;
    },
  }),
}));

import { LocksList, opensLabel } from '@/components/admin/photos/cards-panel';
import { SoonPocket } from '@/components/cards/binder-view';

import { handleAdminPhotos, lockRowsOf } from './admin-photos';
import { buildCatalog, loadCatalog, lockedIds, resetCatalogCache } from './catalog';
import { goalSets } from './goals';
import { fromPayload } from './ui-catalog';
import { buildSlim, countByKind, filterItems, NO_FILTERS, ownedCount, paginate, sortItems } from './ui-model';
import { almostState, collectionState, dailyGroup, emptyPlayer, entitySlugs, idolPage, sectionsOf, badgesOf } from '../kpopcards/model';
import { worldFrom } from '../kpopcards/server';

import type { OwnedEntry } from './types';
import type { BinderItem } from './ui-types';

const ent = (id: string, kind: 'idol' | 'group', name: string, group_id: string | null, sort_key: string, age_lock = false) =>
  ({ id, kind, name, group_id, debut_year: 2024, sort_key, lock_reasons: {}, active: true, ...(age_lock ? { age_lock: true } : {}) });
const ENTITIES = [
  ent('group:trio', 'group', 'TRIO', null, 'trio|1|trio', true),
  ent('idol:ada-trio', 'idol', 'Ada', 'group:trio', 'trio|0|ada'),
  ent('idol:bea-trio', 'idol', 'Bea', 'group:trio', 'trio|0|bea'),
  ent('idol:cleo-trio', 'idol', 'Cleo', 'group:trio', 'trio|0|cleo', true),
  ent('group:kid', 'group', 'KID', null, 'kid|1|kid', true),
  ent('idol:dan-kid', 'idol', 'Dan', 'group:kid', 'kid|0|dan', true),
  ent('idol:solo', 'idol', 'Sol', null, 'sol|0|sol'),
];
const PHOTO = (id: number) => ({
  id, slot: 1, source: 'commons', source_page: `p${id}`, author: 'A', author_url: null, licence: 'CC BY 4.0', licence_url: 'l', share_alike: false, modified: 'm',
  focal_x: 50, focal_y: 30, storage_path: `s${id}`, source_path: null, file_focal_x: 50, file_focal_y: 30, small_2x: false,
});
const CARDS = [
  { card_no: 1, num: 'BV1-0001', entity_id: 'idol:ada-trio', rarity: 'C', edition: 'std', photo_id: 1 },
  { card_no: 2, num: 'BV1-0002', entity_id: 'idol:ada-trio', rarity: 'U', edition: 'stage', photo_id: 2 },
  { card_no: 3, num: 'BV1-0003', entity_id: 'idol:bea-trio', rarity: 'C', edition: 'std', photo_id: 3 },
  { card_no: 4, num: 'BV1-0004', entity_id: 'idol:bea-trio', rarity: 'U', edition: 'stage', photo_id: 4 },
  { card_no: 5, num: 'BV1-0005', entity_id: 'idol:solo', rarity: 'C', edition: 'std', photo_id: 5 },
  { card_no: 6, num: 'BV1-0006', entity_id: 'idol:solo', rarity: 'U', edition: 'stage', photo_id: 6 },
  // a card the database should never hold for a locked subject: the payload leaves it out all the same
  { card_no: 7, num: 'BV1-0007', entity_id: 'idol:cleo-trio', rarity: 'C', edition: 'std', photo_id: 6 },
];
const PHOTOS = [1, 2, 3, 4, 5, 6].map(PHOTO);
// What cards_age_locks() answers: Cleo, Dan and both groups are locked; the month goes to the admin only.
const LOCK_ROWS = [
  { entity_id: 'idol:cleo-trio', locked: true, opens_month: '2028-03-01' }, { entity_id: 'group:trio', locked: true, opens_month: '2028-03-01' },
  { entity_id: 'idol:dan-kid', locked: true, opens_month: null }, { entity_id: 'group:kid', locked: true, opens_month: null },
];
const LOCKED = new Set(['group:trio', 'idol:cleo-trio', 'group:kid', 'idol:dan-kid']);

const payload = () => buildCatalog(CARDS as never, ENTITIES as never, PHOTOS as never, '2026-11-16T10:00:00.000Z', undefined, LOCKED);
const slim = () => buildSlim(fromPayload(payload()));

beforeEach(() => { db.tables = { cards_catalog: CARDS, cards_entities: ENTITIES, cards_photos: PHOTOS }; db.rpc = { data: LOCK_ROWS, error: null }; db.rpcs = []; resetCatalogCache(); });

describe('the public payload sends a boolean, never a month or a date', () => {
  it('flags the locked subjects, leaves their cards out, and the serialized text holds no opening month', async () => {
    const p = await loadCatalog(Date.parse('2026-11-16T10:00:00Z'));
    expect(db.rpcs).toEqual(['cards_age_locks']);
    expect(p.entities.filter((e) => e.locked).map((e) => e.id).sort()).toEqual(['group:kid', 'group:trio', 'idol:cleo-trio', 'idol:dan-kid']);
    expect(p.entities.find((e) => e.id === 'idol:ada-trio')).not.toHaveProperty('locked');
    expect(p.cards.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6]);
    const text = JSON.stringify(p);
    expect(text).not.toMatch(/2028|opens|month|birth|age_lock/i);
    // the only dates of the payload: the clock of the answer
    expect([...text.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0])).toEqual(['2026-11-16']);
    const locked = p.entities.find((e) => e.id === 'idol:cleo-trio')!;
    expect(Object.keys(locked).sort()).toEqual(['debutYear', 'group', 'groupId', 'id', 'kind', 'locked', 'lockReasons', 'name', 'sortKey'].sort());
    expect(locked.locked).toBe(true);
  });
  it('reads the lock from the database each time the catalog is read: an opened pocket is a normal entity without a card', async () => {
    db.rpc = { data: LOCK_ROWS.map((r) => (r.entity_id === 'idol:cleo-trio' ? { ...r, locked: false } : r)), error: null };
    const p = await loadCatalog();
    expect(p.entities.find((e) => e.id === 'idol:cleo-trio')).not.toHaveProperty('locked');
  });
  it('fails closed: no answer, an error, or a missing row locks the entity that carries the lock', () => {
    const rows = ENTITIES as never;
    expect([...lockedIds(rows, null)].sort()).toEqual([...LOCKED].sort());
    expect([...lockedIds(rows, [])].sort()).toEqual([...LOCKED].sort());
    expect([...lockedIds(rows, [{ entity_id: 'idol:cleo-trio', locked: false }])].sort()).toEqual(['group:kid', 'group:trio', 'idol:dan-kid']);
    expect(lockedIds([ENTITIES[1]] as never, null).size).toBe(0);
  });
  it('fails closed on a database error through loadCatalog, and reads no lock before file 116 (no entity has age_lock)', async () => {
    db.rpc = { data: null, error: { message: 'down' } };
    expect((await loadCatalog()).entities.filter((e) => e.locked)).toHaveLength(4);
    resetCatalogCache();
    db.tables = { cards_catalog: CARDS.slice(0, 6), cards_entities: ENTITIES.map(({ age_lock: _a, ...e }) => e), cards_photos: PHOTOS };
    db.rpcs = [];
    expect((await loadCatalog()).entities.filter((e) => e.locked)).toHaveLength(0);
    expect(db.rpcs).toEqual([]);
  });
});

describe('the binder: a pocket "Carte à venir" that nothing counts', () => {
  it('adds a pocket for a person and a pair for a group, in the section of their group, after its last pocket', () => {
    const s = slim();
    // (the editions Ada and Bea do not have yet are the existing "not issued" pockets, left out here)
    const trio = s.items.filter((i) => i.sec === 'trio' && (!i.locked || i.soon));
    expect(trio.map((i) => (i.locked ? `soon:${i.name}` : i.card.num))).toEqual(['BV1-0001', 'BV1-0002', 'BV1-0003', 'BV1-0004', 'soon:Cleo', 'soon:TRIO 1/2', 'soon:TRIO 2/2']);
    // after the last pocket of the section, whatever it is
    const last = s.items.map((i) => i.sec).lastIndexOf('trio');
    expect(s.items.slice(last - 2, last + 1).every((i) => i.locked && i.soon)).toBe(true);
    expect(s.items.map((i) => i.i)).toEqual(s.items.map((_, k) => k));
    // a section with only locked pockets is marked, and a section with cards is not
    expect(s.sections.find((x) => x.id === 'kid')).toMatchObject({ soon: true, ns: [] });
    expect(s.sections.find((x) => x.id === 'trio')).not.toHaveProperty('soon');
    const soon = s.items.filter((i) => i.locked && i.soon);
    expect(soon.map((i) => (i.locked ? i.name : ''))).toEqual(['Cleo', 'TRIO 1/2', 'TRIO 2/2', 'Dan', 'KID 1/2', 'KID 2/2']);
    for (const i of soon) if (i.locked) expect(i).toMatchObject({ reason: null, anchor: null, rarity: 'C' });
  });
  it('changes no count: the cards, the card numbers of a section, the completion by kind, the ladder, the odds', () => {
    const withLock = slim();
    const without = buildSlim(fromPayload(buildCatalog(CARDS.slice(0, 6) as never, ENTITIES as never, PHOTOS as never, 'x'))); // the same entities, none locked: no pocket for a subject with no card
    expect(withLock.cards.map((c) => c.n)).toEqual(without.cards.map((c) => c.n));
    expect(withLock.sections.filter((x) => !x.soon).map((x) => [x.id, x.ns])).toEqual(without.sections.map((x) => [x.id, x.ns]));
    expect(withLock.locks).toEqual(without.locks);
    expect(withLock.editions).toEqual(without.editions);
    const all = new Map<number, OwnedEntry>(withLock.cards.map((c) => [c.n, { n: c.n, copies: 1, fav: false, at: '2026-11-16T10:00:00Z' }]));
    expect(countByKind(withLock.cards, all)).toEqual(countByKind(without.cards, all));
    expect(ownedCount(withLock.cards, all)).toBe(6);
    expect(payload().odds).toEqual(buildCatalog(CARDS.slice(0, 6) as never, ENTITIES as never, PHOTOS as never, 'x', undefined, LOCKED).odds);
  });
  it('is never a search result, a missing, owned or favourite card, nor a filtered edition; it shows only with no filter', () => {
    const s = slim();
    const none = new Map<number, OwnedEntry>();
    const soonIn = (xs: readonly BinderItem[]): number => xs.filter((x) => x.locked && x.soon).length;
    expect(soonIn(filterItems(s.items, NO_FILTERS, none))).toBe(6);
    for (const f of [{ ...NO_FILTERS, q: 'cleo' }, { ...NO_FILTERS, q: 'trio' }, { ...NO_FILTERS, q: 'dan' }, { ...NO_FILTERS, show: 'missing' as const },
      { ...NO_FILTERS, show: 'owned' as const }, { ...NO_FILTERS, show: 'fav' as const }, { ...NO_FILTERS, rar: { C: true } }, { ...NO_FILTERS, kind: 'idol' as const },
      { ...NO_FILTERS, kind: 'group' as const }]) {
      expect(soonIn(filterItems(s.items, f, none)), JSON.stringify(f)).toBe(0);
    }
    // the sort keeps them after the cards
    const sorted = sortItems(s.items, 'rarity', none);
    expect(sorted.slice(-6).every((i) => i.locked && i.soon)).toBe(true);
  });
  it('paginates them in the run of their section', () => {
    const s = slim();
    const pages = paginate(s.items);
    const secs = pages.map((p) => p.sec);
    // each section is one run of pages (no section comes back later)
    expect(secs.filter((x, k) => secs.indexOf(x) !== k && secs[k - 1] !== x)).toEqual([]);
    expect(pages.flatMap((p) => p.items).filter((i) => i.locked && i.soon)).toHaveLength(6);
    expect(pages.filter((p) => p.sec === 'trio').flatMap((p) => p.items).filter((i) => i.locked && i.soon).map((i) => (i.locked ? i.name : ''))).toEqual(['Cleo', 'TRIO 1/2', 'TRIO 2/2']);
  });
  it('a pocket has the name and "Carte à venir", no link, no date, no star, no heart, no new mark', () => {
    const html = renderToStaticMarkup(h(SoonPocket, { name: 'TRIO 1/2' }));
    expect(html).toContain('TRIO 1/2');
    expect(html).toContain('Carte à venir');
    expect(html).not.toMatch(/<a |href=|<button|newb|class="cnt"|\d{4}/);
  });
  it('the binder takes the pocket before any link, star, heart or count: source order and the counters leave it out', () => {
    const src = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../../components/cards/binder-view.tsx'), 'utf8');
    const pocket = src.slice(src.indexOf('function Pocket('), src.indexOf('/** The pockets of a run of cells'));
    expect(pocket.indexOf('SoonPocket')).toBeGreaterThan(-1);
    expect(pocket.indexOf('SoonPocket')).toBeLessThan(pocket.indexOf('<Link'));
    expect(pocket.indexOf('SoonPocket')).toBeLessThan(pocket.indexOf('PocketFoot'));
    expect(pocket.indexOf('SoonPocket')).toBeLessThan(pocket.indexOf('WishHeart'));
    expect(src).toContain('scoped.filter((i) => i.locked && !i.soon)');
    expect(src).toContain('list.filter((i) => !(i.locked && i.soon)).length');
    // the totals of the page are the cards', not the pockets'
    expect(src).toContain('const total = scopedCards.length;');
  });
  it('is no group a player can open a pack for or pick in the lobby: the focus page and the lobby list leave the sections of locked pockets out', () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
    expect(readFileSync(path.join(root, 'components/cards/lobby-view.tsx'), 'utf8')).toContain("s.id !== 'soloists' && !s.soon");
    expect(readFileSync(path.join(root, 'app/sites/[site]/(hub)/kpopcards/open/focus/[group]/page.tsx'), 'utf8')).toContain("s.id !== 'events' && !s.soon");
  });
});

describe('the server world: a locked subject is in no list', () => {
  const w = () => worldFrom(payload(), new Map([['group:trio', 'girl']]));
  const names = ['Cleo', 'Dan', 'KID'];
  const clean = (v: unknown): void => { const t = JSON.stringify(v); for (const n of names) expect(t, n).not.toContain(`"${n}`); expect(t).not.toMatch(/cleo-trio|dan-kid|group:kid/); };
  it('has no theme, no section of its own, no idol page, no set, no pocket, no almost-there line, no badge', () => {
    const world = w();
    expect([...world.themeOf.keys()].sort()).toEqual(['idol:ada-trio', 'idol:bea-trio', 'idol:solo']);
    const secs = sectionsOf(world);
    expect(secs.flatMap((s) => s.ids).sort()).toEqual(['idol:ada-trio', 'idol:bea-trio', 'idol:solo']);
    expect(secs.map((s) => s.name)).toEqual(['TRIO', 'Soloists']);
    expect(secs.some((s) => s.name === 'KID')).toBe(false);
    const slugs = entitySlugs(world.entities);
    const p = emptyPlayer(Date.parse('2026-11-16T10:00:00Z'));
    expect(idolPage(world, p, slugs.get('idol:cleo-trio') ?? 'cleo')).toBeNull();
    expect(idolPage(world, p, slugs.get('idol:dan-kid') ?? 'dan')).toBeNull();
    expect(idolPage(world, p, slugs.get('idol:ada-trio')!)).not.toBeNull();
    const col = collectionState(world, p, { per: 120 });
    clean(col);
    expect(col.groups.map((g) => g.name)).toEqual(['TRIO', 'Soloists']);
    expect(col.totals.total).toBe(6);
    clean(almostState(world, { ...p, owned: new Map([[1, { copies: 1, fav: false, locked: false, seen: true, firstAt: 1, lastAt: 1 }]]) }));
    clean(badgesOf(world, new Set([1, 2, 3, 4, 5, 6]), 0));
    expect(dailyGroup(world, '2026-11-16')).toBeNull();
    clean(goalSets(world.cards, world.entities, new Set([1]), new Set()));
    expect(goalSets(world.cards, world.entities, new Set(), new Set()).map((g) => g.id)).toEqual(['holo', 'gold', 'solo'].filter((id) => id === 'solo'));
  });
  it('the goal sets ignore a locked entity even when it is passed with a card (the twin of the database)', () => {
    const sets = goalSets([{ n: 99, entity: 'group:kid', kind: 'group', rarity: 'C' }], [{ id: 'group:kid', kind: 'group', name: 'KID', group: null, debutYear: 2024, locked: true }], new Set(), new Set());
    expect(sets).toEqual([]);
  });
});

describe('the admin reads the opening month, "inconnue" when it is not known', () => {
  const post = (body: unknown) => handleAdminPhotos(new NextRequest('http://localhost/api/admin/cards/photos', {
    method: 'POST', headers: { host: 'localhost', origin: 'http://localhost', 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
  it('lists the locked pockets with the month from cards_age_locks()', async () => {
    db.tables = { cards_entities: ENTITIES.filter((e) => e.age_lock) };
    const res = await post({ action: 'age_locks' });
    expect(res.status).toBe(200);
    expect(db.rpcs).toEqual(['cards_age_locks']);
    const rows = (await res.json()).rows as Array<{ entity: string; name: string; group: string | null; opens_month: string | null }>;
    expect(rows.map((r) => [r.group, r.name, r.opens_month])).toEqual([['KID', 'Dan', null], ['KID', 'KID', null], ['TRIO', 'Cleo', '2028-03'], ['TRIO', 'TRIO', '2028-03']]);
  });
  it('shows nothing opened (a row that says unlocked), and answers 409 when the function is missing', async () => {
    const rows = lockRowsOf([{ entity_id: 'idol:cleo-trio', locked: false }], [{ id: 'idol:cleo-trio', name: 'Cleo', kind: 'idol', group_id: null }], new Map());
    expect(rows).toEqual([]);
    db.rpc = { data: null, error: { message: 'Could not find the function' } };
    db.tables = { cards_entities: ENTITIES.filter((e) => e.age_lock) };
    expect((await post({ action: 'age_locks' })).status).toBe(409);
  });
  it('prints the month in French and "inconnue" for a null one', () => {
    expect(opensLabel('2028-03')).toBe('mars 2028');
    expect(opensLabel(null)).toBe('inconnue');
    const html = renderToStaticMarkup(h(LocksList, { rows: [{ entity: 'idol:c', name: 'Cleo', kind: 'idol', group: 'TRIO', opens_month: '2028-03' }, { entity: 'idol:d', name: 'Dan', kind: 'idol', group: 'KID', opens_month: null }] }));
    expect(html).toContain('mars 2028');
    expect(html).toContain('inconnue');
    expect(renderToStaticMarkup(h(LocksList, { rows: [] }))).toContain('Aucune carte verrouillée.');
  });
});
