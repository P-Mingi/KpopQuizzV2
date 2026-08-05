-- 146_verse_block_images.sql
-- V-BUILDER-3 step 3 - THE BLOCK IMAGE RAIL (owner image law L-047). Run manually in the
-- prod SQL editor; NOT auto-applied. Cowork reads every line first.
--
-- WHY: block content editors (co-design 7, step 2) expose an `image` field. The owner ruling
-- L-047: ANY image source is allowed, BUT every image is ingest-COPIED into OUR storage (never
-- hotlinked), with a post-hoc moderation queue (one-click hide/remove) + a DMCA process. This
-- EXTENDS the existing sticker/banner rail (verse_space_assets + the verse-space-assets bucket,
-- migration 139) rather than adding a parallel table: the same service-role write pattern, the
-- same public-read-only-when-active RLS, the same bucket. No NEW table, no new bucket.
--
-- The app enforces the rest in code (never in SQL, per 139's stance): curator role gate, size
-- cap, GIF ok, EXIF strip, reject non-image, per-user/day rate cap, sha256 hashing, and
-- fail-closed rendering (a non-active image renders NOTHING, never a broken <img>).

-- ---------------------------------------------------------------------------
-- 1. extend the kind + status enums
--    kind gains 'image' (a content-block image, alongside 'sticker' / 'banner').
--    status gains 'hidden' (a takedown that keeps the object) beside 'active' / 'removed'.
-- ---------------------------------------------------------------------------
ALTER TABLE public.verse_space_assets DROP CONSTRAINT IF EXISTS verse_space_assets_kind_check;
ALTER TABLE public.verse_space_assets
  ADD CONSTRAINT verse_space_assets_kind_check CHECK (kind IN ('sticker', 'banner', 'image'));

ALTER TABLE public.verse_space_assets DROP CONSTRAINT IF EXISTS verse_space_assets_status_check;
ALTER TABLE public.verse_space_assets
  ADD CONSTRAINT verse_space_assets_status_check CHECK (status IN ('active', 'hidden', 'removed'));

-- ---------------------------------------------------------------------------
-- 2. columns for the image rail
--    hash        - sha256 of the ingested bytes; drives dedupe (same image twice = one object).
--    mime        - image/png | image/webp | image/gif | image/jpeg (block images allow more than
--                  the sticker png/webp; the app enforces the exact allowlist).
--    source      - how it entered: 'upload' (from computer) or 'url' (server fetched + copied).
--    source_url  - the ORIGINAL external URL, RECORD ONLY (moderation/DMCA trail). It is NEVER
--                  rendered: the page always serves storage_path in the verse-space-assets bucket.
--    reviewed_by / reviewed_at - who moderated (hide/keep) and when.
-- ---------------------------------------------------------------------------
ALTER TABLE public.verse_space_assets ADD COLUMN IF NOT EXISTS hash        TEXT;
ALTER TABLE public.verse_space_assets ADD COLUMN IF NOT EXISTS mime        TEXT;
ALTER TABLE public.verse_space_assets ADD COLUMN IF NOT EXISTS source      TEXT
  CHECK (source IS NULL OR source IN ('upload', 'url'));
ALTER TABLE public.verse_space_assets ADD COLUMN IF NOT EXISTS source_url  TEXT;
ALTER TABLE public.verse_space_assets ADD COLUMN IF NOT EXISTS reviewed_by UUID;
ALTER TABLE public.verse_space_assets ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 3. dedupe: the same image ingested twice into a space collapses to one object.
--    Partial-unique on (space_id, hash) for live rows; a removed row frees the slot.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_space_assets_hash
  ON public.verse_space_assets (space_id, hash)
  WHERE hash IS NOT NULL AND status <> 'removed';

-- ---------------------------------------------------------------------------
-- 4. moderation queue index: newest ingested block images first, per review pass.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_space_assets_image_queue
  ON public.verse_space_assets (created_at DESC)
  WHERE kind = 'image';

-- The existing public-read RLS already gates on status = 'active', so 'hidden' and 'removed'
-- images are invisible to the anon client (defence in depth); the renderer additionally
-- fail-closes to nothing for any non-active image.

NOTIFY pgrst, 'reload schema';
