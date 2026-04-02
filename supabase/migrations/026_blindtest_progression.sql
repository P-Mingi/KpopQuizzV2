-- ============================================
-- BLINDTEST PROGRESSION: Players, Game Results, Mastery
-- ============================================

-- Players table
CREATE TABLE IF NOT EXISTS public.bt_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,

  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,

  total_games INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_songs_played INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_combo INTEGER NOT NULL DEFAULT 0,

  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_played_date DATE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bt_players_user ON public.bt_players(user_id);
CREATE INDEX IF NOT EXISTS idx_bt_players_xp ON public.bt_players(total_xp DESC);

ALTER TABLE public.bt_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_players_read_all" ON public.bt_players FOR SELECT USING (true);
CREATE POLICY "bt_players_insert_own" ON public.bt_players FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "bt_players_update_own" ON public.bt_players FOR UPDATE USING (auth.uid() = user_id);

-- Game results table
CREATE TABLE IF NOT EXISTS public.bt_game_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.bt_players(id) NOT NULL,

  mode TEXT NOT NULL CHECK (mode IN ('quick', 'challenge', 'daily')),
  playlist TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'all',

  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_songs INTEGER NOT NULL DEFAULT 10,
  best_combo INTEGER NOT NULL DEFAULT 0,
  avg_speed FLOAT,
  xp_earned INTEGER NOT NULL DEFAULT 0,

  song_results JSONB,

  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bt_results_player ON public.bt_game_results(player_id);
CREATE INDEX IF NOT EXISTS idx_bt_results_played ON public.bt_game_results(played_at DESC);
CREATE INDEX IF NOT EXISTS idx_bt_results_score ON public.bt_game_results(score DESC);

ALTER TABLE public.bt_game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_results_read_all" ON public.bt_game_results FOR SELECT USING (true);
CREATE POLICY "bt_results_insert_own" ON public.bt_game_results FOR INSERT WITH CHECK (
  player_id IN (SELECT id FROM public.bt_players WHERE user_id = auth.uid())
);

-- Playlist mastery table
CREATE TABLE IF NOT EXISTS public.bt_playlist_mastery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.bt_players(id) NOT NULL,
  playlist TEXT NOT NULL,

  play_count INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  total_correct INTEGER NOT NULL DEFAULT 0,
  total_songs_played INTEGER NOT NULL DEFAULT 0,
  mastery_stars INTEGER NOT NULL DEFAULT 0,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, playlist)
);

CREATE INDEX IF NOT EXISTS idx_bt_mastery_player ON public.bt_playlist_mastery(player_id);

ALTER TABLE public.bt_playlist_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bt_mastery_read_all" ON public.bt_playlist_mastery FOR SELECT USING (true);
CREATE POLICY "bt_mastery_upsert_own" ON public.bt_playlist_mastery FOR ALL USING (
  player_id IN (SELECT id FROM public.bt_players WHERE user_id = auth.uid())
);
