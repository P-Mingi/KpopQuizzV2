// Blindtest points shown DURING a run (DESIGN-SPEC 14.7, 16.7, 17.6):
//   right answer = (100 + speed bonus) x combo, rounded to the nearest point
//   speed bonus  = 100 under 2 s, then round(100 x (10 - t) / 8), 0 at 10 s
//   combo        = x1.0 on the first right answer, +0.1 per right answer in a row, cap x2.0
//   wrong / timeout = 0 points and the combo resets
//
// Display only. The saved score of a free or daily run stays what it is today:
// the number of right answers (POST /api/daily/blindtest/submit { score, time_ms }).
// Nothing here is sent to the server. The ranked engine recomputes its own points
// on the server (P7, lib/ranked/scoring.ts, same formula); this module only mirrors
// it for the day-mode game so the numbers a player sees match the rules page.

export const ROUND_MS = 10_000;
const FULL_SPEED_MS = 2_000;
const BASE = 100;
const MAX_BONUS = 100;
const COMBO_CAP_TENTHS = 20;

/** Speed bonus for a right answer `ms` after the clip started. */
export function speedBonus(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) return 0;
  if (ms < FULL_SPEED_MS) return MAX_BONUS;
  if (ms >= ROUND_MS) return 0;
  return Math.round((MAX_BONUS * (ROUND_MS - ms)) / (ROUND_MS - FULL_SPEED_MS));
}

/** Multiplier in tenths for the `streak`-th right answer in a row (1 = x1.0). */
export function comboTenths(streak: number): number {
  if (streak < 1) return 10;
  return Math.min(COMBO_CAP_TENTHS, 10 + (streak - 1));
}

/** "x1.3" label for a multiplier in tenths. */
export function comboLabel(tenths: number): string {
  return `x${(tenths / 10).toFixed(1)}`;
}

export interface ScoredAnswer {
  correct: boolean;
  /** ms from the clip start to the answer (or the full round on a timeout). */
  timeMs: number;
}

export interface RoundPoints {
  points: number;
  speed: number;
  tenths: number;
  /** Right answers in a row after this round. */
  streak: number;
}

/** Points of one round given the streak before it. */
export function scoreRound(a: ScoredAnswer, streakBefore: number): RoundPoints {
  if (!a.correct) return { points: 0, speed: 0, tenths: 0, streak: 0 };
  const streak = streakBefore + 1;
  const speed = speedBonus(a.timeMs);
  const tenths = comboTenths(streak);
  return { points: Math.round(((BASE + speed) * tenths) / 10), speed, tenths, streak };
}

export interface RunSummary {
  points: number;
  correct: number;
  /** Longest run of right answers in a row. */
  bestStreak: number;
  /** Mean time of the right answers in ms, null when none. */
  avgMs: number | null;
  /** Fastest right answer in ms, null when none. */
  fastestMs: number | null;
  rounds: RoundPoints[];
}

export function summarizeRun(answers: readonly ScoredAnswer[]): RunSummary {
  let streak = 0;
  let points = 0;
  let correct = 0;
  let bestStreak = 0;
  let rightMs = 0;
  let fastestMs: number | null = null;
  const rounds: RoundPoints[] = [];
  for (const a of answers) {
    const r = scoreRound(a, streak);
    streak = r.streak;
    points += r.points;
    if (a.correct) {
      correct += 1;
      rightMs += a.timeMs;
      fastestMs = fastestMs === null ? a.timeMs : Math.min(fastestMs, a.timeMs);
    }
    bestStreak = Math.max(bestStreak, streak);
    rounds.push(r);
  }
  return { points, correct, bestStreak, avgMs: correct ? Math.round(rightMs / correct) : null, fastestMs, rounds };
}

/** The result label the live game shows (blindtest-game.tsx scoreLabel, same thresholds). */
export function scoreLabel(score: number, total: number): string {
  if (total > 0 && score >= total) return 'Perfect ear';
  const pct = total > 0 ? score / total : 0;
  if (pct >= 0.8) return 'Sharp listener';
  if (pct >= 0.6) return 'Solid fan';
  if (pct >= 0.4) return 'Getting there';
  return 'Keep listening';
}

/** 1860 -> "1,860". */
export function comma(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** 1520 -> "1.5s". */
export function secs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
