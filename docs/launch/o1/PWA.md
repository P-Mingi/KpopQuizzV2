# Installable app (PWA): switches, kill switch, owner checks

Plan: `docs/o1/PWA-PLAN.md`. Built on `o1/pwa`, not merged before launch day. Everything is off by default.

## What ships

| Piece | Where | Notes |
|---|---|---|
| Manifest KpopQuiz | `apps/quiz/public/site.webmanifest` | `id` and `scope` `/`, `start_url` `/?source=pwa`, standalone, 192 and 512 icons `any` then `maskable` (the white rabbit, tested to sit inside the safe zone). The head link is the one it already had: the served HTML does not change. |
| Manifest Bunnyverse | `apps/quiz/public/brand/hub/site.webmanifest` | Unchanged: answered at `/site.webmanifest` on the hub build only (brand rewrite), already installable (name, standalone, 192 and 512, start `/`). Its sha is pinned by `kpop-icons.test.ts`. |
| Worker | `GET /sw.js` (`app/sw.js` for kpopquiz.org, `app/sites/[site]/sw.js` for the hub) | `Cache-Control: no-cache`. Caches `/_next/static/**` (cache first) and the icons (stale while revalidate), nothing else. Never a page, never `/api` or `/auth`, never another origin (Supabase), never a non-GET. Offline page built into the worker, shown only when a page request gets no answer at all. |
| Banner | `lib/pwa/boot.ts`, started by a dynamic import in `ThemeInit` | Client only, after the conditions. Not in the served HTML, not in the React tree. |

OtakuQuiz (`/anime`) is no app of its own: the anime build registers nothing and answers 404 at `/anime/sw.js`. The hub worker (scope `/`) also covers `/anime` pages and caches their `_next/static` files.

## The two switches

| Name | Scope | On means | Off means |
|---|---|---|---|
| `NEXT_PUBLIC_NET_PWA` | public, inlined at build | the page registers `/sw.js` and may show the banner | no registration, no banner, no chunk fetched; `/sw.js` answers 404 (kpopquiz.org keeps today's answer) |
| `NET_PWA_KILL` | server | `/sw.js` is a worker that deletes its caches and unregisters itself, on any build, flag on or off | the flag decides |

`1` or `true` is on, as every flag of the run. `next dev` never serves a caching worker.
They are kept in `lib/pwa/config.ts` (`PWA_FLAGS`), not in `O1_FLAGS`, for the reason `NET_LAUNCH_DATE` is kept out of `registry.ts`: that module is in the kpop client bundle, and `contract.test.ts` compares the `flags-env.md` table with `O1_FLAGS` one to one.

Measured, no build: `registry.ts` is imported by at least 20 `use client` files of kpopquiz.org (the account menu, the footer, the quiz run and results, the sign-in sheet, settings and others) and by many shared libraries behind them, while nothing in the app imports `O1_FLAGS` (only the unused `lib/site/index.ts` barrel and tests). The two entries are 125 bytes of minified source (`NEXT_PUBLIC_NET_PWA` and `NET_PWA_KILL` as strings, plus the lane) inside that module. H1 measured the same move for one entry (`NET_LAUNCH_DATE`, `docs/o1/requests/H1.md`): a kpop chunk went from 59771 to 59841 bytes, so the chunk file name changes and with it the script tags of every kpopquiz.org page that loads it. That is a change of the served HTML of kpopquiz.org, so the lane did not make the move. ORCH decides it together with the chunk change of H1's request.

The move, verified against `contract.test.ts` on a scratch edit (96 of 96, then reverted): two entries at the end of `O1_FLAGS` (`{ name: 'NEXT_PUBLIC_NET_PWA', scope: 'public', lane: 'L1', reserved: false }` and `{ name: 'NET_PWA_KILL', scope: 'server', lane: 'L1', reserved: false }`; the lane is L1, because `PWA` is no lane of `LANES.md` and the test refuses it), two rows at the end of the flags table of `flags-env.md`, the L1 flags cell of `LANES.md` section 2 (`NET_INDEXING, NEXT_PUBLIC_NET_PWA, NET_PWA_KILL`, the test compares it with the table), then `PWA_FLAGS` and its test in `lib/pwa/pwa.test.ts` go. A line in `routes.md` "Per-site root files" (`/sw.js` is the fourth) is documentation only.

## Turning it on (owner, per Vercel project, Production)

1. Set `NEXT_PUBLIC_NET_PWA=1` on the project (kpopquiz.org and the hub are two projects), redeploy.
2. `curl -sI https://<domain>/sw.js`: `200`, `content-type: text/javascript`, `cache-control: no-cache`.
3. `curl -s https://<domain>/site.webmanifest`: the manifest of that domain.
4. The device checks below.

## Turning it off after it was on

Registered workers stay in browsers until they are told to go, so removing the flag alone leaves them. In this order:

1. Set `NET_PWA_KILL=1`, redeploy. Each browser fetches the new `/sw.js` on its next visit (`no-cache`, registration with `updateViaCache: 'none'`), the kill worker deletes the caches `kpq-*`, tells the open pages (they stop registering for a day and hide the banner) and unregisters. It does not reload a page, so nobody loses a quiz.
2. Wait a week (a browser that was not opened in between gets it when it comes back).
3. Unset `NEXT_PUBLIC_NET_PWA`, redeploy. `/sw.js` is a 404 again. Leave `NET_PWA_KILL` set for another week, then unset it.

Without step 1, a 404 at `/sw.js` leaves the old worker active: it keeps serving its cached static files and its offline page.

## What the banner does

Shows when all of these hold, never otherwise: second visit or later (a visit is a 30 minute gap), 3 finished quizzes on the device (`FINISHED_QUIZZES` in `lib/pwa/state.ts`; the plan says 2 or 3) or a won daily game (read from `dle:v1:history`), the page is not a quiz or game page and not full screen, the app is not already installed (`display-mode: standalone`, iOS home screen, `appinstalled`), the browser can offer an install (kept `beforeinstallprompt`, or iPhone and iPad Safari: the two gestures). Dismissed (cross, "Not now", or the browser window refused): gone for 30 days. State is one localStorage key, `kq:pwa:v1`, in try/catch. English at `/`, French under `/fr`; the French is for the owner to read.

## Owner checks (not run by the lane)

- Lighthouse "Installable" green on both sites (Production, flag on).
- Android Chrome: install from the banner and from the menu, open the app, airplane mode shows "No connection" and Retry works.
- iPhone Safari: the guide shows, "Share" then "Add to Home Screen" gives the app.
- A quiz in progress is never covered; an installed app shows no banner.
- Look at the maskable icon of the hub on maskable.app: the placeholder rabbit's sparkle sits at 84 percent of the half width, the safe zone ends at 80. If it clips, a padded copy of the icon is one file (and the pinned manifest sha in `kpop-icons.test.ts` moves with it).
- Parity before merge: `scripts/o1/parity.sh` with the flag off must be identical (the flag is new and off, and the lane never ran it: no build was allowed); with the flag on, only script file names are expected to differ.
