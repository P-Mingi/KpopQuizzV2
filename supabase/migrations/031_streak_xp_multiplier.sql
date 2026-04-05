-- Add streak XP multiplier to record_bt_play
-- Streaks of 14+ days earn 1.2x XP, 30+ days earn 1.5x

CREATE OR REPLACE FUNCTION public.record_bt_play(
  p_player_id UUID,
  p_mode_id TEXT,
  p_score INTEGER,
  p_correct INTEGER,
  p_total INTEGER,
  p_total_time FLOAT,
  p_best_combo INTEGER,
  p_songs JSONB,
  p_xp_earned INTEGER,
  p_group_mastery_updates JSONB
) RETURNS VOID AS $$
DECLARE
  i INTEGER;
  gm JSONB;
  g_id INTEGER;
  g_xp INTEGER;
  s JSONB;
  s_id UUID;
  s_correct BOOLEAN;
  cur_streak INTEGER;
  streak_mult FLOAT;
  final_xp INTEGER;
BEGIN
  -- 1. Insert the play
  INSERT INTO public.bt_plays (player_id, mode_id, score, correct, total, total_time, best_combo, songs)
  VALUES (p_player_id, p_mode_id, p_score, p_correct, p_total, p_total_time, p_best_combo, p_songs);

  -- 2. Update player stats
  IF p_player_id IS NOT NULL THEN
    -- Calculate streak multiplier
    SELECT current_streak INTO cur_streak FROM public.players WHERE id = p_player_id;
    IF cur_streak >= 30 THEN streak_mult := 1.5;
    ELSIF cur_streak >= 14 THEN streak_mult := 1.2;
    ELSE streak_mult := 1.0;
    END IF;

    final_xp := ROUND(p_xp_earned * streak_mult);

    UPDATE public.players SET
      xp = xp + final_xp,
      total_songs_played = total_songs_played + p_total,
      total_songs_correct = total_songs_correct + p_correct,
      total_points = total_points + p_score,
      best_combo = GREATEST(best_combo, p_best_combo),
      last_played_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = p_player_id;

    -- 3. Recalculate player level
    UPDATE public.players SET
      level = public.calc_player_level(xp)
    WHERE id = p_player_id;

    -- 4. Update streak
    PERFORM public.update_player_streak(p_player_id);

    -- 5. Update group mastery
    IF p_group_mastery_updates IS NOT NULL AND jsonb_array_length(p_group_mastery_updates) > 0 THEN
      FOR i IN 0..jsonb_array_length(p_group_mastery_updates) - 1 LOOP
        gm := p_group_mastery_updates->i;
        g_id := (gm->>'group_id')::INTEGER;
        g_xp := (gm->>'mastery_xp')::INTEGER;

        INSERT INTO public.player_group_mastery (player_id, group_id, mastery_xp, songs_correct, songs_played)
        VALUES (p_player_id, g_id, g_xp, p_correct, p_total)
        ON CONFLICT (player_id, group_id)
        DO UPDATE SET
          mastery_xp = player_group_mastery.mastery_xp + g_xp,
          mastery_level = public.calc_mastery_level(player_group_mastery.mastery_xp + g_xp),
          songs_correct = player_group_mastery.songs_correct + EXCLUDED.songs_correct,
          songs_played = player_group_mastery.songs_played + EXCLUDED.songs_played,
          best_score = GREATEST(player_group_mastery.best_score, p_score),
          updated_at = NOW();
      END LOOP;
    END IF;
  END IF;

  -- 6. Update per-song stats
  IF jsonb_array_length(p_songs) > 0 THEN
    FOR i IN 0..jsonb_array_length(p_songs) - 1 LOOP
      s := p_songs->i;
      s_id := (s->>'song_id')::UUID;
      s_correct := (s->>'correct')::BOOLEAN;

      UPDATE public.blind_test_songs SET
        times_played = times_played + 1,
        times_correct = CASE WHEN s_correct THEN times_correct + 1 ELSE times_correct END,
        updated_at = NOW()
      WHERE id = s_id;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
