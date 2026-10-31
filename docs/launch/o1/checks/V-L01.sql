-- V-L01 (run O1, session.sh): after launch/L01-B2-sites.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V8 and the Verify lines of L01's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'sites : 3 lignes', (select count(*) = 3 from public.sites), (select count(*)::text from public.sites)),
  (2, 'kpop : kpopquiz.org, KpopQuiz, world, en ligne, 1', (select domain = 'kpopquiz.org' and brand = 'KpopQuiz' and kind = 'world' and status = 'live' and sort = 1 from public.sites where id = 'kpop'), null),
  (3, 'anime : bunnyverse.org/anime, OtakuQuiz, world, 2', (select domain = 'bunnyverse.org/anime' and brand = 'OtakuQuiz' and kind = 'world' and status in ('building', 'live') and sort = 2 from public.sites where id = 'anime'), (select status from public.sites where id = 'anime')),
  (4, 'hub : bunnyverse.org, Bunnyverse, hub, 3', (select domain = 'bunnyverse.org' and brand = 'Bunnyverse' and kind = 'hub' and status in ('building', 'live') and sort = 3 from public.sites where id = 'hub'), (select status from public.sites where id = 'hub'))
) as c(n, what, ok, got) order by n;
rollback;
