# V12 switch-on runbook (prepared 2026-10-05, nothing switched on)

Written for the owner. Nothing in this file has been done. Every step is the owner's hand, except the SQL of
step 3, which the owner already allowed for that day (2026-10-05: "je te donne déjà le go pour ce jour-là").

State when written: PR #91 (v12, flags off) and the launch-prep PR are on `main`; every v12 SQL file is applied
(RUN-STATE 2026-10-04); production runs with `NEXT_PUBLIC_UX_V1`, `NEXT_PUBLIC_UX_V12` and
`NEXT_PUBLIC_BT_TRACKING` unset; the live load and chaos test passed (run/checks/live-load/); 28 editorial drafts
wait in `editorial_drafts`, status `draft`, no date (run/EDITORIAL-DRAFTS.md).

## 0. The day before

- Note the current production deployment URL (Vercel, project `quiz`, Deployments, the one marked Production).
  It is the rollback target of section 7. Write it here: `______________________`.
- `node docs/release/snapshot.mjs --base https://kpopquiz.org --out docs/release/snapshots/before-v12.json`
  (the 40-URL snapshot, flags off).
- Read the 28 drafts in `run/EDITORIAL-DRAFTS.md`; reject or edit in `/admin/editorial` the ones you do not want.
  Do not approve any yet (section 4).

## 1. Vercel production variables

Vercel, project `quiz`, Settings, Environment Variables, environment **Production** only (leave Preview and
Development as they are). All three are read at build time: setting them changes nothing until the redeploy.

| Name | Value | Why |
|---|---|---|
| `NEXT_PUBLIC_UX_V1` | `1` | the v11 redesign; v12 is only on together with it |
| `NEXT_PUBLIC_UX_V12` | `1` | every v12 surface (`isUxV12()`) |
| `NEXT_PUBLIC_BT_TRACKING` | `1` | blindtest run tracking into `bt_runs` (its SQL is applied) |

Already set and needed (check they exist, do not change): `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`,
`ADMIN_USER_IDS` (the reviewer of the editorial drafts must be in it). Optional: `DUEL_SIGNING_SECRET` (else
derived from the service role key, G7).

CLI equivalent, one per variable: `vercel env add NEXT_PUBLIC_UX_V12 production` then type `1`.

## 2. Redeploy

- Vercel, Deployments, the current Production deployment, menu, **Redeploy**, untick "Use existing Build Cache"
  (the flags are inlined at build: a cached build keeps them off). Or `vercel --prod` from `apps/quiz`.
- Wait for Ready. Then check once that the flags are really in the build: `https://kpopquiz.org/live` answers 200
  (it 301s to `/` with v12 off), and `https://kpopquiz.org/api/live` answers `{"ok":true,"max":50}`.

## 3. Ranked season 1, the same day (go already given)

- File: `docs/pending-migrations/r1-ranked-season1.sql`. One row in `public.ranked_seasons`: season 1 from 00:00 UTC
  of the day it runs, 56 days. Inserts nothing if a season already exists.
- Apply it AFTER the redeploy of step 2 is Ready (ranked only exists with `NEXT_PUBLIC_UX_V1`). Same UTC day as the
  redeploy, so the season starts that day.
- How: paste the file in the Supabase SQL editor of `rdkgouofytwfdpbxbzio` and run it (then tell Claude
  "applied r1-ranked-season1.sql"), or ask Claude to apply it (the go for that day is given). Then the verification query at the bottom of the file must give one row: id 1, starts today 00:00
  UTC, length 56 days, `covers_now` true.
- Then `/blindtest/ranked` shows the season instead of "The first season has not started". The nightly cron
  `/api/ranked/cron/nightly` (00:20 UTC) rolls the next seasons by itself.

## 4. Start the editorial calendar

- `/admin/editorial` (signed in as an admin of `ADMIN_USER_IDS`). The 28 drafts are listed in the order of
  `run/EDITORIAL-DRAFTS.md` (day 1 to day 14, two a day).
- For each draft you keep: Approve with a date. Suggested slots: 10:00 and 18:00 UTC, day 1 = the switch-on day.
  The publisher cron (`/api/cron/editorial-publish`, every 15 minutes) publishes one due draft per run.
- Publisher rules to know: at most 3 items a UTC day; never two in a row from the same account (a lone due draft
  of the last account waits until another account publishes); nothing publishes without a reviewer.
- Rules of use for the 9 team accounts (not enforced by code, owner decision 18): they do not reply to, like or vote
  on each other's posts, nor on fans' posts; they only publish through the editorial pipeline.
- Approve at most the first 3 or 4 days at a time, so a draft can still be edited if news changes a fact.

## 5. Pages to check after the redeploy

Signed out, phone width and desktop, light and dark:

| Page | What to see |
|---|---|
| `/` | v11 home, New quizzes rows with pictures |
| `/blindtest` | Playlists rail, live band, language row |
| `/guess-the-kpop-song`, `/fr/blind-test-kpop`, `/es/adivina-la-cancion-kpop`, `/id/tebak-lagu-kpop` | landings, one full run each (the fr, es, id strings of I18N-REVIEW) |
| `/blindtest/kpop-hits-2026`, `/blindtest/kpop-demon-hunters`, `/blindtest/title-tracks` | themed and named playlists play |
| `/blindtest/ranked` | season 1 open (after step 3) |
| `/live` then `/join` on a phone | one real room, 2 players, closed at the end |
| `/bts-quiz`, `/stray-kids-quiz`, `/rescene-quiz` | hub ways to play, This or that card after a quiz |
| `/stray-kids-name-all-members`, `/which-stray-kids-member-are-you`, `/kpop-demon-hunters-quiz` | new modes |
| `/community` | feed, and from day 1 the first editorial post with the Team badge |
| `/u/kpophistory` | Team profile, no level, no fan progress |
| `/leaderboard`, `/creators` | no team account listed |
| `/admin/editorial`, `/admin/blind-tests/runs` (signed in) | queue; runs appear after a few plays |
| `/sitemap.xml`, `/robots.txt` | the new pages are listed (Name them all, Which member, landings, themes); robots unchanged |

Then: `node docs/release/snapshot.mjs --base https://kpopquiz.org --out docs/release/snapshots/after-v12.json`
and compare with `before-v12.json` (the SEO of existing URLs must not move except the allowed clue quiz figures);
Vercel, Logs, filter errors, 30 minutes.

## 6. Crons to check

All need the `CRON_SECRET` Bearer Vercel sends. Vercel, Settings, Cron Jobs, View Logs, or
`vercel crons run <path>` once to see a 200.

| Path | Schedule (UTC) | First proof |
|---|---|---|
| `/api/cron/editorial-publish` | every 15 min | 200; after the first approved slot, one row in `editorial_posts` or `community_debates` |
| `/api/cron/live-expire` | every 30 min | 200 `{closed, deleted}` |
| `/api/cron/fans-picked` | 03:40 | the next morning, the hub Fans picked section shows for ranked groups |
| `/api/ranked/cron/nightly` | 00:20 | 200 after season 1 exists |
| `/api/cron/ensure-daily-debate` | 00:10 | one `daily_debates` row for the next day |
| `/api/cron/ensure-daily-quiz` | 00:05 | unchanged |

## 7. Rollback

Fast path, minutes, no data change:
1. Vercel, Deployments, the deployment noted in section 0, **Instant Rollback** (or `vercel rollback <url>`).
   kpopquiz.org serves the flags-off build again. A rollback stops the automatic assignment of production domains:
   the next good deployment must be promoted by hand (`vercel promote <url>`).
2. In Production variables, delete or empty `NEXT_PUBLIC_UX_V12` (and `NEXT_PUBLIC_UX_V1`,
   `NEXT_PUBLIC_BT_TRACKING` if the problem is theirs), so the next deploy from `main` builds flags off.

What stays in the database (harmless with the flags off, each v12 route answers 404 or does nothing):
- `ranked_seasons` row 1: remove only if no run was played, with the rollback line of `r1-ranked-season1.sql`.
- Published editorial posts and debates: hidden with v12 off (editorial routes 404). To stop the calendar, set the
  approved drafts back in `/admin/editorial` (reject), or leave them: the publisher cron answers 404 with the flag off.
- `bt_runs` rows, live rooms (test rooms deleted by the expiry cron, real ones emptied after 2 hours), This or that
  votes: kept, read by nothing with the flags off.

Partial rollback: only `NEXT_PUBLIC_BT_TRACKING` off plus a redeploy stops tracking writes and keeps v12.
