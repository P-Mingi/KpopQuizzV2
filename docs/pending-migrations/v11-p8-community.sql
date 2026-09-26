-- v11-p8-community.sql  (UX v11 run, agent P8 Community). NOT APPLIED.
--
-- What it unlocks (DESIGN-SPEC 17.7, 13.2, 16.7 community): the four stores the
-- community needs that do not exist today. Everything else in /community already
-- runs on existing tables through existing endpoints (threads = verse_threads +
-- verse_discussions, blogs = verse_essays + verse_essay_reactions, the daily debate
-- = daily_debates + debate_votes, Happening now = activity_events + activity_cheers,
-- follows = follows). Until this file is applied the code fails soft: hearts on
-- threads, debates and replies are hidden, the editor's Debate and Challenge modes
-- are disabled with an honest line, and every /api/ux-v1/p8 write route answers
-- 503 {"error":"not_live"} BEFORE any write (lib/ux-v1/p8/features.ts probes).
--
--   1. community_likes         hearts on threads, debates, challenges and replies
--                              (blogs keep verse_essay_reactions).
--   2. community_debates       fan debates: 2 to 4 options, closes after 1, 3 or 7 days.
--      community_debate_votes  one vote per fan per debate.
--   3. community_challenges    a fan publishes one of their own quiz runs as a public
--                              challenge ("Beat my 7/8 on ...").
--   4. community_replies       replies on fan debates and challenge posts (one level of
--                              nesting), the replier's score is read from plays.
--
-- Data-safety contract (PHASE0-ANSWERS-AND-DATA-SAFETY.md): additive only (CREATE
-- TABLE / INDEX / POLICY), no change to any existing table, row, policy or function,
-- no backfill. RLS on every table. Public SELECT only on visible posts and replies;
-- likes and votes have NO public policy (who liked or voted is not public: counts are
-- aggregated server side with the service role, and a fan reads only their own rows
-- through /api/ux-v1/p8/viewer). No INSERT / UPDATE / DELETE policy: every write goes
-- through the service-role client in app/api/ux-v1/p8/*, after the route checks the
-- session, the payload, a rate cap and the banned-term rules (lib/verse/moderation).
--
-- Apply: owner, after a backup point (Supabase PITR), in the SQL editor. Then the
-- controls turn on by themselves within 5 minutes (feature probe cache).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. community_likes
--    target_type: 'thread' (verse_threads.id), 'daily_debate' (daily_debates.date),
--    'debate' (community_debates.id), 'challenge' (community_challenges.id),
--    'comment' (verse_discussions.id: thread replies and blog comments),
--    'debate_vote' (debate_votes.id: the daily debate's replies),
--    'reply' (community_replies.id).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_likes (
  target_type TEXT NOT NULL CHECK (target_type IN ('thread','daily_debate','debate','challenge','comment','debate_vote','reply')),
  target_id   TEXT NOT NULL CHECK (char_length(target_id) BETWEEN 1 AND 64),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (target_type, target_id, user_id)
);
CREATE INDEX IF NOT EXISTS community_likes_user_idx ON public.community_likes (user_id, created_at DESC);
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
-- (no policy: private; service role only)

-- ---------------------------------------------------------------------------
-- 2. fan debates + votes
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_debates (
  id         BIGSERIAL PRIMARY KEY,
  group_id   INTEGER REFERENCES public.groups(id) ON DELETE SET NULL,
  author     UUID REFERENCES auth.users(id) ON DELETE SET NULL,   -- nulled on account deletion; the debate stays
  question   TEXT NOT NULL CHECK (char_length(question) BETWEEN 5 AND 160),
  body       TEXT CHECK (body IS NULL OR char_length(body) <= 2000),
  options    JSONB NOT NULL CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 4),
  closes_at  TIMESTAMPTZ NOT NULL,
  status     TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_debates_feed_idx ON public.community_debates (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_debates_group_idx ON public.community_debates (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS community_debates_author_idx ON public.community_debates (author, created_at DESC);
ALTER TABLE public.community_debates ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_debates_public_read ON public.community_debates FOR SELECT USING (status = 'visible');

CREATE TABLE IF NOT EXISTS public.community_debate_votes (
  debate_id    BIGINT NOT NULL REFERENCES public.community_debates(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index SMALLINT NOT NULL CHECK (option_index BETWEEN 0 AND 3),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (debate_id, user_id)                                -- one vote per fan
);
ALTER TABLE public.community_debate_votes ENABLE ROW LEVEL SECURITY;
-- (no policy: private; tallies are aggregated server side)

-- ---------------------------------------------------------------------------
-- 3. challenge posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_challenges (
  id           BIGSERIAL PRIMARY KEY,
  author       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  quiz_id      UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  play_id      UUID UNIQUE REFERENCES public.plays(id) ON DELETE SET NULL,  -- the run the score comes from; one post per run
  group_id     INTEGER REFERENCES public.groups(id) ON DELETE SET NULL,
  score        INTEGER NOT NULL CHECK (score >= 0),
  total        INTEGER NOT NULL CHECK (total > 0 AND score <= total),
  time_seconds INTEGER CHECK (time_seconds IS NULL OR time_seconds >= 0),
  message      TEXT CHECK (message IS NULL OR char_length(message) <= 280),
  status       TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_challenges_feed_idx ON public.community_challenges (status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_challenges_quiz_idx ON public.community_challenges (quiz_id);
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_challenges_public_read ON public.community_challenges FOR SELECT USING (status = 'visible');

-- ---------------------------------------------------------------------------
-- 4. replies on fan debates and challenge posts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.community_replies (
  id          BIGSERIAL PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('debate','challenge')),
  target_id   BIGINT NOT NULL,
  parent_id   BIGINT REFERENCES public.community_replies(id) ON DELETE CASCADE,  -- one level of nesting (the route checks)
  author      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  body        TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  status      TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','deleted')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_replies_target_idx ON public.community_replies (target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS community_replies_author_idx ON public.community_replies (author, created_at DESC);
ALTER TABLE public.community_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY community_replies_public_read ON public.community_replies FOR SELECT USING (status = 'visible');

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Rollback (run only if the owner wants the feature gone; drops the new tables and
-- their rows, touches nothing else):
-- BEGIN;
-- DROP TABLE IF EXISTS public.community_replies;
-- DROP TABLE IF EXISTS public.community_challenges;
-- DROP TABLE IF EXISTS public.community_debate_votes;
-- DROP TABLE IF EXISTS public.community_debates;
-- DROP TABLE IF EXISTS public.community_likes;
-- COMMIT;
-- NOTIFY pgrst, 'reload schema';
