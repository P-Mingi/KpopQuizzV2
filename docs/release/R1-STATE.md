# R1 release state

Owner of this file: the R1 release agent. Prompt: `docs/design/growth-v12/R1-RELEASE-PROMPT.md` (on disk in the
main checkout). Working copy: `../KpopQuizzV2-r1`, branch `r1/report` (from main after PR #88; `r1/fixes` is merged). The flag `NEXT_PUBLIC_UX_V1` stays OFF in
production for the whole run (owner, 2026-09-30); R1 never sets, changes or removes it.

- Phase: **3 done (fixes live in production). 4 (database): exports done, waiting for the owner (backup confirmed, preflight result, `go migrations`).** Started 2026-10-01 by the owner, in the former W2 session
  ("New mission: R1"; the W2 conditions are met: its :3021 server is off, PR #66 checks are green on `d305bb2`).

## Preflight (2026-10-01)

- PR #66: open, draft, head `d305bb2`, MERGEABLE / CLEAN, 5 checks green, 1 skipped by design. `origin/main`
  (`450f053`) is an ancestor of `origin/feat/ux-v1-v11`, 0 commits on main missing from the branch. `main` has no
  branch protection.
- :3021: nothing listens. No build in progress on GitHub.
- Tools: `gh` logged in (P-Mingi, scopes repo + workflow). Vercel CLI 59.4.0 logged in (p-mingi), worktree linked to
  `p-mingis-projects/kpopquiz` (the `.env.local` with an OIDC token that `vercel link` wrote was deleted, the
  `.gitignore` change reverted). **SQL: no access.** The Supabase connector of this session only sees the Pricely
  project, never to be touched; for `rdkgouofytwfdpbxbzio` the owner pastes each file in the SQL editor and
  answers "applied <file>" (prompt section 4b).
- Vercel env (names only): `NEXT_PUBLIC_UX_V1` exists only for Preview on branch `feat/ux-v1-v11`, not for
  Production. `CRON_SECRET` exists for Production. `QOTD_ROTATION_FIX` and `UX_P4_CHALLENGE_SECRET` are not set.
- Production before the run: deployment `dpl_EFeDUcVmFJJdj7PsAAvLpVx1KTX2`
  (`kpopquiz-15753ssy9-p-mingis-projects.vercel.app`, 2026-09-21, commit `450f053`). **This is the rollback target.**
- Rollback rule, read in Vercel's docs (`/docs/instant-rollback`, 2026-10-01): "After a rollback, Vercel turns off
  auto-assignment of production domains. This means new pushes to your production branch won't go live
  automatically." `vercel promote <deployment>` undoes it and restores auto-assignment. A rollback also brings the
  cron jobs back to the rolled-back deployment's state and does not change env vars. So: every step after a
  rollback ends with `vercel promote <good deployment> --yes` and `vercel inspect kpopquiz.org`.
- Snapshot script: `docs/release/snapshot.mjs` (GET only, 40 URLs: status, redirect, title, description,
  canonical, hreflang, robots, og, H1, parsed JSON-LD, internal links; sitemap as a sorted URL list without
  lastmod; robots.txt body). `docs/release/snapshots/before.json` taken 2026-10-01: 40 / 40 answer 200, sitemap
  645 URLs. Natural variance between two snapshots one minute apart: one link on `/pt/leaderboard` (the random
  fake accounts, removed by F4); nothing else.
- A second Claude session was open in this worktree's terminal since 2026-09-30 with an empty prompt (no
  transcript, nothing done). The owner was asked to close it: one R1 only.

## PRs

| PR | What | Status |
|---|---|---|
| #66 | v11 behind the flag (feat/ux-v1-v11 -> main) | MERGED 2026-10-01 10:33 UTC, merge commit `9affc2e` |
| #88 | R1 fixes F1 to F11 (r1/fixes -> main) | MERGED 2026-10-01 11:22 UTC, merge commit `09ae1a1`, checks green (unit, e2e, Vercel) |

## Section 2 result (2026-10-01)

- Production deployment of `9affc2e`: `dpl_5J83dTjwFr7Ji7gkdnnzrPadqRvN` (`kpopquiz-n2nrieowg`), READY at the first
  build, `kpopquiz.org` serves it. CI on main: Tests (unit + e2e) green.
- `after-merge.json` vs `before.json`: 40 / 40 answer 200; status, title, canonical, robots, hreflang, H1, og and
  `robots.txt` identical on every URL. Differences, all data refreshed by the new build, none from v11 code:
  play counters and dateModified in JSON-LD and one meta description (910 -> 911 plays); the news feed; /stats
  top list; `/easy-kpop-quizzes` shows its 10 quizzes again (the old deployment had cached an empty list, the
  legacy cached failed read of decision 28); the sitemap went from 645 to 661 URLs: 9 new quizzes, /tuide-quiz,
  /illit-trivia, 3 pulse months, and `/verse` + `/verse/promises` (sitemap.ts, unchanged by v11, drops the whole
  Verse block when its seed query passes 8 s at build time; the old build had hit that timeout).
- One visible change, not from v11 code: the home footer now shows the "Portugues" language link (`/pt`) like the
  8 other translated pages. `locale-switcher.tsx`, `footer.tsx`, the middleware and the flag-off branches of the
  layouts and of the home are unchanged; the old deployment's cached home did not render it, the fresh build does.
  Not a rollback case. Re-checked 2026-10-01 11:07 UTC, after the home regenerated itself (age 568 s): the link is
  gone again, the home is exactly as before the merge. It only appears on the build-time render of a fresh
  deployment, on main before v11 as well.
- "SEO gates" workflow on main: its `docs-secrets` job is red. It was already red every night before the merge (1
  hit); the merge brought 49 more: 37 `URL-WITH-CREDENTIALS` are false positives (the pattern reads
  `https://schema.org","@type"` in JSON-LD dumps of the v11 reports as user:password@), 12 emails are placeholders
  (`example.com`, the commit attribution address) or bytes in PNG / WEBP files. No key, token or password hit.
  **One real finding, for the owner:** `docs/design/ux-dashboard-v1/DECISIONS-LOG.md` (design package, public on
  GitHub since 2026-09-25) holds the email of the parity test account `testtest`, a public disposable mailbox:
  anyone can read that inbox and get a sign-in link for the account. Owner action: change the account's email to
  a private address (Supabase, Authentication, Users) and update `UX_V1_TEST_EMAIL` in Vercel and GitHub. R1 makes
  the gate green again in `r1/fixes` (fix F11: pattern, binary files, placeholders, the address replaced by a
  placeholder in the doc).

## Section 3: fixes on `r1/fixes` (2026-10-01, one commit each, each with a test)

| Fix | Commit | What |
|---|---|---|
| F1 | 18d3f96 | One escaping serializer for every ld+json block (`lib/seo/json-ld.ts`), 39 call sites in 21 files; the Verse sink reuses it; a test scans src for a bare JSON.stringify next to dangerouslySetInnerHTML. |
| F2 | 67c0190 | `lib/auth/return-to.ts`: returnTo accepts same-site paths only, in /auth/callback, the onboarding form and the login page's guest link (three sinks, not one). |
| F4 | b80ca91 | /pt/leaderboard: the padding with invented accounts and its file are removed. |
| F5 | cdcc877 | Home "See all" links: /quizzes/new -> /new, /quizzes/most-liked -> /most-liked. |
| F6 | 147fd55, 8df75c8 | The flag-off /blindtest/<mode> player plays the current generate response (Deezer previews) through `lib/blind-test/legacy-round.ts`; played end to end on a dev server (10 songs, verdicts, results, one POST to generate, no write). It no longer calls /api/blind-test/play. 8df75c8 keeps the YouTube global type two other files use. |
| F3 | 1081085 | Server writers moved to the service role with validation (challenge -> battles, play -> quiz_time_stats via `lib/quiz/time-stats.ts`); `verseWriteGate` on the 64 write handlers of /api/verse (47 routes); `docs/pending-migrations/r1-rls-tighten.sql` written, NOT applied; `docs/release/r1-rls-inventory.sql` = the read-only catalog query the owner runs before `go rls`. |
| F7 | 8b88903 | /u/[username] prerenders no profile at build (ISR on first request, same HTML); /verse retries its directory read during `next build`. |
| F8 | 01984ea | `git.deploymentEnabled`: ux11/*, w3/*, v12/* do not build on Vercel (minimatch keys, read in Vercel's docs); main, feat/*, r1/* still build. |
| F9 | 21ab227 | /api/cron/ensure-daily-debate, 00:10 UTC, Bearer CRON_SECRET (`lib/cron-auth.ts`). |
| F10 | 8fd9eaa | /api/ranked/cron/nightly scheduled 00:20 UTC, answers 200 and does nothing while the flag is off, the migration is missing or no season exists; `r1-ranked-season1.sql` written, NOT applied (the day the flag goes on); Season rewards hidden behind SEASON_REWARDS_LIVE = false; no XP in ranked (test). |
| F11 | 56c56a9 | The docs secret gate is green again (pattern, placeholders, binary files); the test account's address is removed from DECISIONS-LOG.md. |

Checks before the merge (2026-10-01), all green: whole-app tsc 0; vitest 980 / 980 (46 files; 920 before + 60
new); `check:docs-secrets` passes (2391 files); flag-off production build (`VERSE_PUBLIC=false`, 787 static pages,
0 Supabase timeouts), served on :3052 and compared with production on the 40 URLs
(`snapshots/local-fixes-flag-off.json`): status, title, description, canonical, hreflang, robots, og, H1 identical
on every URL, sitemap identical (661), robots.txt identical, JSON-LD identical once parsed apart from play
counters and dates; differences: /pt/leaderboard without the three invented accounts (F4), the two home hrefs
(F5), the home's `/pt` footer link of a build-time render (see section 2). Flag-on production build green; v11
specs p2, p6, p7, p9, shell at 1440 and 390 on it: 232 passed, 13 skipped by design, 0 failed (5.3 min),
guardWrites on. The nightly "SEO gates" run on main 9affc2e: its four SEO checks pass, only docs-secrets is red
(fixed by F11). The test user's session file was deleted after the specs.

Choices made, for the owner's information:
- F6 does not record plays or award XP (the flag-off hub and the v11 game do not either; decision 12 stays open).
  Nothing calls POST /api/blind-test/play any more: it trusts a client-sent score to award up to 50 XP per call to
  a signed-in user, with no limit. Left in place (not in F1 to F10); to close or validate (owner, or the v12
  blindtest tracking).
- F3 keeps to the four tables the owner listed. `battle_results` and `pending_questions` (migration 073) have the
  same public insert policy: left for the owner (the challenge attempt route inserts battle_results with the
  user's session).
- F3 Verse gate: a request that names only its own row id (review a suggestion, resolve a flag, edit an essay by
  id, the profile shelf) is covered by the hidden-Verse gate and by the route's own curator check, not by the
  parked-space check. While VERSE_PUBLIC is off (production today) every Verse write is admin only.
- The ten existing cron routes accept `x-vercel-cron: 1` as proof of a Vercel cron; Vercel's docs only document
  the Bearer CRON_SECRET header, so that header may be sendable by anyone. Not tested (it would run production
  jobs), not changed; the two new routes ask for the secret only.
- A local build needs real `node_modules` in this worktree (`pnpm install --frozen-lockfile --offline`): Turbopack
  refuses a node_modules symlink that leaves the project root. `apps/quiz/.env.local` is still a symlink to the
  main checkout's file; it sets VERSE_PUBLIC=true, so local builds here pass `VERSE_PUBLIC=false` to match
  production.

## Section 3 result: fixes in production (2026-10-01)

- Production deployment of `09ae1a1`: `dpl_AiKBeREqmsz9hKJZk5tt1yMCwk4L` (`kpopquiz-psgwly0fa`), READY at the first
  build; `kpopquiz.org` serves it. CI on main: Tests green, SEO gates green (docs-secrets included).
  Rollback target if needed: `dpl_5J83dTjwFr7Ji7gkdnnzrPadqRvN` (9affc2e), then `vercel promote`.
- `after-fixes.json` vs production one minute before the merge: 0 SEO field differences on the 40 URLs, sitemap
  661 = 661, robots.txt identical. Differences: home hrefs /quizzes/new and /quizzes/most-liked -> /new and
  /most-liked (F5), the three invented accounts gone from /pt/leaderboard (F4), /stats dateModified, and the
  build-time `/pt` footer link of a fresh deployment (section 2).
- Verified on production with read-only requests: /blindtest/girl-groups shows an enabled Play and the run line,
  POST /api/blind-test/generate with the player's body answers 10 questions with https previews (F6); the 5
  ld+json blocks of /quizzes hold no raw `<` or `&` and parse (F1); no invented name on /pt/leaderboard (F4);
  /api/cron/ensure-daily-debate answers 401 without the secret, and 401 with only `x-vercel-cron: 1` (F9);
  /api/ranked/cron/nightly answers 404 to an unauthorized caller with the flag off (F10).
- The two new crons run from tonight: ensure-daily-debate 00:10 UTC (idempotent write of the day's debate, as
  the legacy /leaderboard view already does), ranked nightly 00:20 UTC (does nothing: flag off).

## SQL

Nothing applied yet. No SQL access from this session: the owner pastes each file in the SQL editor of project
`rdkgouofytwfdpbxbzio` and answers "applied <file>".

- 4a done 2026-10-01: read-only export through the REST API (`docs/release/export-tables.mjs`) to
  `~/kpq-backups/2026-10-01/` (outside the repo): plays 69266 rows, quizzes 441, battles 2578, quiz_bank 100,
  quiz_time_stats 2213, notification_prefs 3, ranked_plays 0. Each CSV re-parsed: row counts match.
- Waiting for the owner: (1) today's Supabase backup exists (Dashboard, Database, Backups); (2) the result of
  `docs/release/r1-migrations-preflight.sql` (expected: only "rows" lines); (3) `go migrations`.
- Order after `go migrations`, one file at a time with its check queries:
  1 `v11-p4-relaxed-runs.sql` 2 `v11-p4-rank-for-score.sql` 3 `v11-p4-comment-likes.sql`
  4 `v11-p3-group-quiz-alerts.sql` 5 `v11-p8-community.sql` 6 `v11-p10-email-prefs.sql`
  7 `v11-p10-header-storage.sql` 8 `v11-p7-ranked.sql`.
- Then, separately: the result of `docs/release/r1-rls-inventory.sql`, checked against the header of
  `r1-rls-tighten.sql`, then `go rls`, then 9 `r1-rls-tighten.sql` (the F3 code is live since 09ae1a1).
- `r1-ranked-season1.sql`: written, NOT applied in this run (the day the flag goes on).

## Decisions and notes

- Normalized, not failures: hashed `/_next/static` paths, build id, `self.__next_f` order, timestamps, sitemap
  lastmod, live counters, the quiz of the day.

NEXT ACTION: wait for the owner's answers of section 4 (backup confirmed, preflight result, `go migrations`).
Then give the files one at a time (`pbcopy < docs/pending-migrations/<file>`), wait for "applied <file>" and the
output of its check queries, record each in this file. Then the RLS inventory, `go rls`, file 9. Then section 5:
`vercel env add QOTD_ROTATION_FIX production` (value 1), `UX_P4_CHALLENGE_SECRET` = 32 random bytes piped in,
never shown; CRON_SECRET exists; redeploy production (`vercel redeploy` of the current production deployment or
`vercel --prod`), snapshot `after-env.json`, watch runtime errors 30 minutes. Never touch NEXT_PUBLIC_UX_V1. Then
section 6: R1-REPORT.md, final R1-STATE (DONE), snapshots, PR `r1/report` into main, merge when green.
