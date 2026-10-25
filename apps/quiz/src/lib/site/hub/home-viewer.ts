// Run O1, lot H2c: the signed-in fan of the home, from the account itself, read as the fan (RLS: their own profile and memberships
// only). The username, the level and the sites joined are the passport summary; the progress to the next level is getLevelInfo on the
// xp of the passport (every site added up); the streak of each site is its daily streak, which is live only while its last day is
// today or yesterday (effectiveStreak, as the passports show it): KpopQuiz keeps it on the profile, OtakuQuiz on its membership.
// Any error reads as signed out, so the page never fails because the database is down.

import { getLevelInfo } from '@/lib/constants';
import { effectiveStreak } from '@/lib/passport-ui/world-reads';
import { createServerClient } from '@/lib/supabase/server';

import { buildPassportSummary, passportXp } from './passport-summary';

import type { SummaryMembership, SummaryProfile } from './passport-summary';
import type { HomeSite, HomeViewer } from './home-types';

export interface ViewerProfile extends SummaryProfile {
  readonly daily_streak: number | null;
  readonly last_daily_date: string | null;
}

export interface ViewerMembership extends SummaryMembership {
  readonly daily_streak?: number | null;
  readonly last_daily_date?: string | null;
}

/** Pure part: the rows to the viewer. Null when there is no username yet. */
export function buildHomeViewer(profile: ViewerProfile | null, rows: readonly ViewerMembership[], now: Date = new Date()): HomeViewer | null {
  const summary = buildPassportSummary(profile, rows);
  if (!profile || !summary) return null;
  const anime = rows.find((r) => r.site_id === 'anime' && r.activated_at !== null && r.banned_at === null);
  const streaks: Record<HomeSite, number> = {
    kpop: effectiveStreak(profile.daily_streak ?? 0, profile.last_daily_date, now),
    anime: anime ? effectiveStreak(anime.daily_streak ?? 0, anime.last_daily_date ?? null, now) : 0,
  };
  return {
    username: summary.username,
    level: summary.level,
    sitesJoined: summary.sites.length,
    progress: getLevelInfo(passportXp(profile, rows), 'hub').progress,
    streaks,
  };
}

export interface HomeSession {
  readonly viewer: HomeViewer;
  /** The account id, checked by the session; only the server loaders (For you, Surprise me) take it. */
  readonly userId: string;
}

/** The signed-in fan and their id, or null (signed out, no username yet, or any error). */
export async function loadHomeSession(): Promise<HomeSession | null> {
  try {
    const supabase = await createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;
    const [profile, memberships] = await Promise.all([
      supabase.from('profiles').select('username, xp, daily_streak, last_daily_date').eq('id', user.id).maybeSingle(),
      supabase.from('world_memberships').select('site_id, xp, activated_at, banned_at, daily_streak, last_daily_date').eq('user_id', user.id),
    ]);
    if (profile.error || memberships.error) return null;
    const viewer = buildHomeViewer(profile.data as ViewerProfile | null, (memberships.data ?? []) as ViewerMembership[]);
    return viewer ? { viewer, userId: user.id } : null;
  } catch {
    return null;
  }
}

/** The signed-in fan, or null. */
export async function loadHomeViewer(): Promise<HomeViewer | null> {
  return (await loadHomeSession())?.viewer ?? null;
}
