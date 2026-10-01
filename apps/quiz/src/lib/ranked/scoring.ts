// Ranked scoring (DESIGN-SPEC 17.6). Pure and integer-exact so the server
// recomputes the same number on every run, whatever the client displayed.
//
//   right answer = (100 + speed bonus) x combo, rounded to the nearest point
//   speed bonus  = 100 under 2 s, then round(100 x (10 - t) / 8), 0 at 10 s
//   combo        = x1.0 on the first right answer, +0.1 per right answer in a row, cap x2.0
//   wrong / timeout = 0 points and the combo resets
//
// A perfect run of 10 answers under 2 s is 200 x (1.0 + 1.1 + ... + 1.9) = 2,900.

import {
  BASE_POINTS,
  COMBO_BASE_TENTHS,
  COMBO_CAP_TENTHS,
  COMBO_STEP_TENTHS,
  FULL_SPEED_MS,
  MAX_SPEED_BONUS,
  ROUND_COUNT,
  ROUND_MS,
} from './constants';

/** Speed bonus for a right answer given `ms` after the clip started. */
export function speedBonus(ms: number): number {
  if (!Number.isFinite(ms) || ms < 0) throw new RangeError(`speedBonus: invalid time ${ms}`);
  if (ms < FULL_SPEED_MS) return MAX_SPEED_BONUS;
  if (ms >= ROUND_MS) return 0;
  return Math.round((MAX_SPEED_BONUS * (ROUND_MS - ms)) / (ROUND_MS - FULL_SPEED_MS));
}

/**
 * Combo multiplier in tenths for the `streak`-th right answer in a row
 * (streak 1 = x1.0 = 10, streak 2 = x1.1 = 11, ... capped at x2.0 = 20).
 */
export function comboTenths(streak: number): number {
  if (!Number.isInteger(streak) || streak < 1) throw new RangeError(`comboTenths: invalid streak ${streak}`);
  return Math.min(COMBO_CAP_TENTHS, COMBO_BASE_TENTHS + COMBO_STEP_TENTHS * (streak - 1));
}

/** "x1.3" style label for a multiplier in tenths. */
export function comboLabel(tenths: number): string {
  return `x${(tenths / 10).toFixed(1)}`;
}

/** One round as the server recorded it. `ms` is the effective (server-checked) answer time. */
export type RoundOutcome =
  | { kind: 'right'; ms: number }
  | { kind: 'wrong'; ms: number }
  | { kind: 'timeout' }
  /** Never answered: the run was quit or abandoned before this round. */
  | { kind: 'unanswered' };

export interface ScoredRound {
  kind: RoundOutcome['kind'];
  points: number;
  speedBonus: number;
  /** Multiplier in tenths applied to this round (0 when no points). */
  comboTenths: number;
  /** Right answers in a row after this round. */
  streak: number;
}

/**
 * Points for one round given the streak BEFORE it. Returns the new streak.
 * Wrong, timeout and unanswered all score 0 and reset the combo.
 */
export function scoreRound(outcome: RoundOutcome, streakBefore: number): ScoredRound {
  if (outcome.kind !== 'right') {
    return { kind: outcome.kind, points: 0, speedBonus: 0, comboTenths: 0, streak: 0 };
  }
  const streak = streakBefore + 1;
  const bonus = speedBonus(outcome.ms);
  const tenths = comboTenths(streak);
  // (100 + bonus) x tenths is an integer, so the only rounding is the final /10.
  const points = Math.round(((BASE_POINTS + bonus) * tenths) / 10);
  return { kind: 'right', points, speedBonus: bonus, comboTenths: tenths, streak };
}

export interface RunScore {
  points: number;
  correct: number;
  /** Longest run of right answers. */
  bestCombo: number;
  /** Mean answer time of the right answers, in ms (null when none). */
  avgAnswerMs: number | null;
  rounds: ScoredRound[];
}

/**
 * Score a whole run. `outcomes` may be shorter than `total` (a quit run):
 * the missing rounds are recorded as unanswered and score 0.
 */
export function scoreRun(outcomes: readonly RoundOutcome[], total: number = ROUND_COUNT): RunScore {
  if (outcomes.length > total) throw new RangeError(`scoreRun: ${outcomes.length} outcomes for ${total} rounds`);
  const rounds: ScoredRound[] = [];
  let streak = 0;
  let points = 0;
  let correct = 0;
  let bestCombo = 0;
  let rightMs = 0;
  for (let i = 0; i < total; i++) {
    const outcome: RoundOutcome = outcomes[i] ?? { kind: 'unanswered' };
    const scored = scoreRound(outcome, streak);
    streak = scored.streak;
    points += scored.points;
    if (outcome.kind === 'right') {
      correct += 1;
      rightMs += outcome.ms;
    }
    bestCombo = Math.max(bestCombo, streak);
    rounds.push(scored);
  }
  return {
    points,
    correct,
    bestCombo,
    avgAnswerMs: correct > 0 ? Math.round(rightMs / correct) : null,
    rounds,
  };
}

/** The best possible run: every answer right and under 2 s. */
export function maxRunPoints(total: number = ROUND_COUNT): number {
  return scoreRun(Array.from({ length: total }, () => ({ kind: 'right' as const, ms: 0 })), total).points;
}
