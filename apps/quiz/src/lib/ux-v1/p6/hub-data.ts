// Server reads of the v11 blindtest hub that are the same for everyone (the page
// stays Static/ISR: cookie-free public client, unstable_cache at the stats TTL).
// Read only.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { BtGroup } from './playlists';

export interface GroupPopularity {
  /** Blindtest plays of each group playlist in the last 30 days (blind_test_plays.mode_id = group-<slug>). */
  blindtest: Record<string, number>;
  /** Plays of each group's published quizzes (the fallback, DESIGN-SPEC 17.5). */
  quiz: Record<string, number>;
}

const EMPTY: GroupPopularity = { blindtest: {}, quiz: {} };

async function readPopularity(): Promise<GroupPopularity> {
  // No Supabase env (preview build without secrets): the client constructor throws
  // synchronously, which safeFetch cannot catch (verse-laws 6).
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return EMPTY;
  const db = createPublicReadClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  const [plays, quizzes, groups] = await Promise.all([
    fetchAllRows<{ mode_id: string }>(() => db.from('blind_test_plays').select('mode_id').like('mode_id', 'group-%').gte('created_at', since)),
    fetchAllRows<{ group_id: number | null; play_count: number | null }>(() => db.from('quizzes').select('group_id, play_count').eq('status', 'published')),
    fetchAllRows<{ id: number; slug: string }>(() => db.from('groups').select('id, slug')),
  ]);
  const blindtest: Record<string, number> = {};
  for (const p of plays) {
    const slug = p.mode_id.slice('group-'.length);
    if (slug) blindtest[slug] = (blindtest[slug] ?? 0) + 1;
  }
  const slugOf = new Map(groups.map((g) => [g.id, g.slug]));
  const quiz: Record<string, number> = {};
  for (const q of quizzes) {
    const slug = q.group_id === null ? undefined : slugOf.get(q.group_id);
    if (slug) quiz[slug] = (quiz[slug] ?? 0) + (q.play_count ?? 0);
  }
  return { blindtest, quiz };
}

export const getGroupPopularity = unstable_cache(readPopularity, ['ux11:p6:group-popularity:v1'], {
  revalidate: CACHE_TTL.stats,
  tags: ['quizzes', 'groups'],
});

async function readTodayPlayers(): Promise<number> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return 0;
  const db = createPublicReadClient();
  const date = new Date().toISOString().slice(0, 10); // UTC day, like the daily routes
  const { count } = await db.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true }).eq('date', date);
  return count ?? 0;
}

/** Fans on today's Blindtest of the day board (hero eyebrow). The client refreshes it
 *  on load, so the stats TTL keeps the page's ISR at 1 h (a shorter TTL here would
 *  lower the whole page's revalidate and multiply the catalog reads). */
export const getTodayPlayers = unstable_cache(readTodayPlayers, ['ux11:p6:today-players:v1'], { revalidate: CACHE_TTL.stats });

/**
 * The six popular group playlists (DESIGN-SPEC 17.5): most blindtest plays over
 * the last 30 days, then (fallback, and to fill the six) most quiz plays. Only
 * playable groups. Ties keep the alphabetical order of `groups`.
 */
export function popularSix(groups: readonly BtGroup[], pop: GroupPopularity, n = 6): BtGroup[] {
  return [...groups]
    .map((g, i) => ({ g, i, bt: pop.blindtest[g.slug] ?? 0, q: pop.quiz[g.slug] ?? 0 }))
    .sort((a, b) => b.bt - a.bt || b.q - a.q || a.i - b.i)
    .slice(0, n)
    .map((x) => x.g);
}
