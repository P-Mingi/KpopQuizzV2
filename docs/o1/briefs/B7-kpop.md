# Lane B7: KpopQuiz "Delete account" becomes the passport deletion at launch (owner, 2026-10-24, option 1)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B7, branch o1/B7 (ORCH made it from o1/integration, which now
holds Mission U part D, #105). Q = apps/quiz/src, M = docs/pending-migrations, S = /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1/scripts/o1.
Read this brief, docs/o1/briefs/B7.md (its rules apply), M/multisite/016-passport-deletion.sql, M/account-deletion.sql and
M/account-deletion-MODE-EMPLOI.md (part D), Q/lib/passport/deletion/*, Q/app/api/cron/passport-deletions/route.ts, Q/copy/hub/b7.ts,
Q/components/profile/ux-v1/settings.tsx and the code you change. Nothing else.
## Rules
- No push, no production, no connector, no supabase, vercel or gh; never open ~/kpq-o1/secrets; never print a key, token or link.
  SQL on o1-scratch first, then o1-dev (S/env.sh <scratch|dev> -- psql ... -v ON_ERROR_STOP=1). No en or em dash, no emoji.
- Never edit docs/o1/contracts/** except one new row in flags-env.md for the flag below; never scripts/o1/**, middleware, next.config.
- Kpop while the flag is off: every page renders the same HTML and Flight as today (production parity), the same client modules on
  every route (apps/quiz/e2e/o1/P1/kpop-chunks.sh) and the same chunk count (apps/quiz/e2e/o1/O2/kpop-chunk-count.sh). Chunk bytes
  may change. The settings delete row and sheet keep today's text (part D: by hand, contact page, 30 days) when off.
## What the owner wants (flag on, at launch)
On KpopQuiz, Settings, "Delete account" starts the passport deletion: the user confirms (same confirm rules as B7: type @username,
fresh sign-in of 10 minutes), is signed out everywhere, gets the "deletion scheduled" email, can cancel for 7 days by signing in,
and after 7 days everything is deleted; published quizzes are kept under "deleted user" unless the user asked to remove them.
## Do
1. Flag NEXT_PUBLIC_NET_DELETION (public, lane B7) in Q/lib/site/registry.ts O1_FLAGS and its flags-env.md row. Off: today.
   On: the kpop settings row and confirm sheet call the existing B7 request route, with the choice "also remove my published
   quizzes" (default off), and a pending deletion shows a cancel action. Rule 18: reuse the B7 components and copy through
   optional props; no copy of a component. The labels "Delete account" and the part D labels pinned by e2e stay.
2. One "deleted user": the kpop data of the account is removed by part D's public.admin_delete_account (sentinel
   00000000-0000-0000-0000-00000000dead), called by passport_run_deletion after the other sites' purges; keep_quizzes from the
   request. Write the change as M/multisite/017-deletion-kpop.sql (+ rollback, header and idempotence like 016), service_role
   only, SECURITY DEFINER with a fixed search_path. Add M/account-deletion.sql to the manifest before 017 if it is not in it, and
   say in the hand-back where the launch SQL order (docs/launch/o1/SQL-ORDER.md) must take both. Apply on o1-scratch twice
   (no change the second time), rollback, re-apply; then o1-dev.
3. Email: the scheduled email goes through the existing sender. On o1-dev no real email leaves: if the sender has no test sink,
   add one that only works when the target is not production (a row or a file the e2e reads), never in a production build.
## e2e on o1-dev (spec apps/quiz/e2e/o1/B7/kpop-deletion.o1.ts, evidence docs/o1/reports/B7/kpop-deletion.md, numbers only)
A fresh test kpop account with 2 published quizzes, plays, a badge, a follow: (1) request from kpop Settings with the flag on;
(2) the email is produced (subject, date in 7 days); (3) sign in, cancel: nothing deleted, request cancelled; (4) request again,
move run_after into the past on o1-dev only, call the cron route as the scheduler does: auth user gone, profile gone, quizzes
owned by the dead sentinel with plays kept, no row left with the account id in any table part D lists; a second account untouched.
Also the "remove my quizzes" variant: quizzes gone. Clean up the test accounts after.
## Checks
Unit tests (flag off: today's text and handler; on: request, cancel), `pnpm -C apps/quiz exec tsc --noEmit` 0, vitest of the
touched folders green, S/check.sh ok, the two kpop chunk scripts against the base, kpop build green with the flag off and on.
Commit on o1/B7 ("o1: B7 kpop deletion ..."; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 10 lines: sha, files (count), SQL applied where, e2e results, chunk proofs, SQL order for launch, open issues.
