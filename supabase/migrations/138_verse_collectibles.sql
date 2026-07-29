-- 138_verse_collectibles.sql
-- Workstream W5.3 - merch + lightstick galleries (curator-entered) + personal collection.
-- Run manually in the prod SQL editor; NOT auto-applied.
--
-- collectibles is an image-first gallery of official merchandise and lightsticks. It mirrors
-- photocards (136): a public, published-gated reference catalogue, curator-entered with a
-- source, written only through the service role. One table with a `kind` discriminator
-- ('merch' | 'lightstick') keeps galleries, checklist and passport code shared with the
-- photocard path and leaves room for future kinds without another migration.
--
-- Strict-legal images: image_url is populated ONLY from approved hosts (the same
-- isConfiguredImageHost allowlist the photocard + news paths use). It stays null until a
-- legal source exists; a gallery tile then falls back to the name/era placeholder.
--
-- Living-persons stance holds: a collectible references an official group product, not a
-- person; no personal data.

CREATE TABLE IF NOT EXISTS public.collectibles (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('merch', 'lightstick')),
  name        TEXT NOT NULL,
  category    TEXT,                                                     -- merch: apparel/accessory/stationery/md; lightstick: official version
  era         TEXT,                                                     -- comeback / version the item shipped with
  version     TEXT,                                                     -- e.g. 'ver.2', 'Bluetooth'
  image_url   TEXT,                                                     -- strict-legal; approved hosts only, else null
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url  TEXT,
  source_note TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_collectibles_group ON public.collectibles(group_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_collectibles_kind ON public.collectibles(group_id, kind) WHERE status = 'published';

-- Public read of published items (the gallery); writes via service-role (curator).
ALTER TABLE public.collectibles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS collectibles_public_read ON public.collectibles;
CREATE POLICY collectibles_public_read ON public.collectibles FOR SELECT USING (status = 'published');

-- A user's private owned / wanted checklist (drives passport collection progress, same as
-- photocard_collection). RLS on, no select policy: served through the service-role client.
CREATE TABLE IF NOT EXISTS public.collectible_collection (
  id             SERIAL PRIMARY KEY,
  user_id        UUID NOT NULL,
  collectible_id INTEGER NOT NULL REFERENCES public.collectibles(id) ON DELETE CASCADE,
  state          TEXT NOT NULL DEFAULT 'owned' CHECK (state IN ('owned', 'wanted')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, collectible_id)
);
CREATE INDEX IF NOT EXISTS idx_collectible_collection_user ON public.collectible_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_collectible_collection_item ON public.collectible_collection(collectible_id);
ALTER TABLE public.collectible_collection ENABLE ROW LEVEL SECURITY; -- no select policy: private

NOTIFY pgrst, 'reload schema';
