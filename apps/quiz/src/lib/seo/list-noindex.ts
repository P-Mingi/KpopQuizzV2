// O1 audit 03 P1-5: the list pages that may leave the index (noindex,follow and out of the sitemap).
//
// The audit proposes six lists (the seventh, popular-this-week, is upgraded instead). The guard of section 3 forbids a noindex on a URL
// with clicks in the last 90 days or on the linked-URL guard list without the owner. The Performance export of 2026-11-09 (3 months)
// shows a click on /most-liked only, so the other five are decided and /most-liked waits for the owner. Page and sitemap read this one
// list, so they cannot disagree.

/** The six lists the audit proposes (section 1, "Verdict" of the lists row). */
export const LIST_NOINDEX_CANDIDATES = [
  '/trending',
  '/new',
  '/most-liked',
  '/quizzes/popular-today',
  '/quizzes/popular-this-month',
  '/kpop-quiz-2026',
] as const;

/**
 * Candidates with no click in 90 days in the Performance export of 2026-11-09 (the owner's "process the pages from the exports").
 * /most-liked has a click, so it stays indexed until the owner answers.
 */
export const LIST_NOINDEX_DECIDED: readonly (typeof LIST_NOINDEX_CANDIDATES)[number][] = [
  '/trending',
  '/new',
  '/quizzes/popular-today',
  '/quizzes/popular-this-month',
  '/kpop-quiz-2026',
];

export const isListNoindex = (path: string): boolean => (LIST_NOINDEX_DECIDED as readonly string[]).includes(path);

/** `robots` metadata for a list page: noindex,follow when decided, nothing (today's head) otherwise. */
export function listRobots(path: string): { robots: { index: false; follow: true } } | Record<string, never> {
  return isListNoindex(path) ? { robots: { index: false, follow: true } } : {};
}
