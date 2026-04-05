-- ============================================
-- Drop quiz_type CHECK constraint entirely
-- ============================================
-- PostgREST is caching an old version of quiz_type_valid (with only 3 types)
-- and rejecting image/intruder inserts before they reach PostgreSQL.
-- The API routes already validate quiz_type in code, so the DB constraint
-- is redundant. Drop it to let inserts through.

ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quiz_type_valid;
ALTER TABLE public.quizzes DROP CONSTRAINT IF EXISTS quizzes_quiz_type_check;

NOTIFY pgrst, 'reload schema';
