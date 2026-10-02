# V12 run state

Owner of this file: ORCH. Updated and committed after every event (V12 prompt 4b, v11 worker prompt 4b).

- Prototype: `docs/design/growth-v12/prototype.html`, `window.UX_VERSION` = `v12.2 growth (2026-09-29)` (checked 2026-10-02).
- Integration branch: `feat/v12`, cut from `origin/main` at `a94d77c` (R1 done: PR #66 merged 2026-10-01, `docs/release/R1-STATE.md` says DONE). First commit `5e4548f` "docs(v12): growth package".
- Phase: **1, started 2026-10-02**. A1, G1, G2 spawned.

## Agents

| Id | Branch | Status | Last sha | Open issues | Report |
|---|---|---|---|---|---|
| A1 | v12/a1-foundation | running | - | 0 | run/reports/A1.md |
| G1 | v12/g1-tracking | running | - | 0 | run/reports/G1.md |
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

None yet.

## Asked to the owner (once, not blocking)

1. Editorial accounts (SYSTEM.md 5.6, G9): 3 to 5 accounts created by the owner, then their user ids, names and beats.
2. Lighthouse: OK to use it for C3's performance checks (it would be a new dev dependency or an `npx` download)?
   Without the OK, C3 measures LCP and CLS with Playwright as in v11.

## Owner decisions needed

None yet.

## Log

- 2026-10-02 Phase 0: R1 check ok; `feat/v12` created from `origin/main` (`a94d77c`); growth package committed
  (`5e4548f`) and its line removed from `.git/info/exclude`; OWNERSHIP.json written from the template (every TODO
  filled from the tree: G1 score files, G7 `components/quiz/ux-v1/results.tsx`, G8 `components/create/ux-v1/done.tsx`,
  G9 community routes, passport band, notifications and search rows); guard and hooks written and self-tested;
  references captured; briefs COMMON, A1, G1, G2 written. No `feat/v12` existed on origin: fresh start, no resume.
- 2026-10-02 Phase 1 started: A1, G1, G2 spawned in Agent worktrees.

NEXT ACTION: wait for A1, G1, G2 ("ready": branch, sha). For each: run the guard
(`node scripts/v12-owner-guard.mjs --agent <ID> --range feat/v12..<branch>`), whole-app tsc and vitest on the branch,
merge into `feat/v12` with `--no-ff`, update this file. An agent marked running whose branch has commits but that is
no longer alive is resumed by its agent id, or respawned with its brief plus "continue from your branch and your
Progress block". When the three are merged: write the Phase 2 briefs (G3..G9) in `run/briefs/`, add the
`UX_V12_ROUTES` list and its tests to `route-allowlist.ts`, then spawn G4, G3, G9, G7 (max 4 builders at once).
