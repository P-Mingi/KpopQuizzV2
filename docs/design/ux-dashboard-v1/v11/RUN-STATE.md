# UX v11.2 run state

Owner of this file: ORCH. Updated and committed after every event (worker prompt section 4b).

- Prototype: `docs/design/ux-dashboard-v1/prototype.html`, `window.UX_VERSION` = `v11.2 (2026-09-25)` (checked 2026-09-25).
- Integration branch: `feat/ux-v1-v11`, cut from `feat/ux-v1-phase2` at `72dcebb`. First commit `f95af79` (design package + `.gitignore` for `apps/quiz/e2e/.auth/`).
- Phase: **2** (page agents, max 4 at once). Check loop: 0.

## Agents

| Id | Branch | Status | Last sha | Open issues | Report |
|---|---|---|---|---|---|
| A0 | ux11/a0-foundation | merged #45 + #50; round 3 running (P11 slot swap, Mark all read, streak copy, search field; P5 sheet title) | a26031b | 0 | v11/reports/A0.md |
| P1 | ux11/p1-home | merged (1bc1cb1, PR #49) after the link-parity fix | d30aee5 | 0 | v11/reports/P1.md |
| P2 | ux11/p2-quizzes | DONE locally, NOT pushed: its branch push was denied by the session permission check; waiting for the owner (ORCH does not push or merge it around the denial) | adea732 | 0 | v11/reports/P2.md |
| P3 | ux11/p3-groups | merged (69fbdee, PR #51) | 6399b50 | 0 | v11/reports/P3.md |
| P4 | ux11/p4-quiz | merged (7a13aa6, PR #46) | 2b57d54 | 0 | v11/reports/P4.md |
| P5 | ux11/p5-create | merged (caff03e, PR #52); fixing one tsc error in its spec (page.route returns a Disposable) | 69c55ca | 0 | v11/reports/P5.md |
| P6 | ux11/p6-blindtest | merged (bedaf6f, PR #47) | 5af008e | 0 | v11/reports/P6.md |
| P7 | ux11/p7-ranked | merged (91a8030, PR #44), engine + page | 0a56f93 | 0 | v11/reports/P7.md |
| P8 | ux11/p8-community | running (resumed 10:00 after an API stall; 9 commits pushed) | adddaab | 0 | v11/reports/P8.md |
| P9 | ux11/p9-leaderboard | running (resumed 10:00 after an API stall; 12 commits pushed) | 39178bf | 0 | v11/reports/P9.md |
| P10 | ux11/p10-passport | merged (2dd8f9f, PR #48) | c74f655 | 0 | v11/reports/P10.md |
| P11 | ux11/p11-notifications | merged (6b17e0e, PR #53); overlay + bell e2e skip until A0 swaps the slots | c4027ef | 0 | v11/reports/P11.md |
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
- Checkers: P10's header-image unit test timed out under a load average near 50 (seen by P7); the a0 streak tests are a date time bomb until A0's PR #50 lands.
- Checkers (from P1): on a local `next start`, a cold home load can hang AVIF image keys for good; warm the images one at a time before measuring. Vercel is not affected.
- Ownership guard: hooks are installed per worktree only (`extensions.worktreeConfig` + `git config --worktree core.hooksPath`),
  never repo-wide; the guard is a no-op when `UX11_AGENT` is unset.

## Pending migrations (written, never applied)

- `docs/pending-migrations/v11-p4-relaxed-runs.sql` (P4): plays.relaxed (play without a timer), excluded from the hall of fame and quiz_time_stats.
- `docs/pending-migrations/v11-p4-rank-for-score.sql` (P4): get_quiz_rank_for_score (guest rank line on results).
- `docs/pending-migrations/v11-p10-header-storage.sql` (P10): the profile-headers storage bucket + policies; both header routes answer 503 before any write until it exists.
- `docs/pending-migrations/v11-p10-email-prefs.sql` (P10): email notification switches (disabled in the UI until applied).
- `docs/pending-migrations/v11-p3-group-quiz-alerts.sql` (P3): group quiz alerts table + RLS + publish trigger (the empty hub's Notify me fails soft until applied).
- `docs/pending-migrations/v11-p7-ranked.sql` (P7): ranked_seasons, ranked_runs (run tokens), ranked_song_stats, ranked_legends; ranked_plays.season + run_token (unique) + index (player_id, season, score desc); 7 service_role-only functions; RLS on, no policy; commented rollback; nightly cron documented, not enabled.

## Owner decisions needed

WAITING ON THE OWNER NOW: P2's branch `ux11/p2-quizzes` (9 commits, adea732, local only, worktree .claude/worktrees/agent-a2b9cc4c27e8fa88a) could not be pushed: the permission check refused the agent's push. Either the owner pushes it (`git push -u origin ux11/p2-quizzes`, then a PR into feat/ux-v1-v11) or tells ORCH to push it.

SECURITY, LIVE SITE (found by P2, confirmed by ORCH in code): /quizzes puts user-written quiz titles into an ld+json script tag with a bare JSON.stringify (titles only length-checked), so a title containing </script> could break out: likely stored XSS. The Verse code already has the escaping sink jsonLdScript (lib/verse/jsonld.tsx). Handed to the owner as a separate task chip (fix on main).

BROKEN LINKS, LIVE SITE (found by P1, confirmed by ORCH): the live home links /quizzes/new and /quizzes/most-liked, both 404; /new and /most-liked are the real pages (the v11 home links those).

BUG IN PRODUCTION TODAY (found by P6, confirmed by ORCH in code): every /blindtest/<mode> page (97) fails on Play. The legacy BlindTestPlayer (components/blind-test/blind-test-player.tsx, YouTube) reads `data.songs[0]`, but /api/blind-test/generate was rewritten for Deezer and returns `questions`. Flag-off code, outside this run; flagged to the owner as a separate task.

1. Production writes as the test user. The local dev server and the preview both use the production Supabase, so every signed-in or guest action that saves something (play a quiz, like, comment, vote, save Your look, upload a header) writes production rows. The worker prompt lets agents act as the test user; the launch prompt says never write production data. Until the owner answers: no mutating request at all, e2e stubs POST/PUT/PATCH/DELETE and asserts the payload, C2 proves wiring by request shape plus read-only SQL. Asked 2026-09-25.
2. Ranked go-live (P7): apply v11-p7-ranked.sql, insert the season 1 row, enable the nightly Legend cron, decide whether ranked runs award blindtest XP (default no).
3. Security, existing (found by P7): the ranked_plays insert policy from migration 059 is open to the public, so anyone can insert forged rows today. Tightening it is an RLS change, out of this run's rules; owner call.
4. /me writes on view (found by A0): viewing /me (and /profile, which redirects there) signed in grants badge tiers and writes passport snapshots. No agent loads them signed in; parity.spec runs only with UX_V1_PARITY=1; P10 verifies the passport through /u/testtest and render tests. Folded into decision 1.
5. Logo (A0): the prototype's pink K tile + "KpopQuiz" (17.1) is shipped under the flag; the live site shows the rabbit mascot. One-line swap in components/ux-v1/brand.tsx.
6. Contrast (A0): name accents and badge rarity words are shown through per-theme AA-clamped tokens (same hue); stored values unchanged.
7. Live ticker online count (DESIGN-SPEC 17.11, already marked pending there): the live component floors the online count with a random 12 to 27. Kept as is unless the owner says otherwise (it is not real data).
8. Group hubs with few quizzes: the worker prompt asks for noindex until 3 quizzes; today's hubs have no robots rule, so it is an SEO diff outside 16.10. Not shipped; owner call.
9. New public URLs under the flag (/community and its posts, /blindtest/ranked): noindex and out of the sitemap until the owner decides.
10. P4: hall of fame shows guests as "someone" or signed-in players only.
11. Security, existing (found by P4): the `battles` table accepts public inserts; P4 only trusts signed challenge links. Tightening is an RLS change, owner call. Optional env UX_P4_CHALLENGE_SECRET for the link signature.
12. P6: should every blindtest (not only the dailies) count for the streak; should free hub plays be recorded and earn XP (XP-farming risk); wire bt_players rank titles; blindtest challenge creation is open to guests (require sign-in or rate limit?); "challenges waiting" needs an invitee column; the Recent hits, Legends and Speed round mixes need generate support.
13. P6: the Intro mode 301 (/blindtest/intro-challenge -> /blindtest) was not done in this run (SEO diff); owner go needed.
14. P10: header storage: create the profile-headers bucket or reuse the avatars bucket; an email sender for the email switches; a "flat theme colour" band mode needs a new column; a real delete-account flow (today the confirm sheet sends the fan to /contact). Signed-in /me is NOT verified live (render test only) until decision 1.
15. P1: QOTD rotation stopped because ensure_daily_quiz only publishes a bank row dated exactly today and nothing was scheduled after 2026-06-30 (the cron still answered ok). The fix ships behind the server env QOTD_ROTATION_FIX=1 (off by default, production cron unchanged); until it is set the home shows the real stored pick labelled "Picked on June 30".
16. Security, existing (found by P1): quiz_bank (migration 018) and quiz_time_stats (032) have write-all RLS policies, so anyone with the anon key could insert a bank row the cron would then publish. Not tested. Tightening is an RLS change, owner call.
17. P1 design changes made to keep every live home link: 6 cards per rail instead of 4 or 5, a "Most liked" link, Verse and Discord lines under the community rows; the 17 hub links sit in the scrolling groups rail in the live order (Cortis is 4th there).
18. P7: Season rewards are shown as designed but not built (build them or hide the section before go-live); no /pt mirror for /blindtest/ranked.
19. P2 deviations: the live H1, intro and breadcrumb (SEO lock) push the grid 64.7px lower than the reference; default sort shown as "Most played" (the live default); ?page=N shows pages 1..N; ?level= is noindex with canonical /quizzes (flag on only); no Language dropdown (?lang= still works); no Create banners; the popular-* subpages are not redesigned. P2 also found that lib/db/queries/popular.ts caches a failed plays read as an empty window for an hour (task chip spawned by P2).
20. P3: groups.quiz_count is stale because handle_new_quiz() only ever adds (it never subtracts on unpublish or delete). The v11 pages count published quizzes, but the SEO-locked texts still show the stale number (BLACKPINK 29 vs 24 published) and the locked blindtest counts come from the old table; the locked /groups intro does not match the 90 listed groups. Fixing the trigger is a DB change; changing the locked texts is an SEO change: owner call for both.
21. P3: /groups (flag on) lists all 90 visible groups and so links the 46 hubs that have no quiz yet (thin pages, shown muted); noindex for thin hubs was not shipped (decision 8). Also for review: hub breadcrumb vs BreadcrumbList, the kept Verse link, Notify me, the FAQ heading (P3 report section 9).
22. Cleanup items for the owner (from A0): give lib/streak.ts streakState an optional `now` so streakView never reads the clock (tests now freeze the clock instead); `turbopack.root` in next.config.ts (dev only, P1's note); once P2 is merged, P2 can drop its copy of the link-option rule now that Segmented and UxDropdown accept href options; the inert Phase 1 `.uxv1-*` CSS in globals.css.
23. P5: /create keeps the live H1 "What's your quiz about?" and intro (SEO lock) instead of the prototype's "Create a quiz" (one line to switch; the page is noindex); the paste format; the new Easy and Hard difficulty lines. Existing bug (found by P5): the legacy create-funnel autosave can re-save a draft it just cleared. Cleanup: like P4, make create-funnel.tsx and question-list-editor.tsx import lib/ux-v1/p5 so there is one copy (a flag-off change). The sign-in callback uses NEXT_PUBLIC_SITE_URL, which matters for OAuth round trips on preview deploys.
24. P11 copy states the real rules: read notifications are cleared after 60 days (not 30); the streak counts only the daily quiz and the daily blindtest. Dismiss and Mute of the live center are kept in a row menu (not drawn in the prototype); four filters; search ranks the closest name first; a song row opens /blindtest/<group mode>, which fails on Play today (the production bug P6 reported). /search itself stays the live page inside the shell (no prototype state).
25. Data (P7): `songs` has no accuracy stats; the ranked 4/4/2 draw uses the curated songs.tier until ranked answers build up ranked_song_stats.

## Log

- 2026-09-26 P11 merged (6b17e0e): guard ok (38 files), notifications page + BellPanel + SearchResults on A0's slot props, read-only /api/ux-v1/p11/search, flag-off identical, SEO and links unchanged on /search and /notifications. Integration: check:routes 330 both ways, unit 738/738, tsc: only P5's spec error (fix in progress). A0 resumed for round 3.
- 2026-09-26 P5 merged (caff03e): guard ok (41 files), p5.spec 45/45, 59 parity unit tests vs the legacy funnel, SEO fields and all 22 hrefs kept on /create. After the merge the full-app tsc showed 1 error in p5.spec.ts (page.route returns a Disposable): P5 fixing; COMMON.md now requires the whole-app tsc (e2e included) and id-prefixed scratch files. P5 asked P8 to open the composer from /community?compose=challenge&quiz=<slug> (relayed).
- 2026-09-26 10:00 API stall: P5, P8, P9, P11 stopped with "no progress for 600s" (stream watchdog). Every branch was pushed; only a few files per worktree were uncommitted; no server left alive. All four resumed from their transcripts with their state listed.
- 2026-09-26 A0 queue merged (7b95070): streak test clock frozen (5bfe147), useUxMe null until mounted, tab hover, share sheet on phones, H1 focus on navigation, /search a real link again (every page's link set back to parity; the only home differences are P1's /quizzes/new and /quizzes/most-liked -> /new and /most-liked, both 404 today), card line-height 1.6, href options for Segmented/UxDropdown. Integration: tsc clean, check:routes 329 both ways, unit 648/648 (CI should be green from here). A0's replies to every request are in v11/requests/A0.md (the guard keeps A0 and ORCH out of other agents' request files). P5, P8, P9, P11 told to merge the integration head before their final checks.
- 2026-09-26 P3 merged (69fbdee): guard ok (49 files), e2e 35/35, flag-off identical on 7 URLs, SEO fields and link set unchanged on 9 URLs except /search (A0 shell, in A0's queue). Integration: tsc clean, check:routes 328 both ways, unit 524/526 (streak time bomb). P11 spawned: all page agents now started.
- 2026-09-26 P1 re-done (all 17 live hub links in the rail, full link-set proof) and merged (1bc1cb1); P7 merged (91a8030). Integration: tsc clean, check:routes 327 both ways, unit 494/496 (the 2 streak time-bomb tests). P2 finished but its push was denied by the permission check: left for the owner. P5, P8, P9 spawned. A0 opened PR #50 (queue) and got 3 more items; P3 opened PR #51.
- 2026-09-26 P1 finished (PR #49, guard ok 65 files, p1.spec 37/37) but NOT merged: its flag-on home server-renders 11 group hub links vs 18 on the live home (lost /cortis-quiz, /exo-quiz, /itzy-quiz, /ive-quiz, /le-sserafim-quiz, /txt-quiz + 1). Rule 6 blocker, sent back. COMMON.md done-when 5 now requires the full link-set diff; running agents told. P1's A0 request (focus H1 on client navigation) added to A0's queue.
- 2026-09-26 P10 merged (2dd8f9f): guard ok (51 files), tsc clean, check:routes 318 both ways, flag-off diff identical on 8 pages (per P10), test user's rows unchanged since 2026-09-22. Unit run on integration: 240/242; the 2 failures are A0's streak-view tests, a time bomb (lib/streak.ts streakState reads the wall clock while the tests pin now to 2026-09-25); product behaviour is right; A0 fixes the test with a frozen system clock. P3 spawned in P10's slot; A0 resumed for its request queue.
- 2026-09-26 P7 UI pass started (resumed agent) and P2 spawned. The blindtest mode-page bug was handed to the owner as a separate task chip (fix on main, outside this run). P1 told to read Continue playing through lib/ux-v1/p4/continue.ts.
- 2026-09-26 P4 merged (7a13aa6) and P6 merged (bedaf6f): guard ok (66 and 51 files), tsc clean, check:routes 315 both ways, 84 unit tests green on integration. P4: quiz rules in lib/ux-v1/p4/engine.ts with a parity test that transpiles quiz-player.tsx and compares results and save-payload keys; making quiz-player.tsx import the engine is a flag-off change, left for the owner's cleanup. P6: challenges use `challenges`/`challenge_attempts`, P4's use `battles`, both as WIRING-MAP rows 79 and 255 say. A0 request queue: P4 (useUxMe null until mounted; ShareSheet on phones). Open: /pt/blindtest unowned; /g/[slug] unchanged (no prototype state).
- 2026-09-25 23:51 Usage limit: P1, P4, P6, P10 were stopped by the account session limit (reset 23:50) after pushing part of their work. All four resumed from their transcripts with their live servers listed (next servers of the ask-link project on this machine are not ours, never touched). Lesson for the run: agents commit and push after every meaningful step.
- 2026-09-25 Briefs written to v11/briefs/ (COMMON + one per page agent) so spawns and respawns are short and identical. OWNERSHIP: /g/** moved P3 -> P6 (blind-test game). Open item: the /pt pages (unowned) render their current content inside the v11 shell under the flag; SEO unchanged; re-skin is an owner call.
- 2026-09-25 RESUME: the previous ORCH session ended with P1, P4, P6, P10 stopped mid-task. Checked against git: worktrees intact under .claude/worktrees/agent-*, no branch pushed, no dev server alive. All four resumed from their own transcripts (not respawned) with orders to commit any uncommitted work first, update their Progress block and push their branch before continuing. Resume recipe for the next restart: resume a stopped agent by messaging its agent id (its transcript is kept); respawn with its brief + "continue from your branch and your Progress block" only if resuming fails.
- 2026-09-25 A0 merged into feat/ux-v1-v11 (2cad6a7): guard ok on 105 files, flag-off proof (DOM/head/JSON-LD/CSS identical, 0 px), kit + shell specs green. ORCH a20e709: /ux-v1/ and /community known only with the flag on (flag off keeps the 301), check:routes 306 both ways. Page CSS convention: styles/ux-v1/<id>.css, never imported.
- 2026-09-25 Phase 2 started: P1, P4, P6, P10 spawned.
- 2026-09-25 P7 engine pass done: 211 vitest tests green, fail-soft API (503 not_live flag on, 404 flag off), 30 files all inside P7 paths (checked by ORCH), draft PR #44.
- 2026-09-25 Phase 1 started: A0 and P7 (engine pass) spawned in Agent worktrees.
- 2026-09-25 Phase 0: preflight (prototype v11.2 ok; two untracked archives outside the package excluded locally on owner's answer), integration branch + design package commit, reference capture, OWNERSHIP.json, this file.

NEXT ACTION: wait for P5 (tsc fix), P8, P9 and A0 round 3; merge each after guard + report + whole-app tsc. P2 waits for the owner's push. When all pages are merged: build the integration head with the flag on in .worktrees/ux11-integration, serve it on :3021, spawn C1, C2, C3 (briefs/CHECKERS.md + C<n>.md).
