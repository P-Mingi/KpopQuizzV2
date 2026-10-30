-- 020-dle-kpop-idol.rollback.sql (run O1, daily games step 1): undoes 020-dle-kpop-idol.sql.
--
-- What:   deletes the kpopdle-idol game (its columns, snapshot, bank and day rows go with it) and drops dle_src_kpop_idol.
-- Refused once the game has a play: a played game is switched off (active false), never deleted.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.dle_plays') is not null and exists (select 1 from public.dle_plays where game_id = 'kpopdle-idol') then
    raise exception '020-dle-kpop-idol.rollback: kpopdle-idol has plays (switch it off instead)';
  end if;
end $$;

do $$
begin
  if to_regclass('public.dle_games') is not null then
    delete from public.dle_daily_stats where game_id = 'kpopdle-idol';
    delete from public.dle_schedule where game_id = 'kpopdle-idol';
    delete from public.dle_games where id = 'kpopdle-idol';
  end if;
end $$;

drop view if exists public.dle_src_kpop_idol;

notify pgrst, 'reload schema';
