// Audit 01 P1-7: the catalog fallback takes 8 to 10 questions and prefers a general quiz (group_id null).
import { describe, expect, it } from 'vitest';

import { pickCatalogQotd } from './quiz-bank-scheduling';

import type { CatalogQuiz } from './quiz-bank-scheduling';

const q = (id: string, o: Partial<CatalogQuiz>): CatalogQuiz => ({
  id, group_id: null, play_count: 100, like_count: 50, total_completions: 80, total_score_sum: 400, question_count: 10, created_at: '2026-10-01T00:00:00Z', ...o,
});

describe('pickCatalogQotd (audit 01 P1-7)', () => {
  it('takes a quiz of 8 to 10 questions over a longer-liked one of 5', () => {
    const pick = pickCatalogQotd([q('five', { question_count: 5, like_count: 100 }), q('ten', { question_count: 10, like_count: 10 })], [], '2026-12-30');
    expect(pick?.id).toBe('ten');
  });
  it('prefers a general quiz (group_id null) to a single-group one', () => {
    const pick = pickCatalogQotd([q('solo', { group_id: 7, like_count: 100 }), q('general', { group_id: null, like_count: 10 })], [], '2026-12-30');
    expect(pick?.id).toBe('general');
  });
  it('still picks a single-group or a short quiz when nothing better exists', () => {
    expect(pickCatalogQotd([q('solo', { group_id: 7, question_count: 6 })], [], '2026-12-30')?.id).toBe('solo');
  });
});
