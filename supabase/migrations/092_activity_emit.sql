-- 092 - Fold activity emits into the EXISTING M0.2 deposit points (Workstream M,
-- M1.7). One hook, two outputs: each deposit already running keeps its passport
-- write and adds exactly one emit_activity insert. No second pipeline, no
-- duplicated trigger logic. group_mastered uses the player_group_mastery.mastered
-- column as a write-time emit-once latch (false -> true transition only).
--
-- NOTE: the 30 plays / 0.80 accuracy mastery bar is duplicated from the TS
-- MASTERY constant (lib/passport.ts). Keep the two in sync.

-- ============================================================================
-- record_play: quiz_completed / perfect_score, plus group_mastered (quiz side).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_play(
  p_quiz_id UUID,
  p_player_id UUID,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_time_taken_seconds INTEGER
)
RETURNS TABLE(play_id UUID, percentile INTEGER) AS $$
DECLARE
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- record_bt_play: blindtest_played, plus group_mastered (blindtest side).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_bt_play(
  p_player_id UUID, p_mode_id TEXT, p_score INTEGER, p_correct INTEGER, p_total INTEGER,
  p_total_time FLOAT, p_best_combo INTEGER, p_songs JSONB, p_xp_earned INTEGER, p_group_mastery_updates JSONB
) RETURNS VOID AS $$
DECLARE
  i INTEGER; gm JSONB; g_id INTEGER; g_xp INTEGER; s JSONB; s_id UUID; s_correct BOOLEAN;
  v_sp INTEGER; v_sc INTEGER; v_mastered BOOLEAN; v_slug TEXT;
BEGIN
  INSERT INTO public.bt_plays (player_id, mode_id, score, correct, total, total_time, best_combo, songs)
  VALUES (p_player_id, p_mode_id, p_score, p_correct, p_total, p_total_time, p_best_combo, p_songs);

  IF p_player_id IS NOT NULL THEN
    UPDATE public.players SET
      xp = xp + p_xp_earned, total_songs_played = total_songs_played + p_total,
      total_songs_correct = total_songs_correct + p_correct, total_points = total_points + p_score,
      best_combo = GREATEST(best_combo, p_best_combo), last_played_date = CURRENT_DATE, updated_at = NOW()
    WHERE id = p_player_id;
    UPDATE public.players SET level = public.calc_player_level(xp) WHERE id = p_player_id;
    PERFORM public.update_player_streak(p_player_id);

    UPDATE public.profiles SET blindtests_played = blindtests_played + 1, updated_at = NOW() WHERE id = p_player_id;
    PERFORM public.emit_activity('blindtest_played', p_player_id, NULL, jsonb_build_object('correct', p_correct, 'total', p_total));

    IF p_group_mastery_updates IS NOT NULL AND jsonb_array_length(p_group_mastery_updates) > 0 THEN
      FOR i IN 0..jsonb_array_length(p_group_mastery_updates) - 1 LOOP
        gm := p_group_mastery_updates->i;
        g_id := (gm->>'group_id')::INTEGER;
        g_xp := (gm->>'mastery_xp')::INTEGER;

        INSERT INTO public.player_group_mastery (player_id, group_id, mastery_xp, songs_correct, songs_played)
        VALUES (p_player_id, g_id, g_xp, p_correct, p_total)
        ON CONFLICT (player_id, group_id) DO UPDATE SET
          mastery_xp = player_group_mastery.mastery_xp + g_xp,
          mastery_level = public.calc_mastery_level(player_group_mastery.mastery_xp + g_xp),
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          songs_played = player_group_mastery.songs_played + EXCLUDED.songs_played,
          best_score = GREATEST(player_group_mastery.best_score, p_score), updated_at = NOW();

        SELECT songs_played, songs_correct, mastered INTO v_sp, v_sc, v_mastered
        FROM public.player_group_mastery WHERE player_id = p_player_id AND group_id = g_id;
        IF NOT v_mastered AND v_sp >= 30 AND v_sc::numeric / NULLIF(v_sp, 0) >= 0.80 THEN
          UPDATE public.player_group_mastery SET mastered = true WHERE player_id = p_player_id AND group_id = g_id;
          SELECT slug INTO v_slug FROM public.groups WHERE id = g_id;
          PERFORM public.emit_activity('group_mastered', p_player_id, v_slug, jsonb_build_object('group_id', g_id));
        END IF;
      END LOOP;
    END IF;
  END IF;

  IF jsonb_array_length(p_songs) > 0 THEN
    FOR i IN 0..jsonb_array_length(p_songs) - 1 LOOP
      s := p_songs->i; s_id := (s->>'song_id')::UUID; s_correct := (s->>'correct')::BOOLEAN;
      UPDATE public.blind_test_songs SET
        times_played = times_played + 1,
        times_correct = CASE WHEN s_correct THEN times_correct + 1 ELSE times_correct END, updated_at = NOW()
      WHERE id = s_id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- cast_duel_vote: duel_voted (authed voters only; anon votes are high-volume
-- and nameless, so they are not streamed).
-- ============================================================================
create or replace function public.cast_duel_vote(
  p_question_id uuid, p_option_a_id uuid, p_option_b_id uuid, p_winner_id uuid, p_voter_hash text default null
)
returns table (entity_id uuid, elo numeric, last_delta int)
language plpgsql security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_loser_id uuid; v_elo_w numeric; v_elo_l numeric; v_expected_w numeric; v_delta int; v_gslug text;
begin
  if p_winner_id <> p_option_a_id and p_winner_id <> p_option_b_id then
    raise exception 'winner_id % is not one of option_a_id % / option_b_id %', p_winner_id, p_option_a_id, p_option_b_id;
  end if;

  if p_voter_hash is not null and exists (
    select 1 from public.duel_votes
    where question_id = p_question_id and voter_hash = p_voter_hash
      and option_a_id = p_option_a_id and option_b_id = p_option_b_id
      and created_at > now() - interval '10 seconds'
  ) then
    return query select dr.entity_id, dr.elo, dr.last_delta from public.duel_ratings dr
      where dr.question_id = p_question_id and dr.entity_id in (p_option_a_id, p_option_b_id);
    return;
  end if;

  insert into public.duel_votes (question_id, option_a_id, option_b_id, winner_id, voter_hash)
  values (p_question_id, p_option_a_id, p_option_b_id, p_winner_id, p_voter_hash);

  if auth.uid() is not null then
    update public.profiles set duels_voted = duels_voted + 1, updated_at = now() where id = auth.uid();
    select group_slug into v_gslug from public.duel_questions where id = p_question_id;
    perform public.emit_activity('duel_voted', auth.uid(), v_gslug, '{}'::jsonb);
  end if;

  v_loser_id := case when p_winner_id = p_option_a_id then p_option_b_id else p_option_a_id end;
  select dr.elo into v_elo_w from public.duel_ratings dr where dr.question_id = p_question_id and dr.entity_id = p_winner_id for update;
  select dr.elo into v_elo_l from public.duel_ratings dr where dr.question_id = p_question_id and dr.entity_id = v_loser_id for update;
  if v_elo_w is null or v_elo_l is null then
    raise exception 'duel_ratings missing for question % (winner % / loser %)', p_question_id, p_winner_id, v_loser_id;
  end if;

  v_expected_w := 1.0 / (1.0 + power(10.0, (v_elo_l - v_elo_w) / 400.0));
  v_delta := round(24 * (1 - v_expected_w));
  update public.duel_ratings set elo = elo + v_delta, wins = wins + 1, last_delta = v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = p_winner_id;
  update public.duel_ratings set elo = elo - v_delta, losses = losses + 1, last_delta = -v_delta, updated_at = now()
    where question_id = p_question_id and entity_id = v_loser_id;

  return query select dr.entity_id, dr.elo, dr.last_delta from public.duel_ratings dr
    where dr.question_id = p_question_id and dr.entity_id in (p_winner_id, v_loser_id);
end;
$$;

-- ============================================================================
-- passport_on_battle_result: battle_won (winner only).
-- ============================================================================
CREATE OR REPLACE FUNCTION public.passport_on_battle_result()
RETURNS TRIGGER AS $$
DECLARE
  v_challenger_hash text; v_challenger_score int; v_won boolean;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  SELECT challenger_hash, challenger_score INTO v_challenger_hash, v_challenger_score
    FROM public.battles WHERE id = NEW.battle_id;
  v_won := (NEW.player_hash IS DISTINCT FROM v_challenger_hash) AND v_challenger_score IS NOT NULL AND NEW.score > v_challenger_score;

  UPDATE public.profiles
     SET battles_played = battles_played + 1,
         battles_won = battles_won + CASE WHEN v_won THEN 1 ELSE 0 END, updated_at = NOW()
   WHERE id = NEW.user_id;

  IF v_won THEN
    PERFORM public.emit_activity('battle_won', NEW.user_id, NULL, jsonb_build_object('score', NEW.score));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- handle_new_quiz: quiz_created.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_quiz()
RETURNS TRIGGER AS $$
DECLARE
  v_slug TEXT;
BEGIN
  UPDATE public.profiles SET total_quizzes_created = total_quizzes_created + 1, updated_at = NOW() WHERE id = NEW.creator_id;
  UPDATE public.groups SET quiz_count = quiz_count + 1 WHERE id = NEW.group_id;
  SELECT slug INTO v_slug FROM public.groups WHERE id = NEW.group_id;
  PERFORM public.emit_activity('quiz_created', NEW.creator_id, v_slug, jsonb_build_object('title', NEW.title));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
