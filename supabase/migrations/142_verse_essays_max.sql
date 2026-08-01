-- 142_verse_essays_max.sql
-- Workstream V-ESSAYS-MAX - the fan blog platform (magazine index, series,
-- reactions, a featured hero). THE ONE migration for the whole workstream. Run
-- manually in the prod SQL editor; NOT auto-applied.
--
-- BACKWARD-COMPATIBLE BY DESIGN. verse_essays (135) already uses status='featured'
-- as its ONLY public state, and the currently-deployed code reads exactly that.
-- Renaming it to 'published' would make the live featured essay vanish the moment
-- this migration runs (before the new code deploys), so instead:
--   * status='featured' KEEPS its meaning = PUBLIC / published (the review flow's
--     existing "feature" action already sets it). The magazine's "latest" and
--     "series" tiers are these public essays.
--   * a NEW is_hero flag marks the ONE magazine HERO per space (the big editorial
--     pick). "Feature / unfeature" in the curator UI toggles is_hero; a partial
--     unique index enforces at most one per group. Existing essays keep is_hero
--     false, so the featured hero min-gates (hidden until a curator picks one).
--
-- Reactions need storage: the only like table in prod is `likes` (quiz-scoped:
-- id, user_id, quiz_id), not a generic per-entity store, so it cannot carry essay
-- reactions. A dedicated table is folded in here (one reaction per user per essay).
--
-- No user-facing AI. No image uploads: cover config references policy-legal assets
-- only (validated in app), never an upload path.
--
-- ATOMIC: the whole migration runs in one transaction. It alters an existing prod
-- table (verse_essays) and builds indexes on the columns it adds, so a partial
-- apply would leave the table in a half-built state; BEGIN/COMMIT makes that
-- impossible (all-or-nothing). No CONCURRENTLY here, so every statement is
-- transaction-safe.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Series: author- or curator-made groupings. New author proposals need a
--    curator to approve (status) before they show publicly.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verse_essay_series (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  slug        TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,120}$'),
  created_by  UUID,
  sort_order  INTEGER NOT NULL DEFAULT 0,             -- shelf order on the index (curator-set)
  status      TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_essay_series_group ON public.verse_essay_series(group_id, sort_order) WHERE status = 'approved';

-- Public read of APPROVED series (the shelves); writes via the service-role API.
ALTER TABLE public.verse_essay_series ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS essay_series_public_read ON public.verse_essay_series;
CREATE POLICY essay_series_public_read ON public.verse_essay_series FOR SELECT USING (status = 'approved');

-- ---------------------------------------------------------------------------
-- 2. verse_essays: the magazine metadata (hero pick, series linkage, cover).
-- ---------------------------------------------------------------------------
ALTER TABLE public.verse_essays
  ADD COLUMN IF NOT EXISTS is_hero      BOOLEAN NOT NULL DEFAULT false,                                  -- the one featured hero per space
  ADD COLUMN IF NOT EXISTS series_id    INTEGER REFERENCES public.verse_essay_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_order INTEGER NOT NULL DEFAULT 0,                                       -- order within its series
  ADD COLUMN IF NOT EXISTS cover        JSONB NOT NULL DEFAULT '{}'::jsonb;                               -- cover config; policy assets only, app-validated

-- At most one featured hero per group (partial unique index).
CREATE UNIQUE INDEX IF NOT EXISTS one_essay_hero_per_group ON public.verse_essays(group_id) WHERE is_hero;
-- The index tier reads public essays newest-first per space.
CREATE INDEX IF NOT EXISTS idx_verse_essays_public ON public.verse_essays(group_id, featured_at DESC, updated_at DESC) WHERE status = 'featured';
-- Series shelves read public essays by series.
CREATE INDEX IF NOT EXISTS idx_verse_essays_series ON public.verse_essays(series_id, series_order) WHERE status = 'featured';

-- ---------------------------------------------------------------------------
-- 3. Reactions: counts-only, one per user per essay (real users; no self-inflation
--    beyond one row). Served via the service role (aggregate counts + the caller's
--    own state); RLS on, no select policy.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verse_essay_reactions (
  id          SERIAL PRIMARY KEY,
  essay_id    INTEGER NOT NULL REFERENCES public.verse_essays(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'heart',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, essay_id)
);
CREATE INDEX IF NOT EXISTS idx_essay_reactions_essay ON public.verse_essay_reactions(essay_id);
ALTER TABLE public.verse_essay_reactions ENABLE ROW LEVEL SECURITY; -- no select policy: served via service role

COMMIT;

NOTIFY pgrst, 'reload schema';
