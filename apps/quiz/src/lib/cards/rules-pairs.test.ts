// Bunnyverse Cards lot 2: the draw with pairs. A group gives two halves per edition; the draw picks the subject first, then one of its
// halves, so a pair never makes a group come out more often than a subject with one card (integrator brief, point 3). Owner decision
// 2026-11-13: until the catalog has the plan's form (three kinds, six rarities) every subject of the rarity has the same chance, whatever
// its kind; in the plan's form the kind weights come back. The exact odds are computed by enumerating every outcome of the rng after the
// rarity roll (the first call is answered 0; in a pool of Commons only it is always C).
import { describe, expect, it } from 'vitest';

import { computeOdds, drawOne, hasPlanForm, indexPool, KIND_WEIGHTS, RARITIES } from './rules';

import type { PoolCard, Rng } from './types';

class Need extends Error { constructor(readonly max: number) { super('need'); } }

/** The exact chance of each card number for one card of a pack (not the fifth). */
function exactOdds(pool: PoolCard[]): Map<number, number> {
  const byKey = indexPool(pool);
  const out = new Map<number, number>();
  const explore = (prefix: number[], w: number): void => {
    let i = 0;
    const rng: Rng = (max) => {
      if (i === 0) { i++; return 0; } // the rarity roll: only C exists, every value gives C
      if (i < prefix.length + 1) return prefix[i++ - 1] as number;
      throw new Need(max);
    };
    try {
      const c = drawOne(byKey, rng, false);
      out.set(c.n, (out.get(c.n) ?? 0) + w);
    } catch (e) {
      if (!(e instanceof Need)) throw e;
      for (let v = 0; v < e.max; v++) explore([...prefix, v], w / e.max);
    }
  };
  explore([], 1);
  return out;
}

const idol = (n: number, entity: string): PoolCard => ({ n, kind: 'idol', rarity: 'C', entity });
const half = (n: number, entity: string): PoolCard => ({ n, kind: 'group', rarity: 'C', entity });

describe('the draw with pairs before the plan form: one subject of the rarity at random, then a half', () => {
  const pool = [idol(1, 'idol:a'), idol(2, 'idol:b'), half(3, 'group:x'), half(4, 'group:x'), half(5, 'group:y'), half(6, 'group:y'), half(7, 'group:z')];
  const odds = exactOdds(pool);

  it('is not the plan form (no event, one rarity): no kind weight', () => {
    expect(hasPlanForm(indexPool(pool))).toBe(false);
    expect(computeOdds(pool).kindWeights).toBe(false);
  });

  it('gives every subject the same chance, a soloist or member as a group, a pair as a single card', () => {
    const subject = (ns: number[]): number => ns.reduce((t, n) => t + (odds.get(n) ?? 0), 0);
    for (const ns of [[1], [2], [3, 4], [5, 6], [7]]) expect(subject(ns)).toBeCloseTo(1 / 5, 12);
  });

  it('gives each half of a pair half the chance of its group', () => {
    for (const n of [3, 4, 5, 6]) expect(odds.get(n)).toBeCloseTo(1 / 10, 12);
    expect([...odds.values()].reduce((t, v) => t + v, 0)).toBeCloseTo(1, 12);
  });

  it('draws what the rng names: the subject index among all subjects of the rarity, then the half index', () => {
    const byKey = indexPool(pool);
    const script = (vals: number[]): Rng => { let i = 0; return () => vals[i++] as number; };
    // rarity 0 (C), subject 3 of [a, b, x, y, z] (group:y), half 1 (its second card)
    expect(drawOne(byKey, script([0, 3, 1]), false).n).toBe(6);
    expect(drawOne(byKey, script([0, 0]), false).n).toBe(1);
    // a subject with one card takes no half roll
    let calls = 0;
    const counting: Rng = () => { calls++; return calls === 2 ? 4 : 0; };
    expect(drawOne(byKey, counting, false).n).toBe(7);
    expect(calls).toBe(2);
  });

  it('counts subjects and cards per rarity and kind, and the kind share follows the subjects', () => {
    const o = computeOdds(pool);
    expect(o.subjects?.C).toEqual({ idol: 2, group: 3 });
    expect(o.cards?.C).toEqual({ idol: 2, group: 5 });
    expect(o.kinds.C.idol).toBeCloseTo(40, 9);
    expect(o.kinds.C.group).toBeCloseTo(60, 9);
    expect(o.subjects?.U).toEqual({});
  });
});

describe('the draw with pairs in the plan form: the kind weights come back, then a subject, then a half', () => {
  // the three kinds and the six rarities (the plan's form); the Commons as above, one card of each other rarity
  const base = [idol(1, 'idol:a'), idol(2, 'idol:b'), half(3, 'group:x'), half(4, 'group:x'), half(5, 'group:y'), half(6, 'group:y'), half(7, 'group:z')];
  const extra: PoolCard[] = RARITIES.filter((r) => r !== 'C').map((r, i) => ({ n: 100 + i, kind: 'idol', rarity: r, entity: `idol:r${i}` }));
  const pool = [...base, { n: 8, kind: 'event', rarity: 'C', entity: 'event:e' } as PoolCard, ...extra];
  const odds = exactOdds(pool);
  const w = KIND_WEIGHTS.idol + KIND_WEIGHTS.group + KIND_WEIGHTS.event;

  it('is the plan form', () => {
    expect(hasPlanForm(indexPool(pool))).toBe(true);
    expect(computeOdds(pool).kindWeights).toBe(true);
    expect(computeOdds(pool).kinds.C.idol).toBeCloseTo((KIND_WEIGHTS.idol / w) * 100, 9);
  });

  it('weights the kinds, then gives every subject of a kind the same chance, a half half of its group', () => {
    expect(odds.get(1)).toBeCloseTo(KIND_WEIGHTS.idol / w / 2, 12);
    expect(odds.get(8)).toBeCloseTo(KIND_WEIGHTS.event / w, 12);
    expect(odds.get(7)).toBeCloseTo(KIND_WEIGHTS.group / w / 3, 12);
    for (const n of [3, 4, 5, 6]) expect(odds.get(n)).toBeCloseTo(KIND_WEIGHTS.group / w / 3 / 2, 12);
  });
});

describe('a pool without entities (older payloads)', () => {
  it('makes every card its own subject', () => {
    const bare: PoolCard[] = [{ n: 9, kind: 'group', rarity: 'C' }, { n: 10, kind: 'group', rarity: 'C' }, { n: 11, kind: 'idol', rarity: 'C' }];
    const o = exactOdds(bare);
    for (const n of [9, 10, 11]) expect(o.get(n)).toBeCloseTo(1 / 3, 12);
  });
});
