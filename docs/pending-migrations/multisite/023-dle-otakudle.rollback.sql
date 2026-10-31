-- 023-dle-otakudle.rollback.sql (run O1, Otakudle for launch day): undoes 023-dle-otakudle.sql.
--
-- What:   deletes the game otakudle (its columns, snapshot, bank and day rows go with it), drops the view dle_src_anime_character and the two tables.
-- Refused once the game has a play: a played game is switched off (launch/L14-O1-dle-on.rollback.sql), never deleted.
-- Refused while lot A1's rows are in the tables: launch/L13-A1-character-facts.rollback.sql comes first.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  -- Nested: a statement naming a table that is gone would fail on a second run.
  if to_regclass('public.dle_plays') is not null then
    if exists (select 1 from public.dle_plays where game_id = 'otakudle') then
      raise exception '023-dle-otakudle.rollback: otakudle has plays (switch it off instead)';
    end if;
  end if;
  if to_regclass('public.character_facts') is not null then
    if exists (select 1 from public.character_facts) then
      raise exception '023-dle-otakudle.rollback: character_facts has rows (apply L13-A1-character-facts.rollback.sql first)';
    end if;
  end if;
  if to_regclass('public.series_facts') is not null then
    if exists (select 1 from public.series_facts) then
      raise exception '023-dle-otakudle.rollback: series_facts has rows (apply L13-A1-character-facts.rollback.sql first)';
    end if;
  end if;
end $$;

do $$
begin
  if to_regclass('public.dle_games') is not null then
    delete from public.dle_daily_stats where game_id = 'otakudle';
    delete from public.dle_schedule where game_id = 'otakudle';
    delete from public.dle_games where id = 'otakudle';
  end if;
end $$;

drop view if exists public.dle_src_anime_character;
drop table if exists public.character_facts;
drop table if exists public.series_facts;

notify pgrst, 'reload schema';
