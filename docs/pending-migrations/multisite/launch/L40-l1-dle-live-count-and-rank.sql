-- L40-l1-dle-live-count-and-rank.sql (owner request of 2026-11-25, lane DLE2-A of run O1)
--
-- What:   in ONE DO block: adds public.dle_plays.solve_rank (integer, null) and redefines three functions of 019 on their only definition in the repo:
--           dle_day_at (so dle_day)   also returns players_today, the plays count of the day, whatever the floor of 100 that keeps `stats` null;
--           dle_guess_at (so dle_guess) at the guess that wins, stores the wins count after its increment as the play's solve_rank;
--           dle_play_state            returns solve_rank (won plays only) and players_today.
--         The signatures, the grants and every other line of the three functions are 019's. No row is written or changed: a play won before this file keeps a null rank.
-- Why:    the game pages show "N players today" (from 10 players) in their meta line and, at the result, "You are the 3rd to find X today, out of N players".
--         The rank is the order in which a play found the answer that day, kept on the play so it is the same after a reload. The client applies the floor of 10
--         itself and treats a missing players_today or solve_rank as hidden, so the site keeps working before this file is applied.
-- Rows:   adds one nullable column to public.dle_plays (no default, no rewrite of the table); replaces three functions. No UPDATE and no DELETE at the time of the file.
-- Effect: bunnyverse.org Kpopdle and the three Otakudle games: the player count of the meta line, the rank line of a won result, from the next call of each.
-- Needs:  019 (daily games core). Apply after 020 or 023 and 024 are in place or not: the file does not read a game.
-- WHEN:   apply by the owner, never between 23:50 and 00:30 UTC (a day change redraws the target through dle_day_at, which this file replaces).
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'dle_plays' and column_name = 'solve_rank';   expect 1
-- Verify: select count(*) from pg_proc where oid = 'public.dle_day_at(timestamptz, text, text, date)'::regprocedure and prosrc like '%players_today%';   expect 1
-- Verify: select count(*) from pg_proc where oid = 'public.dle_guess_at(timestamptz, text, date, text, text)'::regprocedure and prosrc like '%solve_rank%';   expect 1
-- Verify: select count(*) from pg_proc where oid = 'public.dle_play_state(public.dle_plays)'::regprocedure and prosrc like '%solve_rank%' and prosrc like '%players_today%';   expect 1
-- Verify: select count(*) from public.dle_plays where solve_rank is not null and status <> 'won';   expect 0
-- Verify: select count(*) from (select game_id, play_date, solve_rank from public.dle_plays where solve_rank is not null group by game_id, play_date, solve_rank having count(*) > 1) d;   expect 0
-- Verify: select has_function_privilege('anon', 'public.dle_day(text, text, date)', 'execute')::int + has_function_privilege('anon', 'public.dle_guess_at(timestamptz, text, date, text, text)', 'execute')::int;   expect 1
-- Undo:   L40-l1-dle-live-count-and-rank.rollback.sql (puts back the three functions of 019, then drops the column and the ranks in it)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l40$
begin
  perform set_config('lock_timeout', '5s', true);

  -- Prerequisites.
  if to_regclass('public.dle_plays') is null or to_regclass('public.dle_daily_stats') is null then raise exception 'L40: public.dle_plays or public.dle_daily_stats is missing (019)'; end if;
  if to_regprocedure('public.dle_play_state(public.dle_plays)') is null or to_regprocedure('public.dle_guess_at(timestamptz, text, date, text, text)') is null
    or to_regprocedure('public.dle_day_at(timestamptz, text, text, date)') is null then raise exception 'L40: a dle function of 019 is missing'; end if;

  alter table public.dle_plays add column if not exists solve_rank integer;

  execute $o1l40f1$
create or replace function public.dle_play_state(p_play public.dle_plays) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v_target text := public.dle_target(p_play.game_id, p_play.play_date);
  v_target_attrs jsonb;
  v_errors integer;
  v_hints jsonb := '[]'::jsonb;
  v_entity_hints jsonb;
  v_over boolean := p_play.status <> 'playing';
  i integer;
begin
  select * into g from public.dle_games where id = p_play.game_id;
  select attrs, hints into v_target_attrs, v_entity_hints from public.dle_entities where game_id = g.id and entity_id = v_target;
  v_errors := cardinality(p_play.guesses) - case when p_play.status = 'won' then 1 else 0 end;
  for i in 1..cardinality(g.hint_keys) loop
    if v_errors >= g.hint_after[i] and v_entity_hints ? g.hint_keys[i] then
      v_hints := v_hints || jsonb_build_object('key', g.hint_keys[i], 'value', v_entity_hints -> g.hint_keys[i]);
    end if;
  end loop;
  return jsonb_build_object(
    'date', p_play.play_date,
    'game_no', (p_play.play_date - g.epoch) + 1,
    'status', p_play.status,
    'guesses', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'result', public.dle_compare_all(g.id, e.attrs, v_target_attrs)) order by x.n)
      from unnest(p_play.guesses) with ordinality as x(id, n)
      join public.dle_entities e on e.game_id = g.id and e.entity_id = x.id
    ), '[]'::jsonb),
    'hints', v_hints,
    'target', case when v_over then public.dle_public_entity(g.id, v_target) end,
    'stats', case when v_over then public.dle_public_stats(g.id, p_play.play_date) end,
    -- L40: the order in which this play found the answer that day (null while it is open, after a give up and for a play won before L40), and the plays of the day.
    'solve_rank', case when p_play.status = 'won' then p_play.solve_rank end,
    'players_today', coalesce((select s.plays from public.dle_daily_stats s where s.game_id = p_play.game_id and s.play_date = p_play.play_date), 0)
  );
end $$;
  $o1l40f1$;

  execute $o1l40f2$
create or replace function public.dle_guess_at(p_now timestamptz, p_game text, p_date date, p_token text, p_entity text) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  g public.dle_games;
  v_hash text;
  v_target text;
  p public.dle_plays;
  v_won boolean;
  v_rank integer;
begin
  if p_token is null then
    raise exception 'dle_bad_token';
  end if;
  g := public.dle_check(p_game, p_now, p_date, p_token);
  perform public.dle_rate_hit(p_now);
  if not exists (select 1 from public.dle_entities where game_id = g.id and entity_id = p_entity and in_pool) then
    raise exception 'dle_unknown_entity';
  end if;
  v_target := public.dle_target(g.id, p_date);
  v_hash := encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  p := public.dle_find_play(g.id, p_date, v_hash);
  if p.id is null then
    insert into public.dle_plays (game_id, play_date, token_hash, user_id, started_at)
    values (g.id, p_date, v_hash, auth.uid(), p_now)
    returning * into p;
    update public.dle_daily_stats set plays = plays + 1 where game_id = g.id and play_date = p_date;
  end if;
  -- A finished play, or a guess already made: the same state, nothing counted twice.
  if p.status <> 'playing' or p_entity = any (p.guesses) then
    return public.dle_play_state(p);
  end if;
  if cardinality(p.guesses) >= 300 then
    raise exception 'dle_too_many_guesses';
  end if;
  v_won := p_entity = v_target;
  update public.dle_plays
  set guesses = guesses || p_entity,
      status = case when v_won then 'won' else 'playing' end,
      finished_at = case when v_won then p_now end
  where id = p.id
  returning * into p;
  if v_won then
    update public.dle_daily_stats
    set wins = wins + 1, guess_hist[least(cardinality(p.guesses), 20)] = guess_hist[least(cardinality(p.guesses), 20)] + 1
    where game_id = g.id and play_date = p_date
    returning wins into v_rank;
    -- L40: the rank is the wins count after this increment (the row lock of the statement makes it unique per game and day), kept on the play so a reload shows the same number.
    update public.dle_plays set solve_rank = v_rank where id = p.id returning * into p;
  end if;
  return public.dle_play_state(p);
end $$;
  $o1l40f2$;

  execute $o1l40f3$
create or replace function public.dle_day_at(p_now timestamptz, p_game text, p_token text default null, p_date date default null) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_today date := public.dle_utc_date(p_now);
  v_date date := coalesce(p_date, v_today);
  g public.dle_games;
  p public.dle_plays;
  v_yesterday jsonb;
begin
  g := public.dle_check(p_game, p_now, v_date, p_token);
  -- It writes too (the day's row, a guest play given to the account), so it counts against the limit like a guess.
  perform public.dle_rate_hit(p_now);
  perform public.dle_target(g.id, v_date);
  if p_now >= (v_today::timestamp at time zone 'utc') + interval '3 hours' then
    select jsonb_build_object('date', s.play_date, 'game_no', s.game_no, 'answer', public.dle_public_entity(g.id, s.entity_id))
    into v_yesterday
    from public.dle_daily_stats s where s.game_id = g.id and s.play_date = v_today - 1;
  end if;
  if p_token is not null or auth.uid() is not null then
    p := public.dle_find_play(g.id, v_date, encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex'));
  end if;
  return jsonb_build_object(
    'game', g.id,
    'now', p_now,
    'date', v_date,
    'game_no', (v_date - g.epoch) + 1,
    'seconds_left', extract(epoch from ((v_date + 1)::timestamp at time zone 'utc') - p_now)::integer,
    'yesterday', v_yesterday,
    'stats', public.dle_public_stats(g.id, v_date),
    -- L40: the plays of the day whatever the floor of 100 (the client hides the line under 10 players).
    'players_today', coalesce((select s.plays from public.dle_daily_stats s where s.game_id = g.id and s.play_date = v_date), 0),
    'play', case when p.id is not null then public.dle_play_state(p) end
  );
end $$;
  $o1l40f3$;

  -- Self-check: the column and the three functions are the new ones, and the grants of 019 are still the browser's.
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dle_plays' and column_name = 'solve_rank') then raise exception 'L40: solve_rank is missing'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_day_at(timestamptz, text, text, date)')) not like '%players_today%' then raise exception 'L40: dle_day_at is not the new one'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_guess_at(timestamptz, text, date, text, text)')) not like '%solve_rank%' then raise exception 'L40: dle_guess_at is not the new one'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_play_state(public.dle_plays)')) not like '%solve_rank%' then raise exception 'L40: dle_play_state is not the new one'; end if;
  if not has_function_privilege('anon', 'public.dle_day(text, text, date)', 'execute') or has_function_privilege('anon', 'public.dle_guess_at(timestamptz, text, date, text, text)', 'execute') then raise exception 'L40: the grants changed'; end if;
  raise notice 'L40: players_today and solve_rank are live';
end $o1l40$;
