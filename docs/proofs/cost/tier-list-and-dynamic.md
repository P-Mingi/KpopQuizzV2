# COST, PART 3 (force-dynamic pages) and PART 4 (tier list)

## PART 3, the force-dynamic pages

34 pages export `dynamic = 'force-dynamic'` (re-counted precisely; the earlier "37"
included comment-only grep hits, and the home page is already ISR). Every one is
genuinely request-dependent, so none is converted:

- 18 `/verse/*` pages. HARD CONSTRAINT: do not touch Verse. They stay dynamic.
- 13 `/admin/*` pages. Auth-gated moderation dashboards that render per-admin data
  behind a session check. Legitimately per-request. Stay dynamic.
- `/me` and `/notifications`. Signed-in-only, per-user. Stay dynamic.
- `/tier-list/mine/[slug]`. The owner-view route (noindex) added by the tier-list
  hotfix, which must read the cookie to prove ownership. Stays dynamic.
- `/(builder)/build/[slug]`. Curator-gated draft canvas, 404 for everyone else,
  noindex. Self-gates per request. Stays dynamic.
- `/battle`. Reads `auth.getUser()` to tell the 1v1 game whether the player earns
  ranked XP; noindex, and not in the measured hog list. Converting would push the
  auth read to the client for a page that is neither SEO-load-bearing nor a top
  invocation source, so it stays dynamic.

The SEO-load-bearing pages that used to be wrongly dynamic (home, /games, /q/[slug],
/leaderboard, ...) were already converted to ISR by the earlier RENDER-FIX. There is
no straggler among these 34 that can flip without either touching Verse or moving an
auth read to the client on a non-SEO page. This is the honest finding, not a skipped
task.

## PART 4, the tier list is not a cost driver

The measured top routes were /q/[slug], /, /leaderboard, /verse, /games, /login,
/search, /api/auth/me, /api/duels/next. No tier-list route appears. By construction:

- The OG card route (`/api/og/tier-list`) is cache-hardened (immutable per board,
  pinned public base), so a shared card is served from cache, not re-rendered per hit.
- `/api/tier-list/*` (save, asset, publish) are one-shot user actions on create or
  publish, not per-pageview calls.
- The tier-list PAGES (/tier-list, /tier-list/[slug], /l/[slug]) are ISR, not dynamic.

So the tier-list launch did not cause the Vercel spend; the spend is the pre-existing
middleware + per-pageview-function pattern this branch cuts. The owner can confirm the
tier-list routes are a rounding error on the Vercel per-route usage panel.
