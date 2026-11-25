-- L40-l1-dle-live-count-and-rank.rollback.sql (the undo of L40)
--
-- What:   in ONE DO block, puts back dle_day_at, dle_guess_at and dle_play_state exactly as 019 defines them, then drops public.dle_plays.solve_rank
--         (the ranks stored in it are lost; the plays, their guesses and the day counts are not touched).
-- Why:    the undo of L40-l1-dle-live-count-and-rank.sql. The client treats a missing players_today or solve_rank as hidden, so the pages keep working.
-- Rows:   drops one column; replaces three functions.
-- WHEN:   apply by the owner, never between 23:50 and 00:30 UTC.
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'dle_plays' and column_name = 'solve_rank';   expect 0
-- Verify: select count(*) from pg_proc where oid = 'public.dle_day_at(timestamptz, text, text, date)'::regprocedure and prosrc like '%players_today%';   expect 0
-- Verify: select count(*) from pg_proc where oid = 'public.dle_guess_at(timestamptz, text, date, text, text)'::regprocedure and prosrc like '%solve_rank%';   expect 0
-- Verify: select count(*) from pg_proc where oid = 'public.dle_play_state(public.dle_plays)'::regprocedure and (prosrc like '%solve_rank%' or prosrc like '%players_today%');   expect 0
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l40r$
begin
  perform set_config('lock_timeout', '5s', true);

  if to_regprocedure('public.dle_play_state(public.dle_plays)') is null or to_regprocedure('public.dle_guess_at(timestamptz, text, date, text, text)') is null
    or to_regprocedure('public.dle_day_at(timestamptz, text, text, date)') is null then raise exception 'L40 rollback: a dle function of 019 is missing'; end if;

  execute $o1l40rf1$
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
    'stats', case when v_over then public.dle_public_stats(g.id, p_play.play_date) end
  );
end $$;
  $o1l40rf1$;

  execute $o1l40rf2$
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
    where game_id = g.id and play_date = p_date;
  end if;
  return public.dle_play_state(p);
end $$;
  $o1l40rf2$;

  execute $o1l40rf3$
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
    'play', case when p.id is not null then public.dle_play_state(p) end
  );
end $$;
  $o1l40rf3$;

  alter table public.dle_plays drop column if exists solve_rank;

  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dle_plays' and column_name = 'solve_rank') then raise exception 'L40 rollback: solve_rank is still there'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_day_at(timestamptz, text, text, date)')) like '%players_today%' then raise exception 'L40 rollback: dle_day_at is still the new one'; end if;
  raise notice 'L40 rollback: the functions of 019 are back and solve_rank is gone';
end $o1l40r$;
