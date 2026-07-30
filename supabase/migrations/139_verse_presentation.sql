-- 139_verse_presentation.sql
-- Workstream W-CUSTOM - the per-space customization studio. ONE migration for the
-- whole workstream. Run manually in the prod SQL editor; NOT auto-applied.
--
-- Contents:
--   1. verse_spaces: presentation (live) + presentation_draft (studio) jsonb.
--      SUPERSEDES module_config from migration 125 - that column was unused
--      (default '{}' on all 4 prod rows, verified) and only ever meant module
--      order/toggles, which `presentation.modules[]` now covers. Dropped here.
--   2. verse_space_assets: curator sticker/banner uploads (strict-legal, validated
--      + metadata-stripped in the upload API; this is the ledger + RLS).
--   3. storage bucket verse-space-assets + RLS (public read; writes via the
--      service role only, which bypasses RLS - the upload API is the sole writer).
--   4. space_polls + space_poll_votes: the space-scoped poll. The existing debate
--      engine is date-keyed global binary and cannot be space-scoped, so the poll
--      gets its own minimal tables here (folded in, per the workstream's one-migration
--      rule); the vote-counting PATTERN (one vote per user, real votes only) is
--      reused in code, not the table.
--
-- NOT needed here: verse_revisions.entity_type is free TEXT (no CHECK), so the
-- draft/publish flow writes entity_type='space_presentation' with no schema change.
--
-- Presentation config is DATA validated server-side (lib/verse/presentation): the
-- SEO invariant (seoCritical blocks never removable) and the WCAG-AA readability
-- guardrail are enforced in app code on every save + publish. No policy lives in SQL.

-- ---------------------------------------------------------------------------
-- 1. verse_spaces presentation columns (supersede module_config)
-- ---------------------------------------------------------------------------
ALTER TABLE public.verse_spaces
  ADD COLUMN IF NOT EXISTS presentation       JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS presentation_draft JSONB NOT NULL DEFAULT '{}'::jsonb;

-- module_config (125) is superseded by presentation.modules[]; it was unused.
ALTER TABLE public.verse_spaces DROP COLUMN IF EXISTS module_config;

-- ---------------------------------------------------------------------------
-- 2. verse_space_assets - curator sticker/banner uploads (space = group)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verse_space_assets (
  id            SERIAL PRIMARY KEY,
  space_id      INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL CHECK (kind IN ('sticker', 'banner')),
  storage_path  TEXT NOT NULL,                       -- path within the verse-space-assets bucket
  width         INTEGER,
  height        INTEGER,
  bytes         INTEGER,
  uploaded_by   UUID,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_space_assets_space ON public.verse_space_assets(space_id, kind) WHERE status = 'active';

ALTER TABLE public.verse_space_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS space_assets_public_read ON public.verse_space_assets;
CREATE POLICY space_assets_public_read ON public.verse_space_assets FOR SELECT USING (status = 'active');
-- writes (insert/update/removal) go through the service-role upload/admin API.

-- ---------------------------------------------------------------------------
-- 3. storage bucket for the uploads
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('verse-space-assets', 'verse-space-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Public read (images must render on public/ISR pages). No client write policy:
-- the upload API validates curator role + png/webp + <=512KB + <=512x512, strips
-- metadata, then writes via the service role (which bypasses storage RLS).
DROP POLICY IF EXISTS "verse_space_assets_public_read" ON storage.objects;
CREATE POLICY "verse_space_assets_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'verse-space-assets');

-- ---------------------------------------------------------------------------
-- 4. space-scoped poll (curator-run, real votes, one per user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.space_polls (
  id          SERIAL PRIMARY KEY,
  group_id    INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,                        -- ["Option A", "Option B", ...] 2..6
  created_by  UUID,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_space_polls_group ON public.space_polls(group_id, created_at DESC);
ALTER TABLE public.space_polls ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS space_polls_public_read ON public.space_polls;
CREATE POLICY space_polls_public_read ON public.space_polls FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.space_poll_votes (
  id           SERIAL PRIMARY KEY,
  poll_id      INTEGER NOT NULL REFERENCES public.space_polls(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)                          -- one real vote per user
);
CREATE INDEX IF NOT EXISTS idx_space_poll_votes_poll ON public.space_poll_votes(poll_id);
-- Public read so tallies aggregate (mirrors the existing debate_votes engine).
ALTER TABLE public.space_poll_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS space_poll_votes_public_read ON public.space_poll_votes;
CREATE POLICY space_poll_votes_public_read ON public.space_poll_votes FOR SELECT USING (true);
-- inserts via the authenticated vote API (service role), one per (poll,user).

NOTIFY pgrst, 'reload schema';
