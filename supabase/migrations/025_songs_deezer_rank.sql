-- Add deezer_rank column for popularity-based difficulty
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS deezer_rank INTEGER DEFAULT 0;

-- Auto-assign difficulty tiers based on Deezer popularity
-- Run after importing songs with deezer_rank data:
-- UPDATE songs SET difficulty = 'easy' WHERE deezer_rank >= 500000;
-- UPDATE songs SET difficulty = 'medium' WHERE deezer_rank BETWEEN 100000 AND 499999;
-- UPDATE songs SET difficulty = 'hard' WHERE deezer_rank BETWEEN 1 AND 99999;
-- UPDATE songs SET difficulty = 'medium' WHERE deezer_rank = 0 OR deezer_rank IS NULL;
