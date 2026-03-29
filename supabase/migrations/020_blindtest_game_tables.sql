-- ============================================
-- Prompt 02: Blind Test Game Tables
-- Creates: players, player_group_mastery, bt_plays,
--          player_achievements, daily_challenges, daily_challenge_plays
-- Functions: calc_player_level, calc_mastery_level, update_player_streak, record_bt_play
-- ============================================

-- ============================================
-- Table 1: players (game-specific profile, separate from kpopquiz profiles)
-- ============================================

CREATE TABLE public.players (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  avatar_bg TEXT NOT NULL DEFAULT '#ED93B1',
  avatar_text TEXT NOT NULL DEFAULT '#0D0D0F',

  -- Global stats
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  total_songs_played INTEGER NOT NULL DEFAULT 0,
  total_songs_correct INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,

  -- Streak
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,

  -- Liked songs
  liked_song_ids UUID[] NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "players_select_all" ON public.players FOR SELECT USING (true);
CREATE POLICY "players_insert_own" ON public.players FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "players_update_own" ON public.players FOR UPDATE USING (auth.uid() = id);

CREATE INDEX idx_players_username ON public.players(username);
CREATE INDEX idx_players_xp ON public.players(xp DESC);
CREATE INDEX idx_players_level ON public.players(level DESC);
CREATE INDEX idx_players_total_points ON public.players(total_points DESC);

-- ============================================
-- Auto-create player on signup
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_blindtest_player()
RETURNS TRIGGER AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  base_username := COALESCE(
    NEW.raw_user_meta_data->>'preferred_username',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1)
  );

  -- Try the base username first
  final_username := base_username;

  -- If it already exists, append random digits
  WHILE EXISTS (SELECT 1 FROM public.players WHERE username = final_username) LOOP
    final_username := base_username || floor(random() * 9000 + 1000)::TEXT;
  END LOOP;

  INSERT INTO public.players (id, username)
  VALUES (NEW.id, final_username)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_blindtest
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_blindtest_player();

-- ============================================
-- Table 2: player_group_mastery
-- Note: groups.id is INTEGER (SERIAL), not UUID
-- ============================================

CREATE TABLE public.player_group_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  mastery_level INTEGER NOT NULL DEFAULT 1,
  mastery_xp INTEGER NOT NULL DEFAULT 0,
  songs_correct INTEGER NOT NULL DEFAULT 0,
  songs_played INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, group_id)
);

ALTER TABLE public.player_group_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mastery_select_all" ON public.player_group_mastery FOR SELECT USING (true);
CREATE POLICY "mastery_insert_own" ON public.player_group_mastery FOR INSERT WITH CHECK (auth.uid() = player_id);
CREATE POLICY "mastery_update_own" ON public.player_group_mastery FOR UPDATE USING (auth.uid() = player_id);

CREATE INDEX idx_mastery_player ON public.player_group_mastery(player_id);
CREATE INDEX idx_mastery_group ON public.player_group_mastery(group_id);
CREATE INDEX idx_mastery_level ON public.player_group_mastery(mastery_level DESC);

-- ============================================
-- Table 3: bt_plays (every game played)
-- ============================================

CREATE TABLE public.bt_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  mode_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  total INTEGER NOT NULL,
  total_time FLOAT NOT NULL,
  best_combo INTEGER NOT NULL DEFAULT 0,
  songs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bt_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "plays_select_all" ON public.bt_plays FOR SELECT USING (true);
CREATE POLICY "plays_insert_all" ON public.bt_plays FOR INSERT WITH CHECK (true);

CREATE INDEX idx_bt_plays_player ON public.bt_plays(player_id);
CREATE INDEX idx_bt_plays_mode ON public.bt_plays(mode_id);
CREATE INDEX idx_bt_plays_score ON public.bt_plays(score DESC);
CREATE INDEX idx_bt_plays_created ON public.bt_plays(created_at DESC);

-- ============================================
-- Table 4: player_achievements
-- ============================================

CREATE TABLE public.player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, achievement_id)
);

ALTER TABLE public.player_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements_select_all" ON public.player_achievements FOR SELECT USING (true);
CREATE POLICY "achievements_insert_own" ON public.player_achievements FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE INDEX idx_achievements_player ON public.player_achievements(player_id);

-- ============================================
-- Table 5: daily_challenges
-- ============================================

CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  song_ids UUID[] NOT NULL,
  clip_point TEXT NOT NULL DEFAULT 'chorus',
  clip_duration INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_select_all" ON public.daily_challenges FOR SELECT USING (true);

CREATE INDEX idx_daily_date ON public.daily_challenges(date DESC);

-- ============================================
-- Table 6: daily_challenge_plays
-- ============================================

CREATE TABLE public.daily_challenge_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  correct INTEGER NOT NULL,
  total_time FLOAT NOT NULL,
  songs JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, challenge_id)
);

ALTER TABLE public.daily_challenge_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dcp_select_all" ON public.daily_challenge_plays FOR SELECT USING (true);
CREATE POLICY "dcp_insert_own" ON public.daily_challenge_plays FOR INSERT WITH CHECK (auth.uid() = player_id);

CREATE INDEX idx_dcp_player ON public.daily_challenge_plays(player_id);
CREATE INDEX idx_dcp_challenge ON public.daily_challenge_plays(challenge_id);
CREATE INDEX idx_dcp_score ON public.daily_challenge_plays(score DESC);

-- ============================================
-- Function: calc_player_level
-- ============================================

CREATE OR REPLACE FUNCTION public.calc_player_level(xp INTEGER) RETURNS INTEGER AS $$
BEGIN
  IF xp >= 500000 THEN RETURN 50;
  ELSIF xp >= 150000 THEN RETURN 30;
  ELSIF xp >= 80000 THEN RETURN 25;
  ELSIF xp >= 40000 THEN RETURN 20;
  ELSIF xp >= 15000 THEN RETURN 15;
  ELSIF xp >= 5000 THEN RETURN 10;
  ELSIF xp >= 2500 THEN RETURN 8;
  ELSIF xp >= 1000 THEN RETURN 5;
  ELSIF xp >= 500 THEN RETURN 4;
  ELSIF xp >= 250 THEN RETURN 3;
  ELSIF xp >= 100 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Function: calc_mastery_level
-- ============================================

CREATE OR REPLACE FUNCTION public.calc_mastery_level(xp INTEGER) RETURNS INTEGER AS $$
BEGIN
  IF xp >= 10000 THEN RETURN 10;
  ELSIF xp >= 6000 THEN RETURN 9;
  ELSIF xp >= 3500 THEN RETURN 8;
  ELSIF xp >= 2000 THEN RETURN 7;
  ELSIF xp >= 1200 THEN RETURN 6;
  ELSIF xp >= 700 THEN RETURN 5;
  ELSIF xp >= 350 THEN RETURN 4;
  ELSIF xp >= 150 THEN RETURN 3;
  ELSIF xp >= 50 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- Function: update_player_streak
-- ============================================

CREATE OR REPLACE FUNCTION public.update_player_streak(p_player_id UUID) RETURNS VOID AS $$
DECLARE
  last_date DATE;
  cur_streak INTEGER;
BEGIN
  SELECT last_played_date, current_streak INTO last_date, cur_streak
  FROM public.players WHERE id = p_player_id;

  IF last_date IS NULL OR last_date < CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.players SET
      current_streak = 1,
      longest_streak = GREATEST(longest_streak, 1),
      last_played_date = CURRENT_DATE
    WHERE id = p_player_id;
  ELSIF last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    UPDATE public.players SET
      current_streak = current_streak + 1,
      longest_streak = GREATEST(longest_streak, current_streak + 1),
      last_played_date = CURRENT_DATE
    WHERE id = p_player_id;
  ELSIF last_date = CURRENT_DATE THEN
    NULL;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function: record_bt_play (main play recording function)
-- ============================================

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
BEGIN
  -- 1. Insert the play
  INSERT INTO public.bt_plays (player_id, mode_id, score, correct, total, total_time, best_combo, songs)
  VALUES (p_player_id, p_mode_id, p_score, p_correct, p_total, p_total_time, p_best_combo, p_songs);

  -- 2. Update player stats
  IF p_player_id IS NOT NULL THEN
    UPDATE public.players SET
      xp = xp + p_xp_earned,
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

-- ============================================
-- Function: get_weekly_leaderboard
-- ============================================

CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_limit INTEGER DEFAULT 50)
RETURNS TABLE(
  player_id UUID,
  username TEXT,
  avatar_bg TEXT,
  avatar_text TEXT,
  level INTEGER,
  total_points BIGINT,
  games_played BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.player_id,
    pl.username,
    pl.avatar_bg,
    pl.avatar_text,
    pl.level,
    SUM(p.score)::BIGINT as total_points,
    COUNT(p.id)::BIGINT as games_played
  FROM bt_plays p
  JOIN players pl ON p.player_id = pl.id
  WHERE p.created_at >= CURRENT_DATE - INTERVAL '7 days'
    AND p.player_id IS NOT NULL
  GROUP BY p.player_id, pl.username, pl.avatar_bg, pl.avatar_text, pl.level
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;
