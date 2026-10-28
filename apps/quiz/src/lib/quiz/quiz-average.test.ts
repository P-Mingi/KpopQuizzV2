import { describe, expect, it } from 'vitest';

import { averageText, quizAverage } from './quiz-average';

const q = (over: Partial<Parameters<typeof quizAverage>[0]> = {}): Parameters<typeof quizAverage>[0] => ({
  quiz_type: 'multiple_choice', total_score_sum: 1830, total_completions: 300, question_count: 10, ...over,
});

describe('quizAverage: shown from 30 completed plays, per-question scoring only', () => {
  it('29 completions: no average; 30: the average', () => {
    expect(quizAverage(q({ total_completions: 29, total_score_sum: 180 }))).toBeNull();
    expect(quizAverage(q({ total_completions: 30, total_score_sum: 183 }))).toEqual({ pct: 61, completions: 30 });
  });

  it('a quiz scored by speed (guess from clues) never shows one', () => {
    expect(quizAverage(q({ quiz_type: 'guess_from_clues' }))).toBeNull();
  });

  it('missing counters mean no average', () => {
    expect(quizAverage(q({ total_completions: null }))).toBeNull();
    expect(quizAverage(q({ question_count: 0 }))).toBeNull();
  });
});

describe('averageText: always with its denominator', () => {
  it('reads "average of N completed plays"', () => {
    expect(averageText({ pct: 61, completions: 1180 })).toBe('61% average of 1,180 completed plays');
    expect(averageText({ pct: 50, completions: 1 })).toBe('50% average of 1 completed play');
  });
});
