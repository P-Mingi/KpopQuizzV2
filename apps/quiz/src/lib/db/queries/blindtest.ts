import { unstable_cache } from 'next/cache';

import { getAdvertisablePlaylists } from '@/lib/blind-test-playlists';
import { createPublicReadClient } from '@/lib/supabase/server';
import { CACHE_TTL } from '@/lib/db/cache-policy';

// W7d - the picker no longer has its own rule.
//
// This used to require MIN_SONGS_FOR_GROUP = 15 with no clip condition, while the
// sitemap and the /blindtest links used a different rule entirely. Three surfaces on one
// page, two rules: akmu (11 songs) and taeyang (13) were advertised and linked but never
// offered in the picker, and 26 playable playlists were offered by nothing.
//
// It now delegates to the single definition in blind-test-playlists.ts, whose threshold
// is ROUND_SIZE, the number /api/blind-test/generate actually needs to fill a round.
// The old 15 was headroom asserted without evidence; pools of 11 were measured returning
// full 10-question rounds.

export interface BlindtestGroup {
  slug: string;
  name: string;
  count: number;
}

export async function getBlindtestGroups(): Promise<BlindtestGroup[]> {
  if (process.env.PLAYLIST_TRACE) console.log('[playlist-trace] wrapper call');
  const { groups } = await getAdvertisablePlaylists();
  return groups.map(g => ({ slug: g.slug, name: g.name, count: g.songs }));
}

/**
 * PERF NAV: the two catalog counts behind the "300+ songs / 60+ groups" label on
 * /blindtest and /pt/blindtest. Public + locale-independent, so ONE cached entry
 * serves both pages. Cookie-free (so the pages stay Static/ISR instead of the
 * cookie client forcing per-request dynamic render) + unstable_cache at the catalog
 * TTL (the label barely changes). Callers wrap it in their own try/catch so a DB
 * blip falls back to the label defaults without caching the fallback.
 */
export const getBlindtestStats = unstable_cache(
  async (): Promise<{ songs: number; groups: number }> => {
    const supabase = createPublicReadClient();
    const [{ count: songCount }, { count: groupCount }] = await Promise.all([
      supabase.from('songs').select('id', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('groups').select('id', { count: 'exact', head: true }),
    ]);
    return { songs: songCount ?? 0, groups: groupCount ?? 0 };
  },
  ['db:blindtest:getBlindtestStats:v1'],
  { revalidate: CACHE_TTL.catalog, tags: ['songs', 'groups'] },
);
