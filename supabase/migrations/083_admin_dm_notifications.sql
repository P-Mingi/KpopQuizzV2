-- Extend creator_notifications so admins can DM specific users from the
-- dashboard ("thanks for the quiz, join the Discord", etc.). Builds on the
-- existing strip + /api/notifications plumbing - no parallel system.
--
-- - Add 'admin_dm' to the type CHECK constraint.
-- - Add link_url for click-through (Discord invite, profile, etc.) so the
--   strip can route the user somewhere if the DM wants it to.
-- - Add sender_id (nullable, FK to auth.users) so admin DMs show their origin
--   in the audit trail; existing system-fired notifications stay sender_id=null.

ALTER TABLE public.creator_notifications
  DROP CONSTRAINT IF EXISTS creator_notifications_type_check;

ALTER TABLE public.creator_notifications
  ADD CONSTRAINT creator_notifications_type_check
  CHECK (type IN ('milestone', 'rating', 'comment', 'trending', 'admin_dm'));

ALTER TABLE public.creator_notifications
  ADD COLUMN IF NOT EXISTS link_url TEXT;

ALTER TABLE public.creator_notifications
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
