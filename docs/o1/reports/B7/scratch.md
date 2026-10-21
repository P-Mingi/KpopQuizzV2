# B7 on o1-scratch: SQL 016 (numbers only)

Applied with `scripts/o1/migrate-dev.sh --branch scratch` (log kept outside the integration tree). Fixture users of `fixtures-scratch.json`.

## Apply, again, roll back, re-apply

Catalog fingerprint of the 8 functions (definition hash and privileges), 2 tables (RLS, privileges), 15 columns, constraints and indexes
(`md5` of the sorted lines, 39 lines):

| step | lines | md5 (first 8) |
|---|---|---|
| apply | 39 | 9a9d1291 |
| apply again | 39 | 9a9d1291 |
| rollback | 0 | none |
| re-apply | 39 | 9a9d1291 |
| re-apply again | 39 | 9a9d1291 |
| rollback, apply | 0, then 39 | none, then 9a9d1291 |

Privileges: `anon` and `authenticated` hold EXECUTE on 0 of the 8 functions; `service_role` on 5 (request, cancel, due, run, leave); the three
shared bodies (sentinel, reassign, purge) have no EXECUTE for any role. Both tables: RLS on, `authenticated` has no table privilege.

## Dry run and leave-a-world (one transaction, rolled back; the fixture rows come back)

| check | result |
|---|---|
| dry run `passport_leave_world(dual, anime)` | counts: favourites 1, world_follows 2, series_progress 1, favourite_characters 1, passport_prefs 1, world_memberships 1, quizzes_reassigned 3, user_badges 0, quizzes_deleted 0, sentinel_missing 1 |
| rows that differ from the snapshot after the dry run | 0 |
| log rows written by the dry run | 1 (leave_world, dry_run true, site anime) |
| leave `kpop`, leave `hub` | both raise |
| real leave with 3 quizzes to keep and no sentinel | raises (B7S01), nothing changed |
| real leave with a sentinel | counts as the dry run, sentinel_missing 0 |
| after it: kpop membership | 1 (kept) |
| after it: anime membership, quizzes of the user on anime | 0, 0 |
| after it: passport_prefs entry of kpop | kept (1) |
| after it: follower_count of the followed member on anime | -1 |
| after it: total quizzes, total profiles | +0, +0 |
| real leave with keep false (a member with 3 quizzes) | quizzes_deleted 3, quizzes_reassigned 0 |
| after the rollback: anime membership, quizzes of dual, log rows | 1, 3, 0 |

## Request, cancel, run

| check | result |
|---|---|
| `passport_request_deletion` run_after minus now | 7 days |
| `passport_issue_code` while pending | deletion_pending |
| request again | 1 row (refreshed) |
| cancel, cancel again | true, false |
| `passport_issue_code` after the cancel | not deletion_pending |
| real run with no request, and with a request not yet due | raises (B7R01), both |
| `passport_due_deletions` with one due request | 1 row |
| real run, due, without Mission U part D | raises (B7M01), nothing changed |
| dry run on the due request | mission_u_d_installed 0, anime: memberships 1, quizzes_reassigned 3, sentinel_missing 1; kpop: all 0 |
| real run with a stand-in `admin_delete_account` (this transaction only) | counts returned; anime membership 0, passport_prefs 0, quizzes of the user 0, real log row 1 |
| after the rollback: requests, anime membership, quizzes, log rows | 0, 1, 3, 0 |

The scratch database ends as it began: no request, no log row, no stand-in function (`to_regprocedure('public.admin_delete_account(uuid)')` is null).

## Rollback guard, review fix (real leave of a world)

The guard of `016-passport-deletion.rollback.sql` now refuses on any real log row: `dry_run = false and outcome = 'ok' and (kind = 'leave_world' or counts ? 'mission_u_d_installed')`.
Cycle on o1-scratch (one `--single-transaction` psql run per step; the test row is committed first and deleted after):

| step | result |
|---|---|
| insert one real `leave_world` log row (`dry_run` false, `outcome` ok) | 1 row |
| rollback with that row | refused: "1 real deletion runs or leaves are logged"; nothing changed (tables present, 1 `passport_run_deletion`) |
| delete the test row, rollback | clean: both tables `null`, 8 functions dropped |
| rollback again | no change, no error (idempotent) |
| re-apply 016 | `passport.deletion_log` present, 8 functions, 0 log rows, 0 requests |

Scratch is left with 016 applied and no test row.
