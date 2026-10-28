import { describe, expect, it } from 'vitest';

import { NEW_CAP, NEW_MIN, newWeekCut } from './new-week';

const NOW = Date.parse('2026-10-28T12:00:00Z');
const day = 86_400_000;
const quizzes = (ages: number[]): Array<{ id: number; created_at: string }> => ages.map((a, i) => ({ id: i, created_at: new Date(NOW - a * day).toISOString() }));

describe('newWeekCut: the quizzes /new renders on the server', () => {
  it('every quiz of the last 7 days', () => {
    const list = quizzes([...Array.from({ length: 29 }, (_, i) => i * 0.2), 8, 9, 10]);
    expect(newWeekCut(list, NOW)).toHaveLength(29);
  });

  it('a quiz of day 6.9 is in, day 7.1 is not', () => {
    const list = quizzes([...Array.from({ length: 11 }, () => 1), 6.9, 7.1]);
    expect(newWeekCut(list, NOW).map((q) => q.id)).toEqual([...Array.from({ length: 12 }, (_, i) => i)]);
  });

  it('at least the 10 newest in a quiet week, at most 120 in a busy one', () => {
    expect(newWeekCut(quizzes([1, 2, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]), NOW)).toHaveLength(NEW_MIN);
    expect(newWeekCut(quizzes(Array.from({ length: 150 }, () => 0.5)), NOW)).toHaveLength(NEW_CAP);
  });
});
