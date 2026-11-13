import { describe, expect, it } from 'vitest';

import { KC, isApiError } from './contract';
import { fixtureCatalog } from '../cards/ui-fixture';
import { createMockApi, fixtureWorld, installDevHooks, parseForcePack } from './mock-api';

import type { OpenResponse } from './contract';

const WORLD = fixtureWorld(fixtureCatalog());
const T0 = Date.parse('2026-11-13T10:00:00Z');
const k = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

describe('the seeded mock of the KpopCards contract', () => {
  it('the same seed and the same calls give the same state and the same draws', async () => {
    const run = async (): Promise<unknown> => {
      const a = createMockApi({ world: WORLD, seed: 5, now: () => T0 });
      const o = await a.open({ key: k(1), source: 'stock', packs: 5 });
      return { o, s: await a.state() };
    };
    expect(await run()).toEqual(await run());
  });
  it('opens 5 packs at once: 25 cards, the stack falls by 5, the golden and the guarantee are counted pack by pack', async () => {
    const a = createMockApi({ world: WORLD, seed: 2, now: () => T0 });
    const before = await a.state();
    if (isApiError(before)) throw new Error('state');
    const r = await a.open({ key: k(2), source: 'stock', packs: 5 });
    if (isApiError(r)) throw new Error(r.error);
    expect(r.packs).toHaveLength(5);
    expect(r.packs.flatMap((p) => p.cards)).toHaveLength(25);
    expect(r.state.stock).toBe(before.stock - 5);
    // The player had opened 48 packs: the 50th is golden, the second of these five.
    expect(r.packs.map((p) => p.golden)).toEqual([false, true, false, false, false]);
    const g = r.packs[1]!.cards[4]!;
    expect(['holo', 'era', 'gold', 'full']).toContain(g.edition);
  });
  it('the same key never costs or gives twice', async () => {
    const a = createMockApi({ world: WORLD, seed: 3, now: () => T0 });
    const r1 = (await a.open({ key: k(3), source: 'stock' })) as OpenResponse;
    const r2 = (await a.open({ key: k(3), source: 'stock' })) as OpenResponse;
    expect(r2.replayed).toBe(true);
    expect(r2.packs).toEqual(r1.packs);
    expect(a.data.stock).toBe(6);
    expect(await a.open({ key: k(3), source: 'daily' })).toEqual({ error: 'idem_conflict' });
    expect(await a.open({ key: 'x', source: 'stock' })).toEqual({ error: 'idem_missing' });
  });
  it('the pack of the day is free once, and the stack never goes below zero', async () => {
    const a = createMockApi({ world: WORLD, seed: 4, now: () => T0 });
    expect(isApiError(await a.open({ key: k(4), source: 'daily' }))).toBe(false);
    expect(await a.open({ key: k(5), source: 'daily' })).toEqual({ error: 'daily_used' });
    a.data.stock = 0;
    expect(await a.open({ key: k(6), source: 'stock' })).toEqual({ error: 'empty' });
    expect(await a.open({ key: k(7), source: 'stock', packs: 5 })).toEqual({ error: 'stack_short' });
  });
  it('the stack holds ten, the timer adds a pack every ten minutes', async () => {
    let t = T0;
    const a = createMockApi({ world: WORLD, seed: 6, now: () => t, example: false });
    const s0 = await a.state();
    if (isApiError(s0)) throw new Error('x');
    expect(s0.cap).toBe(KC.STACK_CAP);
    expect(s0.stock).toBe(10);
    await a.open({ key: k(8), source: 'stock' });
    t += 25 * 60000;
    const s1 = await a.state();
    if (isApiError(s1)) throw new Error('x');
    expect(s1.stock).toBe(10);
  });
  it('answers every read of the contract', async () => {
    const a = createMockApi({ world: WORLD, seed: 7, now: () => T0 });
    for (const r of [await a.collection({ per: 9 }), await a.almost(), await a.missions(), await a.level(), await a.ranking(), await a.ranking('all'), await a.friends(), await a.odds(), await a.help(), await a.recyclePreview()]) {
      expect(isApiError(r)).toBe(false);
    }
  });
  it('the prototype controls: a forced Gold or Full Art, the 39th timer pack, a reset', async () => {
    const a = createMockApi({ world: WORLD, seed: 8, now: () => T0 });
    a.forceRarity('UR');
    const r = await a.open({ key: k(20), source: 'stock' });
    if (isApiError(r)) throw new Error(r.error);
    expect(r.packs[0]!.cards[2]!.edition).toBe('gold');
    a.useTimerUpTo(39);
    const st = await a.state();
    if (isApiError(st)) throw new Error('x');
    expect(st.timerLeft).toBe(1);
    a.reset(false);
    const e = await a.state();
    if (isApiError(e)) throw new Error('x');
    expect([e.stock, e.owned.length, e.golden.opened]).toEqual([3, 0, 0]);
  });
  it('the Kpopdle bonus pack: a win earns one, it is opened apart from the stack, and the quiz of the day earns none', async () => {
    const a = createMockApi({ world: WORLD, seed: 9, now: () => T0 });
    expect(await a.open({ key: k(30), source: 'bonus' })).toEqual({ error: 'bonus' });
    a.addDleWin();
    const st = await a.state();
    if (isApiError(st)) throw new Error('x');
    expect(st.bridges.kpopdle).toEqual({ enabled: true, earnedToday: 1, left: 1, perDay: 3 });
    expect(st.bridges.quizOfDay.enabled).toBe(false);
    const r = await a.open({ key: k(31), source: 'bonus' });
    if (isApiError(r)) throw new Error(r.error);
    expect(r.packs[0]!.source).toBe('bonus');
    expect(r.state.stock).toBe(st.stock);
    expect(r.state.bridges.kpopdle.left).toBe(0);
    expect(await a.open({ key: k(32), source: 'bonus' })).toEqual({ error: 'bonus' });
  });
  it('the example player mirrors the prototype v6: counts, stack, shards, history, bell, week, ranking', async () => {
    const a = createMockApi({ world: WORLD, seed: 1, now: () => T0, start: 'example' });
    const st = await a.state();
    if (isApiError(st)) throw new Error('x');
    expect([st.stock, st.shards, st.timerUsed, st.golden.opened, st.nickname]).toEqual([7, 34, 14, 48, 'mingi']);
    expect((st.recent ?? []).map((r) => r.best)).toEqual(['holo', 'std', 'stage', 'era', 'stage', 'holo']);
    expect((st.recent ?? []).map((r) => r.newCount)).toEqual([2, 1, 3, 2, 0, 4]);
    expect(st.owned.filter((o) => o.fav)).toHaveLength(3);
    expect(st.wishlist).toHaveLength(3);
    expect(st.week.items.map((i) => i.value)).toEqual([12, 1, 7]);
    expect(st.newCards).toBe(4);
    const byEd = (ed: string): number => st.owned.filter((o) => WORLD.cards.find((c) => c.n === o.n)!.edition === ed).length;
    // 44 Standard + 16 Stage + 6 Holo + 1 Gold outside the complete group, plus that group's own cards.
    expect(byEd('std') + byEd('stage') + byEd('holo') + byEd('gold')).toBeGreaterThan(30);
    const rk = await a.ranking('friends');
    if (isApiError(rk)) throw new Error('x');
    expect(rk.rows.map((r) => r.nickname)).toContain('neon.bunny');
    const again = createMockApi({ world: WORLD, seed: 1, now: () => T0, start: 'example' });
    expect(await again.state()).toEqual(st);
    const empty = createMockApi({ world: WORLD, seed: 1, now: () => T0, start: 'empty' });
    const es = await empty.state();
    if (isApiError(es)) throw new Error('x');
    expect(es.owned).toHaveLength(0);
  });
  it('forceFullArt does something even when the catalog holds no Full Art card, and the moment of a card is told', async () => {
    const a = createMockApi({ world: WORLD, seed: 11, now: () => T0 });
    a.forceFullArt();
    const r = await a.open({ key: k(40), source: 'stock' });
    if (isApiError(r)) throw new Error(r.error);
    expect(['gold', 'full']).toContain(r.packs[0]!.cards[2]!.edition);
    const mine = r.packs[0]!.cards[0]!.n;
    const m = await a.card(mine);
    if (isApiError(m)) throw new Error('x');
    expect(m.yours).toMatchObject({ how: 'pack' });
    expect(m.event?.precision).toBe('day');
    expect(m.quiz?.url).toMatch(/^https:\/\/kpopquiz\.org\//);
    expect(await a.card(999999)).toEqual({ error: 'card' });
  });
  it('the example player has an Almost there card the shards can craft, as the prototype does', async () => {
    const a = createMockApi({ world: WORLD, seed: 1, now: () => T0, start: 'example' });
    const al = await a.almost();
    if (isApiError(al)) throw new Error('x');
    const g = al.items.find((i) => i.type === 'group' && i.craft !== null && i.craft.canAfford);
    expect(g).toBeDefined();
    expect(g!.missing).toBe(1);
    expect(al.items[0]!.id).toBe(g!.id);
    expect([10, 20]).toContain(g!.craft!.cost);
    const before = await a.state();
    if (isApiError(before)) throw new Error('x');
    const done = await a.craft({ key: k(50), n: g!.next.n });
    if (isApiError(done)) throw new Error(done.error);
    expect(done.state.shards).toBe(before.shards - g!.craft!.cost);
    const after = await a.almost();
    if (isApiError(after)) throw new Error('x');
    expect(after.items.find((i) => i.id === g!.id)).toBeUndefined();
    const ms = await a.missions();
    if (isApiError(ms)) throw new Error('x');
    expect(ms.sets.find((x) => x.id === g!.id)?.ready).toBe(true);
  });
  it('forcePack: the next opening is exactly the pattern (new or copies), the summary follows, and it is used once', async () => {
    const a = createMockApi({ world: WORLD, seed: 12, now: () => T0, start: 'empty' });
    a.forcePack([{ rarity: 'R', isNew: true }, { rarity: 'C', isNew: false }, { rarity: 'U', isNew: false }, { rarity: 'C', isNew: true }, { rarity: 'UR', isNew: true }]);
    const r = await a.open({ key: k(60), source: 'stock' });
    if (isApiError(r)) throw new Error(r.error);
    const c = r.packs[0]!.cards;
    expect(c.map((x) => x.edition)).toEqual(['holo', 'std', 'stage', 'std', 'gold']);
    expect(c.map((x) => x.isNew)).toEqual([true, false, false, true, true]);
    expect(r.summary).toMatchObject({ newCards: 3, copies: 2, best: 'gold' });
    expect(r.summary.copiesShards).toBe(3);
    const r2 = await a.open({ key: k(61), source: 'stock' });
    if (isApiError(r2)) throw new Error(r2.error);
    expect(r2.packs[0]!.cards.map((x) => x.edition)).not.toEqual(['holo', 'std', 'stage', 'std', 'gold']);
  });
  it('the dev hooks: ?kcpack= is parsed (five entries n or c), bad text is ignored, __kcMock carries the controls', async () => {
    expect(parseForcePack('R:n,C:c,U:c,SR:n,C:c')).toHaveLength(5);
    expect(parseForcePack('R:n,C:c')).toBeNull();
    expect(parseForcePack('X:n,C:c,U:c,SR:n,C:c')).toBeNull();
    const a = createMockApi({ world: WORLD, seed: 13, now: () => T0, start: 'empty' });
    const w: Record<string, unknown> = {};
    installDevHooks(a, w, '?kcpack=U:c,U:c,C:n,C:n,R:n');
    expect(Object.keys(w.__kcMock as object)).toContain('forcePack');
    const r = await a.open({ key: k(62), source: 'stock' });
    if (isApiError(r)) throw new Error(r.error);
    expect(r.packs[0]!.cards.map((x) => x.edition)).toEqual(['stage', 'stage', 'std', 'std', 'holo']);
    expect(r.packs[0]!.cards.map((x) => x.isNew)).toEqual([false, false, true, true, true]);
  });
});
