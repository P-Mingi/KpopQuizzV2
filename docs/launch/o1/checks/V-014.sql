-- V-014 (run O1, session.sh): after 014-daily-openings.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'table daily_openings et fonction ensure_daily_opening', (select to_regclass('public.daily_openings') is not null and to_regprocedure('public.ensure_daily_opening(date,text)') is not null), null),
  (2, 'une seule policy sur daily_openings : lecture publique', (select count(*) = 1 and bool_and(polname = 'daily_openings_select_public' and polcmd = 'r') from pg_policy where polrelid = 'public.daily_openings'::regclass), null),
  (3, 'ensure_daily_opening : service_role seulement', (select not has_function_privilege('anon', 'public.ensure_daily_opening(date,text)'::regprocedure, 'execute') and not has_function_privilege('authenticated', 'public.ensure_daily_opening(date,text)'::regprocedure, 'execute') and has_function_privilege('service_role', 'public.ensure_daily_opening(date,text)'::regprocedure, 'execute')), null)
) as c(n, what, ok, got) order by n;
rollback;
