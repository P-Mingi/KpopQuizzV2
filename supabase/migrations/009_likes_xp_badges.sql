-- ============================================
-- Likes table
-- ============================================
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, quiz_id)
);

CREATE INDEX idx_likes_user ON public.likes(user_id);
CREATE INDEX idx_likes_quiz ON public.likes(quiz_id);

-- Add like_count to quizzes (cached count)
ALTER TABLE public.quizzes ADD COLUMN like_count INTEGER NOT NULL DEFAULT 0;

-- Add total_likes_received to profiles (cached count)
ALTER TABLE public.profiles ADD COLUMN total_likes_received INTEGER NOT NULL DEFAULT 0;

-- RLS for likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "likes_select_all" ON public.likes
  FOR SELECT USING (true);

CREATE POLICY "likes_insert_own" ON public.likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "likes_delete_own" ON public.likes
  FOR DELETE USING (auth.uid() = user_id);

-- Like count functions
CREATE OR REPLACE FUNCTION public.increment_like_count(quiz_uuid UUID)
RETURNS VOID AS $$
DECLARE
  creator UUID;
BEGIN
  UPDATE public.quizzes SET like_count = like_count + 1 WHERE id = quiz_uuid
  RETURNING creator_id INTO creator;
  UPDATE public.profiles SET total_likes_received = total_likes_received + 1 WHERE id = creator;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decrement_like_count(quiz_uuid UUID)
RETURNS VOID AS $$
DECLARE
  creator UUID;
BEGIN
  UPDATE public.quizzes SET like_count = GREATEST(like_count - 1, 0) WHERE id = quiz_uuid
  RETURNING creator_id INTO creator;
  UPDATE public.profiles SET total_likes_received = GREATEST(total_likes_received - 1, 0) WHERE id = creator;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- XP system
-- ============================================
ALTER TABLE public.profiles ADD COLUMN xp INTEGER NOT NULL DEFAULT 0;

-- Badge definitions (static, seed once)
CREATE TABLE public.badge_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_type TEXT NOT NULL,
  color_bg TEXT NOT NULL,
  color_stroke TEXT NOT NULL,
  color_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- User badges
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL REFERENCES public.badge_definitions(id),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);

-- RLS for badges
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badge_defs_select_all" ON public.badge_definitions FOR SELECT USING (true);
CREATE POLICY "user_badges_select_all" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges_insert_system" ON public.user_badges FOR INSERT WITH CHECK (true);

-- Seed badge definitions
INSERT INTO public.badge_definitions (id, name, description, icon_type, color_bg, color_stroke, color_text, sort_order) VALUES
  ('first_steps',      'First steps',      'Play your first quiz',                'checkmark', '#EAF3DE', '#97C459', '#27500A', 1),
  ('quiz_maker',       'Quiz maker',       'Create your first quiz',              'create',    '#EEEDFE', '#AFA9EC', '#3C3489', 2),
  ('perfect_score',    'Perfect score',    'Score 100% on any quiz',              'star',      '#FAEEDA', '#EF9F27', '#633806', 3),
  ('hard_mode',        'Hard mode',        'Pass a Hard difficulty quiz',         'flame',     '#FCEBEB', '#F09595', '#791F1F', 4),
  ('prolific_creator', 'Prolific creator', 'Create 10 quizzes',                   'stack',     '#E6F1FB', '#85B7EB', '#0C447C', 5),
  ('viral_hit',        'Viral hit',        'One of your quizzes reaches 1k plays','rocket',    '#FAECE7', '#F0997B', '#712B13', 6),
  ('multi_stan',       'Multi-stan',       'Play quizzes from 10+ groups',        'globe',     '#E1F5EE', '#5DCAA5', '#085041', 7),
  ('dedicated_fan',    'Dedicated fan',    'Play 100 quizzes',                    'trophy',    '#FAEEDA', '#EF9F27', '#633806', 8),
  ('community_star',   'Community star',   'Receive 100 likes across your quizzes','heart',    '#FBEAF0', '#ED93B1', '#72243E', 9);

-- Award XP function
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT
)
RETURNS INTEGER AS $$
DECLARE
  new_xp INTEGER;
  play_count_val INTEGER;
  quiz_count_val INTEGER;
  group_count_val INTEGER;
  likes_val INTEGER;
BEGIN
  UPDATE public.profiles SET xp = xp + p_amount WHERE id = p_user_id
  RETURNING xp INTO new_xp;

  -- First steps + dedicated fan
  IF p_reason = 'play' THEN
    SELECT COUNT(*) INTO play_count_val FROM public.plays WHERE player_id = p_user_id;
    IF play_count_val >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'first_steps') ON CONFLICT DO NOTHING;
    END IF;
    IF play_count_val >= 100 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'dedicated_fan') ON CONFLICT DO NOTHING;
    END IF;
    -- Multi-stan
    SELECT COUNT(DISTINCT q.group_id) INTO group_count_val
    FROM public.plays pl JOIN public.quizzes q ON pl.quiz_id = q.id
    WHERE pl.player_id = p_user_id;
    IF group_count_val >= 10 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'multi_stan') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Quiz maker + prolific creator
  IF p_reason = 'create' THEN
    SELECT total_quizzes_created INTO quiz_count_val FROM public.profiles WHERE id = p_user_id;
    IF quiz_count_val >= 1 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'quiz_maker') ON CONFLICT DO NOTHING;
    END IF;
    IF quiz_count_val >= 10 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'prolific_creator') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  -- Community star
  IF p_reason = 'like_received' THEN
    SELECT total_likes_received INTO likes_val FROM public.profiles WHERE id = p_user_id;
    IF likes_val >= 100 THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, 'community_star') ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN new_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
