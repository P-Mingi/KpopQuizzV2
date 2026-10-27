-- 006-passport-handoff.sql (run O1, lane B3; manifest.md row 10; BACKLOG 4.1 row 14; schema.sql section "@file 006-passport-handoff"; formats: cookies.md 3 and 5)
--
-- What:   creates the schema passport (revoked from PUBLIC, anon and authenticated; usage for service_role only),
--         passport.handoff_codes (one-time sign-in codes, stored as SHA256 hex, never the code), passport.handoff_events
--         (the audit log of the jump, no secret in it), and the four functions passport_issue_code,
--         passport_redeem_code, passport_log_event and passport_cleanup, executable by service_role only.
-- Why:    the cross-site sign-in jump (PKCE, one-time code, 60 s) needs a store the Data API cannot reach.
-- Data API: the schema passport is never exposed. It stays out of the API's exposed schemas list (Supabase
--         dashboard, API settings; owner action, nothing in this file touches that setting); every grant here is
--         revoked from anon and authenticated anyway, and both tables have RLS on with no policy.
-- Rows:   1 schema, 2 tables, 4 functions; no row is inserted, no existing object is touched.
-- Decisions where the contract is silent: the rate limits count only 'issued' events (30 per user and 60 per IP
--         hash in the last hour, cookies.md 3), so a refusal never feeds its own limit; a deletion request counts
--         as pending when passport.deletion_requests exists (to_regclass guard: that table comes with 016) and
--         the row has neither cancelled_at nor completed_at; passport_redeem_code compares the PKCE challenge
--         byte by byte without an early exit; a code for another site than p_to_site reads as 'expired'.
-- Needs:  001 (sites).
-- Verify: select nspname from pg_namespace where nspname = 'passport';                                 expect 1 row
--         select has_schema_privilege('anon', 'passport', 'usage'), has_schema_privilege('authenticated', 'passport', 'usage'), has_schema_privilege('service_role', 'passport', 'usage');   expect f, f, t
--         select relname, relrowsecurity from pg_class where relnamespace = 'passport'::regnamespace and relkind = 'r' order by 1;   expect handoff_codes t, handoff_events t
--         select proname, has_function_privilege('anon', oid, 'execute'), has_function_privilege('service_role', oid, 'execute') from pg_proc where proname like 'passport\_%' and pronamespace = 'public'::regnamespace;   expect f, t for each of the 4
-- Undo:   006-passport-handoff.rollback.sql (refused while a code or an event row exists, or while 016's tables are in schema passport).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

create schema if not exists passport;
revoke all on schema passport from public, anon, authenticated;
grant usage on schema passport to service_role;

create table if not exists passport.handoff_codes (
  code_hash text constraint handoff_codes_pkey primary key constraint handoff_codes_code_hash_check check (code_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid not null constraint handoff_codes_user_id_fkey references auth.users(id) on delete cascade,
  from_site text not null constraint handoff_codes_from_site_fkey references public.sites(id),
  to_site text not null constraint handoff_codes_to_site_fkey references public.sites(id),
  code_challenge text not null constraint handoff_codes_code_challenge_check check (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint handoff_codes_sites_check check (from_site <> to_site)
);
create index if not exists handoff_codes_expires_idx on passport.handoff_codes (expires_at);
alter table passport.handoff_codes enable row level security;

create table if not exists passport.handoff_events (
  id bigint generated always as identity constraint handoff_events_pkey primary key,
  at timestamptz not null default now(),
  user_id uuid constraint handoff_events_user_id_fkey references auth.users(id) on delete set null,
  from_site text constraint handoff_events_from_site_fkey references public.sites(id),
  to_site text constraint handoff_events_to_site_fkey references public.sites(id),
  outcome text not null constraint handoff_events_outcome_check check (outcome in ('issued', 'redeemed', 'login_required',
    'state_mismatch', 'pkce_fail', 'expired', 'replay', 'banned', 'rate_limited', 'unconfirmed', 'deletion_pending', 'bad_ticket')),
  via_code text constraint handoff_events_via_code_check check (via_code ~ '^[kaf]\.[a-z]{2,8}$'),
  ip_hash text,
  ua_family text
);
create index if not exists handoff_events_at_idx on passport.handoff_events (at);
create index if not exists handoff_events_user_at_idx on passport.handoff_events (user_id, at desc) where user_id is not null;
create index if not exists handoff_events_ip_at_idx on passport.handoff_events (ip_hash, at desc) where ip_hash is not null;
alter table passport.handoff_events enable row level security;

revoke all on all tables in schema passport from public, anon, authenticated;
revoke all on all sequences in schema passport from public, anon, authenticated;

-- passport_issue_code: on the IdP, for p_user. Checks, in order: email confirmed, not banned, no pending deletion,
-- rate limits (cookies.md 3); then stores the code hash (expires now() + 60 s) and logs 'issued'. Returns the
-- outcome: 'issued', or the refusal ('unconfirmed', 'banned', 'deletion_pending', 'rate_limited'), also logged.
create or replace function public.passport_issue_code(p_user uuid, p_from_site text, p_to_site text, p_code_hash text,
  p_code_challenge text, p_via_code text default null, p_ip_hash text default null, p_ua_family text default null)
  returns text
  language plpgsql security definer set search_path = public
  as $$
declare
  v_outcome   text;
  v_confirmed timestamptz;
  v_known     boolean;
  v_pending   boolean := false;
  v_n         bigint;
begin
  if p_user is null then
    raise exception 'passport_issue_code: user is required';
  end if;
  if p_from_site is null or p_to_site is null or p_from_site = p_to_site
     or not exists (select 1 from public.sites s where s.id = p_from_site)
     or not exists (select 1 from public.sites s where s.id = p_to_site) then
    raise exception 'passport_issue_code: unknown site, or the same site on both ends';
  end if;

  -- 1. email confirmed
  select u.email_confirmed_at into v_confirmed from auth.users u where u.id = p_user;
  v_known := found;
  if not v_known or v_confirmed is null then
    v_outcome := 'unconfirmed';
  -- 2. not banned
  elsif exists (select 1 from public.profiles p where p.id = p_user and p.banned_at is not null) then
    v_outcome := 'banned';
  end if;

  -- 3. no pending deletion (the table comes with 016; until then nothing is pending)
  if v_outcome is null and to_regclass('passport.deletion_requests') is not null then
    execute 'select exists (select 1 from passport.deletion_requests d where d.user_id = $1 and d.cancelled_at is null and d.completed_at is null)'
      into v_pending using p_user;
    if v_pending then
      v_outcome := 'deletion_pending';
    end if;
  end if;

  -- 4. rate limits, counted from the issued events of the last hour (30 per user, 60 per IP hash)
  if v_outcome is null then
    select count(*) into v_n from passport.handoff_events e
     where e.user_id = p_user and e.outcome = 'issued' and e.at > now() - interval '1 hour';
    if v_n >= 30 then
      v_outcome := 'rate_limited';
    elsif p_ip_hash is not null then
      select count(*) into v_n from passport.handoff_events e
       where e.ip_hash = p_ip_hash and e.outcome = 'issued' and e.at > now() - interval '1 hour';
      if v_n >= 60 then
        v_outcome := 'rate_limited';
      end if;
    end if;
  end if;

  if v_outcome is null then
    insert into passport.handoff_codes (code_hash, user_id, from_site, to_site, code_challenge, expires_at)
    values (p_code_hash, p_user, p_from_site, p_to_site, p_code_challenge, now() + interval '60 seconds');
    v_outcome := 'issued';
  end if;

  insert into passport.handoff_events (user_id, from_site, to_site, outcome, via_code, ip_hash, ua_family)
  values (p_user, p_from_site, p_to_site, v_outcome, p_via_code, p_ip_hash, p_ua_family);

  return v_outcome;
end
$$;
revoke all on function public.passport_issue_code(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.passport_issue_code(uuid, text, text, text, text, text, text, text) to service_role;

-- passport_redeem_code: on the RP. One UPDATE consumes the code (cookies.md 3); then compares p_code_challenge
-- (b64u(SHA256(verifier)), computed by the app) with the stored challenge. outcome: 'redeemed' (user_id and
-- from_site set), 'pkce_fail' (code burned), 'replay' (already used), 'expired' (past expires_at, or unknown,
-- since cleanup deletes old codes). Logs the outcome.
create or replace function public.passport_redeem_code(p_code_hash text, p_to_site text, p_code_challenge text,
  p_via_code text default null, p_ip_hash text default null, p_ua_family text default null)
  returns table (outcome text, user_id uuid, from_site text)
  language plpgsql security definer set search_path = public
  as $$
#variable_conflict use_column
declare
  v_user      uuid;
  v_from      text;
  v_challenge text;
  v_used      timestamptz;
  v_outcome   text;
  v_a         bytea;
  v_b         bytea;
  v_diff      integer := 0;
  i           integer;
begin
  -- one statement consumes the code: unused, not expired, issued for this site
  update passport.handoff_codes c set used_at = now()
   where c.code_hash = p_code_hash and c.used_at is null and c.expires_at > now() and c.to_site = p_to_site
   returning c.user_id, c.from_site, c.code_challenge into v_user, v_from, v_challenge;

  if found then
    v_a := convert_to(v_challenge, 'UTF8');
    v_b := convert_to(coalesce(p_code_challenge, ''), 'UTF8');
    if octet_length(v_a) <> octet_length(v_b) then
      v_diff := 1;
    else
      for i in 0 .. octet_length(v_a) - 1 loop
        v_diff := v_diff | (get_byte(v_a, i) # get_byte(v_b, i));
      end loop;
    end if;
    v_outcome := case when v_diff = 0 then 'redeemed' else 'pkce_fail' end;
  else
    -- not consumed: say why (an unknown hash reads as expired, cleanup deletes old codes)
    select c.user_id, c.from_site, c.used_at into v_user, v_from, v_used
      from passport.handoff_codes c where c.code_hash = p_code_hash;
    if found and v_used is not null then
      v_outcome := 'replay';
    else
      v_outcome := 'expired';
    end if;
  end if;

  insert into passport.handoff_events (user_id, from_site, to_site, outcome, via_code, ip_hash, ua_family)
  values (v_user, v_from, (select s.id from public.sites s where s.id = p_to_site), v_outcome, p_via_code, p_ip_hash, p_ua_family);

  if v_outcome = 'redeemed' then
    return query select v_outcome, v_user, v_from;
  else
    return query select v_outcome, null::uuid, null::text;
  end if;
end
$$;
revoke all on function public.passport_redeem_code(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.passport_redeem_code(text, text, text, text, text, text) to service_role;

-- passport_log_event: one row of passport.handoff_events (the outcomes logged by the routes themselves:
-- 'login_required', 'state_mismatch', 'rate_limited', 'bad_ticket'). An unknown user or site is stored as null
-- (a log call never fails for them); an outcome outside the table's list raises.
create or replace function public.passport_log_event(p_outcome text, p_user uuid default null, p_from_site text default null,
  p_to_site text default null, p_via_code text default null, p_ip_hash text default null, p_ua_family text default null)
  returns void
  language plpgsql security definer set search_path = public
  as $$
begin
  insert into passport.handoff_events (user_id, from_site, to_site, outcome, via_code, ip_hash, ua_family)
  values ((select u.id from auth.users u where u.id = p_user),
          (select s.id from public.sites s where s.id = p_from_site),
          (select s.id from public.sites s where s.id = p_to_site),
          p_outcome, p_via_code, p_ip_hash, p_ua_family);
end
$$;
revoke all on function public.passport_log_event(text, uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.passport_log_event(text, uuid, text, text, text, text, text) to service_role;

-- passport_cleanup: deletes codes older than 1 day and events older than 90 days (hub cron).
create or replace function public.passport_cleanup()
  returns table (codes_deleted integer, events_deleted integer)
  language plpgsql security definer set search_path = public
  as $$
declare
  v_codes  integer;
  v_events integer;
begin
  delete from passport.handoff_codes c where c.created_at < now() - interval '1 day';
  get diagnostics v_codes = row_count;
  delete from passport.handoff_events e where e.at < now() - interval '90 days';
  get diagnostics v_events = row_count;
  return query select v_codes, v_events;
end
$$;
revoke all on function public.passport_cleanup() from public, anon, authenticated;
grant execute on function public.passport_cleanup() to service_role;
