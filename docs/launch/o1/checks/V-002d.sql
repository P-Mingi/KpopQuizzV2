-- V-002d (run O1, session.sh): after 002d-quiz-site-guard.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V2 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'déclencheur trg_quizzes_site_guard actif', (select count(*) = 1 from pg_trigger where tgrelid = 'public.quizzes'::regclass and tgname = 'trg_quizzes_site_guard' and tgenabled = 'O'), (select count(*)::text from pg_trigger where tgrelid = 'public.quizzes'::regclass and tgname = 'trg_quizzes_site_guard')),
  (2, 'quizzes_site_guard : security definer, search_path public, fermée à anon', (select prosecdef and proconfig = '{search_path=public}' and not has_function_privilege('anon', oid, 'execute') from pg_proc where oid = 'public.quizzes_site_guard()'::regprocedure), null),
  (3, 'aucune ligne hors kpop dans quizzes', (select count(*) = 0 from public.quizzes where site_id <> 'kpop'), (select count(*)::text from public.quizzes where site_id <> 'kpop')),
  (4, 'aucun badge hors kpop', (select count(*) = 0 from public.badge_definitions where site_id <> 'kpop'), (select count(*)::text from public.badge_definitions where site_id <> 'kpop'))
) as c(n, what, ok, got) order by n;
rollback;
