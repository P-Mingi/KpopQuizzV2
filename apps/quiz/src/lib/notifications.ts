import { createServiceRoleClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';

/**
 * Server-side helpers for creator notifications, and the SINGLE source of truth
 * for notification types + categories (O0 item 8).
 *
 * RLS on `creator_notifications` does not grant INSERT to authenticated users -
 * the system (service role client) is the only writer. Every helper is a no-op
 * when community features are disabled and swallows errors so a notification
 * failure never blocks the primary action. The mig-122 BEFORE INSERT trigger is
 * the one enforcement gate for user preferences (it catches these writes plus
 * the SQL-inserted types), so there is no per-caller preference check here.
 */

// Types + settings categories live in the client-safe module (this file imports
// the server-only supabase client, so client components import them from there).
import type { NotificationType } from './notification-types';

const MILESTONE_PLAY_COUNTS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];
export function isMilestonePlayCount(playCount: number): boolean {
  return MILESTONE_PLAY_COUNTS.includes(playCount);
}

const COALESCE_WINDOW_MS = 24 * 60 * 60 * 1000; // roll comments/reactions into one row per 24h
const FOLLOW_GUARD_MS = 30 * 24 * 60 * 60 * 1000; // suppress refollow re-notify within 30d

interface InsertPayload {
  user_id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  quiz_id?: string | null;
  link_url?: string | null;
  sender_id?: string | null;
}

/**
 * Dedup-safe insert. Uses ON CONFLICT (user_id, quiz_id, type, title) DO NOTHING
 * via the mig-122 unique index, so two concurrent plays crossing the same
 * milestone collapse to one row. NULL quiz_id is distinct in the index, so
 * quiz-less types are never collapsed here.
 */
async function insertNotification(payload: InsertPayload): Promise<void> {
  if (!COMMUNITY_FEATURES_ENABLED) return;
  try {
    const admin = createServiceRoleClient();
    await admin.from('creator_notifications').upsert(payload, { onConflict: 'user_id,quiz_id,type,title', ignoreDuplicates: true });
  } catch (err) {
    console.error('Failed to insert notification:', err);
  }
}

/**
 * Roll comments/reactions into ONE row per (recipient, quiz, type) per 24h. The
 * first event inserts the singular title; each later event UPDATES that row's
 * title/body, bumps created_at, and resets is_read so it re-surfaces (O0 item 3).
 */
async function coalesceNotification(params: {
  recipientId: string;
  quizId: string;
  type: NotificationType;
  recentCount: number;
  singularTitle: string;
  pluralTitle: (n: number) => string;
  body?: string | null;
}): Promise<void> {
  if (!COMMUNITY_FEATURES_ENABLED) return;
  try {
    const admin = createServiceRoleClient();
    const cutoff = new Date(Date.now() - COALESCE_WINDOW_MS).toISOString();
    const { data: existing } = await admin
      .from('creator_notifications')
      .select('id')
      .eq('user_id', params.recipientId)
      .eq('quiz_id', params.quizId)
      .eq('type', params.type)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const title = params.recentCount > 1 ? params.pluralTitle(params.recentCount) : params.singularTitle;
    const body = params.body ?? null;

    if (existing) {
      await admin.from('creator_notifications')
        .update({ title, body, created_at: new Date().toISOString(), is_read: false })
        .eq('id', existing.id);
    } else {
      await admin.from('creator_notifications')
        .upsert({ user_id: params.recipientId, quiz_id: params.quizId, type: params.type, title, body }, { onConflict: 'user_id,quiz_id,type,title', ignoreDuplicates: true });
    }
  } catch (err) {
    console.error('Failed to coalesce notification:', err);
  }
}

// M1.10 - someone followed you. Guards unfollow/refollow spam: skips if we
// already told this user about THIS follower in the last 30 days. 30d (not
// "ever") so a genuine refollow after a long gap still surfaces.
export async function notifyNewFollower(params: { followedId: string; followerId: string; followerUsername: string }): Promise<void> {
  if (!COMMUNITY_FEATURES_ENABLED) return;
  try {
    const admin = createServiceRoleClient();
    const cutoff = new Date(Date.now() - FOLLOW_GUARD_MS).toISOString();
    const { count } = await admin
      .from('creator_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', params.followedId)
      .eq('type', 'new_follower')
      .eq('sender_id', params.followerId)
      .gte('created_at', cutoff);
    if ((count ?? 0) > 0) return;
    await admin.from('creator_notifications').insert({
      user_id: params.followedId,
      type: 'new_follower',
      title: `${params.followerUsername} started following you`,
      link_url: `/u/${params.followerUsername}`,
      sender_id: params.followerId,
    });
  } catch (err) {
    console.error('Failed to insert follower notification:', err);
  }
}

// A passport milestone for the user themselves (streak / group mastered).
export async function notifyPassportMilestone(params: {
  userId: string;
  type: 'streak_milestone' | 'group_mastered';
  title: string;
  body?: string | null;
  linkUrl?: string | null;
}): Promise<void> {
  await insertNotification({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    link_url: params.linkUrl ?? null,
  });
}

export async function notifyMilestone(params: {
  creatorId: string;
  quizId: string;
  quizTitle: string;
  playCount: number;
}): Promise<void> {
  const { creatorId, quizId, quizTitle, playCount } = params;
  if (!isMilestonePlayCount(playCount)) return;
  await insertNotification({
    user_id: creatorId,
    type: 'milestone',
    title: `Your quiz hit ${playCount.toLocaleString('en-US')} plays!`,
    body: `"${quizTitle}" is ${playCount >= 100 ? 'on a roll' : 'getting traction'}.`,
    quiz_id: quizId,
  });
}

// Reaction (banger). Coalesces per quiz per 24h. recentCount = reactions on this
// quiz in the last 24h (the caller counts from the reactions table).
export async function notifyRating(params: {
  creatorId: string;
  quizId: string;
  quizTitle: string;
  username: string;
  recentCount: number;
}): Promise<void> {
  await coalesceNotification({
    recipientId: params.creatorId,
    quizId: params.quizId,
    type: 'rating',
    recentCount: params.recentCount,
    singularTitle: `${params.username} called your quiz a banger!`,
    pluralTitle: (n) => `${n} new reactions on your quiz`,
    body: `On "${params.quizTitle}".`,
  });
}

// Comment. Coalesces per quiz per 24h. recentCount = comments on this quiz in
// the last 24h (the caller counts from the comments table).
export async function notifyComment(params: {
  creatorId: string;
  quizId: string;
  quizTitle: string;
  username: string;
  content: string;
  recentCount: number;
}): Promise<void> {
  await coalesceNotification({
    recipientId: params.creatorId,
    quizId: params.quizId,
    type: 'comment',
    recentCount: params.recentCount,
    singularTitle: `${params.username} commented on your quiz`,
    pluralTitle: (n) => `${n} new comments on your quiz`,
    body: params.recentCount > 1 ? `On "${params.quizTitle}".` : params.content.slice(0, 100),
  });
}

// W2 - "your run was beaten". The strongest return trigger the battle audit
// identified (R0b T4): someone challenged you beats "there is a new quiz".
//
// Reachability is honest and limited: creator_notifications.user_id is NOT NULL
// against auth.users, so only a challenger who was SIGNED IN when they created the
// run can be told. Anonymous challengers (the common case today) simply get
// nothing, which is why W3 identity and this feature belong together.
//
// FAIL SOFT: type 'battle_beaten' is not in the live CHECK constraint until the
// owner applies docs/pending-migrations/154_battle_challenge_notification.sql. The
// insert throws until then and is swallowed here, exactly like every other helper
// in this file, so the battle result itself is never blocked.
export async function notifyRunBeaten(params: {
  challengerUserId: string;
  battleId: string;
  winnerScore: number;
  challengerScore: number;
  quizTitle: string | null;
}): Promise<void> {
  if (!COMMUNITY_FEATURES_ENABLED) return;
  try {
    const admin = createServiceRoleClient();
    const on = params.quizTitle ? ` on ${params.quizTitle}` : '';
    await admin.from('creator_notifications').insert({
      user_id: params.challengerUserId,
      type: 'battle_beaten',
      title: 'Someone beat your run',
      body: `They scored ${params.winnerScore} against your ${params.challengerScore}${on}. Rematch?`,
      link_url: `/battle?b=${params.battleId}`,
    });
  } catch (err) {
    console.error('Failed to insert battle-beaten notification:', err);
  }
}
