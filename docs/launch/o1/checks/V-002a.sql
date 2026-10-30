-- V-002a (run O1, session.sh): after 002a-site-columns.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V2 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'colonnes site_id par défaut kpop, non nulles (24 ou plus)', (select count(*) >= 24 from information_schema.columns where table_schema = 'public' and column_name = 'site_id' and column_default = '''kpop''::text' and is_nullable = 'NO'), (select count(*)::text from information_schema.columns where table_schema = 'public' and column_name = 'site_id' and column_default = '''kpop''::text' and is_nullable = 'NO')),
  (2, 'clés site_id vers sites (24 ou plus)', (select count(*) >= 24 from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass and conname like '%\_site\_id\_fkey'), (select count(*)::text from pg_constraint where contype = 'f' and confrelid = 'public.sites'::regclass and conname like '%\_site\_id\_fkey')),
  (3, 'aucune ligne hors kpop dans quizzes', (select count(*) = 0 from public.quizzes where site_id <> 'kpop'), (select count(*)::text from public.quizzes where site_id <> 'kpop'))
) as c(n, what, ok, got) order by n;
rollback;
