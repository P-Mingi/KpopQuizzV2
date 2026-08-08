-- 148_verse_pages.sql
-- V-FOUNDATION F1 - PHASE A: the page-tree CORE schema (F0 contract C1-C13, all
-- locked; owner rulings FQ1-FQ7 OUI). Run manually / via MCP in the prod SQL editor
-- after a line-by-line read (L-064). NOT auto-applied. The worker never touches the DB.
--
-- ===========================================================================
-- DECISIONS + DEVIATIONS (stated loudly for the checkpoint read - please rule)
-- ===========================================================================
-- 1. STRANGLER, NOT BIG-BANG (C13) + ADDITIVE ONLY (mission). This migration is
--    PURELY ADDITIVE: it CREATEs new tables and touches NOTHING that exists. The
--    legacy V-PAGES wiki (verse_pages / verse_page_aliases / verse_page_links from
--    migration 140, LIVE - 19 app files read verse_pages) is left byte-untouched.
--    The F1 unified page tree is built BESIDE it. Folding the legacy wiki INTO this
--    system (and retiring verse_pages) is a LATER phase, explicitly OUT of F1 scope.
--
-- 2. TABLE NAMES: the mission + C1/C11 name these tables bare - pages,
--    page_revisions, page_links, redirects, tags, page_tags, nav_menus - and C11
--    says "re-point the builder write target ... to pages.blocks". `verse_pages` is
--    already taken by the legacy wiki, so this NEW core cannot reuse it. I use the
--    BARE names because (a) they match the mission + contract verbatim, (b) they
--    collide with nothing (verified across every migration), and (c) the CORE tables
--    of this DB are unprefixed (groups, idols, songs, games) - and C1 calls pages
--    "ONE PAGE MODEL FOR EVERYTHING", a core model. If the checkpoint prefers a
--    `verse_` prefix (verse_docs / verse_doc_*), it is a mechanical rename here
--    BEFORE apply - nothing downstream is written yet. FLAGGED for your ruling.
--
-- 3. space_id -> groups(id): a "space" is a group's verse space (1:1). This exact
--    column + FK (space_id INTEGER REFERENCES public.groups(id) ON DELETE CASCADE)
--    is the established house pattern (verse_space_assets, 139). Not a deviation.
--
-- 4. created_by / author = uuid (no FK), mirroring 146/147 + verse_space_assets
--    (L-068). The legacy 140 used TEXT; the newer governance work standardized on
--    uuid, which this follows.
--
-- 5. BODY = blocks jsonb (C1/C11: the V-BUILDER-1 composition format becomes the
--    universal document body). This is the deliberate DIFFERENCE from legacy
--    verse_pages, whose body rides the verse_content rails. The two body models
--    coexist during the strangler; F1 pages own their body in-row.
--
-- 6. type has NO db CHECK (per-space config, app-validated) - the same call 140 made
--    for `kind` (the V3 per-verse-config law: the anime verse adds types without a
--    migration). Structural types (portal, index) are enforced in code.
--
-- 7. ADDED beyond the mission's literal column list, REQUIRED by locked contract:
--      - is_stub boolean (C5 mechanical stub noindex: sitemap = published AND NOT
--        stub, one cheap index scan; computed by the app at save/publish, as in 140).
--      - published_at (C5 sitemap lastmod / first-publish marker).
--    Both flagged here; drop them if the checkpoint disagrees.
--
-- 8. No triggers. updated_at + is_stub + rev are set by the app (the 127/140 rails
--    convention: "the app sets it"), keeping the schema inert and the writers honest.
--
-- 9. RLS: pages/redirects/links/tags/page_tags/nav_menus get PUBLIC READ scoped to
--    what a reader may see (published pages; redirects + links + tags must resolve
--    for everyone). page_revisions gets RLS ENABLED WITH NO PUBLIC POLICY: revisions
--    carry DRAFT block bodies, so history is service-role-only (the recent-changes /
--    diff surfaces are curator-gated APIs). Writers are the API routes (service role)
--    only - no anon/auth write policies anywhere (the 139/140 pattern).
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. pages - ONE PAGE MODEL FOR EVERYTHING (C1). Every entity page, free
--    article, gallery, index, and the space home (portal) is a row here.
--    Body = blocks jsonb (the V-BUILDER-1 format). The tree is parent_id
--    (logical); the URL is FLAT (/verse/<space>/<slug>), C2.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pages (
  id           BIGSERIAL PRIMARY KEY,
  space_id     INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  parent_id    BIGINT REFERENCES public.pages(id) ON DELETE SET NULL,  -- the tree; NULL = a root
  slug         TEXT NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- flat, normalized (C2)
  type         TEXT NOT NULL,                        -- member/release/track/era/gallery/article/portal/index... (app-validated, no db CHECK)
  title        TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'trash')),  -- C3: trash, never hard delete
  blocks       JSONB NOT NULL DEFAULT '{}'::jsonb,   -- the V-BUILDER-1 document body (C1/C11)
  entity_kind  TEXT,                                 -- optional entity binding: 'idol'|'album'|'track'|'era'|'tour'|'show'|'ost'|...
  entity_id    BIGINT,                               -- the bound entity's id (facts auto-fill, never drift). polymorphic -> no FK
  is_stub      BOOLEAN NOT NULL DEFAULT TRUE,        -- C5: app-computed; sitemap = published AND NOT stub
  created_by   UUID NOT NULL,                        -- author (uuid, house pattern 146/147)
  published_at TIMESTAMPTZ,                          -- set on first publish (C5 sitemap lastmod)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, slug)                            -- flat slugs unique per space (C2)
);
-- A bound entity maps to at most ONE page per space (prevents a duplicate member page).
CREATE UNIQUE INDEX IF NOT EXISTS uq_pages_entity
  ON public.pages (space_id, entity_kind, entity_id)
  WHERE entity_kind IS NOT NULL AND entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pages_parent        ON public.pages (parent_id);
CREATE INDEX IF NOT EXISTS idx_pages_space_status  ON public.pages (space_id, status);
CREATE INDEX IF NOT EXISTS idx_pages_space_type    ON public.pages (space_id, type);
CREATE INDEX IF NOT EXISTS idx_pages_entity        ON public.pages (entity_kind, entity_id);
-- Sitemap / index scan: published, substantial pages in one cheap partial scan (C5).
CREATE INDEX IF NOT EXISTS idx_pages_sitemap
  ON public.pages (space_id, updated_at)
  WHERE status = 'published' AND is_stub = FALSE;

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pages_public_read ON public.pages;
CREATE POLICY pages_public_read ON public.pages
  FOR SELECT USING (status = 'published');   -- drafts + trash: service role only

-- ---------------------------------------------------------------------------
-- 2. page_revisions - append-only history (C3). Every save = one row.
--    Revert = a NEW revision (never destructive). Feeds diff + recent-changes.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_revisions (
  id          BIGSERIAL PRIMARY KEY,
  page_id     BIGINT NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  space_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,  -- recent-changes feed filters by space without a join
  rev         INTEGER NOT NULL,               -- per-page monotonic sequence (app: max(rev)+1)
  title       TEXT NOT NULL,
  blocks      JSONB NOT NULL DEFAULT '{}'::jsonb,
  author      UUID NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (page_id, rev)
);
CREATE INDEX IF NOT EXISTS idx_page_revisions_page   ON public.page_revisions (page_id, rev DESC);
CREATE INDEX IF NOT EXISTS idx_page_revisions_recent ON public.page_revisions (space_id, created_at DESC);

-- Revisions carry DRAFT bodies -> NO public read. Service-role only (curator diff /
-- recent-changes surfaces gate access in the API).
ALTER TABLE public.page_revisions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. page_links - links as first-class objects (C6): backlinks, auto-navboxes,
--    orphan detection, and GHOST LINKS (to_page_id NULL = a wanted / red link).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.page_links (
  id           BIGSERIAL PRIMARY KEY,
  space_id     INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_page_id BIGINT NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  to_page_id   BIGINT REFERENCES public.pages(id) ON DELETE CASCADE,  -- NULL = wanted (ghost / red link)
  to_slug      TEXT NOT NULL,                 -- the mentioned slug, verbatim; resolved to to_page_id on target creation
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_page_id, to_slug)
);
CREATE INDEX IF NOT EXISTS idx_page_links_to     ON public.page_links (to_page_id);           -- what-links-here
CREATE INDEX IF NOT EXISTS idx_page_links_from   ON public.page_links (from_page_id);          -- a page's outbound links
CREATE INDEX IF NOT EXISTS idx_page_links_wanted ON public.page_links (space_id, to_slug) WHERE to_page_id IS NULL;  -- wanted-pages, by demand

-- Public read: what-links-here renders on published pages; wanted slugs are the
-- public creation-invitation surface. Rows carry only ids + slugs, no content.
ALTER TABLE public.page_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS page_links_public_read ON public.page_links;
CREATE POLICY page_links_public_read ON public.page_links FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 4. redirects - eternal, a published URL never dies (C2). Rename / move writes
--    a row here, kept FOREVER.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.redirects (
  id          BIGSERIAL PRIMARY KEY,
  space_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  from_slug   TEXT NOT NULL,
  to_page_id  BIGINT NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, from_slug)
);
CREATE INDEX IF NOT EXISTS idx_redirects_from ON public.redirects (space_id, from_slug);

ALTER TABLE public.redirects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS redirects_public_read ON public.redirects;
CREATE POLICY redirects_public_read ON public.redirects FOR SELECT USING (true);  -- must resolve for everyone

-- ---------------------------------------------------------------------------
-- 5. tags + page_tags - CONTROLLED, faceted vocabulary (C7). A tag is created by
--    an explicit act (manual) or derived from data (auto); a page carries several.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tags (
  id          BIGSERIAL PRIMARY KEY,
  space_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  key         TEXT NOT NULL CHECK (key ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- the slug of the tag index page
  label       TEXT NOT NULL CHECK (length(label) BETWEEN 1 AND 80),
  kind        TEXT NOT NULL DEFAULT 'manual' CHECK (kind IN ('auto', 'manual')),  -- auto = data-derived (birth year, era, release type)
  description TEXT,                          -- the human line on the tag index page
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (space_id, key)
);

CREATE TABLE IF NOT EXISTS public.page_tags (
  page_id  BIGINT NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  tag_id   BIGINT NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (page_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_page_tags_tag  ON public.page_tags (tag_id);   -- tag index: pages carrying a tag
CREATE INDEX IF NOT EXISTS idx_page_tags_page ON public.page_tags (page_id);  -- a page's tags (the foot list)

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tags_public_read ON public.tags;
CREATE POLICY tags_public_read ON public.tags FOR SELECT USING (true);
ALTER TABLE public.page_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS page_tags_public_read ON public.page_tags;
CREATE POLICY page_tags_public_read ON public.page_tags FOR SELECT USING (true);

-- ---------------------------------------------------------------------------
-- 6. nav_menus - the curated space menu (F3 / lean-nav amendment L-071). One
--    menu per space; the tree is jsonb.
--    CAPS (enforced in APP CODE, documented here as the contract, per the mission):
--      * max 5 TOP entries
--      * max 3 LEVELS deep
--      * max 10 CHILDREN per node
--    A node is { label, ref } where ref = a page id/slug OR an auto-index. The db
--    stores the tree verbatim; the server validator rejects any menu that violates
--    the caps on every write (the caps cannot be expressed as a cheap CHECK on
--    arbitrary-depth jsonb, so they live in code - the same call the presentation
--    guardrails of 139 made).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nav_menus (
  space_id    INTEGER PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,  -- one menu per space
  tree        JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_menus ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nav_menus_public_read ON public.nav_menus;
CREATE POLICY nav_menus_public_read ON public.nav_menus FOR SELECT USING (true);  -- the reader menu renders for everyone

COMMIT;

-- PostgREST: reload the schema cache so the new tables are queryable immediately.
NOTIFY pgrst, 'reload schema';
