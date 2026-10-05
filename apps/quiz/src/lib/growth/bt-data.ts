// Server reads of the V12 blindtest acquisition surfaces (the Playlists rail, the
// theme pages, the landings). Read only, cookie-free public client (the pages stay
// Static/ISR), and every read is fail-soft: a failed read hides its number, it never
// invents one and never fails the page (verse-laws 6 and 10).

import { unstable_cache } from 'next/cache';

import { applyPlaylistSpec, specFollowsCuratedSwitch, specStatuses } from '@/lib/blind-test-curated';
import { getPlayableStaticModes, getThemedAvailability, themedSpec } from '@/lib/blind-test-playlists';
import { CACHE_TTL } from '@/lib/db/cache-policy';
import { isNextInternalError } from '@/lib/error-handling';
import { createPublicReadClient } from '@/lib/supabase/server';
import { getPlayableGroups, getSongCount, hasDbEnv, settle, utcDay } from '@/lib/ux-v1/p6/hub-data';
import { isUxV12 } from '@/lib/ux-v12';

import { BT_THEMES } from './bt-themes';

import type { LandingNumbers } from './bt-landing';
import type { PlaylistSpec } from '@/lib/blind-test-curated';

/** The generate rule of a theme id. '4th-gen' is a legacy playlist of generate. */
export function themeSpec(id: string): PlaylistSpec | null {
  if (id === '4th-gen') return { generation: '4th' };
  return themedSpec(id);
}

const curatedOnly = (spec: PlaylistSpec): boolean => process.env.SONGS_IS_CURATED === 'true' && specFollowsCuratedSwitch(spec);

// Both reads below mirror the pool generate reads for a spec: same statuses, same
// title guard, same curated switch, same filters (lib/blind-test-playlists.ts countThemed).
async function readLegacyCount(id: string): Promise<number> {
  const spec = themeSpec(id);
  if (!spec) return 0;
  const db = createPublicReadClient();
  let q = db.from('songs').select('id', { count: 'exact', head: true })
    .in('status', [...specStatuses(spec)])
    .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%');
  if (curatedOnly(spec)) q = q.eq('is_curated', true);
  const { count, error } = await applyPlaylistSpec(q, spec);
  if (error) throw new Error(`[g3 theme count] ${error.message}`);
  return count ?? 0;
}

const getLegacyCount = unstable_cache(readLegacyCount, ['ux12:g3:legacy-count:v1'], { revalidate: CACHE_TTL.catalog, tags: ['songs'] });

export interface ThemeState {
  /** Ids of the static modes a visitor can really play (the hidden-under-10 rule). */
  playable: Set<string>;
  /** Real playable songs per theme id; an id without a real count is absent. */
  counts: Record<string, number>;
}

/**
 * Which themes are playable and how many songs each holds. Flag off, or no database
 * env: nothing is playable and no query runs.
 */
export async function getThemeState(): Promise<ThemeState> {
  if (!isUxV12() || !hasDbEnv()) return { playable: new Set(), counts: {} };
  const [modes, themed, gen4] = await Promise.all([
    settle(() => getPlayableStaticModes(), [] as Awaited<ReturnType<typeof getPlayableStaticModes>>),
    settle(() => getThemedAvailability(), {} as Record<string, number>),
    settle(() => getLegacyCount('4th-gen'), 0),
  ]);
  const counts: Record<string, number> = {};
  for (const t of BT_THEMES) {
    const n = t.id === '4th-gen' ? gen4.value : themed.value[t.id];
    if (typeof n === 'number' && n > 0) counts[t.id] = n;
  }
  return { playable: new Set(modes.value.map((m) => m.id)), counts };
}

export interface ThemeTrack { title: string; artist: string }

async function readThemeTracks(id: string, limit: number): Promise<ThemeTrack[]> {
  const spec = themeSpec(id);
  if (!spec) return [];
  const db = createPublicReadClient();
  let q = db.from('songs').select('title, artist_name, deezer_rank')
    .in('status', [...specStatuses(spec)])
    .not('title', 'ilike', '%remix%').not('title', 'ilike', '%instrumental%').not('title', 'ilike', '%inst.%').not('title', 'ilike', '%karaoke%');
  if (curatedOnly(spec)) q = q.eq('is_curated', true);
  const { data, error } = await applyPlaylistSpec(q, spec).order('deezer_rank', { ascending: false, nullsFirst: false }).limit(limit);
  if (error) throw new Error(`[g3 theme tracks] ${error.message}`);
  const rows = (data ?? []) as Array<{ title: string | null; artist_name: string | null }>;
  return rows.flatMap((r) => (r.title && r.artist_name ? [{ title: r.title, artist: r.artist_name }] : []));
}

const getThemeTracksCached = unstable_cache(readThemeTracks, ['ux12:g3:theme-tracks:v1'], { revalidate: CACHE_TTL.catalog, tags: ['songs'] });

/** How many songs a theme page lists (the most played on Deezer first, generate's own rank). */
export const THEME_TRACKS_SHOWN = 10;

/** The songs a theme page lists. Empty when the read fails (the section then hides). */
export async function getThemeTracks(id: string): Promise<ThemeTrack[]> {
  if (!hasDbEnv()) return [];
  return (await settle(() => getThemeTracksCached(id, THEME_TRACKS_SHOWN), [] as ThemeTrack[])).value;
}

// "N fans playing today" (SYSTEM.md 4): ONLY from bt_runs. The table has row level
// security and no policy, so the anon key cannot read it; the count comes from one
// function, public.bt_fans_today() (requested from G1, run/requests/G3.md: distinct
// players of the UTC day, test runs and bots excluded, one integer, no row). Until
// the owner applies it the call fails and the line is hidden. The service role is
// not used here: lib/supabase/server.ts keeps it for admin routes.
async function readFansToday(day: string): Promise<number> {
  void day; // the cache key: a new UTC day never reads yesterday's entry
  const db = createPublicReadClient();
  const { data, error } = await db.rpc('bt_fans_today');
  if (error) throw new Error(`[g3 fans today] ${error.message}`);
  const n = typeof data === 'number' ? data : Number(data);
  if (!Number.isFinite(n) || n < 0) throw new Error('[g3 fans today] not a count');
  return Math.round(n);
}

const getFansTodayCached = unstable_cache(readFansToday, ['ux12:g3:fans-today:v1'], { revalidate: CACHE_TTL.stats });

/** Fans with a blindtest run today, or null (function missing, read failed): then nothing is shown. */
export async function getFansToday(): Promise<number | null> {
  if (!hasDbEnv()) return null;
  try {
    return await getFansTodayCached(utcDay());
  } catch (err) {
    // Expected until the function is applied: hidden, and not worth an error line per render.
    if (isNextInternalError(err)) throw err;
    return null;
  }
}

/** The three real numbers of a landing; each one is null when it could not be read. */
export async function getLandingNumbers(): Promise<LandingNumbers> {
  if (!hasDbEnv()) return { songs: null, groups: null, fansToday: null };
  const [songs, groups, fansToday] = await Promise.all([
    settle<number | null>(() => getSongCount(), null),
    settle<number | null>(async () => (await getPlayableGroups()).length, null),
    getFansToday(),
  ]);
  return { songs: songs.value, groups: groups.value, fansToday };
}
