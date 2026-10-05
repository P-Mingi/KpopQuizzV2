-- v12-g9-editorial.sql  (V12 run, agent G9 Editorial seeding). NOT APPLIED.
--
-- WHAT
--   1. Table  public.editorial_accounts   which auth users are editorial (team) accounts
--                                         (user_id, display_name, beat, active). SYSTEM.md 5.6.
--   2. Table  public.editorial_drafts     the review pipeline, columns exactly as SYSTEM.md 5.6
--                                         (id, account_id, kind, group_id, title, body, options,
--                                         sources, scheduled_at, status, created_by, reviewed_by,
--                                         reviewed_at, published_ref) plus four working columns
--                                         (debate_days, template_key, published_at, created_at /
--                                         updated_at) the publisher rules need.
--   3. Table  public.editorial_posts      the published threads and blogs of editorial accounts.
--                                         Fan debates already have a store (community_debates,
--                                         v11-p8-community.sql); threads and blogs do not have a
--                                         public one outside the Verse, so they get this table.
--   4. Func   public.is_editorial(uuid)   true for an ACTIVE editorial account. For the boards,
--                                         counts and XP paths that must leave them out.
--   5. Two CHECK constraints widened (community_likes.target_type, community_replies.target_type)
--      to accept 'editorial', so fans can like and reply to an editorial thread or blog through
--      the stores the community already uses. Skipped without error when v11-p8-community.sql
--      has not been applied (the tables do not exist yet); rerun this file after applying it.
--
-- WHY
--   The community must not look empty at launch (SYSTEM.md 5.6). A few named team accounts open
--   topics, debates and blogs on a schedule; the owner checks every item in /admin/editorial; a
--   cron publishes what is approved and due. Fans reply, vote and like.
--
-- ROWS
--   None. No row is inserted, updated or deleted by this file, in any table. The account rows are
--   inserted by the owner with v12-g9-editorial-accounts.sql, from ids he creates himself.
--   No existing table is changed except the two CHECK constraints of item 5 (widened only: every
--   row that passed before still passes).
--
-- WHAT IT UNLOCKS
--   /admin/editorial shows its queue instead of the "not applied yet" line, the admin routes
--   /api/admin/editorial start writing drafts, the cron /api/cron/editorial-publish starts
--   publishing approved drafts, and the Team badge shows wherever an editorial account is named.
--   All of it also needs NEXT_PUBLIC_UX_V12=1 (and NEXT_PUBLIC_UX_V1=1) at build. Until then
--   every one of those answers 404 or does nothing.
--
-- SAFETY
--   Idempotent (IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS before ADD). RLS on the
--   three tables. editorial_accounts and editorial_drafts have NO policy: anon and authenticated
--   read and write nothing; the service role writes, and an admin reads through the server after
--   the app's admin gate (lib/admin.ts isAdmin, the same gate as every /admin page). The public
--   reads only visible editorial_posts. Nothing publishes without a reviewer: a CHECK refuses an
--   approved or published draft whose reviewed_by is null.
--
-- VERIFY (read only, after applying)
--   SELECT to_regclass('public.editorial_accounts'), to_regclass('public.editorial_drafts'),
--          to_regclass('public.editorial_posts');                       -- three names, no null
--   SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('editorial_accounts','editorial_drafts','editorial_posts');  -- all true
--   SELECT tablename, policyname FROM pg_policies WHERE tablename LIKE 'editorial_%';
--                                                -- one row: editorial_posts_public_read
--   SELECT public.is_editorial('00000000-0000-0000-0000-000000000000');  -- false
--   SELECT count(*) FROM public.editorial_accounts;                      -- 0 until the accounts file
--
-- UNDO (drops the three tables and their rows, restores the two CHECKs; touches nothing else)
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.is_editorial(uuid);
--   DROP TABLE IF EXISTS public.editorial_posts;
--   DROP TABLE IF EXISTS public.editorial_drafts;
--   DROP TABLE IF EXISTS public.editorial_accounts;
--   -- only if no 'editorial' row exists in them (DELETE those rows first otherwise):
--   ALTER TABLE public.community_likes DROP CONSTRAINT IF EXISTS community_likes_target_type_check;
--   ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_target_type_check
--     CHECK (target_type IN ('thread','daily_debate','debate','challenge','comment','debate_vote','reply'));
--   ALTER TABLE public.community_replies DROP CONSTRAINT IF EXISTS community_replies_target_type_check;
--   ALTER TABLE public.community_replies ADD CONSTRAINT community_replies_target_type_check
--     CHECK (target_type IN ('debate','challenge'));
--   COMMIT;
--   NOTIFY pgrst, 'reload schema';

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. editorial_accounts
--    One row per team account. The auth user is created by the owner (normal
--    sign-up or the Supabase dashboard). No agent creates one.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_accounts (
  user_id      uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 1 AND 40),
  beat         text NOT NULL CHECK (char_length(btrim(beat)) BETWEEN 1 AND 80),
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.editorial_accounts IS 'V12: editorial (team) accounts. They always show the Team badge and never act as fans. Rows inserted by the owner.';
ALTER TABLE public.editorial_accounts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.editorial_accounts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.editorial_accounts TO service_role;
-- (no policy: service role only; the app reads the active ids server side)

-- ---------------------------------------------------------------------------
-- 2. editorial_drafts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_drafts (
  id            bigserial PRIMARY KEY,
  account_id    uuid NOT NULL REFERENCES public.editorial_accounts (user_id) ON DELETE RESTRICT,
  kind          text NOT NULL CHECK (kind IN ('thread','debate','blog')),
  group_id      integer REFERENCES public.groups (id) ON DELETE SET NULL,
  title         text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  body          text NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  options       jsonb,                                   -- a debate: array of 2 to 4 labels; null otherwise
  sources       jsonb NOT NULL DEFAULT '[]'::jsonb,      -- [{ "label": text, "url": text | null }]
  scheduled_at  timestamptz,
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','published','rejected')),
  created_by    uuid REFERENCES auth.users (id) ON DELETE SET NULL,   -- null = made by a template
  reviewed_by   uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  published_ref text,                                    -- 'debate:<community_debates.id>' or 'post:<editorial_posts.id>'
  -- working columns (not in SYSTEM.md 5.6):
  debate_days   smallint CHECK (debate_days IS NULL OR debate_days IN (1, 3, 7)),
  template_key  text,                                    -- 'weekly_recap:2026-09-28', 'comeback:412': one draft per key
  published_at  timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editorial_drafts_options_chk CHECK (
    (kind = 'debate' AND options IS NOT NULL AND jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 4)
    OR (kind <> 'debate' AND options IS NULL)
  ),
  CONSTRAINT editorial_drafts_sources_chk CHECK (jsonb_typeof(sources) = 'array'),
  -- Nothing is approved or published without a reviewer and a review time.
  CONSTRAINT editorial_drafts_reviewed_chk CHECK (
    status IN ('draft','rejected') OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  ),
  -- An approved draft has its date; a published one has its reference and time.
  CONSTRAINT editorial_drafts_schedule_chk CHECK (status <> 'approved' OR scheduled_at IS NOT NULL),
  CONSTRAINT editorial_drafts_published_chk CHECK (status <> 'published' OR (published_ref IS NOT NULL AND published_at IS NOT NULL))
);
COMMENT ON TABLE public.editorial_drafts IS 'V12: editorial review pipeline (draft, approved, published, rejected). Service role writes; admins read through the server.';
CREATE INDEX IF NOT EXISTS editorial_drafts_due_idx ON public.editorial_drafts (scheduled_at) WHERE status = 'approved';
CREATE INDEX IF NOT EXISTS editorial_drafts_published_idx ON public.editorial_drafts (published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS editorial_drafts_status_idx ON public.editorial_drafts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS editorial_drafts_account_idx ON public.editorial_drafts (account_id);
CREATE UNIQUE INDEX IF NOT EXISTS editorial_drafts_template_key_uq ON public.editorial_drafts (template_key) WHERE template_key IS NOT NULL;
ALTER TABLE public.editorial_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.editorial_drafts FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.editorial_drafts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.editorial_drafts_id_seq TO service_role;
-- (no policy: service role only)

-- ---------------------------------------------------------------------------
-- 3. editorial_posts: published editorial threads and blogs.
--    Plain text body (paragraphs split on blank lines), sources listed under it.
--    One post per draft (draft_id unique): a retried publish can never post twice.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.editorial_posts (
  id         bigserial PRIMARY KEY,
  draft_id   bigint UNIQUE REFERENCES public.editorial_drafts (id) ON DELETE SET NULL,
  kind       text NOT NULL CHECK (kind IN ('thread','blog')),
  group_id   integer REFERENCES public.groups (id) ON DELETE SET NULL,
  author     uuid REFERENCES public.editorial_accounts (user_id) ON DELETE SET NULL,
  title      text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 160),
  body       text NOT NULL DEFAULT '' CHECK (char_length(body) <= 20000),
  sources    jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sources) = 'array'),
  status     text NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.editorial_posts IS 'V12: threads and blogs published by editorial accounts, after an admin review. Written only by the publisher (service role).';
CREATE INDEX IF NOT EXISTS editorial_posts_feed_idx ON public.editorial_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS editorial_posts_group_idx ON public.editorial_posts (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS editorial_posts_author_idx ON public.editorial_posts (author);
ALTER TABLE public.editorial_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS editorial_posts_public_read ON public.editorial_posts;
CREATE POLICY editorial_posts_public_read ON public.editorial_posts FOR SELECT TO anon, authenticated USING (status = 'visible');
REVOKE ALL ON TABLE public.editorial_posts FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.editorial_posts TO anon, authenticated;
GRANT ALL ON TABLE public.editorial_posts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.editorial_posts_id_seq TO service_role;

-- ---------------------------------------------------------------------------
-- 4. is_editorial(uuid): true for an active editorial account.
--    SECURITY DEFINER so a board or count that runs as the caller can exclude
--    them without reading the (closed) table. It answers one boolean and
--    nothing else. search_path pinned.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_editorial(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.editorial_accounts a WHERE a.user_id = uid AND a.active);
$$;
COMMENT ON FUNCTION public.is_editorial(uuid) IS 'V12: true when the user is an active editorial (team) account. Use it to leave them out of boards, fan counts and XP.';
REVOKE ALL ON FUNCTION public.is_editorial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_editorial(uuid) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. Likes and replies on an editorial thread or blog use the community stores.
--    target_type 'editorial', target_id = editorial_posts.id. Widening only.
--    Skipped when v11-p8-community.sql is not applied yet.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.community_likes') IS NOT NULL THEN
    ALTER TABLE public.community_likes DROP CONSTRAINT IF EXISTS community_likes_target_type_check;
    ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_target_type_check
      CHECK (target_type IN ('thread','daily_debate','debate','challenge','comment','debate_vote','reply','editorial'));
  ELSE
    RAISE NOTICE 'community_likes does not exist: apply v11-p8-community.sql, then rerun this file (hearts on editorial posts stay hidden until then).';
  END IF;
  IF to_regclass('public.community_replies') IS NOT NULL THEN
    ALTER TABLE public.community_replies DROP CONSTRAINT IF EXISTS community_replies_target_type_check;
    ALTER TABLE public.community_replies ADD CONSTRAINT community_replies_target_type_check
      CHECK (target_type IN ('debate','challenge','editorial'));
  ELSE
    RAISE NOTICE 'community_replies does not exist: apply v11-p8-community.sql, then rerun this file (replies on editorial posts stay closed until then).';
  END IF;
END
$$;

COMMIT;

NOTIFY pgrst, 'reload schema';
