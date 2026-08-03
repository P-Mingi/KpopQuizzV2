// Workstream V2 - "Match-Up" (pair matching game).
//
// CLIENT-SAFE: types + the playlist registry only, no server imports, so the
// player and the pages can both import it. The real pair POOLS are derived from
// live DB columns in lib/db/queries/match-up.ts (server) and baked at ISR.
//
// REAL DATA ONLY: every pool is generated from real songs / groups / rosters and
// gated at >= MATCH_UP_MIN_PAIRS. Each run samples ROUND pairs from the pool, so
// a bigger pool means more replay value. Right-side targets are unique within a
// pool (one song per group, one idol per group) so matching is never ambiguous.

export const MATCH_UP_MIN_PAIRS = 12;

/** One matchable pair: left tile <-> right tile. id is a stable pool key. */
export interface MatchUpPair {
  id: string;
  left: string;
  right: string;
}

export interface MatchUpPlaylist {
  slug: string;
  /** Page H1 + hub card name. */
  title: string;
  /** Column headers, e.g. "Song" and "Group". */
  leftLabel: string;
  rightLabel: string;
  /** One-line intro. */
  blurb: string;
  seoTitle: string;
  seoDescription: string;
  /** Pairs shown per round (also the gate floor via MATCH_UP_MIN_PAIRS). */
  round: number;
}

// Only playlists whose data gates were verified against the live DB ship here.
// Verified 2026-07-27: song->group all-kpop = 76 clean groups with an active
// song. The per-gen song->group, idol->group, and title-halves playlists are
// added in V2.2.
export const MATCH_UP_PLAYLISTS: MatchUpPlaylist[] = [
  {
    slug: 'song-to-group',
    title: 'Match the Song to the Group',
    leftLabel: 'Song',
    rightLabel: 'Group',
    blurb: 'Match each K-pop song to the group that released it. Clear the board as fast as you can.',
    seoTitle: 'Match the Song to the Group: K-pop Match Game',
    seoDescription:
      'Match real K-pop songs to the groups that released them, against the clock. A fast pair-matching game over dozens of groups. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'idol-to-group',
    title: 'Match the Idol to the Group',
    leftLabel: 'Idol',
    rightLabel: 'Group',
    blurb: 'Match each K-pop idol to the group they belong to. How fast can you clear the board?',
    seoTitle: 'Match the Idol to the Group: K-pop Match Game',
    seoDescription:
      'Match real K-pop idols to their groups against the clock. A fast pair-matching game over dozens of member rosters. Free, no sign-up, instant time.',
    round: 12,
  },
  {
    slug: 'song-title-halves',
    title: 'Match the Song Title Halves',
    leftLabel: 'First half',
    rightLabel: 'Second half',
    blurb: 'Every title is split in two. Match the halves to rebuild real K-pop song titles.',
    seoTitle: 'Match the Song Title Halves: K-pop Word Game',
    seoDescription:
      'Match the two halves of real K-pop song titles against the clock. A fast pair-matching word game over hundreds of songs. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'song-to-group-3rd-gen',
    title: 'Match the Song to the Group: 3rd Gen',
    leftLabel: 'Song',
    rightLabel: 'Group',
    blurb: 'Third-gen edition. Match each 3rd gen K-pop song to the group that released it.',
    seoTitle: '3rd Gen Song to Group: K-pop Match Game',
    seoDescription:
      'Match 3rd generation K-pop songs to their groups against the clock. A fast pair-matching game over third-gen groups. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'song-to-group-4th-gen',
    title: 'Match the Song to the Group: 4th Gen',
    leftLabel: 'Song',
    rightLabel: 'Group',
    blurb: 'Fourth-gen edition. Match each 4th gen K-pop song to the group that released it.',
    seoTitle: '4th Gen Song to Group: K-pop Match Game',
    seoDescription:
      'Match 4th generation K-pop songs to their groups against the clock. A fast pair-matching game over fourth-gen groups. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'fandom-to-group',
    title: 'Match the Fandom to the Group',
    leftLabel: 'Fandom',
    rightLabel: 'Group',
    blurb: 'ARMY, BLINK, ONCE, MOA... match each fandom name to the group it belongs to.',
    seoTitle: 'Match the Fandom to the Group: K-pop Fandom Game',
    seoDescription:
      'Match real K-pop fandom names to their groups against the clock. A fast pair-matching game over dozens of fandoms. Free, no sign-up, instant time.',
    round: 12,
  },
  {
    slug: 'song-to-group-boy',
    title: 'Match the Song to the Boy Group',
    leftLabel: 'Song',
    rightLabel: 'Boy group',
    blurb: 'Boy-group edition. Match each song to the boy group that released it.',
    seoTitle: 'Song to Boy Group: K-pop Match Game',
    seoDescription:
      'Match real K-pop boy-group songs to their groups against the clock. A fast pair-matching game over boy groups. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'song-to-group-girl',
    title: 'Match the Song to the Girl Group',
    leftLabel: 'Song',
    rightLabel: 'Girl group',
    blurb: 'Girl-group edition. Match each song to the girl group that released it.',
    seoTitle: 'Song to Girl Group: K-pop Match Game',
    seoDescription:
      'Match real K-pop girl-group songs to their groups against the clock. A fast pair-matching game over girl groups. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'song-to-group-older-gen',
    title: 'Match the Song to the Group: Older Gen',
    leftLabel: 'Song',
    rightLabel: 'Group',
    blurb: 'Older-gen edition (2nd/3rd). Match each classic K-pop song to its group.',
    seoTitle: 'Older Gen Song to Group: K-pop Match Game',
    seoDescription:
      'Match older-generation (2nd/3rd gen) K-pop songs to their groups against the clock. A fast pair-matching game. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'song-to-group-newer-gen',
    title: 'Match the Song to the Group: Newer Gen',
    leftLabel: 'Song',
    rightLabel: 'Group',
    blurb: 'Newer-gen edition (4th/5th). Match each recent K-pop song to its group.',
    seoTitle: 'Newer Gen Song to Group: K-pop Match Game',
    seoDescription:
      'Match newer-generation (4th/5th gen) K-pop songs to their groups against the clock. A fast pair-matching game. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'idol-to-group-3rd-gen',
    title: 'Match the Idol to the Group: 3rd Gen',
    leftLabel: 'Idol',
    rightLabel: 'Group',
    blurb: 'Third-gen edition. Match each 3rd gen idol to the group they belong to.',
    seoTitle: '3rd Gen Idol to Group: K-pop Match Game',
    seoDescription:
      'Match 3rd generation K-pop idols to their groups against the clock. A fast pair-matching game over third-gen rosters. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'idol-to-group-4th-gen',
    title: 'Match the Idol to the Group: 4th Gen',
    leftLabel: 'Idol',
    rightLabel: 'Group',
    blurb: 'Fourth-gen edition. Match each 4th gen idol to the group they belong to.',
    seoTitle: '4th Gen Idol to Group: K-pop Match Game',
    seoDescription:
      'Match 4th generation K-pop idols to their groups against the clock. A fast pair-matching game over fourth-gen rosters. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'idol-to-group-boy',
    title: 'Match the Idol to the Boy Group',
    leftLabel: 'Idol',
    rightLabel: 'Boy group',
    blurb: 'Boy-group edition. Match each idol to the boy group they belong to.',
    seoTitle: 'Idol to Boy Group: K-pop Match Game',
    seoDescription:
      'Match K-pop boy-group idols to their groups against the clock. A fast pair-matching game over boy-group rosters. Free, no sign-up.',
    round: 12,
  },
  {
    slug: 'idol-to-group-girl',
    title: 'Match the Idol to the Girl Group',
    leftLabel: 'Idol',
    rightLabel: 'Girl group',
    blurb: 'Girl-group edition. Match each idol to the girl group they belong to.',
    seoTitle: 'Idol to Girl Group: K-pop Match Game',
    seoDescription:
      'Match K-pop girl-group idols to their groups against the clock. A fast pair-matching game over girl-group rosters. Free, no sign-up.',
    round: 12,
  },
];

export function getMatchUpPlaylist(slug: string): MatchUpPlaylist | undefined {
  return MATCH_UP_PLAYLISTS.find((p) => p.slug === slug);
}
