-- ============================================
-- QUIZ TIME STATS: Per-question timing + averages cache
-- ============================================

-- Add per-question timing to plays
ALTER TABLE public.plays ADD COLUMN IF NOT EXISTS per_question_times JSONB;

-- Cache table for average times by quiz + score
CREATE TABLE IF NOT EXISTS public.quiz_time_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  avg_time_seconds FLOAT NOT NULL DEFAULT 0,
  fastest_time_seconds FLOAT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(quiz_id, score, total_questions)
);

CREATE INDEX IF NOT EXISTS idx_quiz_time_stats_quiz ON public.quiz_time_stats(quiz_id);

ALTER TABLE public.quiz_time_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quiz_time_stats_read_all" ON public.quiz_time_stats FOR SELECT USING (true);
CREATE POLICY "quiz_time_stats_write_all" ON public.quiz_time_stats FOR ALL USING (true) WITH CHECK (true);
