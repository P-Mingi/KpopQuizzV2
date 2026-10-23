# S4 report (2026-10-23, lane C2)

No key, no database URL. Production never touched; only o1-scratch and o1-dev written, through `scripts/o1/env.sh`.

## Scope

| | Count |
|---|---|
| SECURITY DEFINER functions in the finding, confirmed in prod-public.sql (one signature each, `=X/postgres`) | 32 |
| of which also carry an explicit anon and authenticated grant | 10 |
| revoked from PUBLIC, anon, authenticated (service_role kept) | 28 |
| kept, called by the browser through the anon or user key (fix proposed in README.md) | 4 |
| byeol functions revoked without condition | 5 |
| O1 files 003 to 016 that hand EXECUTE back to PUBLIC | 1 (008, merge_anon_passport, 7 arguments; and its rollback on the 6 argument form) |

## Branches

Before S4 both branches held the production ACLs on all 32 (22 `PUBLIC,postgres,service_role`, 10 `PUBLIC,anon,authenticated,postgres,service_role`),
except that merge_anon_passport exists in O1's 7 argument form (008), still with PUBLIC.

| Step | o1-scratch | o1-dev |
|---|---|---|
| apply | rc 0 | rc 0 |
| apply again | rc 0, 0 ACL changed | rc 0, 0 ACL changed |
| verify: anon f, authenticated f, service_role t | 28 of 28 | 28 of 28 |
| verify: the 4 kept still anon t, authenticated t, service_role t | 4 of 4 | 4 of 4 |
| rollback | rc 0, grantee sets equal to before on 32 of 32 | rc 0, grantee sets equal to before on 32 of 32 |
| re-apply | rc 0, equal to the first apply on 32 of 32 | rc 0, equal to the first apply on 32 of 32 |
| final state (left applied) | 28 closed, 4 open | 28 closed, 4 open |
| self-check negative test (PUBLIC granted back on award_xp in a rolled back transaction) | aborts, 1 function reported | not run |
| SET ROLE checks | | anon on get_daily_bt_leaderboard: permission denied; authenticated on award_xp: permission denied; service_role on get_daily_bt_leaderboard: 0 rows, ok; anon on get_personality_counts (kept): ok |

Note: after a rollback the PUBLIC entry sits at the end of the aclitem array instead of the start; the grantee set is
identical and privilege checks are unaffected.

## e2e on o1-dev (S4 applied)

| Run | Pass | Fail | Skip |
|---|---|---|---|
| `bash apps/quiz/e2e/o1/O1/run-dev.sh --with-jump` (rebuild of kpop, anime, hub): leak, dev-multi, C3, B3/jump | 43 | 0 | 9 (the gate's standing skips: 8 need Q0b's fixture sign-in suite, 1 waits for O3's spoiler cases) |
| `apps/quiz/e2e/o1/C2/s4-plays.o1.ts` on the local kpop server (servers of the same build, `--skip-build --hold`) | 7 | 0 | 0 |
| `permission denied` or 42501 lines in the kpop, anime and hub server logs | 0 | | |

s4-plays covers, signed out and signed in (fixture kpop_heavy): a kpop quiz play (record_play by the user key, award_xp
by the service role), a like then unlike (increment_like_count, decrement_like_count, award_like_xp), the daily quiz
(/daily redirect, the play, /api/daily/complete), the daily blind test (/blindtest, /api/daily/blindtest,
submit: 200 signed in, 401 signed out as before, the leaderboard API and page, /api/daily/complete), and two PostgREST
probes with the anon key (get_daily_bt_leaderboard refused with 42501, get_personality_counts 200).
Writes it left on o1-dev, all through the app: 2 fixture plays plus signed-out plays, one like taken back, the
fixture's daily streak date set to 2026-10-23, one daily blind test score.
