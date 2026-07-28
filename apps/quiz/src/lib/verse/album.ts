// Album detail read model. Release facts carry provenance; the tracklist links
// catalog-matched tracks (song_id set) to the group blind test.
import { createPublicReadClient } from '@/lib/supabase/server';
import { albumSlug } from './slug';

export interface AlbumTrack { position: number; title: string; linked: boolean; }
export interface AlbumDetail {
  group: { id: number; name: string; slug: string; fandom_name: string };
  id: number; title: string; release_date: string | null; type: string; region: string;
  reviewFlag: boolean; sourced: boolean;
  tracks: AlbumTrack[];
}

export async function getAlbum(groupSlug: string, albumSlugParam: string): Promise<AlbumDetail | null> {
  const db = createPublicReadClient();
  const { data: group } = await db.from('groups').select('id, name, slug, fandom_name').eq('slug', groupSlug).maybeSingle();
  if (!group) return null;

  const { data: albums } = await db
    .from('albums')
    .select('id, title, release_date, type, region, review_flag')
    .eq('group_id', group.id).order('release_date', { ascending: true, nullsFirst: false });
  const rows = (albums ?? []) as Array<{ id: number; title: string; release_date: string | null; type: string; region: string; review_flag: boolean }>;
  const album = rows.find((a) => albumSlug(a.title) === albumSlugParam);
  if (!album) return null;

  const [{ data: tracks }, { data: sources }] = await Promise.all([
    db.from('album_tracks').select('position, title, song_id').eq('album_id', album.id).order('position'),
    db.from('entity_sources').select('field').eq('entity_type', 'album').eq('entity_id', String(album.id)).limit(1),
  ]);

  return {
    group,
    id: album.id, title: album.title, release_date: album.release_date, type: album.type, region: album.region,
    reviewFlag: album.review_flag, sourced: ((sources ?? []) as unknown[]).length > 0,
    tracks: ((tracks ?? []) as { position: number; title: string; song_id: string | null }[]).map((t) => ({ position: t.position, title: t.title, linked: t.song_id != null })),
  };
}
