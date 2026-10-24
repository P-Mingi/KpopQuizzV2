-- launch/L03-B7-sentinel.sql (run O1, lane L1 for B7; manifest.md row 22; owner decision D-099)
--
-- What:   creates the "deleted user" sentinel of the two new sites: one auth user and one profile each,
--         deleted_user_anime (id 00000000-0000-0000-0000-00000000dea2) and deleted_user_hub (id 00000000-0000-0000-0000-00000000dea3).
--         passport_site_sentinel(site) of 016 finds them by that username AND an id that starts with 00000000-0000-0000-0000-,
--         so a quiz kept after its author leaves a world goes to them, and nobody can register the name and receive other
--         members' quizzes. The kpop sentinel (deleted_user, ...00dead) is Mission U part D's, not this file's.
-- How:    the auth user is made the way Mission U part D makes the kpop one: no password, a reserved .invalid address, banned
--         until 2999, so it never signs in. The profile insert makes the trigger of 003 create a world membership and the
--         blind test trigger a players row; this file removes both again at once (a sentinel is not a member, not a player, and
--         has no xp: it is on no board and in no count).
-- Needs:  L01 (the anime and hub rows of sites), 003. 016 is not needed to apply it; 016 reads it.
-- Rows:   2 auth.users, 2 profiles. No other table keeps a row.
-- Verify: select p.username, p.id from public.profiles p where p.id::text like '00000000-0000-0000-0000-%' and p.username like 'deleted_user_%' order by 1;
--           expect deleted_user_anime ...00dea2 and deleted_user_hub ...00dea3
--         select public.passport_site_sentinel('anime'), public.passport_site_sentinel('hub');   expect the two ids (016 applied)
--         select count(*) from public.world_memberships where user_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');   expect 0
-- Undo:   launch/L03-B7-sentinel.rollback.sql (refused while a quiz, or any row that points at a sentinel, exists).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.sites') is null or to_regclass('public.world_memberships') is null then
    raise exception 'L03-B7-sentinel: public.sites or public.world_memberships is missing (apply 001 and 003 first)';
  end if;
  if (select count(*) from public.sites where id in ('anime', 'hub')) <> 2 then
    raise exception 'L03-B7-sentinel: the anime and hub rows of sites are missing (apply L01 first)';
  end if;
  if exists (select 1 from public.profiles where username in ('deleted_user_anime', 'deleted_user_hub')
              and id not in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')) then
    raise exception 'L03-B7-sentinel: a profile already holds a sentinel username with another id';
  end if;
end $$;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  raw_app_meta_data, raw_user_meta_data, banned_until, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000dea2', 'authenticated', 'authenticated',
   'deleted-user-anime@otakuquiz.invalid', '', now(), '', '', '', '', '{}'::jsonb, '{}'::jsonb, '2999-12-31 00:00:00+00', now(), now()),
  ('00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-00000000dea3', 'authenticated', 'authenticated',
   'deleted-user-hub@fanquiz.invalid', '', now(), '', '', '', '', '{}'::jsonb, '{}'::jsonb, '2999-12-31 00:00:00+00', now(), now())
on conflict (id) do nothing;

-- The profile of each, created under its own site so the trigger of 003 stamps that site (removed again below).
select set_config('app.site_id', 'anime', true);
insert into public.profiles (id, username, display_name, bio)
values ('00000000-0000-0000-0000-00000000dea2', 'deleted_user_anime', 'Deleted user', '')
on conflict (id) do nothing;
select set_config('app.site_id', 'hub', true);
insert into public.profiles (id, username, display_name, bio)
values ('00000000-0000-0000-0000-00000000dea3', 'deleted_user_hub', 'Deleted user', '')
on conflict (id) do nothing;
select set_config('app.site_id', '', true);

-- A sentinel is not a member and not a player.
delete from public.world_memberships where user_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');
do $$
begin
  if to_regclass('public.players') is not null then
    delete from public.players where id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3');
  end if;
end $$;

-- Self-check.
do $$
begin
  if (select count(*) from public.profiles where id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')
        and username in ('deleted_user_anime', 'deleted_user_hub')) <> 2 then
    raise exception 'L03-B7-sentinel: the two sentinel profiles are not both there';
  end if;
  if exists (select 1 from public.world_memberships where user_id in ('00000000-0000-0000-0000-00000000dea2', '00000000-0000-0000-0000-00000000dea3')) then
    raise exception 'L03-B7-sentinel: a sentinel still holds a membership';
  end if;
end $$;
