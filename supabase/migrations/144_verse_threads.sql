-- 144_verse_threads.sql
-- Workstream V-COMM-3 - THE ONE migration. Run manually in the prod SQL editor;
-- NOT auto-applied.
--
-- The routed V-PAGES finding: discussions have no thread route or permalink. Today
-- a "discussion" is a set of verse_discussions rows anchored to an (entity_type,
-- entity_id) with one level of parent_id replies (migration 133). It cannot be
-- linked to directly, and there is no cross-space feed of activity.
--
-- This migration adds:
--   1. verse_threads    - an addressable, titled discussion thread in a space
--                         (id + slug = the permalink, title, group_id = space ref,
--                         created_by, timestamps, optional origin anchor). Each
--                         existing top-level discussion becomes one thread.
--   2. verse_discussions.thread_id - reply linkage: every comment (top-level and
--                         reply) belongs to a thread; the existing comment
--                         machinery reparents onto it (no rows orphaned).
--   3. verse_spaces.feed_opt_in    - the per-space opt-in that lets a space
--                         surface its highlights into the GLOBAL cross-space feed
--                         (default OFF; a non-opted space stays out).
--
-- Cleanup policy (consistent with essay series): created_by is a bare nullable
-- UUID; account deletion NULLS it and the thread/content persists. Wrapped in a
-- transaction: it alters shipped tables and backfills, so half-application must be
-- impossible.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. verse_threads
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verse_threads (
  id          BIGSERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL CHECK (slug ~ '^[a-z0-9-]{1,120}$'),
  title       TEXT NOT NULL,
  created_by  UUID,                        -- nulled on account deletion; thread persists
  entity_type TEXT,                        -- origin anchor (group/essay/idol...); NULL = a native community thread
  entity_id   TEXT,
  status      TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible','hidden','removed')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, slug)
);
CREATE INDEX IF NOT EXISTS verse_threads_group_idx ON public.verse_threads (group_id, status, updated_at DESC);
-- Public read of visible threads (community content), exactly like verse_discussions;
-- writes go through the service-role client after the app checks role + moderation.
ALTER TABLE public.verse_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY verse_threads_public_read ON public.verse_threads FOR SELECT USING (status = 'visible');

-- ---------------------------------------------------------------------------
-- 2. reply linkage on the existing comment table
-- ---------------------------------------------------------------------------
ALTER TABLE public.verse_discussions ADD COLUMN IF NOT EXISTS thread_id BIGINT REFERENCES public.verse_threads(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS verse_discussions_thread_idx ON public.verse_discussions (thread_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. per-space cross-space-feed opt-in
-- ---------------------------------------------------------------------------
ALTER TABLE public.verse_spaces ADD COLUMN IF NOT EXISTS feed_opt_in BOOLEAN NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 4. migrate existing discussions -> threads (reuse rows, do not orphan).
--    Each top-level comment (parent_id IS NULL) becomes a thread; its title is
--    an excerpt of its body; the comment and its replies reparent onto it.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r RECORD; new_id BIGINT; gid INTEGER; ttl TEXT; slg TEXT; cb UUID;
BEGIN
  FOR r IN SELECT * FROM public.verse_discussions WHERE parent_id IS NULL AND thread_id IS NULL LOOP
    -- Resolve the space that owns this discussion's anchor.
    gid := NULL;
    IF r.entity_type = 'group' THEN gid := r.entity_id::integer;
    ELSIF r.entity_type = 'essay' THEN SELECT group_id INTO gid FROM public.verse_essays WHERE id = r.entity_id::integer;
    END IF;
    IF gid IS NULL THEN CONTINUE; END IF;  -- unresolvable anchor (none exist today): leave the rows as-is
    ttl := COALESCE(NULLIF(btrim(left(r.body, 80)), ''), 'Discussion');
    -- verse_discussions.author is UUID NOT NULL (migration 133): always a real
    -- user id, never the literal 'anonymous' (that is verse_revisions.author,
    -- which is TEXT). No regex, no cast.
    cb := r.author;
    new_id := nextval(pg_get_serial_sequence('public.verse_threads','id'));
    slg := left(NULLIF(regexp_replace(lower(ttl), '[^a-z0-9]+', '-', 'g'), ''), 50);
    slg := btrim(COALESCE(slg, 'thread'), '-');
    slg := COALESCE(NULLIF(slg, ''), 'thread') || '-' || new_id;
    INSERT INTO public.verse_threads (id, group_id, slug, title, created_by, entity_type, entity_id, status, created_at, updated_at)
      VALUES (new_id, gid, slg, ttl, cb, r.entity_type, r.entity_id, 'visible', r.created_at, r.updated_at);
    UPDATE public.verse_discussions SET thread_id = new_id WHERE id = r.id OR parent_id = r.id;
  END LOOP;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
