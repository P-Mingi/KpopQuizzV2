-- Like XP: reward engagement to encourage likes, WITHOUT the farming hole that
-- got the old +2-per-like pruned. The liker earns a little XP for liking, the
-- creator earns a little when their quiz is liked. Guards:
--   * once per (liker, quiz) EVER - a persistent log that survives unlike/relike,
--     so you cannot farm by toggling a like on and off.
--   * self-likes are logged but earn nothing, so you cannot farm your own quizzes.
--   * amounts are small and bounded by the number of distinct quizzes.

CREATE TABLE IF NOT EXISTS public.like_xp_awards (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, quiz_id)
);

-- Server-only: touched exclusively by the SECURITY DEFINER function below (via
-- the service role). No client policies.
ALTER TABLE public.like_xp_awards ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.award_like_xp(p_quiz_id uuid, p_liker_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new boolean;
  v_creator uuid;
  v_liker_xp int := 2;
  v_creator_xp int := 3;
  v_creator_awarded int := 0;
BEGIN
  IF p_liker_id IS NULL THEN
    RETURN jsonb_build_object('liker', 0, 'creator', 0);
  END IF;

  -- Claim the (liker, quiz) slot. If it already existed, no XP (anti-farm).
  WITH ins AS (
    INSERT INTO like_xp_awards (user_id, quiz_id)
    VALUES (p_liker_id, p_quiz_id)
    ON CONFLICT (user_id, quiz_id) DO NOTHING
    RETURNING 1
  )
  SELECT EXISTS (SELECT 1 FROM ins) INTO v_new;

  IF NOT v_new THEN
    RETURN jsonb_build_object('liker', 0, 'creator', 0);
  END IF;

  SELECT creator_id INTO v_creator FROM quizzes WHERE id = p_quiz_id;

  -- Self-like: logged (cannot retry) but earns nothing.
  IF v_creator IS NOT DISTINCT FROM p_liker_id THEN
    RETURN jsonb_build_object('liker', 0, 'creator', 0);
  END IF;

  PERFORM award_xp(p_liker_id, v_liker_xp, 'like_given');
  IF v_creator IS NOT NULL THEN
    PERFORM award_xp(v_creator, v_creator_xp, 'like_received');
    v_creator_awarded := v_creator_xp;
  END IF;

  RETURN jsonb_build_object('liker', v_liker_xp, 'creator', v_creator_awarded);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_like_xp(uuid, uuid) FROM anon, authenticated;
