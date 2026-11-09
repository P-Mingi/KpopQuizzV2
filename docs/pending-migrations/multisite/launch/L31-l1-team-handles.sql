-- L27-l1-team-handles.sql (lane titles, run O1, owner 2026-11-09, audit 04 P0-2)
--
-- What:   renames the 9 Team (editorial) accounts, whose handles read like fans in search results ("njeansstan"), to Team-looking handles:
--           soojinnie to kq_girlgroups, joonified to kq_bts, pinkvelvet to kq_blackpink_rv, caratland to kq_seventeen,
--           skzrealm to kq_skz_ateez, njeansstan to kq_nj_ive_lsf, kpophistory to kq_history, twiceland to kq_twice_itzy,
--           exoplanet99 to kq_exo_shinee.
--         Only public.profiles.username changes, plus profiles.display_name and editorial_accounts.display_name when they equal the old
--         handle exactly. No quiz, play, XP, badge, follower or comment row is touched (they point at the user id, not the handle).
-- Needs:  profiles (001), v12-g9-editorial.sql and v12-g9-editorial-accounts.sql (the 9 accounts are editorial). Each account is checked
--         to be an editorial account before anything is written; if any of the 9 is in an unexpected state the file raises and writes nothing.
-- WHEN:   AFTER the final merge of the code (lib/editorial/team-handles.ts): the old /u/<handle> URLs then answer a permanent redirect to the
--         new handle. Applied before the code, the old URLs would be a 404 until the merge. Never during a build, never between 23:50 and
--         00:30 UTC, after a backup. Then wait for the hourly profile cache (or redeploy) before reading the pages.
--         Also after it: the award account is kq_history (lib/events/config.ts), so the award import files nothing under the old name.
-- Undo:   L27-l1-team-handles.rollback.sql (the exact reverse, guarded on the new handles).
-- Shape:  ONE do block, no temp table, safe to run twice (an account already on its new handle is left alone).
--
-- Verify (after the apply):
-- Verify: select count(*) from public.profiles where username in ('kq_girlgroups', 'kq_bts', 'kq_blackpink_rv', 'kq_seventeen', 'kq_skz_ateez', 'kq_nj_ive_lsf', 'kq_history', 'kq_twice_itzy', 'kq_exo_shinee');   expect 9
-- Verify: select count(*) from public.profiles where username in ('soojinnie', 'joonified', 'pinkvelvet', 'caratland', 'skzrealm', 'njeansstan', 'kpophistory', 'twiceland', 'exoplanet99');   expect 0
-- Verify: select count(*) from public.profiles p join public.editorial_accounts a on a.user_id = p.id where p.username in ('kq_girlgroups', 'kq_bts', 'kq_blackpink_rv', 'kq_seventeen', 'kq_skz_ateez', 'kq_nj_ive_lsf', 'kq_history', 'kq_twice_itzy', 'kq_exo_shinee');   expect 9

do $l27$
declare
  src  text[] := array['soojinnie', 'joonified', 'pinkvelvet', 'caratland', 'skzrealm', 'njeansstan', 'kpophistory', 'twiceland', 'exoplanet99'];
  dst  text[] := array['kq_girlgroups', 'kq_bts', 'kq_blackpink_rv', 'kq_seventeen', 'kq_skz_ateez', 'kq_nj_ive_lsf', 'kq_history', 'kq_twice_itzy', 'kq_exo_shinee'];
  i    int;
  c_src int;
  c_dst int;
  pid  uuid;
  want int := 0;
  got  int := 0;
  k    int;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.profiles') is null then raise exception 'L27: public.profiles does not exist'; end if;
  if to_regclass('public.editorial_accounts') is null then raise exception 'L27: public.editorial_accounts does not exist (apply v12-g9-editorial.sql and v12-g9-editorial-accounts.sql first)'; end if;

  -- Guards first, nothing is written until all 9 accounts pass: each is on its current handle or already on the target one.
  for i in 1 .. array_length(src, 1) loop
    select count(*) into c_src from public.profiles where username = src[i];
    select count(*) into c_dst from public.profiles where username = dst[i];
    if c_src = 1 and c_dst = 0 then
      select id into pid from public.profiles where username = src[i];
      if not exists (select 1 from public.editorial_accounts a where a.user_id = pid) then
        raise exception 'L27: % is not a Team (editorial) account, nothing written', src[i];
      end if;
      want := want + 1;
    elsif c_src = 0 and c_dst = 1 then
      null; -- already done: left alone
    else
      raise exception 'L27: unexpected state for % / % (% and % profiles), nothing written', src[i], dst[i], c_src, c_dst;
    end if;
  end loop;

  for i in 1 .. array_length(src, 1) loop
    select id into pid from public.profiles where username = src[i];
    if pid is null then continue; end if;
    update public.profiles set username = dst[i] where id = pid and username = src[i];
    get diagnostics k = row_count;
    got := got + k;
    -- A display name that is the old handle follows it; any other display name is left as it is.
    update public.profiles set display_name = dst[i] where id = pid and display_name = src[i];
    update public.editorial_accounts set display_name = dst[i] where user_id = pid and display_name = src[i];
  end loop;

  if got <> want then raise exception 'L27: expected % renames, changed %', want, got; end if;
  select count(*) into k from public.profiles p join public.editorial_accounts a on a.user_id = p.id where p.username = any (dst);
  if k <> 9 then raise exception 'L27: expected 9 Team accounts on the target handles, found %', k; end if;
  select count(*) into k from public.profiles where username = any (src);
  if k <> 0 then raise exception 'L27: % accounts still on the source handles', k; end if;

  perform pg_notify('pgrst', 'reload schema');
end
$l27$;
