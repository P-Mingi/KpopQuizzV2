-- V-L03 (run O1, session.sh): after launch/L03-B7-sentinel.sql
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- From VERIFY.md V8.
begin transaction read only;
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'profils sentinelles anime et hub', (select count(*) = 2 from public.profiles where id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3') and username in ('deleted_user_anime', 'deleted_user_hub')), null),
  (2, 'aucun tampon pour les sentinelles', (select count(*) = 0 from public.world_memberships where user_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')), null)
) as c(n, what, ok, got) order by n;
rollback;
