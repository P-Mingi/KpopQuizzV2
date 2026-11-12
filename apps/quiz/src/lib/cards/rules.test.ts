import { describe, expect, it } from 'vitest';

import {
  CAP,
  FIFTH_ODDS,
  LOCK_SENTENCES,
  ODDS,
  PACK_SIZE,
  PERIOD_MS,
  RARITIES,
  SHARDS,
  creditLine,
  drawPack,
  nextParisMidnight,
  parisDayOf,
  walletAt,
} from './rules';
import type { PhotoCredit, PoolCard, Rarity } from './types';

export function seeded(seed: number) {
  let a = seed | 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (max: number) => Math.floor(next() * max);
}

const iso = (s: string) => +new Date(s);

describe('constants', () => {
  it('odds sum to 100 and the fifth table to 100 with no Common', () => {
    expect(RARITIES.reduce((s, r) => s + ODDS[r], 0)).toBeCloseTo(100, 9);
    expect(RARITIES.reduce((s, r) => s + FIFTH_ODDS[r], 0)).toBeCloseTo(100, 9);
    expect(FIFTH_ODDS.C).toBe(0);
    expect(FIFTH_ODDS.U).toBeCloseTo(ODDS.C + ODDS.U, 9);
  });
  it('shards and the five lock sentences are exact', () => {
    expect(SHARDS).toEqual({ C: 1, U: 2, R: 5, SR: 12, UR: 30, L: 80 });
    expect(Object.keys(LOCK_SENTENCES)).toEqual(['one', 'sameday', 'newg', 'hiatus', 'crop']);
    expect(LOCK_SENTENCES.one).toBe('Only one free photo of this idol exists so far.');
    expect(LOCK_SENTENCES.sameday).toBe("All free photos come from the same day, so they can't make different editions.");
    expect(LOCK_SENTENCES.newg).toBe("New group: free photographers haven't caught up yet.");
    expect(LOCK_SENTENCES.hiatus).toBe('On a break, so no new public appearances to photograph.');
    expect(LOCK_SENTENCES.crop).toBe('Only appears in group shots, too small to crop for Full Art.');
    for (const s of Object.values(LOCK_SENTENCES)) expect(s).not.toMatch(new RegExp(String.fromCharCode(91, 0x2013, 0x2014, 93)));
  });
});

describe('creditLine', () => {
  const p: PhotoCredit = {
    id: 1, slot: 2, author: 'Jane Doe', authorUrl: null, licence: 'CC BY 2.0', licenceUrl: 'https://x',
    source: 'commons', sourcePage: 'https://x', shareAlike: false, modified: 'cropped, frame and text added',
  };
  it('plain', () => {
    expect(creditLine(p, 2)).toBe('Photo 2 by Jane Doe, CC BY 2.0, via Wikimedia Commons, cropped');
  });
  it('share alike says so', () => {
    expect(creditLine({ ...p, licence: 'CC BY-SA 4.0', shareAlike: true, source: 'koreanet' }, 1)).toBe(
      'Photo 1 by Jane Doe, CC BY-SA 4.0, via Korea.net on Flickr, cropped. This card is shared under CC BY-SA 4.0.',
    );
  });
});

describe('drawPack', () => {
  const pool: PoolCard[] = [];
  let n = 1;
  for (const r of RARITIES) {
    for (let i = 0; i < 5; i++) pool.push({ n: n++, kind: 'idol', rarity: r });
    if (r !== 'UR' && r !== 'L') pool.push({ n: n++, kind: 'group', rarity: r });
    if (r === 'C' || r === 'U' || r === 'R') pool.push({ n: n++, kind: 'event', rarity: r });
  }
  const byN = new Map(pool.map((c) => [c.n, c]));
  it('gives 5 cards of the pool, the fifth never C', () => {
    const rng = seeded(7);
    for (let i = 0; i < 2000; i++) {
      const cards = drawPack(pool, rng);
      expect(cards).toHaveLength(PACK_SIZE);
      for (const c of cards) expect(byN.has(c)).toBe(true);
      expect(byN.get(cards[4] as number)!.rarity).not.toBe('C');
    }
  });
  it('UR and L are always idols', () => {
    const rng = seeded(11);
    for (let i = 0; i < 5000; i++) {
      for (const c of drawPack(pool, rng)) {
        const card = byN.get(c)!;
        if (card.rarity === 'UR' || card.rarity === 'L') expect(card.kind).toBe('idol');
      }
    }
  });
  it('falls back to a lower rarity when a rarity has no card, never to C on the fifth', () => {
    const small: PoolCard[] = [
      { n: 1, kind: 'idol', rarity: 'C' },
      { n: 2, kind: 'idol', rarity: 'U' },
    ];
    const rng = seeded(3);
    for (let i = 0; i < 500; i++) {
      const cards = drawPack(small, rng);
      expect(cards[4]).toBe(2);
    }
  });
  it('an empty pool throws', () => {
    expect(() => drawPack([], seeded(1))).toThrow();
  });
});

describe('Paris time', () => {
  it('parisDayOf follows Paris, not UTC', () => {
    expect(parisDayOf(iso('2026-07-01T22:30:00Z'))).toBe('2026-07-02');
    expect(parisDayOf(iso('2026-01-01T22:30:00Z'))).toBe('2026-01-01');
  });
  it('midnight in summer and winter', () => {
    expect(new Date(nextParisMidnight(iso('2026-07-01T12:00:00Z'))).toISOString()).toBe('2026-07-01T22:00:00.000Z');
    expect(new Date(nextParisMidnight(iso('2026-01-10T12:00:00Z'))).toISOString()).toBe('2026-01-10T23:00:00.000Z');
  });
  it('exactly at midnight gives the following one', () => {
    expect(new Date(nextParisMidnight(iso('2026-01-10T23:00:00Z'))).toISOString()).toBe('2026-01-11T23:00:00.000Z');
  });
  it('the 2026 spring change makes a 23 h day, autumn a 25 h day', () => {
    // 29 March 2026: Paris goes from +01 to +02 at 01:00 UTC.
    expect(new Date(nextParisMidnight(iso('2026-03-29T00:30:00Z'))).toISOString()).toBe('2026-03-29T22:00:00.000Z');
    expect(new Date(nextParisMidnight(iso('2026-03-28T23:30:00Z'))).toISOString()).toBe('2026-03-29T22:00:00.000Z');
    // 25 October 2026: Paris goes from +02 to +01 at 01:00 UTC.
    expect(new Date(nextParisMidnight(iso('2026-10-24T23:30:00Z'))).toISOString()).toBe('2026-10-25T23:00:00.000Z');
    expect(new Date(nextParisMidnight(iso('2026-10-25T12:00:00Z'))).toISOString()).toBe('2026-10-25T23:00:00.000Z');
  });
  it('the 2027 changes (28 March, 31 October)', () => {
    expect(new Date(nextParisMidnight(iso('2027-03-27T23:30:00Z'))).toISOString()).toBe('2027-03-28T22:00:00.000Z');
    expect(new Date(nextParisMidnight(iso('2027-10-30T22:30:00Z'))).toISOString()).toBe('2027-10-31T23:00:00.000Z');
  });
});

describe('walletAt (the twin of the prototype sync)', () => {
  const t0 = iso('2026-11-12T10:00:00Z'); // Paris 11:00, 12 November
  const day = '2026-11-12';
  it('refills 1 per 10 minutes up to 5', () => {
    const row = { stock: 0, anchor: t0, parisDay: day, adsToday: 2, bonusToday: 1 };
    expect(walletAt(row, t0 + PERIOD_MS - 1).stock).toBe(0);
    const a = walletAt(row, t0 + PERIOD_MS);
    expect(a.stock).toBe(1);
    expect(a.anchor).toBe(t0 + PERIOD_MS);
    expect(a.nextAt).toBe(t0 + 2 * PERIOD_MS);
    expect(walletAt(row, t0 + 3.5 * PERIOD_MS).stock).toBe(3);
    expect(walletAt(row, t0 + 3.5 * PERIOD_MS).anchor).toBe(t0 + 3 * PERIOD_MS);
    const full = walletAt(row, t0 + 5 * PERIOD_MS);
    expect(full.stock).toBe(CAP);
    expect(full.nextAt).toBeNull();
    expect(walletAt(row, t0 + 50 * PERIOD_MS).stock).toBe(CAP);
  });
  it('a full stack re-anchors at now; spending then starts the count', () => {
    const row = { stock: 5, anchor: t0 - 99 * PERIOD_MS, parisDay: day, adsToday: 0, bonusToday: 0 };
    const w = walletAt(row, t0);
    expect(w.stock).toBe(5);
    expect(w.anchor).toBe(t0);
  });
  it('midnight Paris tops up to 5 and resets ads_today and bonus_today', () => {
    const mid = nextParisMidnight(t0);
    const row = { stock: 1, anchor: mid - 5 * 60000, parisDay: day, adsToday: 7, bonusToday: 2 };
    const before = walletAt(row, mid - 1);
    expect(before.adsToday).toBe(7);
    expect(before.stock).toBeLessThan(5);
    const after = walletAt(row, mid);
    expect(after.stock).toBe(5);
    expect(after.adsToday).toBe(0);
    expect(after.bonusToday).toBe(0);
    expect(after.parisDay).toBe('2026-11-13');
  });
  it('a new day with a full stack resets counters only', () => {
    const row = { stock: 5, anchor: t0, parisDay: day, adsToday: 4, bonusToday: 1 };
    const w = walletAt(row, nextParisMidnight(t0) + 5);
    expect(w).toMatchObject({ stock: 5, adsToday: 0, bonusToday: 0 });
  });
  it('midnight on the clock-change days', () => {
    for (const [start, dayStr] of [
      ['2026-03-28T20:00:00Z', '2026-03-28'],
      ['2026-10-24T20:00:00Z', '2026-10-24'],
      ['2027-03-27T20:00:00Z', '2027-03-27'],
      ['2027-10-30T20:00:00Z', '2027-10-30'],
    ] as const) {
      const s = iso(start);
      const row = { stock: 0, anchor: s, parisDay: dayStr, adsToday: 3, bonusToday: 1 };
      const mid = nextParisMidnight(s);
      expect(walletAt(row, mid - 1).parisDay).toBe(dayStr);
      const w = walletAt(row, mid);
      expect(w.parisDay).not.toBe(dayStr);
      expect(w).toMatchObject({ stock: 5, adsToday: 0, bonusToday: 0 });
    }
  });
  it('accepts ISO strings and Dates for the anchor', () => {
    const row = { stock: 0, anchor: new Date(t0).toISOString(), parisDay: day, adsToday: 0, bonusToday: 0 };
    expect(walletAt(row, t0 + PERIOD_MS).stock).toBe(1);
    expect(walletAt({ ...row, anchor: new Date(t0) }, t0 + PERIOD_MS).stock).toBe(1);
  });
});

export type { Rarity };
