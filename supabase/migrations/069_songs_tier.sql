-- Migration 069: add the blindtest difficulty TIER to songs.
-- Run manually in the Supabase SQL editor (like C1/C3); not auto-applied.
--
-- tier grades each song for the per-game difficulty mix, independent of the
-- coarse `difficulty` column and the `is_curated` flag:
--   iconic  - genuine megahits (matched against the hand-curated canon)
--   popular - top streaming rank / title tracks
--   medium  - solidly known
--   hard    - deeper cuts
--   unknown - thin long tail
-- Idempotent: safe to re-run.

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS tier TEXT
  CHECK (tier IN ('iconic', 'popular', 'medium', 'hard', 'unknown'));

CREATE INDEX IF NOT EXISTS songs_status_tier_idx
  ON public.songs (status, tier);
