-- 136_verse_photocards.sql
-- Workstream W5.1 - photocard database (curator-entered) + personal collection checklists.
-- Run manually in the prod SQL editor; NOT auto-applied.
--
-- photocards is a reference CATALOG of which cards exist (metadata: member, release, era,
-- version). Images are handled separately (W5.3, strict-legal: only approved hosts) and
-- stay null until then. photocard_collection is each user's private owned / wanted list
-- (W5.2, drives passport collection progress + badges). Folding both tables into this one
-- migration keeps W5.2 code-only.
--
-- Living-persons stance holds: a photocard references a member's official promotional
-- release; no personal data. Curator-entered with a source, publish-gated like other
-- catalog entities.

CREATE TABLE IF NOT EXISTS public.photocards (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  idol_id     INTEGER REFERENCES public.idols(id) ON DELETE SET NULL,   -- member on the card (null = group card)
  album_id    INTEGER REFERENCES public.albums(id) ON DELETE SET NULL,  -- the release it came with
  name        TEXT NOT NULL,
  card_type   TEXT CHECK (card_type IS NULL OR card_type IN ('album', 'pob', 'fansign', 'fanmeeting', 'event', 'trading', 'season_greetings', 'md', 'other')),
  era         TEXT,
  version     TEXT,
  rarity      TEXT,
  image_url   TEXT,                                                     -- strict-legal; populated only from approved hosts (W5.3)
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  source_url  TEXT,
  source_note TEXT,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_photocards_group ON public.photocards(group_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_photocards_album ON public.photocards(album_id) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_photocards_idol ON public.photocards(idol_id) WHERE status = 'published';

-- Public read of published cards (the catalog); writes via service-role (curator).
ALTER TABLE public.photocards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS photocards_public_read ON public.photocards;
CREATE POLICY photocards_public_read ON public.photocards FOR SELECT USING (status = 'published');

-- A user's private owned / wanted checklist. RLS on, no select policy (served through the
-- service-role client for the signed-in user; passport aggregates also service-role).
CREATE TABLE IF NOT EXISTS public.photocard_collection (
  id            SERIAL PRIMARY KEY,
  user_id       UUID NOT NULL,
  photocard_id  INTEGER NOT NULL REFERENCES public.photocards(id) ON DELETE CASCADE,
  state         TEXT NOT NULL DEFAULT 'owned' CHECK (state IN ('owned', 'wanted')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, photocard_id)
);
CREATE INDEX IF NOT EXISTS idx_pc_collection_user ON public.photocard_collection(user_id);
CREATE INDEX IF NOT EXISTS idx_pc_collection_card ON public.photocard_collection(photocard_id);
ALTER TABLE public.photocard_collection ENABLE ROW LEVEL SECURITY; -- no select policy: private

NOTIFY pgrst, 'reload schema';
