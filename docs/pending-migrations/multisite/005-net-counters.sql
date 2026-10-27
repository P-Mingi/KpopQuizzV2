-- 005-net-counters.sql (run O1, lane B3; manifest.md row 9; BACKLOG 4.1 row 13; schema.sql section "@file 005-net-counters")
--
-- What:   creates public.bridge_daily (one counter row per UTC day, source site, destination site, bridge link id,
--         funnel step and signed-in flag; RLS on, no policy, anon and authenticated revoked) and the function
--         net_bridge_bump (upsert n = n + p_n on today's row), executable by service_role only.
-- Why:    the cross-site bridges are measured by aggregate counters only: no identifier of any kind is stored.
-- Rows:   1 new table, 1 function; no row is inserted, no existing object is touched.
-- Needs:  001 (sites).
-- Verify: select relrowsecurity from pg_class where oid = 'public.bridge_daily'::regclass;          expect t
--         select count(*) from pg_policy where polrelid = 'public.bridge_daily'::regclass;          expect 0
--         select has_table_privilege('anon', 'public.bridge_daily', 'select'), has_table_privilege('authenticated', 'public.bridge_daily', 'select');   expect f, f
--         select has_function_privilege('anon', 'public.net_bridge_bump(text, text, text, text, boolean, integer)', 'execute'), has_function_privilege('service_role', 'public.net_bridge_bump(text, text, text, text, boolean, integer)', 'execute');   expect f, t
-- Undo:   005-net-counters.rollback.sql (refused while bridge_daily holds rows).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

create table if not exists public.bridge_daily (
  day date not null default current_date,
  src_site text not null constraint bridge_daily_src_site_fkey references public.sites(id),
  dst_site text not null constraint bridge_daily_dst_site_fkey references public.sites(id),
  bridge text not null constraint bridge_daily_bridge_check check (bridge ~ '^[a-z]{2,8}$'),
  step text not null constraint bridge_daily_step_check check (step in ('shown', 'click', 'land', 'join', 'first_play', 'dismiss', 'optin')),
  signed_in boolean not null,
  n integer not null default 0,
  constraint bridge_daily_pkey primary key (day, src_site, dst_site, bridge, step, signed_in)
);
alter table public.bridge_daily enable row level security;
-- (no policy: service role only)
revoke all on public.bridge_daily from anon, authenticated;

-- net_bridge_bump: upsert n = n + p_n on today's row (UTC day). Raises on an unknown site, a step outside the
-- NET_STEPS list, a link id outside ^[a-z]{2,8}$, a null flag or a count below 1.
create or replace function public.net_bridge_bump(p_src text, p_dst text, p_bridge text, p_step text, p_signed_in boolean, p_n integer default 1)
  returns void
  language plpgsql security definer set search_path = public
  as $$
begin
  if p_src is null or not exists (select 1 from public.sites s where s.id = p_src) then
    raise exception 'net_bridge_bump: unknown source site';
  end if;
  if p_dst is null or not exists (select 1 from public.sites s where s.id = p_dst) then
    raise exception 'net_bridge_bump: unknown destination site';
  end if;
  if p_bridge is null or p_bridge !~ '^[a-z]{2,8}$' then
    raise exception 'net_bridge_bump: bad bridge link id';
  end if;
  if p_step is null or p_step not in ('shown', 'click', 'land', 'join', 'first_play', 'dismiss', 'optin') then
    raise exception 'net_bridge_bump: unknown step';
  end if;
  if p_signed_in is null then
    raise exception 'net_bridge_bump: signed_in is required';
  end if;
  if p_n is null or p_n < 1 then
    raise exception 'net_bridge_bump: p_n must be at least 1';
  end if;

  insert into public.bridge_daily as b (day, src_site, dst_site, bridge, step, signed_in, n)
  values ((now() at time zone 'utc')::date, p_src, p_dst, p_bridge, p_step, p_signed_in, p_n)
  on conflict on constraint bridge_daily_pkey do update set n = b.n + excluded.n;
end
$$;
revoke all on function public.net_bridge_bump(text, text, text, text, boolean, integer) from public, anon, authenticated;
grant execute on function public.net_bridge_bump(text, text, text, text, boolean, integer) to service_role;
