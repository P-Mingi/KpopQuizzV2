// V12 (owner, 2026-10-13: SEO): what a /blindtest/<mode> page plays, as rows a crawler can
// read. The v11 mode page held a title, a sentence and a Play button: about 32 words on 18
// URLs, crawled and left out of the index. The page now lists the real pool behind its
// Play button: how many songs, the best known of them, and the artists with the most songs
// in it.
//
// The pool is the one generate reads for the playlist the page plays (lib/ux-v1/p6/modes.ts
// modeRun): same statuses, same junk-title guard, same curated switch, same filter
// (app/api/blind-test/generate/route.ts). The legacy filters are mirrored below because a
// route file cannot export them; bt-mode-pool.test.ts reads the route source and fails if
// the two drift apart. Server only, cached, fail-soft (a failed read hides the sections).

import { unstable_cache } from 'next/cache';

import { applyPlaylistSpec, capByRank, specFollowsCuratedSwitch, specStatuses, v12Playlist } from '@/lib/blind-test-curated';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';
import { hasDbEnv, settle } from '@/lib/ux-v1/p6/hub-data';

import type { PlaylistSpec } from '@/lib/blind-test-curated';

/** The column filter of a legacy generate playlist, as data (generate's switch). Null: no filter ('all'). */
export type LegacyFilter = { col: 'gender' | 'generation' | 'tier'; values: string[] } | { col: 'is_title_track'; values: [true] } | null;

const GEN_MAP: Record<string, string> = { '1st-gen': '1st', '2nd-gen': '2nd', '3rd-gen': '3rd', '4th-gen': '4th', '5th-gen': '5th' };

/** generate's legacy playlists (GENERAL_PLAYLISTS); undefined for any other id. */
export function legacyFilter(playlist: string): LegacyFilter | undefined {
  switch (playlist) {
    case 'all': return null;
    case 'gg': return { col: 'gender', values: ['gg'] };
    case 'bg': return { col: 'gender', values: ['bg'] };
    case 'solo': return { col: 'gender', values: ['solo_female', 'solo_male'] };
    case 'title-tracks': return { col: 'is_title_track', values: [true] };
    case 'hits': return { col: 'tier', values: ['iconic', 'popular'] };
    case 'deep': return { col: 'tier', values: ['medium', 'hard', 'unknown'] };
    default: return GEN_MAP[playlist] ? { col: 'generation', values: [GEN_MAP[playlist]] } : undefined;
  }
}

export interface PoolSong { title: string; artist: string }
export interface PoolArtist { name: string; songs: number; groupId: number | null }
export interface ModePool {
  /** Songs a round is drawn from. */
  total: number;
  /** The best known songs (Deezer rank), one per title and artist. */
  songs: PoolSong[];
  /** The artists with the most songs in the pool. */
  artists: PoolArtist[];
}

/**
 * Modes that play the very pool of /blindtest/classic ('all'): generate has no clip point and
 * no clip length (lib/ux-v1/p6/modes.ts), so these pages are the classic game under another
 * name. With the v12 flag their canonical is /blindtest/classic and the sitemap leaves them
 * out: one indexable page for one game, instead of six near copies.
 */
export const DUPLICATE_MODES: readonly string[] = ['intro-challenge', 'verse-only', 'bridge-or-break', 'speed-round', 'random-all'];
export const DUPLICATE_CANONICAL = '/blindtest/classic';
export function isDuplicateMode(id: string): boolean {
  return DUPLICATE_MODES.includes(id);
}

export const POOL_SONGS_SHOWN = 12;
export const POOL_ARTISTS_SHOWN = 12;

interface Row { title: string | null; artist_name: string | null; group_id: number | null; deezer_rank: number | null }

/** Songs list and artist ranking of a pool (pure; the read is below). */
export function summarizePool(rows: readonly Row[]): ModePool {
  const byRank = [...rows].sort((a, b) => (b.deezer_rank ?? 0) - (a.deezer_rank ?? 0));
  const seen = new Set<string>();
  const songs: PoolSong[] = [];
  for (const r of byRank) {
    const title = r.title?.trim();
    const artist = r.artist_name?.trim();
    if (!title || !artist) continue;
    const key = `${title.toLowerCase()}|${artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    songs.push({ title, artist });
    if (songs.length >= POOL_SONGS_SHOWN) break;
  }
  const counts = new Map<string, PoolArtist>();
  for (const r of rows) {
    const name = r.artist_name?.trim();
    if (!name) continue;
    const key = r.group_id != null ? `g${r.group_id}` : `a${name.toLowerCase()}`;
    const cur = counts.get(key);
    if (cur) cur.songs += 1;
    else counts.set(key, { name, songs: 1, groupId: r.group_id });
  }
  const artists = [...counts.values()].sort((a, b) => b.songs - a.songs || a.name.localeCompare(b.name, 'en')).slice(0, POOL_ARTISTS_SHOWN);
  return { total: rows.length, songs, artists };
}

async function readPool(playlist: string, v12: boolean): Promise<ModePool | null> {
  const spec: PlaylistSpec | null = v12Playlist(playlist, v12);
  const legacy = spec ? undefined : legacyFilter(playlist);
  if (!spec && legacy === undefined) return null;
  const db = createPublicReadClient();
  const curated = process.env.SONGS_IS_CURATED === 'true' && (spec ? specFollowsCuratedSwitch(spec) : playlist !== 'deep');
  const rows = await fetchAllRows<Row>(() => {
    let q = db.from('songs').select('title, artist_name, group_id, deezer_rank')
      .in('status', spec ? [...specStatuses(spec)] : ['active'])
      .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%');
    if (curated) q = q.eq('is_curated', true);
    if (spec) q = applyPlaylistSpec(q, spec);
    else if (legacy) q = legacy.values.length === 1 ? q.eq(legacy.col, legacy.values[0]) : q.in(legacy.col, legacy.values);
    return q.order('id', { ascending: true });
  });
  return summarizePool(spec ? capByRank(rows, spec) : rows);
}

const getPoolCached = unstable_cache(readPool, ['ux12:bt-mode-pool:v1'], { revalidate: CACHE_TTL.catalog, tags: ['songs'] });

/** The pool behind a playlist id, or null (unknown id, no database, or a failed read). */
export async function getModePool(playlist: string, v12: boolean): Promise<ModePool | null> {
  if (!hasDbEnv()) return null;
  return (await settle(() => getPoolCached(playlist, v12), null, 8000)).value;
}
