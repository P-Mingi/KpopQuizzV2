-- 140_verse_pages.sql
-- Workstream V-PAGES - custom pages with kinds. THE one migration for the whole
-- workstream. Run manually in the prod SQL editor; NOT auto-applied.
-- Prod checked 2026-07-31: 139 applied; verse_pages/aliases/links absent; 140 free.
--
-- Design (per VERSE-PAGES-UNIVERSE 2b/4a + VERSE-APPLICATION-BLUEPRINT 3):
--   1. verse_pages: page METADATA + typed mini-infobox only. The prose body does
--      NOT get a column: it rides the existing verse_content / verse_revisions /
--      verse_drafts rails (entity_type='page', entity_id=page id, section_key=
--      'body') so folding, revisions, diffs, suggest-queue, autosave and the
--      quality engine all work unchanged. verse_content only ever holds the
--      PUBLISHED body (drafts live in verse_revisions/verse_drafts, whose access
--      model already guards them), so a draft page's text is never publicly
--      readable even though verse_content has public read.
--   2. verse_page_aliases: rename -> 301 redirect (the group-alias pattern).
--      Flat slugs, unique per space; nesting is parent_page_id + breadcrumbs,
--      never URL depth.
--   3. verse_page_links: the rabbit-hole ledger. One row per internal wiki
--      mention (source -> target slug). target_page_id NULL = a WANTED page
--      (the red-link moment); resolved on page creation. Feeds what-links-here,
--      the wanted-pages quest surface, and the quality engine.
--   4. verse_content check constraints widened: entity_type += 'page',
--      section_key += 'body'.
--
-- Deliberate non-SQL decisions (enforced in app code, documented here):
--   - `kind` has NO CHECK constraint: kinds are per-verse CONFIG (the V3
--     architecture law; the anime verse later adds kinds without a migration).
--     Server-side validation rejects unknown kinds on every write.
--   - Living-persons exclusions, per-field source requirements, and the
--     ranked-methodology gate are app-layer validation per kind (like the
--     presentation guardrails of 139: policy lives in code, not SQL).
--   - is_stub is computed by the quality engine at save/publish and stored so
--     the sitemap query (published AND NOT stub) stays one cheap index scan.
--   - No updated_at trigger: the app sets it, matching the 127 rails.

-- ---------------------------------------------------------------------------
-- 1. verse_pages - metadata + infobox (body on the verse_content rails)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_pages (
  id              BIGSERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  kind            TEXT NOT NULL,                -- registry-validated in app code
  slug            TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title           TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  parent_page_id  BIGINT REFERENCES public.verse_pages(id) ON DELETE SET NULL,
  infobox         JSONB NOT NULL DEFAULT '{}'::jsonb,  -- typed per kind; facts carry {value, source}
  status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  is_stub         BOOLEAN NOT NULL DEFAULT TRUE,       -- quality-engine computed; sitemap = published AND NOT stub
  created_by      TEXT NOT NULL,                -- user id (house pattern: 127 author TEXT)
  published_at    TIMESTAMPTZ,                  -- set on first publish (newest strips, sitemap lastmod)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_verse_pages_space_status ON public.verse_pages(group_id, status);
CREATE INDEX IF NOT EXISTS idx_verse_pages_space_kind   ON public.verse_pages(group_id, kind);
CREATE INDEX IF NOT EXISTS idx_verse_pages_parent       ON public.verse_pages(parent_page_id);

-- Public read of PUBLISHED pages only; drafts/review reachable solely through the
-- service role (creator + review surfaces). No anon/auth write policies: the API
-- routes are the only writers.
ALTER TABLE public.verse_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_pages_public_read ON public.verse_pages;
CREATE POLICY verse_pages_public_read ON public.verse_pages
  FOR SELECT USING (status = 'published');

-- ---------------------------------------------------------------------------
-- 2. verse_page_aliases - rename redirects (no orphaned URLs, ever)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_page_aliases (
  id          BIGSERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  old_slug    TEXT NOT NULL,
  page_id     BIGINT NOT NULL REFERENCES public.verse_pages(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, old_slug)
);

ALTER TABLE public.verse_page_aliases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_page_aliases_public_read ON public.verse_page_aliases;
CREATE POLICY verse_page_aliases_public_read ON public.verse_page_aliases
  FOR SELECT USING (true);  -- redirects must resolve for everyone

-- ---------------------------------------------------------------------------
-- 3. verse_page_links - what-links-here + wanted pages (the red-link ledger)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.verse_page_links (
  id              BIGSERIAL PRIMARY KEY,
  group_id        INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  source_type     TEXT NOT NULL,    -- 'page' or an entity type ('group','idol','album','era',...)
  source_id       TEXT NOT NULL,
  target_slug     TEXT NOT NULL,    -- the mentioned wiki slug, kept verbatim
  target_page_id  BIGINT REFERENCES public.verse_pages(id) ON DELETE CASCADE,  -- NULL = wanted (red link)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, source_type, source_id, target_slug)
);
CREATE INDEX IF NOT EXISTS idx_verse_page_links_target ON public.verse_page_links(target_page_id);
CREATE INDEX IF NOT EXISTS idx_verse_page_links_wanted ON public.verse_page_links(group_id) WHERE target_page_id IS NULL;

-- Public read: what-links-here renders on published pages, and wanted slugs are
-- the public quest surface by design. Rows carry only slugs and ids, no content.
ALTER TABLE public.verse_page_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS verse_page_links_public_read ON public.verse_page_links;
CREATE POLICY verse_page_links_public_read ON public.verse_page_links
  FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 4. verse_content rails learn the 'page' entity + 'body' section
--    (full current lists from 130 + 127, plus the new values)
-- ---------------------------------------------------------------------------

ALTER TABLE public.verse_content DROP CONSTRAINT IF EXISTS verse_content_entity_type_check;
ALTER TABLE public.verse_content ADD CONSTRAINT verse_content_entity_type_check
  CHECK (entity_type IN ('group', 'group_unit', 'idol', 'album', 'album_track', 'song', 'era', 'tour', 'award', 'show', 'ost', 'page'));

ALTER TABLE public.verse_content DROP CONSTRAINT IF EXISTS verse_content_section_key_check;
ALTER TABLE public.verse_content ADD CONSTRAINT verse_content_section_key_check
  CHECK (section_key IN ('overview', 'lore', 'starter_pack', 'fanchants', 'glossary', 'trivia', 'era_story', 'about', 'body'));
