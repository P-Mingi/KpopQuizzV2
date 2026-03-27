-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES
-- ============================================
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ============================================
-- GROUPS
-- ============================================
CREATE POLICY "groups_select_all" ON public.groups
  FOR SELECT USING (true);

CREATE POLICY "groups_insert_auth" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND is_custom = true);

-- ============================================
-- QUIZZES
-- ============================================
CREATE POLICY "quizzes_select_published" ON public.quizzes
  FOR SELECT USING (status = 'published');

CREATE POLICY "quizzes_insert_own" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "quizzes_update_own" ON public.quizzes
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- ============================================
-- PLAYS
-- ============================================
CREATE POLICY "plays_select_all" ON public.plays
  FOR SELECT USING (true);

CREATE POLICY "plays_insert_all" ON public.plays
  FOR INSERT WITH CHECK (true);

-- ============================================
-- REPORTS
-- ============================================
CREATE POLICY "reports_select_own" ON public.reports
  FOR SELECT USING (auth.uid() = reporter_id);

CREATE POLICY "reports_insert_all" ON public.reports
  FOR INSERT WITH CHECK (true);
