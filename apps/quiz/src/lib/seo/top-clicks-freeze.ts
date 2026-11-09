// Audit 04 section 2.4 (owner validated): the pages with the most clicks keep the head they have on main (title, meta
// description, Open Graph and Twitter title and description) until the owner lifts them.
// Source: Search Console export of 2026-11-09, Web, 3 months; audit 04 section 2.4; the owner lifts a page by deleting its line.
// The lifting is one line at a time: delete a line, the page gets the audit 04 head at once. No click count belongs in this file.
// Wired in: group hubs (group-quiz-page.tsx), /quizzes, /blindtest and /q/ pages (quiz-title-overrides.ts) through frozen-heads.ts.
// The pages that no audit 04 template changes (/, the articles, the trivia pages) are listed too, so the list is the whole top 20.

export const TOP_CLICKS_FROZEN: readonly string[] = [
  '/', // 1
  '/illit-quiz', // 2
  '/cortis-quiz', // 3
  '/blindtest', // 4
  '/seventeen-quiz', // 5
  '/stray-kids-quiz', // 6
  '/articles/guess-the-kpop-idol-guide', // 7
  '/bts-quiz', // 8
  '/q/babymonster-quiz', // 9
  '/cortis-trivia', // 10
  '/babymonster-quiz', // 11
  '/aespa-quiz', // 12
  '/newjeans-quiz', // 13
  '/q/illit-quiz', // 14
  '/quizzes', // 15
  '/ateez-quiz', // 16
  '/twice-quiz', // 17
  '/ive-quiz', // 18
  '/enhypen-quiz', // 19
  '/q/cortis-quiz', // 20
];

/** True when the path (no query, no trailing slash except "/") is on the list above. */
export function isTopClicksFrozen(path: string): boolean {
  return TOP_CLICKS_FROZEN.includes(path);
}
