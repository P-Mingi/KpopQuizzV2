-- 017-deletion-kpop.sql (run O1, lane B7, owner decision of 2026-10-24, option 1)
-- DANGEROUS, DESTRUCTIVE: the real run of passport_run_deletion now also deletes a member's KpopQuiz data.
--
-- What:   replaces public.passport_run_deletion(uuid, boolean) of 016 so that, after the purge of every other world, the kpop
--         side of the account is removed by Mission U part D (public.admin_delete_account(uuid, boolean, false)), with the
--         keep_quizzes choice of the request. Adds public.passport_deletion_status(uuid): the run_after of the pending
--         request of a member, or null (the settings screen shows "deletion scheduled, cancel" from it). Both: security definer,
--         search_path public, EXECUTE for service_role only.
-- Why:    kpopquiz.org Settings > "Delete account" starts the passport deletion at launch: confirm, signed out everywhere, a
--         "deletion scheduled" email, 7 days to cancel, then everything is deleted and the published quizzes stay under the
--         one "deleted user" (00000000-0000-0000-0000-00000000dead) unless the member asked to remove them.
--         016 called admin_delete_account(uuid) (one argument), a signature part D does not have (it is
--         (uuid, boolean, boolean), dry run by default): a real run could never find it and always raised B7M01.
-- Rows:   2 functions (1 replaced, 1 new); no row inserted, nothing else altered.
-- Needs:  016 (passport_run_deletion and its helpers) and, for a REAL run, docs/pending-migrations/account-deletion.sql
--         (Mission U part D: the sentinel profile and admin_delete_account), applied BEFORE this file in production.
--         The file itself installs without part D (the call is dynamic); a real run raises B7M01 while it is missing.
-- Behaviour on the kpop side (all inside the one transaction of the run, any error undoes everything):
--           1. the quizzes of the member that part D would delete but that the daily rotation or the quiz of the day points to
--              (quiz_bank.published_quiz_id, qotd_log) go to the sentinel first (part D refuses to run otherwise);
--           2. admin_delete_account(user, keep_quizzes, false): published quizzes, games and public tier lists go to the sentinel
--              (or are deleted when keep_quizzes is false), drafts and removed ones are deleted, every reference is cleaned,
--              then the auth user is deleted (profile and the cascading tables follow). The app treats "user not found" as done.
--         A dry run reports the same facts as counts (kpop_actions_rows, kpop_refusals, mission_u_d_installed).
-- Verify: select proname, has_function_privilege('anon', oid, 'execute'), has_function_privilege('authenticated', oid, 'execute'), has_function_privilege('service_role', oid, 'execute') from pg_proc where proname in ('passport_run_deletion', 'passport_deletion_status') order by 1;   expect f, f, t for both
--         select position('admin_delete_account($1, $2, false)' in prosrc) > 0 from pg_proc where proname = 'passport_run_deletion';   expect t
-- Undo:   017-deletion-kpop.rollback.sql (puts the body of 016 back, drops passport_deletion_status).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regprocedure('public.passport_run_deletion(uuid,boolean)') is null or to_regprocedure('public.passport_site_sentinel(text)') is null then
    raise exception '017-deletion-kpop: 016-passport-deletion.sql must be applied first';
  end if;
end $$;

-- passport_deletion_status: the run_after of the pending (not cancelled, not completed) request of p_user, or null.
create or replace function public.passport_deletion_status(p_user uuid) returns timestamptz
  language sql stable security definer set search_path = public
  as $$
    select r.run_after
      from passport.deletion_requests r
     where r.user_id = p_user and r.cancelled_at is null and r.completed_at is null
  $$;
revoke all on function public.passport_deletion_status(uuid) from public, anon, authenticated;
grant execute on function public.passport_deletion_status(uuid) to service_role;

-- passport_run_deletion: 016's pipeline with the kpop side handed to part D (see the header).
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
  v_sentinel uuid := public.passport_site_sentinel('kpop');
  v_moved bigint := 0;
  v_d jsonb;
  v_mu boolean := to_regprocedure('public.admin_delete_account(uuid,boolean,boolean)') is not null;
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

    -- kpop, step 1: the quizzes part D would delete (not kept, or draft or removed) that a daily row points to go to the sentinel.
    select count(*) into v_moved from public.quizzes q
     where q.creator_id = p_user and q.site_id = 'kpop'
       and (not v_keep or q.status in ('draft', 'removed'))
       and (exists (select 1 from public.qotd_log l where l.quiz_id = q.id)
            or exists (select 1 from public.quiz_bank b where b.published_quiz_id = q.id));
    if v_moved > 0 and v_sentinel is null then
      if not coalesce(p_dry_run, true) then
        raise exception 'passport: the deleted-user sentinel of site kpop does not exist; % quizzes cannot be reassigned', v_moved
          using errcode = 'B7S01';
      end if;
    elsif v_moved > 0 then
      update public.quizzes q set creator_id = v_sentinel
       where q.creator_id = p_user and q.site_id = 'kpop'
         and (not v_keep or q.status in ('draft', 'removed'))
         and (exists (select 1 from public.qotd_log l where l.quiz_id = q.id)
              or exists (select 1 from public.quiz_bank b where b.published_quiz_id = q.id));
    end if;
    v_counts := v_counts || jsonb_build_object('kpop_quizzes_pinned_to_sentinel', v_moved, 'sentinel_missing', case when v_moved > 0 and v_sentinel is null then 1 else 0 end);

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
      if v_mu then
        execute 'select public.admin_delete_account($1, $2, true)' into v_d using p_user, v_keep;
        select coalesce(sum((a ->> 'rows')::bigint), 0) into n from jsonb_array_elements(coalesce(v_d -> 'actions', '[]'::jsonb)) a;
        v_counts := v_counts || jsonb_build_object('kpop_actions_rows', n, 'kpop_refusals', jsonb_array_length(coalesce(v_d -> 'refusals', '[]'::jsonb)));
      end if;
      raise exception using errcode = 'B7D01', message = v_counts::text;
    end if;
    -- kpop, step 2: part D removes the kpop data and the auth user (profiles and the cascading tables follow).
    execute 'select public.admin_delete_account($1, $2, false)' into v_d using p_user, v_keep;
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
