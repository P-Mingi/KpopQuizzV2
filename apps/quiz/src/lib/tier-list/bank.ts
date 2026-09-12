import { createPublicReadClient } from '@/lib/supabase/server';

import { shapeMembers, shapeAlbums, shapeTracks, type IdolRow, type AlbumRow, type SongRow } from './bank-shape';

import type { SubjectKind, TierListItem } from './types';

export { coverArtUrl } from './bank-shape';

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
