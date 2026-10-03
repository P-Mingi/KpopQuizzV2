// G8 (V12): the rules of the creators board (/creators, SYSTEM.md 5.4), pure.
// The page prints these rules ("How the board counts"), so the count below IS
// what the page says:
//   1. plays of a creator's PUBLISHED quizzes by unique players, once per player
//      per quiz per UTC day;
//   2. the creator's own plays never count;
//   3. a quiz that is not published (flagged after reports, removed, draft) is not
//      in the quiz list handed in, so its plays are not counted.
// Editorial accounts and banned profiles are left out by the caller (`excluded`).
// No I/O here: lib/creators/data.ts reads, this module counts.

export interface PlayRow {
  id: string;
  quiz_id: string;
  player_id: string | null;
  anon_id: string | null;
  created_at: string;
}

export interface QuizRow {
  id: string;
  creator_id: string | null;
  group_id: number | null;
  title: string;
  slug: string;
  created_at: string;
}

/** Who played: the account, else the browser id, else the play itself (a play
 *  with no identity cannot be matched to another one, so it counts once). */
export function playerKey(p: Pick<PlayRow, 'id' | 'player_id' | 'anon_id'>): string {
  if (p.player_id) return `u:${p.player_id}`;
  if (p.anon_id) return `a:${p.anon_id}`;
  return `p:${p.id}`;
}

/** UTC day of a play ("2026-10-02"). */
export function utcDay(iso: string): string {
  return iso.slice(0, 10);
}

/** First instant of the UTC month of `now` (the board resets on the 1st). */
export function monthStart(now: Date): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export interface Counted {
  /** Counted plays per creator id. */
  byCreator: Map<string, number>;
  /** Counted plays per quiz id. */
  byQuiz: Map<string, number>;
}

/** Apply the three rules to a list of plays. `since` (ISO) keeps only later plays.
 *  `notPlayers` (V12 F5b: the editorial accounts) drops the plays those accounts made
 *  on anyone's quiz: they never act as fans, so their plays never count for a creator. */
export function countPlays(plays: readonly PlayRow[], quizzes: ReadonlyMap<string, QuizRow>, excluded: ReadonlySet<string>, since?: string, notPlayers?: ReadonlySet<string>): Counted {
  const seen = new Set<string>();
  const byCreator = new Map<string, number>();
  const byQuiz = new Map<string, number>();
  for (const p of plays) {
    if (since && p.created_at < since) continue;
    const quiz = quizzes.get(p.quiz_id);
    const creator = quiz?.creator_id;
    if (!quiz || !creator || excluded.has(creator)) continue;
    if (p.player_id && p.player_id === creator) continue;
    if (p.player_id && notPlayers?.has(p.player_id)) continue;
    const key = `${p.quiz_id}|${playerKey(p)}|${utcDay(p.created_at)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    byCreator.set(creator, (byCreator.get(creator) ?? 0) + 1);
    byQuiz.set(quiz.id, (byQuiz.get(quiz.id) ?? 0) + 1);
  }
  return { byCreator, byQuiz };
}

export interface Ranked {
  id: string;
  plays: number;
  /** 1 = first; equal plays share a rank. */
  rank: number;
}

/** Creators with at least one counted play, most plays first; ties share a rank
 *  and are ordered by id so the list is stable. */
export function rankCreators(byCreator: ReadonlyMap<string, number>): Ranked[] {
  const rows = [...byCreator.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const out: Ranked[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const [id, plays] = rows[i]!;
    const prev = out[i - 1];
    out.push({ id, plays, rank: prev && prev.plays === plays ? prev.rank : i + 1 });
  }
  return out;
}

/** Published quizzes per creator. */
export function quizCounts(quizzes: Iterable<QuizRow>): Map<string, number> {
  const out = new Map<string, number>();
  for (const q of quizzes) if (q.creator_id) out.set(q.creator_id, (out.get(q.creator_id) ?? 0) + 1);
  return out;
}

export interface Rising {
  groupId: number;
  creatorId: string;
  quizId: string;
  plays: number;
}

/** Under this many counted plays a first quiz is not "rising". */
export const MIN_RISING_PLAYS = 5;
/** Cards shown (prototype: one row of three). */
export const RISING_CARDS = 3;

/**
 * "Rising in each fandom": for each group, the creator whose FIRST published
 * quiz came out this month and took the most counted plays this month. One card
 * per group, the busiest groups first.
 */
export function risingByFandom(quizzes: Iterable<QuizRow>, monthByQuiz: ReadonlyMap<string, number>, since: string, excluded: ReadonlySet<string>): Rising[] {
  const first = new Map<string, QuizRow>();
  for (const q of quizzes) {
    if (!q.creator_id) continue;
    const cur = first.get(q.creator_id);
    if (!cur || q.created_at < cur.created_at) first.set(q.creator_id, q);
  }
  const best = new Map<number, Rising>();
  for (const [creatorId, q] of first) {
    if (q.created_at < since || q.group_id === null || excluded.has(creatorId)) continue;
    const plays = monthByQuiz.get(q.id) ?? 0;
    if (plays < MIN_RISING_PLAYS) continue;
    const cur = best.get(q.group_id);
    if (!cur || plays > cur.plays || (plays === cur.plays && q.id < cur.quizId)) best.set(q.group_id, { groupId: q.group_id, creatorId, quizId: q.id, plays });
  }
  return [...best.values()].sort((a, b) => b.plays - a.plays || a.quizId.localeCompare(b.quizId));
}

/** The creator tiers (badge_definitions creator_bronze / silver / gold; thresholds
 *  as in lib/creator-progress.ts and migration 104). */
export const CREATOR_TIERS = [
  { id: 'creator_bronze', name: 'Creator Bronze', plays: 100, line: '100 plays on your quizzes' },
  { id: 'creator_silver', name: 'Creator Silver', plays: 1000, line: '1,000 plays' },
  { id: 'creator_gold', name: 'Creator Gold', plays: 10000, line: '10,000 plays' },
] as const;

/** The rules, as printed on the page. */
export const BOARD_RULES = [
  'Plays of your published quizzes by unique players, once per player per quiz per day.',
  'Your own plays never count.',
  'A quiz that is flagged after reports is paused: its plays do not count until a moderator publishes it again.',
] as const;
