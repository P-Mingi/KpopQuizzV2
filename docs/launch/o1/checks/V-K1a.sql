-- V-K1a (run O1, session.sh): after 021a-k1-idol-gender-debut.sql, the first file of lot K1 (idols.gender, idols.debut_year)
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From the contract agreed with the owner on 2026-10-30: idols.gender is 'female' or 'male' (lower case), idols.debut_year is an integer.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'colonne idols.gender (texte)', (select count(*) = 1 from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name = 'gender' and data_type in ('text', 'character varying')), null),
  (2, 'colonne idols.debut_year (entier)', (select count(*) = 1 from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name = 'debut_year' and data_type = 'integer'), null),
  (3, 'genre : seulement female ou male', (select count(*) = 0 from public.idols where gender is not null and gender not in ('female', 'male')), (select count(*)::text from public.idols where gender is not null and gender not in ('female', 'male'))),
  (4, 'année de début plausible (1990 à l''an prochain)', (select count(*) = 0 from public.idols where debut_year is not null and (debut_year < 1990 or debut_year > extract(year from current_date)::int + 1)), (select count(*)::text from public.idols where debut_year is not null and (debut_year < 1990 or debut_year > extract(year from current_date)::int + 1))),
  (5, 'idols assez complètes pour être cible (information)', true, (select count(*)::text from public.dle_src_kpop_idol s where not exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)))
) as c(n, what, ok, got) order by n;
rollback;
