-- L42-l1-otakudle-two-steps.rollback.sql (the undo of L42)
--
-- What:   in ONE DO block, puts back dle_play_state exactly as L40 defines it (players_today and solve_rank, no step), drops the three helpers of L42 and gives otakudle its three columns back
--         (gender 5, species 6, role 7, kinds as 023 made them). The plays, their guesses and the day counts are not touched. L42a (the sets) stays in place: undo it after this file if needed.
-- Why:    the undo of L42-l1-otakudle-two-steps.sql. The client treats a play state without the step fields as the one board game, so the pages keep working.
-- Rows:   inserts 3 dle_attributes rows when they are not there; replaces 1 function; drops 3.
-- WHEN:   apply by the owner, never between 23:50 and 00:30 UTC.
-- Verify: select count(*) from public.dle_attributes where game_id = 'otakudle';   expect 7
-- Verify: select string_agg(key, ',' order by position) from public.dle_attributes where game_id = 'otakudle';   expect series,genres,year,studio,gender,species,role
-- Verify: select count(*) from pg_proc where oid = 'public.dle_play_state(public.dle_plays)'::regprocedure and prosrc like '%step2_columns%';   expect 0
-- Verify: select count(*) from pg_proc where oid = 'public.dle_play_state(public.dle_plays)'::regprocedure and prosrc like '%solve_rank%' and prosrc like '%players_today%';   expect 1
-- Verify: select count(*) from pg_proc where proname in ('dle_otakudle_set_id', 'dle_set_attrs', 'dle_step2_cells');   expect 0
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l42r$
begin
  perform set_config('lock_timeout', '5s', true);

  if to_regprocedure('public.dle_play_state(public.dle_plays)') is null then raise exception 'L42 rollback: dle_play_state is missing'; end if;

  execute $o1l42rf1$
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
  $o1l42rf1$;

  drop function if exists public.dle_step2_cells(text, jsonb, jsonb);
  drop function if exists public.dle_set_attrs(text, text);
  drop function if exists public.dle_otakudle_set_id(text);

  if exists (select 1 from public.dle_games where id = 'otakudle') then
    insert into public.dle_attributes (game_id, key, kind, position, near)
    select a.game_id, a.key, a.kind, a.position, a.near
    from (values
      ('otakudle', 'gender', 'single', 5::smallint, null::numeric),
      ('otakudle', 'species', 'single', 6::smallint, null::numeric),
      ('otakudle', 'role', 'single', 7::smallint, null::numeric)
    ) as a(game_id, key, kind, position, near)
    on conflict (game_id, key) do nothing;
  end if;

  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_play_state(public.dle_plays)')) like '%step2_columns%' then raise exception 'L42 rollback: dle_play_state is not the one of L40'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_play_state(public.dle_plays)')) not like '%solve_rank%' then raise exception 'L42 rollback: dle_play_state lost the rank of L40'; end if;
  if exists (select 1 from public.dle_games where id = 'otakudle') and (select string_agg(key, ',' order by position) from public.dle_attributes where game_id = 'otakudle') is distinct from 'series,genres,year,studio,gender,species,role' then raise exception 'L42 rollback: otakudle has not its seven columns'; end if;
  raise notice 'L42 rollback: Otakudle is one board again';
end $o1l42r$;
