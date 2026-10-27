// Client-safe notification types + settings categories (O0 item 8, single
// source of truth). This module imports NOTHING server-only, so client
// components (settings toggles, cards) can use it. The server-only insert
// helpers live in lib/notifications.ts, which imports these.

// The live types. The 3 dead ones (trending, like, achievement_unlocked) were
// removed from the DB CHECK in mig 122 and are gone here too.
//
// W2: 'verse_watch' was already live in the DB CHECK (mig 133) and inserted by
// lib/verse/watchlist.ts, but had drifted out of this list. Added so the two
// stay in sync. 'battle_beaten' is NEW and needs
// docs/pending-migrations/154_battle_challenge_notification.sql applied by the
// owner before the DB will accept it; the insert fails soft until then.
//
// V12 (owner, 2026-10-07): 'community_reply' (someone replied to your comment or reply)
// and 'community_comment' (someone commented on your post), Social, written by
// lib/ux-v1/p8/notify.ts (docs/pending-migrations/v12-community-notifications.sql).
//
// Quiz corrections (owner, 2026-10-27): 'quiz_correction' tells a creator that a question of
// their quiz has a sourced correction and that the quiz moves to draft after 14 days if the
// question is unchanged (app/api/cron/quiz-corrections, lib/quiz-corrections/). It needs
// docs/pending-migrations/quiz-corrections-schema.sql. On purpose it belongs to NO settings
// category below: the schema SQL makes the gate trigger let it through whatever the creator's
// toggles and per-quiz mutes, because a notice the creator never sees would still end with their
// quiz in draft. The notifications page lists it under "Your quizzes" (lib/ux-v1/p11).
export const NOTIFICATION_TYPES = [
  'milestone', 'rating', 'comment', 'admin_dm', 'new_follower',
  'streak_milestone', 'group_mastered', 'followed_new_quiz',
  'badge_earned', 'cheer', 'verse_watch', 'battle_beaten',
  'community_reply', 'community_comment', 'quiz_correction',
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
  { key: 'social', label: 'Social', description: 'New followers, cheers, and battle challenges.', types: ['new_follower', 'cheer', 'battle_beaten', 'verse_watch', 'community_reply', 'community_comment'] },
  { key: 'achievements', label: 'Achievements and streaks', description: 'Badges, mastered groups, and streak milestones.', types: ['badge_earned', 'group_mastered', 'streak_milestone'] },
  { key: 'following', label: 'From creators you follow', description: 'New quizzes from people you follow.', types: ['followed_new_quiz'] },
  { key: 'announcements', label: 'Announcements', description: 'Messages from the KpopQuiz team.', types: ['admin_dm'] },
];
