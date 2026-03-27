-- ============================================
-- FUNCTIONS: Auto-update difficulty
-- ============================================
CREATE OR REPLACE FUNCTION public.recalculate_difficulty(quiz_uuid UUID)
RETURNS VOID AS $$
DECLARE
  avg_pct NUMERIC;
  new_difficulty TEXT;
BEGIN
  SELECT
    CASE WHEN total_completions > 0
      THEN (total_score_sum::NUMERIC / total_completions) /
           jsonb_array_length(questions) * 100
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

-- ============================================
-- FUNCTIONS: Record a play (atomic)
-- ============================================
CREATE OR REPLACE FUNCTION public.record_play(
  p_quiz_id UUID,
  p_player_id UUID,
  p_score INTEGER,
  p_total_questions INTEGER,
  p_time_taken_seconds INTEGER
)
RETURNS TABLE(
  play_id UUID,
  percentile INTEGER
) AS $$
DECLARE
  new_play_id UUID;
  total_plays_count INTEGER;
  worse_plays_count INTEGER;
  pct INTEGER;
  quiz_creator UUID;
  quiz_group INTEGER;
BEGIN
  -- Insert play
  INSERT INTO public.plays (quiz_id, player_id, score, total_questions, time_taken_seconds)
  VALUES (p_quiz_id, p_player_id, p_score, p_total_questions, p_time_taken_seconds)
  RETURNING id INTO new_play_id;

  -- Update quiz stats
  UPDATE public.quizzes
  SET play_count = play_count + 1,
      total_score_sum = total_score_sum + p_score,
      total_completions = total_completions + 1,
      updated_at = NOW()
  WHERE id = p_quiz_id
  RETURNING creator_id, group_id INTO quiz_creator, quiz_group;

  -- Update group stats
  UPDATE public.groups
  SET total_plays = total_plays + 1
  WHERE id = quiz_group;

  -- Update creator stats
  UPDATE public.profiles
  SET total_plays_received = total_plays_received + 1,
      updated_at = NOW()
  WHERE id = quiz_creator;

  -- Recalculate difficulty
  PERFORM public.recalculate_difficulty(p_quiz_id);

  -- Calculate percentile
  SELECT COUNT(*) INTO total_plays_count FROM public.plays WHERE quiz_id = p_quiz_id;
  SELECT COUNT(*) INTO worse_plays_count FROM public.plays
    WHERE quiz_id = p_quiz_id AND score < p_score;

  IF total_plays_count > 0 THEN
    pct := ROUND((worse_plays_count::NUMERIC / total_plays_count) * 100);
  ELSE
    pct := 50;
  END IF;

  RETURN QUERY SELECT new_play_id, pct;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTIONS: Increment quiz report count + auto-flag
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_report()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.quizzes
  SET report_count = report_count + 1,
      status = CASE WHEN report_count + 1 >= 5 THEN 'flagged' ELSE status END
  WHERE id = NEW.quiz_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_report_insert
  AFTER INSERT ON public.reports
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_report();

-- ============================================
-- FUNCTIONS: Update creator quiz count on quiz insert
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_quiz()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET total_quizzes_created = total_quizzes_created + 1,
      updated_at = NOW()
  WHERE id = NEW.creator_id;

  UPDATE public.groups
  SET quiz_count = quiz_count + 1
  WHERE id = NEW.group_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_quiz_insert
  AFTER INSERT ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_quiz();
