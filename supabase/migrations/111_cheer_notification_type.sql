-- 111 - Allow the 'cheer' notification type (Workstream F2b, B7).
--
-- Cheers on the happening-now feed notify the cheered fan on the FIRST cheer per
-- event. That notification rides the ONE creator_notifications system, so the
-- type CHECK (last re-declared in mig 105) needs 'cheer' added. Same CHECK-swap
-- pattern as 095 / 105.

alter table public.creator_notifications
  drop constraint if exists creator_notifications_type_check;

alter table public.creator_notifications
  add constraint creator_notifications_type_check
  check (type in (
    'milestone', 'rating', 'comment', 'trending', 'admin_dm',
    'new_follower',
    'like',
    'achievement_unlocked',
    'streak_milestone',
    'group_mastered',
    'followed_new_quiz',
    'badge_earned',
    'cheer'                  -- 111: someone cheered your feed activity
  ));
