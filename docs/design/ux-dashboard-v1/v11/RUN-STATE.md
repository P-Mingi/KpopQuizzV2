# UX v11.2 run state

Owner of this file: ORCH. Updated and committed after every event (worker prompt section 4b).

- Prototype: `docs/design/ux-dashboard-v1/prototype.html`, `window.UX_VERSION` = `v11.2 (2026-09-25)` (checked 2026-09-25).
- Integration branch: `feat/ux-v1-v11`, cut from `feat/ux-v1-phase2` at `72dcebb`. First commit `f95af79` (design package + `.gitignore` for `apps/quiz/e2e/.auth/`).
- Phase: **2** (page agents, max 4 at once). Check loop: 0.

## Agents

| Id | Branch | Status | Last sha | Open issues | Report |
|---|---|---|---|---|---|
| A0 | ux11/a0-foundation | merged (2cad6a7, PR #45) | 9b71ace | 0 | v11/reports/A0.md |
| P1 | ux11/p1-home | running (resumed 23:51 after usage limit; 7 commits, 3 unpushed) | 5d423e0 | 0 | v11/reports/P1.md |
| P2 | ux11/p2-quizzes | queued | - | 0 | v11/reports/P2.md |
| P3 | ux11/p3-groups | queued | - | 0 | v11/reports/P3.md |
| P4 | ux11/p4-quiz | running (resumed 23:51 after usage limit; 8 commits, all pushed) | cc1671a | 0 | v11/reports/P4.md |
| P5 | ux11/p5-create | queued | - | 0 | v11/reports/P5.md |
| P6 | ux11/p6-blindtest | running (resumed 23:51 after usage limit; 5 commits, 3 unpushed) | 5a56822 | 0 | v11/reports/P6.md |
| P7 | ux11/p7-ranked | engine pass done, draft PR #44; UI pass queued (next free slot) | 56eb011 | 0 | v11/reports/P7.md |
| P8 | ux11/p8-community | queued | - | 0 | v11/reports/P8.md |
| P9 | ux11/p9-leaderboard | queued | - | 0 | v11/reports/P9.md |
| P10 | ux11/p10-passport | running (resumed 23:51 after usage limit; 8 commits, 5 unpushed) | 881968c | 0 | v11/reports/P10.md |
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

- `docs/pending-migrations/v11-p7-ranked.sql` (P7): ranked_seasons, ranked_runs (run tokens), ranked_song_stats, ranked_legends; ranked_plays.season + run_token (unique) + index (player_id, season, score desc); 7 service_role-only functions; RLS on, no policy; commented rollback; nightly cron documented, not enabled.

## Owner decisions needed

1. Production writes as the test user. The local dev server and the preview both use the production Supabase, so every signed-in or guest action that saves something (play a quiz, like, comment, vote, save Your look, upload a header) writes production rows. The worker prompt lets agents act as the test user; the launch prompt says never write production data. Until the owner answers: no mutating request at all, e2e stubs POST/PUT/PATCH/DELETE and asserts the payload, C2 proves wiring by request shape plus read-only SQL. Asked 2026-09-25.
2. Ranked go-live (P7): apply v11-p7-ranked.sql, insert the season 1 row, enable the nightly Legend cron, decide whether ranked runs award blindtest XP (default no).
3. Security, existing (found by P7): the ranked_plays insert policy from migration 059 is open to the public, so anyone can insert forged rows today. Tightening it is an RLS change, out of this run's rules; owner call.
4. /me writes on view (found by A0): viewing /me (and /profile, which redirects there) signed in grants badge tiers and writes passport snapshots. No agent loads them signed in; parity.spec runs only with UX_V1_PARITY=1; P10 verifies the passport through /u/testtest and render tests. Folded into decision 1.
5. Logo (A0): the prototype's pink K tile + "KpopQuiz" (17.1) is shipped under the flag; the live site shows the rabbit mascot. One-line swap in components/ux-v1/brand.tsx.
6. Contrast (A0): name accents and badge rarity words are shown through per-theme AA-clamped tokens (same hue); stored values unchanged.
7. Live ticker online count (DESIGN-SPEC 17.11, already marked pending there): the live component floors the online count with a random 12 to 27. Kept as is unless the owner says otherwise (it is not real data).
8. Group hubs with few quizzes: the worker prompt asks for noindex until 3 quizzes; today's hubs have no robots rule, so it is an SEO diff outside 16.10. Not shipped; owner call.
9. New public URLs under the flag (/community and its posts, /blindtest/ranked): noindex and out of the sitemap until the owner decides.
10. Data (P7): `songs` has no accuracy stats; the ranked 4/4/2 draw uses the curated songs.tier until ranked answers build up ranked_song_stats.

## Log

- 2026-09-25 23:51 Usage limit: P1, P4, P6, P10 were stopped by the account session limit (reset 23:50) after pushing part of their work. All four resumed from their transcripts with their live servers listed (next servers of the ask-link project on this machine are not ours, never touched). Lesson for the run: agents commit and push after every meaningful step.
- 2026-09-25 Briefs written to v11/briefs/ (COMMON + one per page agent) so spawns and respawns are short and identical. OWNERSHIP: /g/** moved P3 -> P6 (blind-test game). Open item: the /pt pages (unowned) render their current content inside the v11 shell under the flag; SEO unchanged; re-skin is an owner call.
- 2026-09-25 RESUME: the previous ORCH session ended with P1, P4, P6, P10 stopped mid-task. Checked against git: worktrees intact under .claude/worktrees/agent-*, no branch pushed, no dev server alive. All four resumed from their own transcripts (not respawned) with orders to commit any uncommitted work first, update their Progress block and push their branch before continuing. Resume recipe for the next restart: resume a stopped agent by messaging its agent id (its transcript is kept); respawn with its brief + "continue from your branch and your Progress block" only if resuming fails.
- 2026-09-25 A0 merged into feat/ux-v1-v11 (2cad6a7): guard ok on 105 files, flag-off proof (DOM/head/JSON-LD/CSS identical, 0 px), kit + shell specs green. ORCH a20e709: /ux-v1/ and /community known only with the flag on (flag off keeps the 301), check:routes 306 both ways. Page CSS convention: styles/ux-v1/<id>.css, never imported.
- 2026-09-25 Phase 2 started: P1, P4, P6, P10 spawned.
- 2026-09-25 P7 engine pass done: 211 vitest tests green, fail-soft API (503 not_live flag on, 404 flag off), 30 files all inside P7 paths (checked by ORCH), draft PR #44.
- 2026-09-25 Phase 1 started: A0 and P7 (engine pass) spawned in Agent worktrees.
- 2026-09-25 Phase 0: preflight (prototype v11.2 ok; two untracked archives outside the package excluded locally on owner's answer), integration branch + design package commit, reference capture, OWNERSHIP.json, this file.

NEXT ACTION: wait for P1, P4, P6, P10 (resumed). For each finished agent: `UX11_AGENT=<id> node scripts/ux11-owner-guard.mjs --range origin/feat/ux-v1-v11..origin/<branch>`, check its report, merge --no-ff into feat/ux-v1-v11, push, then fill the free slot in this order: P7 (ranked UI pass, continue ux11/p7-ranked), P2, P3, P5, P8, P9, P11. Spawn prompt = "You are <ID> <name> on the KpopQuiz UX v11 run. Read and follow docs/design/ux-dashboard-v1/v11/briefs/COMMON.md and v11/briefs/<ID>.md." (Agent tool, isolation worktree, background).
