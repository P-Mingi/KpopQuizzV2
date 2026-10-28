import { RANKING_UNLOCK_VOTES } from '@/lib/constants';
import { avgScorePct, scoreIsPerQuestion } from '@/lib/quiz/scoring';

import type { QuizType } from '@/lib/db/types';

// One average for the quiz page (SEO strategy of 2026-10-27, phase 1; owner, 2026-10-28): the meta
// description, the meta row and the About text read it, shown only from 30 completed plays and always
// with its denominator ("average of N completed plays"). Rulebook 4.3 owner exception: 30 completed
// plays instead of 100. Only for quiz types scored one point per question (scoreIsPerQuestion).
export const AVERAGE_MIN_COMPLETIONS = RANKING_UNLOCK_VOTES;

export interface QuizAverage {
  pct: number;
  completions: number;
}

export function quizAverage(q: {
  quiz_type: QuizType;
  total_score_sum: number | null | undefined;
  total_completions: number | null | undefined;
  question_count: number;
}): QuizAverage | null {
  const completions = Number.isFinite(q.total_completions) ? Number(q.total_completions) : 0;
  if (!scoreIsPerQuestion(q.quiz_type) || completions < AVERAGE_MIN_COMPLETIONS) return null;
  const pct = avgScorePct(q);
  return pct === null ? null : { pct, completions };
}

/** "61% average of 1,180 completed plays" */
export function averageText(a: QuizAverage): string {
  return `${a.pct}% average of ${a.completions.toLocaleString('en-US')} completed ${a.completions === 1 ? 'play' : 'plays'}`;
}
