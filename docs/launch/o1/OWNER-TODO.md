# FandomVerse launch: what is left for the owner (2026-10-28)

The status page. The actions themselves, numbered, with durations and the lines to copy, are in `OWNER-NOW.md`; the details of each step in `RUNBOOK.md`.
Companion files: `SQL-ORDER.md` (SQL order), `ENV.md` (variables), `VERIFY.md` (checks V0 to V11), `ROLLBACK.md` (the way back).
Times are hands-on estimates. Waits (watches, DNS, builds) are counted apart. Times of day are UTC.

What changed on 2026-10-28 (owner): one domain, `fandomverse.org`, with sub-folders: the FandomVerse hub at `https://fandomverse.org` (Vercel project `fandomverse`,
renamed from `fanquiz`) and OtakuQuiz at `https://fandomverse.org/anime` (project `otakuquiz`, no domain, joined by the Vercel Microfrontends group `fandomverse`).
Sign-in there: Google and Discord, no email. No calendar any more: launch as soon as everything is ready, with 24 hour watches after B, 008 and 010.

## 0. Already done, do not redo

- S4 (RUNBOOK A0) is applied in production since 2026-10-23 at 14:53 UTC (LEDGER D-103). Only the V-S4 check is run again (after 008, after G, on launch day).
- Mission U part D: `account-deletion.sql` is applied in production (2026-10-27, LEDGER D-127). RUNBOOK G2 only checks it.
- The launch files L01 to L08, L10-PERS and L12 are generated in "verified" mode, with no `-- DRAFTS` line (`expected-counts.json`: 50 series, 268 quizzes, 99 daily rows,
  10 personality quizzes). Lane 2 updates the domains and the Team addresses inside them; then you check them (J2) and the integrator rehearses them (J3).
- `apps/quiz/vercel.json` lists `passport-deletions` and `passport-cleanup` (18 entries on 2026-10-28). You only check it (A6).
- `legal/notice` and `privacy/age-15` of kpopquiz.org are merged (P-Mingi/KpopQuizzV2#122 and #123). The legal identity is filled in `apps/quiz/src/copy/hub/h1.ts` (D-114).
- Vercel, by the integrator on 2026-10-28 (owner exception): `fanquiz` renamed `fandomverse`; the production variables of `fandomverse` and `otakuquiz`; the three passport
  secrets, identical, in Production of the three projects; `CRON_SECRET` on `fandomverse` and `otakuquiz`. `ENV.md` marks each one. No domain attached.
- The projects `otakuquiz` and `fanquiz` (now `fandomverse`) exist since 2026-10-22, builds paused by `exit 0` until RUNBOOK K5b.
- Resend and the Send Email hook are postponed (D-115, RUNBOOK I); fandomverse.org offers no email sign-in. Nothing to do for emails at launch.
- Per-series images: done (D-122, 51 photos).

## 1. The chain (no calendar)

| order | phase | OWNER-NOW steps | waits for | hands-on | then wait |
|---|---|---|---|---|---|
| 1 | Domain, DNS, Microfrontends group, service role key, Supabase URL, Google origin (RUNBOOK H) | 1 to 6 | nothing | 50 min | DNS, a few hours |
| 2 | Merge and first deploys (RUNBOOK A5, A6, H8) | 7 to 9 | the integrator's merge of the lanes | 1 h 55 | |
| 3 | B: 001 to 007 | 10 to 23 | step 7 deployed on `kpopquiz` | 2 h 20 | 24 hours |
| 4 | C (watch), then D: 008 | 24 to 28 | 24 hours after step 23 | 1 h 55 | 24 hours |
| 5 | E: 009, the app deploy, 010 | 29 to 33 | 24 hours after step 27; a start between 18:00 and 22:20 | 1 h 05 | 24 hours |
| 6 | F (watch), then G: 011 to 017 | 34 to 39 | the morning after step 33, then 24 hours after it | 2 h 05 | |
| 7 | Content and go / no-go (RUNBOOK J, K1) | 40 to 42 | lane 2's launch files | 1 h 45 | |
| 8 | Launch day (RUNBOOK K) | 43 to 59 | G, H, J and every line of K1 | 6 h 30 | |
| 9 | After launch (RUNBOOK L) | 60 to 68 | K10 | 4 h 25 | 72 hours of watching |

Earliest path, with B on day 1: D on day 2, E on the evening of day 3, F and G on day 4, launch day on day 5. A person must be free for the 72 hours after launch.

## 2. What must be true before each step

| RUNBOOK step | must be true before |
|---|---|
| A5, the merge | the integrator says the FandomVerse lanes are in `o1/integration`; checks green; the final reports have no open blocker |
| B (every SQL session: B, D, E, G, K, L6) | a backup of the session (A2: dashboard backup of the last 24 hours and the `pg_dump`); not between 23:50 and 00:30 |
| B1 to B11 | A5 deployed on `kpopquiz` |
| B6, `SITE_SCOPE=1` on `kpopquiz` | B3 to B5 checked; no anime row in the database |
| B9, 006 | `passport` is not in Supabase's Exposed schemas |
| D1, D2, 008 | C clean (24 hours after B11); the V4 gate prints `none` |
| E, 009 and 010 | D3 clean (24 hours after D2); 90 minutes before 23:50; nothing else changed that day; 010 never alone, never after 23:45 |
| G, 011 to 017 | F: V7 all true, 24 hours after E4 |
| G2, 016 and 017 | `admin_delete_account` exists (row 18b) |
| H7, the Microfrontends group | the integrator confirmed the command |
| H8, first deploys | A5 on `main`; H7 done |
| K, launch day | every line of K1 |
| K4, L02 | the 31 auth users made by `team-auth.mjs`; L01; 009 |
| K5.3b, L10-PERS | L08 applied; 013 applied |
| K6, the domain | K5b builds Ready; the DNS of H6 answers |
| K7, `PASSPORT_JUMP=1` | 006 and 007; the three secrets equal; the domain live |
| K8, L12 | K5 and K7 done |
| K10, indexing | K9 clean; the `privacy.controller` line names the controller; `NET_LAUNCH_DATE` set before `NET_INDEXING` |
| L3, network flags | L2 clean; each flag after the previous one is clean (V1, V10, one hour of logs) |
| L3b, `NEXT_PUBLIC_NET_DELETION` | 18b, 016 and 017 applied; `passport-deletions` has run on `fandomverse` |
| L6, hub tables | L3 finished; a backup; the code PR of the two cron routes merged after the two SQL files |

## 3. Total

- Up to the end of launch day: about 18 h 25 hands-on (OWNER-NOW steps 1 to 59).
- After launch: about 4 h 25 (steps 60 to 68, the hub tables included).
- Total: about 22 h 50. Elapsed: at least 4 days from session B to launch day, because of the three 24 hour watches.

## 4. Owner decisions (state on 2026-10-28)

Taken on 2026-10-28 (FandomVerse):

1. "FanQuiz" becomes "FandomVerse". One domain, `fandomverse.org` (not bought yet), with sub-folders: the hub at `/`, OtakuQuiz at `/anime`; later `/kdrama`, `/cpop`. kpopquiz.org stays separate and unchanged.
2. Sign-in on fandomverse.org: Google (the same Google client as kpopquiz.org) and Discord only, no email. kpopquiz.org unchanged. The hub and `/anime` share the session; between kpopquiz.org and fandomverse.org the passport ticket stays.
3. Logos: bunny plus "FandomVerse", bunny plus "OtakuQuiz".
4. No calendar: launch as soon as everything is ready. 24 hour watches after B, 008 and 010; a backup before each SQL session; everything else chained.
5. Vercel by the integrator with the CLI (owner exception): the rename, the production variables, the three shared secrets on the three projects, `CRON_SECRET` on the two new ones; no domain. The owner sets `SUPABASE_SERVICE_ROLE_KEY` as a team shared variable.
6. The Team accounts use `<username>@team.fandomverse.org`, a sub-domain that receives no mail.

Still in force (2026-10-23, D-099, and 2026-10-26, D-124):

7. `L10-PERS-personality.sql` ships at launch, between L08 and L12 (K5.3b, SQL-ORDER 27b).
8. The hub tables `001-quiz-daily-plays` and `002-xp-daily-snapshots` and their two nightly crons: yes, after L3, not on the launch path (RUNBOOK L6; the two cron routes need a small code PR first).
9. The hub brand values (vocabulary, theme, level titles) are accepted as they stand in the registry (`apps/quiz/src/lib/site/registry.ts`, constant `HUB`, list `PLACEHOLDERS`; D-124), with the name FandomVerse.
10. A verified fact is a published trivia row; L01 runs at launch; the anime daily is dated with the bank tool and `QOTD_ROTATION_FIX=1` on `otakuquiz`; organization data in kpopquiz.org's footer; `NET_INDEXING` last.

Withdrawn on 2026-10-28: T0 on Tuesday 1 December 2026 and the dated calendar (B on 29 or 30 October, E on 10 November at 18:00, G on 16 November); the 7 day and 3 day watches;
the domains `otakuquiz.org` and `fanquiz.org` and their Resend sending domains; the two new Google clients; "no Discord on the new domains"; `team.otakuquiz.org`; the separate IndexNow keys per new domain.

Still open:

- The confirmed Microfrontends command, the Google origin (yes or no, AUTH-FANDOMVERSE.md), the IndexNow key fandomverse.org serves, the confirmation of the variables set on 2026-10-28: the placeholder list at the end of `OWNER-NOW.md`.
- Redeploying the `send-email` function: without object while the hook stays off (D-115). To do the day you turn Resend on, with fandomverse.org senders (RUNBOOK I2).
