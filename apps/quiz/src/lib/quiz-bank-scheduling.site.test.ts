// Run O1, lot (e) part 1 (K1): the weekly limit of one group in the quiz bank schedule is per site (kpop 3, anime 2).
import { describe, expect, it } from 'vitest';

import { validateSchedule } from './quiz-bank-scheduling';
import { siteConfig } from './site/registry';

import type { QuizBankEntry } from './quiz-bank-scheduling';

function entry(id: string, date: string, group: number | null, category = 'knowledge'): QuizBankEntry {
  return {
    id, title: `Quiz ${id}`, description: null, group_id: group, quiz_type: 'multiple_choice', difficulty: 'medium', category,
    questions: [], scheduled_date: date, status: 'scheduled', verified_at: null, verification_notes: null, published_quiz_id: null,
    created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
  };
}

// Monday 2026-10-19 to Sunday 2026-10-25: one group on four days of the same week (other groups between are not needed:
// only the weekly rule is read).
const SAME_WEEK = [
  entry('a', '2026-10-19', 7, 'c1'), entry('b', '2026-10-20', 7, 'c2'), entry('c', '2026-10-21', 7, 'c3'), entry('d', '2026-10-22', 7, 'c4'),
];
const weekly = (v: ReturnType<typeof validateSchedule>) => v.filter((x) => x.rule === 'group_weekly_limit');

describe('validateSchedule weekly limit', () => {
  it('the registry carries 3 for kpop and 2 for anime', () => {
    expect(siteConfig('kpop').editorial.weeklyGroupLimit).toBe(3);
    expect(siteConfig('anime').editorial.weeklyGroupLimit).toBe(2);
  });

  it('default (kpop build): the fourth quiz of a group in a week is flagged, the third is not, with today\'s message', () => {
    const v = weekly(validateSchedule(SAME_WEEK));
    expect(v.map((x) => x.quiz_id)).toEqual(['d']);
    expect(v[0]!.message).toBe('More than 3 quizzes for this group in the same week');
  });

  it('kpop limit given explicitly = the default', () => {
    expect(weekly(validateSchedule(SAME_WEEK, 3))).toEqual(weekly(validateSchedule(SAME_WEEK)));
  });

  it('anime limit 2: the third and fourth quizzes of a group in a week are flagged', () => {
    const v = weekly(validateSchedule(SAME_WEEK, siteConfig('anime').editorial.weeklyGroupLimit));
    expect(v.map((x) => x.quiz_id)).toEqual(['c', 'd']);
    expect(v[0]!.message).toBe('More than 2 quizzes for this group in the same week');
  });

  it('two quizzes of a group in two different weeks are never flagged', () => {
    const spread = [entry('a', '2026-10-19', 7, 'c1'), entry('b', '2026-10-20', 7, 'c2'), entry('c', '2026-10-26', 7, 'c3'), entry('d', '2026-10-27', 7, 'c4')];
    expect(weekly(validateSchedule(spread, 2))).toEqual([]);
  });

  it('the other rules do not depend on the limit', () => {
    const rules = (v: ReturnType<typeof validateSchedule>) => v.filter((x) => x.rule !== 'group_weekly_limit').map((x) => `${x.rule}:${x.quiz_id}`);
    expect(rules(validateSchedule(SAME_WEEK, 2))).toEqual(rules(validateSchedule(SAME_WEEK, 3)));
  });
});
