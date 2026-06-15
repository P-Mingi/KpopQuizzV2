-- 076 - L4: per-account daily streak for signed-in users. F6's localStorage
-- daily-played signal is anon; this server-side counter rewards consistency.
alter table public.profiles
  add column if not exists daily_streak    int  not null default 0,
  add column if not exists last_daily_date date;
