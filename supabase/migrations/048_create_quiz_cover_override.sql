-- Migration 048: allow manual cover override in create_quiz_bypass.
-- Run manually via supabase db push or psql; not auto-applied.
--
-- Prior to this migration, create_quiz_bypass auto-populated
-- cover_image_url from the first question for image/intruder quizzes and
-- left it NULL for every other type. The quiz creator now has a manual
-- upload field that needs to flow through to the DB.
--
-- New behaviour:
-- 1. If p_data->>'cover_image_url' is non-null and non-empty, use it.
-- 2. Otherwise, fall back to the existing auto-populate logic for
--    image/intruder quizzes.
-- 3. Otherwise, leave NULL.

CREATE OR REPLACE FUNCTION public.create_quiz_bypass(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_slug TEXT;
  v_cover_image_url TEXT;
  v_manual_cover TEXT;
BEGIN
  -- Prefer explicit cover_image_url from the payload
  v_manual_cover := NULLIF(trim(BOTH FROM (p_data->>'cover_image_url')), '');

  IF v_manual_cover IS NOT NULL THEN
    v_cover_image_url := v_manual_cover;
  ELSIF p_data->>'quiz_type' = 'image' THEN
    v_cover_image_url := p_data->'questions'->0->>'image_url';
  ELSIF p_data->>'quiz_type' = 'intruder' THEN
    v_cover_image_url := p_data->'questions'->0->'options'->0->>'image_url';
  ELSE
    v_cover_image_url := NULL;
  END IF;

  INSERT INTO public.quizzes (
    creator_id,
    group_id,
    title,
    slug,
    quiz_type,
    difficulty,
    questions,
    settings,
    question_count,
    cover_image_url
  ) VALUES (
    (p_data->>'creator_id')::UUID,
    (p_data->>'group_id')::INTEGER,
    p_data->>'title',
    p_data->>'slug',
    p_data->>'quiz_type',
    coalesce(p_data->>'difficulty', 'medium'),
    p_data->'questions',
    p_data->'settings',
    (p_data->>'question_count')::INTEGER,
    v_cover_image_url
  )
  RETURNING id, slug INTO v_id, v_slug;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
END;
$$;
