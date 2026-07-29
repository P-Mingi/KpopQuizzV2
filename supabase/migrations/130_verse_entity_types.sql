-- 130_verse_entity_types.sql
-- Workstream W3K.3 - new entity types: tours, awards, shows (TV/variety), OST credits.
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- Coverage probe verdict (read-only Wikidata, 30 groups): only awards are machine-
-- seedable (head-heavy); tours / shows / OST have no usable public dataset. So all
-- four ship with a publish gate: status defaults to 'draft' and RLS exposes ONLY
-- published rows to the public read client. A curator-only entity stays an admin
-- draft until it has real content + a source, then it is published (and indexed).
-- No empty doorway pages. Seeded awards are populated by a follow-up script.
--
-- Living-persons policy holds structurally: these are work/career records (tours,
-- trophies, shows, songs). No dating / family / residence / health fields exist.

-- Narration for the new types reuses the W3 editor (verse_content); allow their
-- entity_type values. section_key already permits 'overview' and 'about'.
ALTER TABLE public.verse_content DROP CONSTRAINT IF EXISTS verse_content_entity_type_check;
ALTER TABLE public.verse_content ADD CONSTRAINT verse_content_entity_type_check
  CHECK (entity_type IN ('group', 'group_unit', 'idol', 'album', 'album_track', 'song', 'era', 'tour', 'award', 'show', 'ost'));

-- Concert tours (group-level; curator-authored, no seed source).
CREATE TABLE IF NOT EXISTS public.tours (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  slug          TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,80}$'),
  tour_type     TEXT,                          -- world / asia / domestic / fan-concert
  start_date    DATE,
  end_date      DATE,
  leg_count     INTEGER,
  city_count    INTEGER,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url    TEXT,
  source_note   TEXT,
  ord           INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, name)
);
CREATE INDEX IF NOT EXISTS idx_tours_group ON public.tours(group_id) WHERE status = 'published';

-- Awards and nominations (group- OR idol-level; awards are partially Wikidata-seedable).
CREATE TABLE IF NOT EXISTS public.awards (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES public.groups(id) ON DELETE CASCADE,
  idol_id       INTEGER REFERENCES public.idols(id) ON DELETE CASCADE,
  award_name    TEXT NOT NULL,                  -- e.g. Melon Music Award
  category      TEXT,                           -- e.g. Song of the Year
  ceremony      TEXT,                           -- e.g. MMA 2023
  year          INTEGER,
  result        TEXT CHECK (result IS NULL OR result IN ('won', 'nominated')),
  wikidata_qid  TEXT,                           -- provenance for seeded rows
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url    TEXT,
  source_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (group_id IS NOT NULL OR idol_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_awards_group ON public.awards(group_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_awards_idol ON public.awards(idol_id) WHERE status = 'published';
CREATE UNIQUE INDEX IF NOT EXISTS uq_awards_seed ON public.awards(group_id, award_name, year) WHERE wikidata_qid IS NOT NULL AND group_id IS NOT NULL;

-- TV / variety / reality / web shows (group- OR idol-level; curator-authored).
CREATE TABLE IF NOT EXISTS public.shows (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES public.groups(id) ON DELETE CASCADE,
  idol_id       INTEGER REFERENCES public.idols(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  slug          TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,80}$'),
  show_type     TEXT,                           -- variety / reality / web / documentary
  network       TEXT,
  year          INTEGER,
  role          TEXT,                           -- host / cast / guest
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url    TEXT,
  source_note   TEXT,
  ord           INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (group_id IS NOT NULL OR idol_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_shows_group ON public.shows(group_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_shows_idol ON public.shows(idol_id) WHERE status = 'published';

-- OST credits (usually idol-level; curator-authored, a MusicBrainz backfill may seed later).
CREATE TABLE IF NOT EXISTS public.osts (
  id            SERIAL PRIMARY KEY,
  group_id      INTEGER REFERENCES public.groups(id) ON DELETE CASCADE,
  idol_id       INTEGER REFERENCES public.idols(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,                  -- the OST song title
  slug          TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,80}$'),
  for_work      TEXT,                           -- the drama / film it belongs to
  work_type     TEXT,                           -- drama / film / game / animation
  release_date  DATE,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url    TEXT,
  source_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (group_id IS NOT NULL OR idol_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_osts_group ON public.osts(group_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_osts_idol ON public.osts(idol_id) WHERE status = 'published';

-- RLS: the public read client sees ONLY published rows (the doorway-page gate);
-- drafts are visible only through the service-role client (admin surfaces + seed).
ALTER TABLE public.tours  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shows  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.osts   ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tours_public_read  ON public.tours;
DROP POLICY IF EXISTS awards_public_read ON public.awards;
DROP POLICY IF EXISTS shows_public_read  ON public.shows;
DROP POLICY IF EXISTS osts_public_read   ON public.osts;
CREATE POLICY tours_public_read  ON public.tours  FOR SELECT USING (status = 'published');
CREATE POLICY awards_public_read ON public.awards FOR SELECT USING (status = 'published');
CREATE POLICY shows_public_read  ON public.shows  FOR SELECT USING (status = 'published');
CREATE POLICY osts_public_read   ON public.osts   FOR SELECT USING (status = 'published');

NOTIFY pgrst, 'reload schema';
