-- 095 - Notification center types (Workstream M, M1.10). Extends the ONE existing
-- notification system (creator_notifications, mig 047 + 083) with the Phase 1.5
-- social + passport types. Same table, same shape, same /api/notifications. No
-- parallel system. Mirrors the 083 CHECK-swap pattern.
ALTER TABLE public.creator_notifications
  DROP CONSTRAINT IF EXISTS creator_notifications_type_check;

ALTER TABLE public.creator_notifications
  ADD CONSTRAINT creator_notifications_type_check
  CHECK (type IN (
    'milestone', 'rating', 'comment', 'trending', 'admin_dm',
    'new_follower',          -- M1.8 follow path fires this
    'like',                  -- type ready; hot like path stays NANO-clean (not auto-wired)
    'achievement_unlocked',  -- passport milestones
    'streak_milestone',
    'group_mastered',
    'followed_new_quiz'      -- defined here; the publish fan-out is M1.11
  ));
