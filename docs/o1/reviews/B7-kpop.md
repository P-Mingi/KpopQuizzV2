# Review R, lane B7: KpopQuiz "Delete account" wired to the passport deletion

Verdict: PASS (no blocker). Scope: diff o1/integration...o1/B7 (commit 7e845da), plus the uncommitted 017-deletion-kpop.sql, its rollback,
and the flags-env.md and LANES.md rows. Read only; nothing run, nothing written except this file.

## What was checked, against the 7 blocker classes

SQL
1. ACL and search_path: passport_run_deletion and passport_deletion_status (017:41-49, 52-144) are security definer with
   `set search_path = public`, `revoke all ... from public, anon, authenticated`, `grant execute ... to service_role`. Part D
   admin_delete_account (account-deletion.sql:105-113, 625-627) has the same. 017 touches no other function and no existing ACL.
2. Real-run guards (017:79-86): needs a request row (locked `for update`), not cancelled, not completed, `run_after <= now()`,
   else B7R01. keep_quizzes is read from the row (017:77), the value the member chose (route passes body.keepQuizzes, UI sends `!remove`).
   Twice or concurrent: the second run blocks on the row lock, then the request row is gone (cascade with the auth user), so it
   raises. Staff or system account: part D refuses (editorial account, sentinel, Team) and raises, which undoes the whole call. The call
   is one transaction (purge of other worlds, step 1, part D, auth user delete), so there is no half state and no retry gap; the cron
   `alreadyGone` path covers the old "auth user deleted afterwards" step.
3. Row leftovers and sentinel: step 1 (017:93-111) pins to passport_site_sentinel('kpop') exactly the quizzes part D would delete that
   qotd_log or quiz_bank still points to (the only two NO ACTION FKs to quizzes in prod-public.sql:6354,6356; same predicate as part D
   refusal 3 and A1/A2). Kept quizzes then go to the dead sentinel in part D A3. Plays, likes, scores on kept quizzes are not touched
   (the functional run in kpop-deletion-sql.md shows 5 of 5 plays kept). Part D self-check (I) and the e2e catalog scan (rows still
   carrying the id = 0) cover the rest. Passport rows: passport_prefs and handoff_codes deleted, handoff_events anonymized (017:113-118).
4. Rollback (017.rollback:33-98) is byte-identical to the 016 function (diffed 016-passport-deletion.sql:215-318 against it: IDENTICAL),
   re-asserts the same revoke/grant, drops only passport_deletion_status, and refuses while any request is pending, so no data is lost.

App
5. Routes (account.ts handleDelete, handleCancel, handleDeletionStatus): the user id comes only from `supabase.auth.getUser()`; no id in
   the body or the URL. Delete keeps the fresh sign-in (600 s), the `@username` confirm and the origin check; the status read and cancel
   need a session. Logs carry route, outcome, site only. Responses carry `{runAfter}`, `{pending}`, `{cancelled}`; no token, code or
   address; the notice link is `<origin>/settings`. Flag off: accountRoutesOpen('kpop') is false, so all three answer 404 before any
   read; the flag is a build-time NEXT_PUBLIC value.
6. Flag off, kpop: settings.tsx renders the same row and the same ConfirmSheet text and contact-page push (`NET_DELETION ? ... : <old JSX>`);
   ConfirmSheet's new `extra`/`confirmDisabled` props render nothing when absent; account-deletion.tsx and copy/kpop/b7.ts are loaded only
   through next/dynamic under the flag. render.ts only relaxes the kpop check for kind deletionScheduled; Auth mails for kpop still throw
   as before. Em and en dash grep over the diff and the uncommitted files: none.
7. Mail sink (notice.ts mailSinkFile): active only when O1_MAIL_SINK is set AND O1_ENV is dev or scratch AND VERCEL_ENV is not production;
   it only writes a local file (and omits the address), so it cannot send. The e2e is skipped unless the O1_B7_* variables and
   O1_DB_URL are set; its only entry point run-dev.sh runs everything through scripts/o1/env.sh dev, which refuses a file naming the
   production ref (PROD_REF grep, branch-ref checks on the Supabase and DB URLs) and never offers production as a target.

## Notes (not blockers)
- GET /api/passport/delete on kpop with the flag off now answers 404 (account.ts handleDeletionStatus); today Next answers 405 for a method the
  route does not export. flags-env.md states the 404 on purpose. Exact fix if wanted: return 405 with `Allow: POST` when the route is closed, in the GET path only.
- kpop-deletion.o1.ts has no guard of its own against a production target (it relies on env.sh and run-dev.sh). One-line hardening:
  add `process.env.O1_ENV !== 'dev' && process.env.O1_ENV !== 'scratch'` to the existing `test.skip(...)` condition.
- A staff or system account can still be told "deletion scheduled" and signed out; the real run then refuses forever (cron logs a failure each pass), nothing is deleted. Safe, but silent to the member.
- The deletion only runs where the hub cron runs (cronSkipFor hub); 016, part D and 017 must be applied in that order before the flag goes on in production.
