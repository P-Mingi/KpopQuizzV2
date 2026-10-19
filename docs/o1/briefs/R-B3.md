# Review R, lot (c), lane B3: the shared passport (one pass, blockers only)
Read-only review of `git -C /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B3 diff o1/integration...o1/B3`.
Write only docs/o1/reviews/B3.md inside /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B3 and commit it there
("o1: R review of B3"; commit hook agent id B3). Never open ~/kpq-o1/secrets, never write a database, never push, no connector.
Reference for today's production functions: ~/kpq-o1/prod-public.sql (schema dump, no secret; grep and sed ranges only).
## A blocker is only one of these
SQL (docs/pending-migrations/multisite/003 to 008 and rollbacks):
1. A kpop branch of the 11 write locks (award_xp, record_play, handle_new_quiz, increment_like_count, decrement_like_count,
   notify_badge_earned, notify_group_quiz_alerts, cast_duel_vote, passport_on_battle_result, record_bt_play, merge_anon_passport) that is
   not today's body: extract both bodies and diff them mechanically, whitespace aside. Also the rollbacks against prod-public.sql.
2. An ACL, owner or SECURITY DEFINER change on an existing function; a SECURITY DEFINER function without a fixed search_path.
3. A trigger on profiles that can block or slow a sign-up; a backfill that is not idempotent or locks profiles long on a large table.
4. RLS: a new table without RLS, a policy that lets a user read or write another user's rows, schema passport reachable from the Data API,
   a service-role-only function executable by anon or authenticated.
5. Any write path that can change a kpop counter, xp, badge or notification from a non-kpop action, or the reverse.
6. A rollback that does not restore the schema exactly, or that can lose kpop data.
App (the jump and per-site XP):
7. Open redirect (next, to, from), state or PKCE not checked, a code or ticket usable twice, longer than its lifetime, or for another
   client; non constant-time comparison of a MAC; a code, ticket or token in a log, URL query, Referer or response body beyond the spec.
8. A cookie other than __Host-pp_tx / pp_tx, or with wrong attributes; a session made for the wrong user; no 409 when another user is
   signed in on the target.
9. With PASSPORT_JUMP off or the secret missing: anything reachable beyond the 302 and 404 of the spec.
10. A kpop call whose arguments or result differ from today (award_xp callers, safeReturnTo without site, create-profile, merge-anon,
   getLevelInfo, daily-streak) or a kpop component whose render tree changes.
Anything else (style, naming, nice to have) is not a blocker: at most 5 lines of notes.
## Output
docs/o1/reviews/B3.md: verdict PASS or BLOCKED, then each blocker with file:line, why, and the smallest fix. Hand back at most 10 lines.
