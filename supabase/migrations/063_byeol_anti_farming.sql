-- ============================================================
-- 063: Byeol Anti-Farming System
-- Layer 1: One-time rewards (quizzes, blindtests)
-- Layer 2: Daily caps (name_all, this_or_that)
-- ============================================================

-- 1.1 Reward history table (Layer 1: one-time rewards)
CREATE TABLE IF NOT EXISTS byeol_reward_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(30) NOT NULL,
  content_id TEXT NOT NULL,
  byeol_earned INTEGER NOT NULL DEFAULT 0,
  score INTEGER,
  total_questions INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, content_type, content_id)
);

CREATE INDEX idx_byeol_history_user ON byeol_reward_history (user_id);
CREATE INDEX idx_byeol_history_content ON byeol_reward_history (content_type, content_id);

ALTER TABLE byeol_reward_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own reward history"
  ON byeol_reward_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert rewards"
  ON byeol_reward_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 1.2 Daily caps table (Layer 2: per-day game limits)
CREATE TABLE IF NOT EXISTS byeol_daily_caps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(30) NOT NULL,
  cap_date DATE NOT NULL DEFAULT (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE,
  byeol_earned_today INTEGER NOT NULL DEFAULT 0,
  plays_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (user_id, content_type, cap_date)
);

CREATE INDEX idx_byeol_caps_user_date ON byeol_daily_caps (user_id, cap_date);

ALTER TABLE byeol_daily_caps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own caps"
  ON byeol_daily_caps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage caps"
  ON byeol_daily_caps FOR ALL
  USING (auth.uid() = user_id);

-- 1.3 Reward configuration
CREATE TABLE IF NOT EXISTS byeol_reward_config (
  content_type VARCHAR(30) PRIMARY KEY,
  max_reward INTEGER NOT NULL,
  daily_cap INTEGER,
  description TEXT
);

INSERT INTO byeol_reward_config (content_type, max_reward, daily_cap, description) VALUES
  ('quiz',              50,  NULL, 'Per-quiz one-time reward, 20-50 based on score'),
  ('blindtest',         30,  NULL, 'Per-blindtest one-time reward, flat 30'),
  ('game_name_all',     8,   60,   '8 Byeol per session, max 60/day')
ON CONFLICT (content_type) DO UPDATE
  SET max_reward = EXCLUDED.max_reward,
      daily_cap = EXCLUDED.daily_cap,
      description = EXCLUDED.description;

-- 1.4 Layer 1 RPC: One-time reward function
CREATE OR REPLACE FUNCTION award_first_time_byeol(
  p_user_id UUID,
  p_content_type VARCHAR,
  p_content_id TEXT,
  p_score INTEGER,
  p_total_questions INTEGER
)
RETURNS TABLE (
  byeol_awarded INTEGER,
  was_first_time BOOLEAN,
  reason TEXT,
  new_balance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_max_reward INTEGER;
  v_calculated_reward INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT max_reward INTO v_max_reward
  FROM byeol_reward_config
  WHERE content_type = p_content_type;

  IF v_max_reward IS NULL THEN
    RETURN QUERY SELECT 0, FALSE, 'Unknown content type'::TEXT, 0;
    RETURN;
  END IF;

  IF p_total_questions > 0 THEN
    v_calculated_reward := FLOOR((p_score::FLOAT / p_total_questions) * v_max_reward);
  ELSE
    v_calculated_reward := v_max_reward;
  END IF;

  IF v_calculated_reward < 1 AND p_score > 0 THEN
    v_calculated_reward := 1;
  END IF;

  BEGIN
    INSERT INTO byeol_reward_history (user_id, content_type, content_id, byeol_earned, score, total_questions)
    VALUES (p_user_id, p_content_type, p_content_id, v_calculated_reward, p_score, p_total_questions);

    -- First time - credit via existing dev_award_byeol RPC logic (update balance + log transaction)
    UPDATE dev_user_byeol
    SET balance = balance + v_calculated_reward,
        total_earned = total_earned + v_calculated_reward,
        updated_at = now()
    WHERE user_id = p_user_id;

    -- If no row existed, insert one
    IF NOT FOUND THEN
      INSERT INTO dev_user_byeol (user_id, balance, total_earned)
      VALUES (p_user_id, v_calculated_reward, v_calculated_reward);
    END IF;

    -- Log the transaction
    INSERT INTO dev_byeol_transactions (user_id, amount, source, reference_id)
    VALUES (p_user_id, v_calculated_reward, p_content_type, p_content_id);

    SELECT balance INTO v_new_balance FROM dev_user_byeol WHERE user_id = p_user_id;

    RETURN QUERY SELECT v_calculated_reward, TRUE, 'First completion'::TEXT, v_new_balance;

  EXCEPTION WHEN unique_violation THEN
    SELECT COALESCE(balance, 0) INTO v_new_balance FROM dev_user_byeol WHERE user_id = p_user_id;
    RETURN QUERY SELECT 0, FALSE, 'Already earned for this content'::TEXT, COALESCE(v_new_balance, 0);
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION award_first_time_byeol TO authenticated;

-- 1.5 Layer 2 RPC: Daily-cap reward function
CREATE OR REPLACE FUNCTION award_daily_capped_byeol(
  p_user_id UUID,
  p_content_type VARCHAR
)
RETURNS TABLE (
  byeol_awarded INTEGER,
  cap_reached BOOLEAN,
  earned_today INTEGER,
  daily_cap INTEGER,
  new_balance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_per_session INTEGER;
  v_daily_cap INTEGER;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE;
  v_earned_today INTEGER := 0;
  v_remaining INTEGER;
  v_to_award INTEGER;
  v_new_balance INTEGER;
BEGIN
  SELECT max_reward, byeol_reward_config.daily_cap INTO v_per_session, v_daily_cap
  FROM byeol_reward_config
  WHERE content_type = p_content_type;

  IF v_per_session IS NULL OR v_daily_cap IS NULL THEN
    RETURN QUERY SELECT 0, FALSE, 0, 0, 0;
    RETURN;
  END IF;

  INSERT INTO byeol_daily_caps (user_id, content_type, cap_date, byeol_earned_today, plays_today)
  VALUES (p_user_id, p_content_type, v_today, 0, 1)
  ON CONFLICT (user_id, content_type, cap_date)
  DO UPDATE SET plays_today = byeol_daily_caps.plays_today + 1, updated_at = now()
  RETURNING byeol_daily_caps.byeol_earned_today INTO v_earned_today;

  v_remaining := v_daily_cap - v_earned_today;

  IF v_remaining <= 0 THEN
    SELECT COALESCE(balance, 0) INTO v_new_balance FROM dev_user_byeol WHERE user_id = p_user_id;
    RETURN QUERY SELECT 0, TRUE, v_earned_today, v_daily_cap, COALESCE(v_new_balance, 0);
    RETURN;
  END IF;

  v_to_award := LEAST(v_per_session, v_remaining);

  UPDATE byeol_daily_caps
  SET byeol_earned_today = byeol_earned_today + v_to_award,
      updated_at = now()
  WHERE user_id = p_user_id
    AND content_type = p_content_type
    AND cap_date = v_today
  RETURNING byeol_earned_today INTO v_earned_today;

  -- Credit the wallet
  UPDATE dev_user_byeol
  SET balance = balance + v_to_award,
      total_earned = total_earned + v_to_award,
      updated_at = now()
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO dev_user_byeol (user_id, balance, total_earned)
    VALUES (p_user_id, v_to_award, v_to_award);
  END IF;

  INSERT INTO dev_byeol_transactions (user_id, amount, source, reference_id)
  VALUES (p_user_id, v_to_award, p_content_type, NULL);

  SELECT balance INTO v_new_balance FROM dev_user_byeol WHERE user_id = p_user_id;

  RETURN QUERY SELECT
    v_to_award,
    (v_earned_today >= v_daily_cap),
    v_earned_today,
    v_daily_cap,
    COALESCE(v_new_balance, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION award_daily_capped_byeol TO authenticated;

-- 1.6 Helper: Check eligibility (read-only)
CREATE OR REPLACE FUNCTION check_byeol_eligibility(
  p_user_id UUID,
  p_content_type VARCHAR,
  p_content_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_eligible BOOLEAN,
  reason TEXT,
  earned_today INTEGER,
  daily_cap INTEGER,
  max_reward INTEGER
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_max_reward INTEGER;
  v_daily_cap INTEGER;
  v_already_earned BOOLEAN;
  v_earned_today INTEGER := 0;
  v_today DATE := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::DATE;
BEGIN
  SELECT byeol_reward_config.max_reward, byeol_reward_config.daily_cap INTO v_max_reward, v_daily_cap
  FROM byeol_reward_config
  WHERE content_type = p_content_type;

  IF v_max_reward IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Unknown content type'::TEXT, 0, 0, 0;
    RETURN;
  END IF;

  -- Layer 1: one-time reward content
  IF v_daily_cap IS NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM byeol_reward_history
      WHERE user_id = p_user_id AND content_type = p_content_type AND content_id = p_content_id
    ) INTO v_already_earned;

    IF v_already_earned THEN
      RETURN QUERY SELECT FALSE, 'Already earned'::TEXT, 0, 0, v_max_reward;
    ELSE
      RETURN QUERY SELECT TRUE, 'Eligible'::TEXT, 0, 0, v_max_reward;
    END IF;
    RETURN;
  END IF;

  -- Layer 2: daily-cap game
  SELECT COALESCE(byeol_earned_today, 0) INTO v_earned_today
  FROM byeol_daily_caps
  WHERE user_id = p_user_id AND content_type = p_content_type AND cap_date = v_today;

  IF v_earned_today >= v_daily_cap THEN
    RETURN QUERY SELECT FALSE, 'Daily cap reached'::TEXT, v_earned_today, v_daily_cap, v_max_reward;
  ELSE
    RETURN QUERY SELECT TRUE, 'Eligible'::TEXT, v_earned_today, v_daily_cap, v_max_reward;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION check_byeol_eligibility TO authenticated;

-- 1.7 Backfill existing quiz play history
-- Stamp every first quiz play per user so they can't re-earn
INSERT INTO byeol_reward_history (user_id, content_type, content_id, byeol_earned, score, total_questions, created_at)
SELECT DISTINCT ON (player_id, quiz_id)
  player_id,
  'quiz',
  quiz_id::TEXT,
  0,
  score,
  total_questions,
  created_at
FROM plays
WHERE player_id IS NOT NULL
ORDER BY player_id, quiz_id, created_at ASC
ON CONFLICT (user_id, content_type, content_id) DO NOTHING;

-- Backfill blind test game plays
INSERT INTO byeol_reward_history (user_id, content_type, content_id, byeol_earned, created_at)
SELECT DISTINCT ON (player_id, game_id)
  player_id,
  'blindtest',
  game_id::TEXT,
  0,
  created_at
FROM game_plays
WHERE player_id IS NOT NULL
ORDER BY player_id, game_id, created_at ASC
ON CONFLICT (user_id, content_type, content_id) DO NOTHING;
