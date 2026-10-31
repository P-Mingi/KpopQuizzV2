-- V-003 (run O1, session.sh): after 003-memberships.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V3 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'tampons kpop = profils', (select (select count(*) from public.world_memberships where site_id = 'kpop') = (select count(*) from public.profiles)), (select count(*)::text from public.world_memberships where site_id = 'kpop')),
  (2, 'tampons kpop sans progression propre : 0 avec xp ou série', (select count(*) = 0 from public.world_memberships where site_id = 'kpop' and (xp is not null or daily_streak is not null)), (select count(*)::text from public.world_memberships where site_id = 'kpop' and (xp is not null or daily_streak is not null))),
  (3, 'déclencheur trg_profiles_membership actif', (select count(*) = 1 from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'trg_profiles_membership' and tgenabled = 'O'), (select count(*)::text from pg_trigger where tgrelid = 'public.profiles'::regclass and tgname = 'trg_profiles_membership')),
  (4, 'une seule policy sur world_memberships : select_own, en lecture', (select count(*) = 1 and bool_and(polname = 'world_memberships_select_own' and polcmd = 'r') from pg_policy where polrelid = 'public.world_memberships'::regclass), (select count(*)::text from pg_policy where polrelid = 'public.world_memberships'::regclass))
) as c(n, what, ok, got) order by n;
rollback;
