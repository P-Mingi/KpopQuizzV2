-- Add cover_image_url column to quizzes for image/intruder card banners
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Backfill existing image quizzes (first question's image_url)
UPDATE public.quizzes
SET cover_image_url = questions->0->>'image_url'
WHERE quiz_type = 'image'
  AND questions IS NOT NULL
  AND jsonb_array_length(questions) > 0
  AND cover_image_url IS NULL;

-- Backfill existing intruder quizzes (first option's image_url of first question)
UPDATE public.quizzes
SET cover_image_url = questions->0->'options'->0->>'image_url'
WHERE quiz_type = 'intruder'
  AND questions IS NOT NULL
  AND jsonb_array_length(questions) > 0
  AND cover_image_url IS NULL;

-- Update create_quiz_bypass to auto-populate cover_image_url
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
BEGIN
  IF p_data->>'quiz_type' = 'image' THEN
    v_cover_image_url := p_data->'questions'->0->>'image_url';
  ELSIF p_data->>'quiz_type' = 'intruder' THEN
    v_cover_image_url := p_data->'questions'->0->'options'->0->>'image_url';
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
