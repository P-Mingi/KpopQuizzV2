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

Everything new is inside the existing `getGamesData` `unstable_cache([...], { revalidate: 3600 })`:

- `bandPool`: one `songs` read (id, title, artist_name; active; limit 80).
- `dailyExclude`: one `daily_blindtests` read (today's song_ids) so the band
  preview never shows the real answers of today's daily.

Both are added to the same `Promise.all` already inside the cache, so they run once
per hourly revalidation and are shared across every visitor. No new read happens per
request. The four band answer chips are computed from that cached pool with
`pickDailyMany` (pure, no I/O).

## Client fetches on load

One, and it is not new: `StreakChip` / `StreakPill` read `/api/daily/streak`, the
same endpoint the previous hub already called from `BlindStreak`. It is per-user
data that cannot live in ISR HTML; it returns nothing for anonymous viewers and
crawlers (so most loads make no meaningful call), and it is not the hub's main data.
The live countdown is pure client math (`msUntilUtcMidnight`), no fetch. The filter
is client-only state toggling a data attribute, no fetch.

## No new API route

The only endpoint used is the pre-existing `/api/daily/streak`. No route was added.
