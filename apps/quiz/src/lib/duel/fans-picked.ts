// "Fans picked" (V12 G7, SYSTEM.md 5.3): the ranking of a group's songs from the
// This or that votes, with the movement over one week. Pure: the cron feeds it
// the vote log and stores the rows; the API reads them back.
//
// Weekly movement needs no history table: the ranking is computed twice from the
// same vote log, once with every counted vote and once with the votes cast before
// now - 7 days. movement = last week's rank - today's rank (positive = went up).
// A song that had no rank a week ago has no movement (null): nothing is invented.

import { rankBradleyTerry, validVotes } from './bradley-terry';

import type { DuelVote } from './bradley-terry';

/**
 * Thresholds, and why.
 *
 * MIN_VOTES_FLOOR (100 counted votes on the group's question): below it the group
 * has no ranking at all. A group has up to 16 songs, so 100 votes is about 12
 * comparisons per song; under that one fan (5 pairs per quiz result) can reorder
 * the top by themselves. A question may ask for more through
 * `duel_questions.min_votes` (500 on the three questions seeded before V12), never
 * for less.
 *
 * MIN_SONG_COMPARISONS (5): a song that was shown fewer than 5 times is fitted but
 * not ranked; one lucky vote would otherwise put it first.
 */
export const MIN_VOTES_FLOOR = 100;
export const MIN_SONG_COMPARISONS = 5;
export const TOP_SONGS = 10;
export const MOVEMENT_WINDOW_DAYS = 7;

export interface FansPickedVote extends DuelVote {
  voterHash: string | null;
  /** created_at, ms since epoch */
  at: number;
}

export interface FansPickedRow {
  entityId: string;
  rank: number | null;
  prevRank: number | null;
  /** prevRank - rank; null when either side has no rank */
  movement: number | null;
  strength: number;
  /** counted votes this song took part in */
  votes: number;
  wins: number;
}

export interface FansPickedResult {
  rows: FansPickedRow[];
  /** counted votes on the question (after exclusions) */
  totalVotes: number;
  /** counted votes cast before the movement window */
  prevTotalVotes: number;
}

export function effectiveMinVotes(questionMinVotes: number | null | undefined): number {
  const asked = typeof questionMinVotes === 'number' && Number.isFinite(questionMinVotes) ? questionMinVotes : 0;
  return Math.max(MIN_VOTES_FLOOR, asked);
}

export function isRanked(totalVotes: number, questionMinVotes: number | null | undefined): boolean {
  return totalVotes >= effectiveMinVotes(questionMinVotes);
}

export function computeFansPicked(input: {
  entityIds: readonly string[];
  votes: readonly FansPickedVote[];
  /** ms since epoch */
  now: number;
  /** voter hashes that never count (editorial accounts) */
  excludedVoters?: ReadonlySet<string>;
  /** the question's own floor (duel_questions.min_votes) */
  minVotes?: number | null;
}): FansPickedResult {
  const excluded = input.excludedVoters ?? new Set<string>();
  const counted = validVotes(input.entityIds, input.votes).filter((v) => v.at <= input.now && !(v.voterHash !== null && excluded.has(v.voterHash)));
  const cutoff = input.now - MOVEMENT_WINDOW_DAYS * 86_400_000;
  const before = counted.filter((v) => v.at < cutoff);

  const current = rankBradleyTerry(input.entityIds, counted, { minComparisons: MIN_SONG_COMPARISONS });
  // Last week's ranking exists only if the group was already ranked then.
  const prevRanks = new Map<string, number | null>();
  if (isRanked(before.length, input.minVotes)) {
    for (const r of rankBradleyTerry(input.entityIds, before, { minComparisons: MIN_SONG_COMPARISONS })) prevRanks.set(r.id, r.rank);
  }

  const rows = current.map((r): FansPickedRow => {
    const prevRank = prevRanks.get(r.id) ?? null;
    return {
      entityId: r.id,
      rank: r.rank,
      prevRank,
      movement: r.rank !== null && prevRank !== null ? prevRank - r.rank : null,
      strength: r.strength,
      votes: r.comparisons,
      wins: r.wins,
    };
  });
  return { rows, totalVotes: counted.length, prevTotalVotes: before.length };
}

/** The rows a page shows: ranked songs only, best first, at most `limit`. */
export function topRows<T extends { rank: number | null; entityId: string }>(rows: readonly T[], limit: number = TOP_SONGS): Array<T & { rank: number }> {
  return rows
    .filter((r): r is T & { rank: number } => r.rank !== null)
    .sort((x, y) => x.rank - y.rank || x.entityId.localeCompare(y.entityId))
    .slice(0, limit);
}
