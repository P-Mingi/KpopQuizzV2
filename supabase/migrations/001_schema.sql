-- ============================================
-- PROFILES
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_bg TEXT NOT NULL DEFAULT '#EEEDFE',
  avatar_text TEXT NOT NULL DEFAULT '#3C3489',
  bio TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_quizzes_created INTEGER NOT NULL DEFAULT 0,
  total_plays_received INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.profiles ADD CONSTRAINT username_format
  CHECK (username ~ '^[a-z0-9_]{3,20}$');
ALTER TABLE public.profiles ADD CONSTRAINT username_min_length
  CHECK (char_length(username) >= 3);
ALTER TABLE public.profiles ADD CONSTRAINT username_max_length
  CHECK (char_length(username) <= 20);
ALTER TABLE public.profiles ADD CONSTRAINT display_name_max_length
  CHECK (display_name IS NULL OR char_length(display_name) <= 40);
ALTER TABLE public.profiles ADD CONSTRAINT bio_max_length
  CHECK (bio IS NULL OR char_length(bio) <= 160);

-- ============================================
-- GROUPS (K-pop groups/categories)
-- ============================================
CREATE TABLE public.groups (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  fandom_name TEXT NOT NULL DEFAULT 'fan',
  display_color TEXT NOT NULL,
  text_color TEXT NOT NULL,
  quiz_count INTEGER NOT NULL DEFAULT 0,
  total_plays INTEGER NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.groups ADD CONSTRAINT slug_format
  CHECK (slug ~ '^[a-z0-9-]{1,60}$');

-- ============================================
-- QUIZZES
-- ============================================
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES public.groups(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'multiple_choice',
  questions JSONB NOT NULL,
  settings JSONB NOT NULL DEFAULT '{"timer": true, "timer_seconds": 15, "shuffle": true, "show_answers": false}',
  difficulty TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'published',
  is_quiz_of_the_day BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_of_the_day_date DATE,
  play_count INTEGER NOT NULL DEFAULT 0,
  total_score_sum INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  report_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.quizzes ADD CONSTRAINT quiz_type_valid
  CHECK (quiz_type IN ('multiple_choice', 'true_false', 'guess_from_clues'));
ALTER TABLE public.quizzes ADD CONSTRAINT status_valid
  CHECK (status IN ('draft', 'published', 'flagged', 'removed'));
ALTER TABLE public.quizzes ADD CONSTRAINT difficulty_valid
  CHECK (difficulty IN ('easy', 'medium', 'hard'));
ALTER TABLE public.quizzes ADD CONSTRAINT title_length
  CHECK (char_length(title) >= 5 AND char_length(title) <= 100);
ALTER TABLE public.quizzes ADD CONSTRAINT slug_format
  CHECK (slug ~ '^[a-z0-9-]{1,80}$');
ALTER TABLE public.quizzes ADD CONSTRAINT questions_min
  CHECK (jsonb_array_length(questions) >= 5);
ALTER TABLE public.quizzes ADD CONSTRAINT questions_max
  CHECK (jsonb_array_length(questions) <= 20);

-- ============================================
-- PLAYS (individual play records)
-- ============================================
CREATE TABLE public.plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  time_taken_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.plays ADD CONSTRAINT score_valid
  CHECK (score >= 0 AND score <= total_questions);

-- ============================================
-- REPORTS (quiz moderation)
-- ============================================
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reports ADD CONSTRAINT reason_valid
  CHECK (reason IN ('wrong_answers', 'spam', 'inappropriate', 'duplicate', 'other'));
ALTER TABLE public.reports ADD CONSTRAINT status_valid
  CHECK (status IN ('pending', 'reviewed', 'resolved'));

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_quizzes_group_status_plays ON public.quizzes(group_id, status, play_count DESC);
CREATE INDEX idx_quizzes_creator ON public.quizzes(creator_id, status);
CREATE INDEX idx_quizzes_status_created ON public.quizzes(status, created_at DESC);
CREATE INDEX idx_quizzes_status_plays ON public.quizzes(status, play_count DESC);
CREATE INDEX idx_quizzes_slug ON public.quizzes(slug);
CREATE INDEX idx_quizzes_difficulty ON public.quizzes(difficulty, status);
CREATE INDEX idx_quizzes_qotd ON public.quizzes(is_quiz_of_the_day, quiz_of_the_day_date DESC);
CREATE INDEX idx_plays_quiz ON public.plays(quiz_id, created_at DESC);
CREATE INDEX idx_plays_player ON public.plays(player_id, created_at DESC);
CREATE INDEX idx_groups_slug ON public.groups(slug);
CREATE INDEX idx_profiles_username ON public.profiles(username);
CREATE INDEX idx_reports_quiz ON public.reports(quiz_id, status);
