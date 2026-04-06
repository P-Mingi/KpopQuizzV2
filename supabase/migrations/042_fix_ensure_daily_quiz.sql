-- Fix ensure_daily_quiz: remove description (column doesn't exist on quizzes table)
CREATE OR REPLACE FUNCTION public.ensure_daily_quiz(p_date TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_id UUID;
  v_bank        RECORD;
  v_group_id    INTEGER;
  v_slug        TEXT;
  v_new_id      UUID;
  v_questions   JSONB;
BEGIN
  SELECT id INTO v_existing_id
  FROM quizzes
  WHERE is_quiz_of_the_day = true AND quiz_of_the_day_date = p_date::DATE
  LIMIT 1;
  IF v_existing_id IS NOT NULL THEN
    RETURN v_existing_id;
  END IF;

  SELECT * INTO v_bank
  FROM quiz_bank
  WHERE scheduled_date = p_date::DATE AND status IN ('verified', 'scheduled')
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_group_id := v_bank.group_id;
  IF v_group_id IS NULL THEN
    SELECT id INTO v_group_id FROM groups WHERE slug = 'general-kpop' LIMIT 1;
  END IF;
  IF v_group_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_agg(q - 'source')
  INTO v_questions
  FROM jsonb_array_elements(v_bank.questions) q;

  v_slug := lower(regexp_replace(regexp_replace(v_bank.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  v_slug := substr(v_slug, 1, 60);
  IF v_slug = '' THEN v_slug := 'quiz'; END IF;
  IF EXISTS (SELECT 1 FROM quizzes WHERE slug = v_slug) THEN
    v_slug := v_slug || '-' || floor(extract(epoch from now()))::bigint;
  END IF;

  UPDATE quizzes
  SET is_quiz_of_the_day = false, quiz_of_the_day_date = NULL
  WHERE quiz_of_the_day_date = p_date::DATE;

  INSERT INTO quizzes (
    title, creator_id, group_id, slug,
    quiz_type, difficulty, questions, question_count, settings,
    status, is_quiz_of_the_day, quiz_of_the_day_date
  ) VALUES (
    v_bank.title,
    '00000000-0000-0000-0000-000000000001',
    v_group_id,
    v_slug,
    coalesce(v_bank.quiz_type, 'multiple_choice'),
    coalesce(v_bank.difficulty, 'medium'),
    v_questions,
    jsonb_array_length(v_questions),
    '{"timer":true,"timer_seconds":15,"shuffle":true,"show_answers":false}'::jsonb,
    'published',
    true,
    p_date::DATE
  )
  RETURNING id INTO v_new_id;

  UPDATE quiz_bank
  SET status = 'published', published_quiz_id = v_new_id, updated_at = now()
  WHERE id = v_bank.id;

  INSERT INTO qotd_log (quiz_id, featured_date, selection_method)
  VALUES (v_new_id, p_date::DATE, 'bank')
  ON CONFLICT (featured_date) DO UPDATE
    SET quiz_id = EXCLUDED.quiz_id, selection_method = 'bank';

  RETURN v_new_id;
END;
$$;
