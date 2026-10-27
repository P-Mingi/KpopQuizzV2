-- 016-passport-deletion.sql (run O1, lane B7; manifest.md row 20; BACKLOG 4.1 row 30; schema.sql section "@file 016-passport-deletion")
-- DANGEROUS, DESTRUCTIVE (two R-SQL reviewers, R-SEC): the real run of passport_run_deletion deletes a member's data.
--
-- What:   creates passport.deletion_requests (one pending request per member), passport.deletion_log (counts only, a
--         hash of the subject, never an id or an email), the partial index deletion_requests_due_idx, RLS on both
--         tables with no policy, and the SQL functions passport_request_deletion, passport_cancel_deletion,
--         passport_run_deletion and passport_leave_world (the four of the contract, security definer, search_path
--         public, EXECUTE for service_role only). Four more functions, none of them callable by a browser role:
--         passport_due_deletions (the cron's list: the schema passport is not exposed, so the app reads it through
--         this function), passport_site_sentinel, passport_reassign_quizzes and passport_world_purge (the shared
--         bodies; no role has EXECUTE on the last three, the two public functions above call them as owner).
-- Why:    "Delete my passport" (7 days of grace, defaults V2-08) and "Leave a world" (P S6, W4). Dry run by default:
--         a dry run executes the purge inside a sub-transaction and rolls it back, so its counts are the counts a real
--         run would produce, and it writes nothing but one passport.deletion_log row.
-- Rows:   2 tables, 8 functions; no row is inserted by the file. Nothing existing is altered.
-- Needs:  001 (sites), 003 (world_memberships), 004 (passport_prefs), 006 (schema passport), 011 (series, series_progress,
--         favourite_characters), 004 or 003 for favourites and world_follows.
-- Mission U part D (branch mission-u/account-deletion; NOT on main, not merged or copied here): its admin_delete_account
--         purges the kpop-side rows of a member and its "deleted user" sentinel takes the kept quizzes of kpop. This file
--         builds everything that does not need it and guards the rest:
--           - a REAL run of passport_run_deletion raises (nothing is changed) while to_regprocedure('public.admin_delete_account(uuid)')
--             is null, and while a quiz has to be reassigned and the sentinel of its site does not exist;
--           - a dry run reports both facts as counts (mission_u_d_installed 0 or 1, sentinel_missing 0 or 1).
--         ASSUMPTION to confirm when part D merges: admin_delete_account(uuid) can be called by the service role, purges or
--         anonymizes the kpop-side rows and may or may not delete the auth user (the app deletes the auth user afterwards
--         and treats "user not found" as done).
-- Sentinels: passport_site_sentinel(site) is the profile whose username is 'deleted_user' (kpop) or 'deleted_user_<site>'
--         (every other site) AND whose id starts with 00000000-0000-0000-0000- (system accounts only; a random user id
--         never does), so nobody can register the name and receive other members' quizzes. The anime sentinel comes from
--         the launch file of B7 (manifest row 22), the kpop one from Mission U part D.
-- Decisions where the contract is silent: the grace period is 7 days (G16, defaults V2-08); a request refreshed while
--         pending restarts the grace; a real run needs a pending, due request and takes keep_quizzes from it; a
--         completed request is never set by this file (the request row disappears with the auth user, ON DELETE CASCADE),
--         so a failed auth-user deletion is retried by the next cron; quizzes featured by qotd_log or quiz_bank cannot be
--         deleted and go to the sentinel even when keep_quizzes is false; leaving a world also removes the badges earned
--         there and the passport_prefs entries of that world; plays, likes and comments stay (they hold no name).
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('passport_request_deletion','passport_cancel_deletion','passport_run_deletion','passport_leave_world','passport_due_deletions');   expect 5
--         select relname, relrowsecurity from pg_class where relnamespace = 'passport'::regnamespace and relname like 'deletion%' and relkind = 'r' order by 1;   expect deletion_log t, deletion_requests t
--         select proname, has_function_privilege('anon', oid, 'execute'), has_function_privilege('authenticated', oid, 'execute'), has_function_privilege('service_role', oid, 'execute') from pg_proc where proname in ('passport_run_deletion', 'passport_leave_world');   expect f, f, t
-- Undo:   016-passport-deletion.rollback.sql (refused while a request is pending or a real run is logged).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

create table if not exists passport.deletion_requests (
  user_id uuid constraint deletion_requests_pkey primary key constraint deletion_requests_user_id_fkey references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now(),
  requested_from text not null constraint deletion_requests_requested_from_fkey references public.sites(id),
  run_after timestamptz not null,
  keep_quizzes boolean not null default true,
  cancelled_at timestamptz,
  completed_at timestamptz
);
create index if not exists deletion_requests_due_idx on passport.deletion_requests (run_after) where cancelled_at is null and completed_at is null;
alter table passport.deletion_requests enable row level security;

create table if not exists passport.deletion_log (
  id bigint generated always as identity constraint deletion_log_pkey primary key,
  at timestamptz not null default now(),
  subject_hash text not null,
  kind text not null constraint deletion_log_kind_check check (kind in ('passport', 'leave_world')),
  site_id text constraint deletion_log_site_id_fkey references public.sites(id),
  dry_run boolean not null,
  counts jsonb not null default '{}'::jsonb,
  outcome text not null constraint deletion_log_outcome_check check (outcome in ('ok', 'failed', 'cancelled'))
);
alter table passport.deletion_log enable row level security;

revoke all on all tables in schema passport from public, anon, authenticated;

-- passport_site_sentinel: the "deleted user" profile of a site, or null while it does not exist (see the header).
create or replace function public.passport_site_sentinel(p_site text) returns uuid
  language sql stable security definer set search_path = public
  as $$
    select p.id
      from public.profiles p
     where p.username = case when p_site = 'kpop' then 'deleted_user' else 'deleted_user_' || p_site end
       and p.id::text like '00000000-0000-0000-0000-%'
     limit 1
  $$;
revoke all on function public.passport_site_sentinel(text) from public, anon, authenticated, service_role;

-- passport_reassign_quizzes: the quizzes p_user created on p_site. keep: all go to the sentinel. Not keep: the quizzes
-- featured by qotd_log or quiz_bank go to the sentinel (their rows cannot be deleted), the others are deleted (plays,
-- likes and comments go with them, ON DELETE CASCADE). A real run raises when a quiz must move and the sentinel is
-- missing; a dry run reports sentinel_missing instead. Counts: quizzes_reassigned, quizzes_deleted, sentinel_missing.
create or replace function public.passport_reassign_quizzes(p_user uuid, p_site text, p_keep boolean, p_dry boolean) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
declare
  v_sentinel uuid := public.passport_site_sentinel(p_site);
  v_total bigint;
  v_featured bigint;
  v_moved bigint := 0;
  v_deleted bigint := 0;
  v_missing integer := 0;
begin
  select count(*) into v_total from public.quizzes q where q.creator_id = p_user and q.site_id = p_site;
  select count(*) into v_featured from public.quizzes q
   where q.creator_id = p_user and q.site_id = p_site
     and (exists (select 1 from public.qotd_log l where l.quiz_id = q.id)
          or exists (select 1 from public.quiz_bank b where b.published_quiz_id = q.id));
  if p_keep then
    v_moved := v_total;
  else
    v_moved := v_featured;
    v_deleted := v_total - v_featured;
  end if;
  if v_moved > 0 and v_sentinel is null then
    if not p_dry then
      raise exception 'passport: the deleted-user sentinel of site % does not exist; % quizzes cannot be reassigned', p_site, v_moved
        using errcode = 'B7S01';
    end if;
    v_missing := 1;
  end if;
  if not p_dry or v_sentinel is not null then
    if v_moved > 0 then
      update public.quizzes q set creator_id = v_sentinel
       where q.creator_id = p_user and q.site_id = p_site
         and (p_keep or exists (select 1 from public.qotd_log l where l.quiz_id = q.id)
                     or exists (select 1 from public.quiz_bank b where b.published_quiz_id = q.id));
    end if;
  end if;
  if not p_keep and v_deleted > 0 then
    delete from public.quizzes q where q.creator_id = p_user and q.site_id = p_site;
  end if;
  return jsonb_build_object('quizzes_reassigned', v_moved, 'quizzes_deleted', v_deleted, 'sentinel_missing', v_missing);
end
$$;
revoke all on function public.passport_reassign_quizzes(uuid, text, boolean, boolean) from public, anon, authenticated, service_role;

-- passport_world_purge: every row of p_user that belongs to the non-kpop site p_site, in an order that keeps the
-- follower counts right (follows before memberships). Returns the counts per table. No log row.
create or replace function public.passport_world_purge(p_user uuid, p_site text, p_keep boolean, p_dry boolean) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
declare
  v_counts jsonb;
  n bigint;
begin
  if p_site = 'kpop' then
    raise exception 'passport_world_purge: kpop is not a world to leave' using errcode = '22023';
  end if;
  v_counts := public.passport_reassign_quizzes(p_user, p_site, p_keep, p_dry);

  with d as (delete from public.world_follows f
              where f.site_id = p_site and (f.follower_id = p_user or f.followed_id = p_user) returning 1)
    select count(*) into n from d;
  v_counts := v_counts || jsonb_build_object('world_follows', n);

  with d as (delete from public.favourites f where f.user_id = p_user and f.site_id = p_site returning 1)
    select count(*) into n from d;
  v_counts := v_counts || jsonb_build_object('favourites', n);

  with d as (delete from public.series_progress sp using public.groups g
              where sp.user_id = p_user and g.id = sp.group_id and g.site_id = p_site returning 1)
    select count(*) into n from d;
  v_counts := v_counts || jsonb_build_object('series_progress', n);

  with d as (delete from public.favourite_characters fc using public.groups g
              where fc.user_id = p_user and g.id = fc.group_id and g.site_id = p_site returning 1)
    select count(*) into n from d;
  v_counts := v_counts || jsonb_build_object('favourite_characters', n);

  with d as (delete from public.user_badges ub using public.badge_definitions b
              where ub.user_id = p_user and b.id = ub.badge_id and b.site_id = p_site returning 1)
    select count(*) into n from d;
  v_counts := v_counts || jsonb_build_object('user_badges', n);

  with u as (update public.passport_prefs pp
                set worlds = pp.worlds - p_site,
                    welcomed_sites = array_remove(pp.welcomed_sites, p_site),
                    updated_at = now()
              where pp.user_id = p_user and (pp.worlds ? p_site or p_site = any (pp.welcomed_sites)) returning 1)
    select count(*) into n from u;
  v_counts := v_counts || jsonb_build_object('passport_prefs', n);

  with d as (delete from public.world_memberships m where m.user_id = p_user and m.site_id = p_site returning 1)
    select count(*) into n from d;
  v_counts := v_counts || jsonb_build_object('world_memberships', n);
  return v_counts;
end
$$;
revoke all on function public.passport_world_purge(uuid, text, boolean, boolean) from public, anon, authenticated, service_role;

-- passport_request_deletion: creates or refreshes the request (run_after = now() + 7 days), returns run_after.
create or replace function public.passport_request_deletion(p_user uuid, p_from_site text, p_keep_quizzes boolean default true)
  returns timestamptz
  language plpgsql security definer set search_path = public
  as $$
declare
  v_run_after timestamptz := now() + interval '7 days';
begin
  if p_user is null or p_from_site is null then
    raise exception 'passport_request_deletion: user and site are required' using errcode = '22004';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'passport_request_deletion: unknown user' using errcode = 'P0002';
  end if;
  insert into passport.deletion_requests as r (user_id, requested_at, requested_from, run_after, keep_quizzes)
    values (p_user, now(), p_from_site, v_run_after, coalesce(p_keep_quizzes, true))
    on conflict (user_id) do update
      set requested_at = excluded.requested_at, requested_from = excluded.requested_from, run_after = excluded.run_after,
          keep_quizzes = excluded.keep_quizzes, cancelled_at = null, completed_at = null;
  insert into passport.deletion_log (subject_hash, kind, site_id, dry_run, counts, outcome)
    values (encode(sha256(convert_to('o1-del:' || p_user::text, 'UTF8')), 'hex'), 'passport', p_from_site, false,
            jsonb_build_object('requested', 1, 'keep_quizzes', case when coalesce(p_keep_quizzes, true) then 1 else 0 end), 'ok');
  return v_run_after;
end
$$;
revoke all on function public.passport_request_deletion(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.passport_request_deletion(uuid, text, boolean) to service_role;

-- passport_cancel_deletion: true when a pending request was cancelled.
create or replace function public.passport_cancel_deletion(p_user uuid) returns boolean
  language plpgsql security definer set search_path = public
  as $$
declare
  v_site text;
begin
  update passport.deletion_requests r set cancelled_at = now()
   where r.user_id = p_user and r.cancelled_at is null and r.completed_at is null
   returning r.requested_from into v_site;
  if not found then
    return false;
  end if;
  insert into passport.deletion_log (subject_hash, kind, site_id, dry_run, counts, outcome)
    values (encode(sha256(convert_to('o1-del:' || p_user::text, 'UTF8')), 'hex'), 'passport', v_site, false, '{}'::jsonb, 'cancelled');
  return true;
end
$$;
revoke all on function public.passport_cancel_deletion(uuid) from public, anon, authenticated;
grant execute on function public.passport_cancel_deletion(uuid) to service_role;

-- passport_due_deletions: the requests the cron runs now (due, not cancelled, not completed), oldest first.
create or replace function public.passport_due_deletions(p_limit integer default 25)
  returns table (user_id uuid, run_after timestamptz)
  language sql stable security definer set search_path = public
  as $$
    select r.user_id, r.run_after
      from passport.deletion_requests r
     where r.cancelled_at is null and r.completed_at is null and r.run_after <= now()
     order by r.run_after
     limit greatest(coalesce(p_limit, 25), 1)
  $$;
revoke all on function public.passport_due_deletions(integer) from public, anon, authenticated;
grant execute on function public.passport_due_deletions(integer) to service_role;

-- passport_run_deletion: the pipeline. Dry run (default): counts only, nothing changes but one log row. Real run: needs a
-- pending, due request and Mission U part D (see the header); purges every non-kpop world, reassigns or deletes the
-- kpop quizzes, drops the passport rows, then hands the kpop-side purge to admin_delete_account. The app deletes the
-- auth user afterwards with the service role.
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

-- passport_leave_world: removes p_user's rows of one non-kpop world site only (passport_world_purge); raises on 'kpop', on
-- an unknown site and on a site that is not a world. Dry run by default (counts only, one log row).
create or replace function public.passport_leave_world(p_user uuid, p_site text, p_dry_run boolean default true,
  p_keep_quizzes boolean default true) returns jsonb
  language plpgsql security definer set search_path = public
  as $$
declare
  v_kind text;
  v_counts jsonb;
  v_msg text;
begin
  if p_user is null or p_site is null then
    raise exception 'passport_leave_world: user and site are required' using errcode = '22004';
  end if;
  if p_site = 'kpop' then
    raise exception 'passport_leave_world: kpop is not a world to leave' using errcode = '22023';
  end if;
  select s.kind into v_kind from public.sites s where s.id = p_site;
  if v_kind is distinct from 'world' then
    raise exception 'passport_leave_world: % is not a world site', p_site using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user) then
    raise exception 'passport_leave_world: unknown user' using errcode = 'P0002';
  end if;

  begin
    v_counts := public.passport_world_purge(p_user, p_site, coalesce(p_keep_quizzes, true), coalesce(p_dry_run, true));
    if coalesce(p_dry_run, true) then
      raise exception using errcode = 'B7D01', message = v_counts::text;
    end if;
  exception when sqlstate 'B7D01' then
    get stacked diagnostics v_msg = message_text;
    v_counts := v_msg::jsonb;
  end;

  insert into passport.deletion_log (subject_hash, kind, site_id, dry_run, counts, outcome)
    values (encode(sha256(convert_to('o1-del:' || p_user::text, 'UTF8')), 'hex'), 'leave_world', p_site, coalesce(p_dry_run, true), v_counts, 'ok');
  return v_counts;
end
$$;
revoke all on function public.passport_leave_world(uuid, text, boolean, boolean) from public, anon, authenticated;
grant execute on function public.passport_leave_world(uuid, text, boolean, boolean) to service_role;
