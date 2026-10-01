# R1 release report

Status: **DONE (2026-10-01). The flag `NEXT_PUBLIC_UX_V1` is still off in production.**

R1 shipped the v11 redesign to `main` with its flag off, fixed what the v11 run had found on the live site,
applied the v11 database files and closed the open write rules. The flag `NEXT_PUBLIC_UX_V1` was never set,
changed or removed by R1: production runs today's site. Run log and every decision: `docs/release/R1-STATE.md`.

## 1. What shipped

| PR | What | Merged (UTC) | Commit on main | Production deployment |
|---|---|---|---|---|
| #66 | UX v11.2 on every page, behind `NEXT_PUBLIC_UX_V1` (off) | 2026-10-01 10:33 | `9affc2e` | `dpl_5J83dTjwFr7Ji7gkdnnzrPadqRvN` |
| #88 | Fixes F1 to F11 | 2026-10-01 11:22 | `09ae1a1` | `dpl_AiKBeREqmsz9hKJZk5tt1yMCwk4L` |
| #89 | Second pass: cron routes check CRON_SECRET, retired XP route, battle_results on the server, RLS file for six tables | 2026-10-01 18:36 | `4cc1904` | `dpl_3CrTh9ucevigc2iCVWuWwcSsmUMy` |
| (this PR) | R1 report, state, snapshots, SQL apply bundles (docs only) | 2026-10-01 | see `git log` | docs only, same site |

Every merge: `gh pr merge --merge` with all checks green (unit, e2e, Vercel); production built at the first
attempt each time; no rollback was needed.

### Fixes (PR #88)

| Fix | What was wrong | What changed |
|---|---|---|
| F1 | A quiz title, username or thread title containing `</script>` could close an inline ld+json script (stored XSS) | One escaping serializer (`lib/seo/json-ld.ts`) for the 39 ld+json blocks of 21 files; parsed JSON-LD identical; a test scans for a bare JSON.stringify next to dangerouslySetInnerHTML |
| F2 | `/auth/callback` redirected to any `returnTo` (open redirect after sign-in); the onboarding form and the login page's guest link used it too | `lib/auth/return-to.ts`: same-site paths only, in the three places |
| F3 | Four tables writable by anyone holding the public anon key; the 64 write handlers of `/api/verse/*` ignored the Verse gates | Server writers moved to the service role with validation; `verseWriteGate` on every Verse write handler (a hidden Verse or a parked space is admin only); the RLS file (section 3) |
| F4 | `/pt/leaderboard` padded the weekly board with invented accounts | Padding and its file removed |
| F5 | The home linked `/quizzes/new` and `/quizzes/most-liked` (404) | `/new` and `/most-liked` |
| F6 | Play failed on every `/blindtest/<mode>` page (the player read a response shape the generate route no longer serves) | The player plays the current response (Deezer previews); a run saves nothing |
| F7 | One Supabase timeout while prerendering `/u/<username>` failed a whole build (three Vercel builds in a week) | Profiles render on first request (ISR), same HTML; `/verse` retries its read during `next build` |
| F8 | Every pushed agent branch got a Vercel build reading the production database | `git.deploymentEnabled`: `ux11/*`, `w3/*`, `v12/*` do not build |
| F9 | With the redesign on, nothing would create the day's fan debate | `/api/cron/ensure-daily-debate`, 00:10 UTC |
| F10 | Ranked had no scheduled job and showed rewards that do not exist | `/api/ranked/cron/nightly` at 00:20 UTC (does nothing while ranked cannot run); Season rewards hidden; no XP in ranked; `r1-ranked-season1.sql` written, not applied |
| F11 | The docs secret gate was red every night and drowned in false positives | Gate green again; the test account's address removed from the design log |

### Second pass (PR #89, authorized by the owner on 2026-10-01)

- The ten scheduled routes of `/api/cron`, `/api/qotd/publish` and `/api/admin/auto-select-qotd` no longer accept
  the `x-vercel-cron` header as a credential: `Authorization: Bearer CRON_SECRET` (Vercel sends it on cron
  invocations), or a signed-in admin on the four routes an admin page calls from the browser.
- `POST /api/blind-test/play` answers 410 (it awarded XP from a score sent by the browser).
- The challenge attempt route writes `battle_results` with the service role.

## 2. What visitors and crawlers saw change (flag off)

- `/pt/leaderboard`: real rows only. Home: two "See all" hrefs. `/blindtest/<mode>`: Play works, with a line
  saying what the run is. JSON-LD: same parsed content, `<`, `>`, `&` written as unicode escapes.
- Nothing else. On the 40 reference URLs (`docs/release/snapshot.mjs`), status, title, description, canonical,
  hreflang, robots, og and H1 were identical before and after each of the three merges (play counters in one
  description aside); `robots.txt` identical; the sitemap kept its URLs after the first merge (the fresh build of
  #66 brought it from 645 to 661 URLs: new quizzes and pages that the ten-day-old cached sitemap did not have).
- Snapshots: `docs/release/snapshots/before.json`, `after-merge.json`, `after-fixes.json`, `after-fixes-2.json`,
  `after-env.json`, and `local-fixes-flag-off.json`.
- A fresh deployment shows a "Portugues" language link in the home footer until the home regenerates itself
  (within the hour): the same code did it before v11; it is not a difference between versions.

## 3. Database (project `rdkgouofytwfdpbxbzio`)

R1 has no SQL access: the owner pasted every file in the SQL editor. Before: Supabase backup of the day confirmed
by the owner (2026-10-01 01:33 UTC); read-only exports of the touched tables in `~/kpq-backups/2026-10-01/` and
`~/kpq-backups/2026-10-01-rls/` (outside the repository); every file dry-run on a throwaway local PostgreSQL.

| # | File | What it adds | State |
|---|---|---|---|
| 1 | `v11-p4-relaxed-runs.sql` | `plays.relaxed` | applied, verified |
| 2 | `v11-p4-rank-for-score.sql` | function `get_quiz_rank_for_score` | applied, verified |
| 3 | `v11-p4-comment-likes.sql` | 3 tables, 1 function | applied, verified |
| 4 | `v11-p3-group-quiz-alerts.sql` | 1 table, 2 triggers on `quizzes` | applied, verified |
| 5 | `v11-p8-community.sql` | 5 tables | applied, verified |
| 6 | `v11-p10-email-prefs.sql` | 2 columns on `notification_prefs` | applied, verified |
| 7 | `v11-p10-header-storage.sql` | storage bucket `profile-headers` | applied, verified |
| 8 | `v11-p7-ranked.sql` | 4 tables, 2 columns + 2 indexes on `ranked_plays`, 8 functions | applied, verified |
| 9 | `r1-rls-tighten.sql` | drops 6 public write policies, revokes EXECUTE on `ensure_daily_quiz` from PUBLIC, anon, authenticated | applied, verified |
| - | `r1-ranked-season1.sql` | season 1 of ranked | **not applied** (the day the flag goes on) |

- Files 1 to 8: `docs/release/r1-migrations-verify.sql`, 34 checks, every value equal to its expected text; no
  existing table lost a row (plays 69350, quizzes 441). Nothing they add is visible on kpopquiz.org while the flag
  is off.
- File 9: five policies left on `ranked_plays`, `battles`, `battle_results`, `pending_questions`, `quiz_bank`,
  `quiz_time_stats`, all SELECT; no write policy; RLS on the six; `ensure_daily_quiz` executable by the server
  only; row counts unchanged. Checked from outside too: an anonymous caller no longer sees a row of `quiz_bank`
  (the unpublished daily quizzes and their answers were readable before). The owner applied it right after the
  inventory, before R1's check of that inventory; R1 checked it afterwards: it held nothing unexpected.
- Rollbacks: written at the end of each file.

## 4. Environment variables and crons

- Production, set by R1 on 2026-10-01 20:23 UTC: `QOTD_ROTATION_FIX=1` and `UX_P4_CHALLENGE_SECRET` (32 random
  bytes generated straight into `vercel env add`, never displayed, stored as sensitive). `CRON_SECRET` already
  existed. `NEXT_PUBLIC_UX_V1` is not set for Production.
- Production was redeployed at 20:23 UTC (`dpl_7uGfKk6KaMEgVSdgLNCXLp66C9zk`, same commit `4cc1904`):
  `after-env.json` shows no SEO field difference, the same sitemap and robots.txt; `/community` still redirects to
  the home and `/blindtest/ranked` still answers 404, as with the flag off.
- `QOTD_ROTATION_FIX=1`: from the 00:05 UTC cron on, a day without a bank quiz dated that day is filled, so the
  home's quiz of the day changes every day again (it had been frozen since 2026-06-30).
- Crons: 12 jobs registered (`vercel crons list`), the 10 older ones plus `/api/cron/ensure-daily-debate` (00:10
  UTC) and `/api/ranked/cron/nightly` (00:20 UTC, does nothing while the flag is off).

## 5. Checks run

- Unit: 993 / 993 (47 files; 920 before R1). Whole-app tsc: 0.
- Builds: flag-off and flag-on production builds green before each merge, one at a time, 0 Supabase timeouts.
- v11 specs on flag-on builds: p2, p6, p7, p9, shell (232 passed) before #88; p4, shell on the migrated database
  (109 passed) before #89; 0 failed; guardWrites on; `/me` and `/profile` never opened signed in.
- CI on main after each merge: Tests green; SEO gates green since #88 (indexability, metadata dupes, orphans,
  sitemap hygiene, docs secrets).
- After the RLS file: no 5xx and no error-level log for 30 minutes; two plays recorded at 20:27 and 20:29 UTC,
  each with its timing cache write in the same second, with no public write policy left. After the env
  redeploy: no 5xx and no error-level log for 30 minutes.
- No production write was made by R1 outside the three merges, the env vars of section 4 and one on-demand run
  of the ranked nightly cron, which returns before any database access while the flag is off. Every SQL
  statement was run by the owner.

## 6. Left for the owner

1. **Change the email of the parity test account `testtest`** (Supabase, Authentication, Users), then update
   `UX_V1_TEST_EMAIL` in Vercel and GitHub. Its address, a public disposable mailbox readable without a password,
   was in a file of this public repository from 2026-09-25 until F11 removed it; it stays in git history.
2. **Turning the redesign on** (not part of R1): set `NEXT_PUBLIC_UX_V1=1` for Production and redeploy; apply
   `docs/pending-migrations/r1-ranked-season1.sql` the same day. Checks that day: the 40-URL snapshot
   (`node docs/release/snapshot.mjs`), the 38 v11 states as a guest, /community, /leaderboard, /blindtest/ranked,
   /me as a guest, 30 minutes of runtime errors; rollback = `vercel rollback` to the last flag-off deployment, then
   `vercel promote` of the next good one (a rollback turns off the automatic assignment of production domains).
3. **Preview flag**: `NEXT_PUBLIC_UX_V1=1` is still scoped to the branch `feat/ux-v1-v11`; extend it to every
   Preview branch if previews must show the redesign.
4. **Watch the crons once**: since #89 they depend on the Bearer secret Vercel sends. R1 proved the path on 2026-10-01: `vercel crons run /api/ranked/cron/nightly` answered 200 (that route answers 404 to a caller without the secret and writes nothing with the flag off). To see the real jobs: on 2026-10-02, `qotd_log` and `daily_debates` must each hold a row dated 2026-10-02, or Vercel, Settings, Cron Jobs, View Logs.
5. Open decisions of `v11/RUN-STATE.md`, unchanged by R1: 7 (ticker floor), 8 and 21 (thin hubs noindex), 9
   (/community indexing), 12 (blindtest XP and streak), 13 (Intro 301), 14 (header bucket use and email sender),
   19 to 25 (SEO-locked copy), 27 (blogs review), 28 and 29 (cached failed reads), 31 (parked Verse links), 34
   (nav spacing).
6. Seen in passing, not touched: `party_rooms` and `party_players` (migration 059) have public insert and update
   policies like the tables closed here; a Verse write that names only its own row id (review a suggestion,
   resolve a flag, edit an essay by id) relies on the hidden-Verse gate and the route's curator check, not on the
   parked-space check; the 14 accessibility failures on legacy pages inside the v11 shell (v11 report).
