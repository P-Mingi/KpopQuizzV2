# Games hub, cost fence

Hard rule: zero new server read per request. Everything new rides the existing
`getGamesData` cache; no new API, no client fetch on load, no new force-dynamic.

## Route table (from `next build`, this branch head)

```
Route (app)                                             Revalidate  Expire
├ ○ /games                                                      1h      1y
├ ○ /pt/games                                                   1h      1y

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Both `/games` and `/pt/games` are `○ (Static)`: prerendered HTML with a 1h ISR
window. Neither is `ƒ (Dynamic)`. A request serves prerendered HTML and touches the
database zero times; the DB is read only at build and at the hourly revalidation.
Full route table: `route-table.txt`.

## No render-mode change

The edits to `games/page.tsx` are content-only. The git diff adds no
`export const dynamic`, no `cookies()`, no `headers()`, no `fetch()` at the page
level (grep of the added lines returns 0). Render mode is therefore identical to
before this branch: `○ Static, 1h`.

## Where the new work lives

The band song reads live in a shared helper `readBandSongs(supabase)` (one `songs`
read + one `daily_blindtests` read to exclude today's answers). Each page calls it
inside its own `unstable_cache([...], { revalidate: 3600 })`:

- `/games`: `getGamesData` (`games-hub-data-v2`).
- `/pt/games`: `getPtGamesData` (`pt-games-hub-data-v2`), added this fix so its band
  is real, not empty, still without a per-request read.

Both run once per hourly revalidation, shared across every visitor. The four band
answer chips are computed from the cached pool with `pickDailyMany` (pure, no I/O).

## Client fetches on load

The streak fetch is now GATED. `StreakChip` / `StreakPill` read `/api/daily/streak`
only when a Supabase auth cookie is present. The app's browser client stores the
session in a JS-readable `sb-...-auth-token` cookie (it is not httpOnly; the browser
`createBrowserClient` reads it), so an anonymous viewer or a crawler has no such
cookie and makes ZERO `/api/daily/streak` calls. Only a signed-in viewer hits it.
This closes cost nit 11 from the audit.

The live countdown is pure client math (`msUntilUtcMidnight`), no fetch. The filter
is client-only state toggling a data attribute, no fetch. No new API route.

## No new API route

The only endpoint used is the pre-existing `/api/daily/streak`. No route was added.
