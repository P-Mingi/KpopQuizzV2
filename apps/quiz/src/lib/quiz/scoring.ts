import type { QuizType } from '@/lib/db/types';

/**
 * SEO-3c C4: allowlist of quiz types where a raw `score` value is 1 point
 * per question - so a perfect run equals `qcount`, an average expressed as
 * `score / (completions * qcount)` is bounded by 100%, and the pass-rate
 * threshold `score >= 0.7 * qcount` is meaningful.
 *
 * Types NOT on this list (today: `guess_from_clues`, which awards multiple
 * points per question by speed) can produce raw scores above `qcount`, so:
 *   - "average %" would exceed 100% (Cowork saw ~136% in prod)
 *   - "pass rate" thresholded at 0.7*qcount is a meaningless bar
 *   - "perfect scores" counted as `score === qcount` counts the wrong rows
 *
 * Deny-by-default: adding a new quiz type must OPT IN here explicitly. That
 * is intentional - a silent inclusion would put the block right back where
 * SEO-3c found it. The predicate is used by both the intro sentence in
 * `/q/[slug]/page.tsx` and by `<QuizStatsBlock>`, single source of truth.
 *
 * When a per-type max-score becomes available (e.g. a `max_possible_score`
 * column, or a per-type scoring function), the metrics can be reworked to
 * use it and this allowlist becomes redundant. Until then, suppression is
 * the honest call.
 */
const PER_QUESTION_SCORE_TYPES: ReadonlySet<QuizType> = new Set([
  'multiple_choice',
  'true_false',
  'image',
  'intruder',
]);

export function scoreIsPerQuestion(quizType: QuizType): boolean {
  return PER_QUESTION_SCORE_TYPES.has(quizType);
}
