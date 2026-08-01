-- 141_verse_binders.sql
-- Workstream V-CARDS-MAX - the photocard binder + collectible shelf personalization
-- layer. THE ONE migration for the whole workstream. Run manually in the prod SQL
-- editor; NOT auto-applied.
--
-- The own/want TRUTH stays where it already lives, untouched:
--   photocard_collection   (136) - which cards a user owns / wants
--   collectible_collection (138) - which collectibles a user owns / wants
-- Community counts are aggregates over those tables (COUNT per card, floor-gated in
-- code); no storage is added for them.
--
-- This migration adds only the EXPRESSION layer on top:
--   1. verse_binders       - per (user, group, surface) theme + manual arrangement.
--                            Empty layout = auto-by-set (the zero-effort default);
--                            manual drag writes page/pocket order (and Scrapbook
--                            sticker placements) into the layout jsonb, reusing the
--                            existing sticker registry (no new sticker table).
--   2. verse_profile_shelf - the opt-in public showcase: a user's top 3-5 cards /
--                            collectibles pinned to their profile (feeds V-PROFILE-ONE).
--   3. verse_profile_shelf_settings - the per-user visibility opt-in, default OFF.
--
-- Hard lines held in the shape itself: no price column, no trade/ownership-transfer
-- table, no image column. These tables carry arrangement, theme and a pin list only.
--
-- Privacy: all three are PRIVATE (RLS on, no select policy) and served through the
-- service-role client for the signed-in user, exactly like photocard_collection. The
-- public shelf is rendered by a service-role read that first checks the opt-in flag,
-- so visibility lives in one place (the flag), never in a leaked policy.

-- ---------------------------------------------------------------------------
-- 1. verse_binders - theme + manual layout, per user per space per surface
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.verse_binders (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  group_id   INTEGER NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  surface    TEXT NOT NULL DEFAULT 'binder' CHECK (surface IN ('binder', 'shelf')),
  theme      TEXT NOT NULL DEFAULT 'classic',       -- validated in app code (presentation philosophy), open for new themes
  layout     JSONB NOT NULL DEFAULT '{}'::jsonb,     -- manual page/pocket order + sticker placements; empty = auto-by-set
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id, surface)
);
CREATE INDEX IF NOT EXISTS idx_verse_binders_user ON public.verse_binders(user_id);
ALTER TABLE public.verse_binders ENABLE ROW LEVEL SECURITY; -- no select policy: private, served via service role

-- ---------------------------------------------------------------------------
-- 2. verse_profile_shelf - the top 3-5 showcase pins (polymorphic item ref)
-- ---------------------------------------------------------------------------
-- item_id is polymorphic (photocard | collectible), matching verse_revisions'
-- free-text entity_type pattern, so no single FK applies; a pinned item whose
-- catalog row is later deleted simply stops rendering (app skips missing rows).
CREATE TABLE IF NOT EXISTS public.verse_profile_shelf (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL,
  item_type  TEXT NOT NULL CHECK (item_type IN ('photocard', 'collectible')),
  item_id    INTEGER NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,             -- showcase order (drag on the profile)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_type, item_id)
);
CREATE INDEX IF NOT EXISTS idx_verse_profile_shelf_user ON public.verse_profile_shelf(user_id);
ALTER TABLE public.verse_profile_shelf ENABLE ROW LEVEL SECURITY; -- no select policy: served via service role (opt-in checked in code)

-- ---------------------------------------------------------------------------
-- 3. verse_profile_shelf_settings - the visibility opt-in, DEFAULT OFF
-- ---------------------------------------------------------------------------
-- One row per user; the absence of a row also reads as private, so a shelf is
-- public only after an explicit opt-in write sets is_public = true.
CREATE TABLE IF NOT EXISTS public.verse_profile_shelf_settings (
  user_id    UUID PRIMARY KEY,
  is_public  BOOLEAN NOT NULL DEFAULT false,          -- owner-locked default: OFF
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.verse_profile_shelf_settings ENABLE ROW LEVEL SECURITY; -- served via service role

NOTIFY pgrst, 'reload schema';
