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
];

export function getMatchUpPlaylist(slug: string): MatchUpPlaylist | undefined {
  return MATCH_UP_PLAYLISTS.find((p) => p.slug === slug);
}
