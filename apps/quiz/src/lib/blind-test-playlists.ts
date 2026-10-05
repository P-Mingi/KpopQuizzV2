import { cache } from 'react';

import { createPublicReadClient } from '@/lib/supabase/server';
import { STATIC_MODES, THEMED_MODE_IDS, themedModesOn, themedVisible } from '@/lib/blind-test-modes';
import { applyPlaylistSpec, specFollowsCuratedSwitch, specStatuses, V12_PLAYLISTS } from '@/lib/blind-test-curated';

import type { BlindTestMode } from '@/lib/blind-test-modes';
import type { PlaylistSpec } from '@/lib/blind-test-curated';

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

  // V12 (flag only): a themed playlist under its floor is not advertised. Flag off: no extra
  // read, the list is STATIC_MODES as before.
  const staticModes = themedModesOn() ? visibleStaticModes(STATIC_MODES, await getThemedAvailability()) : STATIC_MODES;

  return { staticModes, groups };
}

// ── V12 themed playlists: the hidden-under-10 rule ──────────────────────────────────────────
// A themed mode (lib/blind-test-modes.ts THEMED_MODES) is shown, linked, put in the sitemap and
// playable only when generate can fill a round from it: at least THEMED_MIN_SONGS songs in the
// very pool generate reads. The count below is that pool's count (same statuses, same title
// guard, same curated switch, same filters), so the door and the room cannot disagree.

/** The generate rule behind a themed mode id ('5th-gen' is a legacy playlist of generate). */
export function themedSpec(modeId: string): PlaylistSpec | null {
  if (modeId === '5th-gen') return { generation: '5th' };
  return THEMED_MODE_IDS.includes(modeId) ? V12_PLAYLISTS[modeId] ?? null : null;
}

/** Drop the themed modes under their floor; every other mode passes through untouched. */
export function visibleStaticModes(modes: readonly BlindTestMode[], counts: Readonly<Record<string, number>>): BlindTestMode[] {
  return modes.filter((m) => !THEMED_MODE_IDS.includes(m.id) || themedVisible(counts[m.id] ?? 0));
}

async function countThemed(): Promise<Record<string, number>> {
  const db = createPublicReadClient();
  const curated = process.env.SONGS_IS_CURATED === 'true';
  const out: Record<string, number> = {};
  await Promise.all(THEMED_MODE_IDS.map(async (id) => {
    const spec = themedSpec(id);
    if (!spec) { out[id] = 0; return; }
    try {
      let q = db.from('songs').select('id', { count: 'exact', head: true })
        .in('status', [...specStatuses(spec)])
        .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%');
      if (curated && specFollowsCuratedSwitch(spec)) q = q.eq('is_curated', true);
      const { count, error } = await applyPlaylistSpec(q, spec);
      // Fail closed: a read that fails hides the playlist instead of advertising a dead door.
      const n = error ? 0 : count ?? 0;
      out[id] = spec.topByRank ? Math.min(n, spec.topByRank) : n;
    } catch {
      out[id] = 0;
    }
  }));
  return out;
}

/** Playable songs per themed mode id (real counts). One read per request. */
export const getThemedAvailability = cache(async (): Promise<Record<string, number>> => countThemed());

/**
 * The static modes a visitor can really play: STATIC_MODES minus the themed modes under their
 * floor. With the v12 flag off this is STATIC_MODES itself and no query runs.
 */
export async function getPlayableStaticModes(): Promise<BlindTestMode[]> {
  if (!themedModesOn()) return STATIC_MODES;
  return visibleStaticModes(STATIC_MODES, await getThemedAvailability());
}

/** Is this mode id playable? Non-themed ids are always true (their own pages decide). */
export async function isThemedModePlayable(modeId: string): Promise<boolean> {
  if (!THEMED_MODE_IDS.includes(modeId)) return true;
  if (!themedModesOn()) return false;
  return themedVisible((await getThemedAvailability())[modeId] ?? 0);
}

// ── F6a (AU1 I2): kpop-legends and title-tracks play as named, only when a round fits ─────────
// Both are v11 mode pages (their URL, title and copy stay). Under the flag their run reads their
// own pool, the very pool generate reads for that playlist, only when it holds THEMED_MIN_SONGS
// songs; otherwise the page keeps its v11 run (lib/ux-v1/p6/modes.ts NAMED_WHEN_PLAYABLE).

/** The count query of generate's pool for a named legacy mode, or null for any other id. */
function namedPoolCount(modeId: string, curated: boolean): PromiseLike<{ count: number | null; error: unknown }> | null {
  const db = createPublicReadClient();
  const base = () => db.from('songs').select('id', { count: 'exact', head: true })
    .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%');
  if (modeId === 'kpop-legends') {
    const spec = V12_PLAYLISTS['kpop-legends']!;
    let q = base().in('status', [...specStatuses(spec)]);
    if (curated && specFollowsCuratedSwitch(spec)) q = q.eq('is_curated', true);
    return applyPlaylistSpec(q, spec);
  }
  if (modeId === 'title-tracks') {
    // generate's legacy 'title-tracks' case: active, the curated switch, is_title_track.
    let q = base().eq('status', 'active');
    if (curated) q = q.eq('is_curated', true);
    return q.eq('is_title_track', true);
  }
  return null;
}

/**
 * Does a named legacy mode (kpop-legends, title-tracks) fill a round from its own pool? False
 * with the flag off (no query), for any other id, and when the read fails (the page then keeps
 * its v11 run, which always plays).
 */
export async function isNamedModePlayable(modeId: string): Promise<boolean> {
  if (!themedModesOn()) return false;
  try {
    const read = namedPoolCount(modeId, process.env.SONGS_IS_CURATED === 'true');
    if (!read) return false;
    const { count, error } = await read;
    return !error && themedVisible(count ?? 0);
  } catch {
    return false;
  }
}

// W7-CLOSE: /blindtest asks for this twice in one render (once directly for the links,
// once through getBlindtestGroups for the picker). React cache() dedupes it to a single
// DB read per request instead of paginating `songs` twice.
export const getAdvertisablePlaylists = cache(async () => {
  if (process.env.PLAYLIST_TRACE) console.log('[playlist-trace] EXECUTE (real DB read)');
  return fetchAdvertisablePlaylists();
});
