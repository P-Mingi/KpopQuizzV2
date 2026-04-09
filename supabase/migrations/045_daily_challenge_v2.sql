-- Migration 045: Evolve daily_challenges for the v2 daily flow.
-- Run this manually via supabase db push or psql; not auto-applied.
--
-- What's changing:
--   * daily_challenges gets day_number, questions (jsonb), playlist.
--     The old song_ids array stays in place for backward compat with the legacy
--     /api/daily/generate path (blind_test_songs / blind-test-game.tsx).
--   * daily_challenge_plays gets best_combo.
--   * day_number is backfilled for any pre-existing rows based on date order.
--   * UNIQUE(player_id, challenge_id) on daily_challenge_plays already exists
--     from migration 020; no change needed.
--
-- Idempotent: safe to re-run; ADD COLUMN uses IF NOT EXISTS and backfill guards.

ALTER TABLE public.daily_challenges
  ADD COLUMN IF NOT EXISTS day_number INTEGER,
  ADD COLUMN IF NOT EXISTS questions JSONB,
  ADD COLUMN IF NOT EXISTS playlist TEXT NOT NULL DEFAULT 'all';

-- Relax song_ids: new rows only need questions, not song_ids.
ALTER TABLE public.daily_challenges
  ALTER COLUMN song_ids DROP NOT NULL;

ALTER TABLE public.daily_challenges
  ALTER COLUMN song_ids SET DEFAULT '{}';

-- Backfill day_number based on the chronological order of existing dates.
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY date ASC) AS rn
  FROM public.daily_challenges
)
UPDATE public.daily_challenges dc
SET day_number = numbered.rn
FROM numbered
WHERE dc.id = numbered.id
  AND dc.day_number IS NULL;

-- Add best_combo to the plays table so the leaderboard can tie-break and the
-- share text can include the combo.
ALTER TABLE public.daily_challenge_plays
  ADD COLUMN IF NOT EXISTS best_combo INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.daily_challenges.day_number IS
  'Sequential daily number (Day 1, Day 2, ...). Used in share text and page title.';
COMMENT ON COLUMN public.daily_challenges.questions IS
  'Frozen questions array; same payload shape as /api/game/generate returns. When present, the v2 daily flow uses these directly instead of rebuilding from song_ids.';
COMMENT ON COLUMN public.daily_challenges.playlist IS
  'The playlist used to generate this daily (usually "all").';
