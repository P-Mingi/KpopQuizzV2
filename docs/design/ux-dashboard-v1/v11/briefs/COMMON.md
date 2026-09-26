# Common brief for every page agent (UX v11.2 run)

Read this file and your own `v11/briefs/<ID>.md`. Start by invoking the Skill tool with skill `verse-laws` and follow it.

## Rules that do not bend (worker prompt section 0, verbatim)
1. Never push to `main`, never merge into `main`, never force-push. The owner merges into `main`.
2. Never write, print or commit a secret (service role key, tokens, cookies, passwords). Env vars only.
3. No DDL and no data backfill against production. New tables, columns, indexes, policies, crons: write `docs/pending-migrations/v11-<agent>-<topic>.sql` + a one-paragraph note, then STOP that part; the code must fail soft until the owner applies it.
4. Data safety contract (`docs/design/ux-dashboard-v1/PHASE0-ANSWERS-AND-DATA-SAFETY.md`) applies in full: no change to anyone's XP, level, streak, badges, likes, comments, settings; writes only through the existing endpoints; the only account an agent may act as is the parity test user (`UX_V1_TEST_USER_ID`, `UX_V1_TEST_EMAIL`); the data-guard script must stay green.
5. Everything ships behind `NEXT_PUBLIC_UX_V1` (default off). Flag off = today's site, byte for byte.
6. SEO is a blocker: every public URL keeps its URL, H1, intro text, FAQ text, JSON-LD, canonical, `/pt` mirror and server rendering. Any SEO diff not listed in DESIGN-SPEC 16.10 fails the page.
7. Real data only. Prototype numbers are samples; the implementation reads the real ones.
8. No emoji, no em or en dashes in UI copy. Copy is the prototype's copy unless real data replaces it.
9. Do not redraw group logos or the KpopQuiz logo. Photos come from `apps/quiz/public/idols/`.
10. Stay inside your owned paths. The guard script rejects anything else.

## ORCH run rules
- The dev server and previews use the PRODUCTION Supabase. Until the owner answers, send no request that writes production data, not even as the test user: never click a saving control against a dev server by hand (finishing a quiz or a blindtest, liking, commenting, voting, posting, saving settings all write); in e2e wrap every page with `guardWrites(page)` (`e2e/ux-v1/helpers/guard`) and assert the recorded payloads. Reads are fine.
- Never load `/profile` or `/me` signed in: viewing them grants badge tiers and writes passport snapshots. Before loading any other page signed in, read its server code and confirm its GET path writes nothing.
- Signed-in identity: only the Playwright setup project (`e2e/ux-v1/auth.setup.ts`, storage state `apps/quiz/e2e/.auth/test-user.json`). Never log in any other way; never print, attach or commit that file.
- Build on A0's foundation: read `docs/design/ux-dashboard-v1/v11/reports/A0.md` section 4 (conventions) and section 5 (component API) before writing code. Wrap every v11 page in `UxPage`. Never copy a shared component into your folder to tweak it: append the request to `docs/design/ux-dashboard-v1/v11/requests/<ID>.md` (what, why, which prototype state) and list it in your final answer.
- Stylesheet: `apps/quiz/src/styles/ux-v1/<id lowercase>.css`, never imported anywhere (A0's route serves the folder to flag-on pages only; an import leaks a `<link>` into flag-off HTML).
- New public pages that do not exist today (for example `/community`) are `noindex` and stay out of the sitemap until the owner decides; list them in your report.
- EXISTS components (quiz player, blindtest game, create funnel, question editor, notifications center) are re-skinned, never forked: keep their scoring and save calls.

## Worktree, env, tools
- Your cwd should be an Agent-tool worktree of `/Users/louis/IT/Dev/projects/KpopQuizzV2` (check `git rev-parse --show-toplevel`). `git fetch origin && git switch -c <branch> origin/feat/ux-v1-v11` (or, when told to continue, `git switch <branch>`). If your cwd is not a KpopQuizzV2 worktree: `git -C /Users/louis/IT/Dev/projects/KpopQuizzV2 worktree add .worktrees/ux11-<id> -b <branch> origin/feat/ux-v1-v11`.
- Ownership guard in THIS worktree only: `git config extensions.worktreeConfig true && git config --worktree core.hooksPath scripts/ux11-hooks`; `export UX11_AGENT=<ID>` in every shell. Never set `core.hooksPath` repo-wide.
- The worktree is bare: `M=/Users/louis/IT/Dev/projects/KpopQuizzV2; ln -sfn $M/node_modules node_modules; ln -sfn $M/apps/quiz/node_modules apps/quiz/node_modules; ln -sfn $M/apps/quiz/.env.local apps/quiz/.env.local`. Stage by explicit path only, never the symlinks, never `git add -A`. Remove the symlinks, `apps/quiz/.next` and any dev server before you finish.
- Dev: `NEXT_PUBLIC_UX_V1=1 PORT=<port> pnpm --filter quiz dev` from the worktree; check flag off too.
- Playwright: `export UX11_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell` (never download browsers). Projects `ux-1440` and `ux-390` run `e2e/ux-v1/*.spec.ts` after `setup`. Helpers in `e2e/ux-v1/helpers/`: setup-page, guard, auth, a11y, landmarks, compare-shots.mjs, flag-off-diff.mjs.
- References: `/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference/<1440|390>-<light|dark>-<state>.png` (absolute path, local only) and the committed `v11/checks/reference/styles.json`. State ids and their JS: `docs/design/ux-dashboard-v1/v11/capture-prototype.mjs`. `docs/design/ux-dashboard-v1/prototype.html` is THE reference: open it in Chromium and measure it.
- Spec precedence: DESIGN-SPEC 17 (17.10, 17.11 last) wins over 16, 16 over 1 to 15, the prototype over all. Wiring: WIRING-MAP.md (old + v10 + v11 tables), corrected by WIRING-MAP.verified.md. Data truths: DECISIONS-LOG.md.
- Lint: the repo has no eslint config and `next lint` is gone; lint your files with eslint-config-next directly, as A0 did. `tsc --noEmit` must be clean.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the PR body ends with `Generated with Claude Code`. Commit early and small, push your branch after the first commit, so a restart can continue from it.

## Done when (worker prompt section 5)
1. Every owned state matches the reference at 1440 and 390, light and dark: landmark boxes within 2px, computed styles equal to `styles.json` for your landmarks (masks for photos and text).
2. Every wiring row works end to end as a guest and (read-only) as the test user, flag on; flag off unchanged: A0's flag-off-diff helper on your public URLs (and `/pt` mirrors), zero diff.
3. `e2e/ux-v1/<id>.spec.ts` covers every control of your views, with `guardWrites`, and passes locally at 1440 and 390, light and dark.
4. axe: 0 serious or critical issues. Keyboard reaches and operates every control; sheets close with X, Escape and backdrop and return focus.
5. SEO diff on your public URLs, flag on vs flag off (title, meta description, H1, intro, FAQ, canonical, JSON-LD, hreflang, robots, server-rendered HTML): empty, or only 16.10 additions. This includes the LINK SET: every `<a href>` in the flag-off server HTML (hubs, quizzes, trivia, articles, pagination, footer) must also be in the flag-on server HTML (order may change, additions are fine). A lost internal link is a blocker, not an owner decision. Report both sets and their counts.
6. `docs/design/ux-dashboard-v1/v11/reports/<ID>.md`: a Progress block at the top (done, next, blockers), then what you built, screenshots (implementation vs reference, in `v11/reports/<ID>/`), wiring proof, SEO diff, what is NOT verified and why, open items, requests to A0, owner decisions.
7. Push your branch and open a PR into `feat/ux-v1-v11` (NOT main) with `gh pr create --base feat/ux-v1-v11`, before / after / prototype side by side.

Do not work around a rule: if blocked, write it in your report and tell ORCH. Final answer to ORCH: 20 lines max: status, branch, last sha, PR link, checks passed, pending migrations, requests to A0, owner decisions, blockers. Details stay in files.
