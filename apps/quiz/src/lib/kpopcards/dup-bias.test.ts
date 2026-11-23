// KpopCards launch polish 3 (2026-11-23): the TypeScript twin of the duplicate bias (applyDupBias, used by the dev mock) behaves like cards_dup_pick of
// 126-dup-bias.sql: the share of cards already owned, the same rarity, the exemptions, the focus group, the missing part rule. The SQL itself is proved
// on PGlite in lib/cards/dup-bias-sql.test.ts.
import { describe, expect, it } from 'vitest';

import { fixtureCatalog } from '../cards/ui-fixture';
import { KC, isApiError } from './contract';
import { applyDupBias, drawKcPack, indexPool } from './draw';
import { createMockApi, fixtureWorld, seededRng } from './mock-api';
import { poolCards } from './model';

import type { PoolCard } from '../cards/types';
import type { OpenResponse } from './contract';

/** 100 Standard and 100 Stage cards of 100 soloists. */
const POOL: PoolCard[] = Array.from({ length: 200 }, (_, i) => ({ n: i + 1, kind: 'idol' as const, rarity: i < 100 ? ('C' as const) : ('U' as const), entity: `idol:s${i % 100}`, group: null }));
const none = (): readonly number[] => [];
const rarityOf = (n: number): 'C' | 'U' => (n <= 100 ? 'C' : 'U');

describe('applyDupBias', () => {
  it('with 10 percent of each rarity owned, about 0.35 + 0.65 x 0.10 of the cards are owned ones, and the rarity of every card is kept', () => {
    const rng = seededRng(11);
    const owned = new Set<number>([...Array.from({ length: 10 }, (_, i) => i * 10 + 1), ...Array.from({ length: 10 }, (_, i) => 100 + i * 10 + 1)]);
    let dup = 0;
    let total = 0;
    for (let p = 0; p < 4000; p++) {
      const input = Array.from({ length: 5 }, () => 1 + rng(200));
      const out = applyDupBias(input, { pool: POOL, rarityOf, owned, siblings: none, bias: KC.DUP_BIAS, fifthExempt: false, rng });
      out.forEach((n, k) => {
        expect(rarityOf(n)).toBe(rarityOf(input[k]!));
        total += 1;
        if (owned.has(n)) dup += 1;
      });
    }
    expect(dup / total).toBeGreaterThan(KC.DUP_BIAS + (1 - KC.DUP_BIAS) * 0.1 - 0.02);
    expect(dup / total).toBeLessThan(KC.DUP_BIAS + (1 - KC.DUP_BIAS) * 0.1 + 0.03);
  });
  it('a player who owns nothing, and a chance of 0, change nothing', () => {
    const rng = seededRng(3);
    const input = [1, 150, 151, 2, 3];
    // nothing owned: only a card stored earlier in the same pack can be picked, so one card of each rarity is never changed
    expect(applyDupBias(input.slice(0, 2), { pool: POOL, rarityOf, owned: new Set(), siblings: none, bias: KC.DUP_BIAS, fifthExempt: false, rng })).toEqual([1, 150]);
    expect(applyDupBias(input, { pool: POOL, rarityOf, owned: new Set([1, 2, 3, 150, 151, 7]), siblings: none, bias: 0, fifthExempt: false, rng })).toEqual(input);
  });
  it('the exempt fifth card (Gold guarantee, golden pack) is never biased, the others are (the chance at 1)', () => {
    const rng = seededRng(5);
    const owned = new Set([150]);
    for (let i = 0; i < 50; i++) {
      const out = applyDupBias([1, 2, 3, 4, 151], { pool: POOL, rarityOf, owned, siblings: none, bias: 1, fifthExempt: true, rng });
      expect(out[4]).toBe(151);
      const free = applyDupBias([1, 2, 3, 4, 151], { pool: POOL, rarityOf, owned, siblings: none, bias: 1, fifthExempt: false, rng });
      expect(free[4]).toBe(150);
      expect(free[0]).toBe(1);
    }
  });
  it('a card stored earlier in the pack counts as owned', () => {
    const out = applyDupBias([1, 2, 3, 4, 5], { pool: POOL, rarityOf, owned: new Set([9]), siblings: none, bias: 1, fifthExempt: false, rng: seededRng(1) });
    expect(out).toEqual([9, 9, 9, 9, 9]);
  });
  it('the cards 2 and 4 of a focus pack stay in the focus group when it has a card of the rarity', () => {
    const pool: PoolCard[] = [
      { n: 1, kind: 'idol', rarity: 'C', entity: 'idol:a', group: 'group:g' }, { n: 2, kind: 'idol', rarity: 'C', entity: 'idol:b', group: 'group:g' },
      { n: 3, kind: 'idol', rarity: 'C', entity: 'idol:c', group: null }, { n: 4, kind: 'idol', rarity: 'U', entity: 'idol:c', group: null },
    ];
    const r = (n: number): 'C' | 'U' => (n === 4 ? 'U' : 'C');
    const rng = seededRng(2);
    for (let i = 0; i < 30; i++) {
      const out = applyDupBias([3, 1, 3, 2, 4], { pool, rarityOf: r, owned: new Set([3]), siblings: none, bias: 1, fifthExempt: false, rng, focus: 'group:g' });
      expect(out[0]).toBe(3);
      expect(out[1]).toBe(1);
      expect([1, 2]).toContain(out[3]);
      expect([1, 3]).toContain(out[2]);
    }
    // the group has no card of that rarity: the whole pool is allowed
    const u = applyDupBias([3, 4, 3, 4, 4], { pool, rarityOf: r, owned: new Set([4]), siblings: none, bias: 1, fifthExempt: false, rng, focus: 'group:g' });
    expect(u[1]).toBe(4);
  });
  it('never picks an owned part whose photo still has a missing part', () => {
    const pool: PoolCard[] = [
      { n: 1, kind: 'group', rarity: 'U', entity: 'group:x', group: null }, { n: 2, kind: 'group', rarity: 'U', entity: 'group:x', group: null },
      { n: 3, kind: 'idol', rarity: 'U', entity: 'idol:y', group: null }, { n: 4, kind: 'idol', rarity: 'U', entity: 'idol:z', group: null },
    ];
    const sib = (n: number): readonly number[] => (n === 1 || n === 2 ? [1, 2] : []);
    const rng = seededRng(8);
    for (let i = 0; i < 30; i++) {
      expect(applyDupBias([4, 4, 4, 4, 4], { pool, rarityOf: () => 'U', owned: new Set([1, 3]), siblings: sib, bias: 1, fifthExempt: false, rng })).toEqual([3, 3, 3, 3, 3]);
    }
    const both = new Set<number>();
    for (let i = 0; i < 40; i++) both.add(applyDupBias([4], { pool, rarityOf: () => 'U', owned: new Set([1, 2]), siblings: sib, bias: 1, fifthExempt: false, rng })[0]!);
    expect([...both].sort()).toEqual([1, 2]);
  });
});

describe('the mock leans toward owned cards like the database', () => {
  const WORLD = fixtureWorld(fixtureCatalog());
  const T0 = Date.parse('2026-11-13T10:00:00Z');
  const k = (i: number): string => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`;
  it('over 40 packs the mock gives fewer new cards than the plain draw of the same size', async () => {
    const a = createMockApi({ world: WORLD, seed: 21, now: () => T0, example: false });
    let nw = 0;
    for (let i = 0; i < 40; i++) {
      a.data.stock = 5;
      const r = await a.open({ key: k(100 + i), source: 'stock' });
      if (isApiError(r)) throw new Error(r.error);
      nw += (r as OpenResponse).packs[0]!.newCount;
    }
    const rng = seededRng(21);
    const all = indexPool(poolCards(WORLD));
    const owned = new Set<number>();
    let plain = 0;
    for (let i = 0; i < 40; i++) {
      const d = drawKcPack(all, all, rng, { pity: false, golden: false, owned });
      for (const n of d.cards) { if (!owned.has(n)) plain += 1; owned.add(n); }
    }
    expect(nw).toBeLessThan(plain * 0.95);
  });
});
