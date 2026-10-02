// Live blindtest scoring (SYSTEM.md 5.5). Pure: the server calls it at the reveal
// with the answers it timed itself; nothing here reads a clock.
//
//   right answer   500 + 500 x (1 - t/T), rounded to 10 (t = server time from the
//                  round start to the answer, T = the round length)
//   streak bonus   +100 from the 3rd right answer in a row, +100 more each round,
//                  capped at +300
//   wrong or none  0, and the streak resets
//   ties           the lower total answer time wins, then who joined first

export const LIVE_BASE_POINTS = 500;
export const LIVE_SPEED_POINTS = 500;
export const LIVE_STREAK_FROM = 3;
export const LIVE_STREAK_STEP = 100;
export const LIVE_STREAK_CAP = 300;

/** Points of a right answer given after `ms` of a `durationMs` round. */
export function roundPoints(ms: number, durationMs: number): number {
  if (!(durationMs > 0)) return LIVE_BASE_POINTS;
  const t = Math.min(Math.max(Number.isFinite(ms) ? ms : durationMs, 0), durationMs);
  const speed = Math.round((LIVE_SPEED_POINTS * (1 - t / durationMs)) / 10) * 10;
  return LIVE_BASE_POINTS + speed;
}

/** Bonus for a streak of `streak` right answers, counting the current one. */
export function streakBonus(streak: number): number {
  if (streak < LIVE_STREAK_FROM) return 0;
  return Math.min(LIVE_STREAK_CAP, (streak - (LIVE_STREAK_FROM - 1)) * LIVE_STREAK_STEP);
}

export interface ScorePlayer {
  id: string;
  score: number;
  streak: number;
  correct: number;
  answered: number;
  /** Sum of the answer times, ms: the tie break. */
  totalMs: number;
}

export interface ScoreAnswer {
  playerId: string;
  choice: number;
  ms: number;
}

export type RoundResult = 'ok' | 'no' | 'none';

export interface ScoredPlayer extends ScorePlayer {
  /** What this round did. */
  result: RoundResult;
  /** Points won this round (speed points and streak bonus together). */
  gain: number;
  /** The streak part of `gain`. */
  bonus: number;
}

/**
 * One round, for every player of the room. A player with no answer scores 0, loses
 * the streak and is charged the full round for the tie break (so not answering
 * never beats a slow answer). Returns new objects, in the order given.
 */
export function scoreRound(
  players: readonly ScorePlayer[],
  answers: readonly ScoreAnswer[],
  correctChoice: number,
  durationMs: number,
): ScoredPlayer[] {
  const byPlayer = new Map<string, ScoreAnswer>();
  // First answer wins (the database refuses a second one; this keeps the function total).
  for (const a of answers) if (!byPlayer.has(a.playerId)) byPlayer.set(a.playerId, a);
  return players.map((p) => {
    const a = byPlayer.get(p.id);
    if (!a) return { ...p, streak: 0, totalMs: p.totalMs + durationMs, result: 'none', gain: 0, bonus: 0 };
    const ms = Math.min(Math.max(a.ms, 0), durationMs);
    if (a.choice !== correctChoice) {
      return { ...p, streak: 0, answered: p.answered + 1, totalMs: p.totalMs + ms, result: 'no', gain: 0, bonus: 0 };
    }
    const streak = p.streak + 1;
    const bonus = streakBonus(streak);
    const gain = roundPoints(ms, durationMs) + bonus;
    return {
      ...p,
      streak,
      score: p.score + gain,
      correct: p.correct + 1,
      answered: p.answered + 1,
      totalMs: p.totalMs + ms,
      result: 'ok',
      gain,
      bonus,
    };
  });
}

export interface RankInput {
  id: string;
  score: number;
  totalMs: number;
  /** ISO time or a number: who joined first wins the last tie. */
  joinedAt: string | number;
}

/** Leaderboard order: points, then the lower total answer time, then the earlier join, then the id. */
export function rankPlayers<T extends RankInput>(players: readonly T[]): T[] {
  const at = (v: string | number): number => (typeof v === 'number' ? v : Date.parse(v) || 0);
  return [...players].sort((a, b) =>
    b.score - a.score
    || a.totalMs - b.totalMs
    || at(a.joinedAt) - at(b.joinedAt)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/** How many phones picked each of the four answers. */
export function choiceCounts(answers: readonly { choice: number }[]): [number, number, number, number] {
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (const a of answers) if (a.choice >= 0 && a.choice <= 3) out[a.choice as 0 | 1 | 2 | 3] += 1;
  return out;
}
