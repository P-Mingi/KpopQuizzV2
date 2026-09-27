// The v11 run of a /blindtest/<mode> page (X1-001). Every door to a playlist
// (the hub's theme links, the group hub's "Blindtest" button, the quiz results'
// blindtest row, search song rows) opens /blindtest/<mode>; under the flag that
// page starts the SAME run the hub starts: POST /api/blind-test/generate
// { playlist, count, mode: 'challenge' } (generateBody), played by use-run.ts.
//
// generate serves one playlist id per run: 'all', gg / bg / solo, 1st-gen to
// 5th-gen, title-tracks, hits / deep, or a group slug. It has no clip point, no
// clip length, no year filter and no generation + gender pair, so a mode whose
// filter needs one of those plays the closest playlist generate serves (`exact`
// is false) and the page says what it plays. The mode's SEO copy (H1, intro,
// "20 songs · 5s clips") is locked and stays as it is.

import { getGroupSlugFromModeId, isGroupModeId, STATIC_MODES } from '@/lib/blind-test-modes';

import { ALL_PICK } from './playlists';

import type { BtPick } from './playlists';

/** generate's bounds for `count` (MIN_SONGS / MAX_SONGS of the route). */
export const MIN_ROUND = 5;
export const MAX_ROUND = 15;

export interface ModeRun {
  pick: BtPick;
  /** Songs asked for (the mode's song_count within generate's 5 to 15). */
  count: number;
  /** true when generate serves the mode's own filter. */
  exact: boolean;
}

/** Playlist generate serves per static mode id (lib/blind-test-modes.ts). */
const STATIC_PLAYLIST: Record<string, { playlist: string; label: string; exact: boolean }> = {
  // Difficulty: every song, the clip is the Deezer preview (no intro / verse / bridge point, no 5 s clip).
  classic: { playlist: 'all', label: ALL_PICK.label, exact: true },
  'intro-challenge': { playlist: 'all', label: ALL_PICK.label, exact: false },
  'verse-only': { playlist: 'all', label: ALL_PICK.label, exact: false },
  'bridge-or-break': { playlist: 'all', label: ALL_PICK.label, exact: false },
  'speed-round': { playlist: 'all', label: ALL_PICK.label, exact: false },
  // Era.
  '2nd-gen': { playlist: '2nd-gen', label: '2nd gen', exact: true },
  '3rd-gen': { playlist: '3rd-gen', label: '3rd gen', exact: true },
  '4th-gen': { playlist: '4th-gen', label: '4th gen', exact: true },
  // Special.
  'girl-groups': { playlist: 'gg', label: 'Girl groups', exact: true },
  'boy-groups': { playlist: 'bg', label: 'Boy groups', exact: true },
  'solo-artists': { playlist: 'solo', label: 'Solo artists', exact: true },
  // generate's 'title-tracks' pool is empty in the curated catalog (SONGS_IS_CURATED) and
  // songs.is_title_track is unmaintained: "the hits everyone knows" are the iconic and popular tiers.
  'title-tracks': { playlist: 'hits', label: 'Hits', exact: false },
  // songs.is_title_track is never false (unmaintained): the deep cuts (medium, hard and unknown tiers) are the b-sides.
  'b-sides': { playlist: 'deep', label: 'Deep cuts', exact: false },
  'recent-hits': { playlist: 'all', label: ALL_PICK.label, exact: false },
  'kpop-legends': { playlist: 'all', label: ALL_PICK.label, exact: false },
  '4th-gen-gg': { playlist: '4th-gen', label: '4th gen', exact: false },
  '4th-gen-bg': { playlist: '4th-gen', label: '4th gen', exact: false },
  'random-all': { playlist: 'all', label: ALL_PICK.label, exact: true },
};

export function clampRound(n: number): number {
  return Math.max(MIN_ROUND, Math.min(MAX_ROUND, Math.round(n)));
}

/** Title of a group mode as the page's H1 has it today ("stray-kids" -> "Stray Kids"). */
export function titleFromSlug(slug: string): string {
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * The run of a mode page, or null when the id is not a mode. A group mode plays
 * its group; `groupName` (the playable group's real name) labels it, else the
 * page's own title. Whether a group has enough songs is the caller's check.
 */
export function modeRun(modeId: string, groupName?: string | null): ModeRun | null {
  if (isGroupModeId(modeId)) {
    const slug = getGroupSlugFromModeId(modeId);
    if (!slug) return null;
    return { pick: { playlist: slug, label: groupName || titleFromSlug(slug), group: slug }, count: 10, exact: true };
  }
  const mode = STATIC_MODES.find((m) => m.id === modeId);
  const served = STATIC_PLAYLIST[modeId];
  if (!mode || !served) return null;
  return { pick: { playlist: served.playlist, label: served.label }, count: clampRound(mode.song_count), exact: served.exact };
}
