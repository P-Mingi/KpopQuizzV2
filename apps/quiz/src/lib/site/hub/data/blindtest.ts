// Run O1, lot H2b: Today, the daily blind test. K-pop only, audio only (the anime blind test is withdrawn from OtakuQuiz).
//
// The set is the one /api/daily/blindtest serves: daily_blindtests.song_ids of the UTC date (10 songs today; the Plan says 5, the data says
// 10), made by ensure_daily_blindtest (idempotent, called here only when the day has no row yet, as that route does). The block returns
// the preview URL of the first song and nothing that names it: no title, no artist, no cover, so no soundtrack or KPop Demon Hunters
// cover can show (the hidden-cover rules of lib/blind-test-curated.ts and songs.hide_cover only decide what a screen shows; this block
// shows no cover at all). The stored preview_url expires, so the first song's link is read again from Deezer, as the route does.

import { forSite } from '@/lib/site/scope';
import { createPublicReadClient, createServiceRoleClient } from '@/lib/supabase/server';

import { hubCached } from './cache';
import { must, resolveOrigins, siteName, utcDate } from './util';

import type { HubBlindtest, HubOpts, HubOrigins } from './types';

export const BLINDTEST_CLIP_SECONDS = 10;
const PATH = '/blindtest?daily=true';

interface DailyRow { readonly song_ids: readonly string[] | null }
interface SongRow { readonly id: string; readonly deezer_track_id: number | null; readonly preview_url: string | null }

type Db = ReturnType<typeof createPublicReadClient>;

/** A fresh preview link from Deezer; null when Deezer does not answer (the caller keeps the stored link). */
export async function deezerPreview(trackId: number, fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetcher(`https://api.deezer.com/track/${trackId}`, { signal: AbortSignal.timeout(4000) });
    const body = (await res.json()) as { preview?: unknown };
    return typeof body.preview === 'string' && body.preview.length > 10 ? body.preview : null;
  } catch {
    return null;
  }
}

export interface BlindtestDeps {
  readonly db: Db;
  /** The service role client, for ensure_daily_blindtest only. */
  readonly ensure: () => { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> };
  readonly preview: (trackId: number) => Promise<string | null>;
}

async function readDay(db: Db, date: string): Promise<DailyRow | null> {
  const res = await db.from('daily_blindtests').select('song_ids').eq('date', date).maybeSingle();
  if (res.error) throw new Error(`daily_blindtests: ${res.error.message}`);
  return (res.data as DailyRow | null) ?? null;
}

export async function readBlindtest(origins: HubOrigins, now: Date, deps: BlindtestDeps): Promise<HubBlindtest | null> {
  const date = utcDate(now);
  let day = await readDay(deps.db, date);
  if (!day) {
    const { error } = await deps.ensure().rpc('ensure_daily_blindtest', { p_date: date });
    if (error) throw new Error(`ensure_daily_blindtest: ${error.message}`);
    day = await readDay(deps.db, date);
  }
  const ids = (day?.song_ids ?? []).filter((id): id is string => typeof id === 'string');
  const first = ids[0];
  if (!first) return null;
  const songs = must<SongRow[]>(await forSite(deps.db.from('songs').select('id, deezer_track_id, preview_url'), 'kpop').eq('id', first).limit(1), 'songs');
  const song = songs[0];
  if (!song) return null;
  let previewUrl = typeof song.preview_url === 'string' && song.preview_url.length > 10 ? song.preview_url : null;
  if (typeof song.deezer_track_id === 'number') previewUrl = (await deps.preview(song.deezer_track_id)) ?? previewUrl;
  if (!previewUrl) return null;
  return {
    site: 'kpop',
    siteName: siteName('kpop'),
    date,
    songCount: ids.length,
    clipSeconds: BLINDTEST_CLIP_SECONDS,
    previewUrl,
    path: PATH,
    href: `${origins.kpop}${PATH}`,
  };
}

const cached = hubCached('blindtest', (origins: HubOrigins) =>
  readBlindtest(origins, new Date(), { db: createPublicReadClient(), ensure: createServiceRoleClient, preview: (id) => deezerPreview(id) }));

/** Today's blind test (first song's preview, count, link), cached one hour (tag hub:blindtest). */
export async function getBlindtest(opts?: HubOpts): Promise<HubBlindtest | null> {
  return cached(resolveOrigins(opts));
}
