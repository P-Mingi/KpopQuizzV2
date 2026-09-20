# REPORT - PERF 3s NAV: kill the per-request dynamic render on the public nav pages

Branch `perf/free-viability-2` off main `dda4880` (includes #28). Same patron as #28: a PUBLIC
page that reads cookies only for public data is forced into DYNAMIC rendering, so it re-renders
per request on nano (the ~3s nav). CODE ONLY. Zero DDL, zero content/layout change, no push to
main. Behaviour preserved for signed-in users (none of the touched reads were user-specific).

## The bug (owner-observed, Cowork-diagnosed)
`/blindtest` declared `revalidate=3600` but `getStats()` called `await createServerClient()` (the
COOKIE client) for two count queries (active songs, groups). Reading cookies opts the WHOLE route
into dynamic rendering, so Next ignored the revalidate and rendered per request. Those counts feed
only the static "300+ songs / 60+ groups" label - they never needed to be live per request.

## What changed (each route flipped to Static/ISR)

| Route | Before | After | How |
|---|---|---|---|
| `/blindtest` | `ƒ` Dynamic (no-store) | `○` Static, 1h | getStats -> cookie-free `createPublicReadClient` + `unstable_cache` (catalog TTL), try/catch OUTSIDE the cache |
| `/pt/blindtest` | `ƒ` Dynamic | `○` Static, 1h | same fix (the pt mirror) |
| `/blindtest/[mode]` | `ƒ` Dynamic | `●` SSG/ISR, 1h | `generateStaticParams` from `STATIC_MODES` (a DB-free code constant) + `revalidate`; group modes on-demand |

The two blindtest pages now share ONE cached reader, `getBlindtestStats` in
`lib/db/queries/blindtest.ts` (the counts are locale-independent, so one entry serves both).

## Swept and left as-is (with reason)
- `/quizzes`: **the mission's premise that it is "already ISR/HIT" is inaccurate.** It reads
  `searchParams` (browse filters group/type/sort/page), which forces dynamic rendering - it
  cannot be full-route-cached without moving filtering client-side (a behaviour change, out of
  scope). Its DB reads are already cookie-free + `unstable_cache`d (#28), so it renders fast
  (~0.2-0.3s warm, http 200 - not 3s). Left untouched; the nav is not slow for a DB reason.
- `/blindtest/leaderboard`: `searchParams` (`?date=`) - same legitimate dynamic category. Out of scope.
- `/leaderboard` (Community), `/trivia`, `/` (home): already `○` Static. `/[slug]` group hubs:
  `●` (stayed ISR from #28). Verified, not rewritten.
- Verse / `/quiz/[id]/edit` / `/notifications` / `/search` / builder / admin / auth: use
  `createServerClient` for genuinely per-user or searchParams reasons. NOT touched.

## Proof (docs/proofs/perf-nav/, on next build + next start, never dev)
- Route table before/after: `route-modes.txt` (the 3 flips above; /quizzes stays ƒ, explained).
- next start cache: `cache-headers.txt` - `/blindtest` + `/pt/blindtest` -> `x-nextjs-cache: HIT`;
  `/blindtest/classic` (prerendered static mode) HIT; `/blindtest/group-bts` (on-demand) MISS then HIT.
- `next build` exit 0 (795 static pages, was 795-ish; no export error - the try/catch-outside
  keeps the now-Static /blindtest build DB-independent). `tsc --noEmit` 0 errors. Unit 118/118.
- SEO gates: `check:routes` (303 routes) + `check:verse-tokens` green in the build.
  `check:indexability` ran a COMPLETE crawl of all 2988 sitemap URLs and passed (this is the
  gate that actually exercises the changed /blindtest pages - they stay indexable). `check:
  metadata-dupes` + `check:orphans` are nightly-CI gates (`seo-gates.yml`, off the push path
  because they crawl every sitemap URL); this change touches no metadata, links or sitemap
  entries, so they are invariant to it, and they run nightly against prod.
- No em dashes, zero emoji.

## Owner gate remaining
1. CI green on the branch (unit + e2e). PR: https://github.com/P-Mingi/KpopQuizzV2/pull/29
2. Review + merge `perf/free-viability-2` to main (owner-gated). After deploy, clicking Blindtest
   in the top nav serves cached HTML (no ~3s render).

## Out-of-scope observation (NOT fixed here)
`/blindtest` still links to `/games/this-or-that` and `/games/name-all` (page.tsx lines ~227/245),
which the #26 kill removed (they now 301 to /quizzes). Dead internal links - a content fix for a
separate change, flagged not touched (this mission is render-mode only).
