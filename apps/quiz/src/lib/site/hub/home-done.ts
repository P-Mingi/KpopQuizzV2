// Home v3 (2026-10-29, docs/strategy/o1/dle/prototype/Home.dc.html): which quiz of the day the signed-in fan already finished today, for the
// done marks and the progress line of "Today". A quiz counts as done when the fan has a row in `plays` for it since 00:00 UTC (a play row is
// written when a run is finished). The daily streak date is not used: any daily (the blind test too) moves it. `plays` is a public read
// (plays_select_all); the fan's id comes from the session, checked by the caller. Any error reads as nothing done.

import { createPublicReadClient } from '@/lib/supabase/server';

import { safeBlock } from './home-safe';

import type { HomeDone, HomeToday } from './home-types';

export const NOTHING_DONE: HomeDone = { kpop: false, anime: false };

/** Pure part: the quiz ids played today to the done mark of each site. */
export function doneOf(today: Pick<HomeToday, 'quizzes'>, playedIds: ReadonlySet<string>): HomeDone {
  return {
    kpop: today.quizzes.some((q) => q.site === 'kpop' && playedIds.has(q.id)),
    anime: today.quizzes.some((q) => q.site === 'anime' && playedIds.has(q.id)),
  };
}

export async function loadHomeDone(userId: string | null, today: HomeToday | null, now: Date = new Date()): Promise<HomeDone> {
  if (!userId || !today || today.quizzes.length === 0) return NOTHING_DONE;
  return safeBlock('done', async () => {
    const since = `${now.toISOString().slice(0, 10)}T00:00:00Z`;
    const res = await createPublicReadClient().from('plays').select('quiz_id')
      .eq('player_id', userId).in('quiz_id', today.quizzes.map((q) => q.id)).gte('created_at', since).limit(20);
    if (res.error) throw new Error(`plays of today: ${res.error.message}`);
    const rows = (res.data ?? []) as Array<{ quiz_id: string }>;
    return doneOf(today, new Set(rows.map((r) => r.quiz_id)));
  }, NOTHING_DONE);
}
