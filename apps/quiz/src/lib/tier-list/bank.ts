import { createPublicReadClient } from '@/lib/supabase/server';
import { getAllGroups } from '@/lib/db/queries/groups';

import { shapeMembers, shapeAlbums, shapeTracks, orderAndCapMembers, type IdolRow, type AlbumRow, type SongRow } from './bank-shape';

import type { SubjectKind, TierListItem } from './types';

export { coverArtUrl } from './bank-shape';

// The catch-all pseudo-group. It has a logo but no idols of its own, so a subject
// pointed at its group row resolves to []. The "General K-pop members" template
// means the WHOLE bank, so it uses getAllBankMembers instead of a single group.
export const GENERAL_SLUG = 'general-kpop';

// A general board caps here. The placement sanitiser refuses past 500 items; this
// stays well under that and keeps the tray usable. The wire cap in share-state
// (share-state.ts CARRY_CAP) bounds the share/challenge link independently.
export const GENERAL_MEMBERS_CAP = 120;

/**
 * Members across the WHOLE bank (every real group), photo only, ordered so the
 * best-known groups come first (the getAllGroups ranking by quiz_count), capped.
 * Used by the general/catch-all subject so it is never an empty board.
 */
export async function getAllBankMembers(cap: number = GENERAL_MEMBERS_CAP): Promise<TierListItem[]> {
  const groups = (await getAllGroups()) as Array<{ id: number; slug: string; is_custom: boolean; needs_review: boolean }>;
  const ranked = groups.filter((g) => !g.is_custom && !g.needs_review && g.slug !== GENERAL_SLUG);
  if (ranked.length === 0) return [];
  const rankById = new Map(ranked.map((g, i) => [g.id, i]));
  const ids = ranked.map((g) => g.id);

  const db = createPublicReadClient();
  const { data } = await db.from('idols')
    .select('id, name, photo_url, group_id')
    .in('group_id', ids)
    .eq('active', true).is('detached_at', null)
    .not('photo_url', 'is', null)
    .limit(1000);
  const rows = (data ?? []) as Array<IdolRow & { group_id: number }>;
  return orderAndCapMembers(rows, rankById, cap);
}

/**
 * Read the bank items for a subject. `blank` returns [] (a from-scratch board).
 * Cookie-free client so any caller stays static/ISR-friendly. Shaping is the pure
 * bank-shape module (unit-tested with fixtures).
 */
export async function getBankItems(groupId: number | null, kind: SubjectKind): Promise<TierListItem[]> {
  if (kind === 'blank' || groupId == null) return [];
  const db = createPublicReadClient();
  const out: TierListItem[] = [];

  if (kind === 'members' || kind === 'all') {
    const { data } = await db.from('idols').select('id, name, photo_url')
      .eq('group_id', groupId).eq('active', true).is('detached_at', null).order('ord', { ascending: true });
    out.push(...shapeMembers((data ?? []) as IdolRow[]));
  }
  if (kind === 'albums' || kind === 'all') {
    const { data } = await db.from('albums').select('id, title, musicbrainz_mbid')
      .eq('group_id', groupId).order('release_date', { ascending: false });
    out.push(...shapeAlbums((data ?? []) as AlbumRow[]));
  }
  if (kind === 'tracks' || kind === 'all') {
    const { data } = await db.from('songs').select('id, title, album_cover_medium, album_cover_big')
      .eq('group_id', groupId).order('is_title_track', { ascending: false }).limit(60);
    out.push(...shapeTracks((data ?? []) as SongRow[]));
  }
  return out;
}
