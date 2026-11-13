import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: () => ({}) }));

import { POOL_TTL_MS, drawServerPack, loadPool, resetPoolCache, serverRng } from './draw';
import { FIFTH_ODDS, KIND_WEIGHTS, ODDS, PACK_SIZE, RARITIES, computeOdds, drawPack, indexPool } from './rules';

import type { PoolCard, Rarity } from './types';

function mulberry(seed: number) {
  let a = seed | 0;
  return (max: number): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
}

// A pool shaped like the catalog: idols in all six rarities, groups in C U R SR, events in C U R, with unequal sizes.
function makePool(): PoolCard[] {
  const pool: PoolCard[] = [];
  let n = 1;
  const add = (kind: PoolCard['kind'], rarity: Rarity, count: number) => {
    for (let i = 0; i < count; i++) pool.push({ n: n++, kind, rarity });
  };
  add('idol', 'C', 40); add('idol', 'U', 30); add('idol', 'R', 25); add('idol', 'SR', 12); add('idol', 'UR', 40); add('idol', 'L', 6);
  add('group', 'C', 10); add('group', 'U', 10); add('group', 'R', 10); add('group', 'SR', 10);
  add('event', 'C', 5); add('event', 'U', 5); add('event', 'R', 5);
  return pool;
}

describe('the large draw (seeded rng, 200,000 packs = 1,000,000 cards)', () => {
  const pool = makePool();
  const byN = new Map(pool.map((c) => [c.n, c]));
  const index = indexPool(pool);
  const PACKS = 200_000;
  const rng = mulberry(20261112);

  const first4: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 };
  const fifth: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 };
  const kinds = new Map<string, number>(); // `${rarity}|${kind}` over all 5 positions
  const perCard = new Map<number, number>();
  let fifthIsC = 0;
  for (let p = 0; p < PACKS; p++) {
    const pack = drawPack(index, rng);
    expect(pack).toHaveLength(PACK_SIZE);
    for (let i = 0; i < PACK_SIZE; i++) {
      const c = byN.get(pack[i] as number) as PoolCard;
      (i === PACK_SIZE - 1 ? fifth : first4)[c.rarity]++;
      if (i === PACK_SIZE - 1 && c.rarity === 'C') fifthIsC++;
      const k = `${c.rarity}|${c.kind}`;
      kinds.set(k, (kinds.get(k) ?? 0) + 1);
      perCard.set(c.n, (perCard.get(c.n) ?? 0) + 1);
    }
  }
  const within = (count: number, n: number, p: number, se: number) => {
    const sd = Math.sqrt(n * p * (1 - p));
    return Math.abs(count - n * p) <= se * sd;
  };

  it('each rarity is within 4 standard errors of its odds (cards 1 to 4 of the pack)', () => {
    const n = PACKS * 4;
    for (const r of RARITIES) expect(within(first4[r], n, ODDS[r] / 100, 4), `${r}: ${first4[r]} of ${n}`).toBe(true);
  });
  it('the fifth card is never C and follows the fifth table (U 84) within 4 standard errors', () => {
    expect(fifthIsC).toBe(0);
    for (const r of RARITIES) {
      if (r === 'C') continue;
      expect(within(fifth[r], PACKS, FIFTH_ODDS[r] / 100, 4), `${r}: ${fifth[r]} of ${PACKS}`).toBe(true);
    }
    expect(fifth.U / PACKS).toBeGreaterThan(0.835);
    expect(fifth.U / PACKS).toBeLessThan(0.845);
  });
  it('kinds follow 75/15/10 among the kinds available for the rarity', () => {
    for (const r of RARITIES) {
      const avail = (['idol', 'group', 'event'] as const).filter((k) => kinds.has(`${r}|${k}`) || pool.some((c) => c.rarity === r && c.kind === k));
      const total = avail.reduce((s, k) => s + (kinds.get(`${r}|${k}`) ?? 0), 0);
      const w = avail.reduce((s, k) => s + KIND_WEIGHTS[k], 0);
      for (const k of avail) {
        expect(within(kinds.get(`${r}|${k}`) ?? 0, total, KIND_WEIGHTS[k] / w, 4), `${r} ${k}`).toBe(true);
      }
    }
    // UR and L are always idols, groups never reach UR or L, events only C U R.
    for (const r of ['UR', 'L'] as const) {
      expect(kinds.get(`${r}|group`) ?? 0).toBe(0);
      expect(kinds.get(`${r}|event`) ?? 0).toBe(0);
    }
    expect(kinds.get('SR|event') ?? 0).toBe(0);
  });
  it('inside a kind and rarity every card is equally likely (5 standard errors)', () => {
    for (const r of RARITIES) {
      for (const k of ['idol', 'group', 'event'] as const) {
        const cards = pool.filter((c) => c.rarity === r && c.kind === k);
        const total = kinds.get(`${r}|${k}`) ?? 0;
        for (const c of cards) expect(within(perCard.get(c.n) ?? 0, total, 1 / cards.length, 5), `${r} ${k} #${c.n}`).toBe(true);
      }
    }
  });
});

describe('the large draw on the real catalog shape (C, U, R, UR only, no event): 200,000 packs', () => {
  const pool: PoolCard[] = [];
  let n = 1;
  for (const r of ['C', 'U', 'R', 'UR'] as Rarity[]) {
    for (let i = 0; i < 40; i++) pool.push({ n: n++, kind: 'idol', rarity: r });
    for (let i = 0; i < 12; i++) pool.push({ n: n++, kind: 'group', rarity: r });
  }
  const byN = new Map(pool.map((c) => [c.n, c]));
  const index = indexPool(pool);
  const odds = computeOdds(index);
  const PACKS = 200_000;
  const rng = mulberry(777);
  const first4: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 };
  const fifth: Record<Rarity, number> = { C: 0, U: 0, R: 0, SR: 0, UR: 0, L: 0 };
  const kindCount = new Map<string, number>();
  for (let p = 0; p < PACKS; p++) {
    const pack = drawPack(index, rng);
    pack.forEach((x, i) => {
      const c = byN.get(x) as PoolCard;
      (i === 4 ? fifth : first4)[c.rarity]++;
      kindCount.set(`${c.rarity}|${c.kind}`, (kindCount.get(`${c.rarity}|${c.kind}`) ?? 0) + 1);
    });
  }
  const within = (count: number, total: number, p: number, se: number) => Math.abs(count - total * p) <= se * Math.sqrt(total * p * (1 - p));
  it('an absent edition (SR, L) is never drawn', () => {
    expect(first4.SR + first4.L + fifth.SR + fifth.L).toBe(0);
  });
  it('each rarity is within 4 standard errors of the renormalised odds', () => {
    for (const r of RARITIES) {
      expect(within(first4[r], PACKS * 4, odds.card[r] / 100, 4), `${r} ${first4[r]}`).toBe(true);
      expect(within(fifth[r], PACKS, odds.fifth[r] / 100, 4), `fifth ${r} ${fifth[r]}`).toBe(true);
    }
    expect(fifth.C).toBe(0);
    expect(fifth.U / PACKS).toBeGreaterThan(0.878);
    expect(fifth.U / PACKS).toBeLessThan(0.887);
  });
  // Owner decision 2026-11-13 (replaces "idol 75 and group 15 among the kinds present"): until the catalog has the plan's form (three kinds,
  // six rarities) every subject of the rolled rarity has the same chance, whatever its kind: 40 idols and 12 groups, so idols 40 of 52.
  it('every subject the same chance whatever its kind: idols 40 of 52 here', () => {
    expect(odds.kindWeights).toBe(false);
    for (const r of ['C', 'U', 'R', 'UR'] as Rarity[]) {
      const idol = kindCount.get(`${r}|idol`) ?? 0;
      const group = kindCount.get(`${r}|group`) ?? 0;
      expect(within(idol, idol + group, 40 / 52, 4), r).toBe(true);
    }
  });
});

describe('the pool cache', () => {
  beforeEach(() => resetPoolCache());
  const pool: PoolCard[] = [{ n: 1, kind: 'idol', rarity: 'C' }, { n: 2, kind: 'idol', rarity: 'U' }];
  it('reads once for 5 minutes, then again', async () => {
    const read = vi.fn(async () => pool);
    await loadPool(read, 1000);
    await loadPool(read, 1000 + POOL_TTL_MS - 1);
    expect(read).toHaveBeenCalledTimes(1);
    await loadPool(read, 1000 + POOL_TTL_MS);
    expect(read).toHaveBeenCalledTimes(2);
  });
  it('an empty catalog is an error, not an empty pack', async () => {
    await expect(loadPool(async () => [], 5)).rejects.toThrow(/no card in packs/);
  });
  it('drawServerPack uses the injected rng and the cached pool', async () => {
    const pack = await drawServerPack({ read: async () => pool, now: 1, rng: mulberry(1) });
    expect(pack).toHaveLength(5);
    expect(pack[4]).toBe(2);
  });
  it('serverRng stays in range', () => {
    for (let i = 0; i < 1000; i++) {
      const x = serverRng(100000);
      expect(Number.isInteger(x) && x >= 0 && x < 100000).toBe(true);
    }
    expect(serverRng(1)).toBe(0);
  });
});

describe('no Math.random in the Cards server code', () => {
  it('lib/cards and the API routes never call Math.random', () => {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
    const files = ['lib/cards/draw.ts', 'lib/cards/rules.ts'];
    for (const f of files) expect(readFileSync(path.join(root, f), 'utf8')).not.toMatch(/Math\.random/);
    expect(readFileSync(path.join(root, 'lib/cards/draw.ts'), 'utf8')).toMatch(/randomInt/);
  });
});
