-- 137_fix_plays_score_valid_clues.sql
-- Hotfix: guess_from_clues quizzes never recorded plays.
--
-- The original plays.score_valid constraint (migration 001) was
--   CHECK (score >= 0 AND score <= total_questions)
-- which assumes 1 point per question. But guess_from_clues awards up to 3 points per
-- question (fewer clues revealed = more points), so a completed clues quiz submits a
-- score above total_questions. That violated score_valid, so record_play threw and the
-- play was silently dropped - leaving play_count stuck at 0 for every clues quiz.
--
-- Relax the upper bound to total_questions * 3 (the maximum multiplier any quiz type
-- uses; standard quizzes are still 1x and remain within range). Still rejects negative
-- and wildly-out-of-range scores.

ALTER TABLE public.plays DROP CONSTRAINT IF EXISTS score_valid;
ALTER TABLE public.plays ADD CONSTRAINT score_valid
  CHECK (score >= 0 AND score <= total_questions * 3);

NOTIFY pgrst, 'reload schema';
