-- v11-p4-comment-likes.sql - UX v11 run, agent P4 (quiz results comments). NOT APPLIED.
-- OWNER APPLIES THIS BY HAND, after a backup point (Supabase PITR). Never applied by an agent.
--
-- WHY. The v11 results comments (DESIGN-SPEC 17.7 "comment likes are a heart + count,
-- pink when liked"; WIRING-MAP v11 "Comment like heart: toggle like with count";
-- prototype #end: every comment row has a heart + count and Reply) need two stores
-- that do not exist today. Checked 2026-09-27 against the live schema (read-only
-- probe): no quiz_comment_likes / comment_likes table, no quiz_comments.parent_id or
-- like_count column; the `likes` table (migration 009) is quiz likes only, and P8's
-- pending community_likes does not cover quiz comments.
--
-- WHAT (additive only: three new tables, one new read function; no existing table,
-- column, row, policy or function changes; no backfill):
--   1. quiz_comment_replies      replies on a quiz comment, one level of nesting (a reply
--                                points at a top-level quiz_comments row). Same content
--                                rule as quiz_comments (1..200 characters). The replier's
--                                best score on the quiz is attached like the comment
--                                endpoint does. No username column: names are read from
--                                profiles, so a row cannot carry a spoofed name.
--   2. quiz_comment_likes        one heart per fan per comment (primary key).
--      quiz_comment_reply_likes  one heart per fan per reply (primary key).
--   3. quiz_comment_like_counts(uuid[], uuid[])  heart counts per comment / reply, as
--                                aggregates only (who liked is not public).
--
-- PRIVACY + WRITES. Replies are public like quiz_comments (public SELECT). Hearts have
-- no public SELECT: a fan reads only their own rows (to show their pressed hearts);
-- counts come from the aggregate function. Writes go through the flag-gated routes
-- under /api/ux-v1/p4/comments/** only:
--   - replies: NO insert policy; the route inserts with the service role after checking
--     the session, the parent comment, the length and a rate cap (5 per minute), and
--     derives quiz_id and the score server side;
--   - hearts: insert / delete of the caller's own row (auth.uid() = user_id), through
--     the caller's session.
-- A fan may delete their own reply (same rule as quiz_comments). Account deletion
-- cascades (auth.users), and deleting a comment removes its replies and hearts.
--
-- FAIL SOFT UNTIL APPLIED: GET /api/ux-v1/p4/comments answers { live: false } (probe:
-- a SELECT on quiz_comment_replies + the count function), so the results comments show
-- no heart and no Reply (no dead controls), exactly as today; POST
-- /api/ux-v1/p4/comments/like and /reply answer 503 not_live BEFORE any write. Once
-- applied, the controls turn on by themselves within 5 minutes (probe cache).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. replies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_comment_replies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.quiz_comments(id) ON DELETE CASCADE,
  quiz_id    UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 200),
  score      INT,
  total      INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_comment_replies_comment ON public.quiz_comment_replies (comment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_quiz_comment_replies_user ON public.quiz_comment_replies (user_id, created_at DESC);
ALTER TABLE public.quiz_comment_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_comment_replies_read ON public.quiz_comment_replies
  FOR SELECT USING (true);
CREATE POLICY quiz_comment_replies_delete_own ON public.quiz_comment_replies
  FOR DELETE USING (auth.uid() = user_id);
-- (no INSERT / UPDATE policy: inserts come from the route, service role)

COMMENT ON TABLE public.quiz_comment_replies IS
  'Replies (<=200 chars) on a quiz comment, one level. Written by /api/ux-v1/p4/comments/reply.';

-- ---------------------------------------------------------------------------
-- 2. hearts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_comment_likes (
  comment_id UUID NOT NULL REFERENCES public.quiz_comments(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_quiz_comment_likes_user ON public.quiz_comment_likes (user_id, created_at DESC);
ALTER TABLE public.quiz_comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_comment_likes_read_own ON public.quiz_comment_likes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quiz_comment_likes_insert_own ON public.quiz_comment_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quiz_comment_likes_delete_own ON public.quiz_comment_likes
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.quiz_comment_reply_likes (
  reply_id   UUID NOT NULL REFERENCES public.quiz_comment_replies(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reply_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_quiz_comment_reply_likes_user ON public.quiz_comment_reply_likes (user_id, created_at DESC);
ALTER TABLE public.quiz_comment_reply_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quiz_comment_reply_likes_read_own ON public.quiz_comment_reply_likes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY quiz_comment_reply_likes_insert_own ON public.quiz_comment_reply_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY quiz_comment_reply_likes_delete_own ON public.quiz_comment_reply_likes
  FOR DELETE USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 3. heart counts (aggregates only). SECURITY DEFINER because the heart rows are not
--    publicly readable; it returns one count per id and nothing else. Inputs are capped
--    here at 100 comment ids and 500 reply ids (the route sends at most 50 and 400).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.quiz_comment_like_counts(p_comment_ids uuid[], p_reply_ids uuid[])
RETURNS TABLE(kind text, target_id uuid, likes int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select 'comment'::text, l.comment_id, count(*)::int
  from public.quiz_comment_likes l
  where l.comment_id = any (coalesce(p_comment_ids[1:100], '{}'::uuid[]))
  group by l.comment_id
  union all
  select 'reply'::text, r.reply_id, count(*)::int
  from public.quiz_comment_reply_likes r
  where r.reply_id = any (coalesce(p_reply_ids[1:500], '{}'::uuid[]))
  group by r.reply_id;
$$;

REVOKE ALL ON FUNCTION public.quiz_comment_like_counts(uuid[], uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quiz_comment_like_counts(uuid[], uuid[]) TO anon, authenticated, service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ROLLBACK (run only if the owner wants the feature gone; drops the new objects and
-- their rows, touches nothing else):
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.quiz_comment_like_counts(uuid[], uuid[]);
-- DROP TABLE IF EXISTS public.quiz_comment_reply_likes;
-- DROP TABLE IF EXISTS public.quiz_comment_likes;
-- DROP TABLE IF EXISTS public.quiz_comment_replies;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
