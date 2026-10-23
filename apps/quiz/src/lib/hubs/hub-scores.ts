// SEO Mission 2 (owner, 2026-10-14; rulebook section 4): the measured difficulty of a group's
// quizzes and how fans score on them, from the quiz rows the hub already reads
// (getHubQuizzes: published quizzes of the group, every row, past the 1000-row cap).
//
// The documented query, so every number on the page can be reproduced:
//   attempts of a quiz   quizzes.total_completions (one per finished run, record_play)
//   average of a quiz    total_score_sum / (total_completions x max score), 0 to 100, the
//                        site's one rule (lib/quiz/scoring.ts avgScorePct: a guess-from-clues
//                        question is worth 3 points, every other type 1)
//   pooled average       SUM(points) / SUM(attempts x max score) over the group's published
//                        quizzes, the definition of the K-pop Knowledge Report 2026 (pooled,
//                        so a 20-question run counts more than a 5-question run)
// Floors (rulebook 4.3): a quiz is ranked by difficulty only from 50 attempts; the group
// figure needs 100 attempts (the Knowledge Report's per-group floor). Below a floor the page
// says "Not enough data yet" and shows no number. Never the creator's difficulty label.
// Pure and unit tested (hub-scores.test.ts).

import { avgScorePct, maxScore } from '@/lib/quiz/scoring';

/** Rulebook 4.3: 50 attempts to rank a quiz by difficulty. */
export const LEVEL_MIN_ATTEMPTS = 50;
/** The group figure needs 100 attempts (Knowledge Report 2026, section 0). */
export const GROUP_MIN_ATTEMPTS = 100;

export type MeasuredLevel = 'easy' | 'medium' | 'hard';

/** The bands, on the rounded average the page prints: easy 70% and up, medium 60 to 69%, hard under 60%. */
export const LEVEL_BANDS = { easyFrom: 70, mediumFrom: 60 } as const;

export const LEVEL_LABEL: Record<MeasuredLevel, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

export interface ScoredQuizRow {
  slug: string;
  title: string;
  quiz_type: string;
  total_score_sum: number;
  total_completions: number;
  question_count: number;
  created_at: string;
}

export interface RankedQuiz<T extends ScoredQuizRow = ScoredQuizRow> {
  quiz: T;
  /** Rounded average in percent (what the page prints). */
  avg: number;
  attempts: number;
  level: MeasuredLevel;
}

export function measuredLevel(avgRounded: number): MeasuredLevel {
  if (avgRounded >= LEVEL_BANDS.easyFrom) return 'easy';
  if (avgRounded >= LEVEL_BANDS.mediumFrom) return 'medium';
  return 'hard';
}

const attemptsOf = (q: ScoredQuizRow): number => (Number.isFinite(q.total_completions) && q.total_completions > 0 ? Math.floor(q.total_completions) : 0);

/**
 * The quizzes with 50 attempts or more, easiest first (highest measured average), each with
 * its level; ties go to the quiz with more attempts, then the slug. `belowFloor` counts the
 * published quizzes that are not ranked yet.
 */
export function rankByMeasuredScore<T extends ScoredQuizRow>(quizzes: readonly T[]): { ranked: RankedQuiz<T>[]; belowFloor: number } {
  const ranked: Array<RankedQuiz<T> & { precise: number }> = [];
  let belowFloor = 0;
  for (const q of quizzes) {
    const attempts = attemptsOf(q);
    const precise = attempts >= LEVEL_MIN_ATTEMPTS
      ? avgScorePct({ total_score_sum: q.total_score_sum, total_completions: attempts, question_count: q.question_count, quiz_type: q.quiz_type }, true)
      : null;
    if (precise === null) { belowFloor += 1; continue; }
    const avg = Math.round(precise);
    ranked.push({ quiz: q, avg, attempts, level: measuredLevel(avg), precise });
  }
  ranked.sort((a, b) => b.precise - a.precise || b.attempts - a.attempts || a.quiz.slug.localeCompare(b.quiz.slug));
  return { ranked: ranked.map(({ precise: _p, ...r }) => r), belowFloor };
}

export interface PooledScore {
  /** Rounded pooled average in percent, or null under GROUP_MIN_ATTEMPTS. */
  avg: number | null;
  /** Finished runs counted (the denominator). */
  attempts: number;
  /** Quizzes with at least one finished run. */
  quizzes: number;
  /** created_at of the oldest of those quizzes (the start of the window), or null. */
  since: string | null;
}

/** How fans score on the group's quizzes, pooled (see the header). */
export function pooledScore(quizzes: readonly ScoredQuizRow[]): PooledScore {
  let points = 0;
  let possible = 0;
  let attempts = 0;
  let counted = 0;
  let since: string | null = null;
  for (const q of quizzes) {
    const n = attemptsOf(q);
    const max = maxScore(q.quiz_type, q.question_count);
    if (n <= 0 || max <= 0) continue;
    // A stored sum above the maximum (a few legacy rows) is capped, like avgScorePct.
    points += Math.min(Math.max(0, q.total_score_sum || 0), n * max);
    possible += n * max;
    attempts += n;
    counted += 1;
    if (!since || q.created_at < since) since = q.created_at;
  }
  const avg = attempts >= GROUP_MIN_ATTEMPTS && possible > 0 ? Math.round((points / possible) * 100) : null;
  return { avg, attempts, quizzes: counted, since };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "October 2026" from an ISO date-time (UTC), or null. */
export function monthYear(iso: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? '');
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${month} ${m[1]}` : null;
}
