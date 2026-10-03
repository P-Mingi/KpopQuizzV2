// G8 (V12): the server reads behind the v12 additions of the group hub. Called
// only when isUxV12() (components/group/ux-v1/hub-growth.tsx), so a v11-only
// render makes none of them. Reads only, public and cookie-free except the
// blindtest run count (bt_runs is closed to anon: service role, server only).
//
// Every read is SOFT: these blocks are additions, never the hub's locked SEO
// parts, so a failed read hides one line instead of failing the ISR render. A
// failure THROWS inside unstable_cache (never cached) and is caught outside.

import { unstable_cache } from 'next/cache';

import { CACHE_TTL } from '@/lib/db/cache-policy';
import { getTeamIds } from '@/lib/editorial/accounts';
import { getFansPicked } from '@/lib/duel/server';
import { isLiveOpen } from '@/lib/live/server';
import { getNameAllSet, getNameAllStats } from '@/lib/name-all/server';
import { prettyPath } from '@/lib/name-all/round';
import { isNameAllGroup } from '@/lib/name-all/spellings';
import { getMemberCounts, getWmaGroupSlugs } from '@/lib/personality/data';
import { MIN_RESULTS_FOR_SHARES, whichMemberPath } from '@/lib/personality/view';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isMissingTable } from '@/lib/ux-v1/p8/features';

import { NUDGE_DAYS, hubState, resultsTotal } from './growth';

import type { FansPickedResponse } from '@/lib/duel/types';
import type { WaysInput } from './growth';

async function soft<T>(run: () => Promise<T>, fallback: T, what: string): Promise<T> {
  try {
    return await run();
  } catch (err) {
    console.error(`[group-hub v12] ${what}:`, err instanceof Error ? err.message : err);
    return fallback;
  }
}

/** Plays of the group's published quizzes in the last NUDGE_DAYS days (head count). */
const readRecentPlays = unstable_cache(
  async (groupId: number): Promise<number> => {
    const since = new Date(Date.now() - NUDGE_DAYS * 86_400_000).toISOString();
    const { count, error } = await createPublicReadClient()
      .from('plays')
      .select('id, quizzes!inner(group_id, status)', { count: 'exact', head: true })
      .eq('quizzes.group_id', groupId)
      .eq('quizzes.status', 'published')
      .gt('created_at', since);
    if (error || count === null) throw new Error(`recent plays: ${error?.message ?? 'no count'}`);
    return count;
  },
  ['v12:g8:hub-recent-plays:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['quizzes'] },
);

/** Finished real runs of the group blindtest (G1's bt_runs), or null while the
 *  table does not exist (SQL pending) or the server has no service key. */
const readBtPlays = unstable_cache(
  async (slug: string): Promise<number | null> => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    const { count, error, status } = await createServiceRoleClient()
      .from('bt_runs')
      .select('id', { count: 'exact', head: true })
      .eq('playlist', `group:${slug}`)
      .eq('is_test', false)
      .not('finished_at', 'is', null);
    if (error) {
      if (isMissingTable(error, status)) return null;
      throw new Error(`bt plays: ${error.message}`);
    }
    return count ?? null;
  },
  ['v12:g8:hub-bt-plays:v1'],
  { revalidate: CACHE_TTL.stats, tags: ['bt-runs'] },
);

export interface FirstCreator {
  username: string;
  href: string;
}

interface FirstRow {
  creator_id: string | null;
  profiles: { username: string | null; banned_at: string | null } | null;
}

/** The creator of the group's oldest published quiz (id kept server side only). */
const readFirstCreator = unstable_cache(
  async (groupId: number): Promise<{ id: string; username: string } | null> => {
    const { data, error } = await createPublicReadClient()
      .from('quizzes')
      .select('creator_id, profiles!inner(username, banned_at)')
      .eq('status', 'published')
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })
      .limit(1);
    if (error) throw new Error(`first creator: ${error.message}`);
    const row = ((data ?? []) as unknown as FirstRow[])[0];
    if (!row?.creator_id || !row.profiles?.username || row.profiles.banned_at) return null;
    return { id: row.creator_id, username: row.profiles.username };
  },
  ['v12:g8:hub-first-creator:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['quizzes'] },
);

export interface HubGrowthData {
  ways: WaysInput;
  /** Fans picked (G7): render the section only when `ranked`. */
  fansPicked: FansPickedResponse | null;
  /** Plays of the last 60 days (thin hub only), null when unknown. */
  recentPlays: number | null;
  /** Finished runs of the group blindtest (empty hub only), null when unknown. */
  btPlays: number | null;
  /** Who made the group's first quiz; null on an empty hub, for an editorial
   *  account or when unknown. */
  firstCreator: FirstCreator | null;
}

/**
 * Everything the v12 hub blocks need, read in parallel. `published` and `songs`
 * are the hub's own fail-closed counts (never re-read here).
 */
export async function getHubGrowth(g: { id: number; slug: string; name: string }, published: number, songs: number): Promise<HubGrowthData> {
  const state = hubState(published);
  const [wmaSlugs, set, fansPicked, recentPlays, btPlays, first, team, live] = await Promise.all([
    getWmaGroupSlugs(),
    isNameAllGroup(g.slug) ? soft(() => getNameAllSet(g.slug), null, 'name-all set') : Promise.resolve(null),
    soft<FansPickedResponse | null>(() => getFansPicked(g.slug), null, 'fans picked'),
    state === 'thin' ? soft<number | null>(() => readRecentPlays(g.id), null, 'recent plays') : Promise.resolve(null),
    state === 'empty' && songs > 0 ? soft<number | null>(() => readBtPlays(g.slug), null, 'bt plays') : Promise.resolve(null),
    state !== 'empty' ? soft(() => readFirstCreator(g.id), null, 'first creator') : Promise.resolve(null),
    getTeamIds(),
    // Play live only while the live mode is open (GET /api/live probe, fail closed: issue C2-002).
    isLiveOpen(),
  ]);
  const hasWma = wmaSlugs.includes(g.slug);
  const [stats, counts] = await Promise.all([
    set ? getNameAllStats(set) : Promise.resolve(null),
    hasWma ? getMemberCounts(g.id) : Promise.resolve(null),
  ]);
  const ranked = Boolean(fansPicked?.ranked && fansPicked.songs.length > 0);
  return {
    ways: {
      slug: g.slug,
      name: g.name,
      quizzes: published,
      songs,
      nameAll: set ? { href: prettyPath(g.slug), members: set.members.length, perfectPct: stats?.perfectPct ?? null } : null,
      whichMember: hasWma ? { href: whichMemberPath(g.slug), results: resultsTotal(counts, MIN_RESULTS_FOR_SHARES) } : null,
      thisOrThat: ranked ? { votes: fansPicked?.votes ?? null } : null,
      live,
    },
    fansPicked: ranked ? fansPicked : null,
    recentPlays,
    btPlays,
    firstCreator: first && !team.has(first.id) ? { username: first.username, href: `/u/${encodeURIComponent(first.username)}` } : null,
  };
}
