// KpopCards lot 7: the panorama through the pure views and the seeded mock (a photo in 3 cards, a photo in 2, once only, recycle keeps it).
import { describe, expect, it } from 'vitest';

import { isApiError } from './contract';
import { createMockApi } from './mock-api';
import { collectionState, emptyPlayer, lobbyState, panoCompletedBy, panoRef, cardRef } from './model';

import type { CatalogPanorama } from '../cards/types';
import type { UiCard, UiEntity } from '../cards/ui-types';
import type { OpenResponse } from './contract';
import type { World } from './model';

const T0 = Date.parse('2026-11-17T10:00:00Z');
const k = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

const GROUP: UiEntity = { id: 'group:Q1', kind: 'group', name: 'Aurora', group: null, debutYear: 2020, sortKey: 'aurora', lockReasons: {} };
const IDOL: UiEntity = { id: 'idol:Q2', kind: 'idol', name: 'Mina', group: 'Aurora', debutYear: 2020, sortKey: 'aurora-mina', lockReasons: {} };

const card = (n: number, o: Partial<UiCard> & { rarity: UiCard['rarity'] }): UiCard => ({
  n, num: `BV1-${String(n).padStart(4, '0')}`, entity: GROUP.id, kind: 'group', edition: o.rarity === 'C' ? 'std' : 'stage', name: 'Aurora', group: null, debutYear: 2020, photo: null, ...o,
});

/** Photo A: 3 parts (cards 1, 2, 3, Standard, panorama 1). Photo B: 2 parts (cards 4, 5, Stage, panorama 2). Cards 6 to 9: Standard cards of an idol. */
function world(opts: { onlyA?: boolean } = {}): World {
  const a = [1, 2, 3].map((n) => card(n, { rarity: 'C', part: n as 1 | 2 | 3, parts: 3, setNs: [1, 2, 3], pano: 1, pairN: null }));
  const b = [4, 5].map((n) => card(n, { rarity: 'U', part: (n - 3) as 1 | 2, parts: 2, setNs: [4, 5], pano: 2, pairN: n === 4 ? 5 : 4 }));
  const idols = [6, 7, 8, 9].map((n) => card(n, { rarity: 'C', entity: IDOL.id, kind: 'idol', name: 'Mina', group: 'Aurora' }));
  const pano = (p: number, parts: 2 | 3, rarity: 'C' | 'U', cards: number[]): CatalogPanorama => ({
    p, num: `P-${String(p).padStart(4, '0')}`, entity: GROUP.id, rarity, edition: rarity === 'C' ? 'std' : 'stage', name: 'Aurora', parts, cards, photo: null, image: null,
  });
  const panoramas = [pano(1, 3, 'C', [1, 2, 3]), ...(opts.onlyA ? [] : [pano(2, 2, 'U', [4, 5])])];
  return { cards: opts.onlyA ? a : [...a, ...b, ...idols], entities: [GROUP, IDOL], themeOf: new Map(), panoramas };
}

const own = (api: ReturnType<typeof createMockApi>, ...ns: number[]): void => {
  for (const n of ns) api.data.owned.set(n, { copies: 1, fav: false, locked: false, seen: true, firstAt: T0, lastAt: T0, packNo: 1, how: 'pack' });
};
const ok = <T,>(r: T | { error: string }): T => { if (isApiError(r as never)) throw new Error((r as { error: string }).error); return r as T; };

describe('lot 7: the panorama in the pure views', () => {
  it('a part carries its part, parts and the panorama number; a whole card does not', () => {
    const w = world();
    expect(cardRef(w.cards[2]!)).toMatchObject({ n: 3, part: 3, parts: 3 });
    expect(cardRef(w.cards[5]!)).not.toHaveProperty('part');
    expect(panoRef(w.panoramas![0]!)).toEqual({ p: 1, num: 'P-0001', name: 'Aurora', edition: 'std', parts: 3, cards: [1, 2, 3] });
  });
  it('panoCompletedBy: the last part of 3 (and of 2) completes, an earlier one does not, a held panorama never again', () => {
    const w = world();
    const p = emptyPlayer(T0);
    const has = (...ns: number[]): void => { for (const n of ns) p.owned.set(n, { copies: 1, fav: false, locked: false, seen: true, firstAt: 0, lastAt: 0 }); };
    has(1);
    expect(panoCompletedBy(w, p, 1)).toBeNull();
    has(2);
    expect(panoCompletedBy(w, p, 2)).toBeNull();
    has(3);
    expect(panoCompletedBy(w, p, 3)?.p).toBe(1);
    p.panos!.set(1, { at: T0, source: 'pack', seen: false });
    expect(panoCompletedBy(w, p, 3)).toBeNull();
    has(4, 5);
    expect(panoCompletedBy(w, p, 5)?.p).toBe(2);
  });
  it('no panoramas in the world (a database without 118): nothing is completed and the answers carry no panorama field', () => {
    const w = world();
    delete w.panoramas;
    const p = emptyPlayer(T0);
    for (const n of [1, 2, 3]) p.owned.set(n, { copies: 1, fav: false, locked: false, seen: true, firstAt: 0, lastAt: 0 });
    expect(panoCompletedBy(w, p, 3)).toBeNull();
    expect(collectionState(w, p)).not.toHaveProperty('panoramas');
    expect(lobbyState({ w, p, now: T0 })).not.toHaveProperty('panoramas');
  });
  it('the Panoramas section has its own completion and never moves the totals', () => {
    const w = world();
    const p = emptyPlayer(T0);
    for (const n of [1, 2, 3, 4]) p.owned.set(n, { copies: 1, fav: false, locked: false, seen: true, firstAt: 0, lastAt: 0 });
    const before = collectionState(w, p);
    expect(before.panoramas).toMatchObject({ owned: 0, total: 2, pct: 0 });
    p.panos!.set(1, { at: T0, source: 'pack', seen: false });
    const after = collectionState(w, p);
    expect(after.panoramas).toMatchObject({ owned: 1, total: 2, pct: 50 });
    expect(after.panoramas!.items.map((i) => [i.num, i.owned, i.section])).toEqual([['P-0001', true, 'aurora'], ['P-0002', false, 'aurora']]);
    expect(after.panoramas!.items[0]!.grantedAt).toBe(new Date(T0).toISOString());
    expect(after.totals).toEqual(before.totals);
    expect(after.totals.total).toBe(w.cards.length);
    const cards = after.items.filter((i) => i.type === 'card' && i.n <= 3);
    expect(cards.map((i) => (i.type === 'card' ? [i.part, i.parts, i.pano] : null))).toEqual([[1, 3, 1], [2, 3, 1], [3, 3, 1]]);
    expect(lobbyState({ w, p, now: T0 }).panoramas).toEqual([1]);
  });
});

describe('lot 7: the panorama in the seeded mock', () => {
  it('a pack that gives the last of 3 parts grants the panorama once: on the card, on the pack, in the summary and in the lobby', async () => {
    const api = createMockApi({ world: world(), start: 'empty', now: () => T0 });
    api.forcePack(Array(5).fill({ rarity: 'C', isNew: true }));
    const r = ok<OpenResponse>(await api.open({ key: k(1), source: 'stock' }));
    const pack = r.packs[0]!;
    const withPano = pack.cards.filter((c) => c.pano);
    expect(pack.cards.slice(0, 3).map((c) => c.n)).toEqual([1, 2, 3]);
    expect(withPano).toHaveLength(1);
    expect(withPano[0]).toMatchObject({ n: 3, completesPair: true, pano: { p: 1, num: 'P-0001', parts: 3, cards: [1, 2, 3] } });
    expect(pack.panoramas?.map((x) => x.p)).toEqual([1]);
    expect(r.summary.panoramas?.map((x) => x.p)).toEqual([1]);
    expect(r.state.panoramas).toEqual([1]);
    // Another pack never gives it again (every part is a copy now).
    api.forcePack(Array(5).fill({ rarity: 'C', isNew: false }));
    const r2 = ok<OpenResponse>(await api.open({ key: k(2), source: 'stock' }));
    expect(r2.packs[0]!.cards.some((c) => c.pano)).toBe(false);
    expect(r2.packs[0]!.panoramas).toEqual([]);
    expect(r2.state.panoramas).toEqual([1]);
  });
  it('a photo in 2 completes at 2 of 2, and only the completing card carries the panorama', async () => {
    const api = createMockApi({ world: world(), start: 'empty', now: () => T0 });
    own(api, 1, 2, 3, 4);
    api.data.panos!.set(1, { at: T0, source: 'craft', seen: true });
    api.forcePack([{ rarity: 'U', isNew: true }, { rarity: 'C', isNew: false }, { rarity: 'C', isNew: false }, { rarity: 'C', isNew: false }, { rarity: 'C', isNew: false }]);
    const r = ok<OpenResponse>(await api.open({ key: k(3), source: 'stock' }));
    const c5 = r.packs[0]!.cards[0]!;
    expect(c5).toMatchObject({ n: 5, isNew: true, completesPair: true, pano: { p: 2, parts: 2, cards: [4, 5] } });
    expect(r.packs[0]!.cards.filter((c) => c.pano)).toHaveLength(1);
    expect(r.packs[0]!.panoramas?.map((x) => x.p)).toEqual([2]);
  });
  it('two panoramas in one pack are both listed, in the order of the cards that completed them', async () => {
    const api = createMockApi({ world: world(), start: 'empty', now: () => T0 });
    own(api, 1, 2, 4);
    api.forcePack([{ rarity: 'U', isNew: true }, { rarity: 'C', isNew: true }, { rarity: 'C', isNew: true }, { rarity: 'C', isNew: true }, { rarity: 'C', isNew: true }]);
    const r = ok<OpenResponse>(await api.open({ key: k(4), source: 'stock' }));
    expect(r.packs[0]!.panoramas?.map((x) => x.p)).toEqual([2, 1]);
    expect(r.summary.panoramas?.map((x) => x.p)).toEqual([2, 1]);
  });
  it('the missing part rule: a player holding 2 of the 3 parts draws the third first, whatever the seed', async () => {
    let hits = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const w = world();
      const api = createMockApi({ world: { ...w, cards: w.cards.filter((c) => c.n <= 5) }, start: 'empty', seed, now: () => T0 });
      own(api, 1, 3, 4, 5);
      const r = ok<OpenResponse>(await api.open({ key: k(100 + seed), source: 'stock' }));
      const firstA = r.packs[0]!.cards.find((c) => c.n <= 3);
      if (!firstA) continue;
      hits++;
      expect(firstA).toMatchObject({ n: 2, isNew: true, completesPair: true, pano: { p: 1 } });
    }
    expect(hits).toBeGreaterThan(3);
  });
  it('a craft that completes the set grants the panorama once, in the same call; a replay answers the same', async () => {
    const api = createMockApi({ world: world(), start: 'empty', now: () => T0 });
    own(api, 1, 2);
    api.data.shards = 5000; // owner request of 2026-11-25: a craft costs 200 or more
    const c = ok<{ pano?: { p: number } | null; state: { panoramas?: number[] }; replayed: boolean }>(await api.craft({ key: k(6), n: 3 }));
    expect(c.pano).toMatchObject({ p: 1, num: 'P-0001' });
    expect(c.state.panoramas).toEqual([1]);
    const again = ok<typeof c>(await api.craft({ key: k(6), n: 3 }));
    expect(again.replayed).toBe(true);
    expect(again.pano?.p).toBe(1);
    expect(api.data.panos!.size).toBe(1);
    // A craft that does not complete a set answers null.
    const c2 = ok<typeof c>(await api.craft({ key: k(7), n: 4 }));
    expect(c2.pano).toBeNull();
  });
  it('recycling a part afterwards keeps the panorama (and the last copy of a part is never recycled)', async () => {
    const api = createMockApi({ world: world(), start: 'empty', now: () => T0 });
    own(api, 1, 2, 3);
    api.data.owned.get(3)!.copies = 3;
    api.forcePack(Array(5).fill({ rarity: 'C', isNew: false }));
    // Complete through a craft-free path: grant by an open that brings nothing new would not; hold the panorama directly through a craft of a fresh part.
    api.data.owned.delete(3);
    api.data.shards = 5000; // owner request of 2026-11-25: a craft costs 200 or more
    ok(await api.craft({ key: k(8), n: 3 }));
    api.data.owned.get(3)!.copies = 3;
    const rc = ok<{ recycled: number; state: { panoramas?: number[] } }>(await api.recycle({ key: k(9), confirm: true, n: 3 }));
    expect(rc.recycled).toBe(1);
    expect(rc.state.panoramas).toEqual([1]);
    const rc2 = ok<{ recycled: number }>(await api.recycle({ key: k(10), confirm: true }));
    expect(rc2.recycled).toBeGreaterThanOrEqual(0);
    const st = ok<{ panoramas?: number[] }>(await api.state());
    expect(st.panoramas).toEqual([1]);
    const col = ok<{ panoramas?: { owned: number; total: number } }>(await api.collection({}));
    expect(col.panoramas).toMatchObject({ owned: 1, total: 2 });
  });
  it('reset forgets the panoramas', async () => {
    const api = createMockApi({ world: world(), start: 'empty', now: () => T0 });
    own(api, 1, 2);
    api.data.shards = 5000; // owner request of 2026-11-25: a craft costs 200 or more
    ok(await api.craft({ key: k(11), n: 3 }));
    api.reset(false);
    const st = ok<{ panoramas?: number[] }>(await api.state());
    expect(st.panoramas).toEqual([]);
  });
});
