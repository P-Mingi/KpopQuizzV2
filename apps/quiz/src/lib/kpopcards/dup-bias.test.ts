// KpopCards launch polish 3 (2026-11-23): the TypeScript twin of the duplicate bias (applyDupBias, used by the dev mock) behaves like cards_dup_pick of
// 126-dup-bias.sql: the share of cards already owned, the same rarity, the exemptions, the missing part rule. The SQL itself is proved
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
const POOL: PoolCard[] = Array.from({ length: 200 }, (_, i) => ({ n: i + 1, kind: 'idol' as const, rarity: i < 100 ? ('C' as const) : ('U' as const), entity: `idol:s${i % 100}` }));
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
  it('only cards owned before the pack are candidates, and a card already out in the pack is never picked again', () => {
    const out = applyDupBias([1, 2, 3, 4, 5], { pool: POOL, rarityOf, owned: new Set([9]), siblings: none, bias: 1, fifthExempt: false, rng: seededRng(1) });
    expect(out[0]).toBe(9);
    expect(out.slice(1)).toEqual([2, 3, 4, 5]);
  });
  it('no card twice in 10,000 simulated packs, the exempt fifth card included, the rarity of each card kept', () => {
    const rng = seededRng(77);
    const owned = new Set<number>([...Array.from({ length: 10 }, (_, i) => i * 10 + 1), ...Array.from({ length: 10 }, (_, i) => 100 + i * 10 + 1)]);
    let dup = 0;
    let total = 0;
    for (let p = 0; p < 10000; p++) {
      const input = Array.from({ length: 5 }, () => 1 + rng(200));
      const exempt = p % 2 === 0;
      const out = applyDupBias(input, { pool: POOL, rarityOf, owned, siblings: none, bias: KC.DUP_BIAS, fifthExempt: exempt, rng });
      expect(new Set(out).size).toBe(5);
      out.forEach((n, k) => {
        expect(rarityOf(n)).toBe(rarityOf(input[k]!));
        if (!(k === 4 && exempt)) { total += 1; if (owned.has(n)) dup += 1; }
      });
    }
    expect(Math.abs(dup / total - (KC.DUP_BIAS + (1 - KC.DUP_BIAS) * 0.1))).toBeLessThan(0.02);
  });
  it('the exempt fifth card is redrawn when it repeats, inside its rarity, and a rarity with one card keeps the repeat', () => {
    const rng = seededRng(4);
    for (let i = 0; i < 40; i++) {
      const out = applyDupBias([150, 1, 2, 3, 150], { pool: POOL, rarityOf, owned: new Set(), siblings: none, bias: 0, fifthExempt: true, rng });
      expect(out[4]).not.toBe(150);
      expect(rarityOf(out[4]!)).toBe('U');
    }
    const one: PoolCard[] = [{ n: 1, kind: 'idol', rarity: 'U', entity: 'idol:a' }, { n: 2, kind: 'idol', rarity: 'C', entity: 'idol:b' }];
    expect(applyDupBias([1, 2, 1], { pool: one, rarityOf: (n) => (n === 1 ? 'U' : 'C'), owned: new Set(), siblings: none, bias: 0, fifthExempt: false, rng })).toEqual([1, 2, 1]);
  });
  it('a repeat of a card out of the pool is redrawn from the whole catalog (the guarantee fallback)', () => {
    const inPool: PoolCard[] = [{ n: 1, kind: 'idol', rarity: 'C', entity: 'idol:a' }];
    const all: PoolCard[] = [...inPool, { n: 9, kind: 'idol', rarity: 'UR', entity: 'idol:b' }, { n: 10, kind: 'idol', rarity: 'UR', entity: 'idol:c' }];
    const r = (n: number): 'C' | 'UR' => (n === 1 ? 'C' : 'UR');
    const out = applyDupBias([9, 1, 1, 1, 9], { pool: inPool, universe: all, rarityOf: r, owned: new Set(), siblings: none, bias: 0, fifthExempt: true, rng: seededRng(6) });
    expect(out[4]).toBe(10);
  });
  it('never picks an owned part whose photo still has a missing part', () => {
    const pool: PoolCard[] = [
      { n: 1, kind: 'group', rarity: 'U', entity: 'group:x' }, { n: 2, kind: 'group', rarity: 'U', entity: 'group:x' },
      { n: 3, kind: 'idol', rarity: 'U', entity: 'idol:y' }, { n: 4, kind: 'idol', rarity: 'U', entity: 'idol:z' },
    ];
    const sib = (n: number): readonly number[] => (n === 1 || n === 2 ? [1, 2] : []);
    const rng = seededRng(8);
    for (let i = 0; i < 30; i++) {
      expect(applyDupBias([4], { pool, rarityOf: () => 'U', owned: new Set([1, 3]), siblings: sib, bias: 1, fifthExempt: false, rng })).toEqual([3]);
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
  it('over 40 packs and 6 seeds the mock gives fewer new cards than the same draw without the bias', async () => {
    let nw = 0;
    let plain = 0;
    for (let seed = 21; seed < 27; seed++) {
      const a = createMockApi({ world: WORLD, seed, now: () => T0, example: false });
      for (let i = 0; i < 40; i++) {
        a.data.stock = 5;
        const r = await a.open({ key: k(100 + i), source: 'stock' });
        if (isApiError(r)) throw new Error(r.error);
        nw += (r as OpenResponse).packs[0]!.newCount;
      }
      const rng = seededRng(seed);
      const all = indexPool(poolCards(WORLD));
      const owned = new Set<number>();
      for (let i = 0; i < 40; i++) {
        const d = drawKcPack(all, all, rng, { pity: false, golden: false, owned });
        // the same no-repeat step with the chance at 0, so only the bias differs
        const cards = applyDupBias(d.cards, { pool: poolCards(WORLD), rarityOf: (cn) => WORLD.cards.find((x) => x.n === cn)!.rarity, owned: new Set(owned), siblings: none, bias: 0, fifthExempt: false, rng });
        for (const n of cards) { if (!owned.has(n)) plain += 1; owned.add(n); }
      }
    }
    expect(nw).toBeLessThan(plain * 0.95);
  });
});
