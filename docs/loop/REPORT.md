# REPORT - SEO indexguard (CI guard + prod monitor + cold-start + creator nudges)

4-part mission to make "every future quiz is indexable and unique" a MECHANICAL guarantee. Scope:
scripts/, one cron route, /q/[slug], the quiz builder UI, lib. NO DDL. tsc 0 + build green. Nothing
pushed. This report is updated per part; commits are per part.

## PART 1 - CI GUARD: the sitemap x robots contradiction test  [DONE]
New `scripts/check-indexability.mts`, wired as `check:indexability` next to `check:routes`. It is a
smoke-style gate (needs a running server, since dynamic page metadata cannot be resolved statically):

  INDEXCHECK_BASE_URL=http://localhost:3021 pnpm --filter quiz check:indexability

- FORWARD: pulls the live `/sitemap.xml`, samples ONE URL per route type + EVERY article, fetches each,
  and FAILS when a sitemap URL contradicts "index me": robots noindex (meta OR X-Robots-Tag header) -
  the article-bug class - missing `<title>`, or a canonical that is not self-referential. Core Play
  types also fail on non-200.
- INVERSE: FAILS when an indexable-by-design page is ABSENT from the sitemap - every non-noindex
  article, plus a live DB sample of published quizzes (/q/[slug]) and groups with quiz_count>0
  (/[slug]-quiz).
- Deep on-demand-ISR types (verse leaf pages, rankings, pulse) are WARN-not-fail locally: a cold local
  server hits the documented ISR cold-404 trap, so a non-200 there is an environment artifact, not a
  contradiction; the PART 2 prod monitor checks their live status against warm prod. The noindex /
  title / canonical checks still hard-fail on any of them that DOES render.

RECEIPT (red -> green):
- RED (real): the guard's FIRST run failed on 3 genuine contradictions it surfaced - the sitemap
  advertised `/games/this-or-that/[slug]` pages that 308-permanent-redirect to the query-param model.
  Fixed the sitemap: those category slugs are no longer listed (the hub /games/this-or-that stays).
- RED (injected, the noindex class): forcing the article page to emit `robots: noindex` while it stays
  in the sitemap made the guard FAIL with 19 named failures ("Sitemap says index, page says do-not"),
  exit 1. Reverted.
- GREEN: after the tot fix and revert, the guard passes - 42 sampled pages index-consistent, every
  article + sampled quiz/group present in the sitemap (2 verse-leaf warnings, non-gating).

Files: `scripts/check-indexability.mts` (new), `package.json` (check:indexability), `src/app/sitemap.ts`
(drop the redirecting this-or-that category slugs). tsc 0; next build green (check:routes +
check:verse-tokens pass inside it).

## PART 2 - PROD MONITOR CRON (weekly)  [DONE]
New `app/api/cron/seo-indexability/route.ts`, auth + runtime + response shape mirroring duel-reconcile
EXACTLY (byte-identical CRON_SECRET / x-vercel-cron guard; `export const dynamic = 'force-dynamic'`;
`NextResponse.json`). It fetches the PROD `/sitemap.xml`, samples N=40 URLs stratified by route type
(every article first, then round-robin one-per-type: quizzes, groups, verse, hubs, ...), fetches each,
and reports any that are not HTTP 200 / carry robots noindex / lack a self-canonical. Read-only: it
logs + returns `{ ok, checked, sitemapUrls, failures: [...] }`. Weekly `vercel.json` cron at Sun 09:00
UTC (no collision with existing jobs).
RECEIPT (docs/proofs/seo-indexguard/part2-cron-invocation.txt): unauthenticated -> HTTP 401; authed
(Bearer CRON_SECRET) -> `{"ok":true,"checked":40,"sitemapUrls":694,"failures":[]}` against live prod.
tsc 0.
## PART 3 - COLD-START uniqueness block on /q/[slug]  [PENDING]
## PART 4 - CREATOR NUDGES in the builder  [PENDING]

(Continuing in subsequent loop iterations; each part committed on its own.)
