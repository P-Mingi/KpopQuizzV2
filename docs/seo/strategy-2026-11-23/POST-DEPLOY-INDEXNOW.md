# Post-deploy IndexNow: the URLs of the first deploy (lot SEO-LAUNCH-1)

For the orchestrator's PR body. Written 2026-11-24 (review fix 5).

## What to run, once, after the merge and the deploy

Actions tab, workflow "IndexNow submit", "Run workflow" on main, field `hub_urls` filled with the nine lines below (one per line, no blank line needed).
That run is hub-only: it POSTs exactly those URLs once to `https://bunnyverse.org/api/indexnow?mode=urls` (same `INDEXNOW_TOKEN`), never the sitemap,
then records the live hub sitemap as the new baseline so the next push does not send them again. It needs `INDEXNOW_TRIGGER_TOKEN` on the bunnyverse.org
project, as the normal run does.

```
https://bunnyverse.org/about
https://bunnyverse.org/kpopcards
https://bunnyverse.org/kpopcards/odds
https://bunnyverse.org/kpopcards/help
https://bunnyverse.org/fr/daily
https://bunnyverse.org/fr/kpopdle
https://bunnyverse.org/fr/otakudle
https://bunnyverse.org/fr/otakudle/one-piece
https://bunnyverse.org/fr/otakudle/dragon-ball
```

## Conditions (the route sends nothing otherwise, and says `submitted: 0`)

- The hub must be open to search engines (`NET_INDEXING`): while it is closed the route pings nothing, and the sitemap lists none of these pages.
- `/kpopcards`, `/kpopcards/odds`, `/kpopcards/help` are in the sitemap only with `NET_CARDS` on (`cardsSitemapRows`).
- The four `/fr` game pages and `/fr/daily` are in the sitemap only with `dailyGuess` on and the French reviewed (`DLE_FR_REVIEWED`, owner 2026-11-23);
  `/fr/otakudle/one-piece` and `/fr/otakudle/dragon-ball` only while their game answers (a game that is off says noindex and stays out).
- `/fr/credits` is not listed: it is out of the sitemap by design and noindex while it lists nothing.
- Run it when the flags are on, after the deploy is live (the sitemap already lists the pages). Run it again with a shorter list if a flag opens later.

## What the normal runs do

On main pushes the diff run (kpopquiz.org job, then the independent hub job) submits whatever was added, removed or moved lastmod since the last
snapshot of its own. If the hub was closed when its baseline was recorded, the first diff after the opening finds every hub URL "added" and sends them
all: the explicit list above is for the case where you want these nine sent at a moment you choose, without waiting for or relying on that diff.
