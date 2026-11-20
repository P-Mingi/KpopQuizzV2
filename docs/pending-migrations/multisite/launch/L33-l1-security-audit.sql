-- L33-l1-security-audit.sql (lane SECAUDIT, lot LAUNCH-PREP, integrator brief 2026-11-17; Supabase security advisors read 2026-11-17)
-- o1-transaction: single, ONE DO block, no temp table: safe to paste in the Supabase SQL Editor. Idempotent: a second run changes nothing.
--
-- What:   (1) public.record_play is bound to the real player: a caller acting as anon or authenticated can only pass p_player_id = its own
--             auth.uid() (a guest still passes null and is still recorded, as today); the service role and the SQL editor are not limited.
--             The score is range-checked (0 to 3 x total questions, the guess-from-clues maximum). The body is today's production body
--             (identical to 008-write-locks) plus the guard and SET search_path. public.plays_insert_all (with check true: anyone could insert a
--             play row for any player straight through the API, no code does) becomes plays_insert_own (player_id null or the caller).
--         (2) One like per user, count kept consistent: the count is now moved by a trigger on public.likes (AFTER INSERT / DELETE, one row per
--             user and quiz thanks to UNIQUE (user_id, quiz_id)), with the same bookkeeping as before (quizzes.like_count,
--             profiles.total_likes_received on kpop, the world counter likes_received elsewhere). increment_like_count and decrement_like_count
--             become no-ops and lose EXECUTE for PUBLIC, anon and authenticated (the old route called them after its own likes upsert: they would
--             double count; anon likes carried no user and could be repeated at will). No like_count is recomputed: today's numbers stay.
--         (3) The three views (entity_images_public, site_assets_public, favourite_character_counts) are NOT changed: see
--             docs/o1/reports/L1/SECURITY-AUDIT.md (security_invoker would return nothing or too little to anon, because the base tables have no
--             policy or an own-rows policy). Unchanged here on purpose.
--         (4) EXECUTE revoked from PUBLIC, anon and authenticated on every trigger function of schema public (handle_*, notify_*,
--             grant_*_badge, *_sync, passport_on_battle_result, gate_*, fn_*...). A trigger needs no EXECUTE for the role that fires it.
--         (5) SET search_path = public, pg_temp on the 30 functions the advisor flags as mutable (every table they name is in public; none uses
--             an extension function; auth.uid() is always written schema-qualified).
--         No XP, level, streak, badge or counter is recalculated.
-- Needs:  public.quizzes, plays, profiles, likes, groups, public.bump_world_counter and public.emit_activity (007, 008).
-- WHEN:   after a backup, outside a build and outside 23:50 to 00:30 UTC (the daily publish). Run it BEFORE the code of the same lot (the like
--         route stops calling the two like functions: without this file the count would not move).
-- Undo:   L33-l1-security-audit.rollback.sql (today's definitions and grants, verbatim from the production dump of 2026-11-17).
-- Not done here (owner dashboard, not SQL): leaked password protection (Auth settings), the two extensions in public (pg_trgm,
--         fuzzystrmatch: moving them changes every function that calls them), the anon/authenticated SECURITY DEFINER functions that the
--         product calls on purpose (see the report).
-- Verify (read-only, run after the apply):
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.prorettype = 'pg_catalog.trigger'::regtype and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));   expect 0
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('award_daily_capped_byeol', 'award_first_time_byeol', 'award_xp', 'calc_mastery_level', 'calc_player_level', 'check_byeol_eligibility', 'decrement_like_count', 'dev_award_byeol', 'dev_open_card_pack', 'dev_open_starter_pack', 'fn_trivia_touch', 'get_fandom_war_map', 'get_fandom_war_map_v12', 'get_quiz_rank', 'get_today_stats', 'get_weekly_leaderboard', 'handle_new_blindtest_player', 'handle_new_quiz', 'increment_game_play_count', 'increment_like_count', 'increment_tot_appear', 'increment_tot_category_plays', 'increment_tot_pick', 'merge_anon_passport', 'passport_on_battle_result', 'recalculate_difficulty', 'record_bt_play', 'record_game_play', 'record_play', 'update_player_streak') and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%');   expect 0
-- Verify: select position('L33 guard' in pg_get_functiondef('public.record_play(uuid, uuid, integer, integer, integer)'::regprocedure)) > 0;   expect true
-- Verify: select has_function_privilege('anon', 'public.record_play(uuid, uuid, integer, integer, integer)'::regprocedure, 'EXECUTE') and has_function_privilege('authenticated', 'public.record_play(uuid, uuid, integer, integer, integer)'::regprocedure, 'EXECUTE');   expect true
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename = 'plays' and cmd = 'INSERT' and with_check = 'true';   expect 0
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_own';   expect 1
-- Verify: select count(*) from pg_trigger where tgrelid = 'public.likes'::regclass and tgname = 'likes_count_sync_trg' and not tgisinternal;   expect 1
-- Verify: select has_function_privilege('anon', 'public.increment_like_count(uuid)'::regprocedure, 'EXECUTE') or has_function_privilege('authenticated', 'public.increment_like_count(uuid)'::regprocedure, 'EXECUTE') or has_function_privilege('anon', 'public.decrement_like_count(uuid)'::regprocedure, 'EXECUTE') or has_function_privilege('authenticated', 'public.decrement_like_count(uuid)'::regprocedure, 'EXECUTE');   expect false

do $op$
declare
  r record;
  v_names text[] := array[
      'award_daily_capped_byeol',
      'award_first_time_byeol',
      'award_xp',
      'calc_mastery_level',
      'calc_player_level',
      'check_byeol_eligibility',
      'decrement_like_count',
      'dev_award_byeol',
      'dev_open_card_pack',
      'dev_open_starter_pack',
      'fn_trivia_touch',
      'get_fandom_war_map',
      'get_fandom_war_map_v12',
      'get_quiz_rank',
      'get_today_stats',
      'get_weekly_leaderboard',
      'handle_new_blindtest_player',
      'handle_new_quiz',
      'increment_game_play_count',
      'increment_like_count',
      'increment_tot_appear',
      'increment_tot_category_plays',
      'increment_tot_pick',
      'merge_anon_passport',
      'passport_on_battle_result',
      'recalculate_difficulty',
      'record_bt_play',
      'record_game_play',
      'record_play',
      'update_player_streak'];
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.quizzes') is null or to_regclass('public.plays') is null or to_regclass('public.profiles') is null
     or to_regclass('public.likes') is null or to_regclass('public.groups') is null
     or to_regprocedure('public.bump_world_counter(uuid, text, text, integer)') is null
     or to_regprocedure('public.emit_activity(text, uuid, text, jsonb)') is null then
    raise exception 'L33: quizzes, plays, profiles, likes, groups, bump_world_counter and emit_activity must exist';
  end if;

  -- (1) record_play bound to the real player (only when the guard is not in it yet)
  if to_regprocedure('public.record_play(uuid, uuid, integer, integer, integer)') is null then
    raise exception 'L33: public.record_play is missing';
  end if;
  if position('L33 guard' in pg_get_functiondef('public.record_play(uuid, uuid, integer, integer, integer)'::regprocedure)) = 0 then
    execute $rp_ddl$CREATE OR REPLACE FUNCTION public.record_play(p_quiz_id uuid, p_player_id uuid, p_score integer, p_total_questions integer, p_time_taken_seconds integer)
 RETURNS TABLE(play_id uuid, percentile integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO public, pg_temp
AS $rp$
DECLARE
  v_site TEXT;
  new_play_id UUID;
  total_plays_count INTEGER;
  worse_plays_count INTEGER;
  pct INTEGER;
  quiz_creator UUID;
  quiz_group INTEGER;
  v_group_slug TEXT;
  v_sp INTEGER;
  v_sc INTEGER;
  v_mastered BOOLEAN;
BEGIN
  -- L33 guard: a signed-in caller can only record a play for itself; anon and authenticated cannot name another player.
  -- A guest passes p_player_id null (the play is recorded without a player). The service role and the SQL editor are not limited.
  IF p_player_id IS NOT NULL
     AND coalesce(nullif(current_setting('role', true), ''), 'none') IN ('anon', 'authenticated')
     AND p_player_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'record_play: the player must be the signed-in user' USING ERRCODE = '42501';
  END IF;
  IF p_score IS NULL OR p_total_questions IS NULL OR p_score < 0 OR p_total_questions < 0
     OR p_score > p_total_questions * 3 OR p_time_taken_seconds < 0 THEN
    RAISE EXCEPTION 'record_play: score out of range' USING ERRCODE = '22023';
  END IF;
  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = p_quiz_id;
  IF v_site IS NULL OR v_site = 'kpop' THEN
  INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
  VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
  RETURNING id INTO new_play_id;

  UPDATE public.quizzes
  SET play_count = play_count + 1, total_score_sum = total_score_sum + p_score,
      total_completions = total_completions + 1, updated_at = NOW()
  WHERE id = p_quiz_id
  RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

  UPDATE public.groups SET total_plays = total_plays + 1 WHERE id = quiz_group;
  SELECT slug INTO v_group_slug FROM public.groups WHERE id = quiz_group;

  UPDATE public.profiles
  SET total_plays_received = total_plays_received + 1, updated_at = NOW()
  WHERE id = quiz_creator;

  IF p_player_id IS NOT NULL THEN
    SELECT COUNT(*) INTO total_plays_count
    FROM public.plays WHERE quiz_id = p_quiz_id AND player_id = p_player_id;

    IF total_plays_count = 1 THEN
      UPDATE public.profiles SET quizzes_played = quizzes_played + 1, updated_at = NOW() WHERE id = p_player_id;
      BEGIN
        INSERT INTO public.player_group_mastery (player_id, group_id, songs_played, songs_correct)
        VALUES (p_player_id, quiz_group, p_total_questions, LEAST(GREATEST(p_score, 0), p_total_questions))
        ON CONFLICT (player_id, group_id) DO UPDATE SET
          songs_played  = player_group_mastery.songs_played  + EXCLUDED.songs_played,
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          updated_at = NOW();

        -- group_mastered emit-once latch (quiz side).
        SELECT songs_played, songs_correct, mastered INTO v_sp, v_sc, v_mastered
        FROM public.player_group_mastery WHERE player_id = p_player_id AND group_id = quiz_group;
        IF NOT v_mastered AND v_sp >= 30 AND v_sc::numeric / NULLIF(v_sp, 0) >= 0.80 THEN
          UPDATE public.player_group_mastery SET mastered = true WHERE player_id = p_player_id AND group_id = quiz_group;
          PERFORM public.emit_activity('group_mastered', p_player_id, v_group_slug, jsonb_build_object('group_id', quiz_group));
        END IF;
      EXCEPTION WHEN foreign_key_violation THEN
        NULL;
      END;
    END IF;
  END IF;

  -- One activity event per completion (authed name or 'someone').
  IF p_total_questions > 0 AND p_score >= p_total_questions THEN
    PERFORM public.emit_activity('perfect_score', p_player_id, v_group_slug, jsonb_build_object('score', p_score, 'total', p_total_questions));
  ELSE
    PERFORM public.emit_activity('quiz_completed', p_player_id, v_group_slug, jsonb_build_object('score', p_score, 'total', p_total_questions));
  END IF;

  SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO worse_plays_count FROM public.plays WHERE quiz_id = p_quiz_id AND score < p_score;
  IF total_plays_count > 0 THEN pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
  ELSE pct := 50; END IF;

  RETURN QUERY SELECT new_play_id, pct;
  ELSE
    INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
    VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
    RETURNING id INTO new_play_id;

    UPDATE public.quizzes
    SET play_count = play_count + 1, total_score_sum = total_score_sum + p_score,
        total_completions = total_completions + 1, updated_at = NOW()
    WHERE id = p_quiz_id
    RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

    UPDATE public.groups SET total_plays = total_plays + 1 WHERE id = quiz_group;
    SELECT slug INTO v_group_slug FROM public.groups WHERE id = quiz_group;

    -- world counters through 007: profiles (kpop) is never written for a non-kpop quiz
    IF quiz_creator IS NOT NULL THEN
      PERFORM public.bump_world_counter(quiz_creator, v_site, 'plays_received', 1);
    END IF;

    IF p_player_id IS NOT NULL THEN
      SELECT COUNT(*) INTO total_plays_count
      FROM public.plays WHERE quiz_id = p_quiz_id AND player_id = p_player_id;

      IF total_plays_count = 1 THEN
        PERFORM public.bump_world_counter(p_player_id, v_site, 'quizzes_played', 1);
      END IF;
    END IF;

    -- one activity event per completion, on this world
    INSERT INTO public.activity_events (event_type, user_id, display_name, group_slug, payload, site_id)
    VALUES (CASE WHEN p_total_questions > 0 AND p_score >= p_total_questions THEN 'perfect_score' ELSE 'quiz_completed' END, p_player_id,
            COALESCE((SELECT username FROM public.profiles WHERE id = p_player_id AND banned_at IS NULL), 'someone'),
            v_group_slug, jsonb_build_object('score', p_score, 'total', p_total_questions), v_site);

    SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
    SELECT COUNT(*) INTO worse_plays_count FROM public.plays WHERE quiz_id = p_quiz_id AND score < p_score;
    IF total_plays_count > 0 THEN pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
    ELSE pct := 50; END IF;

    RETURN QUERY SELECT new_play_id, pct;
  END IF;
END;
$rp$$rp_ddl$;
  end if;
  execute 'revoke execute on function public.record_play(uuid, uuid, integer, integer, integer) from public';
  execute 'grant execute on function public.record_play(uuid, uuid, integer, integer, integer) to anon, authenticated, service_role';

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_all') then
    drop policy plays_insert_all on public.plays;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_own') then
    create policy plays_insert_own on public.plays for insert to public
      with check (player_id is null or player_id = auth.uid());
  end if;

  -- (2) one like per user: the trigger moves the count, the two old functions do nothing and are closed
  create or replace function public.likes_count_sync() returns trigger
    language plpgsql security definer set search_path to public, pg_temp
  as $lk$
  declare
    v_quiz uuid;
    v_delta integer;
    v_site text;
    v_creator uuid;
  begin
    if tg_op = 'INSERT' then
      v_quiz := new.quiz_id; v_delta := 1;
    else
      v_quiz := old.quiz_id; v_delta := -1;
    end if;
    select q.site_id into v_site from public.quizzes q where q.id = v_quiz;
    if not found then
      return null;
    end if;
    update public.quizzes set like_count = greatest(like_count + v_delta, 0) where id = v_quiz
      returning creator_id into v_creator;
    if v_creator is not null then
      if v_site is null or v_site = 'kpop' then
        update public.profiles set total_likes_received = greatest(total_likes_received + v_delta, 0) where id = v_creator;
      else
        perform public.bump_world_counter(v_creator, v_site, 'likes_received', v_delta);
      end if;
    end if;
    return null;
  end;
  $lk$;

  if not exists (select 1 from pg_trigger where tgrelid = 'public.likes'::regclass and tgname = 'likes_count_sync_trg' and not tgisinternal) then
    create trigger likes_count_sync_trg after insert or delete on public.likes
      for each row execute function public.likes_count_sync();
  end if;

  create or replace function public.increment_like_count(quiz_uuid uuid) returns void
    language plpgsql security definer set search_path to public, pg_temp
  as $inc$
  begin
    -- L33: the count is moved by trigger likes_count_sync_trg on public.likes (one like per user). Nothing to do here.
    return;
  end;
  $inc$;
  create or replace function public.decrement_like_count(quiz_uuid uuid) returns void
    language plpgsql security definer set search_path to public, pg_temp
  as $dec$
  begin
    -- L33: the count is moved by trigger likes_count_sync_trg on public.likes (one like per user). Nothing to do here.
    return;
  end;
  $dec$;
  revoke execute on function public.increment_like_count(uuid) from public, anon, authenticated;
  revoke execute on function public.decrement_like_count(uuid) from public, anon, authenticated;
  grant execute on function public.increment_like_count(uuid), public.decrement_like_count(uuid) to service_role;

  -- (4) trigger functions are not RPC: no EXECUTE for PUBLIC, anon, authenticated (the role that fires a trigger needs none)
  for r in
    select p.oid::regprocedure as sig from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;

  -- (5) a fixed search_path on the functions the advisor flags (only those that do not have one yet)
  for r in
    select p.oid::regprocedure as sig from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names)
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, pg_temp', r.sig);
  end loop;

  if position('L33 guard' in pg_get_functiondef('public.record_play(uuid, uuid, integer, integer, integer)'::regprocedure)) = 0
     or not exists (select 1 from pg_trigger where tgrelid = 'public.likes'::regclass and tgname = 'likes_count_sync_trg' and not tgisinternal)
     or exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_all') then
    raise exception 'L33: self-check failed';
  end if;
end $op$;
