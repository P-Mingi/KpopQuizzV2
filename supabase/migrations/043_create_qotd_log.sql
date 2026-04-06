-- qotd_log table was never created in production (migration 011 was marked applied but not run)
CREATE TABLE IF NOT EXISTS public.qotd_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id),
  featured_date DATE NOT NULL UNIQUE,
  selection_method TEXT NOT NULL DEFAULT 'auto',
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qotd_log_date ON public.qotd_log(featured_date DESC);

ALTER TABLE public.qotd_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "qotd_log_select_all" ON public.qotd_log;
CREATE POLICY "qotd_log_select_all" ON public.qotd_log FOR SELECT USING (true);
