-- ============================================
-- BLIND TEST V2: Songs database + plays table
-- ============================================

-- Songs table - each row is one K-pop song with 4 clip timestamps
CREATE TABLE public.blind_test_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  group_id INTEGER REFERENCES public.groups(id),
  youtube_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  is_title_track BOOLEAN NOT NULL DEFAULT true,
  gender TEXT NOT NULL DEFAULT 'mixed',
  generation TEXT,
  clip_intro INTEGER,
  clip_chorus INTEGER,
  clip_verse INTEGER,
  clip_bridge INTEGER,
  wrong_answers TEXT[] NOT NULL DEFAULT '{}',
  times_played INTEGER NOT NULL DEFAULT 0,
  times_correct INTEGER NOT NULL DEFAULT 0,
  avg_answer_time FLOAT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_btsongs_group ON blind_test_songs(group_id);
CREATE INDEX idx_btsongs_year ON blind_test_songs(year);
CREATE INDEX idx_btsongs_gender ON blind_test_songs(gender);
CREATE INDEX idx_btsongs_gen ON blind_test_songs(generation);
CREATE INDEX idx_btsongs_status ON blind_test_songs(status);
CREATE INDEX idx_btsongs_youtube ON blind_test_songs(youtube_id);

ALTER TABLE public.blind_test_songs ENABLE ROW LEVEL SECURITY;

-- Anyone can read active songs
CREATE POLICY "btsongs_select_active" ON public.blind_test_songs
  FOR SELECT USING (true);

-- Service role can do everything (admin operations go through service role)
CREATE POLICY "btsongs_admin_insert" ON public.blind_test_songs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "btsongs_admin_update" ON public.blind_test_songs
  FOR UPDATE USING (true);

CREATE POLICY "btsongs_admin_delete" ON public.blind_test_songs
  FOR DELETE USING (true);

-- ============================================
-- Plays table - tracks each blind test play
-- ============================================

CREATE TABLE public.blind_test_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id),
  mode_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  song_ids UUID[] NOT NULL DEFAULT '{}',
  choices JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_btplays_player ON blind_test_plays(player_id);
CREATE INDEX idx_btplays_mode ON blind_test_plays(mode_id);
CREATE INDEX idx_btplays_created ON blind_test_plays(created_at DESC);

ALTER TABLE public.blind_test_plays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "btplays_select_all" ON public.blind_test_plays
  FOR SELECT USING (true);

CREATE POLICY "btplays_insert_all" ON public.blind_test_plays
  FOR INSERT WITH CHECK (true);
