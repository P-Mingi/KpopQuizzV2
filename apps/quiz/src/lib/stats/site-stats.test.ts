import { describe, expect, it } from 'vitest';

import { atLeast, exact, fillStats } from './site-stats';

// The shared rounding of every public count (owner, 2026-10-14): a floor, so "N+" is
// always true, and one format everywhere.

describe('atLeast', () => {
  it('exact under 100, then floors to the ten, the hundred, the thousand', () => {
    expect(atLeast(47)).toBe('47');
    expect(atLeast(456)).toBe('450+');
    expect(atLeast(4281)).toBe('4,200+');
    expect(atLeast(73425)).toBe('73,000+');
  });
  it('never claims more than the real number', () => {
    for (const n of [100, 999, 1000, 9999, 10000, 123456]) {
      const shown = Number(atLeast(n).replace(/[+,]/g, ''));
      expect(shown).toBeLessThanOrEqual(n);
    }
  });
  it('a broken input is 0, never NaN', () => {
    expect(atLeast(Number.NaN)).toBe('0');
    expect(atLeast(-3)).toBe('0');
    expect(exact(73425)).toBe('73,425');
  });
});

describe('fillStats', () => {
  const stats = { quizzes: 456, groupsWithQuizzes: 47, groupsListed: 95, songs: 4236, songGroups: 84, plays: 73425, asOf: '2026-10-14T00:00:00Z' };
  it('fills each token with the rounded live count', () => {
    expect(fillStats('{quizzes} quizzes covering {groups} groups', stats)).toBe('450+ quizzes covering 47 groups');
    expect(fillStats('{songs} songs across {songGroups} groups, {plays} plays', stats)).toBe('4,200+ songs across 84 groups, 73,000+ plays');
  });
  it('without counts, a vague true phrase, never a stale number', () => {
    expect(fillStats('{songs} songs across {songGroups} groups', null)).toBe('thousands of songs across dozens of groups');
  });
});
