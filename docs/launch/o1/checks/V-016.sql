-- V-016 (run O1, session.sh): after 016-passport-deletion.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'deletion_requests et deletion_log avec RLS, aucune policy', (select count(*) = 2 from pg_class c where relnamespace = 'passport'::regnamespace and relkind = 'r' and relname in ('deletion_requests', 'deletion_log') and relrowsecurity and not exists (select 1 from pg_policy p where p.polrelid = c.oid)), null),
  (2, 'les 5 fonctions de suppression : service_role seulement', (select count(*) = 5 and bool_and(not has_function_privilege('anon', oid, 'execute') and not has_function_privilege('authenticated', oid, 'execute') and has_function_privilege('service_role', oid, 'execute')) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_request_deletion', 'passport_cancel_deletion', 'passport_run_deletion', 'passport_leave_world', 'passport_due_deletions')), (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_request_deletion', 'passport_cancel_deletion', 'passport_run_deletion', 'passport_leave_world', 'passport_due_deletions'))),
  (3, 'demandes de suppression : 0', (select count(*) = 0 from passport.deletion_requests), (select count(*)::text from passport.deletion_requests))
) as c(n, what, ok, got) order by n;
rollback;
