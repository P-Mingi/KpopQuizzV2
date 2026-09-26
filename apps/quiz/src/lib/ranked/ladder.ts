// Season ladder order and Legend (DESIGN-SPEC 15.4 + 17.6).
//
// Order: season score (high first), then average answer time of the counted runs
// (fast first, "ties are broken by average answer speed"), then who reached the
// score first, then player id so the order is total. Only placed players (5 runs
// finished) are on the ladder. Legend = the top 100 of the ladder among Masters,
// recomputed nightly. SQL twins: ranked_standings() / ranked_recompute_legends().

import { LEGEND_SLOTS, PLACEMENT_RUNS } from './constants';
import { MASTER_MIN } from './tiers';

export interface Standing {
  playerId: string;
  seasonScore: number;
  /** Tie-break: mean answer time of the counted runs (null sorts last). */
  avgAnswerMs: number | null;
  /** ISO time the current season score was reached (last counted run). */
  reachedAt: string;
  /** Finished runs this season. */
  runs: number;
}

export function compareStandings(a: Standing, b: Standing): number {
  if (b.seasonScore !== a.seasonScore) return b.seasonScore - a.seasonScore;
  if (a.avgAnswerMs !== b.avgAnswerMs) {
    if (a.avgAnswerMs === null) return 1;
    if (b.avgAnswerMs === null) return -1;
    return a.avgAnswerMs - b.avgAnswerMs;
  }
  const ta = Date.parse(a.reachedAt);
  const tb = Date.parse(b.reachedAt);
  if (ta !== tb) return ta - tb;
  return a.playerId < b.playerId ? -1 : a.playerId > b.playerId ? 1 : 0;
}

export interface LadderRow extends Standing {
  position: number;
}

/** The ladder: placed players only, ordered, 1-based positions. */
export function rankLadder(standings: readonly Standing[]): LadderRow[] {
  return standings
    .filter((s) => s.runs >= PLACEMENT_RUNS)
    .sort(compareStandings)
    .map((s, i) => ({ ...s, position: i + 1 }));
}

/** Legend = top 100 of the ladder among Masters. */
export function computeLegends(standings: readonly Standing[]): LadderRow[] {
  return rankLadder(standings)
    .filter((s) => s.seasonScore >= MASTER_MIN)
    .slice(0, LEGEND_SLOTS)
    .map((s, i) => ({ ...s, position: i + 1 }));
}
