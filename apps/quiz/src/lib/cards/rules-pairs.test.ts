// Bunnyverse Cards lot 2: the draw with pairs. A group gives two halves per edition; the draw picks the subject first, then one of its
// halves, so a pair never makes a group come out more often than a subject with one card (integrator brief, point 3). The exact odds are
// computed by enumerating every outcome of the rng after the rarity roll (a pool of Commons only, so the rarity is always C).
import { describe, expect, it } from 'vitest';

import { computeOdds, drawOne, indexPool, KIND_WEIGHTS } from './rules';

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

describe('the draw with pairs: a subject first, then a half', () => {
  const pool = [idol(1, 'idol:a'), idol(2, 'idol:b'), half(3, 'group:x'), half(4, 'group:x'), half(5, 'group:y'), half(6, 'group:y'), half(7, 'group:z')];
  const odds = exactOdds(pool);
  const idolShare = KIND_WEIGHTS.idol / (KIND_WEIGHTS.idol + KIND_WEIGHTS.group);
  const groupShare = 1 - idolShare;

  it('gives every group subject the same chance, whether it has a pair or one card', () => {
    const x = (odds.get(3) ?? 0) + (odds.get(4) ?? 0);
    const y = (odds.get(5) ?? 0) + (odds.get(6) ?? 0);
    const z = odds.get(7) ?? 0;
    expect(x).toBeCloseTo(groupShare / 3, 12);
    expect(y).toBeCloseTo(groupShare / 3, 12);
    expect(z).toBeCloseTo(groupShare / 3, 12);
  });

  it('gives each half of a pair half the chance of its group', () => {
    for (const n of [3, 4, 5, 6]) expect(odds.get(n)).toBeCloseTo(groupShare / 3 / 2, 12);
  });

  it('leaves the soloists and members where they were', () => {
    expect(odds.get(1)).toBeCloseTo(idolShare / 2, 12);
    expect(odds.get(2)).toBeCloseTo(idolShare / 2, 12);
    expect([...odds.values()].reduce((s, v) => s + v, 0)).toBeCloseTo(1, 12);
  });

  it('draws the half the rng names: subject index, then half index', () => {
    const byKey = indexPool(pool);
    const script = (vals: number[]): Rng => { let i = 0; return () => vals[i++] as number; };
    // rarity 0 (C), kind 80 (a group, after the idol weight 75), subject 1 (group:y), half 1 (its second card)
    expect(drawOne(byKey, script([0, 80, 1, 1]), false).n).toBe(6);
    expect(drawOne(byKey, script([0, 80, 0, 0]), false).n).toBe(3);
    // a subject with one card takes no half roll
    let calls = 0;
    const counting: Rng = (max) => { calls++; return calls === 2 ? 80 : calls === 3 ? 2 : Math.min(0, max - 1); };
    expect(drawOne(byKey, counting, false).n).toBe(7);
    expect(calls).toBe(3);
  });

  it('is exactly the former uniform pick when every subject has one card (same rng calls, same card)', () => {
    const solo = [idol(1, 'idol:a'), idol(2, 'idol:b'), idol(3, 'idol:c')];
    const byKey = indexPool(solo);
    for (let v = 0; v < 3; v++) {
      let calls = 0;
      const rng: Rng = () => { calls++; return calls === 3 ? v : 0; };
      expect(drawOne(byKey, rng, false).n).toBe(v + 1);
      expect(calls).toBe(3);
    }
    // a pool without entities: every card is its own subject
    const bare: PoolCard[] = [{ n: 9, kind: 'group', rarity: 'C' }, { n: 10, kind: 'group', rarity: 'C' }];
    const bareOdds = exactOdds(bare);
    expect(bareOdds.get(9)).toBeCloseTo(0.5, 12);
    expect(bareOdds.get(10)).toBeCloseTo(0.5, 12);
  });

  it('counts subjects and cards per rarity and kind in the odds', () => {
    const o = computeOdds(pool);
    expect(o.subjects?.C).toEqual({ idol: 2, group: 3 });
    expect(o.cards?.C).toEqual({ idol: 2, group: 5 });
    expect(o.subjects?.U).toEqual({});
  });
});
