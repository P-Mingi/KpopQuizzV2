-- ============================================
-- QUIZ BANK: Pre-made verified quizzes for QOTD
-- ============================================

CREATE TABLE public.quiz_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Quiz content (mirrors quizzes table)
  title TEXT NOT NULL,
  description TEXT,
  group_id INTEGER REFERENCES public.groups(id),
  quiz_type TEXT NOT NULL DEFAULT 'multiple_choice',   -- 'multiple_choice', 'true_false'
  difficulty TEXT NOT NULL DEFAULT 'medium',           -- 'easy', 'medium', 'hard'
  category TEXT NOT NULL,                              -- 'group_specific', 'knowledge', 'true_false', 'fun', 'era'

  -- Questions use the same format as quizzes.questions, plus a 'source' field per question
  questions JSONB NOT NULL,

  -- Scheduling
  scheduled_date DATE UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',               -- 'draft', 'verified', 'scheduled', 'published'

  -- Verification
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,

  -- After publishing, link to the real quiz
  published_quiz_id UUID REFERENCES public.quizzes(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quizbank_status ON public.quiz_bank(status);
CREATE INDEX idx_quizbank_date ON public.quiz_bank(scheduled_date);
CREATE INDEX idx_quizbank_category ON public.quiz_bank(category);
CREATE INDEX idx_quizbank_group ON public.quiz_bank(group_id);

ALTER TABLE public.quiz_bank ENABLE ROW LEVEL SECURITY;

-- Admin-only (service role bypasses RLS; this allows authenticated admins too)
CREATE POLICY "quizbank_admin_all" ON public.quiz_bank
  FOR ALL USING (true) WITH CHECK (true);
