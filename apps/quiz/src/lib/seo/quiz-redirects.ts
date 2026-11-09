// O1 audit 03 P1-9 and P2-4 (rulebook 9.3, 9.4): where a quiz URL goes when the quiz is merged into another or removed.
//
//   QUIZ_MERGES  loser slug -> kept slug. One hop, 301 to the exact successor (next.config.ts redirects). Never to a generic page.
//   QUIZ_GONE    slugs removed with no successor. A real 410 (next.config.ts rewrite to /api/legacy/gone), not a 404.
//
// Both are EMPTY on purpose. The merge proposals come from the duplicates audit (docs/seo/strategy-2026-10-27: one pair, K01, the same
// ILLIT quiz uploaded twice) and the guard of audit 03 section 3 forbids touching a URL with clicks in 90 days, or on the linked-URL
// guard list, without the owner. The numbers come from the Search Console triage (scripts/seo-gsc-triage.mts). When the owner approves
// a merge, the row goes here AND the data change (unpublish the loser, enqueue both URLs to IndexNow) ships in the SQL file
// docs/pending-migrations/multisite/launch/L28-l1-quiz-merges.sql, so the redirect and the data move together. A page is gone from
// /q/ only after this table says so: today an unpublished or flagged quiz answers 404, because the public read cannot see a removed row.
//
// Pure data and pure functions (the next.config and the nightly crawl read them), unit tested in quiz-redirects.test.ts.

export const QUIZ_MERGES: Readonly<Record<string, string>> = {};

export const QUIZ_GONE: readonly string[] = [];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Problems in a pair of tables: a bad slug, a self merge, a chain, a target that is gone. Empty when the tables are sound. */
export function quizRedirectProblems(
  merges: Readonly<Record<string, string>> = QUIZ_MERGES,
  gone: readonly string[] = QUIZ_GONE,
): string[] {
  const problems: string[] = [];
  const goneSet = new Set(gone);
  for (const [from, to] of Object.entries(merges)) {
    if (!SLUG_RE.test(from) || !SLUG_RE.test(to)) problems.push(`${from} -> ${to}: not a quiz slug`);
    else if (from === to) problems.push(`${from}: merged into itself`);
    else if (to in merges) problems.push(`${from} -> ${to}: ${to} is itself merged (a chain; point at the final quiz)`);
    else if (goneSet.has(to)) problems.push(`${from} -> ${to}: the target is gone`);
    if (goneSet.has(from)) problems.push(`${from}: both merged and gone`);
  }
  for (const slug of gone) if (!SLUG_RE.test(slug)) problems.push(`${slug}: not a quiz slug`);
  return problems;
}

/** The next.config redirects of the merges: a permanent redirect (308, treated as 301 by search engines) to the kept quiz. */
export function quizMergeRedirects(merges: Readonly<Record<string, string>> = QUIZ_MERGES): Array<{ source: string; destination: string; permanent: true }> {
  return Object.entries(merges).map(([from, to]) => ({ source: `/q/${from}`, destination: `/q/${to}`, permanent: true as const }));
}

/** The next.config rewrites of the removed quizzes: the 410 handler answers in place of the page. */
export function quizGoneRewrites(gone: readonly string[] = QUIZ_GONE): Array<{ source: string; destination: string }> {
  return gone.map((slug) => ({ source: `/q/${slug}`, destination: '/api/legacy/gone' }));
}
