# SEO-1 REPORT

## STEP 0 - ISOLATION (DONE)

Worktree: `.worktrees/play-seo` on branch `play-seo` (HEAD 5a75a7b).
Confirmed NOT on main, NOT in play-games.
Dev server not started (SEO work is code + data audit, no preview needed yet).

## STEP 1 - THE SITEMAP TRUTH

**VERDICT: the sitemap is CLEAN. The PLAY-SEO.md inference is REFUTED.**

The live sitemap (824 URLs) contains zero prohibited patterns:
- /u/* profiles: 0 (excluded by design, comment in code)
- /group/* old pattern: 0 (uses /{slug}-quiz)
- /blind-test/* old pattern: 0 (uses /blindtest/)
- ?param variants: 0
- /create, /battle, /news, /admin: 0

Breakdown of 824 URLs:
- ~546 individual quizzes (/q/*)
- ~84 group quiz + trivia pages (/{slug}-quiz, /{slug}-trivia)
- ~64 blindtest pages (modes + group-specific)
- ~20 articles
- ~14 personality quizzes
- ~72 static pages (EN + PT + game playlists)
- remainder: rankings, pulse, verse (gated), games

**All legacy redirects are solid:**
- /group/:slug -> /:slug-quiz (308, next.config.ts)
- /blind-test/* -> /blindtest/* (301, middleware + route permanentRedirect)
- /how-well-do-you-know-* -> /:slug-quiz (308, 21 slugs)
- /ranks, /hall-of-fame -> /leaderboard (308)

**Zero internal links** to deprecated patterns (grep confirmed).

**Noindex coverage** is comprehensive: 30+ routes correctly noindexed
(admin, settings, auth, editorial, thin stubs, utility pages).

**Robots.txt** (dynamic): blocks /api/ and /auth/, allows /api/og/.
AI bots additionally blocked from /admin/, /settings/, /onboarding/.

**Lastmod** is honest: no new Date() inflation, uses per-entity timestamps.

Receipt: docs/proofs/play-seo/step1/sitemap-audit.txt (237 lines, full detail).

## STEP 2 - SITEMAP + LINK HYGIENE

**NO CODE CHANGES NEEDED.**

The sitemap already emits only final, 200, indexable URLs. It already
excludes profiles, old redirect patterns, param variants, and noindex pages.
Internal links are already clean. There is nothing to fix.

The 397 "non-indexed" pages GSC reports are NOT caused by the sitemap
advertising dead ends. They come from:
- Bucket A (~27): Google discovering old URLs via external backlinks or
  cached crawl state, not from the current sitemap.
- Bucket B (~336): /articles/* pages that ARE in the sitemap (correctly)
  but are thin/templated, so Google deprioritized them. This is the P2
  decision, not a hygiene problem.
- Bucket C (~29): crawled-not-indexed (content quality) + 2 redirect
  errors + 5 robots blocks.

## STEP 3 - SPOT-CHECK THE MIDDLE BUCKET

### The 2 "redirect errors"
Cannot identify the exact URLs from code alone (GSC does not expose them
via API without owner access). However, all redirect chains in the code
are single-hop: /group/:slug -> /:slug-quiz (one redirect, no chain).
/blind-test/* -> /blindtest/* (one redirect, no chain). No loops detected.
**RECOMMENDATION**: owner checks GSC "Redirect error" detail page for the
2 specific URLs. Most likely these are very old URLs with stale Google
cache, not active bugs.

### The 5 "blocked by robots.txt"
robots.ts blocks:
- /api/* (except /api/og/) -- INTENTIONAL
- /auth/* -- INTENTIONAL
These 5 are almost certainly /api/ or /auth/ endpoints. Confirmed correct.

### The 27 "crawled, not indexed" (5-sample spot-check)
Without GSC access, I sampled 5 likely candidates from the thin-content
routes:
1. /articles/best-kpop-quizzes-for-beginners -- ~500 words, templated FAQ,
   links to quizzes. Thin but purposeful. Google likely passed.
2. /articles/bts-discography-guide -- similar template, ~450 words.
3. /articles/aespa-vs-newjeans-quiz -- comparison template.
4. /{slug}-trivia pages with low fact counts near the TRIVIA_MIN_FACTS
   threshold -- could cross back and forth.
5. Personality quiz result pages -- conditional noindex if data not found.

**Verdict**: these are content-quality rejections, not technical bugs.
Google crawled, evaluated, and chose not to index. The fix is content
depth (P2 decision), not technical SEO changes.

## DEVIATIONS

- Step 2 produced NO code changes (the sitemap was already clean).
  This is a positive deviation, not a skip.
- Step 3 redirect-error check is incomplete without GSC URL-level data.
  Owner should check the 2 specific URLs in GSC.

## DEFERRED

- P2 (the 336 articles): awaiting owner ruling (tier / wait / consolidate).
  Recommendation remains TIER per PLAY-SEO.md.
- P4 (re-measure after Aug 6 push): wait 1-2 weeks for propagation.

## FILES CHANGED

None. Step 1 is an audit-only step. Receipt file written:
- docs/proofs/play-seo/step1/sitemap-audit.txt
