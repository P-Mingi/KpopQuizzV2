# Common brief for every agent of the V12 run

Read this file, your own `docs/design/growth-v12/run/briefs/<ID>.md`, then `docs/design/growth-v12/SYSTEM.md` (your
sections) and section 5 of `docs/design/growth-v12/V12-PROMPT-MULTIAGENT.md` for your id. Start by invoking the Skill
tool with skill `verse-laws` and follow it. The v11 run is the method: `docs/design/ux-dashboard-v1/v11/briefs/COMMON.md`
and `v11/reports/A0.md` sections 4 and 5 (conventions, component API) still apply unless this file says otherwise.

## Rules that do not bend (V12 prompt section 0, verbatim)
1. Never push to `main`, never merge into `main`, never force-push. The owner merges.
2. Never write, print or commit a secret. Env vars only. Generated secrets go straight into their store.
3. No DDL and no data write against production. Every table, column, policy, function, cron or data insert is a
   file `docs/pending-migrations/v12-<agent>-<topic>.sql` (idempotent, header: what, why, rows, verify, undo).
   The code fails soft until it is applied. A file is applied only after the owner types `go <filename>`.
4. Data safety (v11 decision 1 still stands): the dev server and previews use the production database, so no
   mutating request reaches it from a check. Every spec uses the v11 `guardWrites` helper
   (`apps/quiz/e2e/ux-v1/helpers/`), which answers POST/PUT/PATCH/DELETE locally and asserts the payload.
   Exceptions, only after the owner's `go` for that test: the live load test and one tracking proof, both
   writing rows marked `is_test = true` in tables created by this run. Never load `/me` or `/profile` signed in
   (they write on view). Never change anyone's XP, level, streak, badges, likes, comments, settings or plays.
5. Everything ships behind `NEXT_PUBLIC_UX_V12` (default off), read through `isUxV12()` in `lib/ux-v12.ts`,
   which is true only when `NEXT_PUBLIC_UX_V1` is on too. Every build, dev server and checker baseline in this run
   sets `NEXT_PUBLIC_UX_V1=1`. Flag off = today's v11 code paths, byte for byte: every new page, API route and cron
   answers 404 or does nothing unless `isUxV12()`; rewrites and the REFONTE exceptions in `next.config.ts` exist
   only when the flag is on at build; new themed modes join `STATIC_MODES` only with the flag. Data is not code:
   groups and songs added by G2's approved SQL appear on the v11 pages too. Two switches of their own: blindtest
   tracking (`NEXT_PUBLIC_BT_TRACKING`) and the score helpers (always on: they recompute every guess-from-clues
   score and average). Exception to the gating: `/api/track/bt-run`, the legacy tracking calls and
   `/admin/blind-tests/runs` follow `NEXT_PUBLIC_BT_TRACKING` alone.
6. SEO is a blocker: every existing public URL keeps its URL, title, description, H1, intro, FAQ, JSON-LD,
   canonical, hreflang, `/pt` mirror and server rendering, flag on and off. New URLs: indexable only where
   SYSTEM.md says so (the four landings, themed playlists, Which member, Name them all, the KPop Demon Hunters
   quiz), in the sitemap only when the flag is on; `/live`, `/join`, `/creators`, `/admin/*` noindex.
7. Real data only. No floored, random or invented number. A number that does not exist is hidden.
8. Editorial accounts (SYSTEM.md 5.6) always carry the Team badge and never act as fans. No agent creates an
   account or handles a password.
9. No emoji, no em or en dashes in UI copy, docs, reports and code comments you add.
10. Do not redraw group logos or the KpopQuiz logo; photos only from `apps/quiz/public/idols/`; KPop Demon Hunters:
    text and audio only; TikTok: the word only.
11. Stay inside your owned paths (`docs/design/growth-v12/run/OWNERSHIP.json`); the guard rejects anything else.
12. Judgment: a check that disagrees only for a reason nobody sees (hashed `/_next/static` paths, the build id, the
    order of `self.__next_f`, timestamps, sitemap `lastmod`, live counters, the order of equal items, rows added by
    approved SQL, recomputed guess-from-clues figures) is not a failure: normalize it, write the normalization in
    your report, continue. Stop and tell ORCH only for: a production write, a secret, a change a visitor or a
    crawler would see with the flags off, an SEO field change, a failing security test, or an owner decision.
    Everything else you decide, write down and keep going.

Repo laws on top (CLAUDE.md): RATCHET (never edit or weaken an existing test, gate script or proof to get green;
the hook blocks `apps/quiz/scripts/_*.mts`, `check-*.mts`, `test-*.mts`), NO PLACEHOLDER (no stub or fake result),
no new dependency, SQL only as files in `docs/pending-migrations/` (never in the Supabase migrations folder; the
repo hook also blocks any shell command that names that folder, so read those files with the Read tool),
`git push` is done by ORCH only.

## Worktree, env, tools
- Your cwd is an Agent-tool worktree of `/Users/louis/IT/Dev/projects/KpopQuizzV2` (check
  `git rev-parse --show-toplevel`). First: `git switch -c <your branch> feat/v12` (the branch is local in the same
  repo; when told to continue: `git switch <your branch>`).
- Guard, in THIS worktree only: `sh scripts/v12-hooks/install.sh <ID>` (sets `core.hooksPath` and `v12.agent` with
  `git config --worktree`). Never set them repo-wide.
- The worktree is bare: `M=/Users/louis/IT/Dev/projects/KpopQuizzV2; ln -sfn $M/node_modules node_modules;
  ln -sfn $M/apps/quiz/node_modules apps/quiz/node_modules; ln -sfn $M/apps/quiz/.env.local apps/quiz/.env.local`.
  Stage by explicit path only, never the symlinks, never `git add -A`. Remove the symlinks, `apps/quiz/.next` and
  any dev server before you finish.
- Dev: `NEXT_PUBLIC_UX_V1=1 NEXT_PUBLIC_UX_V12=1 PORT=<your port> pnpm --filter quiz dev` from the worktree. Check
  the three flag states that matter: both on, v11 only (`NEXT_PUBLIC_UX_V12` unset: must equal today's v11), both off.
- NO `next build` in an agent: one build at a time across the whole run and ORCH owns it. Use dev, vitest, tsc.
- Playwright: `export UX11_CHROMIUM=$HOME/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`
  and `PW_CHROMIUM=$UX11_CHROMIUM` for the capture scripts (never download browsers). Specs: `e2e/ux-v12/<id>.spec.ts`,
  every page wrapped with `guardWrites(page)`. Signed in only through `e2e/ux-v1/auth.setup.ts`; never print,
  attach or commit the storage state; never read, print or write down the test account's email.
- References (local PNG, absolute path): `/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/growth-v12/run/checks/reference/`
  (`<d|dk|m|mk>-<state>.png` = 1440 light, 1440 dark, 390 light, 390 dark; `styles.json` committed) and `reference/v11/`
  (the 38 v11 states on the v12 prototype). State ids and their JS: `docs/design/growth-v12/capture-v12.mjs` and
  `run/checks/capture-prototype-v11.mjs`. `docs/design/growth-v12/prototype.html` is THE reference: open it in
  Chromium and measure it. Dashed "Design note" boxes are annotations, never shipped copy. The shipped v11
  deviations (v11 REPORT.md "Deviations": nav spacing, warm light ground and white surfaces, tablet chrome to 900px,
  94% glass) are the expected values.
- Stylesheets: `apps/quiz/src/styles/ux-v12/<id>.css` for new v12 pages, served like the v11 page sheets (read A0.md
  section 4; ask A1 through a request if the stylesheet route needs to know the new folder). Never imported by
  globals.css.
- Shared files: never copy a shared component to tweak it. Append a request to
  `docs/design/growth-v12/run/requests/<ID>.md` (what, why, which state, which file) and name it in your final
  answer. `route-allowlist.ts`, `next.config.ts`, `vercel.json` (rewrites, redirects, crons, flag-only routes) are
  ORCH's: request them.
- `pnpm exec tsc --noEmit -p .` in apps/quiz (whole app, e2e included) and `pnpm --filter quiz exec vitest run` must
  be green before "ready". Before finishing, grep your diff for em and en dashes: it must return nothing.
- Long commands (more than about 2 minutes: full Playwright or vitest runs, whole-app tsc, capture batches): use
  run_in_background and continue when notified. A command silent for 10 minutes gets the agent killed.
- Scratch files: prefix them with your id. Commits end with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commit early and small; never push.
- Loop contract: fix, run, fix until your acceptance is green before reporting; budget 10 self-correction
  iterations on one blocker, then write it in your report (and `docs/loop/BLOCKED.md` if nothing else can move) and
  tell ORCH.

## Ready means
Code, unit tests, e2e spec, SQL files (never applied) and dry runs done; report
`docs/design/growth-v12/run/reports/<ID>.md` with a Progress block on top (done, next, blockers), what you built,
your own captures vs the reference for your states (in `run/reports/<ID>/`), wiring proof, flag-off proof, SEO proof
for your URLs, what is NOT verified and why, requests, owner decisions. Final answer to ORCH: 20 lines max: status,
branch, last sha, checks passed, pending SQL, requests, owner decisions, blockers. Details stay in files.
