-- 001-quiz-daily-plays.rollback.sql (run O1, lot H2b): undo of 001-quiz-daily-plays.sql.
--
-- What:   drops public.hub_refresh_quiz_daily(integer) and public.quiz_daily_plays (its index, policy and constraints go with it).
-- Why:    the table is derived data (it can be rebuilt from public.plays with the function), so nothing is lost. The Hot right now
--         block falls back to the plays rows on its own when the table is gone.
-- Rows:   1 table dropped, 1 function dropped. Refused, with nothing changed, while a `started` count is stored: those numbers
--         cannot be rebuilt from plays.
-- Verify: select to_regclass('public.quiz_daily_plays'), to_regprocedure('public.hub_refresh_quiz_daily(integer)');   expect null, null
-- Undo:   run 001-quiz-daily-plays.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $o1h$
declare
  v_started bigint := 0;
begin
  if to_regclass('public.quiz_daily_plays') is not null then
    execute 'select count(*) from public.quiz_daily_plays where started is not null' into v_started;
    if v_started > 0 then
      raise exception '001-quiz-daily-plays.rollback: % rows hold a started count that plays cannot rebuild; export them first', v_started;
    end if;
  end if;
end $o1h$;

drop function if exists public.hub_refresh_quiz_daily(integer);
drop table if exists public.quiz_daily_plays;
