// Workstream V3 - "Name Them All" (type-with-timer, generalized beyond members).
//
// CLIENT-SAFE: types + the playlist registry only. The real item lists are
// derived from live DB columns in lib/db/queries/name-them-all.ts (server) and
// baked at ISR. The player reuses the shared matcher/timer/scoring in
// lib/name-all-utils.ts (the existing name-all engine core), so member games are
// untouched.
//
// REAL DATA ONLY, gated at NAME_THEM_ALL_MIN. No invented aliases: the groups
// table has no alternate-name column, so matching relies on the punctuation-
// insensitive normalizer (e.g. "(G)I-DLE" -> "gidle").

export const NAME_THEM_ALL_MIN = 15;

/** Shape-compatible with NameAllMember so the shared findMatch works as-is. */
export interface NameThemAllItem {
  name: string;
  aliases: string[];
}

export interface NameThemAllPlaylist {
  slug: string;
  title: string;
  /** Plural noun for the items, e.g. "groups". */
  itemNoun: string;
  /** Hint shown on an unrevealed cell, e.g. "K-pop group". */
  categoryHint: string;
  /** Countdown length in seconds. */
  timerSeconds: number;
  blurb: string;
  seoTitle: string;
  seoDescription: string;
}

// Verified 2026-07-27: name-all-kpop-groups = 79 clean groups. The per-generation
// datasets (3rd gen 16, 4th gen 17) are added in V3.2. Title-tracks and
// debut-year datasets were gated out (is_title_track is mis-flagged on only 3
// groups with implausible counts; no debut-year column exists).
export const NAME_THEM_ALL_PLAYLISTS: NameThemAllPlaylist[] = [
  {
    slug: 'name-all-kpop-groups',
    title: 'Name All K-pop Groups',
    itemNoun: 'groups',
    categoryHint: 'K-pop group',
    timerSeconds: 150,
    blurb: 'Every K-pop group on the site, one blank grid, one timer. How many can you name?',
    seoTitle: 'Name All K-pop Groups: How Many Can You List?',
    seoDescription:
      'Can you name every K-pop group before the timer runs out? Type as many as you can in this free grid challenge over dozens of real groups. No sign-up.',
  },
  {
    slug: 'name-all-3rd-gen-groups',
    title: 'Name All 3rd Gen K-pop Groups',
    itemNoun: '3rd gen groups',
    categoryHint: '3rd gen group',
    timerSeconds: 90,
    blurb: 'Third generation only. Name every 3rd gen K-pop group before the timer runs out.',
    seoTitle: 'Name All 3rd Gen K-pop Groups: How Many Can You List?',
    seoDescription:
      'Can you name every 3rd generation K-pop group before the clock runs out? A free type-them-all grid challenge over real third-gen groups. No sign-up.',
  },
  {
    slug: 'name-all-4th-gen-groups',
    title: 'Name All 4th Gen K-pop Groups',
    itemNoun: '4th gen groups',
    categoryHint: '4th gen group',
    timerSeconds: 90,
    blurb: 'Fourth generation only. Name every 4th gen K-pop group before the timer runs out.',
    seoTitle: 'Name All 4th Gen K-pop Groups: How Many Can You List?',
    seoDescription:
      'Can you name every 4th generation K-pop group before the clock runs out? A free type-them-all grid challenge over real fourth-gen groups. No sign-up.',
  },
];

export function getNameThemAllPlaylist(slug: string): NameThemAllPlaylist | undefined {
  return NAME_THEM_ALL_PLAYLISTS.find((p) => p.slug === slug);
}
