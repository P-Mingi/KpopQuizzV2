-- Workstream N: Blindtest of the Day

-- 1. The daily blindtest definition (one row per day)
CREATE TABLE IF NOT EXISTS daily_blindtests (
  date       date PRIMARY KEY DEFAULT CURRENT_DATE,
  song_ids   uuid[] NOT NULL,                        -- exactly 10 song IDs
  question_types text[] NOT NULL,                     -- 'artist' or 'title' per song
  seed       int NOT NULL DEFAULT (floor(random() * 2147483647)::int),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Player scores (one play per user per day)
CREATE TABLE IF NOT EXISTS daily_blindtest_scores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date NOT NULL REFERENCES daily_blindtests(date),
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  score      smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  time_ms    int NOT NULL CHECK (time_ms >= 0),       -- total answer time across all 10 songs
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (date, user_id)
);

-- Index for leaderboard queries (score DESC, time_ms ASC = faster wins ties)
CREATE INDEX idx_dbt_scores_leaderboard
  ON daily_blindtest_scores (date, score DESC, time_ms ASC);

-- RLS: anyone can read daily_blindtests (the questions are public after generation).
-- Scores: users can read all (leaderboard), insert their own.
ALTER TABLE daily_blindtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_blindtest_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "daily_blindtests_read" ON daily_blindtests
  FOR SELECT USING (true);

CREATE POLICY "daily_bt_scores_read" ON daily_blindtest_scores
  FOR SELECT USING (true);

CREATE POLICY "daily_bt_scores_insert" ON daily_blindtest_scores
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. ensure_daily_blindtest(p_date) - like ensure_daily_quiz but for blindtest.
-- Picks 10 songs from the curated 'all' pool with the daily tier mix:
-- 3 iconic, 3 popular, 3 medium, 1 hard, 0 unknown.
-- Avoids songs used in the last 7 days. Idempotent (returns existing row if already set).
CREATE OR REPLACE FUNCTION ensure_daily_blindtest(p_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing date;
  v_song_ids uuid[];
  v_question_types text[];
  v_tier_targets int[] := ARRAY[3, 3, 3, 1, 0]; -- iconic, popular, medium, hard, unknown
  v_tiers text[] := ARRAY['iconic', 'popular', 'medium', 'hard', 'unknown'];
  v_recent_ids uuid[];
  v_picked uuid[];
  v_tier text;
  v_target int;
  v_batch uuid[];
  v_types text[];
  v_i int;
  v_group_count int;
  v_rng float;
BEGIN
  -- Idempotent: return if already exists
  SELECT date INTO v_existing FROM daily_blindtests WHERE date = p_date;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  -- Songs used in the last 7 days (avoid repeats)
  SELECT COALESCE(array_agg(s), ARRAY[]::uuid[])
  INTO v_recent_ids
  FROM (
    SELECT unnest(song_ids) AS s
    FROM daily_blindtests
    WHERE date >= p_date - 7 AND date < p_date
  ) sub;

  v_picked := ARRAY[]::uuid[];

  -- Pick per tier
  FOR v_i IN 1..5 LOOP
    v_tier := v_tiers[v_i];
    v_target := v_tier_targets[v_i];
    IF v_target = 0 THEN CONTINUE; END IF;

    SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_batch
    FROM (
      SELECT id FROM songs
      WHERE status = 'active'
        AND is_curated = true
        AND tier = v_tier
        AND id != ALL(v_picked)
        AND id != ALL(v_recent_ids)
        AND title NOT ILIKE '%remix%'
        AND title NOT ILIKE '%instrumental%'
        AND title NOT ILIKE '%inst.%'
        AND title NOT ILIKE '%karaoke%'
      ORDER BY random()
      LIMIT v_target
    ) sub;

    v_picked := v_picked || v_batch;
  END LOOP;

  -- Fill to 10 if any tier was short (pull from popular, then medium, then iconic)
  IF array_length(v_picked, 1) IS NULL OR array_length(v_picked, 1) < 10 THEN
    SELECT v_picked || COALESCE(array_agg(id), ARRAY[]::uuid[])
    INTO v_picked
    FROM (
      SELECT id FROM songs
      WHERE status = 'active'
        AND is_curated = true
        AND id != ALL(v_picked)
        AND id != ALL(v_recent_ids)
        AND title NOT ILIKE '%remix%'
        AND title NOT ILIKE '%instrumental%'
      ORDER BY
        CASE tier WHEN 'popular' THEN 1 WHEN 'medium' THEN 2 WHEN 'iconic' THEN 3 WHEN 'hard' THEN 4 ELSE 5 END,
        random()
      LIMIT 10 - COALESCE(array_length(v_picked, 1), 0)
    ) sub;
  END IF;

  -- Shuffle the picked array (Fisher-Yates in plpgsql)
  FOR v_i IN REVERSE array_length(v_picked, 1)..2 LOOP
    DECLARE
      v_j int := 1 + floor(random() * v_i)::int;
      v_tmp uuid := v_picked[v_i];
    BEGIN
      v_picked[v_i] := v_picked[v_j];
      v_picked[v_j] := v_tmp;
    END;
  END LOOP;

  v_song_ids := v_picked[1:10];

  -- Assign question types: ~60% artist, ~40% title (same logic as generate endpoint).
  -- But skip 'artist' for songs where many songs share the same artist (group playlists
  -- aren't relevant here since daily is always 'all', but we keep it balanced).
  v_group_count := 6; -- base: 6 artist, 4 title
  v_rng := random();
  IF v_rng < 0.33 THEN v_group_count := 5;
  ELSIF v_rng > 0.66 THEN v_group_count := 7;
  END IF;
  v_group_count := LEAST(v_group_count, 10);

  v_types := ARRAY[]::text[];
  FOR v_i IN 1..10 LOOP
    IF v_i <= v_group_count THEN
      v_types := v_types || 'artist';
    ELSE
      v_types := v_types || 'title';
    END IF;
  END LOOP;

  -- Shuffle question types so they interleave
  FOR v_i IN REVERSE array_length(v_types, 1)..2 LOOP
    DECLARE
      v_j2 int := 1 + floor(random() * v_i)::int;
      v_tmp2 text := v_types[v_i];
    BEGIN
      v_types[v_i] := v_types[v_j2];
      v_types[v_j2] := v_tmp2;
    END;
  END LOOP;

  INSERT INTO daily_blindtests (date, song_ids, question_types)
  VALUES (p_date, v_song_ids, v_types);

  RETURN p_date;
END;
$$;

-- REVOKE direct execution from anon/authenticated (server-only, like ensure_daily_quiz)
REVOKE EXECUTE ON FUNCTION ensure_daily_blindtest FROM anon, authenticated;

-- 4. Submit score + return rank
CREATE OR REPLACE FUNCTION submit_daily_bt_score(
  p_date date,
  p_score smallint,
  p_time_ms int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_rank int;
  v_total int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Insert (unique constraint prevents double-play)
  INSERT INTO daily_blindtest_scores (date, user_id, score, time_ms)
  VALUES (p_date, v_user_id, p_score, p_time_ms)
  ON CONFLICT (date, user_id) DO NOTHING;

  -- Compute rank
  SELECT COUNT(*) + 1 INTO v_rank
  FROM daily_blindtest_scores
  WHERE date = p_date
    AND (score > p_score OR (score = p_score AND time_ms < p_time_ms));

  SELECT COUNT(*) INTO v_total FROM daily_blindtest_scores WHERE date = p_date;

  RETURN jsonb_build_object(
    'rank', v_rank,
    'total', v_total,
    'score', p_score,
    'time_ms', p_time_ms
  );
END;
$$;

-- 5. Get today's leaderboard (top 20)
CREATE OR REPLACE FUNCTION get_daily_bt_leaderboard(p_date date DEFAULT CURRENT_DATE)
RETURNS TABLE (
  rank bigint,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  score smallint,
  time_ms int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ROW_NUMBER() OVER (ORDER BY s.score DESC, s.time_ms ASC) AS rank,
    s.user_id,
    p.username,
    p.display_name,
    p.avatar_url,
    s.score,
    s.time_ms
  FROM daily_blindtest_scores s
  JOIN profiles p ON p.id = s.user_id
  WHERE s.date = p_date
  ORDER BY s.score DESC, s.time_ms ASC
  LIMIT 20;
$$;
