// Client-safe notification types + settings categories (O0 item 8, single
// source of truth). This module imports NOTHING server-only, so client
// components (settings toggles, cards) can use it. The server-only insert
// helpers live in lib/notifications.ts, which imports these.

// The live types. The 3 dead ones (trending, like, achievement_unlocked) were
// removed from the DB CHECK in mig 122 and are gone here too.
export const NOTIFICATION_TYPES = [
  'milestone', 'rating', 'comment', 'admin_dm', 'new_follower',
  'streak_milestone', 'group_mastered', 'followed_new_quiz',
  'badge_earned', 'cheer',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Settings categories. Mirrors the type -> category map ENFORCED by the mig-122
// gate trigger (the trigger enforces; this drives the settings UI grouping).
export interface NotificationCategory {
  key: string;
  label: string;
  description: string;
  types: NotificationType[];
}
export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  { key: 'your_quizzes', label: 'Activity on your quizzes', description: 'Play milestones, reactions, and comments on quizzes you made.', types: ['milestone', 'rating', 'comment'] },
  { key: 'social', label: 'Social', description: 'New followers and cheers.', types: ['new_follower', 'cheer'] },
  { key: 'achievements', label: 'Achievements and streaks', description: 'Badges, mastered groups, and streak milestones.', types: ['badge_earned', 'group_mastered', 'streak_milestone'] },
  { key: 'following', label: 'From creators you follow', description: 'New quizzes from people you follow.', types: ['followed_new_quiz'] },
  { key: 'announcements', label: 'Announcements', description: 'Messages from the KpopQuiz team.', types: ['admin_dm'] },
];
