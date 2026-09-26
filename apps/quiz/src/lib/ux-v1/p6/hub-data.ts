// Server reads of the v11 blindtest hub that are the same for everyone (the page
// stays Static/ISR: cookie-free public client, unstable_cache at the stats TTL).
// Read only.
//
// A failed read is NEVER cached (C3-009): every read below THROWS on a PostgREST
// error and on a result that cannot be real (no groups, no songs), and unstable_cache
// does not store a rejected call, so the next request reads again. The fail-soft
// state is decided by the caller (hub.tsx), outside the cache. The "no Supabase env"
// case (a preview build without secrets) is also decided outside the cache.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { isNextInternalError } from '@/lib/error-handling';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';

import type { BtGroup } from './playlists';

export interface GroupPopularity {
  /** Blindtest plays of each group playlist in the last 30 days (blind_test_plays.mode_id = group-<slug>). */
  blindtest: Record<string, number>;
  /** Plays of each group's published quizzes (the fallback, DESIGN-SPEC 17.5). */
  quiz: Record<string, number>;
}

/** Supabase env present. Without it the client constructor throws synchronously,
 *  which no try/catch around an await can see (verse-laws 6). */
export function hasDbEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/** UTC day of the daily blindtest (the daily routes and the unique constraint use UTC). */
export function utcDay(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function readPopularity(): Promise<GroupPopularity> {
  const db = createPublicReadClient();
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
  // fetchAllRows throws on any PostgREST error.
  const [plays, quizzes, groups] = await Promise.all([
    fetchAllRows<{ mode_id: string }>(() => db.from('blind_test_plays').select('mode_id').like('mode_id', 'group-%').gte('created_at', since)),
    fetchAllRows<{ group_id: number | null; play_count: number | null }>(() => db.from('quizzes').select('group_id, play_count').eq('status', 'published')),
    fetchAllRows<{ id: number; slug: string }>(() => db.from('groups').select('id, slug')),
  ]);
  if (groups.length === 0 || quizzes.length === 0) throw new Error('[p6 popularity] empty read');
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

export const getGroupPopularity = unstable_cache(readPopularity, ['ux11:p6:group-popularity:v2'], {
  revalidate: CACHE_TTL.stats,
  tags: ['quizzes', 'groups'],
});

/** Fans on the board of `date` (0 is real early in the UTC day; an error throws). */
export async function readTodayPlayers(date: string): Promise<number> {
  const db = createPublicReadClient();
  const { count, error } = await db.from('daily_blindtest_scores').select('user_id', { count: 'exact', head: true }).eq('date', date);
  if (error) throw new Error(`[p6 today players] ${error.message}`);
  if (typeof count !== 'number') throw new Error('[p6 today players] no count');
  return count;
}

/** Fans on today's Blindtest of the day board (hero eyebrow), keyed by the UTC day
 *  (a new day never reads yesterday's entry). The client refreshes it on load; the
 *  stats TTL keeps the page's ISR at 1 h (a shorter TTL here would lower the whole
 *  page's revalidate and multiply the catalog reads). */
export const getTodayPlayers = unstable_cache(readTodayPlayers, ['ux11:p6:today-players:v2'], { revalidate: CACHE_TTL.stats });

/** Active songs in the pool ("All K-pop · 4,120 songs"). 0 cannot be real: it throws. */
export async function readSongCount(): Promise<number> {
  const db = createPublicReadClient();
  const { count, error } = await db.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active');
  if (error) throw new Error(`[p6 song count] ${error.message}`);
  if (typeof count !== 'number' || count <= 0) throw new Error('[p6 song count] empty read');
  return count;
}

export const getSongCount = unstable_cache(readSongCount, ['ux11:p6:song-count:v1'], { revalidate: CACHE_TTL.catalog, tags: ['songs'] });

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

/** A read with its fail-soft value and whether it really succeeded (safeFetch
 *  hides that; the hub needs it to keep the last good ISR copy). Next's own
 *  control-flow errors are rethrown. */
export async function settle<T>(read: () => Promise<T>, fallback: T, timeoutMs = 5000): Promise<{ value: T; ok: boolean }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      read().then((value) => ({ value, ok: true })),
      new Promise<{ value: T; ok: boolean }>((res) => { timer = setTimeout(() => res({ value: fallback, ok: false }), timeoutMs); }),
    ]);
  } catch (err) {
    if (isNextInternalError(err)) throw err;
    console.error('[blindtest v11] read failed:', err instanceof Error ? err.message : 'unknown error');
    return { value: fallback, ok: false };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Called by the hub after its reads, outside every cache. At build time and in dev
 * a failed read renders the fail-soft state (verse-laws 6: never a 500 there). On a
 * production ISR regeneration it throws instead, so Next keeps serving the last good
 * copy of /blindtest and retries on the next request: a failed read never lands in
 * the ISR copy either.
 */
export function keepLastGoodCopyOnFailure(failed: readonly string[], env: { NODE_ENV?: string | undefined; NEXT_PHASE?: string | undefined } = process.env): void {
  if (failed.length === 0) return;
  if (env.NODE_ENV !== 'production' || env.NEXT_PHASE === 'phase-production-build') return;
  throw new Error(`[blindtest v11] read failed (${failed.join(', ')}): keeping the last good ISR copy`);
}
