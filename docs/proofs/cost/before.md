# COST, the BEFORE measurement

Measure-first. The auditor's production 24h invocation split (to be re-confirmed on
the Vercel dashboard by the owner; the code facts below are re-confirmed here):

```
by source:  middleware 67739   cache 50322   function 27363   redirect 2024
top routes: /q/[slug] 17139, /, /leaderboard, /verse, /games, /login, /search,
            /api/auth/me 2035, /api/duels/next 854
```

## Code facts re-confirmed on this branch

1. Middleware matcher (`src/middleware.ts`) matched essentially every HTML page:
   `'/((?!api/|_next/...|<assets>).*)'`. So every request to a cached, known page
   (/q/*, /, /games, the -quiz/-trivia group pages, /leaderboard, ...) invoked the
   middleware function and did nothing but `NextResponse.next()`. That no-op
   passthrough on known pages is the 67,739.
2. `/api/auth/me` is `force-dynamic` and was fetched INDEPENDENTLY by four client
   islands that each need the signed-in state: `top-nav-profile`, `notification-bell`,
   `mobile-top-bar`, and `home-streak-nudge`. A single page view therefore spawned
   2 to 4 identical `/api/auth/me` invocations.
3. `/api/duels/next` is polled by the duel game.
4. Real `export const dynamic = 'force-dynamic'` pages: 34 (not 37; the earlier count
   included comment-only matches). By area: 18 `/verse/*`, 13 `/admin/*`, plus `/me`,
   `/notifications`, `/tier-list/mine/[slug]`, `/(builder)/build/[slug]`, `/battle`.
   The home page and `/games` etc. are already ISR (RENDER-FIX); the grep hit home
   only on its comment.

## Method

- The middleware behaviour is proven by a unit-tested matcher matrix
  (`middleware-matcher.test.ts`, 85 cases) plus a live redirect/gate/unknown-route
  matrix against `next start` (see `after.md`).
- `/api/auth/me` dedup is proven by the shared `useMe` hook and a build.
- The nightly SEO gate collision was found by running `check:metadata-dupes` against
  live production (738 URLs) rather than guessing.
