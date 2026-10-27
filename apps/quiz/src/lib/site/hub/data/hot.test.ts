import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_SITE_ID = 'hub'; });
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));

import {
  aggregatePlays, alternate, completionRate, composeHot, editorialOrder, firstAnimePlay, hotScore, isStartup, loadPlays, pickHot, quality, rankQuizzes, readHot,
} from './hot';
import { fakeDb, ORIGINS, quizRow } from './test-support';

import type { DayCount, HotInput, PlaysByQuiz } from './hot';
import type { Row } from './test-support';
import type { QuizRow } from './util';

const NOW = new Date('2026-10-25T12:00:00Z');
const q = (over: Partial<Row> & { id: string }): QuizRow => quizRow(over) as unknown as QuizRow;
const days = (entries: Array<[string, number] | [string, number, number | null]>): Map<string, DayCount> =>
  new Map(entries.map((e) => [e[0], { plays: e[1], started: e[2] ?? null }] as const));

describe('the score', () => {
  it('weighs each of the last 7 days by 0.85 to the power of its age, and ignores older plays', () => {
    const quiz = q({ id: 'a', created_at: '2026-09-01T00:00:00Z', play_count: 1000 });
    const d = days([['2026-10-25', 10], ['2026-10-24', 10], ['2026-10-19', 10], ['2026-10-18', 500], ['2026-10-26', 500]]);
    const { score, completion } = hotScore(quiz, d, NOW);
    expect(score).toBeCloseTo(10 + 10 * 0.85 + 10 * Math.pow(0.85, 6), 6);
    expect(completion).toBeNull();
  });

  it('counts a quiz published less than 72 hours ago 1.5 times', () => {
    const d = days([['2026-10-25', 10]]);
    const base = hotScore(q({ id: 'a', created_at: '2026-10-22T11:59:00Z' }), d, NOW).score;
    const young = hotScore(q({ id: 'b', created_at: '2026-10-22T12:01:00Z' }), d, NOW).score;
    expect(base).toBeCloseTo(10, 6);
    expect(young).toBeCloseTo(15, 6);
  });

  it('multiplies by the quality, clamped between 0.5 and 1.5', () => {
    expect(quality({ created_at: '', play_count: 0, like_count: 0 }, null)).toBe(1);
    expect(quality({ created_at: '', play_count: 100, like_count: 25 }, null)).toBeCloseTo(1.25, 6);
    expect(quality({ created_at: '', play_count: 100, like_count: 900 }, null)).toBe(1.5);
    expect(quality({ created_at: '', play_count: 100, like_count: 0 }, 0.2)).toBe(0.5);
    expect(quality({ created_at: '', play_count: 100, like_count: 0 }, 0.9)).toBeCloseTo(0.9, 6);
    const d = days([['2026-10-25', 10]]);
    const liked = hotScore(q({ id: 'a', created_at: '2026-01-01T00:00:00Z', play_count: 100, like_count: 25 }), d, NOW).score;
    expect(liked).toBeCloseTo(12.5, 6);
  });

  it('measures the completion rate only from started runs, and needs 20 of them', () => {
    expect(completionRate(undefined, NOW)).toBeNull();
    expect(completionRate(days([['2026-10-25', 10]]), NOW)).toBeNull();
    expect(completionRate(days([['2026-10-25', 5, 10]]), NOW)).toBeNull();
    expect(completionRate(days([['2026-10-25', 6, 20]]), NOW)).toBeCloseTo(0.3, 6);
    expect(completionRate(days([['2026-10-25', 30, 20]]), NOW)).toBe(1);
    // one day without a started count makes the window unknown
    expect(completionRate(days([['2026-10-25', 6, 30], ['2026-10-24', 6]]), NOW)).toBeNull();
  });
});

describe('the exclusions', () => {
  const plays: PlaysByQuiz = new Map([
    ['ok', days([['2026-10-25', 5]])],
    ['qotd', days([['2026-10-25', 500]])],
    ['reported', days([['2026-10-25', 500]])],
    ['flagged', days([['2026-10-25', 500]])],
    ['low', days([['2026-10-25', 8, 40]])],
  ]);
  const rows = [
    q({ id: 'ok' }), q({ id: 'qotd' }), q({ id: 'reported', report_count: 5 }), q({ id: 'flagged', status: 'flagged' }), q({ id: 'low' }),
  ];

  it('drops the quiz of the day, a reported or flagged quiz, and a quiz finished by under 40% of its players', () => {
    const out = rankQuizzes(rows, plays, NOW, new Set(['qotd']));
    expect(out.map((s) => s.quiz.id)).toEqual(['ok']);
  });

  it('keeps a quiz finished by exactly 40%', () => {
    const p: PlaysByQuiz = new Map([['x', days([['2026-10-25', 8, 20]])]]);
    expect(rankQuizzes([q({ id: 'x' })], p, NOW, new Set()).map((s) => s.quiz.id)).toEqual(['x']);
  });

  it('orders by score, then lifetime plays, then the newest, then the id', () => {
    const p: PlaysByQuiz = new Map([
      ['a', days([['2026-10-25', 3]])], ['b', days([['2026-10-25', 3]])], ['c', days([['2026-10-25', 3]])], ['d', days([['2026-10-25', 3]])], ['e', days([['2026-10-25', 9]])],
    ]);
    const out = rankQuizzes([
      q({ id: 'a', play_count: 10, created_at: '2026-01-01T00:00:00Z' }),
      q({ id: 'b', play_count: 20, created_at: '2026-01-01T00:00:00Z' }),
      q({ id: 'c', play_count: 20, created_at: '2026-02-01T00:00:00Z' }),
      q({ id: 'd', play_count: 20, created_at: '2026-02-01T00:00:00Z' }),
      q({ id: 'e', play_count: 1, created_at: '2026-01-01T00:00:00Z' }),
    ], p, NOW, new Set());
    expect(out.map((s) => s.quiz.id)).toEqual(['e', 'c', 'd', 'b', 'a']);
  });
});

describe('alternate', () => {
  it('alternates K-pop and anime from K-pop', () => {
    expect(alternate(['k1', 'k2', 'k3', 'k4'], ['a1', 'a2', 'a3', 'a4'])).toEqual(['k1', 'a1', 'k2', 'a2', 'k3', 'a3']);
  });
  it('gives the places of a site that runs out to the other', () => {
    expect(alternate(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], ['a1'])).toEqual(['k1', 'a1', 'k2', 'k3', 'k4', 'k5']);
    expect(alternate([], ['a1', 'a2'])).toEqual(['a1', 'a2']);
    expect(alternate([], [])).toEqual([]);
  });
});

describe('OtakuQuiz start-up rule', () => {
  it('lasts until the site has 7 days of data', () => {
    expect(isStartup(null, NOW)).toBe(true);
    expect(isStartup('2026-10-19T12:00:01Z', NOW)).toBe(true);
    expect(isStartup('2026-10-18T12:00:00Z', NOW)).toBe(false);
    expect(isStartup('2026-10-01T00:00:00Z', NOW)).toBe(false);
  });

  it('orders by series tier, then likes, then the newest', () => {
    const tiers = new Map([[1, 'A'], [2, 'B'], [3, 'C']]);
    const rows = [
      q({ id: 'c1', group_id: 3, like_count: 50 }),
      q({ id: 'none', group_id: 9, like_count: 99 }),
      q({ id: 'b1', group_id: 2, like_count: 1 }),
      q({ id: 'a-old', group_id: 1, like_count: 2, created_at: '2026-10-10T00:00:00Z' }),
      q({ id: 'a-new', group_id: 1, like_count: 2, created_at: '2026-10-20T00:00:00Z' }),
      q({ id: 'a-liked', group_id: 1, like_count: 7 }),
    ];
    expect(editorialOrder(rows, tiers).map((r) => r.id)).toEqual(['a-liked', 'a-new', 'a-old', 'b1', 'c1', 'none']);
  });
});

function input(over: Partial<HotInput>): HotInput {
  return { kpop: [], anime: [], plays: new Map(), tiers: new Map(), qotdIds: new Set(), animeFirstPlayAt: '2026-10-01T00:00:00Z', now: NOW, ...over };
}

describe('pickHot', () => {
  const kpop = [
    q({ id: 'k1', group_id: 1 }), q({ id: 'k2', group_id: 1 }), q({ id: 'k3', group_id: 1 }), q({ id: 'k4', group_id: 1 }),
    q({ id: 'k5', group_id: 2 }), q({ id: 'k6', group_id: 3 }), q({ id: 'k7', group_id: 4 }), q({ id: 'k8', group_id: 5 }),
  ];
  const plays: PlaysByQuiz = new Map(kpop.map((k, i) => [k.id, days([['2026-10-25', 100 - i * 5]])]));

  it('keeps at most 2 quizzes per group, six in all, best first', () => {
    const p = pickHot(input({ kpop, plays }));
    expect(p.kpop.map((r) => r.id)).toEqual(['k1', 'k2', 'k5', 'k6', 'k7', 'k8']);
    const perGroup = new Map<number, number>();
    for (const r of p.kpop) perGroup.set(r.group_id, (perGroup.get(r.group_id) ?? 0) + 1);
    expect(Math.max(...perGroup.values())).toBeLessThanOrEqual(2);
  });

  it('never shows the quiz of the day, even at the top', () => {
    const p = pickHot(input({ kpop, plays, qotdIds: new Set(['k1', 'k5']) }));
    expect(p.kpop.map((r) => r.id)).not.toContain('k1');
    expect(p.kpop.map((r) => r.id)).not.toContain('k5');
    expect(p.kpop.map((r) => r.id)).toEqual(['k2', 'k3', 'k6', 'k7', 'k8']);
  });

  it('completes a short list in lifetime plays order, without an invented score', () => {
    const rows = [q({ id: 'p', play_count: 5 }), q({ id: 'r', play_count: 900, group_id: 2 }), q({ id: 's', play_count: 50, group_id: 3 })];
    const p = pickHot(input({ kpop: rows, plays: new Map([['p', days([['2026-10-25', 4]])]]) }));
    expect(p.kpop.map((r) => r.id)).toEqual(['p', 'r', 's']);
  });

  it('gives OtakuQuiz its New quizzes in editorial order during its first week', () => {
    const anime = [
      q({ id: 'a1', site_id: 'anime', group_id: 10, created_at: '2026-10-24T00:00:00Z' }),
      q({ id: 'a2', site_id: 'anime', group_id: 10, created_at: '2026-10-24T01:00:00Z' }),
      q({ id: 'a3', site_id: 'anime', group_id: 10, created_at: '2026-10-24T02:00:00Z' }),
      q({ id: 'b1', site_id: 'anime', group_id: 11, created_at: '2026-10-24T03:00:00Z' }),
      q({ id: 'old', site_id: 'anime', group_id: 12, created_at: '2026-09-01T00:00:00Z' }),
      q({ id: 'c1', site_id: 'anime', group_id: 13, created_at: '2026-10-24T04:00:00Z' }),
    ];
    const tiers = new Map([[10, 'A'], [11, 'B'], [13, 'C'], [12, 'A']]);
    // plays say 'old' is the most played, but the start-up rule ignores plays and old quizzes
    const p = pickHot(input({ anime, tiers, animeFirstPlayAt: '2026-10-22T00:00:00Z', plays: new Map([['old', days([['2026-10-25', 999]])]]) }));
    expect(p.animeStartup).toBe(true);
    expect(p.anime.map((r) => r.id)).toEqual(['a3', 'a2', 'b1', 'c1']);
  });

  it('ranks OtakuQuiz by plays once it has 7 days of data, completed in editorial order', () => {
    const anime = [
      q({ id: 'a1', site_id: 'anime', group_id: 10, created_at: '2026-10-20T00:00:00Z' }),
      q({ id: 'a2', site_id: 'anime', group_id: 11, created_at: '2026-10-20T00:00:00Z' }),
      q({ id: 'a3', site_id: 'anime', group_id: 12, created_at: '2026-10-20T00:00:00Z' }),
    ];
    const tiers = new Map([[10, 'A'], [11, 'B'], [12, 'C']]);
    const p = pickHot(input({ anime, tiers, animeFirstPlayAt: '2026-10-10T00:00:00Z', plays: new Map([['a3', days([['2026-10-25', 5]])]]) }));
    expect(p.animeStartup).toBe(false);
    expect(p.anime.map((r) => r.id)).toEqual(['a3', 'a1', 'a2']);
  });

  it('mixes the sites in All and keeps one site per filter', () => {
    const anime = [1, 2, 3, 4].map((n) => q({ id: `a${n}`, site_id: 'anime', group_id: 20 + n, created_at: '2026-10-24T00:00:00Z' }));
    const hot = composeHot(pickHot(input({ kpop, plays, anime, animeFirstPlayAt: '2026-10-22T00:00:00Z' })), ORIGINS, NOW, 'plays-rows');
    expect(hot.all.map((c) => c.site)).toEqual(['kpop', 'anime', 'kpop', 'anime', 'kpop', 'anime']);
    expect(hot.all.map((c) => c.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(hot.kpop.every((c) => c.site === 'kpop')).toBe(true);
    expect(hot.anime.every((c) => c.site === 'anime')).toBe(true);
    expect(hot.kpop).toHaveLength(6);
    expect(hot.basis).toEqual({ plays: 'plays-rows', completionMeasured: false, animeStartup: true });
  });

  it('links every card to the canonical page on its own site', () => {
    const anime = [q({ id: 'a1', slug: 'frieren-basics', site_id: 'anime', group_id: 20, created_at: '2026-10-24T00:00:00Z' })];
    const hot = composeHot(pickHot(input({ kpop: [q({ id: 'k1', slug: 'bts-era' })], plays, anime, animeFirstPlayAt: null })), ORIGINS, NOW, 'plays-rows');
    expect(hot.all.map((c) => c.href)).toEqual(['https://kpop.example/q/bts-era', 'https://anime.example/q/frieren-basics']);
  });

  it('flags the completion rate as measured once started runs exist', () => {
    const p = pickHot(input({ kpop: [q({ id: 'k1' })], plays: new Map([['k1', days([['2026-10-25', 30, 40]])]]) }));
    expect(p.completionMeasured).toBe(true);
  });
});

describe('plays per day', () => {
  const playRows = (n: number, day: string, quiz = 'k1'): Row[] =>
    Array.from({ length: n }, (_, i) => ({ id: `${quiz}-${day}-${i}`, quiz_id: quiz, created_at: `${day}T10:00:00.000000+00:00` }));

  it('counts rows per quiz and UTC day', () => {
    const m = aggregatePlays([{ quiz_id: 'a', created_at: '2026-10-25T00:00:01+00:00' }, { quiz_id: 'a', created_at: '2026-10-25T23:59:59+00:00' }, { quiz_id: 'a', created_at: '2026-10-24T10:00:00+00:00' }]);
    expect(m.get('a')?.get('2026-10-25')?.plays).toBe(2);
    expect(m.get('a')?.get('2026-10-24')?.plays).toBe(1);
  });

  it('pages past the 1000 row cap when the daily table is absent', async () => {
    const db = fakeDb({ plays: [...playRows(1200, '2026-10-25'), ...playRows(700, '2026-10-22'), ...playRows(50, '2026-10-01')] });
    const { plays, source } = await loadPlays(db as never, NOW);
    expect(source).toBe('plays-rows');
    expect(plays.get('k1')?.get('2026-10-25')?.plays).toBe(1200);
    expect(plays.get('k1')?.get('2026-10-22')?.plays).toBe(700);
    expect(plays.get('k1')?.has('2026-10-01')).toBe(false);
  });

  it('reads the earlier days from the daily table when it reaches yesterday, and today from the plays rows', async () => {
    const db = fakeDb({
      quiz_daily_plays: [
        { quiz_id: 'k1', day: '2026-10-24', plays: 40, started: null },
        { quiz_id: 'k1', day: '2026-10-23', plays: 30, started: 60 },
        { quiz_id: 'k1', day: '2026-10-25', plays: 999, started: null },
      ],
      plays: [...playRows(3, '2026-10-25'), ...playRows(500, '2026-10-24')],
    });
    const { plays, source } = await loadPlays(db as never, NOW);
    expect(source).toBe('daily-table');
    expect(plays.get('k1')?.get('2026-10-24')?.plays).toBe(40);
    expect(plays.get('k1')?.get('2026-10-23')).toEqual({ plays: 30, started: 60 });
    // today comes from the plays rows, not from the table's partial row
    expect(plays.get('k1')?.get('2026-10-25')?.plays).toBe(3);
    // the plays query started at today's midnight, not at the window start
    const query = db.calls.filter((c) => c.table === 'plays').flatMap((c) => c.ops).find(([op]) => op === 'gte');
    expect(query?.[2]).toBe('2026-10-25T00:00:00Z');
  });

  it('ignores a stale daily table (nothing from yesterday)', async () => {
    const db = fakeDb({ quiz_daily_plays: [{ quiz_id: 'k1', day: '2026-10-20', plays: 40, started: null }], plays: playRows(2, '2026-10-24') });
    const { plays, source } = await loadPlays(db as never, NOW);
    expect(source).toBe('plays-rows');
    expect(plays.get('k1')?.has('2026-10-20')).toBe(false);
    expect(plays.get('k1')?.get('2026-10-24')?.plays).toBe(2);
  });

  it('finds the first play of an anime quiz', async () => {
    const db = fakeDb({
      plays: [
        { id: '1', quiz_id: 'k', created_at: '2026-10-01T00:00:00Z', quizzes: { site_id: 'kpop' } },
        { id: '2', quiz_id: 'a', created_at: '2026-10-22T00:00:00Z', quizzes: { site_id: 'anime' } },
        { id: '3', quiz_id: 'a', created_at: '2026-10-23T00:00:00Z', quizzes: { site_id: 'anime' } },
      ],
    });
    expect(await firstAnimePlay(db as never)).toBe('2026-10-22T00:00:00Z');
    expect(await firstAnimePlay(fakeDb({ plays: [] }) as never)).toBeNull();
  });
});

describe('readHot', () => {
  const fixtures = () => {
    const kpopQuizzes = Array.from({ length: 8 }, (_, i) => quizRow({ id: `k${i + 1}`, slug: `k-${i + 1}`, group_id: i < 4 ? 1 : i, play_count: 500 - i, groups: { name: `Group ${i < 4 ? 1 : i}`, slug: `group-${i < 4 ? 1 : i}` } }));
    const animeQuizzes = Array.from({ length: 5 }, (_, i) => quizRow({ id: `a${i + 1}`, slug: `a-${i + 1}`, site_id: 'anime', group_id: 100 + i, created_at: '2026-10-23T00:00:00Z', groups: { name: `Series ${i}`, slug: `series-${i}` } }));
    const plays = [
      ...Array.from({ length: 30 }, (_, i) => ({ id: `p-k1-${i}`, quiz_id: 'k1', created_at: '2026-10-25T08:00:00+00:00' })),
      ...Array.from({ length: 20 }, (_, i) => ({ id: `p-k2-${i}`, quiz_id: 'k2', created_at: '2026-10-25T08:00:00+00:00' })),
      ...Array.from({ length: 10 }, (_, i) => ({ id: `p-k3-${i}`, quiz_id: 'k3', created_at: '2026-10-25T08:00:00+00:00' })),
      ...Array.from({ length: 5 }, (_, i) => ({ id: `p-k5-${i}`, quiz_id: 'k5', created_at: '2026-10-24T08:00:00+00:00' })),
      { id: 'p-a1', quiz_id: 'a1', created_at: '2026-10-24T09:00:00+00:00', quizzes: { site_id: 'anime' } },
    ];
    return { quizzes: [...kpopQuizzes, ...animeQuizzes], plays, series: [{ group_id: 100, tier: 'A', published: true }, { group_id: 101, tier: 'B', published: true }] };
  };

  it('builds the three lists from the database rows', async () => {
    const db = fakeDb(fixtures());
    const hot = await readHot(ORIGINS, NOW, { db: db as never, qotdIds: async () => new Set(['k1']) });
    expect(hot).not.toBeNull();
    // k1 is the quiz of the day: out, though it has the most plays; k2, k3 and k4 (same group as k1, capped at 2) follow
    expect(hot!.kpop.map((c) => c.id).slice(0, 3)).toEqual(['k2', 'k3', 'k5']);
    expect(hot!.kpop.map((c) => c.id)).not.toContain('k1');
    expect(hot!.basis.plays).toBe('plays-rows');
    expect(hot!.basis.animeStartup).toBe(true);
    expect(hot!.anime.map((c) => c.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect(hot!.all.map((c) => c.site).slice(0, 4)).toEqual(['kpop', 'anime', 'kpop', 'anime']);
    // every query on a scoped table names its site (the hub build always filters)
    const scoped = db.calls.filter((c) => c.table === 'quizzes');
    expect(scoped.length).toBeGreaterThan(0);
    for (const c of scoped) expect(c.ops.some(([op, col]) => (op === 'eq' || op === 'in') && col === 'site_id')).toBe(true);
  });

  it('fails (the caller keeps the last good value) when the plays cannot be read', async () => {
    const db = fakeDb(fixtures(), { failing: { plays: 'connection reset' } });
    await expect(readHot(ORIGINS, NOW, { db: db as never, qotdIds: async () => new Set() })).rejects.toThrow('connection reset');
  });

  it('is empty (null) when no quiz exists', async () => {
    const db = fakeDb({ quizzes: [], plays: [], series: [] });
    expect(await readHot(ORIGINS, NOW, { db: db as never, qotdIds: async () => new Set() })).toBeNull();
  });
});
