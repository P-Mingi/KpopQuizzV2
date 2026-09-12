import type { TierListItem } from './types';

// Pure bank row-shaping - no server/DB imports, so it is unit-testable in a node
// vitest env. getBankItems (bank.ts) does the cookie-free read and calls these.

/** Cover Art Archive release-group cover (matches components/verse/cover-art.tsx). */
export function coverArtUrl(mbid: string): string {
  return `https://coverartarchive.org/release-group/${mbid}/front-500`;
}

// Ids are namespaced by kind so an idol (int id), album (int id) and song (uuid)
// never collide inside one board's placements.
export interface IdolRow { id: number; name: string; photo_url: string | null }
export interface AlbumRow { id: number; title: string; musicbrainz_mbid: string | null }
export interface SongRow { id: string; title: string; album_cover_medium: string | null; album_cover_big?: string | null }

export function shapeMembers(rows: IdolRow[]): TierListItem[] {
  return rows.map((r) => ({ id: `idol:${r.id}`, kind: 'member', name: r.name, image_url: r.photo_url ?? null }));
}
export function shapeAlbums(rows: AlbumRow[]): TierListItem[] {
  return rows.map((r) => ({ id: `album:${r.id}`, kind: 'album', name: r.title, image_url: r.musicbrainz_mbid ? coverArtUrl(r.musicbrainz_mbid) : null }));
}
export function shapeTracks(rows: SongRow[]): TierListItem[] {
  return rows.map((r) => ({ id: `song:${r.id}`, kind: 'track', name: r.title, image_url: r.album_cover_big ?? r.album_cover_medium ?? null }));
}
