-- Blindtest Redesign: RPCs for rank, XP, daily generation
-- Target: blindtest Supabase project

-- ===========================================
-- 1. Update player rank from XP
-- ===========================================

CREATE OR REPLACE FUNCTION public.update_player_rank(p_player_id UUID)
RETURNS TABLE(new_rank TEXT, new_rank_level INTEGER, ranked_up BOOLEAN)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_xp INTEGER;
  v_old_rank INTEGER;
  v_new_rank INTEGER;
  v_new_title TEXT;
BEGIN
  SELECT total_xp, rank_level INTO v_xp, v_old_rank
  FROM bt_players WHERE id = p_player_id;

  v_new_rank := CASE
    WHEN v_xp >= 25000 THEN 7
    WHEN v_xp >= 12000 THEN 6
    WHEN v_xp >= 6000 THEN 5
    WHEN v_xp >= 3000 THEN 4
    WHEN v_xp >= 1500 THEN 3
    WHEN v_xp >= 500 THEN 2
    ELSE 1
  END;

  v_new_title := CASE v_new_rank
    WHEN 7 THEN 'legend'
    WHEN 6 THEN 'superstar'
    WHEN 5 THEN 'star'
    WHEN 4 THEN 'idol'
    WHEN 3 THEN 'debut'
    WHEN 2 THEN 'rookie'
    ELSE 'trainee'
  END;

  UPDATE bt_players
  SET rank_title = v_new_title, rank_level = v_new_rank
  WHERE id = p_player_id;

  RETURN QUERY SELECT v_new_title, v_new_rank, (v_new_rank > v_old_rank);
END;
$$;

-- ===========================================
-- 2. Award XP with streak bonus
-- ===========================================

CREATE OR REPLACE FUNCTION public.award_bt_xp(
  p_player_id UUID,
  p_base_xp INTEGER
)
RETURNS TABLE(xp_earned INTEGER, streak_bonus REAL, new_total INTEGER, ranked_up BOOLEAN, new_rank TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_streak INTEGER;
  v_bonus REAL;
  v_final_xp INTEGER;
  v_new_total INTEGER;
  v_rank_result RECORD;
BEGIN
  SELECT current_streak INTO v_streak FROM bt_players WHERE id = p_player_id;

  -- Streak bonus: +10% per day, capped at +50%
  v_bonus := LEAST(COALESCE(v_streak, 0) * 0.10, 0.50);
  v_final_xp := ROUND(p_base_xp * (1.0 + v_bonus));

  UPDATE bt_players
  SET total_xp = total_xp + v_final_xp
  WHERE id = p_player_id
  RETURNING total_xp INTO v_new_total;

  SELECT * INTO v_rank_result FROM update_player_rank(p_player_id);

  RETURN QUERY SELECT v_final_xp, v_bonus, v_new_total, v_rank_result.ranked_up, v_rank_result.new_rank;
END;
$$;

-- ===========================================
-- 3. Generate daily challenges (365 days)
-- ===========================================

CREATE OR REPLACE FUNCTION public.generate_daily_challenges(p_start_date DATE, p_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_date DATE;
  v_day INTEGER;
  v_count INTEGER := 0;
  v_easy_ids UUID[];
  v_medium_ids UUID[];
  v_hard_ids UUID[];
  v_song_ids UUID[];
  v_recent_ids UUID[] := '{}';
BEGIN
  FOR v_day IN 0..(p_days - 1) LOOP
    v_date := p_start_date + v_day;

    IF EXISTS (SELECT 1 FROM daily_challenges WHERE date = v_date) THEN
      CONTINUE;
    END IF;

    -- Pick 5 easy (famous title tracks) not used recently
    SELECT ARRAY_AGG(id ORDER BY random()) INTO v_easy_ids
    FROM (
      SELECT id FROM songs
      WHERE difficulty = 'easy' AND status = 'active' AND is_title_track = true
        AND id != ALL(v_recent_ids)
      ORDER BY random() LIMIT 5
    ) sub;

    -- Pick 3 medium songs
    SELECT ARRAY_AGG(id ORDER BY random()) INTO v_medium_ids
    FROM (
      SELECT id FROM songs
      WHERE difficulty = 'medium' AND status = 'active'
        AND id != ALL(v_recent_ids) AND id != ALL(COALESCE(v_easy_ids, '{}'))
      ORDER BY random() LIMIT 3
    ) sub;

    -- Pick 2 hard (deep cut) songs
    SELECT ARRAY_AGG(id ORDER BY random()) INTO v_hard_ids
    FROM (
      SELECT id FROM songs
      WHERE difficulty = 'hard' AND status = 'active'
        AND id != ALL(v_recent_ids)
        AND id != ALL(COALESCE(v_easy_ids, '{}'))
        AND id != ALL(COALESCE(v_medium_ids, '{}'))
      ORDER BY random() LIMIT 2
    ) sub;

    v_song_ids := COALESCE(v_easy_ids, '{}') || COALESCE(v_medium_ids, '{}') || COALESCE(v_hard_ids, '{}');

    -- Skip if we could not fill 10 songs
    IF array_length(v_song_ids, 1) IS NULL OR array_length(v_song_ids, 1) < 10 THEN
      CONTINUE;
    END IF;

    -- Shuffle
    SELECT ARRAY_AGG(id ORDER BY random()) INTO v_song_ids
    FROM unnest(v_song_ids) AS id;

    INSERT INTO daily_challenges (date, song_ids, difficulty_distribution, day_number)
    VALUES (v_date, v_song_ids, '{"easy": 5, "medium": 3, "hard": 2}', v_day + 1);

    -- Track recent songs (last 7 days = ~70 songs)
    v_recent_ids := v_recent_ids || v_song_ids;
    IF array_length(v_recent_ids, 1) > 70 THEN
      v_recent_ids := v_recent_ids[array_length(v_recent_ids, 1) - 69 : array_length(v_recent_ids, 1)];
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
