-- Migration 118: personality quizzes schema (Workstream P, step 1).
-- Run manually in the prod SQL editor; not auto-applied. Seed data lands in a
-- separate step-2 migration (119).
--
-- Three tables: the shared 10-question bank, per-member axis profiles (top-15
-- groups), and one row per completed run for real result counts. RLS: questions
-- + profiles are public read; results are insert-anyone (guards at the API),
-- own-row read only (passport flair), and aggregated only through a counts RPC.

-- 1. Shared question bank ----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personality_questions (
  id SERIAL PRIMARY KEY,
  ord SMALLINT NOT NULL,
  question TEXT NOT NULL,
  -- [{ "text": "...", "weights": { "energy": 5, "chaos": 3 } }, ... 4 options]
  options JSONB NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_personality_questions_ord ON public.personality_questions(ord);

-- 2. Per-member axis profiles ------------------------------------------------
CREATE TABLE IF NOT EXISTS public.personality_profiles (
  id SERIAL PRIMARY KEY,
  group_id INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_slug TEXT NOT NULL,       -- for /r/{member-slug} permalinks
  photo_url TEXT,
  -- { "energy":55, "chaos":30, "care":5, "craft":80, "heart":25, "spotlight":55 }
  axes JSONB NOT NULL,
  trait_lines TEXT[] NOT NULL,     -- 3 hand-written lines
  ord SMALLINT NOT NULL DEFAULT 0, -- member-faces display order
  active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (group_id, member_name),
  UNIQUE (group_id, member_slug)
);
CREATE INDEX IF NOT EXISTS idx_personality_profiles_group ON public.personality_profiles(group_id, active);

-- 3. Completed runs (real counts + monthly windows) --------------------------
CREATE TABLE IF NOT EXISTS public.personality_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- UTC day the run counted for; a plain column so the daily unique index is
  -- immutable (an AT TIME ZONE expression index would not be).
  result_day DATE NOT NULL DEFAULT ((now() AT TIME ZONE 'UTC')::date)
);
CREATE INDEX IF NOT EXISTS idx_personality_results_counts
  ON public.personality_results(group_id, member_name, created_at DESC);
-- Retakes are free, but only ONE row per signed-in user per group per UTC day
-- is saved, so "N fans got X" stays honest. Anon dedup is client + API only.
CREATE UNIQUE INDEX IF NOT EXISTS idx_personality_results_daily_user
  ON public.personality_results(user_id, group_id, result_day)
  WHERE user_id IS NOT NULL;

-- RLS ------------------------------------------------------------------------
ALTER TABLE public.personality_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personality_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pq_public_read ON public.personality_questions;
CREATE POLICY pq_public_read ON public.personality_questions FOR SELECT USING (true);

DROP POLICY IF EXISTS pp_public_read ON public.personality_profiles;
CREATE POLICY pp_public_read ON public.personality_profiles FOR SELECT USING (true);

-- Anyone may insert a result; a signed-in row can only carry its own user_id
-- (no spoofing). Rate limiting + the one-per-day guard live at the API.
DROP POLICY IF EXISTS pr_insert_anyone ON public.personality_results;
CREATE POLICY pr_insert_anyone ON public.personality_results
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- A signed-in user may read only their OWN results (passport "latest match"
-- flair). No row-level browsing of who-got-what for anyone else.
DROP POLICY IF EXISTS pr_own_read ON public.personality_results;
CREATE POLICY pr_own_read ON public.personality_results
  FOR SELECT USING (auth.uid() = user_id);

-- Aggregated counts RPC (SECURITY DEFINER bypasses RLS to tally, but returns
-- only member_name + count, never rows). p_since gates the monthly window.
CREATE OR REPLACE FUNCTION public.get_personality_counts(p_group_id INTEGER, p_since TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (member_name TEXT, cnt BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.member_name, count(*)::bigint AS cnt
  FROM public.personality_results r
  WHERE r.group_id = p_group_id
    AND (p_since IS NULL OR r.created_at >= p_since)
  GROUP BY r.member_name;
$$;
GRANT EXECUTE ON FUNCTION public.get_personality_counts(INTEGER, TIMESTAMPTZ) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
