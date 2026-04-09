-- Migration 047: community features (reactions, comments, creator notifications).
-- Run manually via supabase db push or psql; not auto-applied.

-- ============================================
-- QUIZ REACTIONS
-- One row per (quiz, user). Reactions are exclusive: upserting replaces.
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL CHECK (reaction IN ('too_easy', 'perfect', 'too_hard', 'banger')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (quiz_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_reactions_quiz ON public.quiz_reactions (quiz_id);

ALTER TABLE public.quiz_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read reactions" ON public.quiz_reactions;
CREATE POLICY "Anyone can read reactions" ON public.quiz_reactions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert reactions" ON public.quiz_reactions;
CREATE POLICY "Authenticated can insert reactions" ON public.quiz_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own reaction" ON public.quiz_reactions;
CREATE POLICY "Users can update own reaction" ON public.quiz_reactions
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reaction" ON public.quiz_reactions;
CREATE POLICY "Users can delete own reaction" ON public.quiz_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- QUIZ COMMENTS
-- Max 200 chars. Newest first via (quiz_id, created_at DESC) index.
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_comments_quiz ON public.quiz_comments (quiz_id, created_at DESC);

ALTER TABLE public.quiz_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read comments" ON public.quiz_comments;
CREATE POLICY "Anyone can read comments" ON public.quiz_comments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated can insert comments" ON public.quiz_comments;
CREATE POLICY "Authenticated can insert comments" ON public.quiz_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.quiz_comments;
CREATE POLICY "Users can delete own comments" ON public.quiz_comments
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- CREATOR NOTIFICATIONS
-- Types: milestone, rating, comment, trending.
-- Server-side inserts only (service role); users can only read their own.
-- ============================================

CREATE TABLE IF NOT EXISTS public.creator_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'rating', 'comment', 'trending')),
  title TEXT NOT NULL,
  body TEXT,
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creator_notifications_user
  ON public.creator_notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creator_notifications_unread
  ON public.creator_notifications (user_id)
  WHERE is_read = FALSE;

ALTER TABLE public.creator_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own notifications" ON public.creator_notifications;
CREATE POLICY "Users read own notifications" ON public.creator_notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON public.creator_notifications;
CREATE POLICY "Users update own notifications" ON public.creator_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Note: INSERT is intentionally not granted to authenticated users. The API
-- routes use the service role client to insert notifications on behalf of the
-- system (on comment, rating, milestone events).

COMMENT ON TABLE public.quiz_reactions IS
  'Player reactions on a quiz after playing. One reaction per user per quiz; upsert replaces.';
COMMENT ON TABLE public.quiz_comments IS
  'Short (<=200 char) comments on a quiz. Displayed on the result screen.';
COMMENT ON TABLE public.creator_notifications IS
  'Notifications for quiz creators: milestones, ratings, comments, trending.';
