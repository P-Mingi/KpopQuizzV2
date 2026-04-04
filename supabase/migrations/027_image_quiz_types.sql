-- ============================================
-- IMAGE QUIZ: Add image + intruder quiz types
-- ============================================

-- Update the quiz_type CHECK constraint to allow new types
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_quiz_type_check;
ALTER TABLE public.quizzes ADD CONSTRAINT quizzes_quiz_type_check
  CHECK (quiz_type IN ('multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'));

-- Also update quiz_bank if it has the same constraint
ALTER TABLE public.quiz_bank DROP CONSTRAINT IF EXISTS quiz_bank_quiz_type_check;
ALTER TABLE public.quiz_bank ADD CONSTRAINT quiz_bank_quiz_type_check
  CHECK (quiz_type IN ('multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'));

-- Note: Questions are stored as JSONB in quizzes.questions column.
-- Image quiz questions will have an image_url field in the JSONB.
-- Intruder questions will have options with image_url fields.
-- No schema changes needed for the JSONB column itself.
