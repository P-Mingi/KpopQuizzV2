import { describe, expect, it } from 'vitest';

import { GROUP_MIN_ATTEMPTS, LEVEL_MIN_ATTEMPTS, measuredLevel, monthYear, pooledScore, rankByMeasuredScore } from './hub-scores';

import type { ScoredQuizRow } from './hub-scores';

// SEO Mission 2 part B: "Pick a quiz by level" ranks by the measured average (50 attempts),
// never by the creator's label; the group figure is pooled and needs 100 attempts.

const row = (slug: string, completions: number, sum: number, questions: number, quiz_type = 'multiple_choice', created_at = '2026-04-01T00:00:00Z'): ScoredQuizRow =>
  ({ slug, title: slug, quiz_type, total_completions: completions, total_score_sum: sum, question_count: questions, created_at });

describe('rankByMeasuredScore', () => {
  it('ranks easiest first by the measured average and ignores the creator label', () => {
    // Labelled "easy" by its creator but scored 61%: it ranks as medium, below a 75% quiz.
    const labelledEasy = { ...row('labelled-easy', 100, 61 * 10, 10), difficulty: 'easy' };
    const { ranked } = rankByMeasuredScore([labelledEasy, row('solid', 80, 0.75 * 80 * 8, 8), row('hard-one', 60, 0.4 * 60 * 5, 5)]);
    expect(ranked.map((r) => r.quiz.slug)).toEqual(['solid', 'labelled-easy', 'hard-one']);
    expect(ranked.map((r) => r.level)).toEqual(['easy', 'medium', 'hard']);
    expect(ranked.map((r) => r.avg)).toEqual([75, 61, 40]);
  });

  it('a quiz under 50 attempts is not ranked, only counted', () => {
    const { ranked, belowFloor } = rankByMeasuredScore([row('a', LEVEL_MIN_ATTEMPTS - 1, 100, 5), row('b', LEVEL_MIN_ATTEMPTS, 200, 5), row('c', 0, 0, 5)]);
    expect(ranked.map((r) => r.quiz.slug)).toEqual(['b']);
    expect(belowFloor).toBe(2);
  });

  it('a guess-from-clues quiz is scored on 3 points a question', () => {
    // 698 runs of 7 questions, 32.7% of 3 points each (the real "Guess the BTS member from clues").
    const sum = Math.round(0.327 * 698 * 7 * 3);
    const { ranked } = rankByMeasuredScore([row('clues', 698, sum, 7, 'guess_from_clues')]);
    expect(ranked[0]!.avg).toBe(33);
    expect(ranked[0]!.level).toBe('hard');
  });

  it('ties go to more attempts, then the slug', () => {
    const { ranked } = rankByMeasuredScore([row('b', 50, 250, 10), row('a', 50, 250, 10), row('c', 100, 500, 10)]);
    expect(ranked.map((r) => r.quiz.slug)).toEqual(['c', 'a', 'b']);
  });
});

describe('measuredLevel', () => {
  it('bands on the rounded average the page prints', () => {
    expect(measuredLevel(70)).toBe('easy');
    expect(measuredLevel(69)).toBe('medium');
    expect(measuredLevel(60)).toBe('medium');
    expect(measuredLevel(59)).toBe('hard');
  });
});

describe('pooledScore', () => {
  it('pools points over possible points, so long quizzes weigh more', () => {
    const p = pooledScore([row('long', 100, 0.5 * 100 * 20, 20, 'multiple_choice', '2026-03-10T00:00:00Z'), row('short', 100, 1.0 * 100 * 5, 5, 'multiple_choice', '2026-05-01T00:00:00Z')]);
    // (1000 + 500) / (2000 + 500) = 60%, not the 75% a mean of the two averages would give.
    expect(p.avg).toBe(60);
    expect(p.attempts).toBe(200);
    expect(p.quizzes).toBe(2);
    expect(p.since).toBe('2026-03-10T00:00:00Z');
  });

  it('no number under 100 attempts', () => {
    const p = pooledScore([row('a', GROUP_MIN_ATTEMPTS - 1, 300, 5)]);
    expect(p.avg).toBeNull();
    expect(p.attempts).toBe(GROUP_MIN_ATTEMPTS - 1);
  });

  it('caps a stored sum above the maximum and skips quizzes with no run', () => {
    const p = pooledScore([row('over', 100, 99999, 5), row('none', 0, 0, 5)]);
    expect(p.avg).toBe(100);
    expect(p.quizzes).toBe(1);
  });
});

describe('monthYear', () => {
  it('reads the UTC month of an ISO date', () => {
    expect(monthYear('2026-10-15T23:59:00Z')).toBe('October 2026');
    expect(monthYear(null)).toBeNull();
    expect(monthYear('nope')).toBeNull();
  });
});
