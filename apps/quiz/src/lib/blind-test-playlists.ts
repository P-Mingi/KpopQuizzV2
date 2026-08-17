import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';

import type { BlindTestMode } from '@/lib/blind-test-modes';

export interface PlaylistGroup {
  slug: string;
  name: string;
  /** Real count of playable songs. Never rounded, never floored. */
  songs: number;
}

// W7c/W7d - THE one definition of a group blind test playlist. Read by the sitemap, by
// the /blindtest index links, and by the picker on that page, so all three agree.
//
// W7c collapsed two of those three surfaces and left the picker on its own rule
// (MIN_SONGS_FOR_GROUP = 15, no clip condition), which moved the drift instead of
// removing it: akmu and taeyang ended up advertised and linked but not offered.
//
// W7d also DROPPED the clip condition, because it was measured to have no runtime
// meaning. The group blind test path is /blindtest/group-X -> blind-test-player ->
// /api/blind-test/generate, which reads `songs` and re-fetches Deezer previews.
// Nothing in that path reads `blind_test_songs`. Proof: five groups with >= 10 clean
// `songs` rows and ZERO clip rows (loona, astro, tws, artms, katseye) each returned a
// full 10-question round with 10 preview URLs, identical to bts which has clips. The
// old justification ("it has clip-ready rows") was circular: advertisable because the
// old sitemap advertised it.
//
// THE RULE, and it is the runtime's own: a group playlist exists when the group has at
// least ROUND_SIZE clean active songs, because that is exactly what generate needs to
// fill a round. The thinnest real pools (akmu 11, jeon-somi 11, cortis 13, babymonster
// 13, taeyang 13) were each verified to return a full round.

/** A round needs this many songs; below it the page cannot produce a game. */
export const ROUND_SIZE = 10;

/** Mirrors the generate route's pool: active, real songs, no remix/instrumental junk. */
function cleanSongs(db: ReturnType<typeof createPublicReadClient>) {
  return db
    .from('songs')
    .select('group_id')
    .eq('status', 'active')
    .not('group_id', 'is', null)
    .not('title', 'ilike', '%remix%')
    .not('title', 'ilike', '%instrumental%')
    .not('title', 'ilike', '%inst.%')
    .not('title', 'ilike', '%karaoke%');
}

async function fetchAdvertisablePlaylists(): Promise<{
  staticModes: BlindTestMode[];
  groups: PlaylistGroup[];
}> {
  const db = createPublicReadClient();

  // Paginate both reads: PostgREST caps .select() at 1000 and counting a capped read
  // client-side is how the ranking dead-walls happened.
  const pageAll = async <T>(make: () => { range: (a: number, b: number) => PromiseLike<{ data: unknown[] | null }> }): Promise<T[]> => {
    const out: T[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await make().range(from, from + 999);
      const rows = (data ?? []) as T[];
      out.push(...rows);
      if (rows.length < 1000) break;
    }
    return out;
  };

  const [songRows, groupsRes] = await Promise.all([
    pageAll<{ group_id: number }>(() => cleanSongs(db)),
    db.from('groups').select('id, name, slug'),
  ]);

  const playable = new Map<number, number>();
  for (const r of songRows) playable.set(r.group_id, (playable.get(r.group_id) ?? 0) + 1);

  const groups = ((groupsRes.data ?? []) as { id: number; name: string; slug: string }[])
    .map(g => ({ slug: g.slug, name: g.name, songs: playable.get(g.id) ?? 0 }))
    .filter(g => g.songs >= ROUND_SIZE)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  return { staticModes: STATIC_MODES, groups };
}

// W7-CLOSE: /blindtest asks for this twice in one render (once directly for the links,
// once through getBlindtestGroups for the picker). React cache() dedupes it to a single
// DB read per request instead of paginating `songs` twice.
export const getAdvertisablePlaylists = cache(async () => {
  if (process.env.PLAYLIST_TRACE) console.log('[playlist-trace] EXECUTE (real DB read)');
  return fetchAdvertisablePlaylists();
});
