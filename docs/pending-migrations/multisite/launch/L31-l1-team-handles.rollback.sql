-- L27-l1-team-handles.rollback.sql (lane titles, run O1; audit 04 P0-2)
--
-- What:   the exact reverse of L27: the 9 Team accounts go back to soojinnie, joonified, pinkvelvet, caratland, skzrealm, njeansstan,
--         kpophistory, twiceland, exoplanet99 (the display names that L27 moved follow back). Guarded on the new handles; one already
--         on its old handle is left alone. Apply it only if the code is rolled back too, or the redirect would send old URLs to a 404.
-- WHEN:   as L27. Safe to run twice. ONE do block, no temp table.
--
-- Verify (after the rollback):
-- Verify: select count(*) from public.profiles where username in ('soojinnie', 'joonified', 'pinkvelvet', 'caratland', 'skzrealm', 'njeansstan', 'kpophistory', 'twiceland', 'exoplanet99');   expect 9
-- Verify: select count(*) from public.profiles where username in ('kq_girlgroups', 'kq_bts', 'kq_blackpink_rv', 'kq_seventeen', 'kq_skz_ateez', 'kq_nj_ive_lsf', 'kq_history', 'kq_twice_itzy', 'kq_exo_shinee');   expect 0
-- Verify: select count(*) from public.profiles p join public.editorial_accounts a on a.user_id = p.id where p.username in ('soojinnie', 'joonified', 'pinkvelvet', 'caratland', 'skzrealm', 'njeansstan', 'kpophistory', 'twiceland', 'exoplanet99');   expect 9

do $l27r$
declare
  src  text[] := array['kq_girlgroups', 'kq_bts', 'kq_blackpink_rv', 'kq_seventeen', 'kq_skz_ateez', 'kq_nj_ive_lsf', 'kq_history', 'kq_twice_itzy', 'kq_exo_shinee'];
  dst  text[] := array['soojinnie', 'joonified', 'pinkvelvet', 'caratland', 'skzrealm', 'njeansstan', 'kpophistory', 'twiceland', 'exoplanet99'];
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

  if to_regclass('public.profiles') is null then raise exception 'L27 rollback: public.profiles does not exist'; end if;
  if to_regclass('public.editorial_accounts') is null then raise exception 'L27 rollback: public.editorial_accounts does not exist (apply v12-g9-editorial.sql and v12-g9-editorial-accounts.sql first)'; end if;

  -- Guards first, nothing is written until all 9 accounts pass: each is on its current handle or already on the target one.
  for i in 1 .. array_length(src, 1) loop
    select count(*) into c_src from public.profiles where username = src[i];
    select count(*) into c_dst from public.profiles where username = dst[i];
    if c_src = 1 and c_dst = 0 then
      select id into pid from public.profiles where username = src[i];
      if not exists (select 1 from public.editorial_accounts a where a.user_id = pid) then
        raise exception 'L27 rollback: % is not a Team (editorial) account, nothing written', src[i];
      end if;
      want := want + 1;
    elsif c_src = 0 and c_dst = 1 then
      null; -- already done: left alone
    else
      raise exception 'L27 rollback: unexpected state for % / % (% and % profiles), nothing written', src[i], dst[i], c_src, c_dst;
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

  if got <> want then raise exception 'L27 rollback: expected % renames, changed %', want, got; end if;
  select count(*) into k from public.profiles p join public.editorial_accounts a on a.user_id = p.id where p.username = any (dst);
  if k <> 9 then raise exception 'L27 rollback: expected 9 Team accounts on the target handles, found %', k; end if;
  select count(*) into k from public.profiles where username = any (src);
  if k <> 0 then raise exception 'L27 rollback: % accounts still on the source handles', k; end if;

  perform pg_notify('pgrst', 'reload schema');
end
$l27r$;
