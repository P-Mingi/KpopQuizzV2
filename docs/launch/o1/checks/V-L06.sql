-- V-L06 (run O1, session.sh): after launch/L06-B3-badges.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V8.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'badges hors kpop : les 6 badges anime', (select count(*) = 6 and bool_and(site_id = 'anime' and id in ('anime_first_steps', 'anime_quiz_maker', 'anime_prolific_creator', 'anime_multi_stan', 'anime_dedicated_fan', 'anime_community_star')) from public.badge_definitions where site_id <> 'kpop'), (select count(*)::text from public.badge_definitions where site_id <> 'kpop'))
) as c(n, what, ok, got) order by n;
rollback;
