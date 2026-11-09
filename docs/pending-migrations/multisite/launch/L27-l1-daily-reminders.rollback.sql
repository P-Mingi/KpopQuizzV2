-- L27-l1-daily-reminders.rollback.sql: undoes L27-l1-daily-reminders.sql (drops the reminder table and the two rest-day columns; the streaks are untouched).
-- o1-transaction: single. ONE do block, no temp table. Idempotent.
-- Verify (read-only, run after the rollback):
-- Verify: select to_regclass('public.daily_reminders') is null;   expect true
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and column_name = 'daily_rest_used_on' and table_name in ('profiles', 'world_memberships');   expect 0

do $op$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);
  drop table if exists public.daily_reminders;
  alter table public.profiles drop column if exists daily_rest_used_on;
  alter table public.world_memberships drop column if exists daily_rest_used_on;
end $op$;
