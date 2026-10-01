import { describe, expect, it } from 'vitest';

import { parseStanding, rankLine } from './standing';

// C2-008: GET /api/ux-v1/p4/standing answered {signedIn:true, played:false, totalPlayers:39}
// with no rank key for a signed-in fan with no stored play; the results tested
// `rank !== null` (undefined passed) and threw on rank.toLocaleString.

describe('parseStanding (C2-008)', () => {
  it('a signed-in fan with no stored play and no rank key: rank null, no rank line', () => {
    const s = parseStanding({ signedIn: true, played: false, totalPlayers: 39 });
    expect(s).toEqual({ signedIn: true, played: false, bestScore: null, total: null, rank: null, totalPlayers: 39, bestAt: null });
    expect(rankLine(s)).toBeNull();
  });

  it('a signed-in fan with a play: every field, and the rank line', () => {
    const s = parseStanding({ signedIn: true, played: true, bestScore: 7, total: 8, rank: 3, totalPlayers: 1234, bestAt: '2026-09-26T10:00:00Z' });
    expect(s).toEqual({ signedIn: true, played: true, bestScore: 7, total: 8, rank: 3, totalPlayers: 1234, bestAt: '2026-09-26T10:00:00Z' });
    expect(rankLine(s)).toEqual({ rank: 3, total: 1234 });
  });

  it('a best score of 0 is a real play', () => {
    const s = parseStanding({ signedIn: true, played: true, bestScore: 0, total: 8, rank: 40, totalPlayers: 40 });
    expect(s?.played).toBe(true);
    expect(s?.bestScore).toBe(0);
  });

  it('guests: rank null (the rank-for-score function not applied yet), or a rank', () => {
    expect(rankLine(parseStanding({ signedIn: false, rank: null, totalPlayers: null }))).toBeNull();
    expect(rankLine(parseStanding({ signedIn: false, rank: 12, totalPlayers: 300 }))).toEqual({ rank: 12, total: 300 });
  });

  it('never trusts a type: strings, NaN, zero, negatives, fractions and nulls give no rank line', () => {
    for (const rank of [undefined, null, '3', Number.NaN, 0, -1, 2.5, Infinity]) {
      expect(rankLine(parseStanding({ signedIn: true, played: true, bestScore: 5, rank, totalPlayers: 10 }))).toBeNull();
    }
    for (const totalPlayers of [undefined, null, '10', 0, -3]) {
      expect(rankLine(parseStanding({ signedIn: true, played: true, bestScore: 5, rank: 1, totalPlayers }))).toBeNull();
    }
    // played without a numeric best score is not a play
    expect(parseStanding({ signedIn: true, played: true, bestScore: '5' })?.played).toBe(false);
  });

  it('not an object: null (and no rank line)', () => {
    for (const raw of [null, undefined, 'x', 3, [], true]) {
      expect(parseStanding(raw)).toBeNull();
    }
    expect(rankLine(null)).toBeNull();
  });
});
