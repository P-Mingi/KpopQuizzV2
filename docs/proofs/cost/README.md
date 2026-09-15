# COST mission, proofs

Cut Vercel invocations and make the nightly SEO gate green, without changing any
URL's behaviour and without touching Verse. Branch `perf/cost-cut` off main.

- `before.md` : the measured BEFORE (invocation split, the code facts, method).
- `after.md` : PART 1 (middleware matcher, behaviour matrix + arithmetic), PART 2
  (/api/auth/me dedup), PART 5 (the duplicate-title fix, with the Verse-scope note).
- `tier-list-and-dynamic.md` : PART 3 (why all 34 force-dynamic pages stay) and
  PART 4 (the tier list is not a cost driver).

## Headline

- PART 1: the middleware matcher now excludes the known cached page prefixes (/q/*,
  /, /games, the -quiz/-trivia group pages, /leaderboard, ...) so they pay zero
  middleware invocations; verse/auth/redirect/rewrite paths and unknown URLs still
  match. Behaviour proven identical on next start (every redirect, the rewrite, the
  unknown-route 301, the excluded pages) and unit-proven (85-case matcher matrix).
- PART 2: the four nav islands share one `/api/auth/me` call per page view (was 2-4),
  via a module-level `useMe` cache; login/logout behaviour unchanged.
- PART 3: no force-dynamic page can flip without touching Verse or moving an auth
  read to the client on a non-SEO page; the SEO pages were already ISR (RENDER-FIX).
- PART 4: no tier-list route is in the hog list; the launch did not cause the spend.
- PART 5: the one real production duplicate-title (two SEVENTEEN quizzes) is fixed by
  deduping the sitemap by (title, question count), keeping the most-played.
- Tests: unit 165 passed (incl. 85 new matcher cases), e2e 56 passed / 10 skipped,
  tsc 0 source errors, next build green. No URL behaviour changed. No Verse change.
  Zero emoji, zero em dashes.
