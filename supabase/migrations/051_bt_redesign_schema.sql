-- Blindtest Redesign: rank fields, party tables, ranked plays, daily extensions
-- Target: blindtest Supabase project

-- ===========================================
-- 1. Extend bt_players with rank fields
-- ===========================================

ALTER TABLE public.bt_players
  ADD COLUMN IF NOT EXISTS rank_title TEXT NOT NULL DEFAULT 'trainee',
  ADD COLUMN IF NOT EXISTS rank_level INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_bt_players_rank ON public.bt_players(rank_level DESC, total_xp DESC);

-- Backfill existing players based on XP
UPDATE public.bt_players SET
  rank_level = CASE
    WHEN total_xp >= 25000 THEN 7
    WHEN total_xp >= 12000 THEN 6
    WHEN total_xp >= 6000 THEN 5
    WHEN total_xp >= 3000 THEN 4
    WHEN total_xp >= 1500 THEN 3
    WHEN total_xp >= 500 THEN 2
    ELSE 1
  END,
  rank_title = CASE
    WHEN total_xp >= 25000 THEN 'legend'
    WHEN total_xp >= 12000 THEN 'superstar'
    WHEN total_xp >= 6000 THEN 'star'
    WHEN total_xp >= 3000 THEN 'idol'
    WHEN total_xp >= 1500 THEN 'debut'
    WHEN total_xp >= 500 THEN 'rookie'
    ELSE 'trainee'
  END;

-- ===========================================
-- 2. Party rooms
-- ===========================================

CREATE TABLE public.party_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  host_id UUID REFERENCES public.bt_players(id) NOT NULL,
  host_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('everyone', 'kahoot')),
  playlist JSONB NOT NULL,
  difficulty TEXT DEFAULT 'mixed',
  song_ids UUID[] NOT NULL,
  questions JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  current_round INTEGER DEFAULT 0,
  round_started_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{"rounds": 10, "timer_seconds": 15}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours')
);

CREATE INDEX idx_party_rooms_code ON public.party_rooms(code);
CREATE INDEX idx_party_rooms_status ON public.party_rooms(status);

ALTER TABLE public.party_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "party_rooms_select" ON public.party_rooms FOR SELECT USING (true);
CREATE POLICY "party_rooms_insert" ON public.party_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "party_rooms_update" ON public.party_rooms FOR UPDATE USING (true);

-- ===========================================
-- 3. Party players
-- ===========================================

CREATE TABLE public.party_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.party_rooms(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.bt_players(id),
  display_name TEXT NOT NULL,
  is_host BOOLEAN DEFAULT false,
  score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  current_combo INTEGER DEFAULT 0,
  best_combo INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(room_id, player_id)
);

CREATE INDEX idx_party_players_room ON public.party_players(room_id);

ALTER TABLE public.party_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "party_players_select" ON public.party_players FOR SELECT USING (true);
CREATE POLICY "party_players_insert" ON public.party_players FOR INSERT WITH CHECK (true);
CREATE POLICY "party_players_update" ON public.party_players FOR UPDATE USING (true);

-- ===========================================
-- 4. Ranked plays
-- ===========================================

CREATE TABLE public.ranked_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.bt_players(id) NOT NULL,
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_rounds INTEGER NOT NULL DEFAULT 10,
  best_combo INTEGER NOT NULL DEFAULT 0,
  avg_speed_ms INTEGER,
  playlist JSONB NOT NULL,
  song_ids UUID[] NOT NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ranked_plays_player ON public.ranked_plays(player_id);
CREATE INDEX idx_ranked_plays_score ON public.ranked_plays(score DESC);
CREATE INDEX idx_ranked_plays_date ON public.ranked_plays(played_at);

ALTER TABLE public.ranked_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranked_plays_select" ON public.ranked_plays FOR SELECT USING (true);
CREATE POLICY "ranked_plays_insert" ON public.ranked_plays FOR INSERT WITH CHECK (true);

-- ===========================================
-- 5. Extend daily_challenges
-- ===========================================

ALTER TABLE public.daily_challenges
  ADD COLUMN IF NOT EXISTS difficulty_distribution JSONB DEFAULT '{"easy": 5, "medium": 3, "hard": 2}',
  ADD COLUMN IF NOT EXISTS total_plays INTEGER DEFAULT 0;

-- ===========================================
-- 6. Enable Realtime for party mode
-- ===========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.party_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.party_players;
