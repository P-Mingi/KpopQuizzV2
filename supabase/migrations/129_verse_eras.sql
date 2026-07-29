-- 129_verse_eras.sql
-- Workstream W3K.1 - the Era system (entity breadth for search domination).
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- Eras are group-level entities (a comeback/concept period) that cluster albums
-- and drive the era-timeline pages (W3K.2). Short concept tagline lives on the
-- row; long narration is an editable 'era_story' section (verse_content, W3
-- editor - entity_type 'era' is already allowed). Facts here are curator-entered;
-- eras can also be auto-SCAFFOLDED from release clusters (scaffolded=true), then
-- narrated by curators.

CREATE TABLE IF NOT EXISTS public.eras (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,80}$'),
  concept       TEXT,                          -- short tagline (long narration = verse_content era_story)
  period_start  DATE,
  period_end    DATE,
  color         TEXT,                          -- era colour-coding (W3K.2 timeline)
  ord           INTEGER NOT NULL DEFAULT 0,
  scaffolded    BOOLEAN NOT NULL DEFAULT FALSE, -- auto-created from a release cluster (vs curator-made)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, name)
);
CREATE INDEX IF NOT EXISTS idx_eras_group ON public.eras(group_id);

-- Album <-> era relation: an album belongs to at most one era.
ALTER TABLE public.albums
  ADD COLUMN IF NOT EXISTS era_id INTEGER REFERENCES public.eras(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_albums_era ON public.albums(era_id) WHERE era_id IS NOT NULL;

-- RLS. Eras are public (they render on timeline/era pages); writes via service-role.
ALTER TABLE public.eras ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS eras_public_read ON public.eras;
CREATE POLICY eras_public_read ON public.eras FOR SELECT USING (true);

NOTIFY pgrst, 'reload schema';
