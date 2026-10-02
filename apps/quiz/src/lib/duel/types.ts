// Wire shapes of the duel API (V12 G7). Shared by the routes, the bonus card and
// the group hub section G8 renders. No server import here: safe in a client file.

export interface DuelGroup {
  slug: string;
  name: string;
  /** The real fandom name ("ARMY"), null when the group has none on record. */
  fandom: string | null;
}

export interface DuelSong {
  id: string;
  title: string;
  /** Release year, null when the catalogue has none for this song (then it is not shown). */
  year: number | null;
  /** Deezer cover URL (cdn-images.dzcdn.net), null when missing. */
  cover: string | null;
}

export interface DuelPair {
  /** Signed by the server; sent back with the vote. */
  token: string;
  a: DuelSong;
  b: DuelSong;
}

/** GET /api/duel/pairs?group=<slug>  (header x-duel-anon: the browser id) */
export interface PairsResponse {
  /** Empty = no bonus card (store not live, no song question, nothing left to vote on today...). */
  pairs: DuelPair[];
  group: DuelGroup | null;
  /** The group has a Fans picked ranking to link to. */
  ranked: boolean;
}

export type VoteStatus = 'ok' | 'already_voted';

/** POST /api/duel/vote { token, winner: 'a' | 'b' }  (header x-duel-anon) */
export interface VoteResponse {
  status: VoteStatus;
  /** Whole percents of the pair, your vote included. Null while the pair has too few votes to show a split. */
  split: { a: number; b: number; total: number } | null;
}

export interface VoteError {
  error: 'not_found' | 'bad_request' | 'bad_token' | 'no_voter' | 'rate_limited' | 'not_allowed' | 'not_live' | 'failed';
}

export interface FansPickedSong extends DuelSong {
  /** 1 = first. Equal strengths share a rank. */
  rank: number;
  /** Counted votes this song took part in. */
  votes: number;
  /** Places gained (positive) or lost (negative) in 7 days. Null = no rank a week ago. */
  movement: number | null;
  /** Ranked now, not ranked a week ago, while the group already had a ranking then. */
  isNew: boolean;
}

/** GET /api/duel/fans-picked?group=<slug> */
export interface FansPickedResponse {
  group: DuelGroup | null;
  /** False = hide the section: too few votes, no ranking computed yet, or the store is not live. */
  ranked: boolean;
  /** Counted votes on the group's songs. Null when unknown. */
  votes: number | null;
  /** Votes the group needs before it is ranked. */
  minVotes: number;
  /** The group already had a ranking 7 days ago, so `movement` means something. */
  hasMovement: boolean;
  /** When the ranking was computed (ISO), null when never. */
  updatedAt: string | null;
  /** Top 10, best first. Empty unless `ranked`. */
  songs: FansPickedSong[];
}
