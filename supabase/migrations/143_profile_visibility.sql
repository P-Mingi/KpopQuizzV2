-- 143_profile_visibility.sql
-- Workstream V-PROFILE-ONE - THE ONE migration. Run manually in the prod SQL
-- editor; NOT auto-applied.
--
-- Why this migration exists (and is the only one the workstream needs):
--   The profile is PRIVATE by default, per-section opt-in public. That opt-in is
--   a user CHOICE - it cannot be derived from any existing data, and prod has no
--   rail for it (profiles has ~40 columns but no general visibility store; the
--   shipped verse_profile_shelf_settings.is_public covers ONLY the card showcase).
--   So the per-section flags need storage. Everything else the workstream shows -
--   XP, pages written, essays, quiz scores, recent activity - is DERIVED live from
--   existing tables (verse_revisions, verse_essays, game_plays, verse_profile_shelf,
--   space_members, verse_page_links), so no activity/stat storage is added.
--
-- Design: general on purpose (V-COMM-3 reuses this plumbing). `section` is an open
-- validated string, so new opt-in sections need no schema change. Absence of a row
-- reads as PRIVATE, so a section is public only after an explicit opt-in write.
-- The card SHOWCASE keeps its shipped opt-in (verse_profile_shelf_settings.is_public);
-- this table is the home for every other section.
--
-- Privacy + cleanup: matches the shipped shelf model exactly - RLS ON with NO select
-- policy (served through the service-role client, which checks the flag in code, so
-- visibility never leaks through a policy), user_id is a bare UUID with NO FK cascade;
-- account deletion clears these rows app-level (added to lib/verse/account-cleanup),
-- consistent with verse_profile_shelf_settings.

BEGIN;

CREATE TABLE IF NOT EXISTS public.profile_section_visibility (
  user_id    UUID NOT NULL,
  section    TEXT NOT NULL CHECK (section ~ '^[a-z_]{1,40}$'),
  is_public  BOOLEAN NOT NULL DEFAULT false,          -- owner-locked default: OFF (private)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, section)
);

ALTER TABLE public.profile_section_visibility ENABLE ROW LEVEL SECURITY; -- no select policy: served via service role, opt-in checked in code

COMMIT;

NOTIFY pgrst, 'reload schema';
