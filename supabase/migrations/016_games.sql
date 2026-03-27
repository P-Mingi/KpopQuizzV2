-- ============================================
-- GAMES: "This or That" and future game types
-- ============================================

CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id),
  group_id INTEGER REFERENCES public.groups(id),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  game_type TEXT NOT NULL DEFAULT 'this_or_that',
  content JSONB NOT NULL DEFAULT '{"matchups":[]}',
  matchup_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published',
  play_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_games_slug ON public.games(slug);
CREATE INDEX idx_games_group ON public.games(group_id);
CREATE INDEX idx_games_type ON public.games(game_type);
CREATE INDEX idx_games_status_created ON public.games(status, created_at DESC);
CREATE INDEX idx_games_status_plays ON public.games(status, play_count DESC);

-- ============================================
-- GAME PLAYS: individual play records
-- ============================================

CREATE TABLE public.game_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id),
  player_id UUID REFERENCES public.profiles(id),
  choices JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_plays_game ON public.game_plays(game_id);
CREATE INDEX idx_game_plays_player ON public.game_plays(player_id);

-- ============================================
-- GAME LIKES
-- ============================================

CREATE TABLE public.game_likes (
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id)
);

-- ============================================
-- GAME REPORTS
-- ============================================

CREATE TABLE public.game_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id),
  reporter_id UUID REFERENCES public.profiles(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_game_reports_game ON public.game_reports(game_id);
CREATE INDEX idx_game_reports_status ON public.game_reports(status);

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_reports ENABLE ROW LEVEL SECURITY;

-- Games: anyone can read published, creators can insert
CREATE POLICY "games_select_published" ON public.games
  FOR SELECT USING (status = 'published' OR creator_id = auth.uid());

CREATE POLICY "games_insert_auth" ON public.games
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND creator_id = auth.uid());

CREATE POLICY "games_update_owner" ON public.games
  FOR UPDATE USING (creator_id = auth.uid());

-- Game plays: anyone can read, anyone can insert
CREATE POLICY "game_plays_select" ON public.game_plays
  FOR SELECT USING (true);

CREATE POLICY "game_plays_insert" ON public.game_plays
  FOR INSERT WITH CHECK (true);

-- Game likes: users can manage their own
CREATE POLICY "game_likes_select" ON public.game_likes
  FOR SELECT USING (true);

CREATE POLICY "game_likes_insert" ON public.game_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "game_likes_delete" ON public.game_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Game reports: anyone can insert, read own
CREATE POLICY "game_reports_insert" ON public.game_reports
  FOR INSERT WITH CHECK (true);

CREATE POLICY "game_reports_select_own" ON public.game_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- ============================================
-- FUNCTION: Record a game play (atomic)
-- ============================================

CREATE OR REPLACE FUNCTION public.record_game_play(
  p_game_id UUID,
  p_player_id UUID,
  p_choices JSONB
)
RETURNS UUID AS $$
DECLARE
  new_play_id UUID;
  game_creator UUID;
  matchup JSONB;
  matchup_id TEXT;
  choice TEXT;
  updated_matchups JSONB;
BEGIN
  -- Insert play
  INSERT INTO public.game_plays (game_id, player_id, choices)
  VALUES (p_game_id, p_player_id, p_choices)
  RETURNING id INTO new_play_id;

  -- Get current content and update vote counts
  SELECT content, creator_id INTO updated_matchups, game_creator
  FROM public.games WHERE id = p_game_id;

  -- Increment votes for each choice
  FOR i IN 0..jsonb_array_length(updated_matchups->'matchups') - 1 LOOP
    matchup := updated_matchups->'matchups'->i;
    matchup_id := matchup->>'id';
    choice := p_choices->>matchup_id;

    IF choice = 'a' THEN
      updated_matchups := jsonb_set(
        updated_matchups,
        ARRAY['matchups', i::text, 'votes_a'],
        to_jsonb(COALESCE((matchup->>'votes_a')::int, 0) + 1)
      );
    ELSIF choice = 'b' THEN
      updated_matchups := jsonb_set(
        updated_matchups,
        ARRAY['matchups', i::text, 'votes_b'],
        to_jsonb(COALESCE((matchup->>'votes_b')::int, 0) + 1)
      );
    END IF;
  END LOOP;

  -- Update game
  UPDATE public.games
  SET content = updated_matchups,
      play_count = play_count + 1,
      updated_at = NOW()
  WHERE id = p_game_id;

  -- Award XP to creator for receiving a play
  IF game_creator IS NOT NULL THEN
    PERFORM public.award_xp(game_creator, 1, 'play_received');
  END IF;

  RETURN new_play_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
