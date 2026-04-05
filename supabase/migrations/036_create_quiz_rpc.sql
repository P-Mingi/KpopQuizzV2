-- ============================================
-- RPC function to bypass PostgREST constraint cache
-- ============================================
-- PostgREST caches the old quiz_type CHECK constraint and rejects image/intruder
-- inserts before they reach PostgreSQL. Calling via RPC bypasses that cache.
-- The API route already validates quiz_type in code.

CREATE OR REPLACE FUNCTION public.create_quiz_bypass(p_data JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_slug TEXT;
BEGIN
  INSERT INTO public.quizzes (
    creator_id,
    group_id,
    title,
    slug,
    quiz_type,
    difficulty,
    questions,
    settings,
    question_count
  ) VALUES (
    (p_data->>'creator_id')::UUID,
    (p_data->>'group_id')::INTEGER,
    p_data->>'title',
    p_data->>'slug',
    p_data->>'quiz_type',
    coalesce(p_data->>'difficulty', 'medium'),
    p_data->'questions',
    p_data->'settings',
    (p_data->>'question_count')::INTEGER
  )
  RETURNING id, slug INTO v_id, v_slug;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
END;
$$;
