-- V-K1b (run O1, session.sh): after 021b-k1-idol-activate.sql, the second file of lot K1 (the idols the owner chose in K1-RELECTURE.md).
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From the K1 rules: an activated idol is no longer to review; a minor or an idol without a birth date never reaches the game.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'idols actives encore à relire : 0', (select count(*) = 0 from public.idols where active and needs_review), (select count(*)::text from public.idols where active and needs_review)),
  (2, 'mineurs ou sans date de naissance dans le jeu : 0', (select count(*) = 0 from public.dle_src_kpop_idol s join public.idols i on i.id::text = s.entity_id where i.birth_date is null or i.birth_date > current_date - interval '18 years'), null),
  (3, 'idols assez complètes pour être cible (information)', true, (select count(*)::text from public.dle_src_kpop_idol s where not exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)))
) as c(n, what, ok, got) order by n;
rollback;
