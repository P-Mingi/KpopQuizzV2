// Audit 04 P1-2 and P1-5 (owner 2026-11-09): which <title> a quiz page gets.
//   1. QUIZ_TITLE_OVERRIDES: a hand-written or batch-written page part (scripts/seo-ctr-batch.mts, position 4 to 10 pages), by slug.
//   2. QUIZ_TITLE_FROZEN: the top 20 pages by clicks keep today's wording (quizTitle) until the owner says otherwise.
//   3. everything else: quizSeoTitle (the group and "quiz" added when the creator's title lacks them).
// The overrides list is empty until the owner's Search Console exports exist; the lint in quiz-title-overrides.test.ts holds every entry
// to the title rules (49 characters, no dash, no typed number, no unreviewed year).

import { quizSeoTitle, quizTitle } from './quiz-meta';
import { isTopClicksFrozen, TOP_CLICKS_FROZEN } from './top-clicks-freeze';

/** slug -> the page part of the title (the layout adds " | KpopQuiz"). */
export const QUIZ_TITLE_OVERRIDES: Readonly<Record<string, string>> = {};

/** Slugs of the /q/ pages among the top-clicks pages (lib/seo/top-clicks-freeze.ts): their title wording stays as it is. */
export const QUIZ_TITLE_FROZEN: readonly string[] = TOP_CLICKS_FROZEN.filter((p) => p.startsWith('/q/')).map((p) => p.slice(3));

export function quizPageTitle(slug: string, title: string, questionCount: number, group: { name: string; slug?: string | null }): string {
  const override = QUIZ_TITLE_OVERRIDES[slug];
  if (override) return override;
  if (isTopClicksFrozen(`/q/${slug}`)) return quizTitle(title, questionCount);
  return quizSeoTitle(title, questionCount, group);
}
