-- V-L02 (run O1, session.sh): after launch/L02-K2-team-accounts.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V8.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'comptes éditoriaux anime actifs : 31', (select count(*) = 31 from public.editorial_accounts where site_id = 'anime' and active), (select count(*)::text from public.editorial_accounts where site_id = 'anime' and active)),
  (2, 'anime : auteur système et groupe anime-mix', (select system_user_id is not null and fallback_group_slug = 'anime-mix' from public.sites where id = 'anime'), null),
  (3, 'profils Team : 31', (select count(*) = 31 from public.profiles where username like 'oq\_creator\_%' or username = 'otakuquiz_team'), (select count(*)::text from public.profiles where username like 'oq\_creator\_%' or username = 'otakuquiz_team')),
  (4, 'aucun tampon kpop pour un compte Team', (select count(*) = 0 from public.world_memberships where site_id = 'kpop' and user_id in (select id from public.profiles where username like 'oq\_creator\_%' or username = 'otakuquiz_team')), (select count(*)::text from public.world_memberships where site_id = 'kpop' and user_id in (select id from public.profiles where username like 'oq\_creator\_%' or username = 'otakuquiz_team'))),
  (5, 'comptes Team hors des classements (xp anime : 0)', (select count(*) = 0 from public.world_memberships where site_id = 'anime' and xp > 0 and user_id in (select user_id from public.editorial_accounts where site_id = 'anime')), null)
) as c(n, what, ok, got) order by n;
rollback;
