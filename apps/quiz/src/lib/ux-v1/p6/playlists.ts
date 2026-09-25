// Playlist menu model of the v11 blindtest hub (DESIGN-SPEC 17.5): "All K-pop"
// first, then every group playlist (lib/blind-test-playlists.ts, the one rule:
// >= ROUND_SIZE clean active `songs`), then the mixes.
//
// A pick is exactly the body the live game already sends to POST
// /api/blind-test/generate (blindtest-game.tsx): { playlist, count, mode: 'challenge' }.
// Only playlist ids that route serves are offered (its GENERAL_PLAYLISTS + group
// slugs). The prototype also lists "Recent hits, 2024 to 2026", "Legends, before
// 2018" and "Speed round, 5-second clips": generate has no year filter and no clip
// length, so those three are not offered (no dead door); see reports/P6.md.

export interface BtPick {
  /** generate's `playlist`: 'all', a mix id, or a group slug. */
  playlist: string;
  /** What the player sees (menu button, game bar, results kicker). */
  label: string;
  /** Group slug when the pick is one group (share line, photos). */
  group?: string;
}

export const ALL_PICK: BtPick = { playlist: 'all', label: 'All K-pop' };

export interface MixItem { playlist: string; label: string }

/** Mixes the generate route serves (GENERAL_PLAYLISTS), in the prototype's order. */
export const MIXES: readonly MixItem[] = [
  { playlist: 'gg', label: 'Girl groups' },
  { playlist: 'bg', label: 'Boy groups' },
];

/** "By generation" opens these (songs.generation 1st to 5th all have songs). */
export const GENERATIONS: readonly MixItem[] = [
  { playlist: '1st-gen', label: '1st gen' },
  { playlist: '2nd-gen', label: '2nd gen' },
  { playlist: '3rd-gen', label: '3rd gen' },
  { playlist: '4th-gen', label: '4th gen' },
  { playlist: '5th-gen', label: '5th gen' },
];

export const TITLE_TRACKS: MixItem = { playlist: 'title-tracks', label: 'Title tracks only' };

export const ROUND_OPTIONS = [5, 10, 15] as const;
export type RoundCount = (typeof ROUND_OPTIONS)[number];

/** A playable group playlist as the hub shows it. */
export interface BtGroup {
  slug: string;
  name: string;
  /** Real count of playable songs (never rounded). */
  songs: number;
}

export function groupPick(g: BtGroup): BtPick {
  return { playlist: g.slug, label: g.name, group: g.slug };
}

/** The generate body for a pick (identical to the live game's). */
export function generateBody(pick: BtPick, count: number): { playlist: string; count: number; mode: 'challenge' } {
  return { playlist: pick.playlist, count, mode: 'challenge' };
}

/** Case-insensitive name filter used by the menu and the group index. */
export function filterGroups<T extends { name: string }>(groups: readonly T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [...groups];
  return groups.filter((g) => g.name.toLowerCase().includes(needle));
}

/** Label of a playlist id; a group slug needs its name (null when unknown). */
export function playlistLabel(playlist: string, groupName?: string | null): string | null {
  if (playlist === ALL_PICK.playlist) return ALL_PICK.label;
  const mix = [...MIXES, ...GENERATIONS, TITLE_TRACKS].find((m) => m.playlist === playlist);
  if (mix) return mix.label;
  return groupName ?? null;
}

/** True when the id is one of the fixed (non-group) playlists above. */
export function isFixedPlaylist(playlist: string): boolean {
  return playlist === ALL_PICK.playlist || [...MIXES, ...GENERATIONS, TITLE_TRACKS].some((m) => m.playlist === playlist);
}

/** Initials for a group without a photo (typographic avatar, 16.8). */
export function initials(name: string): string {
  const clean = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
  return (parts[0] ?? name).slice(0, 2).toUpperCase();
}
