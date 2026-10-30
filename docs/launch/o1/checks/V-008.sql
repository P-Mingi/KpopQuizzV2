-- V-008 (run O1, session.sh): after 008-write-locks.sql (the signature comparison is done by session.sh)
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V4 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'les 5 déclencheurs de 008', (select count(*) = 5 from pg_trigger where tgname in ('on_quiz_insert', 'trg_notify_badge_earned', 'group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish', 'trg_passport_on_battle_result')), (select count(*)::text from pg_trigger where tgname in ('on_quiz_insert', 'trg_notify_badge_earned', 'group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish', 'trg_passport_on_battle_result'))),
  (2, 'merge_anon_passport : une seule version, 7 arguments, service_role seulement', (select count(*) = 1 and bool_and(pronargs = 7 and not has_function_privilege('anon', oid, 'execute') and not has_function_privilege('authenticated', oid, 'execute') and has_function_privilege('service_role', oid, 'execute')) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'merge_anon_passport'), (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname = 'merge_anon_passport'))
) as c(n, what, ok, got) order by n;
rollback;
