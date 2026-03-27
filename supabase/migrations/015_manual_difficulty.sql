-- Remove automatic difficulty recalculation from record_play.
-- Difficulty is now set manually by the quiz creator.
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
