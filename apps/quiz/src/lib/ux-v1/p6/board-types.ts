// Shape of GET /api/ux-v1/p6/board (client-safe, no server imports).

export interface BoardRow {
  rank: number;
  /** Display name or username, as the live leaderboard shows it. */
  name: string;
  /** For the /u/<username> link; null when the profile has no username. */
  username: string | null;
  avatarUrl: string | null;
  /** Identity flair (profiles.name_accent / name_font / bias, DESIGN-SPEC 17.8). */
  accent: string | null;
  font: string | null;
  bias: string | null;
  score: number;
  timeMs: number;
}

export interface BoardMe {
  /** Played today's Blindtest of the day (one try per day, daily_blindtest_scores). */
  played: boolean;
  rank: number | null;
  score: number | null;
  timeMs: number | null;
  /** Best daily score ever (out of 10), null before the first daily. */
  best: number | null;
  /** bt_players.rank_title when the player has a row (DESIGN-SPEC 15.4), else null. */
  rankTitle: string | null;
  name: string;
  avatarUrl: string | null;
}

export interface BoardResponse {
  /** UTC day of the daily (the routes and the unique constraint use UTC). */
  date: string;
  /** Players on today's board (head count of daily_blindtest_scores). */
  total: number;
  /** ms until the next daily (UTC midnight). */
  resetsInMs: number;
  top: BoardRow[];
  /** null for guests. */
  me: BoardMe | null;
}
