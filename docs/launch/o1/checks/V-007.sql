-- V-007 (run O1, session.sh): after 007-world-xp.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V3 and the Verify lines of the file's header.
begin transaction read only;
-- award_world_xp refuses kpop (kpop xp stays on profiles): the call must raise an error that names kpop. The transaction is read only,
-- so nothing can be written even if it did not raise.
do $$
begin
  perform set_config('o1.kpop_refused', 'no', true);
  perform public.award_world_xp(gen_random_uuid(), 'kpop', 1, 'play');
exception when others then
  if sqlerrm ilike '%kpop%' then perform set_config('o1.kpop_refused', 'yes', true); end if;
end $$;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'les 6 fonctions de 007', (select count(*) = 6 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('award_world_xp', 'bump_world_counter', 'public_passport', 'my_passport', 'update_my_membership', 'set_passport_prefs')), (select count(*)::text from pg_proc where pronamespace = 'public'::regnamespace and proname in ('award_world_xp', 'bump_world_counter', 'public_passport', 'my_passport', 'update_my_membership', 'set_passport_prefs'))),
  (2, 'public_passport ouverte à anon, award_world_xp fermée à anon', (select has_function_privilege('anon', 'public.public_passport(text)', 'execute') and not has_function_privilege('anon', 'public.award_world_xp(uuid,text,integer,text)', 'execute')), null),
  (3, 'award_world_xp refuse kpop', current_setting('o1.kpop_refused', true) = 'yes', null),
  (4, 'somme des xp des profils = somme kpop de world_progress', (select (select coalesce(sum(xp), 0) from public.profiles) = (select coalesce(sum(xp), 0) from public.world_progress where site_id = 'kpop')), null)
) as c(n, what, ok, got) order by n;
rollback;
