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
