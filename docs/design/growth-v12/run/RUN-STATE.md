# V12 run state

Owner of this file: ORCH. Updated and committed after every event (V12 prompt 4b, v11 worker prompt 4b).

- Prototype: `docs/design/growth-v12/prototype.html`, `window.UX_VERSION` = `v12.2 growth (2026-09-29)` (checked 2026-10-02).
- Integration branch: `feat/v12`, cut from `origin/main` at `a94d77c` (R1 done: PR #66 merged 2026-10-01, `docs/release/R1-STATE.md` says DONE). First commit `5e4548f` "docs(v12): growth package".
- Phase: **1, started 2026-10-02**. A1, G1, G2 spawned.

## Agents

| Id | Branch | Status | Last sha | Open issues | Report |
|---|---|---|---|---|---|
| A1 | v12/a1-foundation | running | - | 0 | run/reports/A1.md |
| G1 | v12/g1-tracking | merged (8d11ad0) | 1ce5143 | 0 | run/reports/G1.md |
| G2 | v12/g2-catalogue | running | - | 0 | run/reports/G2.md |
| G3 | v12/g3-acquisition | queued (Phase 2, first wave) | - | 0 | run/reports/G3.md |
| G4 | v12/g4-live | queued (Phase 2, first wave) | - | 0 | run/reports/G4.md |
| G5 | v12/g5-personality | queued (Phase 2, second wave) | - | 0 | run/reports/G5.md |
| G6 | v12/g6-name-all | queued (Phase 2, second wave) | - | 0 | run/reports/G6.md |
| G7 | v12/g7-this-or-that | queued (Phase 2, first wave) | - | 0 | run/reports/G7.md |
| G8 | v12/g8-hub-creators | queued (Phase 2, last: needs G5, G6, G7 merged) | - | 0 | run/reports/G8.md |
| G9 | v12/g9-editorial | queued (Phase 2, first wave) | - | 0 | run/reports/G9.md |
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

## Asked to the owner (once, not blocking)

1. Editorial accounts (SYSTEM.md 5.6, G9): 3 to 5 accounts created by the owner, then their user ids, names and beats.
2. Lighthouse: OK to use it for C3's performance checks (it would be a new dev dependency or an `npx` download)?
   Without the OK, C3 measures LCP and CLS with Playwright as in v11.

## Owner decisions needed

1. G1, SEO field with the flags off: the meta, og and twitter description of clue quiz pages quotes the average, so "scoring 123% on average" becomes "41%". Shipped: the corrected number (the prompt lists recomputed guess-from-clues figures as an allowed difference). Alternative: drop that sentence for clue quizzes.
2. G1: clue quiz percentages are now points over max, low by design (26 to 80%), so chips turn from green to red. Shipped: clue quizzes are left out of the `/stats` rankings ("Ranked from 253" instead of 256). Alternative: hide their average everywhere.
3. G1: `kickflip-mega-quiz` (not a clue quiz) goes from "avg 101%" to 100%: its stored `question_count` is stale and the helper caps at 100. The stale count itself is data, not fixed in this run.
4. G1: the go for `v12-g1-bt-runs.sql`, then for the tracking proof (`run/reports/G1/tracking-proof.mjs`, prepared, refuses to run without the go).

## Open requests (run/requests/G1.md), to route in Phase 2

- R1: ranked runs are NOT tracked: ranked uses its own hook `components/ranked/ux-v1/use-ranked-run.ts`, unowned. ORCH assigns it (to G1 in a follow-up).
- R2 challenge code and R3 sources: G3, G8, G4 pass them to `trackBtRun()`.
- R4: a Playwright project for `e2e/ux-v12` (A1, `playwright.config.ts`).
- R5: v11 `p6.spec.ts` must run with tracking off, or `/api/track/bt-run` is filtered from its write counts (G3 owns the blindtest specs' helpers through requests to A1).
- R6: admin nav link to `/admin/blind-tests/runs`.
- S1 to S7 inline averages and L1 to L9 `score/total` labels in other agents' files (G8 `lib/ux-v1/p3`, A1 kit, and the others listed there).
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

NEXT ACTION: G1 is merged. Wait for A1 and G2 ("ready": branch, sha). For each: run the guard
(`node scripts/v12-owner-guard.mjs --agent <ID> --range feat/v12..<branch>`), whole-app tsc and vitest on the branch,
merge into `feat/v12` with `--no-ff`, update this file. An agent marked running whose branch has commits but that is
no longer alive is resumed by its agent id, or respawned with its brief plus "continue from your branch and your
Progress block". When A1 and G2 are merged too: write the Phase 2 briefs (G3..G9) in `run/briefs/`, add the
`UX_V12_ROUTES` list and its tests to `route-allowlist.ts`, then spawn G4, G3, G9, G7 (max 4 builders at once).
