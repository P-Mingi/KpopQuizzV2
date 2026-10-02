# V12 run state

Owner of this file: ORCH. Updated and committed after every event (V12 prompt 4b, v11 worker prompt 4b).

- Prototype: `docs/design/growth-v12/prototype.html`, `window.UX_VERSION` = `v12.2 growth (2026-09-29)` (checked 2026-10-02).
- Integration branch: `feat/v12`, cut from `origin/main` at `a94d77c` (R1 done: PR #66 merged 2026-10-01, `docs/release/R1-STATE.md` says DONE). First commit `5e4548f` "docs(v12): growth package".
- Phase: **2 (2026-10-02)**. Phase 1 done: A1, G1, G2 merged. G7, G9, G3 merged. G4, G5, G6 and the G1 follow-up running (4 builders at once).

## Agents

| Id | Branch | Status | Last sha | Open issues | Report |
|---|---|---|---|---|---|
| A1 | v12/a1-foundation | merged (20ee928) + styles route patch (1cb0d17) | 4d5600a | 0 | run/reports/A1.md |
| G1 | v12/g1-tracking | merged (8d11ad0) | 1ce5143 | 0 | run/reports/G1.md |
| G1b | v12/g1-followup | running (ranked tracking, `bt_fans_today()` SQL, G3 and G9 requests; brief `run/briefs/G1-followup.md`) | - | 0 | run/reports/G1.md |
| G2 | v12/g2-catalogue | merged (42cadd0) | 0a9605d | 0 | run/reports/G2.md |
| G3 | v12/g3-acquisition | merged (c3ebb6d) | 91217f7 | 0 | run/reports/G3.md |
| G4 | v12/g4-live | running | - | 0 | run/reports/G4.md |
| G5 | v12/g5-personality | running | - | 0 | run/reports/G5.md |
| G6 | v12/g6-name-all | running | - | 0 | run/reports/G6.md |
| G7 | v12/g7-this-or-that | merged (ae82106) | e132692 | 0 | run/reports/G7.md |
| G8 | v12/g8-hub-creators | queued (Phase 2, last: needs G5, G6, G7 merged) | - | 0 | run/reports/G8.md |
| G9 | v12/g9-editorial | merged (ab95d9d) | 4a3f2bb | 0 | run/reports/G9.md |
| C1 | v12/c1-check | queued (Phase 3) | - | - | run/checks/pixel/ |
| C2 | v12/c2-check | queued (Phase 3) | - | - | run/checks/backend/ |
| C3 | v12/c3-check | queued (Phase 3) | - | - | run/REPORT.md |

## Run environment (every brief repeats it through run/briefs/COMMON.md)

- Main checkout `/Users/louis/IT/Dev/projects/KpopQuizzV2` is on `feat/v12`. Agent worktrees come from the Agent tool
  (`isolation: worktree`), bare: symlink `node_modules`, `apps/quiz/node_modules`, `apps/quiz/.env.local` from the main
  checkout, never stage them, remove them at the end.
- Branches are local: agents never push; ORCH pushes `feat/v12` only (`vercel.json` already disables deployments for
  `v12/*`).
- Guard: `scripts/v12-owner-guard.mjs` + `scripts/v12-hooks/` (ORCH's), installed per worktree with
  `sh scripts/v12-hooks/install.sh <ID>` (`git config --worktree core.hooksPath` and `v12.agent`). No-op when
  `v12.agent` is unset. ORCH checks every branch before a merge with `--agent <ID> --range feat/v12..<branch>`.
- Ports: A1 3060, G1 3061, G2 3062, G3 3063, G4 3064, G5 3065, G6 3066, G7 3067, G8 3068, G9 3069, integration and
  checkers 3071.
- One `next build` at a time across the run, by ORCH only, none while CI or Vercel builds; a build that fails on a
  Supabase timeout is retried once (v11 decision 38).
- Playwright: `UX11_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`,
  `PW_CHROMIUM=$UX11_CHROMIUM` for the capture scripts. (Build 1243 is also in the cache now.)
- References: `run/checks/reference/` (40 v12 states x 1440/390 x light/dark: `d-`, `dk-`, `m-`, `mk-` prefixes, plus
  `styles.json`) and `run/checks/reference/v11/` (the 38 v11 states captured on the v12 prototype with
  `run/checks/capture-prototype-v11.mjs`). PNGs are local only (`.git/info/exclude`), `styles.json` committed.
- Signed-in env is in `apps/quiz/.env.local` (test user id and email, Supabase URL, anon, service role). The test
  account's address was rotated by the owner's order on 2026-10-02; it is never written in a tracked file or a report.
  `VERCEL_AUTOMATION_BYPASS_SECRET` is not set: Phase 3 checks run on local production builds.
- SQL: the Supabase connector of this session only sees another project (never to be touched). For
  `rdkgouofytwfdpbxbzio` the owner pastes each approved file in the SQL editor and answers "applied <filename>";
  ORCH then runs the file's verification queries read-only.
- Repo hook `.claude/hooks/guard.py` blocks any shell command that names the Supabase migrations folder, pushes, and
  edits of gate scripts: read those SQL files with the Read tool.

## Pending SQL (written, never applied without the owner's `go <filename>`)

- `docs/pending-migrations/v12-g1-bt-runs.sql` (G1): `bt_runs`, `bt_song_stats`, `bt_bump_song_plays`. Needed before `NEXT_PUBLIC_BT_TRACKING=1`; the route fails soft until then.
- `docs/pending-migrations/v12-g1-quiz-score-stats.sql` (G1): view `quiz_score_stats`. Independent, no reader yet.
- G2, reports in `docs/growth/catalogue/`. Order: 01, 02, 03, then 06; 04, 05, 07, 08 independent. After apply: group playlists 79 to 83, songs 4,120 to 4,296.
  - `v12-g2-01-groups.sql`: 2 group inserts (RESCENE, NCT WISH).
  - `v12-g2-02-songs-new-groups.sql`: 20 song inserts (KickFlip 10, RESCENE 10) + 2 link updates (22 NCT WISH and 14 Hearts2Hearts songs already in the table).
  - `v12-g2-03-releases-2026.sql`: 146 song inserts (58 groups). Contains 3 OST tracks, 1 Japanese EP track, 1 title with a swear word (owner look).
  - `v12-g2-04-years-fix.sql`: 98 year updates (95 corrected, 3 removed).
  - `v12-g2-05-years-backfill.sql`: 3,076 year updates. Changes the Year line of song pages with the flags off: owner decision.
  - `v12-g2-06-title-tracks.sql`: 41 updates, one verified source each.
  - `v12-g2-07-kpdh.sql`: the status check gains `soundtrack` + 10 inserts; the two TWICE songs are listed by id, untouched. Reader proof (`docs/growth/catalogue/proofs/songs-readers.md`): 17 readers, same on origin/main and feat/v12, none can show a `soundtrack` row, so it need not wait for the merge.
  - `v12-g2-08-language.sql`: 156 updates `ko` to `korean` (proposal; one reader, the song page; visible with the flags off).
- G7 (replayed twice by G7 on a scratch local Postgres 14, 29/29 checks; production is 17):
  - `v12-g7-this-or-that.sql`: `duel_vote_guard`, `duel_cast_song_vote()` (service role only), `duel_song_rankings`, one index on `duel_votes`. 0 rows; no column or row change on the existing duel tables.
  - `v12-g7-song-questions.sql`: data, +77 `duel_questions`, +1,201 `duel_ratings` (counted 2026-10-02, will shift with G2's catalogue). Without it only aespa, BLACKPINK and BTS get the card.
- G9 (never executed anywhere):
  - `v12-g9-editorial.sql`: `editorial_accounts`, `editorial_drafts`, `editorial_posts`, `is_editorial(uuid)`; widens two community CHECK constraints for the target type 'editorial'.
  - `v12-g9-editorial-accounts.sql`: raises an exception until the owner replaces the placeholders with 3 to 5 real user ids.

## Crons added to vercel.json by ORCH (each answers 404 unless `isUxV12()`)

- `/api/cron/editorial-publish` at `*/15 * * * *` (G9). Asks for the cron secret. With the flag off in production it is called 96 times a day and answers 404 each time: the owner may prefer to add this line only when the flag goes on.
- `/api/cron/fans-picked` at `40 3 * * *` (G7). Asks for the cron secret; answers `ok:false not_applied` until its SQL exists.

## Asked to the owner (once, not blocking)

1. Editorial accounts (SYSTEM.md 5.6, G9): 3 to 5 accounts created by the owner, then their user ids, names and beats.
2. Lighthouse: OK to use it for C3's performance checks (it would be a new dev dependency or an `npx` download)?
   Without the OK, C3 measures LCP and CLS with Playwright as in v11.

## Owner decisions needed

1. G1, SEO field with the flags off: the meta, og and twitter description of clue quiz pages quotes the average, so "scoring 123% on average" becomes "41%". Shipped: the corrected number (the prompt lists recomputed guess-from-clues figures as an allowed difference). Alternative: drop that sentence for clue quizzes.
2. G1: clue quiz percentages are now points over max, low by design (26 to 80%), so chips turn from green to red. Shipped: clue quizzes are left out of the `/stats` rankings ("Ranked from 253" instead of 256). Alternative: hide their average everywhere.
3. G1: `kickflip-mega-quiz` (not a clue quiz) goes from "avg 101%" to 100%: its stored `question_count` is stale and the helper caps at 100. The stale count itself is data, not fixed in this run.
4. G1: the go for `v12-g1-bt-runs.sql`, then for the tracking proof (`run/reports/G1/tracking-proof.mjs`, prepared, refuses to run without the go).
5. A1: the Team avatar is the neutral initial with a pink ring, as the prototype paints it and `styles.json` records, not the pink-soft fill its CSS line names. `.langsw` at 390 is 336.8px wide instead of the prototype's 360.8px, because the prototype's switch overflows the phone column by 11px (tighter language pills on phones).
6. ORCH, route gate: `scripts/check-route-allowlist.mts` is a gate script (never edited: ratchet law, hook-blocked) and it only skips pages under the exported `UX_V1_ROUTES`. To keep it untouched, `UX_V1_ROUTES` now lists every flag-only prefix (v11 and v12) and `isKnownRoute()` opens the v12 ones only with both flags (tested in `middleware-matcher.test.ts`, 4 flag states). The gate's skip label still says "UX v1 route" for v12 pages. Alternative, owner's hand only: make the gate import `UX_V12_ROUTES` and print its own label.
7. G2: `groups.generation` for RESCENE and NCT WISH (left NULL: not confirmed by two sources, like country and website); rename the fan-created group "Hearts2hearts"; MeloMance and Jokers as `soundtrack`; a full title-track backfill or a 301 for the 5 modes that cannot play as named (intro-challenge, verse-only, bridge-or-break, speed-round: no clip point or length in the data; b-sides: the false flag is not maintained).
8. G7: which groups get the This or that card (77 seeded by the data file, 3 without it); thresholds (a group is ranked from 100 counted votes, or the question's `min_votes` if higher; a song from 5 comparisons; a split is shown from 5 votes on the pair; 200 votes a day per voter); the vote token signing key is derived (HMAC, fixed label) from the service role key unless the optional env `DUEL_SIGNING_SECRET` is set; the year is hidden on most songs (156 of 4,120 have one today, G2's file 05 fills 3,076); new votes no longer update the old `duel_ratings` Elo.
9. G9: the Verse option is recorded, not taken: editorial threads and blogs live in their own `editorial_posts` table. "Never two in a row from one account" is strict: a lone account's due drafts wait. A retired account keeps the badge only on its editorial posts. Follow is kept on team posts. With the flag off its three new API routes answer a JSON 404 where the base answers the HTML 404 page (same status).
10. G3: the fr, es and id GAME strings (question label, buttons, results, share text) are G3's own wording: they are not in the prototype and no native speaker reviewed them (the landing copy is the prototype's, verbatim). Review them before the flag goes on, or keep the game in English on those landings. Also: the "Updated every week" cover line; no per-song play button on theme pages (no fresh-clip endpoint); the hub eyebrow still reads the daily board, not `bt_runs`; with the flag on `/blindtest` gains 6 links and loses 2 (the two themed modes hidden until G2's SQL).
11. Existing v11 spec with v12 on: `e2e/ux-v1/p6.spec.ts` passes 78/78 with v11 only; with both flags on 6 cases fail on two v11 assertions that v12 changes on purpose (18 theme links, the recent-hits playlist). The spec is not edited (ratchet law). Checkers run the v11 specs with `NEXT_PUBLIC_UX_V12` unset and the v12 specs with both on. Owner call if he wants p6.spec itself updated for v12.

## Open requests (run/requests/G1.md), to route in Phase 2

- R1: ranked runs are NOT tracked: ranked uses its own hook `components/ranked/ux-v1/use-ranked-run.ts`, unowned. ORCH assigns it (to G1 in a follow-up).
- R2 challenge code and R3 sources: G3, G8, G4 pass them to `trackBtRun()`.
- R4: a Playwright project for `e2e/ux-v12` (A1, `playwright.config.ts`).
- R5: v11 `p6.spec.ts` must run with tracking off, or `/api/track/bt-run` is filtered from its write counts (G3 owns the blindtest specs' helpers through requests to A1).
- R6: admin nav link to `/admin/blind-tests/runs`.
- S1 to S7 inline averages and L1 to L9 `score/total` labels in other agents' files (G8 `lib/ux-v1/p3`, A1 kit, and the others listed there).
- G9 R2 and R5, files nobody owns (to assign in a follow-up, after G8): the Team badge and line on `passport.tsx`, `/u/[username]` and `/me` (the model already returns `isTeam`); exclusions of editorial accounts on the legacy boards, the home ticker and activity reads, XP and badge grants, about 25 fan action routes, fan counts, the legacy search API. R5g, R5h: G1's search page People rows and tracking, G3's daily board. R6: a splits reader from G7 for the weekly recap template.
- Trap for every spec: a blindtest played with `NEXT_PUBLIC_BT_TRACKING` on sends beacons at page teardown that can escape `guardWrites`; once the table exists they would write. Specs run with tracking off unless they test tracking.

## Log

- 2026-10-02 Phase 0: R1 check ok; `feat/v12` created from `origin/main` (`a94d77c`); growth package committed
  (`5e4548f`) and its line removed from `.git/info/exclude`; OWNERSHIP.json written from the template (every TODO
  filled from the tree: G1 score files, G7 `components/quiz/ux-v1/results.tsx`, G8 `components/create/ux-v1/done.tsx`,
  G9 community routes, passport band, notifications and search rows); guard and hooks written and self-tested;
  references captured; briefs COMMON, A1, G1, G2 written. No `feat/v12` existed on origin: fresh start, no resume.
- 2026-10-02 Phase 1 started: A1, G1, G2 spawned in Agent worktrees.
- 2026-10-02 v11 regression reference set captured (152 PNG, `reference/v11/styles.json` committed, ee0bfd2).
- 2026-10-02 G1 ready (1ce5143) and merged (8d11ad0): guard ok (41 files), no dash, whole-app tsc 0 and vitest green on the integration branch. G1 found why `blind_test_plays` went silent: the generate route changed shape on 2026-06-12 (36ee51f), the playlist player broke before its save call, the new hub game never saved; R1 then retired the endpoint (410). Incident: two tracking beacons escaped the stubs on the first spec run and reached the dev route; nothing was written (the table does not exist; `songs.play_count` still 0 by read-only SQL); spec hardened. Side finding: `/stray-kids-quiz` answers 500 in dev on the base too (image host missing in `next.config.ts`), 200 in production. NOT verified by G1: the tracking proof, the SQL as DDL, the route's write paths and the claim against a real table, the admin page with data, mobile width.
- 2026-10-02 A1 ready (4d5600a) and merged (20ee928): guard ok (72 files), no dash. Its request R1 done by ORCH (1cb0d17): `run/reports/A1/styles-route.patch` applied to `app/api/ux-v1/a0/styles/route.ts` (the route was in nobody's globs; `app/api/ux-v1/a0/**` now belongs to A1), so a v11-only build serves the same stylesheet bytes as before and `styles/ux-v12/*.css` is served only with the flag. Integration after both: whole-app tsc 0, vitest 1144/1144 (50 files). A1 landmarks: 19 rows x 4 variants, 0 mismatch; a1.spec 32 pass / 4 skipped both on; axe 0 serious or critical. Known and not from A1: `shell.spec.ts:642` (legacy toast in create mode, 1440) fails on a dev server on the untouched base too. Shared files A1 changed: `playwright.config.ts` (ux-1440 and ux-390 also run `e2e/ux-v12/*.spec.ts`, which answers G1's request R4) and `flag-off-diff.mjs` (new optional `--dev`, additive). NOT verified by A1: anything on a production build, the QR tile of the story PNG (no QR generator in the repo, no dependency added), the square story over a photo, lint.
- 2026-10-02 ORCH: `UX_V12_ROUTES` and the two suffix rules added to `lib/route-allowlist.ts` (46bb8a0), 124 matcher tests green, `check:routes` green in the three flag states, tsc 0. Phase 2 briefs G3 to G9 written (c38668a). G4, G9, G7 spawned.
- 2026-10-02 G2 ready (0a9605d) and merged (42cadd0): guard ok (66 files); integration tsc 0, vitest 1179/1179 (51 files). 8 SQL files, none applied; replayed twice by G2 on a scratch local Postgres (idempotent). Themed modes visible today with the flag: 5th-gen (284), kpop-hits-2025 (51), tiktok-viral (26, sources verified); hidden until SQL: kpop-hits-2026 (0), kpop-demon-hunters (2, 12 after file 07). Decision 33: recent-hits, 4th-gen-gg, 4th-gen-bg play as named now; kpop-legends (needs 05) and title-tracks (needs 02, 03, 06) after their go plus a one-line switch in `p6/modes.ts` (G2 request R6). ORCH replaced one literal dash pair in a regex of `scripts/v12/catalogue/verify-source.mts` by its unicode escapes (same behaviour). G2's R1 (hidden themed modes still get pages) and R2, R4 went into G3's brief. NOT verified by G2: the SQL on the live table, flag-on play of hits-2026 and KPDH on real data; 894 songs keep no year; 127 of the new 2026 songs have no title-track source. G2 request R5 (`.gitignore` lacks `!docs/growth/`, reports added with `git add -f`): unowned file, left for the owner.
- 2026-10-02 G3 spawned.
- 2026-10-02 G7 ready (e132692) and merged (ae82106): guard ok (40 files), no dash. ORCH added its cron line to `vercel.json` and its API notes to G8's brief. Integration: tsc 0, vitest 1224/1224 (52 files, the cron config test included), `check:routes` 0. G7: 24 landmark rows 0 mismatch, g7.spec 26 pass / 4 skipped flags on, flag-off 14 documents 0 differences, its 4 routes 404 with the flag off. Incident reported by G7: its first "applied" probe passed on missing tables and its dev route briefly issued real BTS pairs (reads only, no write), fixed in 582ac8e. NOT verified by G7: the SQL on production, a real vote end to end, the cron's writes, the editorial refusal against a real `editorial_accounts`.
- 2026-10-02 G5 spawned.
- 2026-10-02 G9 ready (4a3f2bb) and merged (ab95d9d): guard ok (73 files), no dash. ORCH added its cron line. Integration: tsc 0, vitest 1263/1263 (54 files), `check:routes` 0. G9: both states 0 mismatch in the four variants, g9.spec 14 pass / 2 skipped both on, flag-off identical. NOT verified by G9 (no editorial table and no account exist): the Supabase store, reads of editorial posts in the feed, replies and hearts on them, the cron publishing a real row; queue to published is proven in vitest with an in-memory store, not in a browser; `/admin/editorial` was never loaded (needs an admin session); the two reference states were measured by placing the real components' rendered HTML into the live pages; the SQL files and the C2 query were never executed and three column names in the C2 query come from a grep.
- 2026-10-02 G6 spawned.
- 2026-10-02 G3 ready (91217f7) and merged (c3ebb6d): guard ok (83 files), no dash. Integration: tsc 0, vitest 1294/1294 (56 files), `check:routes` 0. G3: g3.spec 58 pass / 10 skipped both on, 0 landmark mismatch, axe 0, each landing plays a full run with zero write; flag-off 13 of 13 pages identical; SEO fields equal on `/blindtest`, `/pt/blindtest`, 8 mode pages. G2's R1, R2, R4 and G1's R2 done. NOT verified by G3: `theme-hits26`, `theme-kpdh`, `theme-kpdh-tracks` on real data (404 until G2's SQL; proven on a mocked render), the "fans playing today" count (needs `bt_fans_today()`), tracking on, production build, signed-in states. Tip sent to G4, G5, G6: a `{flag ? x : null}` child next to a v11 client island changes React useId in the v11-only HTML.
- 2026-10-02 G1 follow-up spawned (`components/ranked/ux-v1/use-ranked-run.ts` added to the G1 globs).

NEXT ACTION: wait for G4, G5, G6, G1b. For each "ready": guard (`node scripts/v12-owner-guard.mjs --agent <ID> --range feat/v12..<branch>`), dash check on the diff, merge `--no-ff` one at a time, then whole-app tsc and vitest on `feat/v12`, do its ORCH requests (vercel.json crons, next.config.ts rewrites, flag on at build only), update this file. Then G8 last (needs G5, G6, G7 merged). A stopped agent whose branch has commits is resumed by its agent id, or respawned with its brief plus "continue from your branch and your Progress block". Route G1's open requests: R1 (ranked hook) to a G1 follow-up, R2/R3/R5 are in G3's and G4's briefs, S and L items to G8 and the other owners. After every G is merged: Phase 3 (one flag-on production build on :3071, then C1, C2, C3).
