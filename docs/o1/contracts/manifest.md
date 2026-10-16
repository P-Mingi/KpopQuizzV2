# SQL manifest (o1-contract-v1)

Every database file of run O1: name, rollback, owner lane, BACKLOG 4.1 rows, transaction mode, production phase,
prerequisites and reviewers. Source: BACKLOG 4.1 to 4.4; the DDL shape of each file is its `@file` section of
`schema.sql`. File names and order are frozen (BACKLOG 5.1); a new file is a CR (5.2).

`scripts/o1/migrate-dev.sh` reads the file paths of the table in section 1, in the order they appear in this
document, and refuses to apply a file to `o1-dev` before every file listed above it (rollbacks excepted). The
table is therefore written in a valid apply order for the dev branches. Production follows section 2.

## 1. Files, in dev apply order

Prefix of every path: the multisite folder of `docs/pending-migrations/`. Launch row files live in its `launch/`
subfolder. Each file `X.sql` has its rollback `X.rollback.sql` beside it.

| # | file | rollback | owner | rows | tx | production phase | needs | reviewers |
|---|---|---|---|---|---|---|---|---|
| 1 | `docs/pending-migrations/multisite/001-sites.sql` | `docs/pending-migrations/multisite/001-sites.rollback.sql` | B2 | 1 | single | pre | none | R-SQL x2 |
| 2 | `docs/pending-migrations/multisite/launch/L01-B2-sites.sql` | `docs/pending-migrations/multisite/launch/L01-B2-sites.rollback.sql` | B2 | 1 (anime and hub rows) | single | launch | 001 | R-SQL x2 |
| 3 | `docs/pending-migrations/multisite/002a-site-columns.sql` | `docs/pending-migrations/multisite/002a-site-columns.rollback.sql` | B2 | 2, 3 | single | pre | 001 | R-SQL x2 |
| 4 | `docs/pending-migrations/multisite/002b-site-validate.sql` | `docs/pending-migrations/multisite/002b-site-validate.rollback.sql` | B2 | 3 | none | pre | 002a | R-SQL x2 |
| 5 | `docs/pending-migrations/multisite/002c-site-indexes.sql` | `docs/pending-migrations/multisite/002c-site-indexes.rollback.sql` | B2 | 4 | none | pre | 002b | R-SQL x2 |
| 6 | `docs/pending-migrations/multisite/002d-quiz-site-guard.sql` | `docs/pending-migrations/multisite/002d-quiz-site-guard.rollback.sql` | B2 | 5 | single | pre | 002c | R-SQL x2 (DANGEROUS) |
| 7 | `docs/pending-migrations/multisite/003-memberships.sql` | `docs/pending-migrations/multisite/003-memberships.rollback.sql` | B3 | 6, 7, 8 | single | pre | 001 | R-SQL x2 (DANGEROUS) |
| 8 | `docs/pending-migrations/multisite/004-passport-prefs.sql` | `docs/pending-migrations/multisite/004-passport-prefs.rollback.sql` | B3 | 9, 10, 11, 12 | single | pre | 003 | R-SQL x2 |
| 9 | `docs/pending-migrations/multisite/005-net-counters.sql` | `docs/pending-migrations/multisite/005-net-counters.rollback.sql` | B3 | 13 | single | pre | 001 | R-SQL x2 |
| 10 | `docs/pending-migrations/multisite/006-passport-handoff.sql` | `docs/pending-migrations/multisite/006-passport-handoff.rollback.sql` | B4 | 14 | single | pre | 001 | R-SEC, R-SQL |
| 11 | `docs/pending-migrations/multisite/007-world-xp.sql` | `docs/pending-migrations/multisite/007-world-xp.rollback.sql` | B3 | 15 | single | pre | 003, 004 | R-SQL x2 |
| 12 | `docs/pending-migrations/multisite/008-write-locks.sql` | `docs/pending-migrations/multisite/008-write-locks.rollback.sql` | B5 | 16, 17, 18 | single | pre-T14 | 002a, 007 | R-SQL x2 (DANGEROUS) |
| 13 | `docs/pending-migrations/multisite/009-daily-prep.sql` | `docs/pending-migrations/multisite/009-daily-prep.rollback.sql` | B5 | 20, 21, 22 | none | pre-T14 (window) | 002a | R-SQL x2 |
| 14 | `docs/pending-migrations/multisite/010-daily-v2.sql` | `docs/pending-migrations/multisite/010-daily-v2.rollback.sql` | B5 | 23 | single | pre-T14 (window) | 009 | R-SQL x2 (DANGEROUS) |
| 15 | `docs/pending-migrations/multisite/011-anime-series.sql` | `docs/pending-migrations/multisite/011-anime-series.rollback.sql` | K1 | 24, 25 | single | pre-after-V0 | 002a | R-SQL, R-CONTENT |
| 16 | `docs/pending-migrations/multisite/012-editorial-quiz.sql` | `docs/pending-migrations/multisite/012-editorial-quiz.rollback.sql` | E1b | 26 | single | pre-after-V0 | 002a | R-SQL, R-SEC |
| 17 | `docs/pending-migrations/multisite/013-formats.sql` | `docs/pending-migrations/multisite/013-formats.rollback.sql` | O5 | 27 | single | pre-after-V0 | 011 | R-SQL |
| 18 | `docs/pending-migrations/multisite/014-daily-openings.sql` | `docs/pending-migrations/multisite/014-daily-openings.rollback.sql` | O6 | 28 | single | pre-after-V0 | 011 | R-SQL, R-SEC |
| 19 | `docs/pending-migrations/multisite/015-spoilers.sql` | `docs/pending-migrations/multisite/015-spoilers.rollback.sql` | O3 | 29 | single | pre-after-V0 | 011 | R-SQL |
| 20 | `docs/pending-migrations/multisite/016-passport-deletion.sql` | `docs/pending-migrations/multisite/016-passport-deletion.rollback.sql` | B7 | 30 | single | pre-after-V0 (dormant) | 004, 006, 011, Mission U deletion file | R-SQL x2 (DANGEROUS), R-SEC |
| 21 | `docs/pending-migrations/multisite/launch/L02-K2-team-accounts.sql` | `docs/pending-migrations/multisite/launch/L02-K2-team-accounts.rollback.sql` | K2 (L1 script) | 35 | single | launch | L01, 003, 009 | R-CONTENT, R-SQL |
| 22 | `docs/pending-migrations/multisite/launch/L03-B7-sentinel.sql` | `docs/pending-migrations/multisite/launch/L03-B7-sentinel.rollback.sql` | B7 | 38 | single | launch | L01, 003 | R-SQL |
| 23 | `docs/pending-migrations/multisite/launch/L04-K1-series.sql` | `docs/pending-migrations/multisite/launch/L04-K1-series.rollback.sql` | K1 | 36 | single | launch | L01, 011 | R-CONTENT, R-SQL |
| 24 | `docs/pending-migrations/multisite/launch/L05-K1-facts.sql` | `docs/pending-migrations/multisite/launch/L05-K1-facts.rollback.sql` | K1 | 36 | single | launch | L04 | R-CONTENT |
| 25 | `docs/pending-migrations/multisite/launch/L06-B3-badges.sql` | `docs/pending-migrations/multisite/launch/L06-B3-badges.rollback.sql` | B3 | 34 | single | launch | L01, 002a | R-SQL |
| 26 | `docs/pending-migrations/multisite/launch/L07-K2-catalogue.sql` | `docs/pending-migrations/multisite/launch/L07-K2-catalogue.rollback.sql` | K2 | 37 | single | launch | L02, L04, 002d | R-CONTENT |
| 27 | `docs/pending-migrations/multisite/launch/L08-K3-daily-bank.sql` | `docs/pending-migrations/multisite/launch/L08-K3-daily-bank.rollback.sql` | K3 | 37 | single | launch | L04, 009 | R-CONTENT |
| 28 | `docs/pending-migrations/multisite/launch/L09-K4-openings.sql` | `docs/pending-migrations/multisite/launch/L09-K4-openings.rollback.sql` | K4 | 37 | single | launch | L04, 014 | R-CONTENT |
| 29 | `docs/pending-migrations/multisite/launch/L10-K3-formats.sql` | `docs/pending-migrations/multisite/launch/L10-K3-formats.rollback.sql` | K3 | 37 | single | launch | L04, 013 | R-CONTENT |
| 30 | `docs/pending-migrations/multisite/launch/L11-X1-crossover-quiz.sql` | `docs/pending-migrations/multisite/launch/L11-X1-crossover-quiz.rollback.sql` | X1 | 39 | single | launch | 002a | R-CONTENT, R-SEO |
| 31 | `docs/pending-migrations/multisite/launch/L12-L1-sites-live.sql` | `docs/pending-migrations/multisite/launch/L12-L1-sites-live.rollback.sql` | L1 | 40 | single | launch (last) | L01 to L11 | R-SQL |

Columns:
- **rows**: BACKLOG 4.1 row numbers (1 to 40). Rows 19 and 31 to 33 have no SQL file (section 4).
- **tx**: `single` = the file runs in one transaction (`psql --single-transaction`); `none` = the file's header says
  `-- o1-transaction: none` and every statement commits alone (CREATE INDEX CONCURRENTLY, VALIDATE CONSTRAINT).
- **production phase**: `pre` = any time after the matching code is merged to main; `pre-T14` = by T-14 (008 first,
  then the window 009, app deploy, 010 in one owner session); `pre-after-V0` = after Verrou 0 is cleared (empty
  tables, dormant functions); `launch` = launch day only, in the order L01 to L12 (BACKLOG 4.4).
- **needs**: the files that must be applied before (the real dependency graph). `migrate-dev.sh` today enforces the
  stronger rule "every file listed above"; request F0-6 asks ORCH to enforce `needs` instead, so a lane never
  waits on an unrelated lane's file.
- **reviewers**: `x2` = two R-SQL reviewers (BACKLOG 4.2 DANGEROUS objects and the passport writers).

Launch file names follow `launch/LNN-<lane>-<topic>.sql`; BACKLOG 4.1 gave lanes and number ranges, the exact
numbers above are an F0 decision (L01 for the sites rows, which Verrou 0 keeps out of production until launch).

## 2. Production order (owner, after a backup; BACKLOG 4.4)

| step | files | condition |
|---|---|---|
| P1 | 001, 002a, 002b, 002c, 002d, then SITE_SCOPE on; 003, 004, 005, 006, 007 | after the code that needs them is merged to main; verification queries pass; 7-day click watch after each kpop deploy |
| P2 | 008 | latest T-14; 003 and 007 applied; B5's equivalence evidence attached |
| P3 | 009, the app deploy (onConflict `site_id,featured_date`, `getQuizOfTheDay(site)`), 010 | one owner session, away from the 00:05 UTC cron; never 010 alone |
| P4 | 3 days of /daily watch on kpopquiz.org, the counters audit query, the sum(xp) check | clears Verrou 0 |
| P5 | 011, 012, 013, 014, 015, 016 | after P4; additive, empty, dormant |
| P6 | Send Email Hook (section 4), auth redirect URLs, Google client ids, Resend DNS | T-7; a kpop magic link checked the same minute |
| P7 | L01 to L12, flags, robots, crons | launch day, L1 runbook |

Rules that travel with the order:
1. 001 before 002 (FKs need `sites`); 002a, 002b, 002c, 002d in that order (BACKLOG 4.3 item 1).
2. SITE_SCOPE on only after 002 is applied and verified and the `forSite` code is deployed.
3. 003 before 004, 005 and 007; 007 before 008; 006 after 001, before 016 and before PASSPORT_JUMP.
4. 009, the app deploy and 010 together (P3). The app writer switch (`awardXpForSite`, daily-streak) may deploy
   before 008: for kpop it calls `award_xp` exactly as today.
5. 011 after 002; 012 after 002; 013 to 015 after 011; 016 after 006 and after Mission U's account-deletion file.
6. Rollbacks run in reverse order. After launch, rolling back 003 or 004 would delete anime passport data: the
   rollback becomes the flags (off), not a DROP.

On the dev branches the same files apply in the order of section 1 (adapted Verrou 0, BACKLOG 0): L01 right after
001 so anime content rows can be loaded once 002 is on the branch; anime activity (plays, likes, app creations,
the anime daily cron) only after 008 and 010 are on the branch.

## 3. What every file contains

1. Header lines: what, why, rows touched (counts, never personal data), verify (read-only queries with the
   expected result), undo (the rollback file name), and `-- o1-transaction: none` when tx is `none`.
2. Idempotent statements (`IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING`, guarded DO blocks), so a
   second run is a no-op.
3. The objects of its `@file` section of `schema.sql`, with exactly those names, types, defaults, constraints,
   policies and grants. A file never creates an object that `schema.sql` does not declare (CR first).
4. For a replaced function: its rollback file holds today's `pg_get_functiondef` output and today's ACL (from G3),
   never a reconstruction.
5. The verification of BACKLOG 4.4 where it applies: `select count(*) from world_memberships where site_id = 'kpop'`
   equals `select count(*) from profiles`; `select sum(xp) from profiles` unchanged; `select count(*) from
   badge_definitions where site_id <> 'kpop'` is 0 before launch.
6. Tested first on the local scratch cluster with the production public schema (`scripts/o1/local-pg.sh`, Q0b),
   then on `o1-scratch` with `migrate-dev.sh --branch scratch`; both outputs go in the lane's report.

## 4. Objects without an SQL file

| BACKLOG 4.1 row | object | owner | where it lives | phase |
|---|---|---|---|---|
| 19 | `grant_creator_tier_badge`, `grant_group_master_badge`, `grant_streak_badges`, `handle_follow_change` (audited, no change expected) | B5 | rollback copies in B5's folder; tests prove no anime effect | n/a |
| 31 | Send Email Hook: Edge Function `send-email`, the Auth hook setting, `SEND_EMAIL_HOOK_SECRET` | B7 | deploy doc `deploy/B7-send-email-hook.md` in the multisite folder, with its disable step | T-7 (P6) |
| 32 | crons `ensure-daily-quiz` (site-aware) and `editorial-publish` (per-site cadence) | B5, E1b; guard B1 | `apps/quiz/vercel.json` (shared by the three projects) | launch (anime on) |
| 33 | crons `ensure-daily-opening`, `passport-deletions`, `passport-cleanup` | O6, B7, B4 | `apps/quiz/vercel.json` | launch |

### Cron routes and schedules (UTC, frozen)

| route | owner | acts on | schedule | today |
|---|---|---|---|---|
| `/api/cron/ensure-daily-quiz` | B5 (site-aware), B1 (guard) | kpop, anime | `5 0 * * *` | exists, unchanged schedule |
| `/api/cron/editorial-publish` | E1b (per-site cadence), B1 (guard) | kpop, anime | `*/15 * * * *` | exists, unchanged schedule |
| `/api/cron/ensure-daily-opening` | O6 | anime | `12 0 * * *` | new |
| `/api/cron/passport-deletions` | B7 | hub | `50 3 * * *` | new |
| `/api/cron/passport-cleanup` | B4 | hub | `55 3 * * *` | new |

- `vercel.json` is one file for the three Vercel projects: every cron fires in every project. Each route calls
  `cronForSite([...])` first (B1) and answers 200 with `{skipped: true}` on a site not in its list. Every cron of
  today not listed above acts on kpop only.
- `apps/quiz/vercel.json` is on the HOT list: ORCH adds the three new entries when the file is free (request F0-7);
  until then the routes exist and are called by tests, not by Vercel.
- Anime editorial cadence: up to 40 items a day (decision 9) fits the 96 runs a day of the 15-minute cron at one
  item per run.

## 5. schema.sql sections

`schema.sql` has one `-- @file <name>` marker per file of section 1 that declares objects: every non-launch file
and `L01-B2-sites` (its rows are frozen values of the registry mirror). The other launch files hold content rows
only and have no section. `contract.test.ts` checks that the markers and this table agree, in the same order, and
that rows 1 to 40 are all accounted for.
