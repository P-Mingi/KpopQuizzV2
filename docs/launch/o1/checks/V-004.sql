-- V-004 (run O1, session.sh): after 004-passport-prefs.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V3 and the Verify lines of the file's header.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'tables passport_prefs, favourites, world_follows', (select to_regclass('public.passport_prefs') is not null and to_regclass('public.favourites') is not null and to_regclass('public.world_follows') is not null), null),
  (2, 'policies sur ces trois tables : 8 (le contrat ; l''en-tête de 004 dit 7)', (select count(*) = 8 from pg_policy where polrelid in ('public.passport_prefs'::regclass, 'public.favourites'::regclass, 'public.world_follows'::regclass)), (select count(*)::text from pg_policy where polrelid in ('public.passport_prefs'::regclass, 'public.favourites'::regclass, 'public.world_follows'::regclass))),
  (3, 'somme des xp des profils = somme kpop de world_progress', (select (select coalesce(sum(xp), 0) from public.profiles) = (select coalesce(sum(xp), 0) from public.world_progress where site_id = 'kpop')), null)
) as c(n, what, ok, got) order by n;
rollback;
