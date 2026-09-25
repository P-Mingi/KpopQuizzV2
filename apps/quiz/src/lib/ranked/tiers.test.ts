import { describe, expect, it } from 'vitest';

import { isPromotion, nextStep, tierFor, tierSteps, TIERS } from './tiers';

describe('tier thresholds (15.4)', () => {
  it('Bronze 0, Silver 4,000, Gold 6,500, Platinum 8,500, Diamond 10,500, Master 12,000', () => {
    expect(TIERS.map((t) => [t.name, t.min])).toEqual([
      ['Bronze', 0],
      ['Silver', 4_000],
      ['Gold', 6_500],
      ['Platinum', 8_500],
      ['Diamond', 10_500],
      ['Master', 12_000],
    ]);
  });
});

describe('tierFor: divisions III / II / I are equal thirds, Master has none', () => {
  it.each([
    [0, 'Bronze III'],
    [1_333, 'Bronze III'],
    [1_334, 'Bronze II'],
    [2_666, 'Bronze II'],
    [2_667, 'Bronze I'],
    [3_999, 'Bronze I'],
    [4_000, 'Silver III'],
    [4_833, 'Silver III'],
    [4_834, 'Silver II'],
    [5_666, 'Silver II'],
    [5_667, 'Silver I'],
    [6_499, 'Silver I'],
    [6_500, 'Gold III'],
    [7_166, 'Gold III'],
    [7_167, 'Gold II'],
    [7_833, 'Gold II'],
    [7_834, 'Gold I'],
    [8_290, 'Gold I'], // prototype
    [8_499, 'Gold I'],
    [8_500, 'Platinum III'],
    [8_610, 'Platinum III'], // prototype
    [9_166, 'Platinum III'],
    [9_167, 'Platinum II'],
    [9_833, 'Platinum II'],
    [9_834, 'Platinum I'],
    [10_499, 'Platinum I'],
    [10_500, 'Diamond III'],
    [10_999, 'Diamond III'],
    [11_000, 'Diamond II'],
    [11_499, 'Diamond II'],
    [11_500, 'Diamond I'],
    [11_999, 'Diamond I'],
    [12_000, 'Master'],
    [14_500, 'Master'], // 5 perfect runs
  ])('%i -> %s', (score, label) => {
    expect(tierFor(score).label).toBe(label);
  });

  it('Master has no division', () => {
    expect(tierFor(12_000)).toEqual({ tier: 'master', name: 'Master', division: null, label: 'Master' });
  });

  it.each([-1, 1.5, Number.NaN])('rejects %s', (s) => {
    expect(() => tierFor(s)).toThrow(RangeError);
  });

  it('every step starts exactly where tierFor changes', () => {
    const steps = tierSteps();
    expect(steps).toHaveLength(16);
    for (const s of steps) {
      expect(tierFor(s.at).label).toBe(s.label);
      if (s.at > 0) expect(tierFor(s.at - 1).label).not.toBe(s.label);
    }
  });
});

describe('nextStep ("210 points to Platinum III")', () => {
  it.each([
    [8_290, 'Platinum III', 8_500, 210], // prototype
    [0, 'Bronze II', 1_334, 1_334],
    [3_999, 'Silver III', 4_000, 1],
    [7_166, 'Gold II', 7_167, 1],
    [7_500, 'Gold I', 7_834, 334],
    [11_999, 'Master', 12_000, 1],
  ])('%i -> %s at %i (%i to go)', (score, label, at, toGo) => {
    expect(nextStep(score)).toEqual({ label, at, toGo });
  });

  it('Master has no next step (Legend is the top 100, not a score)', () => {
    expect(nextStep(12_000)).toBeNull();
    expect(nextStep(14_500)).toBeNull();
  });
});

describe('isPromotion', () => {
  it('8,290 -> 8,610 is a promotion (Gold I -> Platinum III)', () => {
    expect(isPromotion(8_290, 8_610)).toBe(true);
  });
  it('no promotion inside a division, none when equal', () => {
    expect(isPromotion(8_500, 8_600)).toBe(false);
    expect(isPromotion(8_290, 8_290)).toBe(false);
  });
});
