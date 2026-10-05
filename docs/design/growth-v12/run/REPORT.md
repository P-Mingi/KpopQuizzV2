# V12 growth run: report

Written by ORCH from the agents' reports (`run/reports/<id>.md`), the checkers' evidence (`run/checks/**`) and
`run/RUN-STATE.md`. Every number below comes from a run recorded in those files; nothing here is estimated.

- Integration branch: `feat/v12`, cut from `origin/main` at `a94d77c` (R1 done). Not pushed by ORCH: the repo hook
  makes `git push` owner-gated.
- Design reference: `docs/design/growth-v12/prototype.html` (`v12.2 growth (2026-09-29)`).
- Everything ships behind `NEXT_PUBLIC_UX_V12` (default off), true only together with `NEXT_PUBLIC_UX_V1`.
  Tracking has its own switch `NEXT_PUBLIC_BT_TRACKING` (default off). The score helpers are always on.
- No SQL file of this run is applied. No production write was made by any agent or check (data guard unchanged;
  one anonymous play by a real visitor during a check is live traffic).

## 1. Verdict

| Gate | Result |
|---|---|
| Whole-app tsc | 0 errors |
| vitest | 1854 / 1854 (79 files) |
| `check:routes` (3 flag states) | green |
| C1 pixel, 78 states x 4 variants (flag on) | 240 pass, 0 fail, 72 NOT verified (pending SQL, each checked in its hidden or closed form) |
| C2 wiring, 67 rows + 2 write tests | 43 pass, 0 fail, 22 NOT verified until SQL, 2 not covered, 2 waiting for go; flag off 30 of 31 ok |
| C3 e2e v12 specs on the flag-on build | 239 pass, 60 skipped (explained), 0 fail, 0 flaky |
| C3 axe, keyboard, sheets | 96 / 96 runs 0 serious or critical; 15 pages walked; 6 / 6 sheets |
| C3 SEO on the new URLs | 47 / 47 |
| C3 performance (Playwright, no Lighthouse) | CLS at most 0.0029; LCP slow 4G 3016 to 3412 ms, same range as unchanged v11 pages |
| C3 production parity, both flags off, vs origin/main | see section 3 |
| v11 specs on the v11-only build | 877 pass, 48 fail, none from v12 code (section 4) |

Definition of done (V12 prompt section 8) NOT fully met, on purpose: the live load and chaos tests, the tracking
proof and every state that needs data wait for the owner's `go` on the SQL; two fix-loop items wait for owner
decisions (section 6).

## 2. Per agent

| Id | Scope | Status | Key proof | NOT verified (reason) |
|---|---|---|---|---|
| A1 | flag `isUxV12()`, Team badge, theme card, ways tile, steps, language switch, answer tiles, result card, story images, kit | DONE | 19 landmark rows x 4 variants 0 mismatch; v11-only stylesheet bytes unchanged | anything on a production build by A1 itself; story QR tile (QR encoder came later from G4) |
| G1 | `bt_runs` tracking, `/api/track/bt-run`, `trackBtRun()` in every flow incl. ranked, guest claim, `/admin/blind-tests/runs`, score helpers | DONE | 51 scoring + 78 tracking tests; flag-off diff only clue-quiz figures | tracking proof, SQL as DDL, admin page with data, ranked song ids (never sent to the browser) |
| G2 | catalogue SQL (8 files), ingestion dry run, generate filters, themed modes | DONE | files replayed twice on a scratch Postgres; reader proof for the `soundtrack` status | SQL on the live table; hits-2026 and KPDH play on real data |
| G3 | blindtest hub rail, live band, language row, 4 landings, themed pages, sitemap | DONE | g3.spec 58 pass; SEO equal on existing blindtest URLs; landings play with zero write | theme-hits26 and KPDH states on real data; "fans playing today" |
| G4 | live blindtest: `/live`, `/join`, 7 API routes, Realtime, scoring, QR encoder, expiry, load script | DONE (load test waits for go) | 38 landmark rows x 4 variants 0 mismatch; dry load 5 x 50 and 1 x 50 x 20, 0 failure | real database and Realtime, real latency and loss, iOS audio, a real phone scanning |
| G5 | Which member (15 groups), KPop Demon Hunters bridge quiz | DONE | landmarks equal; flag off 16 of 17 URLs identical, bridge quiz the same 404 as main | rewrite on Vercel; real insert; signed-in bias |
| G6 | Name them all (17 groups, 109 members) | DONE | every member list equals the active idols rows | real insert; community lines with data |
| G7 | This or that bonus, votes, anti-abuse, Bradley-Terry nightly ranking, Fans picked API | DONE | 24 landmark rows 0 mismatch; ranking tests on fixed vote sets | real vote end to end; cron writes |
| G8 | hub ways to play, Fans picked section, empty and thin hubs, share kit, `/creators` | DONE | creators boards recomputed exactly from SQL by C2 | Fans picked with data (no group ranked before G7's SQL); real share codes |
| G9 | editorial accounts, drafts, `/admin/editorial`, publisher cron, Team badge data | DONE (needs the owner's accounts) | publisher rules unit tested; queue to published with an in-memory store | everything against real editorial tables; `/admin/editorial` loaded |
| F1, F2, F3, F4 | cross requests, profile Team badge, editorial exclusions, fix loops | DONE (two items held, section 6) | each commit checked by the guard under its owner | live database checks; browser check of flag-off states for F3 |
| C1, C2, C3 | checkers | DONE | section 1 | REPORT.md and C2's summary were refused to subagents by the harness: written here by ORCH |

Details, evidence and screenshots: `run/reports/<id>.md` and `run/reports/<id>/`, `run/checks/pixel/SUMMARY.md`,
`run/checks/backend/ROWS.md` (summary at the top), `run/checks/qa/`.

## 3. Production parity, both flags off (V12 prompt section 6)

Builds: `feat/v12` and `origin/main` (a94d77c), both with `NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12`,
`NEXT_PUBLIC_BT_TRACKING` unset, built one after the other, served at the same time, compared with C3's script
(`run/checks/qa/parity/c3-parity.mjs` then `c3-parity-normalize.mjs`) on the 40 URLs of
`docs/release/snapshots/after-fixes.json`, the sitemap and robots.txt.

- Run 1 (C3, feat/v12 at afb83f4, `run1/PARITY.txt`): SEO fields of the 40 URLs identical except the `/stats` JSON-LD
  `dateModified` render time; sitemap 3008 entries on both, same URLs and hreflang alternates; robots.txt byte
  identical. Server HTML of 38 pages: 28 identical, 7 differ only by recomputed guess-from-clues figures (allowed:
  "avg 180%" becomes 60%, chips green to red, "Ranked from 257" becomes 254), `/news` only by relative times (live).
  One blocking difference (issue C3-002): `/blindtest` and `/pt/blindtest` loaded one extra async chunk, the
  tracking module (4.9 KB, inert with tracking off).
- Fix (F4 as G1, df7dcda and 581905a; ORCH 8a39901): the legacy blindtest games reach tracking only through a
  dynamic `import()` behind the inlined switch, and `next.config.ts` inlines `NEXT_PUBLIC_BT_TRACKING` as '' when
  unset, so the tracking module is no longer in any chunk of those pages.
- Run 2 (ORCH, feat/v12 at 8a39901, `run2/normalized.txt`): sitemap 3008 = 3008, robots.txt byte identical. The
  tracking module is gone. What remains on `/blindtest` and `/pt/blindtest`: one more `<script>` tag than main,
  because the bundler now splits the legacy game chunk in two (main: one 34,062-byte chunk; feat/v12: 9,624 + 25,928
  bytes, the extra 1,490 bytes being the no-op `useBtTracking` hook the legacy game now calls). Visible HTML, text,
  links and SEO fields are identical. This is the tracking-call exception of COMMON rule 5 and SYSTEM.md 1 ("flag-off
  pages unchanged apart from the tracking call"), but section 6 asks for identical server HTML: owner decision 23.
  The other run-2 differences are live data, because origin/main was built earlier than the rebuilt feat/v12: play
  counts, percentages and the order of top lists on `/leaderboard` and `/news` (allowed: live counters).
- Run 3 (ORCH, after the F5 fix pass, feat/v12 at a20c9f0 code, `run3/`): sitemap 3008 = 3008 (same URLs and
  alternates), robots.txt byte identical, 4 SEO fields differ: JSON-LD render times and live data on `/stats`,
  `/news`, `/stray-kids-quiz`, and 10 more quiz links on `/leaderboard`. Server HTML: recomputed clue quiz figures
  (allowed), live counters, the extra script of `/blindtest` and `/pt/blindtest` (accepted, no network request), and
  two pages left as other: `/news` (the external news feed and its images: live data) and `/leaderboard`, where the
  legacy community comments panel shows 8 rows on feat/v12 and 0 on main. That is a failed read on the main build,
  not a code difference: the same origin/main commit showed the same 8 rows in run 2, and with the flags off the
  feat/v12 query is byte for byte main's (`teamIdsToExclude()` is null). It is v11 decision 28 (legacy pages cache a
  failed read). A first attempt of run 3 compared the wrong server (port 3073 belonged to another session's dev
  server); it was discarded.

## 4. v11 specs on the v11-only build (C3, :3072)

877 pass, 20 skip, 48 fail, 2 flaky (passed on retry). Each failing spec and the code under it is identical to
`origin/main`: 28 legacy colour contrast (known since v11), 8 p5 expecting the 86% nav glass (the shipped v11 deviation
is 94%, decision 37 of v11), 6 p3 Notify me (production alerts are now on: data), 6 environment (six BTS hub photos
never answer on the cold local build). `e2e/ux-v1/p6.spec.ts` with v12 on: 6 cases fail on assertions v12 changes on
purpose; it passes 78/78 with v11 only (owner decision 11). The v12 specs with v11-only expectations: 45 pass, 252
skip, 2 fail on the same image hang (NOT verified).

## 5. Pending SQL

19 files, none applied, grouped with order, rows, what each unlocks and the owner looks in `run/SQL-PENDING.md`.
Apply only by `go <filename>`; the owner pastes the file in the SQL editor of `rdkgouofytwfdpbxbzio` and answers
`applied <filename>`; ORCH then runs its verification queries read-only.

## 6. Owner decisions

Answered on 2026-10-03 (details in `run/RUN-STATE.md` "Owner answers"): the cron test amended and fixed; the extra
script on `/blindtest` accepted after a network check showed it makes no request (`run/NETWORK-BLINDTEST.md`); the v12
flag stays off in production; the fr, es, id strings reviewed before the flag goes on; no lock on editorial fan
actions; screenshots kept local; SQL bundled (`v12-bundle-a.sql`), file 6 filtered, file 8 waits on a sample, file 19
on the accounts. Still open: the live doors commit 4284aaa (unmerged, its spec gate stays closed).

Before the answers:

The full list, numbered, with options, is `run/RUN-STATE.md` "Owner decisions needed" (1 to 23). The ones that
block turning the flag on or merging:

- 22: two fix-loop items held by the ratchet law (no test edited without the owner): the live doors on `/blindtest`,
  the landings and theme pages (G3 commit 4284aaa, not merged, turns `g3.spec.ts` red), and `/api/cron/live-expire`
  answering 401 before 404 with the flag off (`lib/live/api.test.ts` pins the order).
- 23: one extra script tag on `/blindtest` and `/pt/blindtest` with the flags off (parity, section 3).
- 21: keep `NEXT_PUBLIC_UX_V12` off in production until `v12-g4-live.sql` is applied, or gate every live door.
- 10: the fr, es and id game strings are G3's own wording, not reviewed by a native speaker.
- 1 and 2: the clue-quiz averages change on the live site with the flags off (meta description included), by design.
- G2 files 05 and 08 change the Year and Language lines of song pages with the flags off.
- G9: the owner creates 3 to 5 editorial accounts and fills `v12-g9-editorial-accounts.sql`.
- G4: the project's real Realtime limits before the live load test.
- 18: refusing editorial accounts on about 25 live write routes was not done (rule of use instead).
- Screenshots (about 43 MB, 888 files under `run/checks/pixel/` and `run/reports/<id>/`): removed from the branch in
  its last commit on the owner's decision; they stay on the owner's disk. Links to them in the reports point at
  local files.

## 7. Env vars and crons

- `NEXT_PUBLIC_UX_V12` (new, default off; build time). Turn on only together with `NEXT_PUBLIC_UX_V1`.
- `NEXT_PUBLIC_BT_TRACKING` (new, default off; build time; inlined as '' when unset by `next.config.ts`). Turn on after
  `v12-g1-bt-runs.sql`.
- Optional: `DUEL_SIGNING_SECRET` (else derived from the service role key, G7).
- Crons added to `apps/quiz/vercel.json`, each behind the cron secret and doing nothing with the flag off (two answer
  404; `live-expire` answers 401 first, section 6):
  `/api/cron/fans-picked` `40 3 * * *`, `/api/cron/editorial-publish` `*/15 * * * *`, `/api/cron/live-expire`
  `*/30 * * * *` (the last two are called 96 and 48 times a day while the flag is off; the owner may add them only
  when the flag goes on).
- Not needed: `VERCEL_AUTOMATION_BYPASS_SECRET` (checks ran on local production builds).

## 8. Not verified in this run (and why)

- Everything that needs the pending SQL: tracking rows, "fans playing today", the 2026 and KPDH themes on real data,
  This or that votes and Fans picked, live rooms (and the live load and chaos tests), Name them all community lines,
  editorial publishing and the Team badge with a real account, share link plays.
- The two write tests of V12 prompt 4d (tracking proof, live load test): waiting for the owner's go.
- Signed-in create and publish flows (C2 rows S02, S04); signed-in `/me` (never loaded: it writes on view).
- Six BTS hub photos never answered on the cold local build: p3:466, p6:769 and g8:482 are NOT verified there.
- Lighthouse (no owner OK); performance was measured with Playwright as in v11.
- Real devices: iOS Safari audio on `/live`, a phone scanning the QR (decoded by macOS Vision only).
- The Vercel preview: `feat/v12` is not pushed (owner-gated); every check ran on local production builds.

## 9. Real-data audit (2026-10-04, every v12 SQL applied)

Flag-on production build of the `feat/v12` head on :3071, real production data. Audits AU1 (blindtest, covers, live),
AU2 (play modes), AU3 (hubs, creators, boards, editorial accounts) in `run/audit/`, fixes F6a to F6d in
`run/reports/F6/`, re-check AU4 (end of `run/audit/AU3.md`). Screenshots are local only (`run/audit/**`).

| Feature | URL | Visible | Works | Note |
|---|---|---|---|---|
| Blindtest hub: Playlists rail, live band, language row | `/blindtest` | yes | yes | live doors show although live is closed (decision 22, kept) |
| 4 landings | `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`, `/id/tebak-lagu-kpop` | yes | yes | fr, es, id game strings to review (decision 10) |
| Themed playlists (5) | `/blindtest/kpop-hits-2026`, `-2025`, `5th-gen`, `tiktok-viral`, `kpop-demon-hunters` | yes | yes | hits-2026 and KPDH now playable |
| Named modes | `/blindtest/kpop-legends`, `/blindtest/title-tracks` | yes | yes | fixed (F6a): legends 2008 to 2017, title tracks only |
| Covers | every blindtest surface | yes | yes | 2,500 stored covers answer 200; KPDH covers removed everywhere (F6a, F6d) |
| Live blindtest | `/live`, `/join` | yes | yes | one test room, 5 rounds, 2 players, closed |
| Which member (15 groups) | `/which-<group>-member-are-you` | yes | yes | splits equal `personality_results` |
| KPop Demon Hunters quiz | `/kpop-demon-hunters-quiz` | yes | yes | |
| Name them all (17 groups) | `/<group>-name-all-members` | yes | yes | one test round |
| This or that bonus | quiz results | yes | yes | 84 groups, 585 covers; one test vote |
| Fans picked | hub section, `/api/duel/fans-picked` | no | yes (dry run) | empty until the nightly cron first runs with the flag on; dry run ranks aespa, BLACKPINK, BTS |
| Hub ways to play, empty and thin hubs | `/<group>-quiz` | yes | yes | sideways scroll at 390 fixed (F6b) |
| New groups' hubs | `/rescene-quiz`, `/nct-wish-quiz`, `/kickflip-quiz`, `/hearts2hearts-quiz` | yes | yes | Hearts2Hearts shows the stored name "Hearts2hearts" (owner data) |
| Share kit, plays from your link | create done, share sheet | yes | not proven | recording built (F6b); no share link exists in production |
| Creators board | `/creators` | yes | yes | editorial accounts excluded |
| Leaderboard (4 tabs) | `/leaderboard` | yes | yes | no editorial account listed |
| Team badge | quiz pages of the 9 accounts, `/u/<username>`, search | yes | yes | Team profiles show no fan progress (F6c); bios still written as fans (owner data) |
| Admin pages | `/admin/editorial`, `/admin/blind-tests/runs` | gated | gated | redirect to login without an admin session |

Re-check AU4: the 4 fixed items pass, 90 of 90 regression URLs clean at 1440. Parity run 4 (both flags off, feat/v12
vs main): sitemap 3,165 = 3,165, robots.txt identical, only the allowed differences.

Production test writes (owner allowed; all three DELETED on the owner's request on 2026-10-04, checked read-only:
no row left, live_rooms 0, duel_votes 75,191, name_all_member_results 7,524, as before the tests):
- live room `840c04f8-f869-4b16-9a79-3f19d50a07f9` (code Z88WXE, `is_test` true, closed; players and answers already
  removed);
- This or that vote `duel_votes` id `eab35ec0-6bc9-48d9-a681-da3cdbf62900` and its `duel_vote_guard` row (voter hash
  af53ecb8700872c70ac74ea3f6f7e53a, 2026-10-04);
- Name them all `name_all_member_results` ids 7735 to 7738 (round `22031bc9-ff29-4a7f-a35c-1ead98eafd14`);
- share link play: not done (no share link exists; creating one is a signed-in write the owner did not list).

Owner requests applied in production on 2026-10-04 (one transaction, checked read-only afterwards): the bios of the 9
editorial accounts read "KpopQuiz team · <their beat>"; group 91 is named "Hearts2Hearts" (was "Hearts2hearts"; the hub
title and H1 follow, flags on or off) and its This or that prompt reads "Best Hearts2Hearts song?". The application code
holds no copy of the old spelling (one unit test uses it as an initials input; archived design and evidence files keep
what they recorded).

fr, es and id copy for the owner's native review: `apps/quiz/src/lib/growth/bt-strings.ts` (game strings, not in the
prototype), `apps/quiz/src/lib/growth/bt-landing.ts` (landing copy, the prototype's), `apps/quiz/src/lib/growth/bt-themes.ts`
(themed playlist lines per language).

## 10. Owner's Firefox test (2026-10-04 and 05)

| # | Owner item | Result | Fix |
|---|---|---|---|
| 1 | "Something went wrong" on `/blindtest/kpop-demon-hunters` | Not a page bug: Firefox reused a page from an earlier local build (`next start` sends `stale-while-revalidate`), whose script files no longer existed; the exact screen reproduced with a missing chunk. Production sends `max-age=0, must-revalidate`. | With the flag on, a missing script under `/blindtest` reloads the page once (root error boundary, 55920fe; a first version as a route boundary added a script to 7 flag-off pages, caught by parity run 5, fixed). A run started in every playlist and theme: Firefox 144/144, Chromium 143/144 (f(x) timed out once, passed alone). |
| 2 | Missing covers ("Bear Hug" by Suho) | The cover answers 200 (107,797 bytes); 2,444 stored covers load in Firefox. Firefox paints the alt text while an image downloads. | `CoverImg`: never paints alt text, gradient while loading, placeholder on error; reveal cover fetched during the clip; also the result card photo (38958a9). |
| 3 | Blurry, face-cropped home image, full screen at load | Not reproduced: the home header has no image; no full-screen paint in any first-paint probe in three browsers. | The groups rail photos (first images of the page) were 80x120 cut through faces: now 80x80 cover. Owner: screenshot or URL needed if this was another image. |
| 4 | Rabbit logo | Done | `public/mascot/mascot-default.png` (the favicon art) at 28px next to "KpopQuiz". |
| 5 | New quizzes thumbs | The four grey tiles had valid pictures: lazy loading in Firefox on a grey ground. | 56px, eager, picture then group photo then logo then the type icon, never empty. |
| 6a | Player data untouched by the SQL | The v12 SQL writes no player table; counts never went down (profiles 278 to 281, plays 70,034 to 70,152, duel votes 75,191 to 75,193, personality 1,255 = 1,255, name all 7,524 = 7,524); every change since the morning is spread one by one over the day (live activity). No pre-SQL baseline existed for XP, badges, likes, comments, follows totals. | None needed. |
| 6b | Every quiz, hub, 50 profiles | 433 quizzes, 93 hubs, 55 profiles: all 200, 0 discrepancies (play counts behind only by plays of the last hour, page cache). | None needed. Note: the 9 editorial accounts keep XP in the database (not shown anywhere). |
| 7 | Firefox and WebKit pass | Chromium 52/52, WebKit 52/52, Firefox 48/52: the result card alt text (fixed) and an uncaught Supabase auth lock error on `/q/` pages that the live site also has with the flags off (nothing visible breaks). | Result card fixed. |

## 11. Launch prep (2026-10-05, branch `v12/launch-prep`)

| Item | Result | Evidence |
|---|---|---|
| fr, es, id copy review | applied as written (21 strings); `averageAnswer` changed because the value shown is a time; `runTitle` unchanged (it never starts a line) | `I18N-REVIEW.md`, c23645b |
| Live load test, real | burst 5 x 50, 5 rounds: answer p50 52 ms, p95 1,579 ms, loss 0.02%; long 1 x 50, 20 rounds: p95 126 ms, loss 0.26%; every lost message recovered; 0 failure, 0 wrong score | `checks/live-load/LIVE-LOAD.md` |
| Chaos (SYSTEM.md 5.5) | same nickname, 51st player, double tap, late answer, phone drop, host reload, expiry: all as expected; expiry cron not called (another expired test room, not ours) | same |
| Test rooms | 7 deleted; `live_players` 0, `live_answers` 0 | `checks/live-load/cleanup.txt` |
| Editorial drafts | 28 inserted in production, `draft`, undated, unreviewed; 0 published | `EDITORIAL-DRAFTS.md` |
| Switch-on runbook | written, nothing switched on | `SWITCH-ON.md` |
| Checks | tsc 0, vitest 1960/1960, `check:routes` 3 states green; parity flags off vs main: 35/38 identical, 3 live counters only, sitemap 3166 = 3166 | `checks/qa/parity/run7/NOTE.md` |
