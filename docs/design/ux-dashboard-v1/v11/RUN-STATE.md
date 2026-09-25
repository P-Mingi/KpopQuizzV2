# UX v11.2 run state

Owner of this file: ORCH. Updated and committed after every event (worker prompt section 4b).

- Prototype: `docs/design/ux-dashboard-v1/prototype.html`, `window.UX_VERSION` = `v11.2 (2026-09-25)` (checked 2026-09-25).
- Integration branch: `feat/ux-v1-v11`, cut from `feat/ux-v1-phase2` at `72dcebb`. First commit `f95af79` (design package + `.gitignore` for `apps/quiz/e2e/.auth/`).
- Phase: **1** (A0 foundation) with P7 engine in parallel. Check loop: 0.

## Agents

| Id | Branch | Status | Last sha | Open issues | Report |
|---|---|---|---|---|---|
| A0 | ux11/a0-foundation | queued | - | 0 | v11/reports/A0.md |
| P1 | ux11/p1-home | queued | - | 0 | v11/reports/P1.md |
| P2 | ux11/p2-quizzes | queued | - | 0 | v11/reports/P2.md |
| P3 | ux11/p3-groups | queued | - | 0 | v11/reports/P3.md |
| P4 | ux11/p4-quiz | queued | - | 0 | v11/reports/P4.md |
| P5 | ux11/p5-create | queued | - | 0 | v11/reports/P5.md |
| P6 | ux11/p6-blindtest | queued | - | 0 | v11/reports/P6.md |
| P7 | ux11/p7-ranked | queued | - | 0 | v11/reports/P7.md |
| P8 | ux11/p8-community | queued | - | 0 | v11/reports/P8.md |
| P9 | ux11/p9-leaderboard | queued | - | 0 | v11/reports/P9.md |
| P10 | ux11/p10-passport | queued | - | 0 | v11/reports/P10.md |
| P11 | ux11/p11-notifications | queued | - | 0 | v11/reports/P11.md |
| C1 | (read-only on feat/ux-v1-v11) | queued | - | - | v11/checks/pixel/ |
| C2 | (read-only on feat/ux-v1-v11) | queued | - | - | v11/checks/backend/ |
| C3 | (read-only on feat/ux-v1-v11) | queued | - | - | v11/REPORT.md |

## Run environment (Phase 0 findings, every brief repeats them)

- Worktrees from the Agent tool are bare (no `node_modules`, no `.env.local`). Symlink from the main checkout
  `M=/Users/louis/IT/Dev/projects/KpopQuizzV2`: `node_modules`, `apps/quiz/node_modules`, `apps/quiz/.env.local`.
  Never stage the symlinks (stage by path). Remove them before the agent finishes.
- Signed-in env is present in `apps/quiz/.env.local` (test email, test user id, Supabase URL, anon, service role).
  `apps/quiz/.env.test.local` does not exist. `VERCEL_AUTOMATION_BYPASS_SECRET` is not set (only needed if the preview is protected).
- The installed `@playwright/test` wants Chromium build 1243; the cache has 1234. No download: every Playwright run sets
  `UX11_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`
  and A0 makes `playwright.config.ts` pass it as `launchOptions.executablePath` when set.
- Reference set: `v11/checks/reference/` in the MAIN checkout (152 PNG + `styles.json`), captured 2026-09-25 from the pinned
  prototype with the cached Chromium. Only `styles.json` is committed; the PNGs are local (git info/exclude) and read by
  absolute path. Versus `shots-v11/`: same layout, sub-pixel font noise only (worst 4% AA pixels, 6 community/post
  states at 390 differ by 1 to 10 px of page height).
- Dev ports (Next 16 allows one `next dev` per directory; each worktree has its own): A0 3030, P1 3031, P2 3032, P3 3033,
  P4 3034, P5 3035, P6 3036, P7 3037, P8 3038, P9 3039, P10 3040, P11 3041, integration/checkers 3021.
  Start with `NEXT_PUBLIC_UX_V1=1 PORT=<port> pnpm --filter quiz dev` from the worktree. Stop it when done.
- Ownership guard: hooks are installed per worktree only (`extensions.worktreeConfig` + `git config --worktree core.hooksPath`),
  never repo-wide; the guard is a no-op when `UX11_AGENT` is unset.

## Pending migrations (written, never applied)

None yet.

## Owner decisions needed

None yet.

## Log

- 2026-09-25 Phase 0: preflight (prototype v11.2 ok; two untracked archives outside the package excluded locally on owner's answer), integration branch + design package commit, reference capture, OWNERSHIP.json, this file.

NEXT ACTION: spawn A0 (foundation) and P7 (ranked engine) from `feat/ux-v1-v11`; when A0's PR is green, merge it and start P1, P4, P6, P10.
