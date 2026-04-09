import { createServiceRoleClient } from '@/lib/supabase/server';
import { COMMUNITY_FEATURES_ENABLED } from '@/lib/features';

/**
 * Server-side helpers for inserting creator notifications.
 *
 * RLS on `creator_notifications` does not grant INSERT to authenticated
 * users - the system (service role client) is the only writer. All three
 * helpers below are no-ops when community features are disabled, and they
 * swallow errors so a notification failure never blocks the primary action
 * (recording a play, upserting a reaction, posting a comment).
 */

const MILESTONE_PLAY_COUNTS = [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

export function isMilestonePlayCount(playCount: number): boolean {
  return MILESTONE_PLAY_COUNTS.includes(playCount);
}

async function insertNotification(payload: {
  user_id: string;
  type: 'milestone' | 'rating' | 'comment' | 'trending';
  title: string;
  body?: string | null;
  quiz_id?: string | null;
}): Promise<void> {
  if (!COMMUNITY_FEATURES_ENABLED) return;
  try {
    const admin = createServiceRoleClient();
    await admin.from('creator_notifications').insert(payload);
  } catch (err) {
    // Never throw from a notification side-effect.
    console.error('Failed to insert notification:', err);
  }
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
    body: `"${quizTitle}" is ${playCount >= 100 ? 'trending' : 'getting traction'}.`,
    quiz_id: quizId,
  });
}

export async function notifyRating(params: {
  creatorId: string;
  quizId: string;
  quizTitle: string;
  username: string;
}): Promise<void> {
  const { creatorId, quizId, quizTitle, username } = params;
  await insertNotification({
    user_id: creatorId,
    type: 'rating',
    title: `${username} called your quiz a banger!`,
    body: `They reacted to "${quizTitle}".`,
    quiz_id: quizId,
  });
}

export async function notifyComment(params: {
  creatorId: string;
  quizId: string;
  username: string;
  content: string;
}): Promise<void> {
  const { creatorId, quizId, username, content } = params;
  await insertNotification({
    user_id: creatorId,
    type: 'comment',
    title: `${username} commented on your quiz`,
    body: content.slice(0, 100),
    quiz_id: quizId,
  });
}
