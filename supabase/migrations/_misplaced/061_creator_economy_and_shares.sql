-- ============================================================
-- 061: Creator passive income, milestones, and share tracking
-- ============================================================

-- Creator earnings: tracks per-play rewards to quiz creators
CREATE TABLE dev_creator_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) NOT NULL,
  quiz_id UUID NOT NULL,
  player_id UUID REFERENCES auth.users(id) NOT NULL,
  amount INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Prevent double-earning from same player on same quiz
  UNIQUE(quiz_id, player_id)
);

-- Index for daily cap check
CREATE INDEX idx_creator_earnings_daily
  ON dev_creator_earnings (creator_id, created_at);

-- Add creator milestone tracking to existing byeol table
ALTER TABLE dev_user_byeol
  ADD COLUMN IF NOT EXISTS creator_milestones JSONB DEFAULT '{}';

-- ============================================================
-- RPC: Award creator when someone plays their quiz
-- ============================================================

CREATE OR REPLACE FUNCTION dev_award_creator_play(
  p_quiz_id UUID,
  p_creator_id UUID,
  p_player_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_daily_total INTEGER;
  v_already_earned BOOLEAN;
  v_play_count INTEGER;
  v_milestones_awarded TEXT[] := '{}';
  v_existing_milestones JSONB;
  v_quiz_key TEXT;
  v_total_earned INTEGER := 0;
  v_awarded_list JSONB;
  v_threshold INTEGER;
  v_reward INTEGER;
  v_milestone_thresholds INTEGER[] := ARRAY[50, 100, 500, 1000];
  v_milestone_rewards INTEGER[] := ARRAY[50, 100, 250, 500];
BEGIN
  -- Don't earn from your own plays
  IF p_creator_id = p_player_id THEN
    RETURN jsonb_build_object('earned', 0, 'reason', 'own_quiz');
  END IF;

  -- Check if already earned from this player on this quiz
  SELECT EXISTS(
    SELECT 1 FROM dev_creator_earnings
    WHERE quiz_id = p_quiz_id AND player_id = p_player_id
  ) INTO v_already_earned;

  IF v_already_earned THEN
    RETURN jsonb_build_object('earned', 0, 'reason', 'already_earned');
  END IF;

  -- Check daily cap (150)
  SELECT COALESCE(SUM(amount), 0) FROM dev_creator_earnings
  WHERE creator_id = p_creator_id
  AND created_at > now() - interval '24 hours'
  INTO v_daily_total;

  IF v_daily_total >= 150 THEN
    RETURN jsonb_build_object('earned', 0, 'reason', 'daily_cap');
  END IF;

  -- Award the play earning
  INSERT INTO dev_creator_earnings (creator_id, quiz_id, player_id, amount)
  VALUES (p_creator_id, p_quiz_id, p_player_id, 3);

  -- Add to creator's balance
  UPDATE dev_user_byeol
  SET balance = balance + 3,
      total_earned = total_earned + 3
  WHERE user_id = p_creator_id;

  -- If no row was updated, insert one
  IF NOT FOUND THEN
    INSERT INTO dev_user_byeol (user_id, balance, total_earned)
    VALUES (p_creator_id, 3, 3)
    ON CONFLICT (user_id) DO UPDATE
    SET balance = dev_user_byeol.balance + 3,
        total_earned = dev_user_byeol.total_earned + 3;
  END IF;

  v_total_earned := 3;

  -- Check milestones
  v_quiz_key := p_quiz_id::TEXT;

  SELECT COALESCE(creator_milestones, '{}')
  FROM dev_user_byeol WHERE user_id = p_creator_id
  INTO v_existing_milestones;

  -- Count total unique plays on this quiz (from earnings table)
  SELECT COUNT(*) FROM dev_creator_earnings
  WHERE quiz_id = p_quiz_id
  INTO v_play_count;

  v_awarded_list := COALESCE(v_existing_milestones->v_quiz_key, '[]'::JSONB);

  FOR i IN 1..array_length(v_milestone_thresholds, 1) LOOP
    v_threshold := v_milestone_thresholds[i];
    v_reward := v_milestone_rewards[i];

    IF v_play_count >= v_threshold AND NOT v_awarded_list ? v_threshold::TEXT THEN
      -- Award milestone
      UPDATE dev_user_byeol
      SET balance = balance + v_reward,
          total_earned = total_earned + v_reward,
          creator_milestones = jsonb_set(
            COALESCE(creator_milestones, '{}'),
            ARRAY[v_quiz_key],
            (COALESCE(creator_milestones->v_quiz_key, '[]'::JSONB) || to_jsonb(v_threshold))
          )
      WHERE user_id = p_creator_id;

      v_total_earned := v_total_earned + v_reward;
      v_milestones_awarded := array_append(v_milestones_awarded, v_threshold::TEXT || ':' || v_reward::TEXT);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'earned', v_total_earned,
    'play_reward', 3,
    'milestones', v_milestones_awarded,
    'daily_total', v_daily_total + 3,
    'play_count', v_play_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Share tracking tables
-- ============================================================

CREATE TABLE dev_share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  quiz_id UUID NOT NULL,
  share_code VARCHAR(12) UNIQUE NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'reddit', 'twitter', 'link'
  click_count INTEGER DEFAULT 0,
  unique_click_count INTEGER DEFAULT 0,
  reward_awarded BOOLEAN DEFAULT false,
  reward_amount INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  reward_awarded_at TIMESTAMPTZ
);

CREATE INDEX idx_share_links_user ON dev_share_links (user_id, quiz_id, platform, created_at);
CREATE INDEX idx_share_links_code ON dev_share_links (share_code);

CREATE TABLE dev_share_clicks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_link_id UUID REFERENCES dev_share_links(id) NOT NULL,
  referrer VARCHAR(255),
  ip_hash VARCHAR(64),
  user_agent_hash VARCHAR(64),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_share_clicks_link ON dev_share_clicks (share_link_id);

-- ============================================================
-- RLS policies
-- ============================================================

ALTER TABLE dev_creator_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_share_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE dev_share_clicks ENABLE ROW LEVEL SECURITY;

-- Creator earnings: users can read their own
CREATE POLICY "Users can read own creator earnings"
  ON dev_creator_earnings FOR SELECT
  USING (auth.uid() = creator_id);

-- Share links: users can read and insert their own
CREATE POLICY "Users can read own share links"
  ON dev_share_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own share links"
  ON dev_share_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Share clicks: service role only (inserted by API)
-- No user-facing RLS policies needed
