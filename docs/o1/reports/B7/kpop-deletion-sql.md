# B7 kpop deletion, SQL 017: scratch and dev (numbers only)

Files: docs/pending-migrations/account-deletion.sql (Mission U part D, run first), docs/pending-migrations/multisite/017-deletion-kpop.sql and its rollback.
Applied with `scripts/o1/env.sh <scratch|dev> -- psql -v ON_ERROR_STOP=1` (017 with --single-transaction). Fingerprint = md5 of the function body plus its ACL.

| step | o1-scratch | o1-dev |
|---|---|---|
| part D applied (sentinel profile 1 row, admin_delete_account present) | yes | yes |
| part D applied a second time: admin_delete_account fingerprint | unchanged | not re-run |
| 016 fingerprint of passport_run_deletion before 017 | 478d1fbb | 478d1fbb |
| 017 applied: passport_run_deletion fingerprint | 07aeec3a | 07aeec3a |
| 017 applied a second time: fingerprints of the 2 functions | unchanged | unchanged |
| 017 rollback: passport_run_deletion fingerprint (equals the 016 one) | 478d1fbb | not run |
| 017 rollback a second time | unchanged, passport_deletion_status absent | not run |
| 017 re-applied: fingerprints | 07aeec3a, c4586b1f (same as the first apply) | n/a |
| anon, authenticated, service_role EXECUTE on passport_run_deletion, passport_deletion_status, admin_delete_account | f, f, t | f, f, t |

Functional run on o1-scratch (3 fixture accounts made and removed by SQL; A has 3 quizzes of which 2 published and 1 draft, 5 plays on them, 1 badge, 2 follow rows with B; B is a second account; C asks to remove its quizzes):

| measure | value |
|---|---|
| dry run before any request: kpop_actions_rows, kpop_refusals, mission_u_d_installed | 6, 0, 1 |
| request: days to run_after, status read pending | 7, true |
| real run before it is due | refused (B7R01) |
| cancel: true, status pending after, quizzes still | true, false, 3 |
| dry run when due, then rows changed by it | counts only, 0 |
| real run, keep: auth user, profile, membership, request rows left | 0, 0, 0, 0 |
| real run, keep: published quizzes under the dead sentinel, draft quiz | 2 of 2, deleted |
| plays kept on A's quizzes, rows still carrying A's id (plays, follows, badges) | 5, 0 |
| second account B: auth, profile, quizzes, badges | 1, 1, 3, 1 (unchanged) |
| real run, remove quizzes (C): auth user rows, quizzes left | 0, 0 |
| fixtures left after cleanup | 0 |

o1-dev: the end-to-end run of kpop-deletion.md exercised the same function with real sign-ins.
