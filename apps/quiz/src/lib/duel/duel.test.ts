import { describe, expect, it } from 'vitest';

import { rankBradleyTerry, sameStrength, validVotes } from './bradley-terry';
import { computeFansPicked, effectiveMinVotes, isRanked, MIN_SONG_COMPARISONS, MIN_VOTES_FLOOR, topRows } from './fans-picked';
import { MAX_PAIRS, MIN_SPLIT_VOTES, pairKey, pickPairs, splitOf } from './pairs';
import { createRateLimiter } from './rate-limit';
import { castVote, issuePairs, rankQuestion, readFansPicked } from './service';
import { duelKey, signPair, TOKEN_TTL_MS, verifyPair, voterHash } from './token';

import type { DuelVote } from './bradley-terry';
import type { FansPickedVote } from './fans-picked';
import type { CastResult, DuelStore, SongQuestion, StoredRank, Voter } from './service';
import type { DuelSong } from './types';

// ---- fixtures -------------------------------------------------------------------

const id = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const A = id(1);
const B = id(2);
const C = id(3);
const D = id(4);

/** `n` votes on the pair (x, y), `xWins` of them won by x. */
function duel(x: string, y: string, n: number, xWins: number): DuelVote[] {
  return Array.from({ length: n }, (_, i) => ({ a: i % 2 ? x : y, b: i % 2 ? y : x, winner: i < xWins ? x : y }));
}

/** Deterministic pseudo random numbers in [0, 1). */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const ranks = (rows: Array<{ id: string; rank: number | null }>): Record<string, number | null> => Object.fromEntries(rows.map((r) => [r.id, r.rank]));

// ---- Bradley-Terry ----------------------------------------------------------------

describe('Bradley-Terry ranking', () => {
  it('known ordering: A beats B beats C', () => {
    const votes = [...duel(A, B, 10, 8), ...duel(B, C, 10, 8), ...duel(A, C, 10, 9)];
    const rows = rankBradleyTerry([C, A, B], votes);
    expect(rows.map((r) => r.id)).toEqual([A, B, C]);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(rows.map((r) => [r.wins, r.losses, r.comparisons])).toEqual([[17, 3, 20], [10, 10, 20], [3, 17, 20]]);
  });

  it('known ordering that win counts alone get wrong: beating strong songs counts more', () => {
    // A has 21 wins (20 of them against the two weakest songs); B has 6, all against A.
    const votes = [...duel(A, C, 10, 10), ...duel(A, D, 10, 10), ...duel(B, A, 7, 6), ...duel(C, D, 6, 3)];
    const rows = rankBradleyTerry([A, B, C, D], votes);
    expect(rows.find((r) => r.id === A)?.wins).toBe(21);
    expect(rows.find((r) => r.id === B)?.wins).toBe(6);
    expect(rows.map((r) => r.id).slice(0, 2)).toEqual([B, A]);
    expect(ranks(rows)).toMatchObject({ [B]: 1, [A]: 2, [C]: 3, [D]: 3 });
  });

  it('two songs, 3 wins to 1: the strength ratio tends to 3 as the prior vanishes', () => {
    const rows = rankBradleyTerry([A, B], duel(A, B, 4, 3), { prior: 1e-7 });
    const a = rows.find((r) => r.id === A)?.strength as number;
    const b = rows.find((r) => r.id === B)?.strength as number;
    expect(a / b).toBeCloseTo(3, 3);
  });

  it('is deterministic: the order of the votes does not change the ranking', () => {
    const votes = [...duel(A, B, 12, 7), ...duel(B, C, 9, 5), ...duel(C, D, 11, 4), ...duel(A, D, 7, 6), ...duel(B, D, 5, 2)];
    const one = rankBradleyTerry([A, B, C, D], votes);
    const rnd = seeded(7);
    const mixed = [...votes].sort(() => rnd() - 0.5);
    const two = rankBradleyTerry([D, C, B, A], mixed);
    expect(two.map((r) => [r.id, r.rank])).toEqual(one.map((r) => [r.id, r.rank]));
    two.forEach((r, i) => expect(sameStrength(r.strength, (one[i] as (typeof one)[number]).strength)).toBe(true));
  });

  it('ties: equal records share a rank, the next rank is skipped (1, 1, 3)', () => {
    const votes = [...duel(A, B, 10, 5), ...duel(A, C, 10, 8), ...duel(B, C, 10, 8)];
    const rows = rankBradleyTerry([A, B, C], votes);
    expect(ranks(rows)).toEqual({ [A]: 1, [B]: 1, [C]: 3 });
    // tied songs are listed by id, so the order never flips between two runs
    expect(rows.map((r) => r.id)).toEqual([A, B, C]);
  });

  it('ties: a perfectly even vote ranks everyone first', () => {
    const votes = [...duel(A, B, 6, 3), ...duel(B, C, 6, 3), ...duel(A, C, 6, 3)];
    expect(ranks(rankBradleyTerry([A, B, C], votes))).toEqual({ [A]: 1, [B]: 1, [C]: 1 });
  });

  it('a song with no votes has no rank and comes last', () => {
    const rows = rankBradleyTerry([A, B, C, D], [...duel(A, B, 10, 7), ...duel(B, C, 10, 6), ...duel(A, C, 10, 8)]);
    const last = rows[rows.length - 1];
    expect(last).toMatchObject({ id: D, rank: null, comparisons: 0, wins: 0, losses: 0 });
    expect(rows.slice(0, 3).map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it('no vote at all: nobody is ranked', () => {
    expect(rankBradleyTerry([A, B], []).map((r) => r.rank)).toEqual([null, null]);
  });

  it('minComparisons: a song seen too little is fitted but not ranked', () => {
    const votes = [...duel(A, B, 10, 6), ...duel(C, A, 2, 2)];
    const rows = rankBradleyTerry([A, B, C], votes, { minComparisons: 5 });
    expect(ranks(rows)).toEqual({ [A]: 1, [B]: 2, [C]: null });
    // without the floor two lucky votes would put C first
    expect(ranks(rankBradleyTerry([A, B, C], votes))[C]).toBe(1);
  });

  it('never lost, never won: the strengths stay finite', () => {
    const rows = rankBradleyTerry([A, B], duel(A, B, 20, 20));
    for (const r of rows) expect(Number.isFinite(r.strength) && r.strength > 0).toBe(true);
    expect(rows.map((r) => r.id)).toEqual([A, B]);
  });

  it('ignores votes that are not a real duel between two known songs', () => {
    const bad: DuelVote[] = [{ a: A, b: A, winner: A }, { a: A, b: id(99), winner: A }, { a: A, b: B, winner: C }];
    expect(validVotes([A, B, C], bad)).toEqual([]);
    expect(rankBradleyTerry([A, B, C], bad).every((r) => r.comparisons === 0)).toBe(true);
  });
});

// ---- Fans picked (weekly movement, thresholds) -------------------------------------

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 2, 3, 0, 0);
const at = (votes: DuelVote[], daysAgo: number, voterHash: string | null = 'h'): FansPickedVote[] => votes.map((v) => ({ ...v, voterHash, at: NOW - daysAgo * DAY }));

describe('Fans picked', () => {
  it('thresholds: 100 votes at least, more when the question asks for more', () => {
    expect(MIN_VOTES_FLOOR).toBe(100);
    expect(effectiveMinVotes(null)).toBe(100);
    expect(effectiveMinVotes(20)).toBe(100);
    expect(effectiveMinVotes(500)).toBe(500);
    expect(isRanked(99, 100)).toBe(false);
    expect(isRanked(100, 100)).toBe(true);
    expect(isRanked(499, 500)).toBe(false);
  });

  it('weekly movement = last week rank - today rank', () => {
    // a week ago (120 votes): B first, A second, C third
    const old = at([...duel(B, A, 40, 28), ...duel(A, C, 40, 28), ...duel(B, C, 40, 30)], 10);
    // this week: A wins a lot against B
    const recent = at(duel(A, B, 60, 55), 2);
    const res = computeFansPicked({ entityIds: [A, B, C], votes: [...old, ...recent], now: NOW });
    const by = Object.fromEntries(res.rows.map((r) => [r.entityId, r]));
    expect(res.totalVotes).toBe(180);
    expect(res.prevTotalVotes).toBe(120);
    expect([by[A]?.rank, by[A]?.prevRank, by[A]?.movement]).toEqual([1, 2, 1]);
    expect([by[B]?.rank, by[B]?.prevRank, by[B]?.movement]).toEqual([2, 1, -1]);
    expect([by[C]?.rank, by[C]?.prevRank, by[C]?.movement]).toEqual([3, 3, 0]);
  });

  it('no ranking a week ago (too few votes then): no movement, nothing invented', () => {
    const old = at(duel(A, B, 30, 20), 10);
    const recent = at([...duel(A, B, 60, 40), ...duel(A, C, 30, 20)], 1);
    const res = computeFansPicked({ entityIds: [A, B, C], votes: [...old, ...recent], now: NOW });
    expect(res.prevTotalVotes).toBe(30);
    expect(res.rows.every((r) => r.prevRank === null && r.movement === null)).toBe(true);
    expect(res.rows.every((r) => r.rank !== null)).toBe(true);
  });

  it('a song first seen this week: ranked now, no previous rank, no movement', () => {
    const old = at(duel(A, B, 120, 70), 20);
    const recent = at(duel(C, A, 12, 9), 1);
    const res = computeFansPicked({ entityIds: [A, B, C], votes: [...old, ...recent], now: NOW });
    const c = res.rows.find((r) => r.entityId === C);
    expect(c?.rank).not.toBeNull();
    expect(c?.prevRank).toBeNull();
    expect(c?.movement).toBeNull();
  });

  it('a song with no votes is never ranked', () => {
    const res = computeFansPicked({ entityIds: [A, B, C], votes: at(duel(A, B, 120, 70), 1), now: NOW });
    expect(res.rows.find((r) => r.entityId === C)).toMatchObject({ rank: null, votes: 0, wins: 0, movement: null });
    expect(topRows(res.rows).map((r) => r.entityId)).toEqual([A, B]);
  });

  it(`a song with fewer than ${MIN_SONG_COMPARISONS} comparisons is not ranked`, () => {
    const res = computeFansPicked({ entityIds: [A, B, C], votes: at([...duel(A, B, 120, 70), ...duel(C, A, 4, 4)], 1), now: NOW });
    expect(res.rows.find((r) => r.entityId === C)?.rank).toBeNull();
  });

  it('votes of excluded voters (editorial accounts) and votes from the future do not count', () => {
    const fans = at(duel(A, B, 120, 80), 3, 'fan');
    const team = at(duel(B, A, 500, 500), 3, 'team');
    const future = at(duel(B, A, 500, 500), -1, 'fan');
    const res = computeFansPicked({ entityIds: [A, B], votes: [...fans, ...team, ...future], now: NOW, excludedVoters: new Set(['team']) });
    expect(res.totalVotes).toBe(120);
    expect(res.rows.map((r) => r.entityId)).toEqual([A, B]);
  });

  it('top rows: ranked songs only, best first, 10 at most', () => {
    const ids = Array.from({ length: 14 }, (_, i) => id(100 + i));
    const rows = ids.map((entityId, i) => ({ entityId, rank: i < 12 ? 12 - i : null }));
    const top = topRows(rows);
    expect(top).toHaveLength(10);
    expect(top.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('rankQuestion: a group under its floor is computed but flagged not ranked', () => {
    const question: SongQuestion = { id: id(900), groupSlug: 'riize', minVotes: 100 };
    const run = rankQuestion({ question, entityIds: [A, B], votes: at(duel(A, B, 40, 30), 1), now: NOW, excludedVoters: new Set() });
    expect(run).toMatchObject({ groupSlug: 'riize', totalVotes: 40, ranked: false });
  });
});

// ---- pairs and split ----------------------------------------------------------------

describe('pairs', () => {
  const songs = Array.from({ length: 16 }, (_, i) => id(200 + i));

  it('pair key is order free and matches the database key (lower id first)', () => {
    expect(pairKey(B, A)).toBe(`${A}|${B}`);
    expect(pairKey(A.toUpperCase(), B)).toBe(pairKey(B, A));
  });

  it('5 pairs, 10 different songs, no pair twice', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const pairs = pickPairs(songs, MAX_PAIRS, new Set(), seeded(seed));
      expect(pairs).toHaveLength(5);
      expect(new Set(pairs.flat()).size).toBe(10);
      expect(new Set(pairs.map(([a, b]) => pairKey(a, b))).size).toBe(5);
      for (const [a, b] of pairs) expect(a).not.toBe(b);
    }
  });

  it('never a pair the voter already answered today', () => {
    const done = new Set<string>();
    for (let round = 0; round < 24; round++) {
      const pairs = pickPairs(songs, MAX_PAIRS, done, seeded(round + 1));
      expect(pairs).toHaveLength(5);
      for (const [a, b] of pairs) {
        expect(done.has(pairKey(a, b))).toBe(false);
        done.add(pairKey(a, b));
      }
    }
    expect(done.size).toBe(120); // every pair of 16 songs, each exactly once
    expect(pickPairs(songs, MAX_PAIRS, done, seeded(99))).toEqual([]);
  });

  it('few songs: songs repeat, pairs do not; 2 songs give 1 pair, 1 song none', () => {
    const three = pickPairs([A, B, C], MAX_PAIRS, new Set(), seeded(3));
    expect(new Set(three.map(([a, b]) => pairKey(a, b))).size).toBe(3);
    expect(pickPairs([A, B], MAX_PAIRS, new Set(), seeded(3))).toHaveLength(1);
    expect(pickPairs([A], MAX_PAIRS, new Set(), seeded(3))).toEqual([]);
    expect(pickPairs([A, A, B], MAX_PAIRS, new Set(), seeded(3))).toHaveLength(1);
  });

  it('split: real shares, hidden under the floor', () => {
    expect(MIN_SPLIT_VOTES).toBe(5);
    expect(splitOf(1, 0)).toBeNull();
    expect(splitOf(2, 2)).toBeNull();
    expect(splitOf(3, 2)).toEqual({ a: 60, b: 40, total: 5 });
    expect(splitOf(54, 46)).toEqual({ a: 54, b: 46, total: 100 });
    expect(splitOf(2, 1)).toBeNull();
    expect(splitOf(1, 2 + 3)).toEqual({ a: 17, b: 83, total: 6 });
    expect(splitOf(null, 3)).toBeNull();
    expect(splitOf(undefined, undefined)).toBeNull();
  });
});

// ---- token, voter hash, rate limit -----------------------------------------------------

const KEY = duelKey({ DUEL_SIGNING_SECRET: 'unit-test-secret-0123456789' }) as Buffer;
const OTHER_KEY = duelKey({ DUEL_SIGNING_SECRET: 'another-unit-test-secret-000' }) as Buffer;
const Q = id(900);

describe('pair token and voter hash', () => {
  it('key: own secret, else derived from the service key, else none', () => {
    expect(duelKey({})).toBeNull();
    expect(duelKey({ DUEL_SIGNING_SECRET: 'short' })).toBeNull();
    const derived = duelKey({ SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40) });
    expect(derived).not.toBeNull();
    // the derived key is not the service key
    expect(derived?.toString('utf8')).not.toContain('xxxx');
    expect(duelKey({ SUPABASE_SERVICE_ROLE_KEY: 'x'.repeat(40), DUEL_SIGNING_SECRET: 'unit-test-secret-0123456789' })?.equals(KEY)).toBe(true);
  });

  it('voter hash: stable, 32 hex, different per identity and per key, never the id itself', () => {
    const anon = `a:${id(555)}`;
    const h = voterHash(KEY, anon);
    expect(h).toMatch(/^[0-9a-f]{32}$/);
    expect(voterHash(KEY, anon)).toBe(h);
    expect(voterHash(KEY, `u:${id(555)}`)).not.toBe(h);
    expect(voterHash(OTHER_KEY, anon)).not.toBe(h);
    expect(h).not.toContain('555');
  });

  it('a signed pair verifies; anything else does not', () => {
    const v = voterHash(KEY, 'a:x');
    const claims = { q: Q, a: A, b: B, v, exp: NOW + TOKEN_TTL_MS };
    const token = signPair(KEY, claims);
    expect(verifyPair(KEY, token, NOW)).toEqual(claims);
    expect(verifyPair(KEY, token, NOW + TOKEN_TTL_MS + 1)).toBeNull(); // expired
    expect(verifyPair(OTHER_KEY, token, NOW)).toBeNull(); // not this server's key
    // a pair the server did not issue: same signature, other songs
    const forgedBody = Buffer.from(JSON.stringify([Q, A, C, v, claims.exp])).toString('base64url');
    expect(verifyPair(KEY, `${forgedBody}.${token.split('.')[1]}`, NOW)).toBeNull();
    expect(verifyPair(KEY, token.slice(0, -2), NOW)).toBeNull();
    for (const junk of ['', 'a.b', 'a.b.c', null, 42, {}, `${'x'.repeat(700)}.y`]) expect(verifyPair(KEY, junk, NOW)).toBeNull();
    // a pair of one song with itself is never valid, even signed
    expect(verifyPair(KEY, signPair(KEY, { ...claims, b: A }), NOW)).toBeNull();
  });
});

describe('rate limiter', () => {
  it('limit per key per window, then a fresh window', () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 3, windowMs: 1000, now: () => t });
    expect([rl.hit('a'), rl.hit('a'), rl.hit('a'), rl.hit('a')]).toEqual([true, true, true, false]);
    expect(rl.hit('b')).toBe(true);
    t = 999;
    expect(rl.hit('a')).toBe(false);
    t = 1000;
    expect(rl.hit('a')).toBe(true);
  });

  it('stays bounded', () => {
    let t = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 1000, now: () => t, maxKeys: 10 });
    for (let i = 0; i < 100; i++) { t = i; expect(rl.hit(`k${i}`)).toBe(true); }
  });
});

// ---- the rules, against a store that behaves like duel_cast_song_vote -------------------

interface Fake extends DuelStore {
  log: Array<{ questionId: string; a: string; b: string; winner: string; voter: string }>;
  guard: Set<string>;
  castCalls: number;
  state: { applied: boolean; editorial: Set<string>; ranking: StoredRank[] | null; dailyCap: number; question: SongQuestion | null };
}

const SONGS: DuelSong[] = Array.from({ length: 16 }, (_, i) => ({ id: id(300 + i), title: `Song ${i + 1}`, year: i % 2 ? 2020 : null, cover: null }));
const QUESTION: SongQuestion = { id: Q, groupSlug: 'bts', minVotes: 500 };

function fakeStore(): Fake {
  const store: Fake = {
    log: [],
    guard: new Set(),
    castCalls: 0,
    state: { applied: true, editorial: new Set(), ranking: null, dailyCap: 200, question: QUESTION },
    applied: async () => store.state.applied,
    group: async (slug) => (slug === 'bts' ? { id: 1, slug: 'bts', name: 'BTS', fandom: 'ARMY' } : null),
    question: async () => store.state.question,
    songs: async () => SONGS,
    votedToday: async (voter, questionId) => new Set([...store.guard].filter((k) => k.startsWith(`${voter}/${questionId}/`)).map((k) => k.split('/')[2] as string)),
    // same rules, same order as the SQL function
    cast: async (input): Promise<CastResult> => {
      store.castCalls += 1;
      const known = new Set(SONGS.map((s) => s.id));
      if (input.voter.length < 16) return { status: 'bad_voter', votesA: null, votesB: null };
      if (input.a === input.b || (input.winner !== input.a && input.winner !== input.b)) return { status: 'bad_pair', votesA: null, votesB: null };
      if (input.questionId !== Q) return { status: 'bad_question', votesA: null, votesB: null };
      if (!known.has(input.a) || !known.has(input.b)) return { status: 'bad_pair', votesA: null, votesB: null };
      const key = `${input.voter}/${input.questionId}/${pairKey(input.a, input.b)}`;
      let status: CastResult['status'] = 'ok';
      if ([...store.guard].filter((k) => k.startsWith(`${input.voter}/`)).length >= store.state.dailyCap) status = 'rate_limited';
      else if (store.guard.has(key)) status = 'already_voted';
      else { store.guard.add(key); store.log.push(input); }
      const same = store.log.filter((v) => pairKey(v.a, v.b) === pairKey(input.a, input.b));
      return { status, votesA: same.filter((v) => v.winner === input.a).length, votesB: same.filter((v) => v.winner === input.b).length };
    },
    ranking: async () => store.state.ranking,
    isEditorial: async (userId) => store.state.editorial.has(userId),
  };
  return store;
}

const FAN: Voter = { identity: `a:${id(700)}`, userId: null };
const OTHER_FAN: Voter = { identity: `a:${id(701)}`, userId: null };
const open = (): ReturnType<typeof createRateLimiter> => createRateLimiter({ limit: 1000, windowMs: 60_000 });

async function pairsFor(store: Fake, voter: Voter | null = FAN, seed = 1): Promise<Awaited<ReturnType<typeof issuePairs>>> {
  return issuePairs({ store, key: KEY, voter, groupSlug: 'bts', now: NOW, limiter: open(), rnd: seeded(seed) });
}

describe('issuing pairs', () => {
  it('5 signed pairs of songs for the voter, with the group and its fandom', async () => {
    const res = await pairsFor(fakeStore());
    expect(res.pairs).toHaveLength(5);
    expect(res.group).toEqual({ slug: 'bts', name: 'BTS', fandom: 'ARMY' });
    expect(res.ranked).toBe(false);
    for (const p of res.pairs) {
      expect(verifyPair(KEY, p.token, NOW)).toMatchObject({ q: Q, a: p.a.id, b: p.b.id, v: voterHash(KEY, FAN.identity) });
      expect(p.a.title).toMatch(/^Song /);
    }
  });

  it('nothing to show = no pair: no voter id, no key, store not live, unknown group, no song question, editorial account, burst', async () => {
    const store = fakeStore();
    expect((await pairsFor(store, null)).pairs).toEqual([]);
    expect((await issuePairs({ store, key: null, voter: FAN, groupSlug: 'bts', now: NOW, limiter: open() })).pairs).toEqual([]);
    expect((await issuePairs({ store, key: KEY, voter: FAN, groupSlug: 'nope', now: NOW, limiter: open() })).pairs).toEqual([]);
    store.state.applied = false;
    expect((await pairsFor(store)).pairs).toEqual([]);
    store.state.applied = true;
    store.state.question = null;
    expect((await pairsFor(store)).pairs).toEqual([]);
    store.state.question = QUESTION;
    store.state.editorial.add('team-user');
    expect((await pairsFor(store, { identity: 'u:team-user', userId: 'team-user' })).pairs).toEqual([]);
    const tight = createRateLimiter({ limit: 1, windowMs: 60_000 });
    expect((await issuePairs({ store, key: KEY, voter: FAN, groupSlug: 'bts', now: NOW, limiter: tight })).pairs).toHaveLength(5);
    expect((await issuePairs({ store, key: KEY, voter: FAN, groupSlug: 'bts', now: NOW, limiter: tight })).pairs).toEqual([]);
  });

  it('pairs already answered today are not issued again', async () => {
    const store = fakeStore();
    const first = await pairsFor(store);
    for (const p of first.pairs) await castVote({ store, key: KEY, voter: FAN, token: p.token, winner: 'a', now: NOW, limiter: open() });
    const second = await pairsFor(store, FAN, 1); // same seed: would give the same pairs
    const done = new Set(first.pairs.map((p) => pairKey(p.a.id, p.b.id)));
    expect(second.pairs).toHaveLength(5);
    for (const p of second.pairs) expect(done.has(pairKey(p.a.id, p.b.id))).toBe(false);
  });
});

describe('voting: anti-abuse', () => {
  it('a vote on an issued pair is stored once, with the voter hash only', async () => {
    const store = fakeStore();
    const [p] = (await pairsFor(store)).pairs;
    const out = await castVote({ store, key: KEY, voter: FAN, token: p?.token, winner: 'b', now: NOW, limiter: open() });
    expect(out).toEqual({ http: 200, body: { status: 'ok', split: null } });
    expect(store.log).toEqual([{ questionId: Q, a: p?.a.id, b: p?.b.id, winner: p?.b.id, voter: voterHash(KEY, FAN.identity) }]);
    expect(JSON.stringify(store.log)).not.toContain(id(700)); // the browser id is not stored
  });

  it('one vote per pair per voter per day: the second one is not stored', async () => {
    const store = fakeStore();
    const [p] = (await pairsFor(store)).pairs;
    await castVote({ store, key: KEY, voter: FAN, token: p?.token, winner: 'a', now: NOW, limiter: open() });
    const again = await castVote({ store, key: KEY, voter: FAN, token: p?.token, winner: 'b', now: NOW, limiter: open() });
    expect(again).toMatchObject({ http: 200, body: { status: 'already_voted' } });
    expect(store.log).toHaveLength(1);
    expect(store.log[0]?.winner).toBe(p?.a.id);
  });

  it('a pair the server did not issue is refused before the database is touched', async () => {
    const store = fakeStore();
    const v = voterHash(KEY, FAN.identity);
    const forged = [
      signPair(OTHER_KEY, { q: Q, a: SONGS[0]?.id as string, b: SONGS[1]?.id as string, v, exp: NOW + 1000 }),
      `${Buffer.from(JSON.stringify([Q, SONGS[0]?.id, SONGS[1]?.id, v, NOW + 1000])).toString('base64url')}.AAAA`,
      'not-a-token',
      undefined,
    ];
    for (const token of forged) {
      const out = await castVote({ store, key: KEY, voter: FAN, token, winner: 'a', now: NOW, limiter: open() });
      expect(out).toEqual({ http: 403, body: { error: 'bad_token' } });
    }
    expect(store.castCalls).toBe(0);
    expect(store.log).toEqual([]);
  });

  it("a pair issued to someone else, or expired, is refused", async () => {
    const store = fakeStore();
    const [p] = (await pairsFor(store, FAN)).pairs;
    expect(await castVote({ store, key: KEY, voter: OTHER_FAN, token: p?.token, winner: 'a', now: NOW, limiter: open() })).toEqual({ http: 403, body: { error: 'bad_token' } });
    expect(await castVote({ store, key: KEY, voter: FAN, token: p?.token, winner: 'a', now: NOW + TOKEN_TTL_MS + 1, limiter: open() })).toEqual({ http: 403, body: { error: 'bad_token' } });
    expect(store.castCalls).toBe(0);
  });

  it('the winner is one of the two sides, nothing else', async () => {
    const store = fakeStore();
    const [p] = (await pairsFor(store)).pairs;
    for (const winner of [SONGS[5]?.id, 'c', '', null, 0]) {
      expect(await castVote({ store, key: KEY, voter: FAN, token: p?.token, winner, now: NOW, limiter: open() })).toEqual({ http: 400, body: { error: 'bad_request' } });
    }
    expect(store.castCalls).toBe(0);
  });

  it('no voter id, no key, store not live: refused, nothing stored', async () => {
    const store = fakeStore();
    const [p] = (await pairsFor(store)).pairs;
    expect(await castVote({ store, key: KEY, voter: null, token: p?.token, winner: 'a', now: NOW, limiter: open() })).toEqual({ http: 400, body: { error: 'no_voter' } });
    expect(await castVote({ store, key: null, voter: FAN, token: p?.token, winner: 'a', now: NOW, limiter: open() })).toEqual({ http: 503, body: { error: 'not_live' } });
    store.state.applied = false;
    expect(await castVote({ store, key: KEY, voter: FAN, token: p?.token, winner: 'a', now: NOW, limiter: open() })).toEqual({ http: 503, body: { error: 'not_live' } });
    expect(store.log).toEqual([]);
  });

  it('burst limit per voter hash, then the daily cap of the database', async () => {
    const store = fakeStore();
    const limiter = createRateLimiter({ limit: 3, windowMs: 60_000, now: () => NOW });
    const { pairs } = await pairsFor(store);
    const codes: number[] = [];
    for (const p of pairs) codes.push((await castVote({ store, key: KEY, voter: FAN, token: p.token, winner: 'a', now: NOW, limiter })).http);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    expect(store.log).toHaveLength(3);
    // another voter is not slowed down by the first one
    const other = await pairsFor(store, OTHER_FAN, 5);
    expect((await castVote({ store, key: KEY, voter: OTHER_FAN, token: other.pairs[0]?.token, winner: 'a', now: NOW, limiter })).http).toBe(200);
    store.state.dailyCap = 1;
    expect(await castVote({ store, key: KEY, voter: OTHER_FAN, token: other.pairs[1]?.token, winner: 'a', now: NOW, limiter: open() })).toEqual({ http: 429, body: { error: 'rate_limited' } });
    expect(store.log).toHaveLength(4);
  });

  it('editorial accounts never vote', async () => {
    const store = fakeStore();
    const team: Voter = { identity: 'u:team-user', userId: 'team-user' };
    const [p] = (await pairsFor(store, team)).pairs;
    store.state.editorial.add('team-user');
    expect(await castVote({ store, key: KEY, voter: team, token: p?.token, winner: 'a', now: NOW, limiter: open() })).toEqual({ http: 403, body: { error: 'not_allowed' } });
    expect(store.castCalls).toBe(0);
  });

  it('the split is the real one and shows from 5 votes on the pair', async () => {
    const store = fakeStore();
    const a = SONGS[0]?.id as string;
    const b = SONGS[1]?.id as string;
    const results: Array<{ a: number; b: number; total: number } | null> = [];
    for (let i = 0; i < 6; i++) {
      const voter: Voter = { identity: `a:${id(800 + i)}`, userId: null };
      const token = signPair(KEY, { q: Q, a, b, v: voterHash(KEY, voter.identity), exp: NOW + 1000 });
      const out = await castVote({ store, key: KEY, voter, token, winner: i < 4 ? 'a' : 'b', now: NOW, limiter: open() });
      results.push(out.http === 200 ? out.body.split : null);
    }
    expect(results).toEqual([null, null, null, null, { a: 80, b: 20, total: 5 }, { a: 67, b: 33, total: 6 }]);
  });
});

describe('Fans picked API', () => {
  const stored = (n: number, questionVotes: number, questionVotesPrev: number): StoredRank[] => SONGS.slice(0, n).map((s, i) => ({
    entityId: s.id, rank: i + 1, prevRank: i === 0 ? null : i, movement: i === 0 ? null : -1, votes: 40 - i, questionVotes, questionVotesPrev, computedAt: '2026-10-02T03:00:00.000Z',
  }));

  it('ranked group: top 10, real votes, movement, new songs', async () => {
    const store = fakeStore();
    store.state.ranking = stored(14, 1160, 900);
    const res = await readFansPicked(store, 'bts');
    expect(res).toMatchObject({ ranked: true, votes: 1160, minVotes: 500, hasMovement: true, updatedAt: '2026-10-02T03:00:00.000Z', group: { slug: 'bts', name: 'BTS', fandom: 'ARMY' } });
    expect(res.songs).toHaveLength(10);
    expect(res.songs[0]).toEqual({ id: SONGS[0]?.id, title: 'Song 1', year: null, cover: null, rank: 1, votes: 40, movement: null, isNew: true });
    expect(res.songs[1]).toMatchObject({ title: 'Song 2', year: 2020, rank: 2, movement: -1, isNew: false });
    expect((await pairsFor(store)).ranked).toBe(true);
  });

  it('hidden under the threshold, before the first run, for an unknown group and while the store is not live', async () => {
    const store = fakeStore();
    store.state.ranking = stored(14, 499, 0);
    expect(await readFansPicked(store, 'bts')).toMatchObject({ ranked: false, songs: [], votes: 499, minVotes: 500 });
    store.state.ranking = [];
    expect(await readFansPicked(store, 'bts')).toMatchObject({ ranked: false, songs: [], votes: null });
    expect(await readFansPicked(store, 'nope')).toMatchObject({ ranked: false, songs: [], group: null, votes: null });
    store.state.applied = false;
    expect(await readFansPicked(store, 'bts')).toMatchObject({ ranked: false, songs: [], group: null });
  });

  it('no ranking a week ago: no movement flag, no "new" badge', async () => {
    const store = fakeStore();
    store.state.ranking = stored(12, 700, 120).map((r) => ({ ...r, prevRank: null, movement: null }));
    const res = await readFansPicked(store, 'bts');
    expect(res.hasMovement).toBe(false);
    expect(res.songs.every((s) => s.movement === null && !s.isNew)).toBe(true);
  });
});
