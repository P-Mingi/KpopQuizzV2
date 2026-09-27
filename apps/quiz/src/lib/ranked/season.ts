// Season aggregation, placement and the season calendar (DESIGN-SPEC 15.4 + 17.6).
//
// Season score = sum of the player's 5 best runs of the season. A new run counts
// only when it beats the 5th best (strictly), so the score never goes down. Among
// runs with equal points the EARLIER one keeps its place, which is what makes
// "a later run must beat, not equal" consistent with the sort below.
// The SQL twin is public.ranked_standings() in the pending migration.

import { BEST_RUNS, PLACEMENT_RUNS, SEASON_LENGTH_DAYS } from './constants';
import { isPromotion, nextStep, tierFor } from './tiers';

import type { NextStep, TierPlacement } from './tiers';

/** A finished (submitted or quit) run of the season. */
export interface FinishedRun {
  id: string;
  points: number;
  correct: number;
  /** Mean time of the right answers (null when none). */
  avgAnswerMs: number | null;
  /** ISO timestamp. */
  finishedAt: string;
}

function byBest(a: FinishedRun, b: FinishedRun): number {
  if (b.points !== a.points) return b.points - a.points;
  const ta = Date.parse(a.finishedAt);
  const tb = Date.parse(b.finishedAt);
  if (ta !== tb) return ta - tb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** The counted runs, best first (at most 5). */
export function bestRuns(runs: readonly FinishedRun[]): FinishedRun[] {
  return [...runs].sort(byBest).slice(0, BEST_RUNS);
}

export function seasonScore(runs: readonly FinishedRun[]): number {
  return bestRuns(runs).reduce((sum, r) => sum + r.points, 0);
}

/**
 * The score a new run must BEAT to count ("Score over 1,420 to count"), or null
 * while fewer than 5 runs are finished (every run counts then).
 */
export function scoreToBeat(runs: readonly FinishedRun[]): number | null {
  const best = bestRuns(runs);
  return best.length < BEST_RUNS ? null : best[best.length - 1]!.points;
}

/**
 * Season tie-break value: mean answer time of the right answers across the
 * counted runs (weighted by right answers). Lower is better; null sorts last.
 */
export function seasonAvgAnswerMs(runs: readonly FinishedRun[]): number | null {
  let ms = 0;
  let n = 0;
  for (const r of bestRuns(runs)) {
    if (r.avgAnswerMs === null || r.correct <= 0) continue;
    ms += r.avgAnswerMs * r.correct;
    n += r.correct;
  }
  return n > 0 ? Math.round(ms / n) : null;
}

export interface Placement {
  done: number;
  of: number;
  complete: boolean;
}

/** "3 / 5 placed": the first 5 finished runs of the season place the player. */
export function placement(finishedRuns: number): Placement {
  if (!Number.isInteger(finishedRuns) || finishedRuns < 0) throw new RangeError(`placement: ${finishedRuns}`);
  return { done: Math.min(finishedRuns, PLACEMENT_RUNS), of: PLACEMENT_RUNS, complete: finishedRuns >= PLACEMENT_RUNS };
}

export interface SeasonImpact {
  /** The run entered the best 5. */
  counted: boolean;
  /** The best-5 run it pushed out (null while fewer than 5 runs, or when it did not count). */
  replaced: FinishedRun | null;
  /** The score the run had to beat (null while fewer than 5 runs). */
  toBeat: number | null;
  before: { score: number; tier: TierPlacement };
  after: { score: number; tier: TierPlacement };
  delta: number;
  promoted: boolean;
  next: NextStep | null;
  placement: Placement;
}

/** What one new run does to the season (the "Season impact" block on results). */
export function applyRun(previous: readonly FinishedRun[], run: FinishedRun): SeasonImpact {
  const beforeBest = bestRuns(previous);
  const before = seasonScore(previous);
  const toBeat = scoreToBeat(previous);
  const all = [...previous, run];
  const afterBest = bestRuns(all);
  const after = seasonScore(all);
  const counted = afterBest.some((r) => r.id === run.id);
  const replaced = counted && beforeBest.length >= BEST_RUNS
    ? beforeBest.find((r) => !afterBest.some((a) => a.id === r.id)) ?? null
    : null;
  return {
    counted,
    replaced,
    toBeat,
    before: { score: before, tier: tierFor(before) },
    after: { score: after, tier: tierFor(after) },
    delta: after - before,
    promoted: isPromotion(before, after),
    next: nextStep(after),
    placement: placement(all.length),
  };
}

// ---- season calendar --------------------------------------------------------

export interface Season {
  id: number;
  /** ISO timestamps, [startsAt, endsAt). */
  startsAt: string;
  endsAt: string;
}

const DAY_MS = 86_400_000;

/** The season covering `now` (the highest id wins if two overlap), or null. */
export function currentSeason(seasons: readonly Season[], now: Date): Season | null {
  const t = now.getTime();
  let found: Season | null = null;
  for (const s of seasons) {
    if (Date.parse(s.startsAt) <= t && t < Date.parse(s.endsAt) && (!found || s.id > found.id)) found = s;
  }
  return found;
}

/** Whole days left, rounded up ("ends in 19 days"). 0 once ended. */
export function daysLeft(season: Season, now: Date): number {
  return Math.max(0, Math.ceil((Date.parse(season.endsAt) - now.getTime()) / DAY_MS));
}

/** The season that follows `prev`, back to back, 8 weeks long. */
export function nextSeasonWindow(prev: Season): Season {
  const start = Date.parse(prev.endsAt);
  return {
    id: prev.id + 1,
    startsAt: new Date(start).toISOString(),
    endsAt: new Date(start + SEASON_LENGTH_DAYS * DAY_MS).toISOString(),
  };
}
