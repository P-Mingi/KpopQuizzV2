import { describe, expect, it } from 'vitest';

import { comboLabel, comboTenths, maxRunPoints, scoreRound, scoreRun, speedBonus } from './scoring';

import type { RoundOutcome } from './scoring';

describe('speedBonus: 100 under 2 s, then round(100 x (10 - t) / 8), 0 at 10 s', () => {
  it.each([
    [0, 100],
    [1_999, 100],
    [2_000, 100],
    [2_001, 100], // 99.9875
    [2_040, 100], // 99.5 rounds half up
    [2_041, 99], // 99.4875
    [3_000, 88], // 87.5
    [4_000, 75],
    [5_000, 63], // 62.5
    [6_000, 50],
    [7_000, 38], // 37.5
    [8_000, 25],
    [9_000, 13], // 12.5
    [9_960, 1], // 0.5
    [9_961, 0],
    [9_999, 0],
    [10_000, 0],
    [12_000, 0],
  ])('t = %i ms -> %i', (ms, bonus) => {
    expect(speedBonus(ms)).toBe(bonus);
  });

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])('rejects %s', (ms) => {
    expect(() => speedBonus(ms)).toThrow(RangeError);
  });
});

describe('comboTenths: x1.0, +0.1 per right answer in a row, cap x2.0', () => {
  it.each([
    [1, 10],
    [2, 11],
    [5, 14],
    [10, 19],
    [11, 20],
    [12, 20],
    [50, 20],
  ])('streak %i -> %i tenths', (streak, tenths) => {
    expect(comboTenths(streak)).toBe(tenths);
  });

  it('rejects a streak below 1', () => {
    expect(() => comboTenths(0)).toThrow(RangeError);
    expect(() => comboTenths(1.5)).toThrow(RangeError);
  });

  it('labels', () => {
    expect(comboLabel(10)).toBe('x1.0');
    expect(comboLabel(13)).toBe('x1.3');
    expect(comboLabel(20)).toBe('x2.0');
  });
});

describe('scoreRound: right = (100 + speed) x combo, wrong / timeout = 0 and resets', () => {
  const right = (ms: number): RoundOutcome => ({ kind: 'right', ms });
  // [outcome, streak before, points, streak after]
  const cases: Array<[string, RoundOutcome, number, number, number]> = [
    ['fast, first', right(1_000), 0, 200, 1],
    ['fast, x1.1', right(1_000), 1, 220, 2],
    ['1.999 s, x1.2', right(1_999), 2, 240, 3],
    ['2.000 s, x1.3', right(2_000), 3, 260, 4],
    ['3 s, x1.0', right(3_000), 0, 188, 1],
    ['3 s, x1.1 (206.8)', right(3_000), 1, 207, 2],
    ['5 s, x1.0', right(5_000), 0, 163, 1],
    ['5 s, x1.4 (228.2)', right(5_000), 4, 228, 5],
    ['5 s, x1.5 (244.5 half up)', right(5_000), 5, 245, 6],
    ['6 s, 10th in a row x1.9', right(6_000), 9, 285, 10],
    ['6 s, 11th in a row x2.0', right(6_000), 10, 300, 11],
    ['6 s, capped x2.0', right(6_000), 30, 300, 31],
    ['9.96 s, bonus 1', right(9_960), 0, 101, 1],
    ['9.961 s, bonus 0', right(9_961), 0, 100, 1],
    ['9.999 s, x1.5', right(9_999), 5, 150, 6],
    ['7 s, x1.2 (165.6)', right(7_000), 2, 166, 3],
    ['9 s, x1.7 (192.1)', right(9_000), 7, 192, 8],
    ['4 s, x1.3 (227.5 half up)', right(4_000), 3, 228, 4],
    ['2.041 s, bonus 99', right(2_041), 0, 199, 1],
    ['2.040 s, bonus 100, x1.1', right(2_040), 1, 220, 2],
    ['8 s, x1.0', right(8_000), 0, 125, 1],
    ['wrong resets', { kind: 'wrong', ms: 1_000 }, 5, 0, 0],
    ['slow wrong', { kind: 'wrong', ms: 9_999 }, 0, 0, 0],
    ['timeout resets', { kind: 'timeout' }, 3, 0, 0],
    ['unanswered (quit)', { kind: 'unanswered' }, 0, 0, 0],
  ];

  it('has at least 20 table cases', () => {
    expect(cases.length).toBeGreaterThanOrEqual(20);
  });

  it.each(cases)('%s', (_label, outcome, streakBefore, points, streakAfter) => {
    const r = scoreRound(outcome, streakBefore);
    expect(r.points).toBe(points);
    expect(r.streak).toBe(streakAfter);
    if (outcome.kind !== 'right') {
      expect(r.comboTenths).toBe(0);
      expect(r.speedBonus).toBe(0);
    }
  });
});

describe('scoreRun', () => {
  const R = (ms = 1_000): RoundOutcome => ({ kind: 'right', ms });
  const W: RoundOutcome = { kind: 'wrong', ms: 3_000 };
  const T: RoundOutcome = { kind: 'timeout' };

  it('a perfect fast 10-song run is 2,900', () => {
    const run = scoreRun(Array.from({ length: 10 }, () => R()));
    expect(run.points).toBe(2_900);
    expect(run.correct).toBe(10);
    expect(run.bestCombo).toBe(10);
    expect(run.avgAnswerMs).toBe(1_000);
    expect(maxRunPoints()).toBe(2_900);
  });

  it('all wrong is 0 with no average', () => {
    const run = scoreRun(Array.from({ length: 10 }, () => W));
    expect(run).toMatchObject({ points: 0, correct: 0, bestCombo: 0, avgAnswerMs: null });
  });

  it('a miss resets the combo', () => {
    const run = scoreRun([R(), R(), R(), W, R(), R(), R(), R(), R(), R()]);
    // 200 + 220 + 240 + 0 + (200 + 220 + 240 + 260 + 280 + 300)
    expect(run.points).toBe(2_160);
    expect(run.bestCombo).toBe(6);
    expect(run.rounds.map((r) => r.comboTenths)).toEqual([10, 11, 12, 0, 10, 11, 12, 13, 14, 15]);
  });

  it('a timeout resets the combo too', () => {
    expect(scoreRun([R(), T, R()], 3).points).toBe(400);
  });

  it('a quit run keeps the answered songs and scores the rest 0', () => {
    const run = scoreRun([R(1_000), R(3_000), W, R(5_000)]);
    // 200 + (188 x 1.1 = 206.8 -> 207) + 0 + 163
    expect(run.points).toBe(570);
    expect(run.correct).toBe(3);
    expect(run.rounds).toHaveLength(10);
    expect(run.rounds.slice(4).every((r) => r.kind === 'unanswered' && r.points === 0)).toBe(true);
    expect(run.avgAnswerMs).toBe(3_000);
  });

  it('the cap holds on a longer run (x2.0 from the 11th right answer)', () => {
    expect(scoreRun(Array.from({ length: 12 }, () => R()), 12).points).toBe(2_900 + 400 + 400);
  });

  it('refuses more outcomes than rounds', () => {
    expect(() => scoreRun([R(), R()], 1)).toThrow(RangeError);
  });
});
