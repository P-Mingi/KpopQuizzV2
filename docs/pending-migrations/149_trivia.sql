-- Migration 149: the TRIVIA base (P5 / O1) - one sourced-fact store per entity.
--
-- DRAFT - awaits owner design confirmation. This table does NOT replace the
-- EXISTING trivia system (apps/quiz/src/lib/trivia/*), which DERIVES group-level
-- facts from quiz fun_facts + a code-based override layer verified against
-- docs/trivia-corpus.json. This adds the capability that system lacks:
--   1. ENTITY-LEVEL facts (album/idol/era/track/award), not just group,
--      so the Verse fact rails + entity pages can pull real trivia.
--   2. STRUCTURED-DATA + CURATOR facts that persist independently of whether
--      a quiz happens to carry them as a fun_fact.
-- The read layer MERGES this stored base with the existing derived facts; the
-- override/covenant discipline already in lib/trivia carries over.
--
-- COVENANT: every row is a REAL sourced fact or it does not exist. `source` is
-- NOT NULL and non-empty by CHECK, so a fact with no provenance cannot be stored.
-- Polymorphic by (entity_kind, entity_id), with a denormalized group_id for the
-- O2 "same-group trivia + quizzes" fast path. `category` reuses the existing
-- TriviaCategory union so stored + derived facts share one taxonomy.

CREATE TABLE IF NOT EXISTS public.trivia (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_kind   text NOT NULL CHECK (entity_kind IN
                  ('group','idol','album','track','era','award')),
  entity_id     text NOT NULL,               -- the entity's own id, as text (polymorphic)
  group_id      integer REFERENCES public.groups(id) ON DELETE CASCADE,
  fact          text NOT NULL CHECK (length(btrim(fact)) BETWEEN 3 AND 280),
  category      text NOT NULL DEFAULT 'fun' CHECK (category IN
                  ('members','music','achievements','history','fun')),  -- = TriviaCategory
  source        text NOT NULL CHECK (length(btrim(source)) > 0),  -- covenant: sourced or nothing
  source_url    text,
  lang          text NOT NULL DEFAULT 'en',
  status        text NOT NULL DEFAULT 'published'
                  CHECK (status IN ('published','draft','hidden')),
  weight        integer NOT NULL DEFAULT 0,  -- higher = surfaced more often
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- A given fact should not be entered twice for the same entity.
CREATE UNIQUE INDEX IF NOT EXISTS trivia_entity_fact_uidx
  ON public.trivia (entity_kind, entity_id, md5(btrim(lower(fact))));

-- Fast paths: all trivia for an entity, and all trivia for a group (O2).
CREATE INDEX IF NOT EXISTS trivia_entity_idx ON public.trivia (entity_kind, entity_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS trivia_group_idx  ON public.trivia (group_id)              WHERE status = 'published';

-- keep updated_at honest
CREATE OR REPLACE FUNCTION public.fn_trivia_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_trivia_touch ON public.trivia;
CREATE TRIGGER trg_trivia_touch BEFORE UPDATE ON public.trivia
  FOR EACH ROW EXECUTE FUNCTION public.fn_trivia_touch();

-- RLS: the world reads PUBLISHED trivia; only authenticated curators/admin write.
-- (Write policies are intentionally minimal here; the curator predicate is applied
--  in the app's service layer, matching how the Verse tables are governed. A public
--  INSERT/UPDATE path is deliberately NOT opened.)
ALTER TABLE public.trivia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trivia_select_published ON public.trivia;
CREATE POLICY trivia_select_published ON public.trivia
  FOR SELECT USING (status = 'published');
