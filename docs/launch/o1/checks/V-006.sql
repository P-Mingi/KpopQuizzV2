-- V-006 (run O1, session.sh): after 006-passport-handoff.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V3 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'schéma passport fermé à anon et authenticated, ouvert à service_role', (select not has_schema_privilege('anon', 'passport', 'usage') and not has_schema_privilege('authenticated', 'passport', 'usage') and has_schema_privilege('service_role', 'passport', 'usage')), null),
  (2, 'handoff_codes et handoff_events avec RLS', (select count(*) = 2 from pg_class where relnamespace = 'passport'::regnamespace and relkind = 'r' and relname in ('handoff_codes', 'handoff_events') and relrowsecurity), (select count(*)::text from pg_class where relnamespace = 'passport'::regnamespace and relkind = 'r' and relname in ('handoff_codes', 'handoff_events') and relrowsecurity)),
  (3, 'fonctions passport_* : 4, fermées à anon, ouvertes à service_role', (select count(*) = 4 and bool_and(not has_function_privilege('anon', oid, 'execute') and has_function_privilege('service_role', oid, 'execute')) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_issue_code', 'passport_redeem_code', 'passport_log_event', 'passport_cleanup')), (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_issue_code', 'passport_redeem_code', 'passport_log_event', 'passport_cleanup')))
) as c(n, what, ok, got) order by n;
rollback;
