import { describe, expect, it } from 'vitest';

import { KC, isApiError } from './contract';
import { createMockApi } from './mock-api';

import type { OpenResponse } from './contract';

const T0 = Date.parse('2026-11-13T10:00:00Z');
const k = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;

describe('the seeded mock of the KpopCards contract', () => {
  it('the same seed and the same calls give the same state and the same draws', async () => {
    const run = async (): Promise<unknown> => {
      const a = createMockApi({ seed: 5, now: () => T0 });
      const o = await a.open({ key: k(1), source: 'stock', packs: 5 });
      return { o, s: await a.state() };
    };
    expect(await run()).toEqual(await run());
  });
  it('opens 5 packs at once: 25 cards, the stack falls by 5, the golden and the guarantee are counted pack by pack', async () => {
    const a = createMockApi({ seed: 2, now: () => T0 });
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
    const a = createMockApi({ seed: 3, now: () => T0 });
    const r1 = (await a.open({ key: k(3), source: 'stock' })) as OpenResponse;
    const r2 = (await a.open({ key: k(3), source: 'stock' })) as OpenResponse;
    expect(r2.replayed).toBe(true);
    expect(r2.packs).toEqual(r1.packs);
    expect(a.data.stock).toBe(6);
    expect(await a.open({ key: k(3), source: 'daily' })).toEqual({ error: 'idem_conflict' });
    expect(await a.open({ key: 'x', source: 'stock' })).toEqual({ error: 'idem_missing' });
  });
  it('the pack of the day is free once, and the stack never goes below zero', async () => {
    const a = createMockApi({ seed: 4, now: () => T0 });
    expect(isApiError(await a.open({ key: k(4), source: 'daily' }))).toBe(false);
    expect(await a.open({ key: k(5), source: 'daily' })).toEqual({ error: 'daily_used' });
    a.data.stock = 0;
    expect(await a.open({ key: k(6), source: 'stock' })).toEqual({ error: 'empty' });
    expect(await a.open({ key: k(7), source: 'stock', packs: 5 })).toEqual({ error: 'stack_short' });
  });
  it('the stack holds ten, the timer adds a pack every ten minutes', async () => {
    let t = T0;
    const a = createMockApi({ seed: 6, now: () => t, example: false });
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
    const a = createMockApi({ seed: 7, now: () => T0 });
    for (const r of [await a.collection({ per: 9 }), await a.almost(), await a.missions(), await a.level(), await a.ranking(), await a.ranking('all'), await a.friends(), await a.odds(), await a.help(), await a.recyclePreview()]) {
      expect(isApiError(r)).toBe(false);
    }
  });
});
