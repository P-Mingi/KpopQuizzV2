// Curated blindtest playlists (growth v12, G2) and the playlist rules generate serves on top of
// its legacy list when the v12 flag is on: year ranges, generation + gender pairs, curated id
// lists. One definition, read by POST /api/blind-test/generate (the pool), by the availability
// count (lib/blind-test-playlists.ts) and by the tests, so the three cannot drift.
//
// A curated song is named by its Deezer track id (`songs.deezer_track_id`, unique). An id that is
// not in the catalogue simply does not play; nothing here invents a song.

import { themedModesOn } from './blind-test-modes';

export interface CuratedSong {
  deezerId: number;
  /** As stored in the catalogue (for the reader of this file; the game reads the database). */
  artist: string;
  title: string;
  /** One public page showing the trend (tiktok-viral) or the track list (KPDH). */
  source: string;
}

// ── TikTok viral ────────────────────────────────────
// One public source per song: a TikTok Newsroom list, a newspaper reporting a TikTok chart or a
// TikTok challenge, or the song's reference article stating it. Every page was fetched and the
// words checked on 2026-10-02: docs/growth/catalogue/tiktok-viral.md (regenerate with
// scripts/v12/catalogue/verify-source.mts). The word TikTok only: no logo, no branding.
const KH_SUMMER_2023 = 'https://www.koreaherald.com/article/3199400';
const KH_SUMMER_2024 = 'https://www.koreaherald.com/article/3456084';
const KH_SUMMER_2025 = 'https://www.koreaherald.com/article/10569621';
const SOOMPI_2022 = 'https://www.soompi.com/article/1557529wpp/tiktok-reveals-koreas-most-viewed-artists-and-top-tracks-of-2022';
const SOOMPI_2025 = 'https://www.soompi.com/article/1806836wpp/tiktok-reveals-koreas-top-10-most-popular-songs-of-2025';

export const TIKTOK_VIRAL: readonly CuratedSong[] = [
  { deezerId: 2943563441, artist: 'FIFTY FIFTY', title: 'Cupid', source: 'https://www.koreaherald.com/article/10385863' },
  { deezerId: 851641862, artist: 'Zico', title: 'Any song', source: 'https://en.wikipedia.org/wiki/Any_Song' },
  { deezerId: 1490386732, artist: 'Lisa', title: 'MONEY', source: 'https://en.wikipedia.org/wiki/Money_(Lisa_song)' },
  { deezerId: 1843514397, artist: 'NewJeans', title: 'Hype Boy', source: 'https://en.wikipedia.org/wiki/Hype_Boy' },
  { deezerId: 2088671947, artist: 'NewJeans', title: 'OMG', source: 'https://en.wikipedia.org/wiki/OMG_(NewJeans_song)' },
  { deezerId: 2354707745, artist: 'NewJeans', title: 'Super Shy', source: KH_SUMMER_2023 },
  { deezerId: 3282147301, artist: '(G)I-DLE', title: 'Queencard', source: KH_SUMMER_2023 },
  { deezerId: 2364618815, artist: 'Jungkook', title: 'Seven (feat. Latto)', source: KH_SUMMER_2023 },
  { deezerId: 3050380851, artist: 'Rose', title: 'APT.', source: 'https://en.wikipedia.org/wiki/Apt._(song)' },
  { deezerId: 3262816591, artist: 'Jennie', title: 'like JENNIE', source: 'https://en.wikipedia.org/wiki/Like_Jennie' },
  { deezerId: 3355094441, artist: 'Rose', title: 'Messy', source: KH_SUMMER_2025 },
  { deezerId: 2714845022, artist: 'ILLIT', title: 'Magnetic', source: KH_SUMMER_2024 },
  { deezerId: 2749285281, artist: 'IVE', title: 'HEYA', source: KH_SUMMER_2024 },
  { deezerId: 2856445422, artist: 'TWS', title: "If I'm S, Can You Be My N?", source: KH_SUMMER_2024 },
  { deezerId: 1708995887, artist: 'IVE', title: 'LOVE DIVE', source: SOOMPI_2022 },
  { deezerId: 1799467007, artist: 'Nayeon', title: 'POP!', source: SOOMPI_2022 },
  { deezerId: 1766012537, artist: 'NCT DREAM', title: 'Beatbox', source: SOOMPI_2022 },
  { deezerId: 1594529551, artist: 'ENHYPEN', title: 'Polaroid Love', source: 'https://www.koreatimes.co.kr/entertainment/k-pop/20220516/how-did-tiktok-become-main-marketing-tool-for-k-pop' },
  { deezerId: 1255932992, artist: 'TWICE', title: 'What is Love?', source: 'https://www.koreajoongangdaily.com/entertainment/we-dont-need-permission-to-make-a-tiktok-dance-challenge/10569255' },
  { deezerId: 2897230071, artist: 'KATSEYE', title: 'Touch', source: 'https://en.wikipedia.org/wiki/Touch_(Katseye_song)' },
  { deezerId: 3336180251, artist: 'KATSEYE', title: 'Gnarly', source: 'https://www.koreaherald.com/article/10695472' },
  { deezerId: 3412611901, artist: 'KATSEYE', title: 'Gabriela', source: 'https://newsroom.tiktok.com/tiktok-year-in-music?lang=en-GB' },
  { deezerId: 3167020171, artist: 'BOYNEXTDOOR', title: 'IF I SAY, I LOVE YOU', source: SOOMPI_2025 },
  { deezerId: 3153143521, artist: 'IVE', title: 'REBEL HEART', source: SOOMPI_2025 },
  { deezerId: 3359004371, artist: 'BOYNEXTDOOR', title: '123-78', source: KH_SUMMER_2025 },
  { deezerId: 80630292, artist: "Girls' Generation", title: 'Mr.Taxi', source: KH_SUMMER_2025 },
];

// ── KPop Demon Hunters ──────────────────────────────
// The vocal songs of "KPop Demon Hunters (Soundtrack from the Netflix Film)" that Deezer serves
// with a preview. Track list: the label's store page and the soundtrack's reference article
// (docs/growth/catalogue/kpdh.md). Text and audio only.
//
// The songs by the film's fictional acts (and the two soundtrack songs by acts that are not in
// the catalogue) carry their own non-active status, KPDH_STATUS, so they never enter the daily,
// the all-songs pool, a group playlist, ranked, search or a count: every other reader asks for
// status = 'active'. The two TWICE songs are ordinary active TWICE songs, listed here by id.
export const KPDH_STATUS = 'soundtrack';

const KPDH_TRACKLIST = 'https://www.republicrecords.com/products/kpop-demon-hunters-soundtrack-from-the-netflix-film-cd';
const KPDH_DELUXE = 'https://www.republicrecords.com/products/kpop-demon-hunters-soundtrack-from-the-netflix-film-deluxe-digital-album';

export const KPDH_SONGS: readonly CuratedSong[] = [
  // TWICE: active rows that keep their group.
  { deezerId: 3412534541, artist: 'TWICE', title: 'TAKEDOWN (JEONGYEON, JIHYO, CHAEYOUNG)', source: KPDH_TRACKLIST },
  { deezerId: 3412534591, artist: 'TWICE', title: 'Strategy', source: KPDH_TRACKLIST },
  // Fictional acts: status KPDH_STATUS (docs/pending-migrations/v12-g2-07-kpdh.sql).
  { deezerId: 3412534551, artist: 'HUNTR/X', title: "How It's Done", source: KPDH_TRACKLIST },
  { deezerId: 3412534561, artist: 'Saja Boys', title: 'Soda Pop', source: KPDH_TRACKLIST },
  { deezerId: 3412534581, artist: 'HUNTR/X', title: 'Golden', source: KPDH_TRACKLIST },
  { deezerId: 3412534601, artist: 'HUNTR/X', title: 'Takedown', source: KPDH_TRACKLIST },
  { deezerId: 3412534611, artist: 'Saja Boys', title: 'Your Idol', source: KPDH_TRACKLIST },
  { deezerId: 3412534621, artist: 'Rumi and Jinu', title: 'Free', source: KPDH_TRACKLIST },
  { deezerId: 3412534631, artist: 'HUNTR/X', title: 'What It Sounds Like', source: KPDH_TRACKLIST },
  { deezerId: 3541756631, artist: 'Jinu', title: "Jinu's Lament", source: KPDH_DELUXE },
  // Real acts outside the catalogue, soundtrack only: same status.
  { deezerId: 3412534641, artist: 'MeloMance', title: 'Love, Maybe', source: KPDH_TRACKLIST },
  { deezerId: 3412534651, artist: 'Jokers', title: 'Path', source: KPDH_TRACKLIST },
];

export const TIKTOK_VIRAL_DEEZER_IDS: readonly number[] = TIKTOK_VIRAL.map((s) => s.deezerId);
export const KPDH_DEEZER_IDS: readonly number[] = KPDH_SONGS.map((s) => s.deezerId);

// ── The playlist rules ──────────────────────────────

export interface PlaylistSpec {
  generation?: string;
  gender?: string;
  yearMin?: number;
  yearMax?: number;
  /** Curated list: only these Deezer track ids. The curated-subset switch does not apply. */
  deezerIds?: readonly number[];
  /** Statuses read. Default: active only. Only the KPDH list also reads its own status. */
  statuses?: readonly string[];
  /** A "hits" list: keep the N songs with the best Deezer rank. */
  topByRank?: number;
  /** Only "Name the song" questions (in a pool of two or three acts the act is a giveaway). */
  titleOnly?: boolean;
}

/** What generate serves when the v12 flag is on, on top of its legacy GENERAL_PLAYLISTS. */
export const V12_PLAYLISTS: Readonly<Record<string, PlaylistSpec>> = {
  // Themed playlists (SYSTEM.md 4). '5th-gen' is already a legacy playlist of generate.
  'kpop-hits-2026': { yearMin: 2026, yearMax: 2026, topByRank: 60 },
  'kpop-hits-2025': { yearMin: 2025, yearMax: 2025, topByRank: 60 },
  'tiktok-viral': { deezerIds: TIKTOK_VIRAL_DEEZER_IDS },
  'kpop-demon-hunters': { deezerIds: KPDH_DEEZER_IDS, statuses: ['active', KPDH_STATUS], titleOnly: true },
  // v11 decision 33: the legacy modes generate could not serve as named.
  'recent-hits': { yearMin: 2024 },
  'kpop-legends': { yearMax: 2017 },
  '4th-gen-gg': { generation: '4th', gender: 'gg' },
  '4th-gen-bg': { generation: '4th', gender: 'bg' },
};

export const V12_PLAYLIST_IDS: readonly string[] = Object.keys(V12_PLAYLISTS);

/** The v12 playlist of an id, or null (flag off, or not a v12 playlist: the legacy paths run). */
export function v12Playlist(id: string, v12: boolean = themedModesOn()): PlaylistSpec | null {
  if (!v12) return null;
  return Object.prototype.hasOwnProperty.call(V12_PLAYLISTS, id) ? V12_PLAYLISTS[id]! : null;
}

/** The statuses a spec reads (active only unless it says otherwise). */
export function specStatuses(spec: PlaylistSpec): readonly string[] {
  return spec.statuses && spec.statuses.length ? spec.statuses : ['active'];
}

/** Does the curated-subset switch (SONGS_IS_CURATED) apply? Never to an explicit id list. */
export function specFollowsCuratedSwitch(spec: PlaylistSpec): boolean {
  return !spec.deezerIds;
}

interface FilterQuery<Q> {
  eq(col: string, v: unknown): Q;
  in(col: string, v: readonly unknown[]): Q;
  gte(col: string, v: number): Q;
  lte(col: string, v: number): Q;
}

/** Apply a spec's column filters to a PostgREST query on `songs` (the caller applies status). */
export function applyPlaylistSpec<Q extends FilterQuery<Q>>(q: Q, spec: PlaylistSpec): Q {
  let out = q;
  if (spec.generation) out = out.eq('generation', spec.generation);
  if (spec.gender) out = out.eq('gender', spec.gender);
  if (spec.yearMin !== undefined) out = out.gte('year', spec.yearMin);
  if (spec.yearMax !== undefined) out = out.lte('year', spec.yearMax);
  // An empty list must match nothing (PostgREST reads an empty in() as no filter at all).
  if (spec.deezerIds) out = out.in('deezer_track_id', spec.deezerIds.length ? spec.deezerIds : [-1]);
  return out;
}

export interface SpecSong {
  deezer_track_id: number;
  status: string;
  title: string;
  gender?: string | null;
  generation?: string | null;
  year?: number | null;
  is_curated?: boolean | null;
  deezer_rank?: number | null;
}

const JUNK_TITLE = /remix|instrumental|inst\.|karaoke/i;

/**
 * The same rule in plain code: is this song in the playlist's pool? Mirrors generate's query
 * (status, the junk title guard, the curated switch, the spec's filters). Used by the tests and
 * by the catalogue dry-run reports.
 */
export function songMatchesSpec(song: SpecSong, spec: PlaylistSpec, curatedSwitch: boolean): boolean {
  if (!specStatuses(spec).includes(song.status)) return false;
  if (JUNK_TITLE.test(song.title)) return false;
  if (curatedSwitch && specFollowsCuratedSwitch(spec) && song.is_curated !== true) return false;
  if (spec.generation && song.generation !== spec.generation) return false;
  if (spec.gender && song.gender !== spec.gender) return false;
  if (spec.yearMin !== undefined && !(typeof song.year === 'number' && song.year >= spec.yearMin)) return false;
  if (spec.yearMax !== undefined && !(typeof song.year === 'number' && song.year <= spec.yearMax)) return false;
  if (spec.deezerIds && !spec.deezerIds.includes(Number(song.deezer_track_id))) return false;
  return true;
}

/** Keep the best-ranked N of a "hits" list; any other pool is returned untouched. */
export function capByRank<T extends { deezer_rank?: number | null }>(pool: T[], spec: PlaylistSpec): T[] {
  if (!spec.topByRank || pool.length <= spec.topByRank) return pool;
  return [...pool].sort((a, b) => (b.deezer_rank ?? 0) - (a.deezer_rank ?? 0)).slice(0, spec.topByRank);
}
