import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_SITE_ID = 'hub'; });
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));

import { BRIDGE_PAIRS, MIN_COMMON } from './bridge-pairs';
import { COPLAY_MAX_PLAYS, coPlayRows, pickFirstStep, pickNext, readForYou, targetDifficulty, topCoPlay, topFandom } from './for-you';
import { fakeDb, ORIGINS, quizRow } from './test-support';

import type { PlayInfo } from './for-you';
import type { Row } from './test-support';
import type { QuizRow } from './util';

// Built from code points so this file holds neither dash.
const DASHES = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);
const NOW = new Date('2026-10-25T12:00:00Z');
const q = (over: Partial<Row> & { id: string }): QuizRow => quizRow(over) as unknown as QuizRow;

const play = (over: Partial<PlayInfo> & { quiz_id: string }): PlayInfo => ({
  score: 5, total_questions: 10, created_at: '2026-10-20T00:00:00Z', site: 'kpop', group_id: 1, difficulty: 'medium', ...over,
});

describe('the fandom', () => {
  it('is the group played the most, ties to the most recent play (newest first)', () => {
    const plays = [play({ quiz_id: 'a', group_id: 2 }), play({ quiz_id: 'b', group_id: 1 }), play({ quiz_id: 'c', group_id: 1 }), play({ quiz_id: 'd', group_id: 2 })];
    expect(topFandom(plays)).toEqual({ site: 'kpop', groupId: 2 });
    expect(topFandom([...plays, play({ quiz_id: 'e', group_id: 1 })])).toEqual({ site: 'kpop', groupId: 1 });
    expect(topFandom([play({ quiz_id: 'a', site: 'anime', group_id: 7 })])).toEqual({ site: 'anime', groupId: 7 });
    expect(topFandom([])).toBeNull();
  });

  it('keeps a group of each site apart', () => {
    const plays = [play({ quiz_id: 'a', group_id: 1, site: 'anime' }), play({ quiz_id: 'b', group_id: 1, site: 'kpop' }), play({ quiz_id: 'c', group_id: 1, site: 'kpop' })];
    expect(topFandom(plays)).toEqual({ site: 'kpop', groupId: 1 });
  });
});

describe('the difficulty adapts', () => {
  const run = (pcts: number[], difficulty = 'medium'): PlayInfo[] => pcts.map((p, i) => play({ quiz_id: `q${i}`, score: p, total_questions: 10, difficulty }));

  it('goes one step harder from 80% on average, one easier under 50%, else stays', () => {
    expect(targetDifficulty(run([8, 8, 8]))).toEqual({ target: 'hard', avgPct: 80 });
    expect(targetDifficulty(run([9, 10]))?.target).toBe('hard');
    expect(targetDifficulty(run([7, 8]))?.target).toBe('medium');
    expect(targetDifficulty(run([5, 5]))?.target).toBe('medium');
    expect(targetDifficulty(run([4, 5]))?.target).toBe('easy');
    expect(targetDifficulty(run([0, 0]))?.avgPct).toBe(0);
  });

  it('stays inside easy to hard', () => {
    expect(targetDifficulty(run([10], 'hard'))?.target).toBe('hard');
    expect(targetDifficulty(run([1], 'easy'))?.target).toBe('easy');
  });

  it('picks the unplayed quiz closest to the target, best quality among equals', () => {
    const rows = [
      q({ id: 'easy', difficulty: 'easy' }),
      q({ id: 'hard-low', difficulty: 'hard', play_count: 10, like_count: 0 }),
      q({ id: 'hard-best', difficulty: 'hard', play_count: 1000, like_count: 300 }),
      q({ id: 'medium', difficulty: 'medium' }),
    ];
    expect(pickNext(rows, 'hard', new Map())?.id).toBe('hard-best');
    expect(pickNext(rows.filter((r) => r.difficulty !== 'hard'), 'hard', new Map())?.id).toBe('medium');
    expect(pickNext(rows.filter((r) => r.id === 'easy'), 'hard', new Map())?.id).toBe('easy');
    expect(pickNext([], 'hard', new Map())).toBeNull();
  });

  it('starts a new fandom with its easiest quiz', () => {
    const rows = [q({ id: 'h', difficulty: 'hard' }), q({ id: 'e', difficulty: 'easy' }), q({ id: 'm', difficulty: 'medium' })];
    expect(pickFirstStep(rows, new Map())?.id).toBe('e');
  });
});

describe('the passport count', () => {
  it('needs 30 players in common, and ranks the groups by them', () => {
    expect(MIN_COMMON).toBe(30);
    const rows = [
      ...Array.from({ length: 30 }, (_, i) => ({ player_id: `p${i}`, group_id: 5 })),
      ...Array.from({ length: 29 }, (_, i) => ({ player_id: `p${i}`, group_id: 6 })),
      ...Array.from({ length: 40 }, (_, i) => ({ player_id: `p${i}`, group_id: 7 })),
      { player_id: 'p0', group_id: 5 },
    ];
    expect(topCoPlay(rows)).toEqual([{ groupId: 7, players: 40 }, { groupId: 5, players: 30 }]);
    expect(topCoPlay([])).toEqual([]);
  });
});

describe('coPlayRows', () => {
  it('reads the plays of a fandom with one query ending in limit 3000, newest first', async () => {
    const plays = Array.from({ length: 4500 }, (_, i) => ({ id: String(i), player_id: `p${i}`, created_at: new Date(Date.UTC(2026, 9, 1) + i * 1000).toISOString(), quizzes: { group_id: 1, site_id: 'kpop' } }));
    const db = fakeDb({ plays }, { pageCap: 100000 });
    const rows = await coPlayRows(db as never, 1, 'anime');
    expect(COPLAY_MAX_PLAYS).toBe(3000);
    const first = db.calls[0]!.ops;
    expect(first.some(([op]) => op === 'range')).toBe(false);
    expect(first.find(([op]) => op === 'limit')?.[1]).toBe(3000);
    expect(first.find(([op]) => op === 'order')?.[1]).toBe('created_at');
    // the first query is the only one that reads the group's plays: the next ones are by player
    expect(db.calls.filter((c) => c.ops.some(([op, col]) => op === 'eq' && col === 'quizzes.group_id'))).toHaveLength(1);
    expect(rows).toEqual([]);
  });
});

describe('the hand-picked pairs', () => {
  it('rest on a stated basis, name real slugs once, and use no dash', () => {
    expect(BRIDGE_PAIRS.length).toBeGreaterThan(0);
    for (const p of BRIDGE_PAIRS) {
      expect(p.basis.length).toBeGreaterThan(20);
      expect(`${p.kpop}${p.anime}${p.basis}`).not.toMatch(DASHES);
    }
    expect(new Set(BRIDGE_PAIRS.map((p) => `${p.kpop}/${p.anime}`)).size).toBe(BRIDGE_PAIRS.length);
  });
});

describe('the client of For you', () => {
  it('is the public one: plays are a public read', () => {
    const src = readFileSync(fileURLToPath(new URL('./for-you.ts', import.meta.url)), 'utf8');
    expect(src).not.toMatch(/createServiceRoleClient/);
    expect(src).toMatch(/createPublicReadClient\(\)/);
  });
});

describe('readForYou', () => {
  const tables = (extra: Record<string, Row[]> = {}): Record<string, Row[]> => ({
    quizzes: [
      quizRow({ id: 'k-played-1', slug: 'skz-basics', group_id: 1, difficulty: 'easy', groups: { name: 'Stray Kids', slug: 'stray-kids' } }),
      quizRow({ id: 'k-played-2', slug: 'skz-tf', group_id: 1, difficulty: 'medium', groups: { name: 'Stray Kids', slug: 'stray-kids' } }),
      quizRow({ id: 'k-next-medium', slug: 'skz-albums', group_id: 1, difficulty: 'medium', play_count: 500, like_count: 50, groups: { name: 'Stray Kids', slug: 'stray-kids' } }),
      quizRow({ id: 'k-next-hard', slug: 'skz-hard', group_id: 1, difficulty: 'hard', groups: { name: 'Stray Kids', slug: 'stray-kids' } }),
      quizRow({ id: 'k-other', slug: 'bts-quiz', group_id: 2, difficulty: 'easy', groups: { name: 'BTS', slug: 'bts' } }),
      quizRow({ id: 'a-tog-medium', slug: 'tower-medium', site_id: 'anime', group_id: 10, difficulty: 'medium', groups: { name: 'Tower of God', slug: 'tower-of-god' } }),
      quizRow({ id: 'a-tog-easy', slug: 'tower-easy', site_id: 'anime', group_id: 10, difficulty: 'easy', groups: { name: 'Tower of God', slug: 'tower-of-god' } }),
      quizRow({ id: 'a-op-easy', slug: 'one-piece-basics', site_id: 'anime', group_id: 11, difficulty: 'easy', groups: { name: 'One Piece', slug: 'one-piece' } }),
      quizRow({ id: 'a-played', slug: 'tower-played', site_id: 'anime', group_id: 10, difficulty: 'easy', groups: { name: 'Tower of God', slug: 'tower-of-god' } }),
    ],
    series: [{ group_id: 10, tier: 'A', published: true }, { group_id: 11, tier: 'B', published: true }],
    plays: [
      { id: '1', player_id: 'me', quiz_id: 'k-played-1', score: 9, total_questions: 10, created_at: '2026-10-24T00:00:00Z', quizzes: { site_id: 'kpop', group_id: 1, difficulty: 'easy' } },
      { id: '2', player_id: 'me', quiz_id: 'k-played-2', score: 9, total_questions: 10, created_at: '2026-10-23T00:00:00Z', quizzes: { site_id: 'kpop', group_id: 1, difficulty: 'medium' } },
      { id: '3', player_id: 'me', quiz_id: 'a-played', score: 4, total_questions: 10, created_at: '2026-10-01T00:00:00Z', quizzes: { site_id: 'anime', group_id: 10, difficulty: 'easy' } },
      { id: '4', player_id: 'other', quiz_id: 'k-other', score: 4, total_questions: 10, created_at: '2026-10-01T00:00:00Z', quizzes: { site_id: 'kpop', group_id: 2, difficulty: 'easy' } },
    ],
    ...extra,
  });
  const noCoPlay = async () => [];

  it('gives the next quiz of the fandom at the adapted difficulty and a bridge from the other site, never a played quiz', async () => {
    const out = await readForYou(ORIGINS, NOW, 'me', { db: fakeDb(tables()) as never, coPlay: noCoPlay });
    expect(out?.fandom).toEqual({ site: 'kpop', name: 'Stray Kids', slug: 'stray-kids' });
    const kinds = out!.cards.map((c) => c.kind);
    expect(kinds).toEqual(['next', 'bridge']);
    const next = out!.cards[0]!;
    // the last quiz was easy, the average is 90%: one step harder than the last quiz played there
    expect(next.card.id).toBe('k-next-medium');
    expect(next.card.href).toBe('https://kpop.example/q/skz-albums');
    expect(next.eyebrow).toBe('Next for a Stray Kids fan');
    expect(next.meta).toBe('Medium · you averaged 90% on Stray Kids');
    const bridge = out!.cards[1]!;
    expect(bridge.card.site).toBe('anime');
    expect(bridge.card.href.startsWith('https://anime.example/q/')).toBe(true);
    // the hand-picked pair Stray Kids and Tower of God: its easiest unplayed quiz (a-played is played, so a-tog-easy)
    expect(bridge.via).toBe('editorial');
    expect(bridge.card.id).toBe('a-tog-easy');
    expect(bridge.eyebrow).toBe('Stray Kids fans also play');
    const played = new Set(['k-played-1', 'k-played-2', 'a-played']);
    expect(out!.cards.some((c) => played.has(c.card.id))).toBe(false);
  });

  it('has no Continue card: the run in progress lives in the browser of each site', async () => {
    const out = await readForYou(ORIGINS, NOW, 'me', { db: fakeDb(tables()) as never, coPlay: noCoPlay });
    expect(out!.cards.some((c) => c.kind === 'continue')).toBe(false);
  });

  it('puts the passport count first once 30 players play both', async () => {
    const out = await readForYou(ORIGINS, NOW, 'me', { db: fakeDb(tables()) as never, coPlay: async () => [{ groupId: 11, players: 31 }] });
    const bridge = out!.cards.find((c) => c.kind === 'bridge')!;
    expect(bridge.via).toBe('passport');
    expect(bridge.card.id).toBe('a-op-easy');
  });

  it('falls back to the best easy quiz of the other site when no pair fits', async () => {
    const t = tables();
    t.quizzes = t.quizzes!.filter((r) => (r.groups as { slug: string }).slug !== 'tower-of-god');
    const out = await readForYou(ORIGINS, NOW, 'me', { db: fakeDb(t) as never, coPlay: noCoPlay });
    const bridge = out!.cards.find((c) => c.kind === 'bridge')!;
    expect(bridge.via).toBe('start-easy');
    expect(bridge.card.id).toBe('a-op-easy');
    expect(bridge.eyebrow).toBe('Try OtakuQuiz');
  });

  it('works the other way round: an anime fan gets a K-pop bridge', async () => {
    const t = tables();
    t.plays = [1, 2, 3].map((n) => ({ id: `t${n}`, player_id: 'me', quiz_id: n === 1 ? 'a-played' : `x${n}`, score: 5, total_questions: 10, created_at: `2026-10-2${n}T00:00:00Z`, quizzes: { site_id: 'anime', group_id: 10, difficulty: 'easy' } }));
    const out = await readForYou(ORIGINS, NOW, 'me', { db: fakeDb(t) as never, coPlay: noCoPlay });
    expect(out?.fandom.site).toBe('anime');
    const bridge = out!.cards.find((c) => c.kind === 'bridge')!;
    expect(bridge.card.site).toBe('kpop');
    expect(bridge.card.href.startsWith('https://kpop.example/q/')).toBe(true);
    // Tower of God pairs with Stray Kids
    expect(bridge.via).toBe('editorial');
    expect(bridge.card.groupSlug).toBe('stray-kids');
  });

  it('is null for a fan with no play, and fails on a database error', async () => {
    expect(await readForYou(ORIGINS, NOW, 'nobody', { db: fakeDb(tables()) as never, coPlay: noCoPlay })).toBeNull();
    await expect(readForYou(ORIGINS, NOW, 'me', { db: fakeDb(tables(), { failing: { plays: 'down' } }) as never, coPlay: noCoPlay })).rejects.toThrow('down');
  });

  it('survives a failing passport count', async () => {
    const out = await readForYou(ORIGINS, NOW, 'me', { db: fakeDb(tables()) as never, coPlay: async () => { throw new Error('slow'); } });
    expect(out?.cards.some((c) => c.kind === 'bridge')).toBe(true);
  });
});
