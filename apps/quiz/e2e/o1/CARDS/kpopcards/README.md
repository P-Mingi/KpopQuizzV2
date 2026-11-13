# KpopCards QA harness (e2e/o1/CARDS/kpopcards, the folder CARDS owns) (agent D, lots 3 + 4 + 5)

Compares the app with the validated prototype `docs/design/cards/kpopcards-prototype-v6.html`, screen by screen, and runs the
overflow, journey, accessibility, flip and fps checks. Config: `apps/quiz/e2e/o1/CARDS/playwright.kpopcards.config.ts` (one browser project per run).

## Run (from apps/quiz)
1. Dev server of the app in fixture mode on the QA port (needs agent A's seeded mock, `lib/kpopcards/mock-api.ts`):
   `NET_CARDS=1 CARDS_UI_FIXTURE=1 CARDS_UI_FIXTURE_FULL=1 NEXT_PUBLIC_SITE_ID=hub NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 pnpm dev -p 3135`
   (the app is read from `KC_BASE_URL`, default `http://localhost:3135`, under `KC_APP_ROOT`, default `/kpopcards`).
2. Specs, one browser at a time:
   - `./node_modules/.bin/playwright test -c e2e/o1/CARDS/playwright.kpopcards.config.ts visual` : pixels and boxes, 3 viewports x every screen
     (`KC_SCREENS=lobby,help`, `KC_VPS=390x664`)
   - `... overflow` : no horizontal scroll or clipped element 360 to 1920 px on every page, and the opening fits 13 sizes
   - `... journeys` : guest demo, open 1, open 5, pack of the day, focus pack, golden, Gold, Full Art, Reveal all, craft, set reward, week, ranking, friend by code, idol page, recycle, locks
   - `... a11y` : targets of 44 px, visible focus, names, reduced motion
   - `KC_PROJECT=chromium|firefox|webkit ... flip` : the card view flip never shows the back through the front
   - `... fps` (chromium) : CPU 4x slower, Full Art opening, prototype and app, 390x664 and 1366x657
3. Report: `node e2e/o1/CARDS/kpopcards/report.mjs` writes `qa/pass-<n>.md` (table per screen and viewport, then "For agent A / B / C").

## How the comparison is made fair
- Both sides get the same seeded `Math.random` (mulberry32, `KC_SEED`) and a constant `Date` (`KC_TIME`, default 2026-11-13 10:00 Paris), injected before any page script; timers and CSS animations run on real time.
- The prototype is served from a fake origin by `page.route` (so localStorage works in all engines), starting from its own example binder.
- Screenshots use `animations: 'disabled'`, no caret; scenes with motion are shot after a fixed settle time.
- Masked on both sides (see `helpers/freeze.ts`): the photo layer `.c-art` (flat grey) and the idol names and meta text on cards, reveal tags, almost-there and ranking names (text made transparent). Boxes are never masked.
- The pixel diff is pixelmatch's algorithm (YIQ, threshold 0.1) run in a scratch page: no npm dependency. Pixels outside the smaller image count as different.
- Boxes: the key selectors of `helpers/screens.ts`, document coordinates, first 12 matches each, tolerance 2 px.
- Self-check: `KC_SELF=1 ... visual` compares the prototype with itself (must be 0%); `KC_TARGET=proto ... journeys|overflow|a11y|flip` runs those specs on the prototype to prove the specs themselves.
- Images go to `qa/img/<screen>/<viewport>-{proto,app,diff}.png` (never committed); each spec appends to `qa/img/results.jsonl`.
