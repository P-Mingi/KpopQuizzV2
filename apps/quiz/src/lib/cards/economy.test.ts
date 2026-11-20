// Bunnyverse Cards lots 3 and 4 (lane ECON): the pure rules of the economy: the Gold guarantee in the draw, the missing half, the focus pack
// (cards 2 and 4), the timer cap in walletAt, the quiet hours, the craft costs, the main button, the sentences and the settings.
import { describe, expect, it } from 'vitest';

import { WISHLIST_MAX, craftView, economySentences, focusGroups, mainButton, pityLine, pityProgress, restingLine, timerLine, timerResting } from './economy';
import { adsPerDay, timerPerDay } from './flags';
import {
  CRAFT_COST, PACK_SIZE, PERIOD_MS, PITY_UR, QUIET_HOURS, RARITY_LABEL, TIMER_PACKS_PER_DAY, craftCost, drawPack, indexPool, inQuietHours, walletAt,
} from './rules';

import type { PoolCard, Rarity } from './types';

const rngOf = (seed: number) => {
  let a = seed | 0;
  return (max: number): number => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return Math.floor((((t ^ (t >>> 14)) >>> 0) / 4294967296) * max);
  };
};

const card = (n: number, rarity: Rarity, entity: string, o: Partial<PoolCard> = {}): PoolCard => ({ n, kind: 'idol', rarity, entity, ...o });
// Group G (idols a and b, its own pair), group H (idol c); every rarity from C to Gold
const POOL: PoolCard[] = [
  card(1, 'C', 'idol:a', { group: 'group:G' }), card(2, 'U', 'idol:a', { group: 'group:G' }), card(3, 'UR', 'idol:a', { group: 'group:G' }), card(4, 'L', 'idol:a', { group: 'group:G' }),
  card(5, 'C', 'idol:b', { group: 'group:G' }), card(6, 'U', 'idol:b', { group: 'group:G' }),
  card(7, 'C', 'idol:c', { group: 'group:H' }), card(8, 'U', 'idol:c', { group: 'group:H' }), card(9, 'R', 'idol:c', { group: 'group:H' }),
  card(10, 'C', 'idol:d'), card(11, 'U', 'idol:d'), card(12, 'R', 'idol:d'), card(13, 'SR', 'idol:d'), card(14, 'UR', 'idol:d'),
];
const rarityOf = new Map(POOL.map((c) => [c.n, c.rarity]));
const groupOf = new Map(POOL.map((c) => [c.n, c.group ?? null]));

describe('A11, the Gold guarantee in the draw', () => {
  it('without the flag the 5th card is rolled; with it the 5th card of every pack is Gold', () => {
    const idx = indexPool(POOL);
    let plainGold = 0;
    for (let s = 1; s <= 300; s++) {
      if (rarityOf.get(drawPack(idx, rngOf(s))[4] as number) === 'UR') plainGold++;
      const cards = drawPack(idx, rngOf(s), { pity: true });
      expect(cards).toHaveLength(PACK_SIZE);
      expect(rarityOf.get(cards[4] as number)).toBe('UR');
    }
    expect(plainGold).toBeLessThan(300);
  });
  it('a Gold card in the first four cards does not change the 5th: it is Gold anyway (card 5 of pack 30)', () => {
    const idx = indexPool(POOL);
    for (let s = 1; s <= 200; s++) expect(rarityOf.get(drawPack(idx, rngOf(s), { pity: true })[4] as number)).toBe('UR');
  });
  it('holds only while the pool has a Gold card', () => {
    const idx = indexPool(POOL.filter((c) => c.rarity !== 'UR'));
    for (let s = 1; s <= 100; s++) {
      const cards = drawPack(idx, rngOf(s), { pity: true });
      expect(cards.every((n) => rarityOf.get(n) !== 'UR')).toBe(true);
    }
  });
  it('the 5th card is never Standard', () => {
    const idx = indexPool(POOL);
    for (let s = 1; s <= 300; s++) expect(rarityOf.get(drawPack(idx, rngOf(s), { pity: s % 2 === 0 })[4] as number)).not.toBe('C');
  });
  it('PITY_UR is the 30th pack', () => {
    expect(PITY_UR).toBe(30);
  });
});

describe('A17, the focus pack: cards 2 and 4', () => {
  it('cards 2 and 4 come from the group wherever the rolled edition exists there, the others from the whole pool', () => {
    const idx = indexPool(POOL);
    let outside = 0;
    for (let s = 1; s <= 400; s++) {
      const cards = drawPack(idx, rngOf(s), { focus: 'group:G' });
      for (const i of [1, 3]) {
        const r = rarityOf.get(cards[i] as number) as Rarity;
        const groupHas = POOL.some((c) => c.group === 'group:G' && c.rarity === r);
        if (groupHas) expect(groupOf.get(cards[i] as number)).toBe('group:G');
      }
      for (const i of [0, 2, 4]) if (groupOf.get(cards[i] as number) !== 'group:G') outside++;
    }
    expect(outside).toBeGreaterThan(0); // cards 1, 3 and 5 are drawn as usual
  });
  it('a group with no card of the rolled edition falls back to the whole pool', () => {
    const idx = indexPool(POOL);
    const seen = new Set<number>();
    for (let s = 1; s <= 600; s++) for (const i of [1, 3]) seen.add(drawPack(idx, rngOf(s), { focus: 'group:H' })[i] as number);
    // H has C, U, R only: a Gold or an Era card in position 2 or 4 can only come from the fallback
    expect([...seen].some((n) => ['SR', 'UR', 'L'].includes(rarityOf.get(n) as string))).toBe(true);
  });
  it('the edition is rolled with the normal odds: the focus changes who, not how rare', () => {
    const idx = indexPool(POOL);
    const count = (focus: string | undefined): number => {
      let u = 0;
      for (let s = 1; s <= 4000; s++) if (rarityOf.get(drawPack(idx, rngOf(s * 7), focus ? { focus } : {})[1] as number) === 'U') u++;
      return u;
    };
    expect(Math.abs(count('group:G') - count(undefined))).toBeLessThan(260);
  });
});

describe('A12, the missing half in the draw', () => {
  const HALVES: PoolCard[] = [
    { n: 1, kind: 'group', rarity: 'C', entity: 'group:P' }, { n: 2, kind: 'group', rarity: 'C', entity: 'group:P' },
    { n: 3, kind: 'group', rarity: 'U', entity: 'group:P' }, { n: 4, kind: 'group', rarity: 'U', entity: 'group:P' },
  ];
  it('landing on a pair of which he owns one half gives the other', () => {
    const idx = indexPool(HALVES);
    for (let s = 1; s <= 200; s++) {
      const cards = drawPack(idx, rngOf(s), { owned: new Set([1]) });
      // card 1 is owned: whenever the Standard pair comes up first, it is half 2
      const firstC = cards.find((n) => n === 1 || n === 2);
      if (firstC !== undefined && !cards.slice(0, cards.indexOf(firstC)).includes(2)) expect(firstC).toBe(2);
    }
  });
  it('also inside one pack: after one half the next draw of the pair is the other', () => {
    const idx = indexPool(HALVES);
    for (let s = 1; s <= 200; s++) {
      const cards = drawPack(idx, rngOf(s), { owned: new Set<number>() });
      for (const pair of [[1, 2], [3, 4]]) {
        const at = cards.map((n, i) => (pair.includes(n) ? i : -1)).filter((i) => i >= 0);
        if (at.length >= 2) expect(cards[at[0] as number]).not.toBe(cards[at[1] as number]);
      }
    }
  });
});

describe('A13, the timer cap in walletAt (the twin of cards_roll)', () => {
  const day = (s: string): number => +new Date(s);
  const row = (o: { stock: number; anchor: string; parisDay: string; timerToday?: number }) => ({ stock: o.stock, anchor: day(o.anchor), parisDay: o.parisDay, adsToday: 0, bonusToday: 0, ...(o.timerToday === undefined ? {} : { timerToday: o.timerToday }) });
  it('counts the refills and stops at the cap', () => {
    const w = walletAt(row({ stock: 0, anchor: '2026-11-12T05:00:00Z', parisDay: '2026-11-12', timerToday: 38 }), day('2026-11-12T09:00:00Z'), 40);
    expect(w).toMatchObject({ stock: 2, timerToday: 40, nextAt: null });
  });
  it('is unchanged without a cap (the 002 behaviour) and counts anyway', () => {
    const w = walletAt(row({ stock: 1, anchor: '2026-11-12T09:00:00Z', parisDay: '2026-11-12' }), day('2026-11-12T09:25:00Z'));
    expect(w).toMatchObject({ stock: 3, timerToday: 2, nextAt: day('2026-11-12T09:30:00Z') });
  });
  it('Paris midnight: the count restarts and the top-up is not counted', () => {
    const w = walletAt(row({ stock: 0, anchor: '2026-11-12T22:00:00Z', parisDay: '2026-11-12', timerToday: 40 }), day('2026-11-12T23:00:00Z'), 40);
    expect(w).toMatchObject({ stock: 5, timerToday: 0, parisDay: '2026-11-13' });
  });
  it('a cap of 0 closes the timer, a full stack adds nothing', () => {
    expect(walletAt(row({ stock: 0, anchor: '2026-11-12T05:00:00Z', parisDay: '2026-11-12' }), day('2026-11-12T10:00:00Z'), 0)).toMatchObject({ stock: 0, timerToday: 0, nextAt: null });
    expect(walletAt(row({ stock: 5, anchor: '2026-11-12T05:00:00Z', parisDay: '2026-11-12', timerToday: 4 }), day('2026-11-12T10:00:00Z'), 40)).toMatchObject({ stock: 5, timerToday: 4 });
  });
  it('the default is 40 a day', () => {
    expect(TIMER_PACKS_PER_DAY).toBe(40);
    expect(timerPerDay({ env: {} })).toBe(40);
    expect(timerPerDay({ env: { CARDS_TIMER_PER_DAY: '12' } })).toBe(12);
    expect(timerPerDay({ env: { CARDS_TIMER_PER_DAY: '0' } })).toBe(0);
    expect(timerPerDay({ env: { CARDS_TIMER_PER_DAY: 'abc' } })).toBe(40);
    expect(timerPerDay({ env: { CARDS_TIMER_PER_DAY: '9999' } })).toBe(500);
  });
  it('the lines of the state', () => {
    expect(timerLine({ timerUsed: 14, timerCap: 40 })).toBe('14 of 40 timer packs today');
    expect(timerLine({})).toBeNull();
    expect(timerResting({ timerLeft: 0 })).toBe(true);
    expect(timerResting({ timerLeft: 3 })).toBe(false);
    expect(timerResting({})).toBe(false);
    expect(restingLine({ timerLeft: 0, timerCap: 40, stock: 0, cap: 5 })).toMatch(/midnight, Paris time/);
    expect(restingLine({ timerLeft: 0, timerCap: 40, stock: 5, cap: 5 })).toBeNull();
    expect(restingLine({ timerLeft: 3, timerCap: 40, stock: 0, cap: 5 })).toBeNull();
  });
});

describe('A13, the quiet hours (no push from 22:00 to 08:00 Paris)', () => {
  it('the window', () => {
    expect(QUIET_HOURS).toEqual({ from: 22, to: 8 });
  });
  // Paris is UTC+1 on 12 November 2026 and UTC+2 on 12 July 2026
  it.each([
    ['2026-11-12T20:59:59Z', false], ['2026-11-12T21:00:00Z', true], ['2026-11-12T23:30:00Z', true], ['2026-11-13T05:00:00Z', true],
    ['2026-11-13T06:59:59Z', true], ['2026-11-13T07:00:00Z', false], ['2026-11-13T12:00:00Z', false],
    ['2026-07-12T19:59:59Z', false], ['2026-07-12T20:00:00Z', true], ['2026-07-13T05:59:59Z', true], ['2026-07-13T06:00:00Z', false],
  ])('%s -> %s', (t, quiet) => {
    expect(inQuietHours(new Date(t))).toBe(quiet);
    expect(inQuietHours(+new Date(t))).toBe(quiet);
  });
});

describe('A14, craft', () => {
  it('Standard 10, Stage 20, Holo 50, Era 120, Gold 300; a Full Art is not craftable', () => {
    expect(CRAFT_COST).toEqual({ C: 10, U: 20, R: 50, SR: 120, UR: 300 });
    expect(craftCost('L')).toBeNull();
    expect(craftCost('UR')).toBe(300);
  });
  it('the button: short of shards, owned, a Full Art, ready', () => {
    expect(craftView('R', 20, false)).toEqual({ cost: 50, reason: 'You need 30 more shards (50 in all).' });
    expect(craftView('R', 50, false)).toEqual({ cost: 50, reason: null });
    expect(craftView('R', 500, true).reason).toMatch(/already have/);
    const l = craftView('L', 5000, false);
    expect(l.cost).toBeNull();
    expect(l.reason).toContain(RARITY_LABEL.L);
  });
  it('the wishlist holds 50', () => {
    expect(WISHLIST_MAX).toBe(50);
  });
});

describe('the Gold note', () => {
  it('"Gold within N packs" with a progress bar value', () => {
    expect(pityLine(30)).toBe('Gold within 30 packs');
    expect(pityLine(1)).toBe('Gold within 1 pack');
    expect(pityLine(null)).toBeNull();
    expect(pityLine(undefined)).toBeNull();
    expect(pityProgress(30)).toBe(0);
    expect(pityProgress(1)).toBe(100);
    expect(pityProgress(null)).toBe(0);
    expect(pityProgress(15.5)).toBeGreaterThan(40);
  });
});

describe('B4, the main button', () => {
  const base = { stock: 0, shards: 0, adsLeft: 10, adsAvailable: true, nextMs: 432_000 };
  it('a pack in the stack: Open a pack', () => {
    expect(mainButton({ ...base, stock: 2, shards: 500 })).toEqual({ kind: 'open', label: 'Open a pack', disabled: false });
  });
  it('empty stack and 50 shards: Open with 50 shards', () => {
    expect(mainButton({ ...base, shards: 50 })).toMatchObject({ kind: 'shards', label: 'Open with 50 shards', disabled: false });
    expect(mainButton({ ...base, shards: 49 }).kind).toBe('ad');
  });
  it('else an ad is left: Watch an ad, get 1 pack (launch polish: an ad gives a pack, the same words as the screen before the ad)', () => {
    expect(mainButton(base)).toMatchObject({ kind: 'ad', label: 'Watch an ad, get 1 pack', disabled: false });
  });
  it('else the timer: Next pack in 7:12', () => {
    expect(mainButton({ ...base, adsLeft: 0 })).toEqual({ kind: 'wait', label: 'Next pack in 7:12', disabled: true });
    expect(mainButton({ ...base, adsAvailable: false })).toMatchObject({ kind: 'wait', label: 'Next pack in 7:12' });
    expect(mainButton({ ...base, adsLeft: 0, nextMs: 59_001 }).label).toBe('Next pack in 1:00');
  });
  it('no refill coming today: the timer line says midnight', () => {
    expect(mainButton({ ...base, adsLeft: 0, nextMs: null })).toEqual({ kind: 'wait', label: 'More packs at midnight', disabled: true });
  });
  it('an ad gives 1 pack, up to CARDS_AD_PACKS_PER_DAY a day (default 3): the one cap, and the odds page says it', () => {
    expect(adsPerDay({ env: {} })).toBe(3);
    expect(adsPerDay({ env: { CARDS_AD_PACKS_PER_DAY: '5' } })).toBe(5);
    expect(economySentences(40, undefined, adsPerDay({ env: { CARDS_AD_PACKS_PER_DAY: '5' } })).ad).toContain('gives 1 pack, up to 5 a day');
    expect(economySentences(40).ad).not.toMatch(/shard/i);
  });
  it('PERIOD_MS is the 10 minute timer the label counts down', () => {
    expect(PERIOD_MS).toBe(600_000);
  });
});

describe('the odds page sentences and the focus picker', () => {
  it('say Gold and Full Art, never Ultra Rare or Legendary, and contain no dash', () => {
    const s = economySentences(40);
    const all = Object.values(s).join(' ');
    expect(all).not.toMatch(/Ultra|Legendary|Common|Uncommon/);
    expect(all).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
    expect(s.pity).toBe('After 29 packs in a row without a Gold or a Full Art card, the last card of the next pack is Gold.');
    expect(s.half).toMatch(/other half/);
    expect(s.focus).toMatch(/2nd and 4th/);
    expect(s.timer).toContain('40 packs a day');
    expect(s.craft).toContain('Gold 300');
    expect(s.craft).not.toMatch(/Full Art \d/);
    expect(s.ad).toBe('A rewarded ad you choose to watch gives 1 pack, up to 3 a day. Packs and cards won this way cannot be traded or given.');
    expect(economySentences(12, ['C', 'U'], 40).timer).toContain('12 packs');
  });
  it('the groups of the picker, by name, once each', () => {
    const slim = (entity: string, name: string, kind: 'group' | 'idol') => ({ entity, name, kind }) as never;
    expect(focusGroups([slim('group:B', 'Beta', 'group'), slim('group:B', 'Beta', 'group'), slim('idol:x', 'X', 'idol'), slim('group:A', 'Alpha', 'group')])).toEqual([
      { id: 'group:A', name: 'Alpha' }, { id: 'group:B', name: 'Beta' }]);
  });
});
