-- 088 - Passport canonical streak (Workstream M, step M0.3).
-- The passport streak IS the daily-ritual streak (profiles.daily_streak, mig 076).
-- The blindtest streak (players.current_streak / longest_streak, mig 020) stays
-- a blindtest-internal stat and is NOT the passport streak. Do not conflate them.
--
-- Gap patched here: mig 076 stored only the current daily streak, no all-time
-- best. The passport wants current + longest, so add a longest column and let
-- the existing engine (lib/daily-streak.ts) maintain it. Additive only.
alter table public.profiles
  add column if not exists daily_streak_longest int not null default 0;

-- Seed longest from the live current streak so existing streaks are not lost.
update public.profiles
  set daily_streak_longest = greatest(daily_streak_longest, daily_streak)
  where daily_streak > daily_streak_longest;
