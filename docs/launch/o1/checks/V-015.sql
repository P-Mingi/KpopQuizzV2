-- V-015 (run O1, session.sh): after 015-spoilers.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'table spoiler_reports et report_spoiler', (select to_regclass('public.spoiler_reports') is not null and to_regprocedure('public.report_spoiler(uuid)') is not null), null),
  (2, 'report_spoiler : authenticated oui, anon non', (select has_function_privilege('authenticated', 'public.report_spoiler(uuid)', 'execute') and not has_function_privilege('anon', 'public.report_spoiler(uuid)', 'execute')), null),
  (3, 'index reports_spoiler_once absent', (select count(*) = 0 from pg_indexes where indexname = 'reports_spoiler_once'), null)
) as c(n, what, ok, got) order by n;
rollback;
