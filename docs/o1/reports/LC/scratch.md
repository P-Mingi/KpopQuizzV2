# Lot (c) part 1, lane B3: passport SQL 003 to 008 on o1-scratch

Numbers only. Database: the branch o1-scratch (PostgreSQL 17.11), reached through scripts/o1/migrate-dev.sh --branch scratch
and env.sh scratch; no URL or key appears here. Scratch is left with 003 to 008 applied. Files: docs/pending-migrations/multisite/
003 to 008 (each with its .rollback.sql); tests in apps/quiz/e2e/o1/B3/ (equivalence.sql, equivalence.sh, checks.sql, checks.sh,
catalog-dump.sh).

## 1. Apply and verify
| item | result |
|---|---|
| files applied in order 003, 004, 005, 006, 007, 008 | 6 of 6 ok |
| second run of the six files | 6 of 6 ok, catalog dump identical (9255 lines before and after) |
| world_memberships rows with site_id 'kpop' | 37 |
| profiles rows | 37 (equal) |
| sum(profiles.xp) before 003 / after 008 | 12000 / 12000 |
| badge_definitions rows with site_id <> 'kpop' | 0 |
| kpop memberships carrying progression columns | 0 |
| profiles without a kpop membership | 0 |

## 2. Sign-up trigger and 007 guards (checks.sql, inside BEGIN ... ROLLBACK)
| item | result |
|---|---|
| new profile gets its kpop membership (joined_via signup, activated, notice seen) | ok |
| profile created with app.site_id = anime gets one anime membership, not activated, no kpop one | ok |
| forced failure inside the trigger (unknown site) leaves the profile inserted, membership missing | ok |
| award_world_xp('kpop', ...) and bump_world_counter('kpop', ...) raise | ok |
| whole checks.sql | 157 checks, pass 157, fail 0 |

checks.sql covers: the ACL matrix (15 new functions x anon, authenticated, service_role, PUBLIC), RLS reads and refused writes,
ensure_membership, create_profile_for_site, my_passport, public_passport (fail closed), update_my_membership,
set_passport_prefs, favourites, world_follows and their counters, the two views, net_bridge_bump, the whole passport handoff
(issue, 30 per user and 60 per IP per hour, redeem, replay, pkce_fail, expired, cleanup, deletion_pending behind to_regclass),
and the world branches of the 11 locked functions (no kpop column written, world counters moved, activity filed under the world).
Rollback guards tried: 003, 004, 005, 006 and 007 each refuse (5 of 5) with their data in place, and the 003 drop fails (nothing changed) while the 004 views exist.

## 3. Equivalence of 008 (equivalence.sql, BEGIN ... ROLLBACK, deterministic, kpop data only)
Calls per path (identical in both runs):
| path | calls | path | calls |
|---|---|---|---|
| record_play | 130 | cast_duel_vote | 70 |
| award_xp | 110 | battle_result (trigger passport_on_battle_result) | 70 |
| award_like_xp (-> award_xp) | 60 | record_bt_play | 70 |
| increment_like_count | 120 | merge_anon_passport (6 arguments) | 60 |
| decrement_like_count | 60 | follow_insert / follow_delete | 60 / 20 |
| quiz_create (handle_new_quiz, notify_group_quiz_alerts) | 60 | user_badges_insert (trg_notify_badge_earned) | 60 |
| quiz_publish (group_quiz_alerts_on_publish) | 20 | | |

| run | md5 |
|---|---|
| before 008 (003 to 007 applied) | bc1327561ca19bfa466208dbdcc1079e |
| after 008 | bc1327561ca19bfa466208dbdcc1079e |

Equal. The 20 section md5 values (profiles 20 rows, badges 66, notifications 88, activity 319, mastery 83, plays 130, quizzes 60,
groups 12, players 20, bt_plays 70, duel ratings 6, songs 10, battle_results 70, alerts 6, returns of 5 functions 430 rows) are
equal one by one. Sensitivity: replacing notify_badge_earned by a variant with one changed word inside the same transaction
changes the md5 (c90d08adab1ca0c3faa91dab59eb30d1). 14 consecutive runs before 008 gave one md5 (the two rows cast_duel_vote returns
in heap order are sorted before hashing; with them unsorted the md5 moved from run to run).

## 4. Catalog diff (pg_dump --schema-only of public and passport via catalog-dump.sh, not committed)
| step | result |
|---|---|
| dump before 003 | 8146 lines |
| rollback 008, 007, 006, 005, 004, 003 in that order | 6 of 6 ok |
| dump after the rollbacks | 8146 lines, diff against before: 0 lines (ordering included) |
| rollbacks run a second time | 6 of 6 ok, nothing changes |
| dump with 003 to 008 applied | 9255 lines |
| re-applied 003 to 008, scratch left applied | 6 of 6 ok |

008 verbatim check (script outside the repo): for the 10 CREATE OR REPLACE functions the kpop branch is a contiguous run of today's
statements from the production dump; award_xp differs from today in exactly 2 lines (the kpop-quiz filter); the 008 rollback
holds the 11 production definitions byte for byte.

## 5. Contract
| command | result |
|---|---|
| check-contract.mts --target db --applied-only | 0 diffs over 278 contract objects (009 to 016 not applied yet, skipped) |
| vitest run src/lib/site/contract.test.ts | 1 file, 88 tests passed |

## 6. Types
| command | result |
|---|---|
| pnpm -C apps/quiz exec tsc --noEmit | 0 errors |
