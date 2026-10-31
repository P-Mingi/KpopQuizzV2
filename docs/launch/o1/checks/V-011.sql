-- V-011 (run O1, session.sh): after 011-anime-series.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V6 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'les 7 tables anime avec RLS', (select count(*) = 7 from pg_class where relnamespace = 'public'::regnamespace and relname in ('series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters') and relrowsecurity), (select count(*)::text from pg_class where relnamespace = 'public'::regnamespace and relname in ('series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters') and relrowsecurity)),
  (2, 'series vide avant le jour J', (select count(*) = 0 from public.series), (select count(*)::text from public.series)),
  (3, 'trivia_entity_kind_check validée', (select convalidated from pg_constraint where conname = 'trivia_entity_kind_check'), null)
) as c(n, what, ok, got) order by n;
rollback;
