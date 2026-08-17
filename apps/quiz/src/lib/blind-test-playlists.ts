import { createPublicReadClient } from '@/lib/supabase/server';
import { STATIC_MODES } from '@/lib/blind-test-modes';

import type { BlindTestMode } from '@/lib/blind-test-modes';

export interface PlaylistGroup {
  slug: string;
  name: string;
  /** Real count of playable songs. Never rounded, never floored. */
  songs: number;
}

// W7c - ONE definition of "a blind test playlist we are willing to advertise".
//
// Before this, three places disagreed about which group playlists exist:
//   - the sitemap advertised groups found in `blind_test_songs`      (56)
//   - the /blindtest picker offered groups with >= 15 rows in `songs` (74)
//   - the game itself generates from `songs`, needing 10 to fill a round
// So the sitemap advertised 5 playlists the picker never offered, 3 of which cannot
// even fill a round (the-boyz 9 songs, miss-a 0, psy 0), while 23 playable ones were
// never advertised at all. Divergent sources are how the orphans got made.
//
// The rule here: a playlist is advertisable when it is BOTH advertised-basis (it has
// clip-ready rows in blind_test_songs) AND playable (>= ROUND_SIZE rows in `songs`,
// which is what /api/blind-test/generate actually draws from). Sitemap and index page
// both read this, so they cannot drift apart again.

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

export async function getAdvertisablePlaylists(): Promise<{
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

  const [songRows, clipRows, groupsRes] = await Promise.all([
    pageAll<{ group_id: number }>(() => cleanSongs(db)),
    pageAll<{ groups: { slug: string } | null }>(() =>
      db.from('blind_test_songs').select('groups!inner(slug)').eq('status', 'active').not('clip_chorus', 'is', null),
    ),
    db.from('groups').select('id, name, slug'),
  ]);

  const playable = new Map<number, number>();
  for (const r of songRows) playable.set(r.group_id, (playable.get(r.group_id) ?? 0) + 1);

  const hasClips = new Set(
    clipRows.map(r => (Array.isArray(r.groups) ? r.groups[0]?.slug : r.groups?.slug)).filter(Boolean) as string[],
  );

  const groups = ((groupsRes.data ?? []) as { id: number; name: string; slug: string }[])
    .map(g => ({ slug: g.slug, name: g.name, songs: playable.get(g.id) ?? 0 }))
    .filter(g => hasClips.has(g.slug) && g.songs >= ROUND_SIZE)
    .sort((a, b) => a.name.localeCompare(b.name, 'en'));

  return { staticModes: STATIC_MODES, groups };
}
