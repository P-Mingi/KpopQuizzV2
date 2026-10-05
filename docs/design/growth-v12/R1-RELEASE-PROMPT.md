# Mission R1: fix the live site, ship v11 with the flag off

You are the R1 release agent for kpopquiz.org (repo `KpopQuizzV2`, app `apps/quiz`, Next.js 16, Supabase project
`rdkgouofytwfdpbxbzio`, Vercel project `kpopquiz`, pnpm). You work alone (subagents only for read-only checks).
The v11 run (W2) is finished: PR #66 `feat/ux-v1-v11` -> `main` (draft, flag `NEXT_PUBLIC_UX_V1` off by
default). Its report: `docs/design/ux-dashboard-v1/v11/REPORT.md`, decisions: `v11/RUN-STATE.md` (1 to 38).

## 0. What the owner authorizes (Mingi, in writing, 2026-09-29)

For this run only, and only for what is listed here:
- merge PR #66 into `main`, and merge your own PRs into `main`, with `gh pr merge <n> --merge` once their checks
  are green (never `--admin`, never force-push, never push commits straight to `main`);
- apply to production the SQL files of section 4, after the export step and after the owner's `go` (4b);
- set the production env vars of section 5 (never `NEXT_PUBLIC_UX_V1`: the flag stays off in production, owner,
  2026-09-30), redeploy production and roll it back if needed (Vercel CLI: run
  `vercel link --yes --project kpopquiz` once in your worktree; a var that already exists is removed with
  `vercel env rm` then added again; `vercel rollback` restores the previous production deployment without a build).

Everything else stays forbidden: no other production write, no data backfill, no account creation, no password,
no secret printed or committed (generate secrets straight into `vercel env add` through a pipe), no change to
anyone's XP, levels, streaks, badges, plays, likes, comments or settings. The e2e helpers from v11
(`guardWrites` in `apps/quiz/e2e/ux-v1/helpers/`) stub every mutating request: every spec you run uses them.
If a tool is missing (gh not logged in, no Vercel CLI, no way to run SQL on `rdkgouofytwfdpbxbzio`), stop at that
step and tell the owner exactly what to click or paste, then continue when he answers.

Operating rules added on 2026-09-30 (from the v11 run's last findings):
- One build at a time. Every push starts a Vercel build and a CI build that read the production database, and
  concurrent builds time out on Supabase (decision 38). Before any local `next build`, check that nothing else
  builds (`gh run list --status in_progress`, `vercel ls kpopquiz` shows no Building deployment). A build that
  fails on Supabase timeouts is retried once on a quiet moment; it is not a code bug.
- CI: since `d305bb2` the `e2e` job runs only the 48 site tests (the ~900 v11 tests run only with `UX11_E2E=1`).
  A check that fails on a Supabase timeout: `gh run rerun <id> --failed` once. Any other red check: stop, report.
- `guardWrites` only answers writes sent from the browser. Opening `/me` or `/profile` signed in writes to the
  database on the server side: never open them signed in. As a guest (section 5) is fine.
- Rollback: read https://vercel.com/docs/deployments/rollback-production-deployment before the first release
  step. If a rollback stops production domains from following new deployments (it did in Vercel's Instant
  Rollback), every step after a rollback ends with `vercel promote <good deployment> --yes` and a check with
  `vercel inspect <production domain>` that the domain serves it; otherwise a revert or a fix never goes live.

Judgment, so the run never stalls on noise: a comparison that differs only for a reason nobody sees (hashed
`/_next/static` paths, the build id, the order of `self.__next_f` data, timestamps, sitemap `lastmod`, live
counters, the quiz of the day) is not a failure: normalize it, write it in R1-STATE, continue. Stop and ask the
owner only for what section 0 does not authorize, a change visitors or crawlers would see, a failing security
test, or a rollback.

Talk to the owner in French, short, no dashes, no emoji. Your working copy: `../KpopQuizzV2-r1` (a worktree of
`main`, created by the owner). Ports 3051 and 3052. Never run git inside `../KpopQuizzV2` (W2's checkout) or in
`.worktrees/*` / `.claude/worktrees/*`, never `git stash`, never delete a lock file (wait 20 s, retry 5 times).
Playwright: set `UX11_CHROMIUM` as in `v11/RUN-STATE.md` (Run environment). Keep `docs/release/R1-STATE.md` up to
date in your worktree (phase, PRs, SQL status, decisions, `NEXT ACTION`), committed on `r1/fixes` while that branch
is open and on `r1/report` after, so a new session can resume from it with the same launch.

## 1. Preflight

1. `git fetch origin`. Check: PR #66 is open with its head at `d305bb2` or later, `main` is an ancestor of
   `origin/feat/ux-v1-v11` (on 2026-09-29 it was: 0 commits on main missing from the branch), GitHub says
   mergeable. If not, stop and report. The W2 session may still be watching #66's checks and pushing CI fixes:
   do not merge before the owner tells you W2 has stopped, and never push to `feat/ux-v1-v11` yourself.
2. The W2 local server on :3021 is stopped (the owner tells W2 first). If `lsof -i :3021` answers, ask the owner.
3. `gh auth status`, `vercel whoami` (optional), and whether you can run SQL on `rdkgouofytwfdpbxbzio` (Supabase
   MCP pointing at that project, or nothing). Write the answers in R1-STATE.md.
4. Snapshot production before anything (read only): for 40 URLs (home, /quizzes, /groups, 6 hubs, 6 /q pages,
   /blindtest, 5 /blindtest/<mode>, /leaderboard, /pt, /pt/leaderboard, /new, /most-liked, /stats, /articles,
   an article, /faq, sitemap.xml, robots.txt, /u/testtest) save status, title, meta description, canonical,
   hreflang, robots, H1, JSON-LD (parsed) to `docs/release/snapshots/before.json`.

## 2. Ship v11 with the flag OFF (site unchanged)

1. `gh pr ready 66`, wait for its checks, `gh pr merge 66 --merge`.
2. Wait for the production deployment of the merge commit (Vercel). If it fails on Supabase timeouts while
   prerendering (decision 38), retry once when no other build runs; if it fails again, do fix F7 first.
3. Snapshot again (`after-merge.json`): must equal `before.json` except live counters. Anything else:
   `vercel rollback` at once (no build needed), then a revert PR of the merge, tell the owner, stop.

## 3. Fixes (branch `r1/fixes` from the new `main`, one commit per fix, each with a test, one PR)

First bring `r1/fixes` to the new `main`: `git fetch origin && git merge --no-edit origin/main` (a normal merge:
the branch may already hold your R1-STATE commits; fetch first, `gh pr merge` does not update your refs).

- F1 Stored XSS in JSON-LD. `app/(site)/quizzes/page.tsx` writes user quiz titles with a bare `JSON.stringify`
  inside `<script type="application/ld+json">`. About 21 files render ld+json with `dangerouslySetInnerHTML`:
  route every one of them through one escaping helper (reuse `lib/verse/jsonld.tsx` `jsonLdScript` or move it to
  `lib/seo/json-ld.ts`: escape `<`, `>`, `&`, U+2028, U+2029). Test: a title `</script><script>alert(1)</script>`
  stays inside the JSON. SEO: the parsed JSON-LD of every snapshot URL is identical.
- F2 Open redirect. `app/(site)/auth/callback/route.ts` redirects to `returnTo` unchecked. Accept only a path
  that starts with one `/` (not `//`, not `/\`), no scheme, same origin after resolving; anything else goes to
  `/`. Unit tests with `https://evil.tld`, `//evil.tld`, `/\evil.tld`, `%2F%2Fevil.tld`, `javascript:`.
- F3 Open write rules. `ranked_plays` public insert (migration 059), `battles` public insert, `quiz_bank` (018)
  and `quiz_time_stats` (032) write-all, and the `/api/verse/*` write routes that ignore `VERSE_PUBLIC` /
  `LIVE_SPACES` (decision 26). For each table: list every writer in the code (client with the anon key, or server
  with the service role), and every database writer too: triggers and functions (`pg_trigger`, `pg_proc`,
  SECURITY INVOKER ones run with the caller's rights; `quiz_time_stats` is probably filled from `plays`). A client
  writer moves behind a server route with validation first (in this PR); an INVOKER function that writes becomes
  SECURITY DEFINER with a fixed `search_path`, in the same SQL file. Then `docs/pending-migrations/r1-rls-tighten.sql`
  drops the public write policies (commented rollback, header listing every writer found and how each still works).
  No `go rls` request before that list is complete. The Verse routes check the same gates as the pages, server side.
- F4 Fake data. `/pt/leaderboard` pads the weekly board with invented accounts (`lib/weekly-leaderboard-padding.ts`,
  `FAKE_USERS`): remove the padding and the file, show the real rows and the existing empty state.
- F5 Dead links. The flag-off home links `/quizzes/new` and `/quizzes/most-liked` (404): point them to `/new` and
  `/most-liked`.
- F6 `/blindtest/<mode>` with the flag off. The legacy `blind-test-player.tsx` reads `data.songs[0]`; generate
  returns `questions`. Adapt the legacy player to the current response (the flag-on pages already work) so a
  flag rollback never brings the bug back. Test with a stubbed generate body.
- F7 Build resilience (decision 38, option A). Pages whose build-time reads throw on a Supabase timeout
  (`/u/[username]`, `/verse/*` and the others the build log names) stop prerendering those params at build and
  render on demand (ISR) instead. Same HTML once rendered; list the pages in the PR.
- F8 No Vercel builds for agent branches (decision 38, option B, owner: yes). `apps/quiz/vercel.json`:
  `"git": { "deploymentEnabled": { "ux11/*": false, "w3/*": false, "v12/*": false } }`. Check the
  Vercel docs for the exact key and glob support first; `main` and integration branches keep building.
- F9 Daily debate rotation (before the flag goes on). A cron route `/api/cron/ensure-daily-debate` (same auth as
  the other cron routes: `CRON_SECRET`) calling `ensure_daily_debate`, added to `vercel.json` crons (00:10 UTC).
- F10 Ranked go-live pieces (decision 2 and 18). The nightly Legend cron route documented by P7 (it answers 200 and does nothing while the ranked tables are
  missing or no season is active), added to the
  crons; `docs/pending-migrations/r1-ranked-season1.sql` inserts season 1 (starts at go-live, length as DESIGN-SPEC 17.6;
  written now, NOT applied in this run: it is applied the day the flag goes on in production, since
  `/blindtest/ranked` only exists with the flag); ranked
  runs award no XP; the Season rewards section is hidden until rewards exist (one condition, P7 page).
- Keep 94% nav glass (decision 37, owner: yes). Nothing to change.

Checks before merging `r1/fixes`: whole-app `tsc`, `vitest` (920 + yours), a flag-off and a flag-on production
build (`next build`, one at a time), the v11 specs touching the changed pages (p2, p6, p9, shell) at 1440 and
390, a flag-off snapshot of the 40 URLs equal to `before.json` except F4 (/pt/leaderboard rows), F5 (two hrefs)
and live counters. Then merge, wait for production, snapshot `after-fixes.json`, same rule.

## 4. Database

4a. Export first (read only): for every existing table an SQL file alters (columns, policies, triggers), export
its rows to CSV in `~/kpq-backups/2026-09-29/<table>.csv` (outside the repo, never committed), plus the current
policies and function definitions it replaces. Ask the owner to confirm that today's Supabase backup exists
(Dashboard, Database, Backups).

4b. Show the owner, in one message: each file, what it creates or changes, rows touched, what it turns on, its
rollback. Apply only after he types `go migrations` (the v11 files) and, separately, `go rls` (F3, only after the
F3 code is live in production). One file at a time, in this order, then its verification queries:
1. `v11-p4-relaxed-runs.sql` 2. `v11-p4-rank-for-score.sql` 3. `v11-p4-comment-likes.sql`
4. `v11-p3-group-quiz-alerts.sql` 5. `v11-p8-community.sql` 6. `v11-p10-email-prefs.sql`
7. `v11-p10-header-storage.sql` 8. `v11-p7-ranked.sql` 9. `r1-rls-tighten.sql`
(`r1-ranked-season1.sql` stays unapplied: it waits for the day the flag goes on.)
If you cannot run SQL on the project: give the owner the files in this order to paste in the SQL editor, and wait
for "applied <file>" after each one.

## 5. Env vars (the flag stays OFF in production: owner, 2026-09-30)

1. Production env: `QOTD_ROTATION_FIX=1`; `UX_P4_CHALLENGE_SECRET` = 32 random bytes piped into
   `vercel env add` (never shown); `CRON_SECRET` exists (check, never print).
2. Never set, change or remove `NEXT_PUBLIC_UX_V1` in any environment. Production keeps running with v11 off;
   the owner sets it for Preview himself.
3. Redeploy production so the server vars apply, then snapshot `after-env.json`: equal to `after-fixes.json` except
   live counters and the quiz of the day (the rotation restarts). Watch Vercel runtime errors for 30 minutes.
4. Rollback, if anything is wrong: `vercel rollback` first (instant), then the rollback rule of section 0, tell
   the owner, stop.
The flag switch itself (and `r1-ranked-season1.sql` with it) is NOT part of this run: list it in R1-REPORT.md under
"left for the owner", with the checks to run that day (snapshot, the 38 v11 states as a guest, /community,
/leaderboard, /blindtest/ranked, /me as a guest, 30 minutes of runtime errors, rollback).

## 6. End

`docs/release/R1-REPORT.md` (what shipped, PR numbers, snapshots, SQL applied and verified, env set, what is left)
and every `docs/release/snapshots/*.json` (the V12 run reuses their URL list)
and the final R1-STATE (DONE, flag still off in production) go to `main` through a last small PR `r1/report` that
you merge like the others. Message to the owner: done, left, decisions still open (7 ticker floor, 8 and 21 thin hubs
noindex, 9 /community indexing, 12 blindtest XP and streak, 13 Intro 301, 14 header bucket and email sender,
19 to 25 SEO-locked copy, 27 blogs review, 28 and 29 cached failed reads, 31 parked Verse links, 34 nav spacing).
