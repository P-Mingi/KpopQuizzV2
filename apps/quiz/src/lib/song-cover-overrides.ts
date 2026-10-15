// songs.hide_cover, the owner's manual "never show this cover" switch (docs/pending-migrations/
// songs-hide-cover.sql), read in ONE guarded place. Server only.
//
// Fail soft by construction. Until the owner runs that file the column does not exist: the read
// errors, this answers an empty set ("no override"), and every surface hides exactly what the
// album-name classifier hides (isCoverHidden, lib/blind-test-curated.ts). The column is never added
// to a surface's own select list, so no page or route can fail on it. Once the SQL is applied, a row
// switched on is honoured within TTL_MS on each server instance.
//
// One read of the switched-on ids per server instance per 10 minutes (about 180 ids today), shared
// by every surface, rather than one more query per game. Cookie-free anon client (the songs table is
// public): a visitor's expired session can never turn the read into "no override" for everyone.

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';

const TTL_MS = 10 * 60_000;
const NONE: ReadonlySet<string> = new Set();
let cache: { at: number; ids: ReadonlySet<string> } | null = null;
let pending: Promise<ReadonlySet<string>> | null = null;

async function readIds(): Promise<ReadonlySet<string>> {
  try {
    const db = createPublicReadClient();
    const rows = await fetchAllRows<{ id: unknown; hide_cover: unknown }>(() =>
      db.from('songs').select('id, hide_cover').eq('hide_cover', true).order('id'));
    // Strictly true on the row: a row without the field is not an override.
    return new Set(rows.filter((r) => r.hide_cover === true && typeof r.id === 'string').map((r) => r.id as string));
  } catch {
    // Column missing (SQL not run yet), no env, or a database blip: no override.
    return NONE;
  }
}

/** Ids of the songs whose hide_cover switch is on. Empty when the column is absent or the read fails. */
export async function hiddenCoverSongIds(): Promise<ReadonlySet<string>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.ids;
  pending ??= readIds().then((ids) => {
    cache = { at: Date.now(), ids };
    pending = null;
    return ids;
  });
  return pending;
}

/** The row with hide_cover set when its id is switched on (a switch already on the row is kept). */
export function withCoverSwitch<T extends { id: string; hide_cover?: boolean | null | undefined }>(song: T, ids: ReadonlySet<string>): T {
  return song.hide_cover === true || !ids.has(song.id) ? song : { ...song, hide_cover: true };
}
