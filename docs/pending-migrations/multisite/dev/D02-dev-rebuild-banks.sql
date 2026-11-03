-- D02-dev-rebuild-banks.sql (run O1, lot DRAW, CR-027)
-- DEV ONLY. NEVER FOR PRODUCTION. Not in docs/launch/o1/SQL-ORDER.md, not in session.sh, not in the production order of manifest.md section 2.
--
-- What:   rebuilds, from bank day 1, the bank of every daily game of o1-dev that already has one (the four games when they are on: kpopdle-idol, otakudle,
--         otakudle-one-piece, otakudle-dragon-ball), so that the preview shows the banks of CR-027: blocks of N days (N = the eligible targets), every
--         target once per block before any comes back, the gap dle_window between two days of one target held across the blocks and the turn of the cycle.
--         The banks of dev were drawn by the engine of CR-019, which gave every target 3 or 4 days but let one come back before the others had come once.
--         Per game: snapshot of the pool (dle_refresh_entities), then dle_build_bank(game) with no day kept: the dle rules stay the engine's own, so a day
--         already served keeps its target (dle_daily_stats is read first by dle_target and is not touched), a game under its min_pool is left as it is
--         (a notice names it) and the others go on, and nothing here switches a game on or off or moves an epoch. A game whose bank already reads as blocks
--         from day 1, holds the gap and matches its pool is left alone, so a second run changes nothing.
-- Why:    the owner wants the four daily games on o1-dev as a preview with the banks of the new engine; no play on dev needs a kept day.
-- Needs:  019-dle-core.sql run again first (docs/pending-migrations/multisite/019-dle-core.sql, in this lot). It is create or replace and idempotent, so run it
--         on o1-dev, then this file. This file does not carry the functions (a second copy of 300 lines would drift): it refuses, changing nothing, when
--         dle_build_bank on the database is still the one of CR-019 (it looks for the marker bank-blocks-v1 in its body).
-- Guards: the file refuses, with nothing changed, when the database does not look like o1-dev: more than 200 profiles (production has real members; o1-dev
--         has 50 fixtures), or the anime or hub site already live, or public.sites, public.profiles or the dle tables missing (same guards as D01-dev-catchup.sql).
-- Rows:   dle_schedule: 365 rows rewritten for each game rebuilt (by the engine, in its own delete and insert), dle_games.pool_hash, dle_entities (the
--         snapshot). No other table.
-- Verify: select game_id, count(*) from public.dle_schedule group by 1 order by 1;   expect 365 each
--         docs/launch/o1/checks/V-L14.sql checks 2, 3, 4 and 8 (365 days, targets of the pool, the gap, the blocks from day 1: start 1)
-- Undo:   none. The bank before is not kept; running 019 and this file again draws another one. o1-dev is reset from the dashboard, not by a file.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = notice;

do $$
begin
  if to_regclass('public.sites') is null or to_regclass('public.profiles') is null or to_regclass('public.dle_games') is null or to_regclass('public.dle_schedule') is null then
    raise exception 'D02-dev-rebuild-banks: public.sites, public.profiles or the dle tables are missing (run the files up to 019 first)';
  end if;
  if (select count(*) from public.profiles) > 200 then
    raise exception 'D02-dev-rebuild-banks: refused, this database holds more than 200 profiles: it is not o1-dev. This file is for the dev branch only, never for production';
  end if;
  if exists (select 1 from public.sites where id in ('anime', 'hub') and status = 'live') then
    raise exception 'D02-dev-rebuild-banks: refused, the anime or hub site is live: this file is for the dev branch only, never for production';
  end if;
  if to_regprocedure('public.dle_build_bank(text, date, double precision)') is null or to_regprocedure('public.dle_refresh_entities(text)') is null then
    raise exception 'D02-dev-rebuild-banks: the dle engine is missing (apply 019 first)';
  end if;
  if (select p.prosrc from pg_proc p where p.oid = to_regprocedure('public.dle_build_bank(text, date, double precision)')) not like '%bank-blocks-v1%' then
    raise exception 'D02-dev-rebuild-banks: dle_build_bank is still the one of CR-019 (no blocks): run 019-dle-core.sql again first, then this file';
  end if;
end $$;

do $$
declare
  g record;
  v_n integer;
  v_win integer;
  v_blocks boolean;
  v_gap integer;
  v_rebuilt integer := 0;
  v_kept integer := 0;
begin
  for g in select id, min_pool, pool_hash from public.dle_games where epoch is not null and exists (select 1 from public.dle_schedule s where s.game_id = dle_games.id) order by id loop
    perform public.dle_refresh_entities(g.id);
    select count(*) into v_n from public.dle_entities where game_id = g.id and can_be_target and in_pool;
    if v_n < g.min_pool then
      raise notice 'D02: % left as it is, % targets and the minimum is %', g.id, v_n, g.min_pool;
      continue;
    end if;
    v_win := public.dle_window(g.id);
    -- Already in blocks from day 1, the gap held, the pool the bank was drawn for: nothing to do.
    select not exists (
        select 1 from public.dle_schedule s where s.game_id = g.id
        group by s.entity_id, (s.bank_day - 1) / least(365, v_n) having count(*) > 1),
      (select min(case when lead_d is null then first_d + 365 - d else lead_d - d end) from (
        select bank_day as d, lead(bank_day) over w as lead_d, first_value(bank_day) over w as first_d
        from public.dle_schedule where game_id = g.id
        window w as (partition by entity_id order by bank_day rows between unbounded preceding and unbounded following)) x)
    into v_blocks, v_gap;
    if v_blocks and v_gap >= v_win and (select count(*) from public.dle_schedule where game_id = g.id) = 365
       and public.dle_pool_hash(g.id) is not distinct from g.pool_hash then
      v_kept := v_kept + 1;
      continue;
    end if;
    perform public.dle_build_bank(g.id, null, null);
    v_rebuilt := v_rebuilt + 1;
    -- Self-check, game by game: 365 days on targets of the pool, the gap, no target twice in a block from day 1.
    if (select count(*) from public.dle_schedule where game_id = g.id) <> 365
       or exists (select 1 from public.dle_schedule s left join public.dle_entities e on e.game_id = s.game_id and e.entity_id = s.entity_id
                  where s.game_id = g.id and not coalesce(e.can_be_target and e.in_pool, false))
       or exists (select 1 from public.dle_schedule s where s.game_id = g.id
                  group by s.entity_id, (s.bank_day - 1) / least(365, v_n) having count(*) > 1)
       or exists (select 1 from public.dle_schedule a join public.dle_schedule b on b.game_id = a.game_id and b.entity_id = a.entity_id and a.bank_day < b.bank_day
                  where a.game_id = g.id and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < v_win) then
      raise exception 'D02-dev-rebuild-banks: the bank of % is not in blocks after the rebuild', g.id;
    end if;
  end loop;
  raise notice 'D02: % bank(s) rebuilt, % already in blocks', v_rebuilt, v_kept;
end $$;
