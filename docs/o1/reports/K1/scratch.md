# Lot (e) part 1, lane K1: SQL 009 to 015 and the daily quiz per site, tried on o1-scratch

Numbers only. Database: the branch o1-scratch (PostgreSQL 17.11), reached through scripts/o1/migrate-dev.sh --branch scratch and
env.sh scratch; no URL or key appears here. Scratch is left with 009 to 015 applied. Files: docs/pending-migrations/multisite/
009 to 015 (each with its .rollback.sql); tests in apps/quiz/e2e/o1/LE/K1/ (seed-branch.sql, daily.sql, daily.sh, checks.sql,
checks.sh, guards.sh). The migration log of this lane went to a scratch file, not to docs/o1/migration-log.md. The two 009
files are applied and tested but not in the commit: the ownership guard refuses them (request K1-1 in docs/o1/requests/K1.md).

## 1. Branch seed
| item | result |
|---|---|
| scratch before the seed: profile 00000000-0000-0000-0000-000000000001 / group general-kpop | 0 / 0 (profiles 42, groups 0, quizzes 0, quiz_bank 0, qotd_log 0) |
| seed-branch.sql (branch only, never a migration), first run | auth.users 0 (the row existed), profiles 1, groups 1 |
| seed-branch.sql, second run | 0, 0, 0 |

## 2. Apply, twice, and the catalog diff (pg_dump --schema-only of public and passport via the lot (c) catalog-dump.sh)
| step | result |
|---|---|
| files applied in order 009, 010, 011, 012, 013, 014, 015 | 7 of 7 ok |
| second run of the seven files | 7 of 7 ok, catalog dump identical (9712 lines before and after) |
| catalog before 009 | 9253 lines |
| rollbacks 015, 014, 013, 012, 011, 010, 009 | 7 of 7 ok, catalog dump identical to the one before 009 (9253 lines, diff empty) |
| the seven rollbacks a second time | 7 of 7 ok, dump identical (9253 lines) |
| re-apply of the seven files | 7 of 7 ok, dump identical to the first apply (9712 lines) |
| today's ensure_daily_quiz after the 010 rollback (daily.sh) | same md5 as before 010 (section 3) |

After that first clean cycle, other lanes loaded rows on the shared scratch (3 series, 15 arcs, 27 characters, 12 series_themes, 15
quizzes with a spoiler column, sites.anime carrying a system author and the fallback group anime-mix). The rollback guards then did
what they are for: the 011 rollback refused ("launch data would be lost: series (3 rows) arcs (15 rows) characters (27 rows)
series_themes (12 rows) quizzes spoiler columns (15 rows)") and the 009 rollback refused (a non-kpop sites row carries a system
author); nothing changed, and the seven files were applied again (dump identical to the applied state, 9712 lines). The full
cycle of section 2 was therefore repeated on the FINAL file texts on a throwaway local PostgreSQL 18.2 (production catalog copy
plus 001 to 008 and the same seed): second run identical (9708 lines), rollbacks identical to the baseline (9249 lines), second
rollback run identical, re-apply identical, the same hash as scratch in section 3, checks 38 of 38, guards 7 of 7.

## 3. Daily equivalence (daily.sql, BEGIN ... ROLLBACK, deterministic, kpop data only)
110 consecutive dates (2031-01-01 and on), 220 calls of ensure_daily_quiz(text) (two per date).
| item | count |
|---|---|
| dates that publish a quiz (id returned) | 94 |
| of which published from the bank / already flagged before the call | 90 / 4 |
| dates that return null (draft or already published bank row) | 16 |
| dates where the second call returns another id | 0 |
| bank rows without a group (fallback group general-kpop), slug clash rows, stale-day rows, pre-existing log rows | 22, 2, 4, 6 |

| run | md5 |
|---|---|
| today's function (before 010) | e81fa7bc510b577ae15903019ba91777 |
| wrapper over ensure_daily_quiz_v2 (after 010) | e81fa7bc510b577ae15903019ba91777 |
| today's function restored by the 010 rollback | e81fa7bc510b577ae15903019ba91777 |
| same hash on the local PostgreSQL 18.2 (before, after, after rollbacks) | e81fa7bc510b577ae15903019ba91777 x 3 |

Equal. The five section md5 values (quizzes, bank, log, flags, counters) are equal one by one in both runs: quizzes
e4fb68f9a676940775a90b8dba4863cb, bank 5ac72c12cf6a5294f07c7955cc744b69, log ac4c2bf30492f4a8ab2bf5bee53d2a6b, flags
362b3242e1bdd87e007f862de9ed6bc4, counters 032a51eaa4411124a7a5a1f14bff6b70. Four consecutive runs before 010 gave one md5.
Sensitivity: replacing ensure_daily_quiz_v2 inside the transaction by a variant with one changed word (the bank statuses read)
moves the md5 (ad3bc51d2987a4fde036aa874207dda5; 104 dates publish instead of 94).

Same date, kpop and anime (daily.sql part 2, after 010): 16 checks, pass 16, fail 0. Among them: a kpop and an anime daily on one
date both publish, in both call orders, and qotd_log holds 2 rows for that date (site kpop and site anime), 1 row for a date with an
anime bank row only; one flagged quiz per site and date (2 flagged on a date with both); the kpop call returns null on a date
where only the anime bank row exists; a second call returns the same quiz for each site; the hub and an unknown site return
null; the anime quiz carries site anime, the anime author, its group (or the anime fallback group) and no "source" key; a second
bank row for the same site and date is refused (quiz_bank_site_date); the single-date keys are gone; ACL of ensure_daily_quiz_v2
{postgres, service_role}, of ensure_daily_quiz unchanged {postgres, service_role}.

## 4. Contract
| item | result |
|---|---|
| check-contract.mts --target db --applied-only on scratch | 0 diff(s) over 526 contract object(s); 016-passport-deletion not applied yet (skipped) |
| contract.test.ts | 1 file, 88 tests passed |

## 5. Behaviour of 011 to 015 and 009 (checks.sql, BEGIN ... ROLLBACK)
38 checks, pass 38, fail 0 (scratch and local). They cover: RLS on 7 tables and 13 policies; anon reads only published rows of
series, arcs, characters, episodes, series_themes; no catalogue write for anon or authenticated; series_progress and
favourite_characters own rows only (insert, read, update, delete, and the refusals); favourite_character_counts hides 29 picks and
shows 30, readable by anon, authenticated and service_role, not writable; the value checks of series and series_progress; the
widened trivia and entity_sources checks; review_batches closed to anon and authenticated, its size, status and reviewed checks, the
quiz draft payload rule and the batch id cleared on delete; personality_profiles.character_id cleared when its character is
deleted; games_game_type_check with 8 types; quiz_bank_category_check (12 categories) and the same date for two sites;
ensure_daily_opening over 10 days (10 themes filed, 4 distinct in the first 4 days, never the same series two days running, days
5 to 8 repeat days 1 to 4, only published playable themes of published anime series, null for the hub, an unknown site and null
arguments, service role only); report_spoiler (counts 1, 1, 2, 3, 3, 4; the cover set at the third reporter for 7 days; no session
raises 28000; an unknown or unpublished quiz raises P0002; anon refused; the quiz stays published).
Rollback guards (guards.sh): 7 of 7 refuse with data in place and change nothing (009 non-kpop site author, 010 non-kpop bank row,
011 series row, 012 review batch, 013 profile pointing at a character, 014 daily opening, 015 spoiler cover).

## 6. Application
| item | result |
|---|---|
| pnpm -C apps/quiz exec tsc --noEmit | 0 errors |
| vitest run src/lib src/app/api | 148 files, 2651 tests passed |
| new unit tests of this lane | 9 files, 42 tests (kpop call shapes unchanged, anime branch) |
| check-site-scope.mts --base HEAD | clean (11 files) |
| scripts/o1/check.sh | twins ok |
| em dash, en dash, non-ASCII in the diff and the new files | 0 |
