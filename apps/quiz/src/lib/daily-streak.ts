import type { SupabaseClient } from '@supabase/supabase-js';

import { notifyPassportMilestone } from '@/lib/notifications';
import { awardXpForSite } from '@/lib/passport/xp';
import { SITE_ID } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

// L4 - per-account daily streak. Signed-in users who complete the daily quiz/
// game (?daily=quiz|game, the F6 entry path) increment a server-side streak and
// earn +5 base XP per day, plus milestone bonuses at 3/7/14/30. UTC-midnight
// basis (same as F6's localStorage signal). Idempotent: a 2nd daily same UTC day
// is a no-op (returns awarded=0).

export const DAILY_BASE_XP = 5;
export const DAILY_MILESTONES: Record<number, number> = { 3: 10, 7: 25, 14: 50, 30: 100 };

// M1.15: streak badge thresholds. Only these three days trigger the grant RPC, so
// a user pays for it at most 3 times ever; grant_streak_badges (mig 104) is
// idempotent and cumulative, so a missed day can never leave a gap.
const STREAK_BADGE_DAYS = [7, 30, 100];

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

interface StreakRow {
  daily_streak: number | null;
  daily_streak_longest: number | null;
  last_daily_date: string | null;
}

/**
 * Award the daily-streak XP for a user. Caller passes a service-role-capable
 * client (the rpc award_xp + the profiles update need it).
 *
 * Run O1 (B3): `site` defaults to the build's site. On kpop the streak lives on
 * profiles and the XP goes through award_xp, exactly as before. On another site
 * (anime) the streak is read and written on the user's world_memberships row of
 * that site and the XP goes through award_world_xp; the kpop-only side effects
 * (streak badges, the activity event, the notification) are not fired there.
 */
export async function awardDailyStreak(
  supabase: SupabaseClient,
  userId: string,
  site: SiteId = SITE_ID,
): Promise<StreakAwardResult> {
  const onWorld = site !== 'kpop';
  const { data: profile } = onWorld
    ? await supabase
        .from('world_memberships')
        .select('daily_streak, daily_streak_longest, last_daily_date')
        .eq('user_id', userId)
        .eq('site_id', site)
        .maybeSingle()
    : await supabase
        .from('profiles')
        .select('daily_streak, daily_streak_longest, last_daily_date')
        .eq('id', userId)
        .maybeSingle();

  const today = todayUtc();
  const prevDate = ((profile as StreakRow | null)?.last_daily_date) ?? null;
  const prevStreak = ((profile as StreakRow | null)?.daily_streak) ?? 0;
  const prevLongest = ((profile as StreakRow | null)?.daily_streak_longest) ?? 0;

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

  if (onWorld) {
    const patch = { daily_streak: streak, daily_streak_longest: longest, last_daily_date: today };
    if (profile) {
      await supabase.from('world_memberships').update(patch).eq('user_id', userId).eq('site_id', site);
    } else {
      // The first write of this user on this site: the stamp is made here (joined by playing).
      await supabase.from('world_memberships').insert({
        user_id: userId, site_id: site, joined_via: 'play', activated_at: new Date().toISOString(), ...patch,
      });
    }
    await awardXpForSite(site, userId, total, 'daily_streak', supabase);
    return { awarded: total, base: DAILY_BASE_XP, milestone, streak, longest, alreadyToday: false };
  }

  await supabase.from('profiles').update({ daily_streak: streak, daily_streak_longest: longest, last_daily_date: today }).eq('id', userId);
  await awardXpForSite('kpop', userId, total, 'daily_streak', supabase);

  // M1.15: streak badges (streak_7/30/100), folded into this existing write so
  // there is no extra hot-path query on ordinary days.
  if (STREAK_BADGE_DAYS.includes(streak)) {
    await supabase.rpc('grant_streak_badges', { p_user_id: userId, p_streak: streak });
  }

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
