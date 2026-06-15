-- Migration 070 (I1): lower the quiz publish floor from 5 to 3 questions.
-- Run manually in the Supabase SQL editor (like 069); not auto-applied.
--
-- The 5-question minimum was a table CHECK constraint (migration 001), so the
-- create_quiz_bypass RPC cannot skip it - it must be relaxed here. The API +
-- funnel + old editor are updated to 3 in code to match.

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS questions_min;
ALTER TABLE public.quizzes ADD CONSTRAINT questions_min
  CHECK (jsonb_array_length(questions) >= 3);
