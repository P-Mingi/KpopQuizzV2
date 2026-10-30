-- V-010 (run O1, session.sh): after 010-daily-v2.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V5 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'anciennes clés uniques de date : 0', (select count(*) = 0 from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key')), (select count(*)::text from pg_constraint where conname in ('quiz_bank_scheduled_date_key', 'qotd_log_featured_date_key'))),
  (2, 'ensure_daily_quiz et ensure_daily_quiz_v2 : security definer, service_role seulement', (select count(*) = 2 and bool_and(prosecdef and not has_function_privilege('anon', oid, 'execute') and not has_function_privilege('authenticated', oid, 'execute') and has_function_privilege('service_role', oid, 'execute')) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('ensure_daily_quiz', 'ensure_daily_quiz_v2')), (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in ('ensure_daily_quiz', 'ensure_daily_quiz_v2')))
) as c(n, what, ok, got) order by n;
rollback;
