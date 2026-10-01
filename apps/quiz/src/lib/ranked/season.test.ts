import { describe, expect, it } from 'vitest';

import {
  applyRun,
  bestRuns,
  currentSeason,
  daysLeft,
  nextSeasonWindow,
  placement,
  scoreToBeat,
  seasonAvgAnswerMs,
  seasonScore,
} from './season';

import type { FinishedRun, Season } from './season';

let seq = 0;
function run(points: number, day: number, extra: Partial<FinishedRun> = {}): FinishedRun {
  seq += 1;
  return {
    id: `run-${String(seq).padStart(3, '0')}`,
    points,
    correct: 8,
    avgAnswerMs: 2_000,
    finishedAt: new Date(Date.UTC(2026, 8, 1 + day, 12)).toISOString(),
    ...extra,
  };
}

// The prototype's season: best 5 = 1,910 + 1,780 + 1,640 + 1,540 + 1,420 = 8,290 (Gold I),
// plus weaker runs that do not count.
function prototypeSeason(): FinishedRun[] {
  return [run(1_540, 1), run(1_910, 2), run(900, 3), run(1_420, 4), run(1_780, 5), run(1_200, 6), run(1_640, 7)];
}

describe('season score = sum of the best 5 runs', () => {
  it('prototype: 8,290 = Gold I, score over 1,420 to count', () => {
    const runs = prototypeSeason();
    expect(bestRuns(runs).map((r) => r.points)).toEqual([1_910, 1_780, 1_640, 1_540, 1_420]);
    expect(seasonScore(runs)).toBe(8_290);
    expect(scoreToBeat(runs)).toBe(1_420);
  });

  it('prototype run: 1,740 replaces 1,420 -> season 8,610 -> Platinum III', () => {
    const impact = applyRun(prototypeSeason(), run(1_740, 8));
    expect(impact.counted).toBe(true);
    expect(impact.replaced?.points).toBe(1_420);
    expect(impact.toBeat).toBe(1_420);
    expect(impact.before).toMatchObject({ score: 8_290, tier: { label: 'Gold I' } });
    expect(impact.after).toMatchObject({ score: 8_610, tier: { label: 'Platinum III' } });
    expect(impact.delta).toBe(320);
    expect(impact.promoted).toBe(true);
    expect(impact.next).toEqual({ label: 'Platinum II', at: 9_167, toGo: 557 });
  });

  it('before the run the card reads "210 points to Platinum III"', () => {
    const impact = applyRun(prototypeSeason(), run(0, 8));
    expect(impact.before.score).toBe(8_290);
    expect(impact.counted).toBe(false);
    expect(impact.after.score).toBe(8_290);
    expect(impact.next).toEqual({ label: 'Platinum III', at: 8_500, toGo: 210 });
  });

  it('a run must BEAT the 5th best: equal or lower does not count, the score never goes down', () => {
    for (const points of [1_420, 1_419, 0]) {
      const impact = applyRun(prototypeSeason(), run(points, 9));
      expect(impact.counted).toBe(false);
      expect(impact.replaced).toBeNull();
      expect(impact.delta).toBe(0);
      expect(impact.after.score).toBe(8_290);
    }
    expect(applyRun(prototypeSeason(), run(1_421, 9)).delta).toBe(1);
  });

  it('while fewer than 5 runs, every run counts and nothing is replaced', () => {
    const impact = applyRun([run(500, 1), run(300, 2)], run(100, 3));
    expect(impact).toMatchObject({ counted: true, replaced: null, toBeat: null, delta: 100 });
    expect(impact.after.score).toBe(900);
    expect(impact.placement).toEqual({ done: 3, of: 5, complete: false });
  });

  it('equal points: the earlier run keeps its place', () => {
    const five = [run(1_000, 5), run(1_000, 1), run(1_000, 4), run(1_000, 2), run(1_000, 3)];
    const late = run(1_000, 6);
    expect(bestRuns([late, ...five]).map((r) => r.id)).toEqual(
      [...five].sort((x, y) => Date.parse(x.finishedAt) - Date.parse(y.finishedAt)).map((r) => r.id),
    );
    expect(applyRun(five, late).counted).toBe(false);
  });

  it('empty season is 0 and nothing to beat', () => {
    expect(seasonScore([])).toBe(0);
    expect(scoreToBeat([])).toBeNull();
  });
});

describe('placement: the first 5 runs place you', () => {
  it.each([
    [0, { done: 0, of: 5, complete: false }],
    [3, { done: 3, of: 5, complete: false }],
    [4, { done: 4, of: 5, complete: false }],
    [5, { done: 5, of: 5, complete: true }],
    [12, { done: 5, of: 5, complete: true }],
  ])('%i finished runs -> %o', (n, expected) => {
    expect(placement(n)).toEqual(expected);
  });
  it('rejects negative counts', () => {
    expect(() => placement(-1)).toThrow(RangeError);
  });
});

describe('season tie-break value: average answer time of the counted runs', () => {
  it('weights by right answers and ignores runs with none', () => {
    const runs = [
      run(2_000, 1, { correct: 10, avgAnswerMs: 1_500 }),
      run(1_900, 2, { correct: 5, avgAnswerMs: 3_000 }),
      run(1_800, 3, { correct: 0, avgAnswerMs: null }),
      run(100, 4, { correct: 2, avgAnswerMs: 9_000 }),
      run(90, 5, { correct: 1, avgAnswerMs: 9_000 }),
      run(10, 6, { correct: 1, avgAnswerMs: 100 }), // not in the best 5
    ];
    // (1500 x 10 + 3000 x 5 + 9000 x 2 + 9000 x 1) / 18 = 57000 / 18 = 3166.67
    expect(seasonAvgAnswerMs(runs)).toBe(3_167);
    expect(seasonAvgAnswerMs([run(0, 1, { correct: 0, avgAnswerMs: null })])).toBeNull();
  });
});

describe('season calendar (8 weeks, back to back)', () => {
  const s1: Season = { id: 1, startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-11-26T00:00:00.000Z' };

  it('next season starts when the last one ends and lasts 56 days', () => {
    expect(nextSeasonWindow(s1)).toEqual({ id: 2, startsAt: '2026-11-26T00:00:00.000Z', endsAt: '2027-01-21T00:00:00.000Z' });
  });

  it('currentSeason covers [startsAt, endsAt)', () => {
    const s2 = nextSeasonWindow(s1);
    expect(currentSeason([s1, s2], new Date('2026-09-30T23:59:59Z'))).toBeNull();
    expect(currentSeason([s1, s2], new Date('2026-10-01T00:00:00Z'))?.id).toBe(1);
    expect(currentSeason([s1, s2], new Date('2026-11-26T00:00:00Z'))?.id).toBe(2);
    expect(currentSeason([], new Date())).toBeNull();
  });

  it('days left rounds up ("ends in 19 days") and stops at 0', () => {
    expect(daysLeft(s1, new Date('2026-11-07T10:00:00Z'))).toBe(19);
    expect(daysLeft(s1, new Date('2026-11-25T23:00:00Z'))).toBe(1);
    expect(daysLeft(s1, new Date('2026-12-01T00:00:00Z'))).toBe(0);
  });
});
