-- V-019 (run O1, session.sh): after 019-dle-core.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From the header of 019-dle-core.sql and dle-smoke.sql checks 1 to 4 and 9.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'les 9 tables dle avec RLS', (select count(*) = 9 from pg_tables where schemaname = 'public' and tablename like 'dle\_%' and rowsecurity), (select count(*)::text from pg_tables where schemaname = 'public' and tablename like 'dle\_%' and rowsecurity)),
  (2, 'policies sur les tables dle : 0', (select count(*) = 0 from pg_policies where schemaname = 'public' and tablename like 'dle\_%'), (select count(*)::text from pg_policies where schemaname = 'public' and tablename like 'dle\_%')),
  (3, 'tables dle lisibles par anon ou authenticated : 0', (select count(*) = 0 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname like 'dle\_%' and c.relkind in ('r', 'v') and (has_table_privilege('anon', c.oid, 'select') or has_table_privilege('authenticated', c.oid, 'select'))), null),
  (4, 'fonctions dle ouvertes au navigateur : les 4 publiques seulement', (select coalesce(string_agg(distinct p.proname, ',' order by p.proname), '') = 'dle_day,dle_give_up,dle_guess,dle_pool' from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\_%' and (has_function_privilege('anon', p.oid, 'execute') or has_function_privilege('authenticated', p.oid, 'execute'))), null),
  (5, 'entity_images : license_verified et thumb_path', (select count(*) = 2 from information_schema.columns where table_schema = 'public' and table_name = 'entity_images' and column_name in ('license_verified', 'thumb_path')), null),
  (6, 'aucun jeu actif, aucune partie', (select count(*) = 0 from public.dle_games where active) and (select count(*) = 0 from public.dle_plays), null)
) as c(n, what, ok, got) order by n;
rollback;
