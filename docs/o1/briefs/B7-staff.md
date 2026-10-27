# Lane B7: a staff account is told "deletion scheduled" but is never deleted (owner, 2026-10-25)
Worktree /Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-B7, branch o1/B7 (first `git merge --no-edit o1/integration`).
Q = apps/quiz/src. Read this brief, Q/lib/passport/deletion/account.ts and its test, the refusals of public.admin_delete_account in
docs/pending-migrations/account-deletion.sql (lines 158 to 170: an editorial_accounts row; reviewed_by on editorial_drafts whose
status is not draft or rejected; a quiz that would be deleted and is linked from quiz_bank.published_quiz_id), and Q/copy/hub/b7.ts. Nothing else.
## Rules
No push, no production, no connector; never open ~/kpq-o1/secrets; no SQL change (app only), no write to any database. No en or em
dash, no emoji. Kpop with NEXT_PUBLIC_NET_DELETION off: unchanged.
## Do
The delete request handler checks, before it calls passport_request_deletion and before it signs the user out, the same three
conditions part D refuses, as written in the SQL (the third with the keep_quizzes the user chose). If one holds: no request row, no sign-out, no email; answer 409
{ error: 'staff_account' } (third condition: { error: 'manual_deletion' }, same line without "This is a staff account."); the UI shows one plain line from a new copy key: "This is a staff account. Write to {contact} and we
delete it by hand." ({contact} = the site's contact mailbox from the registry). If the check itself fails (read error): 500, nothing done.
## Checks
Unit tests in the existing account test file: editorial account refused (409, no rpc, no sign-out, no email), reviewer refused, bank-linked quiz with remove refused and with keep accepted,
read error 500, a normal user unchanged. `pnpm -C apps/quiz exec vitest run src/lib/passport/deletion` green; tsc 0.
One commit on o1/B7 ("o1: B7 staff accounts are refused up front"; last line `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`).
Hand back at most 4 lines: sha, files, tests.
