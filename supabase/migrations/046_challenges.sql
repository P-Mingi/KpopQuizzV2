-- Migration 046: Challenge-a-friend tables.
-- Run this manually via supabase db push or psql; not auto-applied.
--
-- Each row in `challenges` is a frozen game setup: same 10 songs, same order,
-- stored as a full questions JSONB payload matching /api/game/generate's shape.
-- Players accept a challenge via its short_code (URL-safe 8-char alphanumeric)
-- and play the exact same round. Their attempts land in challenge_attempts.
--
-- FKs target bt_players (the canonical player table post-migration 026), not
-- the legacy `players` table.

-- Ensure bt_players exists (may be missing if 026 was partially applied)
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

CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT UNIQUE NOT NULL,

  -- Frozen game setup
  playlist TEXT NOT NULL,
  mode TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'all',
  questions JSONB NOT NULL,

  -- Creator stats (stored even if anonymous, so others can compare against the
  -- original run without a join)
  creator_player_id UUID REFERENCES public.bt_players(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL DEFAULT 'Anonymous',
  creator_score INTEGER NOT NULL,
  creator_correct INTEGER NOT NULL,
  creator_total INTEGER NOT NULL DEFAULT 10,
  creator_time FLOAT,
  creator_best_combo INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

CREATE INDEX IF NOT EXISTS idx_challenges_short_code ON public.challenges(short_code);
CREATE INDEX IF NOT EXISTS idx_challenges_created ON public.challenges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_challenges_creator ON public.challenges(creator_player_id);

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenges_select_all" ON public.challenges;
CREATE POLICY "challenges_select_all"
  ON public.challenges FOR SELECT USING (true);
-- Writes go through service-role only (API routes enforce rules).

-- ==========================================================================
-- challenge_attempts: one row per play of a challenge (incl. anonymous).
-- ==========================================================================

CREATE TABLE IF NOT EXISTS public.challenge_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.bt_players(id) ON DELETE SET NULL,

  player_name TEXT NOT NULL DEFAULT 'Anonymous',
  score INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  total_songs INTEGER NOT NULL DEFAULT 10,
  best_combo INTEGER NOT NULL DEFAULT 0,
  time_taken FLOAT,
  song_results JSONB,

  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_challenge_attempts_challenge
  ON public.challenge_attempts(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_score
  ON public.challenge_attempts(challenge_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_challenge_attempts_player
  ON public.challenge_attempts(player_id);

ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "challenge_attempts_select_all" ON public.challenge_attempts;
CREATE POLICY "challenge_attempts_select_all"
  ON public.challenge_attempts FOR SELECT USING (true);
-- Writes go through service-role only.

COMMENT ON TABLE public.challenges IS
  'Frozen game setups accessible via short_code URLs. Stores the full questions payload so the same 10 songs can be replayed by anyone.';
COMMENT ON TABLE public.challenge_attempts IS
  'Each play of a challenge. Supports anonymous attempts via nullable player_id.';
