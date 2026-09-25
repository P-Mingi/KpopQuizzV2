// Small formatters for the v11 quiz page and results (prototype wording: "6 hours
// ago", "About 2 min", "251 perfect scores · fastest 0:17"). Pure.

import { RANKING_UNLOCK_VOTES } from '@/lib/constants';
import { scoreIsPerQuestion } from '@/lib/quiz/scoring';

import type { QuizType } from '@/lib/db/types';

const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;

/** "just now", "5 minutes ago", "6 hours ago", "2 days ago", "3 weeks ago", else "Mar 4, 2026". */
export function relativeTime(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${plural(m, 'minute')} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${plural(h, 'hour')} ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${plural(d, 'day')} ago`;
  if (d < 35) return `${plural(Math.floor(d / 7), 'week')} ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "About 2 min" from the real timer (timer_seconds x questions), 15 s a question without one. */
export function aboutMinutes(questionCount: number, timerOn: boolean, timerSeconds: number): string {
  const perQ = timerOn && timerSeconds > 0 ? timerSeconds : 15;
  return `About ${Math.max(1, Math.round((questionCount * perQ) / 60))} min`;
}

/** A text card's "average 64%": only past the ranking unlock and for per-question scores
 *  (the same C2 / C4 gates as the page intro), else null. */
export function cardAverage(q: { quiz_type: QuizType; play_count: number; total_score_sum: number; total_completions: number; question_count: number }): number | null {
  if (!scoreIsPerQuestion(q.quiz_type) || q.play_count < RANKING_UNLOCK_VOTES) return null;
  if (q.total_completions <= 0 || q.question_count <= 0) return null;
  return Math.round((q.total_score_sum / q.total_completions) / q.question_count * 100);
}

/** Verdict stamp from getResultLabel(): "올킬!" + "PERFECT" (the trailing "!" is dropped, 14.4). */
export function stampWords(label: { kr: string; en: string }): { kr: string; en: string } {
  return { kr: label.kr, en: label.en.replace(/!+$/, '') };
}
