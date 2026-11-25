// Lane DLE2-A: the live numbers of a game page. The floor of 10 players, the ordinals of both languages, a missing number (L40 not applied) hidden, the words, no dash.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LIVE_FLOOR, LIVE_REFRESH_MS, liveCopy, ordinal, shownPlayers, shownRank } from './live';

describe('the floor of 10 players', () => {
  it('shows the count from 10 and hides it under, when absent or not a number', () => {
    expect(LIVE_FLOOR).toBe(10);
    expect(shownPlayers(9)).toBeNull();
    expect(shownPlayers(10)).toBe(10);
    expect(shownPlayers(1234)).toBe(1234);
    for (const v of [undefined, null, 'x', NaN, Infinity]) expect(shownPlayers(v)).toBeNull();
  });

  it('shows the rank only with a shown count and a rank between 1 and that count', () => {
    expect(shownRank(3, 9)).toBeNull();
    expect(shownRank(3, undefined)).toBeNull();
    expect(shownRank(undefined, 50)).toBeNull();
    expect(shownRank(null, 50)).toBeNull();
    expect(shownRank(0, 50)).toBeNull();
    expect(shownRank(51, 50)).toBeNull();
    expect(shownRank(1.5, 50)).toBeNull();
    expect(shownRank(3, 50)).toBe(3);
  });

  it('refreshes every 60 seconds', () => {
    expect(LIVE_REFRESH_MS).toBe(60_000);
  });
});

describe('the ordinals', () => {
  it('French: 1er, then 2e, 3e, 11e, 21e', () => {
    expect([1, 2, 3, 11, 21, 100].map((n) => ordinal(n, 'fr'))).toEqual(['1er', '2e', '3e', '11e', '21e', '100e']);
  });
  it('English: 1st 2nd 3rd 4th, 11th 12th 13th, 21st 22nd 23rd, 101st 111th', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101, 111, 112].map((n) => ordinal(n, 'en'))).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st', '111th', '112th']);
  });
});

describe('the words', () => {
  it('French', () => {
    const c = liveCopy('fr');
    expect(c.rankLine('Mikasa Ackerman', 1)).toBe('Tu es le 1er à trouver Mikasa Ackerman aujourd’hui');
    expect(c.rankLine('Mikasa Ackerman', 7)).toBe('Tu es le 7e à trouver Mikasa Ackerman aujourd’hui');
    expect(c.outOf(1234)).toMatch(/^sur 1.234 joueurs$/);
    expect(c.playersToday(12)).toBe('12 joueurs aujourd’hui');
    expect(c.nextShort).toBe('prochain dans');
    expect(c.yesterdayShort).toBe('Hier : ');
  });
  it('English', () => {
    const c = liveCopy('en');
    expect(c.rankLine('Karina', 22)).toBe('You are the 22nd to find Karina today');
    expect(c.outOf(1234)).toBe('out of 1,234 players');
    expect(c.playersToday(12)).toBe('12 players today');
    expect(c.nextShort).toBe('next in');
  });
  it('has no dash', () => {
    const src = readFileSync(join(__dirname, 'live.ts'), 'utf8');
    expect(src).not.toMatch(/[–—…]/);
  });
});
