-- ============================================
-- Force PostgREST schema cache reload
-- ============================================
-- The quiz_type_valid constraint was dropped in migration 033, but PostgREST
-- may still have the old schema cached. Also ensure quizzes_quiz_type_check
-- from migration 027 is clean. Then notify PostgREST to reload.

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quiz_type_valid;
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_quiz_type_check;

ALTER TABLE public.quizzes ADD CONSTRAINT quiz_type_valid
  CHECK (quiz_type IN ('multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'));

-- Force PostgREST schema cache refresh
NOTIFY pgrst, 'reload schema';
