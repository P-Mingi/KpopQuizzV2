import { getAdvertisablePlaylists } from '@/lib/blind-test-playlists';

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
  const { groups } = await getAdvertisablePlaylists();
  return groups.map(g => ({ slug: g.slug, name: g.name, count: g.songs }));
}
