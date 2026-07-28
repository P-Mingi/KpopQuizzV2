-- 127_verse_revisions.sql
-- Workstream W3.1 - the Verse editor's revision spine.
-- Run manually in the prod Supabase SQL editor; NOT auto-applied.
--
-- Rich-text SECTIONS on entity pages (idol lore, album notes, space guides, era
-- stories) are editable, versioned, and per-section granular from day one. This
-- is separate from FACTS: structured facts stay in typed columns + entity_overrides
-- (W1 precedence, living-persons enforced by having no personal-life field). The
-- section_key CHECK is the structural guarantee that no "controversy / dating /
-- personal-life" section TYPE can exist. Content-level abuse is a W4 moderation
-- concern, not a schema one.
--
-- Four tables:
--   verse_content            - the CURRENT content of a (entity, section), + lock
--   verse_revisions          - append-only history (one row per save)
--   verse_drafts             - per-author autosave draft (private)
--   verse_edit_suggestions   - suggest-an-edit queue (W3.7)

-- ---------------------------------------------------------------------------
-- verse_content - live content of one editable section, plus protection (W3.8).
--   entity_id is TEXT (polymorphic, matches entity_sources / entity_overrides).
--   section_key is CHECK-constrained: new section types arrive via future
--   migrations, so a personal-life section type cannot be introduced ad hoc.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_content (
  id                   BIGSERIAL PRIMARY KEY,
  entity_type          TEXT NOT NULL CHECK (entity_type IN ('group', 'group_unit', 'idol', 'album', 'album_track', 'song', 'era')),
  entity_id            TEXT NOT NULL,
  section_key          TEXT NOT NULL CHECK (section_key IN ('overview', 'lore', 'starter_pack', 'fanchants', 'glossary', 'trivia', 'era_story', 'about')),
  content              JSONB NOT NULL DEFAULT '{}'::jsonb,   -- TipTap document JSON
  current_revision_id  BIGINT,
  locked               BOOLEAN NOT NULL DEFAULT FALSE,        -- W3.8 protection
  locked_by            TEXT,
  locked_at            TIMESTAMPTZ,
  lock_reason          TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, section_key)
);
CREATE INDEX IF NOT EXISTS idx_verse_content_entity ON public.verse_content(entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- verse_revisions - append-only history. base_revision_id feeds conflict
--   detection (save is rejected if base no longer matches current).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_revisions (
  id                BIGSERIAL PRIMARY KEY,
  content_id        BIGINT REFERENCES public.verse_content(id) ON DELETE CASCADE,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  section_key       TEXT NOT NULL,
  author            TEXT NOT NULL,             -- user id
  summary           TEXT,
  minor             BOOLEAN NOT NULL DEFAULT FALSE,
  content           JSONB NOT NULL,            -- full snapshot at this revision
  base_revision_id  BIGINT,                    -- the revision this edit was based on
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_revisions_section ON public.verse_revisions(entity_type, entity_id, section_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verse_revisions_content ON public.verse_revisions(content_id, created_at DESC);

ALTER TABLE public.verse_content
  DROP CONSTRAINT IF EXISTS verse_content_current_revision_fk;
ALTER TABLE public.verse_content
  ADD CONSTRAINT verse_content_current_revision_fk
  FOREIGN KEY (current_revision_id) REFERENCES public.verse_revisions(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- verse_drafts - per-author autosave. One live draft per author + section.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_drafts (
  id                BIGSERIAL PRIMARY KEY,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  section_key       TEXT NOT NULL,
  author            TEXT NOT NULL,             -- user id
  content           JSONB NOT NULL,
  base_revision_id  BIGINT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (author, entity_type, entity_id, section_key)
);

-- ---------------------------------------------------------------------------
-- verse_edit_suggestions - suggest-an-edit queue (W3.7). author nullable so
--   anonymous suggestions are allowed; reviewer approves/rejects.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_edit_suggestions (
  id                BIGSERIAL PRIMARY KEY,
  entity_type       TEXT NOT NULL,
  entity_id         TEXT NOT NULL,
  section_key       TEXT NOT NULL,
  author            TEXT,                       -- user id; NULL = anonymous
  content           JSONB NOT NULL,             -- proposed content
  summary           TEXT,
  minor             BOOLEAN NOT NULL DEFAULT FALSE,
  base_revision_id  BIGINT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer          TEXT,
  review_reason     TEXT,
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verse_suggestions_pending ON public.verse_edit_suggestions(entity_type, entity_id, created_at DESC) WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- RLS. Content + revisions are public (rendered pages + public history). Drafts
-- and the suggestion queue are private (service-role / reviewer only). All writes
-- go through the service-role client after an auth + permission check, so there
-- are no write policies.
-- ---------------------------------------------------------------------------

ALTER TABLE public.verse_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verse_revisions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verse_drafts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verse_edit_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS verse_content_public_read ON public.verse_content;
CREATE POLICY verse_content_public_read ON public.verse_content FOR SELECT USING (true);

DROP POLICY IF EXISTS verse_revisions_public_read ON public.verse_revisions;
CREATE POLICY verse_revisions_public_read ON public.verse_revisions FOR SELECT USING (true);

-- verse_drafts + verse_edit_suggestions: RLS enabled, NO select policy -> no
-- anon/authenticated read; the service-role client bypasses RLS for the editor
-- and review routes.

NOTIFY pgrst, 'reload schema';
