-- 002-xp-daily-snapshots.sql (run O1, lot H2b; the weekly XP of the Top fans block of bunnyverse.org)
--
-- What:   creates public.xp_daily_snapshots (one row per UTC day, member and site: the XP of that member on that site at the snapshot),
--         RLS with no policy (only the service role reads or writes it), and public.hub_snapshot_xp(), the function that writes today's
--         rows (security definer, EXECUTE for service_role only) and prunes rows older than 14 days.
-- Why:    Plan.dc.html section 3.D: "Top fans: l'XP gagnee cette semaine sur les deux sites". No XP ledger exists: award_xp and
--         award_world_xp add to a running total (profiles.xp for KpopQuiz, world_memberships.xp for the other sites) and keep no event.
--         The XP of the week is therefore the total now minus the total seven days ago, which needs a daily snapshot. Without this
--         table the block estimates the week from the XP of the quiz plays of the week (lib/site/hub/data/top-fans.ts, basis 'plays').
-- Rows:   1 table, 1 function. The function writes one row per member with XP above 0 and per site (KpopQuiz from profiles, every other
--         site from world_memberships). Members only: the snapshot holds a number and an id, never a name or an email.
-- Needs:  public.profiles, public.world_memberships (003), public.sites (001), auth.users.
-- Privacy: the XP of a member who keeps the level private never leaves the server: the table has no policy and no grant for anon or
--         authenticated, and the Top fans block lists only members whose stamp is public (world_memberships.show_elsewhere).
--         The rows go with the account (ON DELETE CASCADE on auth.users); a member who leaves a world keeps at most 14 days of that
--         world's snapshots until the prune.
-- Schedule: `select public.hub_snapshot_xp();` once a day, shortly after 00:00 UTC (a cron route or the owner's scheduler; not part of
--         this file). Re-running it the same day updates that day's rows.
-- Verify: select to_regclass('public.xp_daily_snapshots');   expect xp_daily_snapshots
--         select relrowsecurity from pg_class where oid = 'public.xp_daily_snapshots'::regclass;   expect t
--         select count(*) from pg_policies where tablename = 'xp_daily_snapshots';   expect 0
--         select has_table_privilege('anon', 'public.xp_daily_snapshots', 'select'), has_function_privilege('anon', 'public.hub_snapshot_xp()', 'execute');   expect f, f
-- Undo:   002-xp-daily-snapshots.rollback.sql
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $o1h$ begin
  if to_regclass('public.profiles') is null or to_regclass('public.world_memberships') is null or to_regclass('public.sites') is null then
    raise exception '002-xp-daily-snapshots: public.profiles, public.world_memberships or public.sites is missing (apply multisite 001 and 003 first)';
  end if;
end $o1h$;

create table if not exists public.xp_daily_snapshots (
  day date not null,
  user_id uuid not null constraint xp_daily_snapshots_user_id_fkey references auth.users(id) on delete cascade,
  site_id text not null constraint xp_daily_snapshots_site_id_fkey references public.sites(id),
  xp integer not null constraint xp_daily_snapshots_xp_check check (xp >= 0),
  constraint xp_daily_snapshots_pkey primary key (day, user_id, site_id)
);
create index if not exists xp_daily_snapshots_user_idx on public.xp_daily_snapshots (user_id);

alter table public.xp_daily_snapshots enable row level security;

revoke all on public.xp_daily_snapshots from public, anon, authenticated;
grant all on public.xp_daily_snapshots to service_role;

-- Writes (or refreshes) today's rows and prunes the old ones. Returns the number of rows written.
create or replace function public.hub_snapshot_xp()
  returns integer
  language plpgsql security definer set search_path = public
  as $$
declare
  v_today date := (now() at time zone 'utc')::date;
  v_n     integer;
begin
  with src as (
    select p.id as user_id, 'kpop'::text as site_id, p.xp as xp
      from public.profiles p
     where p.banned_at is null and coalesce(p.xp, 0) > 0
    union all
    select m.user_id, m.site_id, m.xp
      from public.world_memberships m
     where m.site_id <> 'kpop' and m.activated_at is not null and m.banned_at is null and coalesce(m.xp, 0) > 0
  ), up as (
    insert into public.xp_daily_snapshots as s (day, user_id, site_id, xp)
    select v_today, user_id, site_id, xp from src
    on conflict (day, user_id, site_id) do update set xp = excluded.xp
    returning 1
  )
  select count(*) into v_n from up;

  delete from public.xp_daily_snapshots where day < v_today - 14;
  return v_n;
end
$$;

revoke all on function public.hub_snapshot_xp() from public, anon, authenticated;
grant execute on function public.hub_snapshot_xp() to service_role;
