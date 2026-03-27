-- Update recalculate_difficulty to account for guess_from_clues scoring (max 3 points per question)
CREATE OR REPLACE FUNCTION public.recalculate_difficulty(quiz_uuid UUID)
RETURNS VOID AS $$
DECLARE
  avg_pct NUMERIC;
  new_difficulty TEXT;
  q_type TEXT;
  q_count INTEGER;
  max_per_q INTEGER;
BEGIN
  SELECT quiz_type, question_count
  INTO q_type, q_count
  FROM public.quizzes WHERE id = quiz_uuid;

  -- Max points per question depends on quiz type
  IF q_type = 'guess_from_clues' THEN
    max_per_q := 3;
  ELSE
    max_per_q := 1;
  END IF;

  SELECT
    CASE WHEN total_completions > 0
      THEN (total_score_sum::NUMERIC / total_completions) / (q_count * max_per_q) * 100
      ELSE 50
    END INTO avg_pct
  FROM public.quizzes WHERE id = quiz_uuid;

  IF avg_pct >= 70 THEN new_difficulty := 'easy';
  ELSIF avg_pct >= 40 THEN new_difficulty := 'medium';
  ELSE new_difficulty := 'hard';
  END IF;

  UPDATE public.quizzes SET difficulty = new_difficulty WHERE id = quiz_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
