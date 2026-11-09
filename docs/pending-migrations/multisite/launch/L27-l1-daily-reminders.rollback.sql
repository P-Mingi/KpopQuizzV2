-- L27-l1-daily-reminders.rollback.sql: undoes L27-l1-daily-reminders.sql (drops the reminder table and the two rest-day columns).
-- o1-transaction: single (psql --single-transaction). Idempotent.
set lock_timeout = '5s';
set client_min_messages = warning;
drop table if exists public.daily_reminders;
alter table public.profiles drop column if exists daily_rest_used_on;
alter table public.world_memberships drop column if exists daily_rest_used_on;
