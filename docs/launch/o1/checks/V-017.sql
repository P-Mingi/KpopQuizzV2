-- V-017 (run O1, session.sh): after 017-deletion-kpop.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'passport_run_deletion et passport_deletion_status : service_role seulement', (select count(*) = 2 and bool_and(not has_function_privilege('anon', oid, 'execute') and not has_function_privilege('authenticated', oid, 'execute') and has_function_privilege('service_role', oid, 'execute')) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_run_deletion', 'passport_deletion_status')), null),
  (2, 'passport_run_deletion appelle admin_delete_account pour kpop', (select position('admin_delete_account($1, $2, false)' in prosrc) > 0 from pg_proc where pronamespace = 'public'::regnamespace and proname = 'passport_run_deletion'), null)
) as c(n, what, ok, got) order by n;
rollback;
