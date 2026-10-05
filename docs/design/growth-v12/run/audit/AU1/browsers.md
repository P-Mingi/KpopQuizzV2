# AU6: cross-browser pass on the AU1, AU2, AU3 features (2026-10-05)

Target: ORCH's flag-on production build of the feat/v12 head (01f93ab) on http://localhost:3071, production data,
light scheme, 1440x900 and 390x844. Engines: Playwright 1.63 Firefox (firefox-1543), WebKit (webkit-2359) and
Chromium (headless shell 1234, `UX11_CHROMIUM`). Screenshots (local only, git-ignored):
`run/audit/AU1/browsers/<engine>-<width>-<tag>.png` for every page, `...-flow-<tag>-*.png` for the actions,
`...-home-firstpaint-<0..3>.png` and `...-home-top.png` for the home items. Scripts and raw JSON: the shared
scratchpad (`au6-pages.mjs`, `au6-flows.mjs`, `au6-home.mjs`, `au6-*.json`).

Counts (rows of the table, a row passes when both widths pass): Firefox 48 pass / 4 fail, WebKit 52 / 0,
Chromium 52 / 0. Every failure is Firefox only: 3 rows are one pre-existing page error (F1, also on the live
site), 1 row is a real visible defect (F2). 0 rows not run.

## Method
- Per page and width: a fresh context; every non-GET request to any host answered locally (wider than
  `guardWrites`), so nothing was written (the stub logs are empty except where noted); load, 2.5 s, a scroll to the
  bottom and back, 2.5 s. Fail on: navigation error or status >= 400, "Something went wrong" / "Application error",
  `scrollWidth > innerWidth` (sideways scroll), a visible image that finished with no pixels (broken), a visible
  image not loaded whose alt text is painted (computed colour not transparent), any page error or console error, any
  response >= 400. Allowed by the brief: the `/_vercel/*` script (`expected expression, got '<'` in Firefox,
  `Unexpected token '<'` elsewhere) and the `/api/ranked/me` 503 (and its console line).
- Actions (reads only): blindtest runs of 10 songs on All K-pop (hub Start), KPop Demon Hunters and K-pop hits 2026,
  with every reveal and the results, generate let through (a read), Deezer clips answered with a local silent WAV;
  Which BTS member and the KPop Demon Hunters girl group quiz to the result (result POST stubbed); one BTS Name them
  all round (3 names typed, Give up, end screen; result POST stubbed); the NewJeans discography quiz played to the
  results (play POST stubbed) and the This or that card checked (2 options, covers loaded), no vote.
- Home: 12 probes from navigation commit (each frame: any image or CSS background covering more than half the
  viewport), 4 first-paint screenshots, the paint timing entries; then the rabbit logo (`.ux-nav .ux-brand img`:
  mascot file, loaded, 28x28, no K tile), the groups rail photos (`.p1-gav img`: pinned to the 80x80 circle,
  `object-fit: cover`, `object-position: 50% 25%`, loaded when on screen) and the New quizzes thumbs
  (`.p1-nthumb`: 56x56, icon drawn, picture loaded when present).

## Table (feature x engine)
| Feature | URL | firefox | webkit | chromium |
|---|---|---|---|---|
| Home top | `/` | pass | pass | pass |
| AU1 1-6 Blindtest hub | `/blindtest` | pass | pass | pass |
| AU1 7 Landing en | `/guess-the-kpop-song` | pass | pass | pass |
| AU1 8 Landing fr | `/fr/blind-test-kpop` | pass | pass | pass |
| AU1 9 Landing es | `/es/adivina-la-cancion-kpop` | pass | pass | pass |
| AU1 10 Landing id | `/id/tebak-lagu-kpop` | pass | pass | pass |
| AU1 11 Theme hits 2026 | `/blindtest/kpop-hits-2026` | pass | pass | pass |
| AU1 12 Theme hits 2025 | `/blindtest/kpop-hits-2025` | pass | pass | pass |
| AU1 13 Theme 5th gen | `/blindtest/5th-gen` | pass | pass | pass |
| AU1 14 Theme TikTok viral | `/blindtest/tiktok-viral` | pass | pass | pass |
| AU1 15 Theme KPDH | `/blindtest/kpop-demon-hunters` | pass | pass | pass |
| AU1 19 recent-hits | `/blindtest/recent-hits` | pass | pass | pass |
| AU1 19 4th-gen-gg | `/blindtest/4th-gen-gg` | pass | pass | pass |
| AU1 19 4th-gen-bg | `/blindtest/4th-gen-bg` | pass | pass | pass |
| AU1 20 kpop-legends | `/blindtest/kpop-legends` | pass | pass | pass |
| AU1 20 title-tracks | `/blindtest/title-tracks` | pass | pass | pass |
| AU1 5 group mode page (new group) | `/blindtest/group-rescene` | pass | pass | pass |
| AU1 21 /live setup | `/live` | pass | pass | pass |
| AU1 22 /join | `/join` | pass | pass | pass |
| AU2 Which member (BTS) | `/which-bts-member-are-you` | pass | pass | pass |
| AU2 Which member (aespa) | `/which-aespa-member-are-you` | pass | pass | pass |
| AU2 KPDH quiz | `/kpop-demon-hunters-quiz` | pass | pass | pass |
| AU2 Name them all (BTS) | `/bts-name-all-members` | pass | pass | pass |
| AU2 Name them all (TWICE) | `/twice-name-all-members` | pass | pass | pass |
| AU2 This or that quiz page | `/q/newjeans-discography-deep-dive-quiz` | FAIL 1440,390 | pass | pass |
| AU3 1 Ways to play | `/stray-kids-quiz` | pass | pass | pass |
| AU3 1-2 Ways to play, Fans picked | `/bts-quiz` | pass | pass | pass |
| AU3 3 Empty hub | `/riize-quiz` | pass | pass | pass |
| AU3 3 Empty hub (long name) | `/zerobaseone-quiz` | pass | pass | pass |
| AU3 4,25 Thin hub | `/katseye-quiz` | pass | pass | pass |
| AU3 5 New group hub | `/rescene-quiz` | pass | pass | pass |
| AU3 5 New group hub | `/nct-wish-quiz` | pass | pass | pass |
| AU3 5-6 New group hub, Play live | `/kickflip-quiz` | pass | pass | pass |
| AU3 5 New group hub | `/hearts2hearts-quiz` | pass | pass | pass |
| AU3 10 Creators | `/creators` | pass | pass | pass |
| AU3 11-14 Leaderboard | `/leaderboard` | pass | pass | pass |
| AU3 15 Editorial by line | `/q/aespa-members-and-concepts` | FAIL 1440,390 | pass | pass |
| AU3 17 Editorial profile | `/u/soojinnie` | pass | pass | pass |
| AU3 18 Search | `/search?q=soojinnie` | pass | pass | pass |
| AU3 19,21 Community | `/community` | pass | pass | pass |
| AU3 22 admin gate | `/admin/editorial` | pass | pass | pass |
| AU3 23 admin gate | `/admin/blind-tests/runs` | pass | pass | pass |
| AU3 21 blindtest leaderboard | `/blindtest/leaderboard` | pass | pass | pass |
| AU3 21 /new | `/new` | pass | pass | pass |
| Blindtest run, All K-pop (hub Start) | `/blindtest` | pass | pass | pass |
| Blindtest run, KPop Demon Hunters | `/blindtest/kpop-demon-hunters` | pass | pass | pass |
| Blindtest run, hits 2026 | `/blindtest/kpop-hits-2026` | pass | pass | pass |
| Which member quiz to the result | `/which-bts-member-are-you` | pass | pass | pass |
| KPDH girl group quiz to the result | `/kpop-demon-hunters-quiz` | FAIL 390 | pass | pass |
| Name them all round to the result | `/bts-name-all-members` | pass | pass | pass |
| This or that card on a quiz result (no vote) | `/q/newjeans-discography-deep-dive-quiz` | FAIL 1440,390 | pass | pass |
| Home owner items: first paint, rail crop, rabbit logo, New thumbs 56px | `/` | pass | pass | pass |

## Failures (one line each: URL, engine, width, what, evidence)
- F2 `/kpop-demon-hunters-quiz` result, Firefox, 390: the 92px group photo box paints its alt text ("BLA" in pink)
  while `/idols/BLACKPINK.jpg` downloads. Evidence: `browsers/firefox-390-flow-kpdh-quiz-result.png`.
  Reproduced on demand with the photo delayed 2.5 s: `browsers/firefox-1440-kpdh-photo-t0-slow.png` ("BLAC"),
  `firefox-390-kpdh-photo-t0-slow.png`; WebKit with the same delay paints an empty box
  (`webkit-390-kpdh-photo-t0-slow.png`), Chromium paints nothing. Cause: `components/ux-v1/result-card.tsx` L49, a
  plain `<img src alt>` in `.ux-rescard-ph` without the F7a `CoverImg` treatment (transparent alt while loading).
  Owner: A1 / G5. Medium (the F7a class of bug,
  visible to Firefox users on a slow photo).
- F1 `/q/newjeans-discography-deep-dive-quiz` (page and played to the results), Firefox, 1440 and 390: uncaught
  `Error: Acquiring an exclusive Navigator LockManager lock "lock:sb-...-auth-token" immediately failed`.
  Nothing visible: the page, the play and the This or that card work. Evidence: `browsers/firefox-1440-q-newjeans.png`,
  `firefox-1440-flow-tot-newjeans-card.png`.
- F1 `/q/aespa-members-and-concepts`, Firefox, 1440 and 390: the same page error. Evidence:
  `browsers/firefox-1440-q-soojinnie.png`.
- F1 is not a v12 regression: the same error shows in Firefox on the live site (flag off),
  `https://kpopquiz.org/q/aespa-members-and-concepts` (GET only, writes stubbed), and not on hub pages. It comes from
  the Supabase browser client's auth lock (`@supabase/ssr` `createBrowserClient`, `lib/supabase/client.ts`) on the
  quiz page. Low, owner: v11 quiz page (record only).

## Notes (not failures)
- Firefox 1440: 2 of 10 reveal covers on the All K-pop run and 2 of 10 on the hits 2026 run were still downloading
  1.5 s after the answer (Deezer 500px). The F7a `CoverImg` held: gradient, no alt text painted; every cover loaded on
  the results. Chromium and WebKit: 10 of 10 at every reveal.
- KPop Demon Hunters runs (all engines, both widths): every reveal and results row is the typographic placeholder,
  no film art (AU1 I1 now holds in the game).
- WebKit, first attempts only: `/` at 1440 timed out on load (60 s) and the Which member Start click timed out
  (30 s) while three engines ran at once; both retried alone and passed. Not reproduced.
- Home first paint: no image or CSS background covered more than half the viewport in any of the 12 probes per run
  (first probe 94 to 1029 ms after commit), first-contentful-paint Chromium 324 / 1716 ms, WebKit 1095 / 1070 ms,
  Firefox 2052 / 2696 ms (390 / 1440, machine under load); first frames are a blank ground, then the full page
  (`*-home-firstpaint-*.png`). Rabbit: mascot file, 28x28, loaded, no K tile, all engines. Rail: 14 photos, each
  80x80 in its 80x80 circle, cover, 50% 25%; off-screen ones lazy (not loaded until scrolled, by design). New
  quizzes: 6 thumbs, 56x56, icon present, picture loaded, all engines.
- AU3-002 (ZEROBASEONE sideways at 390) did not reproduce in any engine: scrollWidth 390.
- `/leaderboard` (14) and `/new` (8 or 9) keep lazy pictures not yet loaded at the probe in all engines; the URLs
  answer 200 (e.g. `/_next/image?url=/idols/Aespa.jpg&w=1200` 200, 64 KB). Not broken.
- The quiz result header showed "#39 of 38 players": an artefact of the stubbed play POST (our play is not stored).
- No mutating request reached production: the stub logs of every page and action are empty (no POST attempted on
  pages) or hold only the stubbed result and play POSTs; generate was the only POST let through.

## Not verified
- Dark scheme, signed-in states, audio (clips were a silent local file), the `/live` and `/join` room flow (pages
  load only: no room opened), and Name them all / Which member on the other groups (one group each per engine).
- Real devices (Playwright engines only; WebKit is not Safari iOS) and any stale-cache scenario (F7a item 1).
