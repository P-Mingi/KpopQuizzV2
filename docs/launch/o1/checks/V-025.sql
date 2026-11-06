-- V-025 (run O1, session.sh E1b): after 025-quiz-alerts-every-publish.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From the Verify lines of the file's header (the behaviour, inside and outside the 20 hours, is not read here: apps/quiz/e2e/o1/E1b/alerts-rehearsal.sh plays it on a local Postgres).
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'notify_group_quiz_alerts : plus de garde notified_at is null', (select prosrc !~ 'notified_at is null' from pg_proc where oid = to_regprocedure('public.notify_group_quiz_alerts()')), null),
  (2, 'notify_group_quiz_alerts : la règle des 20 heures et RETURNING user_id', (select prosrc ~ '20 hours' and prosrc ~* 'returning user_id' from pg_proc where oid = to_regprocedure('public.notify_group_quiz_alerts()')), null),
  (3, 'notify_group_quiz_alerts : security definer, search_path public', (select prosecdef and coalesce(proconfig @> array['search_path=public'], false) from pg_proc where oid = to_regprocedure('public.notify_group_quiz_alerts()')), (select proconfig::text from pg_proc where oid = to_regprocedure('public.notify_group_quiz_alerts()'))),
  (4, 'notify_group_quiz_alerts : aucune entrée EXECUTE pour anon ni authenticated', (select exists (select 1 from pg_proc where oid = to_regprocedure('public.notify_group_quiz_alerts()')) and not exists (select 1 from pg_proc p, aclexplode(p.proacl) a where p.oid = to_regprocedure('public.notify_group_quiz_alerts()') and a.privilege_type = 'EXECUTE' and a.grantee in (select r.oid from pg_roles r where r.rolname in ('anon', 'authenticated')))), null),
  (5, 'les 2 déclencheurs group_quiz_alerts_on_insert et group_quiz_alerts_on_publish', (select count(*) = 2 from pg_trigger where not tgisinternal and tgname in ('group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish')), (select count(*)::text from pg_trigger where not tgisinternal and tgname in ('group_quiz_alerts_on_insert', 'group_quiz_alerts_on_publish'))),
  (6, 'index group_quiz_alerts_group_idx sur (group_id) : 1', (select count(*) = 1 from pg_indexes where schemaname = 'public' and indexname = 'group_quiz_alerts_group_idx' and indexdef like '%ON public.group_quiz_alerts USING btree (group_id)'), (select count(*)::text from pg_indexes where schemaname = 'public' and indexname = 'group_quiz_alerts_group_idx'))
) as c(n, what, ok, got) order by n;
rollback;
