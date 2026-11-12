// FLAW-1 (integrator fix, 2026-11-12): the space an id belongs to comes from its ROW, never from the
// request. The tree and tag routes check the caller on a space; these reads make sure every page, parent,
// tag and bound entity the request carries lives in THAT space. A missing row and a row of another space
// answer the same (null, so the route sends 403): the reply never tells which ids exist elsewhere.

import type { SupabaseClient } from '@supabase/supabase-js';

/** A positive integer id, else null (a junk, zero, negative or fractional id names no row). */
export function rowId(v: unknown): number | null {
  if (typeof v !== 'number' && typeof v !== 'string') return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export interface OwnedRow { id: number; space_id: number }

async function owned(db: SupabaseClient, table: 'pages' | 'space_tags', id: unknown, spaceId: number): Promise<OwnedRow | null> {
  const n = rowId(id);
  if (n === null) return null;
  const { data } = await db.from(table).select('id, space_id').eq('id', n).maybeSingle();
  const row = data as { id: unknown; space_id: unknown } | null;
  if (!row || rowId(row.space_id) !== spaceId) return null;
  return { id: n, space_id: spaceId };
}

/** The tree page `id` when it exists and lives in `spaceId`; null when it is missing or another space's. */
export function pageInSpace(db: SupabaseClient, id: unknown, spaceId: number): Promise<OwnedRow | null> {
  return owned(db, 'pages', id, spaceId);
}

/** The controlled tag `id` when it exists and lives in `spaceId`; null otherwise. */
export function tagInSpace(db: SupabaseClient, id: unknown, spaceId: number): Promise<OwnedRow | null> {
  return owned(db, 'space_tags', id, spaceId);
}

async function groupOf(db: SupabaseClient, table: string, id: number): Promise<number | null> {
  const { data } = await db.from(table).select('group_id').eq('id', id).maybeSingle();
  return rowId((data as { group_id?: unknown } | null)?.group_id);
}

/** The space that owns a fact-rail entity (the kinds lib/verse/tree/factrail.ts builds: idol, album,
 * track, era, award), read from the entity's own row. null = unknown kind or no such row. */
export async function entitySpaceId(db: SupabaseClient, kind: unknown, id: unknown): Promise<number | null> {
  const n = rowId(id);
  if (n === null) return null;
  switch (kind) {
    case 'idol': return groupOf(db, 'idols', n);
    case 'album': return groupOf(db, 'albums', n);
    case 'era': return groupOf(db, 'eras', n);
    case 'award': {
      // an award belongs to a group, or to a member (idol_id) and so to the member's group.
      const { data } = await db.from('awards').select('group_id, idol_id').eq('id', n).maybeSingle();
      const a = data as { group_id?: unknown; idol_id?: unknown } | null;
      if (!a) return null;
      const direct = rowId(a.group_id);
      if (direct !== null) return direct;
      const idol = rowId(a.idol_id);
      return idol === null ? null : groupOf(db, 'idols', idol);
    }
    case 'track': {
      // a track belongs to an album, and so to the album's group.
      const { data } = await db.from('album_tracks').select('album_id').eq('id', n).maybeSingle();
      const album = rowId((data as { album_id?: unknown } | null)?.album_id);
      return album === null ? null : groupOf(db, 'albums', album);
    }
    default: return null;
  }
}
