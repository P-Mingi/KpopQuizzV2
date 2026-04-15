-- Expand game types for Name All games beyond just members
-- New types: name_all_songs, name_top_songs, name_all_groups, name_all_idols

-- Add sub_type column for filtering (group_members, girl_idols, boy_idols, gen_groups, album_songs, top_hits)
ALTER TABLE public.games ADD COLUMN IF NOT EXISTS sub_type TEXT;

-- Note: The game_type column is TEXT with no CHECK constraint in practice,
-- so new values like 'name_all_songs' just work without altering constraints.
-- The content JSONB is flexible enough to hold any game data format.
