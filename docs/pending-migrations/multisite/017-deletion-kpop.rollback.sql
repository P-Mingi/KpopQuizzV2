-- 017-deletion-kpop.rollback.sql (run O1, lane B7): undo of 017-deletion-kpop.sql.
--
-- What:   puts the body of passport_run_deletion of 016-passport-deletion.sql back (the kpop side is no longer handed to part D) and
--         drops passport_deletion_status.
-- Why:    the rollback of 017. Refused, with nothing changed, while a deletion request is pending (the 7 days of a member who asked
--         to delete their account on kpopquiz.org would silently stop meaning what the member was told).
-- Rows:   2 functions (1 restored, 1 dropped); no row touched.
-- Verify: select to_regprocedure('public.passport_deletion_status(uuid)');   expect null
--         select position('admin_delete_account($1, $2, false)' in prosrc) > 0 from pg_proc where proname = 'passport_run_deletion';   expect f
-- Undo:   run 017-deletion-kpop.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  n bigint := 0;
begin
  if to_regclass('passport.deletion_requests') is not null then
    select count(*) into n from passport.deletion_requests where cancelled_at is null and completed_at is null;
  end if;
  if n > 0 then
    raise exception '017-deletion-kpop rollback refused: % deletion requests are pending', n;
  end if;
  if to_regprocedure('public.passport_run_deletion(uuid,boolean)') is null then
    raise exception '017-deletion-kpop rollback: 016-passport-deletion.sql is not applied, nothing to restore';
  end if;
end $$;

drop function if exists public.passport_deletion_status(uuid);

-- the body of 016, verbatim
create or replace function public.passport_run_deletion(p_user uuid, p_dry_run boolean default true) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
declare
  v_req passport.deletion_requests%rowtype;
  v_keep boolean := true;
  v_has boolean;
  v_counts jsonb := '{}'::jsonb;
  v_world record;
  v_msg text;
  n bigint;
  v_mu boolean := to_regprocedure('public.admin_delete_account(uuid)') is not null;
begin
  if p_user is null then
    raise exception 'passport_run_deletion: user is required' using errcode = '22004';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'passport_run_deletion: unknown user' using errcode = 'P0002';
  end if;
  select * into v_req from passport.deletion_requests r where r.user_id = p_user for update;
  v_has := found;
  if v_has then
    v_keep := v_req.keep_quizzes;
  end if;
  if not coalesce(p_dry_run, true) then
    if not v_has or v_req.cancelled_at is not null or v_req.completed_at is not null or v_req.run_after > now() then
      raise exception 'passport_run_deletion: no pending request is due for this user' using errcode = 'B7R01';
    end if;
    if not v_mu then
      raise exception 'passport_run_deletion: Mission U part D (admin_delete_account) is not installed' using errcode = 'B7M01';
    end if;
  end if;

  begin
    for v_world in select s.id from public.sites s where s.kind = 'world' and s.id <> 'kpop' order by s.id loop
      v_counts := v_counts || jsonb_build_object(v_world.id, public.passport_world_purge(p_user, v_world.id, v_keep, coalesce(p_dry_run, true)));
    end loop;
    v_counts := v_counts || jsonb_build_object('kpop', public.passport_reassign_quizzes(p_user, 'kpop', v_keep, coalesce(p_dry_run, true)));

    with d as (delete from public.passport_prefs pp where pp.user_id = p_user returning 1) select count(*) into n from d;
    v_counts := v_counts || jsonb_build_object('passport_prefs', n);
    with d as (delete from passport.handoff_codes c where c.user_id = p_user returning 1) select count(*) into n from d;
    v_counts := v_counts || jsonb_build_object('handoff_codes', n);
    with u as (update passport.handoff_events e set user_id = null where e.user_id = p_user returning 1) select count(*) into n from u;
    v_counts := v_counts || jsonb_build_object('handoff_events_anonymized', n);
    select count(*) into n from public.world_memberships m where m.user_id = p_user and m.site_id = 'kpop';
    v_counts := v_counts || jsonb_build_object('world_memberships_kpop', n);
    v_counts := v_counts || jsonb_build_object('mission_u_d_installed', case when v_mu then 1 else 0 end);

    if coalesce(p_dry_run, true) then
      raise exception using errcode = 'B7D01', message = v_counts::text;
    end if;
    execute 'select public.admin_delete_account($1)' using p_user;
  exception when sqlstate 'B7D01' then
    get stacked diagnostics v_msg = message_text;
    v_counts := v_msg::jsonb;
  end;

  insert into passport.deletion_log (subject_hash, kind, site_id, dry_run, counts, outcome)
    values (encode(sha256(convert_to('o1-del:' || p_user::text, 'UTF8')), 'hex'), 'passport', null, coalesce(p_dry_run, true), v_counts, 'ok');
  return v_counts;
end
$$;
revoke all on function public.passport_run_deletion(uuid, boolean) from public, anon, authenticated;
grant execute on function public.passport_run_deletion(uuid, boolean) to service_role;
