// O1 audit 03 P1-5: the list pages that may leave the index (noindex,follow and out of the sitemap).
//
// The audit proposes six lists (the seventh, popular-this-week, is upgraded instead). The decision is NOT made here:
// the guard of section 3 forbids a noindex on a URL with clicks in the last 90 days or on the linked-URL guard list
// without the owner, and those numbers come from the Search Console exports the owner has not made yet
// (scripts/seo-gsc-triage.mts reads them). So LIST_NOINDEX_DECIDED is EMPTY and every page and the sitemap stay as
// they are. The owner, after the triage, moves the paths its report marks NOINDEX-PROPOSE with owner_ok given from
// the candidates into LIST_NOINDEX_DECIDED, in one reviewed edit; the pages and the sitemap then follow together.

/** The six lists the audit proposes (section 1, "Verdict" of the lists row). */
export const LIST_NOINDEX_CANDIDATES = [
  '/trending',
  '/new',
  '/most-liked',
  '/quizzes/popular-today',
  '/quizzes/popular-this-month',
  '/kpop-quiz-2026',
] as const;

/** Candidates the owner approved after the triage. Empty until the exports exist. */
export const LIST_NOINDEX_DECIDED: readonly (typeof LIST_NOINDEX_CANDIDATES)[number][] = [];

export const isListNoindex = (path: string): boolean => (LIST_NOINDEX_DECIDED as readonly string[]).includes(path);

/** `robots` metadata for a list page: noindex,follow when decided, nothing (today's head) otherwise. */
export function listRobots(path: string): { robots: { index: false; follow: true } } | Record<string, never> {
  return isListNoindex(path) ? { robots: { index: false, follow: true } } : {};
}
