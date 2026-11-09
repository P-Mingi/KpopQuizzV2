-- L27-l1-daily-reminders.sql (lane daily, run O1, audit 01 P1-6 + P2-10, owner 2026-11-09)
--
-- What:   (1) public.daily_reminders: one opt-in row per account for the daily quiz reminder email (double opt-in: confirmed_at stays null until
--             the link in the confirmation email is opened; an hour of the day the player chose, in UTC; at most one email a day via last_sent_on;
--             only the hash of the confirmation link is stored; the unsubscribe link is an HMAC of the account id under a server secret). No open or click tracking exists anywhere in it.
--         (2) public.profiles.daily_rest_used_on and public.world_memberships.daily_rest_used_on: the day a free rest day last covered a missed
--             day (one per 7 days, lib/daily-rest.ts). Additive, nullable.
--         RLS is on for daily_reminders with no policy: only the service role reads or writes it (the routes use it after checking the session).
--         The code works without this file: no table means no reminder UI, no column means no rest day for accounts.
-- Needs:  none of the lane files; profiles and world_memberships exist.
-- WHEN:   any time outside a build and outside 23:50 to 00:30 UTC (the daily publish), after a backup. Additive, nothing is rewritten.
-- Undo:   L27-l1-daily-reminders.rollback.sql (drops the table and the two columns; the streaks themselves are untouched).
-- o1-transaction: single. ONE do block, no temp table: safe to paste in the Supabase SQL Editor. Idempotent: a second run changes nothing.
-- Before the code? YES. The code works without this file (no table: no reminder UI; no column: no rest day for accounts), so apply it any time before or after the merge.
-- Verify (read-only, run after the apply):
-- Verify: select to_regclass('public.daily_reminders') is not null;   expect true
-- Verify: select relrowsecurity from pg_class where oid = 'public.daily_reminders'::regclass;   expect true
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename = 'daily_reminders';   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and column_name = 'daily_rest_used_on' and table_name in ('profiles', 'world_memberships');   expect 2

do $op$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.profiles') is null or to_regclass('public.world_memberships') is null then
    raise exception 'L27: profiles and world_memberships must exist';
  end if;

  create table if not exists public.daily_reminders (
    user_id        uuid primary key references auth.users (id) on delete cascade,
    hour_utc       smallint not null check (hour_utc between 0 and 23),
    confirm_hash   text,
    confirmed_at   timestamptz,
    last_sent_on   date,
    created_at     timestamptz not null default now()
  );
  alter table public.daily_reminders enable row level security;
  -- no policy on purpose: the service role only

  create index if not exists daily_reminders_due_idx on public.daily_reminders (hour_utc) where confirmed_at is not null;

  alter table public.profiles add column if not exists daily_rest_used_on date;
  alter table public.world_memberships add column if not exists daily_rest_used_on date;

  if to_regclass('public.daily_reminders') is null
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'daily_rest_used_on')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'world_memberships' and column_name = 'daily_rest_used_on') then
    raise exception 'L27: self-check failed (table or columns missing)';
  end if;
end $op$;
