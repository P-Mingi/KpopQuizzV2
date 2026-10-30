-- V-020 (run O1, session.sh): after 020-dle-kpop-idol.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From the header of 020-dle-kpop-idol.sql and dle-smoke.sql checks 3, 5, 6, 7 and 10.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'vue dle_src_kpop_idol en security_invoker, fermée au navigateur', (select coalesce('security_invoker=true' = any (reloptions), false) and not has_table_privilege('anon', oid, 'select') and not has_table_privilege('authenticated', oid, 'select') from pg_class where oid = 'public.dle_src_kpop_idol'::regclass), null),
  (2, 'kpopdle-idol présent, éteint, sans date de départ', (select not active and epoch is null from public.dle_games where id = 'kpopdle-idol'), null),
  (3, 'kpopdle-idol : 8 colonnes', (select count(*) = 8 from public.dle_attributes where game_id = 'kpopdle-idol'), (select count(*)::text from public.dle_attributes where game_id = 'kpopdle-idol')),
  (4, 'banque vide avant l''activation', (select count(*) = 0 from public.dle_schedule), (select count(*)::text from public.dle_schedule)),
  (5, 'la vue ne lit ni height_cm, ni mbti, ni blood_type', (select pg_get_viewdef('public.dle_src_kpop_idol'::regclass) !~ '(height_cm|mbti|blood_type)'), null),
  (6, 'idols dans la vue (information)', true, (select count(*)::text from public.dle_src_kpop_idol))
) as c(n, what, ok, got) order by n;
rollback;
