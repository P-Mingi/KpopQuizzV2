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

// The whole-bank members path (getAllBankMembers): order rows so idols from the
// best-known groups come first (rankById = group id -> rank, lower is better),
// keep only idols that actually have a photo, and cap. Pure so it is unit-tested.
export function orderAndCapMembers(rows: (IdolRow & { group_id: number })[], rankById: Map<number, number>, cap: number): TierListItem[] {
  const sorted = [...rows].sort((a, b) => (rankById.get(a.group_id) ?? Number.MAX_SAFE_INTEGER) - (rankById.get(b.group_id) ?? Number.MAX_SAFE_INTEGER));
  return shapeMembers(sorted).filter((it) => it.image_url).slice(0, cap);
}
