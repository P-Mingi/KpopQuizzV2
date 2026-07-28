-- 124_verse_entity_foundation.sql
-- Workstream W1.1 - Verse entity foundation (schema).
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- Extends the EXISTING groups/songs tables as CANONICAL and adds the Verse
-- entity layer: idols, units, albums, tracklists, plus the ingestion spine
-- (seed list, per-fact source attribution, curator overrides).
--
-- Six W0 findings are baked in as structure:
--  1. verse_seed_ids = human-checked QID/MBID resolution (no live label search).
--  2. Canonical precedence: our name/slug/fandom_name/rosters are untouched by
--     ingestion. Open-data facts land in NEW nullable columns + entity_sources.
--     entity_overrides ALWAYS win at read time; refresh never overwrites them.
--  3. Living-persons policy is enforced at FETCH (property allowlist in the
--     backfill scripts). NO personal-life columns exist here by design:
--     no spouse/partner/family/residence/children fields anywhere.
--  4. group_units models NCT-style structures (parent group -> units).
--  5. albums.review_flag / review_reason carry version/reissue ambiguity for a
--     curator instead of guessing.
--  6. album_tracks.song_id links to our songs after title-cleanup matching.
--
-- RLS: display entity tables are public-read (public facts). Ingestion metadata
-- (seed list, overrides) is service-role only. All writes go through the
-- service-role client, which bypasses RLS, so there are no write policies.

-- ---------------------------------------------------------------------------
-- 1. Canonical tables: add NET-NEW open-data columns only (identity untouched).
-- ---------------------------------------------------------------------------

ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS wikidata_qid      TEXT,
  ADD COLUMN IF NOT EXISTS musicbrainz_mbid  TEXT,
  ADD COLUMN IF NOT EXISTS inception_date    DATE,
  ADD COLUMN IF NOT EXISTS origin_country    TEXT,
  ADD COLUMN IF NOT EXISTS official_website  TEXT,
  ADD COLUMN IF NOT EXISTS record_label      TEXT;

ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS musicbrainz_mbid  TEXT;

-- ---------------------------------------------------------------------------
-- 2. group_units - NCT-style sub-units (parent group -> units).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.group_units (
  id                SERIAL PRIMARY KEY,
  parent_group_id   INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  slug              TEXT CHECK (slug IS NULL OR slug ~ '^[a-z0-9-]{1,80}$'),
  wikidata_qid      TEXT,
  musicbrainz_mbid  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_group_id, name)
);
CREATE INDEX IF NOT EXISTS idx_group_units_parent ON public.group_units(parent_group_id);

-- ---------------------------------------------------------------------------
-- 3. idols - member entities. Canonical name comes from our name-all rosters.
--    NO personal-life fields exist here, by policy.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.idols (
  id             SERIAL PRIMARY KEY,
  group_id       INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  unit_id        INTEGER REFERENCES public.group_units(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,               -- canonical (ours, from roster)
  name_romanized TEXT,                         -- open-data / curator
  name_hangul    TEXT,                         -- open-data (P1559), spotty
  birth_date     DATE,                         -- Wikidata P569
  nationality    TEXT,                         -- Wikidata P27
  positions      TEXT[] NOT NULL DEFAULT '{}', -- from roster / curator
  photo_url      TEXT,                         -- from our existing rosters
  wikidata_qid   TEXT,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  ord            INTEGER NOT NULL DEFAULT 0,
  needs_review   BOOLEAN NOT NULL DEFAULT FALSE, -- roster/open-data mismatch flag
  review_reason  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, name)
);
CREATE INDEX IF NOT EXISTS idx_idols_group ON public.idols(group_id);
CREATE INDEX IF NOT EXISTS idx_idols_unit ON public.idols(unit_id);
CREATE INDEX IF NOT EXISTS idx_idols_needs_review ON public.idols(needs_review) WHERE needs_review = TRUE;

-- ---------------------------------------------------------------------------
-- 4. albums + album_tracks. Discography ingestion FILTERS; ambiguity is flagged.
--    cover_source is a NOTE only - no image ingestion in v1.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.albums (
  id                SERIAL PRIMARY KEY,
  group_id          INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  unit_id           INTEGER REFERENCES public.group_units(id) ON DELETE SET NULL,
  title             TEXT NOT NULL,
  release_date      DATE,
  type              TEXT NOT NULL DEFAULT 'album' CHECK (type IN ('album', 'ep', 'single')),
  region            TEXT NOT NULL DEFAULT 'kr' CHECK (region IN ('kr', 'jp', 'other')),
  cover_source      TEXT,                       -- attribution note only, no image
  musicbrainz_mbid  TEXT,                        -- release-group MBID
  review_flag       BOOLEAN NOT NULL DEFAULT FALSE,
  review_reason     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_albums_group ON public.albums(group_id);
CREATE INDEX IF NOT EXISTS idx_albums_review_flag ON public.albums(review_flag) WHERE review_flag = TRUE;
-- One album per release-group; NULL mbid allowed for curator-added albums.
CREATE UNIQUE INDEX IF NOT EXISTS albums_mbid_uniq ON public.albums(musicbrainz_mbid) WHERE musicbrainz_mbid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.album_tracks (
  id                SERIAL PRIMARY KEY,
  album_id          INTEGER NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL,
  title             TEXT NOT NULL,
  song_id           UUID REFERENCES public.songs(id) ON DELETE SET NULL, -- matched to our catalog
  musicbrainz_mbid  TEXT,                        -- recording MBID
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (album_id, position)
);
CREATE INDEX IF NOT EXISTS idx_album_tracks_album ON public.album_tracks(album_id);
CREATE INDEX IF NOT EXISTS idx_album_tracks_song ON public.album_tracks(song_id);

-- ---------------------------------------------------------------------------
-- 5. Ingestion spine: seed list, per-fact source attribution, curator overrides.
--    entity_id is TEXT to hold either integer (groups/idols/albums) or uuid
--    (songs) ids polymorphically.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_seed_ids (
  id                SERIAL PRIMARY KEY,
  group_id          INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE UNIQUE,
  wikidata_qid      TEXT,
  wikidata_label    TEXT,   -- label AS FETCHED, so the owner catches vandalism (the TXT trap)
  musicbrainz_mbid  TEXT,
  musicbrainz_name  TEXT,   -- name AS FETCHED (the FIFTY FIFTY "1:1" trap)
  confidence        TEXT CHECK (confidence IN ('HIGH', 'MEDIUM', 'AMBIGUOUS', 'UNVERIFIED', 'OVERRIDE')),
  checked_by        TEXT,   -- owner id/name; NULL = NOT yet reviewed
  checked_at        TIMESTAMPTZ, -- NULL = NOT yet reviewed (ingestion gate)
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_seed_unchecked ON public.verse_seed_ids(group_id) WHERE checked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.entity_sources (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('group', 'group_unit', 'idol', 'album', 'album_track', 'song')),
  entity_id    TEXT NOT NULL,
  field        TEXT NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('wikidata', 'musicbrainz')),
  source_ref   TEXT,        -- QID / MBID / property id the value came from
  fetched_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field, source)
);
CREATE INDEX IF NOT EXISTS idx_entity_sources_entity ON public.entity_sources(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS public.entity_overrides (
  id           SERIAL PRIMARY KEY,
  entity_type  TEXT NOT NULL CHECK (entity_type IN ('group', 'group_unit', 'idol', 'album', 'album_track', 'song')),
  entity_id    TEXT NOT NULL,
  field        TEXT NOT NULL,
  value        TEXT,        -- curator value; ALWAYS wins over ingestion at read time
  author       TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, field)
);
CREATE INDEX IF NOT EXISTS idx_entity_overrides_entity ON public.entity_overrides(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- 6. RLS. Display entities: public read. Ingestion metadata: service-role only.
--    Writes always go through the service-role client (bypasses RLS).
-- ---------------------------------------------------------------------------

ALTER TABLE public.group_units     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idols           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_tracks    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_sources  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verse_seed_ids  ENABLE ROW LEVEL SECURITY;

-- Public-read display entities (public facts).
DROP POLICY IF EXISTS group_units_public_read ON public.group_units;
CREATE POLICY group_units_public_read ON public.group_units FOR SELECT USING (true);

DROP POLICY IF EXISTS idols_public_read ON public.idols;
CREATE POLICY idols_public_read ON public.idols FOR SELECT USING (active = true);

DROP POLICY IF EXISTS albums_public_read ON public.albums;
CREATE POLICY albums_public_read ON public.albums FOR SELECT USING (true);

DROP POLICY IF EXISTS album_tracks_public_read ON public.album_tracks;
CREATE POLICY album_tracks_public_read ON public.album_tracks FOR SELECT USING (true);

-- Source attribution is public (the citation-over-extraction trust signal).
DROP POLICY IF EXISTS entity_sources_public_read ON public.entity_sources;
CREATE POLICY entity_sources_public_read ON public.entity_sources FOR SELECT USING (true);

-- Overrides + seed list carry internal review state / author ids: service-role
-- only. RLS enabled with NO select policy = no anon/authenticated read; the
-- service-role client bypasses RLS for admin + ingestion.

NOTIFY pgrst, 'reload schema';
