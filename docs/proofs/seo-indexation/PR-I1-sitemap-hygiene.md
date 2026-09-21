# PR-I1 - Sitemap hygiene (proof)

Branch `feat/seo-sitemap-hygiene` off main `d944d50`. Zero DB/DDL.

## Finding: the sitemap is ALREADY hygienic
`sitemap.ts` is a mature allow-list (built from the live DB + hardcoded live pages), hardened by
prior SEO missions: it excludes killed routes by construction, skips thin/empty group hubs
(quiz_count 0), title-dedups `/q/` URLs, gates `-trivia` on fact-eligibility, and emits honest
lastmod (stable dates, not `new Date()` per deploy). The live prod sitemap proves it:

```
prod /sitemap.xml           649 URLs, single file (no <sitemap> index needed, well under 50k)
killed-pattern audit        /games /coer-quiz /tier-list /rankings /battle /personality
                            /avatar /pinterest /blind-test/  ->  ALL 0 occurrences
Tier A/B hub presence       cortis illit seventeen babymonster aespa stray-kids blackpink twice
                            bts newjeans le-sserafim ive enhypen txt itzy  ->  15/15 present
sample 16 URLs (all types)  hubs, articles, blindtest groups, trivia, /q/ quizzes  ->  16/16 HTTP 200
```
So there was no dead entry to remove and no missing hub to add. Rather than fabricate churn, PR-I1
ships the lasting guarantee: a regression gate that keeps it this way.

## What ships: `check:sitemap-hygiene` (a regression gate)
`apps/quiz/scripts/check-sitemap-hygiene.mts` - a smoke-style gate (server up), sibling to
`check:indexability` / `check:orphans` / `check:metadata-dupes`. It fetches `/sitemap.xml` and asserts
three structural properties none of the existing gates cover:
1. NO advertised URL matches a KILLED pattern (the 9 removed-route patterns above).
2. Every priority Tier A/B group hub `/{slug}-quiz` is present (the W1 head-term targets).
3. The sitemap is a single file under Google's 50,000-URL limit (else it must become an index).
Liveness (each URL 200 / indexable) is already covered by `check:indexability`, so this gate does
not re-fetch every URL. Wired into `.github/workflows/seo-gates.yml` (nightly) as a step + the Discord
failure line, exactly like its siblings.

## Gate proof (local dev server on :3021)
```
positive:  Sitemap-hygiene gate passed: 2992 URLs, 0 killed routes, all 15 priority hubs present,
           single file under 50000.   (2992 vs prod 649 = local service-role key unhides Verse URLs;
           both pass the same three assertions)
negative:  synthetic sitemap with /games/this-or-that + missing hubs -> 14 problems detected, exit 1
           (proves the gate is not a no-op)
```

## Build gates
`tsc --noEmit` exit 0 - unit 118/118 - `next build` (see CI) - 0 em/en dash on all touched files.
The mission doc `docs/loop/MISSION.md` is committed here (the worker commits it as it starts).
DO NOT MERGE - owner merges.
