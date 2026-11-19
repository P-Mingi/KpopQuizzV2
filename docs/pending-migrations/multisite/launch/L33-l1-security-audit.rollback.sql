-- L33-l1-security-audit.rollback.sql: undoes L33-l1-security-audit.sql (today's definitions and grants of the production dump of 2026-11-17).
-- o1-transaction: single, ONE DO block, no temp table. Idempotent.
-- Undoing point (4) gives EXECUTE on the trigger functions back to PUBLIC, anon and authenticated (as they were); point (5) removes the
-- fixed search_path of the 30 functions again. The like counts that the trigger moved while L33 was in place stay as they are.
-- Verify (read-only, run after the rollback):
-- Verify: select position('L33 guard' in pg_get_functiondef('public.record_play(uuid, uuid, integer, integer, integer)'::regprocedure)) = 0;   expect true
-- Verify: select count(*) from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_all' and with_check = 'true';   expect 1
-- Verify: select count(*) from pg_trigger where tgrelid = 'public.likes'::regclass and tgname = 'likes_count_sync_trg';   expect 0
-- Verify: select has_function_privilege('anon', 'public.increment_like_count(uuid)'::regprocedure, 'EXECUTE') and has_function_privilege('authenticated', 'public.decrement_like_count(uuid)'::regprocedure, 'EXECUTE');   expect true
-- Verify: select count(*) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('award_daily_capped_byeol', 'award_first_time_byeol', 'award_xp', 'calc_mastery_level', 'calc_player_level', 'check_byeol_eligibility', 'decrement_like_count', 'dev_award_byeol', 'dev_open_card_pack', 'dev_open_starter_pack', 'fn_trivia_touch', 'get_fandom_war_map', 'get_fandom_war_map_v12', 'get_quiz_rank', 'get_today_stats', 'get_weekly_leaderboard', 'handle_new_blindtest_player', 'handle_new_quiz', 'increment_game_play_count', 'increment_like_count', 'increment_tot_appear', 'increment_tot_category_plays', 'increment_tot_pick', 'merge_anon_passport', 'passport_on_battle_result', 'recalculate_difficulty', 'record_bt_play', 'record_game_play', 'record_play', 'update_player_streak') and exists (select 1 from unnest(coalesce(p.proconfig, '{}'::text[])) c where c like 'search_path=%');   expect 0

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

  if to_regclass('public.likes') is null or to_regclass('public.plays') is null then
    raise exception 'L33 rollback: likes and plays must exist';
  end if;

  drop trigger if exists likes_count_sync_trg on public.likes;
  drop function if exists public.likes_count_sync();

  execute $rp_ddl$CREATE OR REPLACE FUNCTION public.record_play(p_quiz_id uuid, p_player_id uuid, p_score integer, p_total_questions integer, p_time_taken_seconds integer)
 RETURNS TABLE(play_id uuid, percentile integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
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
  execute $inc_ddl$CREATE OR REPLACE FUNCTION public.increment_like_count(quiz_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $inc$
DECLARE
  v_site TEXT;
  creator UUID;
BEGIN
  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = quiz_uuid;
  IF v_site IS NULL OR v_site = 'kpop' THEN
  UPDATE public.quizzes SET like_count = like_count + 1 WHERE id = quiz_uuid
  RETURNING creator_id INTO creator;
  UPDATE public.profiles SET total_likes_received = total_likes_received + 1 WHERE id = creator;
  ELSE
    UPDATE public.quizzes SET like_count = like_count + 1 WHERE id = quiz_uuid
    RETURNING creator_id INTO creator;
    PERFORM public.bump_world_counter(creator, v_site, 'likes_received', 1);
  END IF;
END;
$inc$$inc_ddl$;
  execute $dec_ddl$CREATE OR REPLACE FUNCTION public.decrement_like_count(quiz_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $dec$
DECLARE
  v_site TEXT;
  creator UUID;
BEGIN
  SELECT q.site_id INTO v_site FROM public.quizzes q WHERE q.id = quiz_uuid;
  IF v_site IS NULL OR v_site = 'kpop' THEN
  UPDATE public.quizzes SET like_count = GREATEST(like_count - 1, 0) WHERE id = quiz_uuid
  RETURNING creator_id INTO creator;
  UPDATE public.profiles SET total_likes_received = GREATEST(total_likes_received - 1, 0) WHERE id = creator;
  ELSE
    UPDATE public.quizzes SET like_count = GREATEST(like_count - 1, 0) WHERE id = quiz_uuid
    RETURNING creator_id INTO creator;
    PERFORM public.bump_world_counter(creator, v_site, 'likes_received', -1);
  END IF;
END;
$dec$$dec_ddl$;
  grant execute on function public.increment_like_count(uuid) to public, anon, authenticated;
  grant execute on function public.decrement_like_count(uuid) to public, anon, authenticated;
  grant execute on function public.record_play(uuid, uuid, integer, integer, integer) to public, anon, authenticated;

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_own') then
    drop policy plays_insert_own on public.plays;
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'plays' and policyname = 'plays_insert_all') then
    create policy plays_insert_all on public.plays for insert to public with check (true);
  end if;

  for r in
    select p.oid::regprocedure as sig from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.prorettype = 'pg_catalog.trigger'::regtype
  loop
    execute format('grant execute on function %s to public, anon, authenticated', r.sig);
  end loop;

  for r in
    select p.oid::regprocedure as sig from pg_proc p
     where p.pronamespace = 'public'::regnamespace and p.proname = any (v_names)
  loop
    execute format('alter function %s reset search_path', r.sig);
  end loop;
end $op$;
