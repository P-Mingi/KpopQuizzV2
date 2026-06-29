import type { SupabaseClient } from '@supabase/supabase-js';

import { notifyPassportMilestone } from '@/lib/notifications';

// L4 - per-account daily streak. Signed-in users who complete the daily quiz/
// game (?daily=quiz|game, the F6 entry path) increment a server-side streak and
// earn +5 base XP per day, plus milestone bonuses at 3/7/14/30. UTC-midnight
// basis (same as F6's localStorage signal). Idempotent: a 2nd daily same UTC day
// is a no-op (returns awarded=0).

export const DAILY_BASE_XP = 5;
export const DAILY_MILESTONES: Record<number, number> = { 3: 10, 7: 25, 14: 50, 30: 100 };

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface StreakAwardResult {
  awarded: number;        // total XP awarded this call (0 if already done today)
  base: number;           // base XP component
  milestone: number;      // milestone bonus this call (0 if none)
  streak: number;         // streak after this call
  longest: number;        // all-time best streak after this call
  alreadyToday: boolean;  // true if no-op
}

/**
 * Award the daily-streak XP for a user. Caller passes a service-role-capable
 * client (the rpc award_xp + the profiles update need it).
 */
export async function awardDailyStreak(
  supabase: SupabaseClient,
  userId: string,
): Promise<StreakAwardResult> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('daily_streak, daily_streak_longest, last_daily_date')
    .eq('id', userId)
    .maybeSingle();

  const today = todayUtc();
  const prevDate = (profile?.last_daily_date as string | null) ?? null;
  const prevStreak = (profile?.daily_streak as number | null) ?? 0;
  const prevLongest = (profile?.daily_streak_longest as number | null) ?? 0;

  if (prevDate === today) {
    return { awarded: 0, base: 0, milestone: 0, streak: prevStreak, longest: Math.max(prevLongest, prevStreak), alreadyToday: true };
  }

  // yesterday? continue : reset
  let streak: number;
  if (prevDate) {
    const y = new Date(today + 'T00:00:00Z');
    y.setUTCDate(y.getUTCDate() - 1);
    const yesterday = y.toISOString().slice(0, 10);
    streak = prevDate === yesterday ? prevStreak + 1 : 1;
  } else {
    streak = 1;
  }

  const milestone = DAILY_MILESTONES[streak] ?? 0;
  const total = DAILY_BASE_XP + milestone;
  const longest = Math.max(prevLongest, streak);

  await supabase.from('profiles').update({ daily_streak: streak, daily_streak_longest: longest, last_daily_date: today }).eq('id', userId);
  await supabase.rpc('award_xp', { p_user_id: userId, p_amount: total, p_reason: 'daily_streak' });

  // M1.7: streak milestone is a deposit point too. One emit, folded into the
  // existing streak write (caller passes the service-role client; emit_activity
  // resolves the public username or 'someone').
  if (milestone > 0) {
    await supabase.rpc('emit_activity', { p_event_type: 'streak_milestone', p_user_id: userId, p_group_slug: null, p_payload: { streak } });
    // M1.10: notify the user of their own streak milestone (rare; once per day).
    await notifyPassportMilestone({ userId, type: 'streak_milestone', title: `${streak}-day streak!`, body: 'Keep it going to climb the Fan Level ladder.' });
  }

  return { awarded: total, base: DAILY_BASE_XP, milestone, streak, longest, alreadyToday: false };
}
