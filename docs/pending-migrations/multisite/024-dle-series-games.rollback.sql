-- 024-dle-series-games.rollback.sql (run O1, daily games of one series): undoes 024-dle-series-games.sql.
--
-- What:   deletes the games otakudle-one-piece and otakudle-dragon-ball (their columns, snapshot, bank and day rows go with them), drops the two views and the table character_game_facts.
-- Refused once a game has a play: a played game is switched off (launch/L14-O1-dle-on.rollback.sql), never deleted.
-- Refused while L15's rows are in the table: launch/L15-A2-series-games.rollback.sql comes first.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  -- Nested: a statement naming a table that is gone would fail on a second run.
  if to_regclass('public.dle_plays') is not null then
    if exists (select 1 from public.dle_plays where game_id in ('otakudle-one-piece', 'otakudle-dragon-ball')) then
      raise exception '024-dle-series-games.rollback: a series game has plays (switch it off instead)';
    end if;
  end if;
  if to_regclass('public.character_game_facts') is not null then
    if exists (select 1 from public.character_game_facts) then
      raise exception '024-dle-series-games.rollback: character_game_facts has rows (apply L15-A2-series-games.rollback.sql first)';
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.dle_games') is not null then
    delete from public.dle_daily_stats where game_id in ('otakudle-one-piece', 'otakudle-dragon-ball');
    delete from public.dle_schedule where game_id in ('otakudle-one-piece', 'otakudle-dragon-ball');
    delete from public.dle_games where id in ('otakudle-one-piece', 'otakudle-dragon-ball');
  end if;
end $$;

drop view if exists public.dle_src_otakudle_one_piece;
drop view if exists public.dle_src_otakudle_dragon_ball;
drop table if exists public.character_game_facts;

notify pgrst, 'reload schema';
