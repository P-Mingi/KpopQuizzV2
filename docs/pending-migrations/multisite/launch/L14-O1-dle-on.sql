-- L14-O1-dle-on.sql (run O1, launch day; contract docs/o1/contracts/dle-a1-characters.md part 4, CR-017)
--
-- What:   switches on the two daily games that open on launch day, kpopdle-idol and otakudle, with dle_activate: the snapshot of the pool, the epoch, the bank
--         of 365 days drawn with no fixed seed, active true. The epoch is the date of game n. 1: today in UTC, when this file first runs. It never moves
--         afterwards. Nothing is shown to players yet: the pages stay closed until the launch-day PR sets the hub's dailyGuess to true (RUNBOOK K8c).
--         One transaction: a game under its minimum of targets (min_pool, 40) stops the file, it names the game and its count, and neither game changes.
--         The two games of one series (CR-023), otakudle-one-piece and otakudle-dragon-ball, follow in the same file: each opens when its pool reaches its
--         min_pool; a game under it stays off, the file names it and its count in a warning and goes on (the facts of L15 are the characters L04 has; the
--         others wait for the L04 regeneration, and running this file again then opens the game). They never stop the two games above.
-- Why:    owner decision: Kpopdle Idol and Otakudle open on launch day, after the launch files.
-- Rows:   each game's row, its snapshot in dle_entities, 365 dle_schedule rows each.
-- Needs:  020 (kpopdle-idol) and 021a; L01 to L15 (session.sh J1 to J4), with 023 and 024 run again in J4 (the otakudle rows). A series game whose row is
--         not there (024 not applied) is skipped with a warning, and V-024 says so.
-- Verify: docs/launch/o1/checks/V-L14.sql (session.sh J5). Counts only, never a target.
-- Undo:   L14-O1-dle-on.rollback.sql switches both off; epochs, banks and plays stay.
-- o1-transaction: single (psql --single-transaction). Idempotent: a game already on is left alone, so a second run changes nothing (never a new epoch, never a new bank).

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  g text;
begin
  foreach g in array array['kpopdle-idol', 'otakudle'] loop
    if not exists (select 1 from public.dle_games where id = g) then
      raise exception 'L14 %: the game is missing (020 adds kpopdle-idol; session.sh J4 adds otakudle)', g;
    end if;
    if not (select active from public.dle_games where id = g) then
      begin
        perform public.dle_activate(g, public.dle_utc_date(now()));
      exception when others then
        raise exception 'L14 %: %', g, sqlerrm;
      end;
    end if;
  end loop;
end $$;

-- The two games of one series: on when the pool is enough, else left off with a warning (sqlerrm names the count). The sub-block rolls the
-- failed activation back, so a game left off has no epoch, no snapshot and no bank.
do $$
declare
  g text;
begin
  foreach g in array array['otakudle-one-piece', 'otakudle-dragon-ball'] loop
    if not exists (select 1 from public.dle_games where id = g) then
      raise warning 'L14 %: the game is not there (024 adds it in session.sh J4), skipped', g;
    elsif not (select active from public.dle_games where id = g) then
      begin
        perform public.dle_activate(g, public.dle_utc_date(now()));
      exception when others then
        if sqlerrm like 'dle_pool_too_small%' then
          raise warning 'L14 %: left off, %', g, sqlerrm;
        else
          raise exception 'L14 %: %', g, sqlerrm;
        end if;
      end;
    end if;
  end loop;
end $$;
