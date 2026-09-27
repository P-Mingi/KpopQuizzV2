# Common brief for the checkers C1, C2, C3 (UX v11.2 run, Phase 3)

Read this file and your own `v11/briefs/<ID>.md`. Start by invoking the Skill tool with skill `verse-laws`.

## Rules that do not bend
The ten rules of `v11/briefs/COMMON.md` apply in full (never push or merge to main, no secrets, no DDL or production writes, data safety contract, flag, SEO, real data, no dashes, logos, owned paths). Checkers never edit app code: you only write evidence and issues.

## Your paths
- C1: `docs/design/ux-dashboard-v1/v11/checks/pixel/**` and `v11/issues/**`.
- C2: `docs/design/ux-dashboard-v1/v11/checks/backend/**` and `v11/issues/**`.
- C3: `docs/design/ux-dashboard-v1/v11/checks/qa/**`, `v11/issues/**`, `v11/REPORT.md`, `apps/quiz/e2e/ux-v1/qa-*.spec.ts`.
Branch `ux11/<id>-check` from `origin/feat/ux-v1-v11`, in your Agent worktree; install the guard for this worktree (`git config extensions.worktreeConfig true && git config --worktree core.hooksPath scripts/ux11-hooks`), `export UX11_AGENT=<ID>`. Commit evidence often and push your branch (a branch push, never main). If a push is refused by a permission check, stop and tell ORCH.

## What you check against
- The implementation: ONE shared production build of `feat/ux-v1-v11` with the flag ON, served by ORCH at `http://localhost:3021` (ORCH tells you the head sha). Never start your own server on 3021 and never stop ORCH's. If you need the flag-OFF build or a `main` build for a diff, build it in your own worktree and serve it on your own port (C1 4201, C2 4202, C3 4203, plus 4211 / 4212 / 4213 for a second one), and stop it when done. The Vercel previews are behind Vercel SSO and there is no bypass secret yet: do not use them.
- The reference: `/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference/<1440|390>-<light|dark>-<state>.png` (absolute path, local only) + the committed `v11/checks/reference/styles.json`; state ids and their prototype JS in `docs/design/ux-dashboard-v1/v11/capture-prototype.mjs`; `prototype.html` is THE reference.
- State owners (for filing issues): P1 home, home-guest; P2 quizzes; P3 groups, hub-blackpink, hub-ateez, hub-empty; P4 quiz, play, play-answered, play-qotd, end, end-guest, share; P5 create-1, create-2, create-3, signin; P6 blindtest, blindtest-playlist-open, blindtest-group-search, btplay, btplay-answered; P7 ranked, btend-ranked; P8 community, post-challenge, post-blog, post-debate, editor; P9 leaderboard; P10 passport, passport-badges, settings, header-sheet; P11 notifications, search, bell. The shell, nav, tab bar, footer, cards, sheets and tokens: A0.

## Run rules learned in Phase 2 (all binding)
- No production writes, not even as the test user (owner decision 1 pending): every mutating request (POST/PUT/PATCH/DELETE to /api/**) is intercepted with `guardWrites(page)` from `apps/quiz/e2e/ux-v1/helpers/guard` and answered locally; its payload is the evidence. A check that needs a real write is "NOT verified: DB effect (owner decision 1)", never passed.
- Never load `/me` or `/profile` signed in (viewing grants badge tiers and writes snapshots). Passport states are checked through `/u/testtest` as a guest; signed-in `/me` is "NOT verified (owner decision 1)".
- Do not run `e2e/ux-v1/parity.spec.ts` (it loads /profile signed in).
- Signed in = the Playwright setup project only (`e2e/ux-v1/auth.setup.ts` -> `apps/quiz/e2e/.auth/test-user.json`); never print, attach or commit that file; delete it when you finish.
- Ranked is not live (its migration is pending): the populated ranked states are "NOT verified until the migration is applied"; check the not-live state.
- The worktree is bare: symlink `node_modules`, `apps/quiz/node_modules`, `apps/quiz/.env.local` from the main checkout; never stage them; remove them at the end. Playwright: `export UX11_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`. Scripts that import `@playwright/test` or `sharp` must run from `apps/quiz` (copy a script there temporarily if needed, never commit it there).
- A cold `next start` can hang AVIF image keys: warm images one at a time before measuring. Under a heavy machine load, retry a lost render; never relax an assertion to pass.
- Issues: append-only lines to `v11/issues/<owner id>.md`: `<issue id> | <state or row> | <width> | <theme> | expected | actual | <evidence path>`. Issue ids: `C1-001`, `C2-001`, `C3-001`...
- Final answer to ORCH: 20 lines max: status, branch, sha, pass / fail / not-verified counts, issues filed per owner, blockers. Details stay in files.
