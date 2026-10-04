# AU1 audit: blindtest and live (2026-10-04)

Target: ORCH's flag-on production build on http://localhost:3071 (`NEXT_PUBLIC_UX_V1=1`, `NEXT_PUBLIC_UX_V12=1`,
tracking off), real production data with bundles A, B, C applied. Browser: Playwright chromium headless shell 1234,
light scheme, 1440x900 and 390x844. Every mutating request was answered locally (guardWrites rule) except the
read-only `POST /api/blind-test/generate` (checked: the route only reads `songs` and Deezer) and the one allowed live
room (`/api/live/**`). Screenshots: `run/audit/AU1/` (local only, `d-` = 1440, `m-` = 390). Scripts and raw JSON:
the AU1 scratchpad (au1-pages, au1-run, au1-live, au1-covers, au1-livedb, au1-counts).

Counts: 22 features ok, 3 rows with an issue (rows 15 and 16: I1; row 20: I2), 3 not checked (N1 to N3). Plus
2 low notes (L1, L2) and the normalisations at the end.

## Feature table

| # | Feature | URL(s) | Visible | Works | How checked | Screenshot | Issue |
|---|---|---|---|---|---|---|---|
| 1 | Hub hero + Start (All K-pop, 5/10/15) | /blindtest | yes | yes | served HTML, browser render both widths | d-blindtest, m-blindtest | - |
| 2 | Hub Playlists rail (6 themed cards, real counts: 345, 60, 1,141; "Curated", "Updated every week") | /blindtest | yes | yes | counts re-read with service-role SQL: 5th gen 345, hits-2025 60 (top 60 by rank), 4th gen curated 1,141 | d-blindtest | - |
| 3 | Hub live band ("Play live with friends", Host / Join) | /blindtest | yes | yes | `data-ux="liveband"`, links to /live and /join; `GET /api/live` answers `{"ok":true}` | d-blindtest | - |
| 4 | Hub language row + "Play in your language" | /blindtest | yes | yes | `data-ux="langrow"`, the 4 landing hrefs | d-blindtest | - |
| 5 | Play by group index (83 groups, search, Show all) | /blindtest | yes | yes | 83 `group-*` links incl. RESCENE, NCT WISH, KickFlip, Hearts2Hearts (each mode page 200); 6 idol photos load | d-blindtest | - |
| 6 | Hub "fans playing today" and Today's board | /blindtest | yes | yes | "2 fans playing today" matches the board (2 played) | d-blindtest | - |
| 7 | Landing en | /guess-the-kpop-song | yes | yes | H1, robots index, rail, steps, FAQ; 0 broken image | d-/m-guess-the-kpop-song | - |
| 8 | Landing fr (+ full run) | /fr/blind-test-kpop | yes | yes | "4 281 chansons, 83 playlists" = 4,281 active songs (SQL); full 10-song run, French strings | d-fr_blind-test-kpop, d-run-fr-* | L2 |
| 9 | Landing es | /es/adivina-la-cancion-kpop | yes | yes | render both widths, 0 broken image | d-/m-es_* | - |
| 10 | Landing id | /id/tebak-lagu-kpop | yes | yes | render both widths, 0 broken image | d-/m-id_* | - |
| 11 | Theme kpop-hits-2026 (+ full run) | /blindtest/kpop-hits-2026 | yes | yes | 200, 60 songs, track list, full run on real generate (10 songs, all 2026) | d-/m-blindtest_kpop-hits-2026, d-run-hits26-* | - |
| 12 | Theme kpop-hits-2025 | /blindtest/kpop-hits-2025 | yes | yes | 200, track list, more playlists | d-/m-blindtest_kpop-hits-2025 | - |
| 13 | Theme 5th-gen | /blindtest/5th-gen | yes | yes | 200, 345 songs | d-/m-blindtest_5th-gen | - |
| 14 | Theme tiktok-viral (+ full run at 390) | /blindtest/tiktok-viral | yes | yes | 26 curated songs; full run | d-/m-blindtest_tiktok-viral, m-run-viral-* | - |
| 15 | Theme KPop Demon Hunters (+ full runs 1440 and 390) | /blindtest/kpop-demon-hunters | yes | yes | 12 songs (2 TWICE active + 10 `soundtrack`), bridge card, title-only questions | d-/m-blindtest_kpop-demon-hunters, d-/m-run-kpdh-* | I1 |
| 16 | Album covers in the game reveal and results | runs 11, 14, 15, 8, 23 | yes | yes | 7 runs x 10 reveals: 69 of 70 reveal images loaded within 0.9 s (the 70th answered 200 and appears loaded on results), 0 placeholder; 70 result rows all loaded; every cover URL of every generate answer answered 200 | *-reveal1, *-results | I1 (KPDH art) |
| 17 | Stored cover URLs of every themed and decision 33 pool | DB | n/a | yes | 2,500 unique Deezer URLs (`cdn-images.dzcdn.net`) GET 200 `image/*`, 0 failure; 0 song without medium or big cover in hits-2026, hits-2025, tiktok, KPDH, 5th gen, recent-hits, legends, 4th-gen gg/bg, title tracks | - | - |
| 18 | Covers on hub, theme pages, track lists | /blindtest, theme pages | yes | yes | typographic covers by design (prototype `btpl` track rows have no image either); nothing placeholder-shaped where a Deezer cover is expected | d-blindtest, theme pages | - |
| 19 | Decision 33: recent-hits, 4th-gen-gg, 4th-gen-bg play as named | /blindtest/recent-hits, /4th-gen-gg, /4th-gen-bg | yes | yes | "Play 10 songs from 2024-2026 hits / 4th gen girl groups / 4th gen boy groups" | d-blindtest_recent-hits etc. | - |
| 20 | Decision 33: kpop-legends, title-tracks play as named | /blindtest/kpop-legends, /title-tracks | yes | no | pages say "from All K-pop" and "from Hits"; runs played a 2024 RESCENE song and non-title tracks | d-run-legends-*, d-run-titletracks-* | I2 |
| 21 | /live setup, open room, QR, lobby | /live | yes | yes | real room opened, QR + code, 2 players listed | d-live-setup, d-live-lobby | - |
| 22 | /join form and phone flow | /join, /join/Z88WXE | yes | yes | nickname, colour, Join; lobby "You are in!"; 4 shape buttons; "Locked in · 2.5 s"; reveal; rank | m-join-* | - |
| 23 | Live rounds, reveal counts, leaderboard, podium | /live | yes | yes | 5 rounds, answers counted per option, scores (phone 920), podium 1 and 2, phone shows "#1 of 2" | d-live-round, -reveal, -board, -podium | - |
| 24 | Close the room | /live, /join | yes | yes | host back to setup, phone "Room closed"; row status `closed`, players and answers removed | d-live-closed, m-join-closed | - |
| 25 | /live and /join robots | /live, /join | n/a | yes | `noindex, nofollow` | - | - |
| 26 | Same-nickname, reload, rejoin, late answer, expiry | /live | - | - | not driven: one room only (N1) | - | N1 |

## Issues

### I1 (high, rule 10): the KPop Demon Hunters film art shows as the album cover
- Expected: KPop Demon Hunters is text and audio only (COMMON rule 10, SYSTEM.md 4: "no poster, no stills, no
  character art, no logo"). The theme page respects it (typographic cover).
- Actual: every one of the 12 KPDH songs is on the Deezer album "KPop Demon Hunters (Soundtrack from the Netflix
  Film)", whose cover is the film key art (the three HUNTR/X characters) with the Netflix logo. It shows at 140 px
  in the game reveal, at 48 px on every row of the results "Your songs", and is the share card image
  (`questions[0].reveal.cover`). The two TWICE songs (Strategy, TAKEDOWN) are `active`, so the same art also shows
  in All K-pop, girl groups and TWICE runs (the live screens show no cover).
- Evidence: `m-run-kpdh-reveal1.png`, `m-run-kpdh-results.png`, `d-run-kpdh-*`; the cover URLs answer 200.
- Suspected cause: generate returns `album_cover_medium` / `album_cover_big` (and re-fetches them from Deezer,
  `app/api/blind-test/generate/route.ts` L295 to L303) for every song; nothing drops them for the KPDH ids.
  Rendered by `components/blindtest/ux-v1/game.tsx` L126 to L128 and `results.tsx` L149 to L151, L171.
- Suspected owner: G2 (generate, `lib/blind-test-curated.ts` KPDH list) with G3 (game). Possible fix: generate
  sends `cover: null` for songs whose deezer id is in `KPDH_DEEZER_IDS` (the game already has a typographic
  placeholder, `span.p6-cv`). Owner decision for the two TWICE songs outside the KPDH playlist.
  Note for the owner: the AU1 brief asks for "no placeholder where a cover exists"; for these 12 songs rule 10
  wins, so the placeholder is the expected result.

### I2 (medium): kpop-legends and title-tracks still do not play as named
- Expected (decision 33, G2 R6, `lib/ux-v1/p6/modes.ts` L67 to L72): once `v12-g2-05-years-backfill.sql` and
  `v12-g2-06-title-tracks.sql` are applied, kpop-legends plays its own pool (year 2017 or earlier) and title-tracks
  plays the title tracks. Both files are applied (bundle B): 493 curated active songs have a year up to 2017 and
  41 curated active songs have `is_title_track = true`, each with covers and previews.
- Actual: `/blindtest/kpop-legends` says "Play 10 songs from All K-pop" and its run asked generate for
  `playlist: "all"` (it served RESCENE Deja Vu 2024, RIIZE, QWER...). `/blindtest/title-tracks` says "from Hits"
  and asks for `playlist: "hits"` (served b-sides such as Gray "Dally").
- Evidence: `d-blindtest_kpop-legends.png`, `d-blindtest_title-tracks.png`, `d-run-legends-results.png`,
  `d-run-titletracks-results.png`, the generate bodies in au1-run.json.
- Cause: the one-line switch was never made: `modes.ts` L50 (`'title-tracks': { playlist: 'hits' ... }`) and
  L54 (`'kpop-legends': { playlist: 'all' ... }`); `V12_EXACT` (L74) lacks both ids. Owner: G2 (request R6).
  Check before switching: generate's legacy `title-tracks` case (`generate/route.ts` L250) under
  `SONGS_IS_CURATED=true` (41 rows today, enough for 10).


### L1 (low, v11 code, not v12): `/api/ranked/me` answers 503 on `/blindtest` signed out
`{"ranked":"not_live","reason":"no_season"}` with status 503 logs a console error on every hub load. The route and
its caller (`components/blindtest/ux-v1/islands.tsx` L84) are unchanged from origin/main. Owner: none in v12
(record only).

### L2 (low, owner decision 10 pending): French results title keeps the English playlist label
The fr landing run ends on "2/10 au blind test All K-pop": the label "All K-pop" of the pick is not localized
(`ALL_PICK.label` in `lib/ux-v1/p6/playlists.ts`, passed as the run title). Falls under decision 10 (fr, es, id game
strings reviewed before the flag goes on). Owner: G3.

## Not checked
- N1: live edge cases (same nickname twice, host reload mid-game, phone drop and rejoin, late answer rejected,
  expiry, Remove a player, Play again, "Save my score" sign-in). Only one room was allowed; doing them would have
  meant more answer, join or settings writes than the plain run. Covered by G4's unit tests only.
- N2: audio. Headless Chromium was launched with autoplay allowed but nobody listened; the clip is the Deezer
  preview re-fetched by generate, every generate answer carried a `preview_url`, 0 pool song lacks one.
- N3: dark mode, a real phone scanning the QR (the code reads `localhost:3071/join` here because the join URL
  follows the page origin; on production it is the site origin), and the `/blindtest/<group>` runs of the four
  new groups (their pages answer 200 and list them; not played).

## Test writes (production, owner allowance 2026-10-04)
One live room, played through the real pages (host `/live` at 1440 with its framed phone "AU1 Host", one phone
`/join/Z88WXE` at 390 "AU1 Phone"), 5 rounds on All K-pop, then "Close the room". Read with service-role SQL
after the close:
- `live_rooms`: 1 row, id `840c04f8-f869-4b16-9a79-3f19d50a07f9`, code `Z88WXE`, `is_test = true`,
  status `closed`, created 2026-10-04 15:49:31 UTC, closed 15:50:26 UTC, `players_peak = 2`, `rounds_played = 5`.
  Before the test the table held 0 rows; after, 1.
- `live_players`, `live_answers`: 0 rows for that room and 0 in total after the close (the close removes them,
  G4 decision 17: a closed room keeps one row without personal data). During the game: 2 joins and 10 answers.
- Requests that reached production: 1 `POST /api/live/rooms`, 2 `join`, 10 `answer`, 17 `host` actions (start, reveal,
  board, end, close). Nothing else was written: 0 other mutating request in every AU1 session (the guard log of
  each script is empty), tracking is off on this build.
- Undo: `delete from live_rooms where id = '840c04f8-f869-4b16-9a79-3f19d50a07f9';`

## Normalisations
- `SyntaxError: Unexpected token '<'` on every page: `/_vercel/insights/script.js` is not served by a local
  `next start`, the middleware 301s it to `/`, the browser parses the HTML as a script. Vercel-only asset, not a
  defect of the code.
- `/blindtest` never reaches network idle (live counters); aborted `?_rsc=` prefetches of nav links are normal.
- At 390 the themed card covers clip long names ("Hunters", "hits 2025"): the prototype reference
  `m-bthub-playlists.png` clips the same way (3-column `.thrail`), so it is the designed state.
- The theme page track list shows 10 of N songs (`THEME_TRACKS_SHOWN`), as the prototype.
- One reveal image of the title-tracks run was not decoded 0.9 s after the answer (machine load about 70); its
  URL answered 200 and the same cover loaded on the results.
