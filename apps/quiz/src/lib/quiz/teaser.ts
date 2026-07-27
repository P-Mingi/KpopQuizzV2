import type { QuizCardData, Difficulty } from '@/lib/db/types';

// M1.14 desktop hover preview. Client-safe (imports only types) so the card
// islands can use it without pulling the server supabase client into the
// browser bundle.

// Min completions before an average score is honest enough to show. Mirrors
// MIN_COMPLETIONS in lib/db/queries/stats.ts (the /stats ranking gate); the
// value is duplicated here on purpose because stats.ts imports the server-only
// supabase client and cannot be imported into a client component.
export const MIN_COMPLETIONS_FOR_AVG = 30;

export interface QuizTeaser {
  firstQuestion: string;
  difficulty: Difficulty;
  playCount: number;
  /** Gated: null unless total_completions >= MIN_COMPLETIONS_FOR_AVG. */
  avgPct: number | null;
  href: string;
}

/** Build the hover teaser for a card, or null when there is no first-question
 *  text (data absent -> the surface renders the bare card, HTML unchanged). */
export function buildTeaser(q: QuizCardData): QuizTeaser | null {
  if (!q.first_question) return null;
  const avgPct =
    q.total_completions >= MIN_COMPLETIONS_FOR_AVG && q.question_count > 0
      ? Math.round((q.total_score_sum / q.total_completions / q.question_count) * 100)
      : null;
  return {
    firstQuestion: q.first_question,
    difficulty: q.difficulty,
    playCount: q.play_count,
    avgPct,
    href: `/q/${q.slug}`,
  };
}
