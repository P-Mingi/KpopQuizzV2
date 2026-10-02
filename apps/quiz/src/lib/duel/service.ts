// The duel rules (V12 G7), written against a small store interface so the
// anti-abuse rules are unit tested without a database. lib/duel/server.ts is the
// Supabase store; the routes only parse the request and call these.
//
// Anti-abuse, in order (vote):
//   1. the pair token must be one this server signed, not expired       (bad_token)
//   2. it must have been issued to the same voter hash                  (bad_token)
//   3. editorial accounts never vote                                    (not_allowed)
//   4. burst limit per voter hash, in memory                            (rate_limited)
//   5. database, atomically: both songs belong to the question, one vote per pair
//      per voter per UTC day, daily cap per voter                       (already_voted / rate_limited)
// Only the voter hash is stored with a vote: no IP, no user id.

import { computeFansPicked, effectiveMinVotes, isRanked, topRows } from './fans-picked';
import { MAX_PAIRS, pickPairs, splitOf } from './pairs';
import { signPair, TOKEN_TTL_MS, verifyPair, voterHash } from './token';

import type { FansPickedRow, FansPickedVote } from './fans-picked';
import type { RateLimiter } from './rate-limit';
import type { DuelGroup, DuelSong, FansPickedResponse, PairsResponse, VoteError, VoteResponse } from './types';

export interface SongQuestion {
  id: string;
  groupSlug: string;
  minVotes: number;
}

export interface StoredRank {
  entityId: string;
  rank: number | null;
  prevRank: number | null;
  movement: number | null;
  votes: number;
  questionVotes: number;
  questionVotesPrev: number;
  computedAt: string;
}

export interface CastResult {
  status: 'ok' | 'already_voted' | 'rate_limited' | 'bad_pair' | 'bad_question' | 'bad_voter';
  votesA: number | null;
  votesB: number | null;
}

export interface DuelStore {
  /** The G7 SQL is applied (guard table, vote function, ranking table). */
  applied(): Promise<boolean>;
  group(slug: string): Promise<(DuelGroup & { id: number }) | null>;
  /** The group's active song question, null when it has none. */
  question(groupSlug: string): Promise<SongQuestion | null>;
  songs(question: SongQuestion, groupId: number): Promise<DuelSong[]>;
  /** Pair keys this voter already answered today (UTC) on the question. */
  votedToday(voter: string, questionId: string): Promise<Set<string>>;
  cast(input: { questionId: string; a: string; b: string; winner: string; voter: string }): Promise<CastResult | null>;
  ranking(questionId: string): Promise<StoredRank[] | null>;
  isEditorial(userId: string): Promise<boolean>;
}

export interface Voter {
  /** `u:<user id>` or `a:<browser id>` */
  identity: string;
  /** signed-in user id, when there is one */
  userId: string | null;
}

const NO_PAIRS: PairsResponse = { pairs: [], group: null, ranked: false };

function hasRanking(rows: StoredRank[] | null, minVotes: number): boolean {
  if (!rows || rows.length === 0) return false;
  const first = rows[0] as StoredRank;
  return isRanked(first.questionVotes, minVotes) && rows.some((r) => r.rank !== null);
}

/** The pairs of one bonus card. Anything missing = no pair = no card (fail soft). */
export async function issuePairs(input: {
  store: DuelStore;
  key: Buffer | null;
  voter: Voter | null;
  groupSlug: string;
  now: number;
  limiter: RateLimiter;
  rnd?: () => number;
}): Promise<PairsResponse> {
  const { store, key, voter } = input;
  if (!key || !voter) return NO_PAIRS;
  const hash = voterHash(key, voter.identity);
  if (!input.limiter.hit(hash)) return NO_PAIRS;
  if (!(await store.applied())) return NO_PAIRS;
  if (voter.userId && (await store.isEditorial(voter.userId))) return NO_PAIRS;
  const group = await store.group(input.groupSlug);
  if (!group) return NO_PAIRS;
  const question = await store.question(group.slug);
  if (!question) return NO_PAIRS;
  const songs = await store.songs(question, group.id);
  if (songs.length < 2) return NO_PAIRS;
  const [done, ranking] = await Promise.all([store.votedToday(hash, question.id), store.ranking(question.id)]);
  const byId = new Map(songs.map((s) => [s.id, s]));
  const exp = input.now + TOKEN_TTL_MS;
  const pairs = pickPairs(songs.map((s) => s.id), MAX_PAIRS, done, input.rnd).map(([a, b]) => ({
    token: signPair(key, { q: question.id, a, b, v: hash, exp }),
    a: byId.get(a) as DuelSong,
    b: byId.get(b) as DuelSong,
  }));
  return {
    pairs,
    group: { slug: group.slug, name: group.name, fandom: group.fandom },
    ranked: hasRanking(ranking, question.minVotes),
  };
}

export type VoteOutcome = { http: 200; body: VoteResponse } | { http: 400 | 403 | 429 | 503; body: VoteError };

export async function castVote(input: {
  store: DuelStore;
  key: Buffer | null;
  voter: Voter | null;
  token: unknown;
  winner: unknown;
  now: number;
  limiter: RateLimiter;
}): Promise<VoteOutcome> {
  const { store, key, voter } = input;
  if (!key) return { http: 503, body: { error: 'not_live' } };
  if (!voter) return { http: 400, body: { error: 'no_voter' } };
  if (input.winner !== 'a' && input.winner !== 'b') return { http: 400, body: { error: 'bad_request' } };
  const claims = verifyPair(key, input.token, input.now);
  const hash = voterHash(key, voter.identity);
  if (!claims || claims.v !== hash) return { http: 403, body: { error: 'bad_token' } };
  if (voter.userId && (await store.isEditorial(voter.userId))) return { http: 403, body: { error: 'not_allowed' } };
  if (!input.limiter.hit(hash)) return { http: 429, body: { error: 'rate_limited' } };
  if (!(await store.applied())) return { http: 503, body: { error: 'not_live' } };

  const res = await store.cast({ questionId: claims.q, a: claims.a, b: claims.b, winner: input.winner === 'a' ? claims.a : claims.b, voter: hash });
  if (!res) return { http: 503, body: { error: 'failed' } };
  if (res.status === 'rate_limited') return { http: 429, body: { error: 'rate_limited' } };
  if (res.status !== 'ok' && res.status !== 'already_voted') return { http: 400, body: { error: 'bad_request' } };
  return { http: 200, body: { status: res.status, split: splitOf(res.votesA, res.votesB) } };
}

export async function readFansPicked(store: DuelStore, groupSlug: string): Promise<FansPickedResponse> {
  const none: FansPickedResponse = { group: null, ranked: false, votes: null, minVotes: effectiveMinVotes(null), hasMovement: false, updatedAt: null, songs: [] };
  if (!(await store.applied())) return none;
  const group = await store.group(groupSlug);
  if (!group) return none;
  const pub: DuelGroup = { slug: group.slug, name: group.name, fandom: group.fandom };
  const question = await store.question(group.slug);
  if (!question) return { ...none, group: pub };
  const minVotes = effectiveMinVotes(question.minVotes);
  const rows = await store.ranking(question.id);
  if (!rows || rows.length === 0) return { ...none, group: pub, minVotes };
  const first = rows[0] as StoredRank;
  const base = { group: pub, votes: first.questionVotes, minVotes, updatedAt: first.computedAt };
  if (!hasRanking(rows, question.minVotes)) return { ...none, ...base };
  const songs = new Map((await store.songs(question, group.id)).map((s) => [s.id, s]));
  const hasMovement = isRanked(first.questionVotesPrev, question.minVotes);
  return {
    ...base,
    ranked: true,
    hasMovement,
    songs: topRows(rows).flatMap((r) => {
      const song = songs.get(r.entityId);
      // a ranked song that left the catalogue is skipped, never shown without a title
      return song ? [{ ...song, rank: r.rank, votes: r.votes, movement: r.movement, isNew: hasMovement && r.prevRank === null }] : [];
    }),
  };
}

export interface RankingRun {
  questionId: string;
  groupSlug: string;
  totalVotes: number;
  prevTotalVotes: number;
  ranked: boolean;
  rows: FansPickedRow[];
}

/** One question's ranking from its vote log. Pure: the cron reads, calls this, then stores. */
export function rankQuestion(input: {
  question: SongQuestion;
  entityIds: readonly string[];
  votes: readonly FansPickedVote[];
  now: number;
  excludedVoters: ReadonlySet<string>;
}): RankingRun {
  const res = computeFansPicked({ entityIds: input.entityIds, votes: input.votes, now: input.now, excludedVoters: input.excludedVoters, minVotes: input.question.minVotes });
  return {
    questionId: input.question.id,
    groupSlug: input.question.groupSlug,
    totalVotes: res.totalVotes,
    prevTotalVotes: res.prevTotalVotes,
    ranked: isRanked(res.totalVotes, input.question.minVotes),
    rows: res.rows,
  };
}
