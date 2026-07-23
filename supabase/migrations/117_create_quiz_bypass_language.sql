-- Migration 117: re-issue create_quiz_bypass with language (Workstream Q-B2).
-- Run manually in the prod SQL editor; not auto-applied. MUST run after 116.
--
-- create_quiz_bypass has a FIXED INSERT column list, so adding quizzes.language
-- in 116 is not enough: without re-issuing this function, every quiz published
-- through the funnel would silently fall back to the column DEFAULT ('en') and
-- the creator's language pick would be dropped. This migration is the audit's
-- "easy-to-miss" item (Workstream Q report, section 5.2).
--
-- Behaviour unchanged from mig 048 except: language is read from the payload,
-- defaulting to 'en' when absent, and added to the INSERT.

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
    language,
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
    coalesce(p_data->>'language', 'en'),
    p_data->'questions',
    p_data->'settings',
    (p_data->>'question_count')::INTEGER,
    v_cover_image_url
  )
  RETURNING id, slug INTO v_id, v_slug;

  RETURN jsonb_build_object('id', v_id, 'slug', v_slug);
END;
$$;

-- create_quiz_bypass EXECUTE stays revoked from anon/authenticated (migs 081/082);
-- CREATE OR REPLACE preserves existing grants, so no re-revoke is needed.
NOTIFY pgrst, 'reload schema';
