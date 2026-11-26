-- L42-l1-otakudle-two-steps.sql (owner request of 2026-11-26, lane OTK-E of run O1: Otakudle in two steps)
--
-- What:   in ONE DO block, Otakudle (the character of the day across all series, game id otakudle) becomes two steps.
--         Step 1 finds the anime with the work columns only: dle_attributes of otakudle loses gender, species and role and keeps series, genres, year, studio (positions 1 to 4).
--         Step 2 opens as soon as a guess is a character of the right anime: a second set of columns, gender then the 2 to 4 columns proper to that anime, compared by the engine's own
--         dle_compare on the set of the series (a set is a closed dle_games row otakudle-s-<series> from L42a, or, for One Piece and Dragon Ball, the existing games otakudle-one-piece and
--         otakudle-dragon-ball of 024 and L15, matched by character: their columns are unchanged). Three helpers are added (dle_otakudle_set_id, dle_set_attrs, dle_step2_cells; closed to the browser roles)
--         and ONE function is replaced, dle_play_state, on its definition of L40 (players_today and solve_rank are kept as they are): dle_guess, dle_give_up and dle_day all return it, so they need no change.
--         The play state of Otakudle then says: step (1 or 2). Once the series is found (a guess of the right anime), also series (slug), series_label, step1_guesses (the guess that found the anime),
--         step2_guesses (the guesses that are characters of that anime), step2_total (its characters in the pool) and step2_columns (key, kind, near, label and help in English and French of each
--         column of step 2). A guess of the right anime carries step2: its cells (key, status, arrow, value of the guessed character) next to its step 1 result. The step 2 columns are never sent
--         before the anime is found (they would name the series). The hints keep their thresholds, on the total of errors. Every other game, and an Otakudle whose target has no set, returns exactly what L40 returns.
--         No row is written but the three columns removed from dle_attributes. The target of each day is not touched, and neither is the bank.
-- Why:    owner decision of 2026-11-26: the first guess of Otakudle is hard because every anime brings its own kind of facts. Step 1 asks only for the anime, step 2 asks the questions that make sense for it.
--         The client treats a play state without the step fields as the old one board game, so the site works before this file.
-- Rows:   deletes 3 dle_attributes rows (otakudle: gender, species, role); creates 3 functions; replaces 1.
-- Needs:  L40 (players_today, solve_rank), L42a (the sets and their data, applied first), 019, 024, L15, L18 (the genres column).
-- WHEN:   apply by the owner after L42a, never between 23:50 and 00:30 UTC. A play of the day already started is recoloured at once: its guesses are compared on the 4 columns of step 1 from the next read.
-- Verify: select count(*) from public.dle_attributes where game_id = 'otakudle';   expect 4
-- Verify: select string_agg(key, ',' order by position) from public.dle_attributes where game_id = 'otakudle';   expect series,genres,year,studio
-- Verify: select count(*) from pg_proc where oid = 'public.dle_play_state(public.dle_plays)'::regprocedure and prosrc like '%step2_columns%' and prosrc like '%solve_rank%' and prosrc like '%players_today%';   expect 1
-- Verify: select count(*) from pg_proc where proname in ('dle_otakudle_set_id', 'dle_set_attrs', 'dle_step2_cells');   expect 3
-- Verify: select has_function_privilege('anon', 'public.dle_set_attrs(text, text)', 'execute')::int + has_function_privilege('authenticated', 'public.dle_step2_cells(text, jsonb, jsonb)', 'execute')::int;   expect 0
-- Verify: select count(*) from public.dle_games where id like 'otakudle-s-%' and not active;   expect 48
-- Verify: select count(*) from public.dle_src_anime_character v where not exists (select 1 from public.dle_curation k where k.game_id = 'otakudle' and k.entity_id = v.entity_id and k.excluded) and not exists (select 1 from public.character_game_facts f where f.character_id = v.entity_id::integer and f.game_id = public.dle_otakudle_set_id(v.balance_key));   expect 0
-- Verify: select has_function_privilege('anon', 'public.dle_day(text, text, date)', 'execute')::int + has_function_privilege('anon', 'public.dle_guess_at(timestamptz, text, date, text, text)', 'execute')::int;   expect 1
-- Undo:   L42-l1-otakudle-two-steps.rollback.sql (puts back the L40 dle_play_state and the three columns; the three helpers are dropped)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $o1l42$
begin
  perform set_config('lock_timeout', '5s', true);

  -- Prerequisites.
  if to_regprocedure('public.dle_play_state(public.dle_plays)') is null or to_regprocedure('public.dle_guess_at(timestamptz, text, date, text, text)') is null then raise exception 'L42: a dle function of 019 is missing'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_play_state(public.dle_plays)')) not like '%solve_rank%' then raise exception 'L42: apply L40 first'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dle_attributes' and column_name = 'meta') then raise exception 'L42: apply L42a first (dle_attributes.meta)'; end if;
  if to_regclass('public.character_game_facts') is null or to_regclass('public.character_facts') is null then raise exception 'L42: 023 or 024 is missing'; end if;
  if (select count(*) from public.dle_games where id like 'otakudle-s-%') <> 48 then raise exception 'L42: apply L42a first (the 48 set games)'; end if;
  if not exists (select 1 from public.dle_games where id = 'otakudle') then raise exception 'L42: the game otakudle is missing'; end if;

  -- The set of a series: the game that holds its columns of step 2. The slug is cut at 30 characters so the id stays under the 41 of dle_games.
  execute $o1l42f1$
create or replace function public.dle_otakudle_set_id(p_series text) returns text
language sql immutable
set search_path = public
as $$
  select case p_series when 'one-piece' then 'otakudle-one-piece' when 'dragon-ball' then 'otakudle-dragon-ball' else 'otakudle-s-' || left(p_series, 30) end
$$;
  $o1l42f1$;

  -- The values of a character on a set: the facts of the set, with the gender of character_facts for the sets that do not hold it (the 48 of L42a; the sets of 024 hold their own).
  execute $o1l42f2$
create or replace function public.dle_set_attrs(p_set text, p_entity text) returns jsonb
language sql stable
set search_path = public
as $$
  select case when f.attrs ? 'gender' then f.attrs else jsonb_build_object('gender', jsonb_build_object('v', cf.gender)) || f.attrs end
  from public.character_game_facts f
  left join public.character_facts cf on cf.character_id = f.character_id
  where f.game_id = p_set and f.character_id = p_entity::integer
$$;
  $o1l42f2$;

  -- The cells of a guess on a set: the engine's own compare of each column of the set, with the value of the guessed character for the tile.
  execute $o1l42f3$
create or replace function public.dle_step2_cells(p_set text, p_guess jsonb, p_target jsonb) returns jsonb
language sql stable
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('key', a.key, 'value', p_guess -> a.key)
    || public.dle_compare(a.kind, a.near, p_guess -> a.key, p_target -> a.key) order by a.position), '[]'::jsonb)
  from public.dle_attributes a
  where a.game_id = p_set
$$;
  $o1l42f3$;

  -- dle_play_state of L40, plus the step of Otakudle. Every line of L40 is kept; the lines of L42 are marked.
  execute $o1l42f4$
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
  v_out jsonb;
  -- L42: the set of the target's series (null: one board, as before L42).
  v_series text;
  v_label text;
  v_set text;
  v_tset jsonb;
  v_two boolean := false;
  v_guesses jsonb;
  v_first integer;
  v_n2 integer;
  v_total integer;
begin
  select * into g from public.dle_games where id = p_play.game_id;
  select attrs, hints into v_target_attrs, v_entity_hints from public.dle_entities where game_id = g.id and entity_id = v_target;
  v_errors := cardinality(p_play.guesses) - case when p_play.status = 'won' then 1 else 0 end;
  for i in 1..cardinality(g.hint_keys) loop
    if v_errors >= g.hint_after[i] and v_entity_hints ? g.hint_keys[i] then
      v_hints := v_hints || jsonb_build_object('key', g.hint_keys[i], 'value', v_entity_hints -> g.hint_keys[i]);
    end if;
  end loop;
  -- L42: Otakudle has two steps when the target's series has a set and the target has its values in it.
  if g.id = 'otakudle' then
    select e.balance_key, e.attrs -> 'series' ->> 'v' into v_series, v_label from public.dle_entities e where e.game_id = g.id and e.entity_id = v_target;
    if v_series is not null then
      v_set := public.dle_otakudle_set_id(v_series);
      v_tset := public.dle_set_attrs(v_set, v_target);
      v_two := v_tset is not null and exists (select 1 from public.dle_attributes where game_id = v_set);
    end if;
  end if;
  v_guesses := coalesce((
    select jsonb_agg(
      jsonb_build_object('id', x.id, 'result', public.dle_compare_all(g.id, e.attrs, v_target_attrs))
      -- L42: a guess of the right anime also carries its cells of step 2.
      || case when v_two and e.balance_key = v_series and public.dle_set_attrs(v_set, x.id) is not null
           then jsonb_build_object('step2', public.dle_step2_cells(v_set, public.dle_set_attrs(v_set, x.id), v_tset)) else '{}'::jsonb end
      order by x.n)
    from unnest(p_play.guesses) with ordinality as x(id, n)
    join public.dle_entities e on e.game_id = g.id and e.entity_id = x.id
  ), '[]'::jsonb);
  v_out := jsonb_build_object(
    'date', p_play.play_date,
    'game_no', (p_play.play_date - g.epoch) + 1,
    'status', p_play.status,
    'guesses', v_guesses,
    'hints', v_hints,
    'target', case when v_over then public.dle_public_entity(g.id, v_target) end,
    'stats', case when v_over then public.dle_public_stats(g.id, p_play.play_date) end,
    -- L40: the order in which this play found the answer that day (null while it is open, after a give up and for a play won before L40), and the plays of the day.
    'solve_rank', case when p_play.status = 'won' then p_play.solve_rank end,
    'players_today', coalesce((select s.plays from public.dle_daily_stats s where s.game_id = p_play.game_id and s.play_date = p_play.play_date), 0)
  );
  if not v_two then
    return v_out;
  end if;
  -- L42: where the play stands. The guess that found the anime is the first of the right series; the guesses of step 2 are the ones that carry step2.
  select min(x.n), count(*) into v_first, v_n2
  from unnest(p_play.guesses) with ordinality as x(id, n)
  join public.dle_entities e on e.game_id = g.id and e.entity_id = x.id
  where e.balance_key = v_series;
  if v_first is null then
    return v_out || jsonb_build_object('step', 1);
  end if;
  select count(*) into v_total
  from public.dle_entities e
  where e.game_id = g.id and e.in_pool and e.balance_key = v_series
    and exists (select 1 from public.character_game_facts f where f.character_id = e.entity_id::integer and f.game_id = v_set);
  return v_out || jsonb_build_object(
    'step', 2,
    'series', v_series,
    'series_label', v_label,
    'step1_guesses', v_first,
    'step2_guesses', v_n2,
    'step2_total', v_total,
    'step2_columns', (select jsonb_agg(jsonb_strip_nulls(jsonb_build_object('key', a.key, 'kind', a.kind, 'near', a.near, 'label', a.meta -> 'label', 'help', a.meta -> 'help')) order by a.position)
      from public.dle_attributes a where a.game_id = v_set)
  );
end $$;
  $o1l42f4$;

  -- The helpers are for the other functions of the engine (security definer), never for the browser.
  revoke all on function public.dle_otakudle_set_id(text), public.dle_set_attrs(text, text), public.dle_step2_cells(text, jsonb, jsonb) from public, anon, authenticated;
  grant execute on function public.dle_otakudle_set_id(text), public.dle_set_attrs(text, text), public.dle_step2_cells(text, jsonb, jsonb) to service_role;

  -- Step 1 asks the work columns only.
  delete from public.dle_attributes where game_id = 'otakudle' and key in ('gender', 'species', 'role');

  -- Self-check: the columns, the function, the grants, and every character of the pool (the ones the owner left out through dle_curation, like hisoka-morrow, excepted) has its values in the set of its series (a guess of the right anime always has its cells of step 2).
  if (select string_agg(key, ',' order by position) from public.dle_attributes where game_id = 'otakudle') is distinct from 'series,genres,year,studio' then raise exception 'L42: otakudle is not series, genres, year, studio'; end if;
  if (select prosrc from pg_proc where oid = to_regprocedure('public.dle_play_state(public.dle_plays)')) not like '%step2_columns%' then raise exception 'L42: dle_play_state is not the new one'; end if;
  if has_function_privilege('anon', 'public.dle_set_attrs(text, text)', 'execute') or has_function_privilege('authenticated', 'public.dle_step2_cells(text, jsonb, jsonb)', 'execute') then raise exception 'L42: a helper is open to the browser'; end if;
  if not has_function_privilege('anon', 'public.dle_day(text, text, date)', 'execute') or has_function_privilege('anon', 'public.dle_guess_at(timestamptz, text, date, text, text)', 'execute') then raise exception 'L42: the grants changed'; end if;
  if exists (select 1 from public.dle_src_anime_character v where not exists (select 1 from public.dle_curation k where k.game_id = 'otakudle' and k.entity_id = v.entity_id and k.excluded) and not exists (select 1 from public.character_game_facts f where f.character_id = v.entity_id::integer and f.game_id = public.dle_otakudle_set_id(v.balance_key))) then
    raise exception 'L42: a character of the Otakudle pool has no values in the set of its series (apply L42a, or generate it again)';
  end if;
  raise notice 'L42: Otakudle is in two steps';
end $o1l42$;
