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

// ---------------------------------------------------------------------------
// V12 score normalization (SYSTEM.md section 2). Always on, no flag.
//
// `plays.score` and `quizzes.total_score_sum` hold POINTS. A guess-from-clues
// question is worth up to 3 points (fewer clues used = more points), every
// other type 1 point, the same rule as `quiz-player.tsx` and the play API
// `max_score`. Dividing points by the question count gave 189% averages and
// "18/6" labels. Every average and every score label goes through these
// helpers, so the rule lives in one place. Stored rows are never rewritten.
// The SQL twin is the view `quiz_score_stats`
// (docs/pending-migrations/v12-g1-quiz-score-stats.sql): keep both in step.
// ---------------------------------------------------------------------------

/** Quiz type as it arrives from a row: unknown or missing counts as 1 point per question. */
type QuizTypeLike = QuizType | string | null | undefined;

const finite = (n: unknown): number => (typeof n === 'number' && Number.isFinite(n) ? n : 0);

/** Most points one question can give: guess_from_clues 3, every other type 1. */
export function maxPointsPerQuestion(quizType: QuizTypeLike): number {
  return quizType === 'guess_from_clues' ? 3 : 1;
}

/** Most points a whole run can give. 0 when the question count is missing or not positive. */
export function maxScore(quizType: QuizTypeLike, questionCount: number | null | undefined): number {
  const n = Math.floor(finite(questionCount));
  return n > 0 ? n * maxPointsPerQuestion(quizType) : 0;
}

export interface AvgScoreInput {
  total_score_sum: number | null | undefined;
  total_completions: number | null | undefined;
  question_count: number | null | undefined;
  quiz_type?: QuizTypeLike;
}

/**
 * Average score of a quiz as a percentage of its maximum, 0..100, or null when
 * there is nothing to average (no completion, no question). Rounded to a whole
 * number unless `precise` (sorting wants the fraction). Never above 100 and
 * never below 0, whatever the stored sum says.
 */
export function avgScorePct(q: AvgScoreInput, precise = false): number | null {
  const completions = finite(q.total_completions);
  const max = maxScore(q.quiz_type, q.question_count);
  if (completions <= 0 || max <= 0) return null;
  const pct = Math.min(100, Math.max(0, (finite(q.total_score_sum) / completions / max) * 100));
  return precise ? pct : Math.round(pct);
}

/** One run as a percentage of its maximum, 0..100 (whole number), or null without questions. */
export function runScorePct(score: number | null | undefined, questionCount: number | null | undefined, quizType: QuizTypeLike): number | null {
  const max = maxScore(quizType, questionCount);
  if (max <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (finite(score) / max) * 100)));
}

/** "18/18" style label: points over the maximum of the run, never "18/6". */
export function runScoreLabel(score: number | null | undefined, questionCount: number | null | undefined, quizType: QuizTypeLike): string {
  const max = maxScore(quizType, questionCount);
  const s = Math.max(0, Math.floor(finite(score)));
  return `${max > 0 ? Math.min(s, max) : s}/${max}`;
}
