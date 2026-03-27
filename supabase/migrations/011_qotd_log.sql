CREATE TABLE public.qotd_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id),
  featured_date DATE NOT NULL UNIQUE,
  selection_method TEXT NOT NULL DEFAULT 'auto',
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qotd_log_date ON public.qotd_log(featured_date DESC);

ALTER TABLE public.qotd_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qotd_log_select_all" ON public.qotd_log FOR SELECT USING (true);
