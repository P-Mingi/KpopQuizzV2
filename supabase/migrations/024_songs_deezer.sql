-- ============================================
-- SONGS: Deezer-based song database for blind test
-- ============================================

CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Deezer data
  deezer_track_id BIGINT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist_name TEXT NOT NULL,
  album_name TEXT,
  album_cover_small TEXT,
  album_cover_medium TEXT,
  album_cover_big TEXT,
  preview_url TEXT NOT NULL,
  duration INTEGER,

  -- Our metadata
  group_id INTEGER REFERENCES public.groups(id),
  gender TEXT CHECK (gender IN ('gg', 'bg', 'solo_female', 'solo_male', 'coed')),
  generation TEXT CHECK (generation IN ('1st', '2nd', '3rd', '4th', '5th')),
  is_title_track BOOLEAN DEFAULT true,
  year INTEGER,
  language TEXT DEFAULT 'korean',

  -- Game data
  wrong_answers_artist TEXT[] DEFAULT '{}',
  wrong_answers_title TEXT[] DEFAULT '{}',
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  play_count INTEGER DEFAULT 0,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'review')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_songs_artist ON public.songs(artist_name);
CREATE INDEX idx_songs_gender ON public.songs(gender);
CREATE INDEX idx_songs_generation ON public.songs(generation);
CREATE INDEX idx_songs_status ON public.songs(status);
CREATE INDEX idx_songs_group ON public.songs(group_id);
CREATE INDEX idx_songs_deezer ON public.songs(deezer_track_id);

ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "songs_read_all" ON public.songs
  FOR SELECT USING (true);

CREATE POLICY "songs_admin_write" ON public.songs
  FOR ALL USING (true) WITH CHECK (true);

-- Add Deezer artist ID to groups table
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS deezer_artist_id BIGINT;
