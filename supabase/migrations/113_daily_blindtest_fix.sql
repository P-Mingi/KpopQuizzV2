-- Workstream N fix: ensure_daily_blindtest failed at runtime with
--   malformed array literal: "artist"
-- because `v_types := v_types || 'artist'` resolves the `||` operator to
-- array||array and tries to cast the untyped literal 'artist' to text[].
-- Re-create the function using array_append (anyarray, anyelement), which is
-- unambiguous. Only ensure_daily_blindtest was affected; submit + leaderboard
-- RPCs from 106 are unchanged. Forward-only: 106 tables/policies stay as-is.

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

  -- Assign question types: ~60% artist, ~40% title.
  v_group_count := 6; -- base: 6 artist, 4 title
  v_rng := random();
  IF v_rng < 0.33 THEN v_group_count := 5;
  ELSIF v_rng > 0.66 THEN v_group_count := 7;
  END IF;
  v_group_count := LEAST(v_group_count, 10);

  v_types := ARRAY[]::text[];
  FOR v_i IN 1..10 LOOP
    IF v_i <= v_group_count THEN
      v_types := array_append(v_types, 'artist');
    ELSE
      v_types := array_append(v_types, 'title');
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

REVOKE EXECUTE ON FUNCTION ensure_daily_blindtest FROM anon, authenticated;
