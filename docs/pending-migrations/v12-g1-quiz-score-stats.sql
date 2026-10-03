-- v12-g1-quiz-score-stats.sql  (V12 run, agent G1 Tracking + scores). NOT APPLIED.
--
-- WHAT
--   View public.quiz_score_stats (quiz_id, plays, avg_pct, median_pct): the average
--   and the median score of a quiz as a percentage of the MAXIMUM of a run, 0..100.
--
-- WHY
--   plays.score holds points. A guess_from_clues question is worth up to 3 points,
--   every other type 1, while plays.total_questions is the question count. Dividing
--   one by the other gave averages of 189% and 240% and labels like "18/6" (read
--   2026-10-02: 6 of the 11 published clue quizzes were above 100%, 0 after the
--   rule below). This view is the SQL twin of lib/quiz/scoring.ts (maxScore,
--   avgScorePct): keep the two in step. Stored rows are not rewritten.
--
-- THE RULE
--   max of a run = total_questions x (3 when quizzes.quiz_type = 'guess_from_clues', else 1)
--   pct of a run = score / max, kept inside 0..1
--   avg_pct      = round(avg(pct) x 100), median_pct = round(median(pct) x 100)
--
-- ROWS
--   None. A view: no table, no row, no policy and no function is changed.
--
-- WHAT IT UNLOCKS
--   One source for "Average", "You beat X%", the quiz of the day average and the
--   hall of fame percentage once their readers switch to it. The app already shows
--   correct averages without it (the TypeScript helpers compute the same value from
--   quizzes.total_score_sum / total_completions); the view adds the median and the
--   per-run truth. Nothing in the code fails while it is missing.
--
-- SAFETY
--   security_invoker = true: the view reads plays and quizzes with the caller's own
--   rights, so it shows exactly what the caller could already compute from those
--   tables and nothing more. No player column is exposed (aggregates per quiz only).
--
-- DRY RUN (read only, 2026-10-02, the SELECT below run as a plain query)
--   438 quizzes with plays, avg_pct between 23 and 100, median_pct at most 100;
--   on the 11 published clue quizzes avg_pct equals
--   round(total_score_sum / total_completions / (question_count x 3) x 100) on every one.
--
-- VERIFY (read only, after apply)
--   select count(*), max(avg_pct), max(median_pct), min(avg_pct) from public.quiz_score_stats;
--     -- max(avg_pct) <= 100 and max(median_pct) <= 100
--   select reloptions from pg_class where oid = 'public.quiz_score_stats'::regclass;
--     -- {security_invoker=true}
--
-- UNDO
--   DROP VIEW IF EXISTS public.quiz_score_stats;

BEGIN;

CREATE OR REPLACE VIEW public.quiz_score_stats
WITH (security_invoker = true) AS
SELECT
  q.id AS quiz_id,
  count(p.id)::integer AS plays,
  round(avg(
    least(1, greatest(0, p.score::numeric / (p.total_questions * CASE WHEN q.quiz_type = 'guess_from_clues' THEN 3 ELSE 1 END)))
  ) * 100)::integer AS avg_pct,
  round((percentile_cont(0.5) WITHIN GROUP (ORDER BY
    least(1, greatest(0, p.score::numeric / (p.total_questions * CASE WHEN q.quiz_type = 'guess_from_clues' THEN 3 ELSE 1 END)))
  ) * 100)::numeric)::integer AS median_pct
FROM public.quizzes q
JOIN public.plays p ON p.quiz_id = q.id
WHERE p.score IS NOT NULL
  AND p.total_questions > 0
GROUP BY q.id;

COMMENT ON VIEW public.quiz_score_stats IS 'V12: per quiz plays, average and median score as a percentage of the run maximum (guess_from_clues = 3 points a question). Twin of lib/quiz/scoring.ts.';

GRANT SELECT ON public.quiz_score_stats TO anon, authenticated, service_role;

COMMIT;
