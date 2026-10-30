import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_SITE_ID = 'hub'; });
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizOfTheDay: async () => null }));

import { DYK_NO_REPEAT_DAYS, factOfDay, readDidYouKnow, sourceName, subjectOf, usablePool } from './did-you-know';
import { candidatesOf, pickQuestion, readSixtySeconds, siteOfDay, toCandidate } from './sixty-seconds';
import { fakeDb, ORIGINS } from './test-support';

import type { HubHot, HubHotCard } from './types';
import type { TriviaRow } from './did-you-know';
import type { SixtyQuizRow } from './sixty-seconds';

const day = (iso: string): Date => new Date(`${iso}T12:00:00Z`);

const question = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  question: 'ITZY borrowed the Cheshire Cat from which story?',
  options: ['Puss in Boots', 'The Jungle Book', 'Alice in Wonderland', 'The Wizard of Oz'],
  correct: 2,
  fun_fact: 'ITZY said they borrowed the Cheshire Cat from Alice in Wonderland.',
  ...over,
});

const quiz = (over: Partial<SixtyQuizRow> & { id: string }): SixtyQuizRow & Record<string, unknown> => ({
  status: 'published', slug: `slug-${over.id}`, title: `Title ${over.id}`, site_id: 'kpop', quiz_type: 'multiple_choice', difficulty: 'easy', spoiler_arc_ord: null, questions: [question()], ...over,
});

describe('the 60 second question', () => {
  it('alternates the sites by UTC day, K-pop first on even days', () => {
    const a = siteOfDay(day('2026-10-24'));
    const b = siteOfDay(day('2026-10-25'));
    expect(a).not.toBe(b);
    expect(siteOfDay(day('2026-10-26'))).toBe(a);
    expect(siteOfDay(new Date('1970-01-01T00:00:00Z'))).toBe('kpop');
  });

  it('takes a question of four distinct options and a valid answer', () => {
    const base = quiz({ id: 'a' });
    expect(toCandidate(base, question(), 0)?.correct).toBe(2);
    expect(toCandidate(base, question({ options: ['a', 'b', 'c'] }), 0)).toBeNull();
    expect(toCandidate(base, question({ options: ['a', 'a', 'b', 'c'] }), 0)).toBeNull();
    expect(toCandidate(base, question({ options: ['a', 'b', 'c', ''] }), 0)).toBeNull();
    expect(toCandidate(base, question({ correct: 4 }), 0)).toBeNull();
    expect(toCandidate(base, question({ correct: '2' }), 0)).toBeNull();
    expect(toCandidate(base, question({ question: '  ' }), 0)).toBeNull();
  });

  it('never takes a question marked spoiler, nor a quiz whose level is above zero', () => {
    expect(toCandidate(quiz({ id: 'a' }), question({ spoiler: { arc: 3, scope: 'anime' } }), 0)).toBeNull();
    expect(toCandidate(quiz({ id: 'a' }), question({ spoiler: { arc: 0, scope: 'anime' } }), 0)).not.toBeNull();
    expect(candidatesOf([quiz({ id: 'a', spoiler_arc_ord: 2 })], new Set())).toEqual([]);
    expect(candidatesOf([quiz({ id: 'a', spoiler_arc_ord: 0 })], new Set())).toHaveLength(1);
  });

  it('never takes a question of a quiz of the day, a hard quiz or another format', () => {
    const rows = [quiz({ id: 'qotd' }), quiz({ id: 'hard', difficulty: 'hard' }), quiz({ id: 'tf', quiz_type: 'true_false' }), quiz({ id: 'ok', difficulty: 'medium' })];
    expect(candidatesOf(rows, new Set(['qotd'])).map((c) => c.quizId)).toEqual(['ok']);
  });

  it('prefers a question with an anecdote and picks the same one all day, another the next', () => {
    const rows = [quiz({ id: 'a', questions: [question({ fun_fact: undefined }), question({ question: 'With anecdote one?' }), question({ question: 'With anecdote two?' })] })];
    const cands = candidatesOf(rows, new Set());
    expect(cands).toHaveLength(3);
    const d1 = pickQuestion(cands, 'kpop', day('2026-10-24'));
    expect(d1?.explanation).not.toBeNull();
    expect(pickQuestion(cands, 'kpop', new Date('2026-10-24T03:00:00Z'))).toEqual(d1);
    const seen = new Set(['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29'].map((d) => pickQuestion(cands, 'kpop', day(d))?.question));
    expect(seen.size).toBe(2);
    expect(pickQuestion([], 'kpop', day('2026-10-24'))).toBeNull();
    // with no anecdote anywhere the question is still given, without one
    const bare = candidatesOf([quiz({ id: 'b', questions: [question({ fun_fact: undefined })] })], new Set());
    expect(pickQuestion(bare, 'kpop', day('2026-10-24'))?.explanation).toBeNull();
  });

  const hotCard = (id: string, site: 'kpop' | 'anime'): HubHotCard => ({ id, site, rank: 1 } as unknown as HubHotCard);
  const hot = (kpop: string[], anime: string[]): HubHot => ({ all: [], kpop: kpop.map((i) => hotCard(i, 'kpop')), anime: anime.map((i) => hotCard(i, 'anime')), basis: { plays: 'plays-rows', completionMeasured: false, animeStartup: false } });

  it('gives a question of the Top of the site of the day, with the answer, the anecdote, the link to the full quiz and no XP', async () => {
    const db = fakeDb({
      quizzes: [
        quiz({ id: 'k1', slug: 'k-songs-about-magic', title: 'K-pop Songs About Magic' }),
        quiz({ id: 'a1', slug: 'frieren-basics', title: 'Frieren Basics', site_id: 'anime', questions: [question({ question: 'Who is the mage?' })] }),
      ],
    });
    const deps = { db: db as never, hot: async () => hot(['k1'], ['a1']), qotdIds: async () => new Set<string>() };
    const even = await readSixtySeconds(ORIGINS, new Date('2026-10-24T12:00:00Z'), deps);
    const odd = await readSixtySeconds(ORIGINS, new Date('2026-10-25T12:00:00Z'), deps);
    const [kpopDay, animeDay] = siteOfDay(new Date('2026-10-24T12:00:00Z')) === 'kpop' ? [even, odd] : [odd, even];
    expect(kpopDay).toMatchObject({ site: 'kpop', quizTitle: 'K-pop Songs About Magic', quizHref: 'https://kpop.example/q/k-songs-about-magic', correct: 2, awardsXp: false });
    expect(kpopDay?.explanation).toContain('Alice in Wonderland');
    expect(kpopDay?.options).toHaveLength(4);
    expect(animeDay).toMatchObject({ site: 'anime', quizHref: 'https://anime.example/q/frieren-basics', question: 'Who is the mage?' });
    // the read asks for published quizzes of that site only, by id
    const q = db.calls.filter((c) => c.table === 'quizzes').flatMap((c) => c.ops);
    expect(q.some(([op, col, v]) => op === 'eq' && col === 'status' && v === 'published')).toBe(true);
  });

  it('falls to the other site when the site of the day has no usable question, and is null without any', async () => {
    const db = fakeDb({ quizzes: [quiz({ id: 'k1' }), quiz({ id: 'a1', site_id: 'anime', difficulty: 'hard' })] });
    const deps = { db: db as never, hot: async () => hot(['k1'], ['a1']), qotdIds: async () => new Set<string>() };
    for (const d of ['2026-10-24', '2026-10-25']) expect((await readSixtySeconds(ORIGINS, new Date(`${d}T12:00:00Z`), deps))?.site).toBe('kpop');
    const none = await readSixtySeconds(ORIGINS, day('2026-10-24'), { ...deps, qotdIds: async () => new Set(['k1']) });
    expect(none).toBeNull();
    expect(await readSixtySeconds(ORIGINS, day('2026-10-24'), { ...deps, hot: async () => null })).toBeNull();
  });
});

const fact = (n: number, over: Partial<TriviaRow> = {}): TriviaRow => ({
  id: `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`,
  fact: `In the year ${1900 + n} the long running series number ${n} aired its first season on television.`,
  category: n % 2 === 0 ? 'fun' : 'history',
  entity_kind: 'series',
  source: 'wikipedia',
  source_url: `https://en.wikipedia.org/wiki/Series_${n}`,
  ...over,
});

describe('Did you know', () => {
  it('keeps sourced fun and history facts that pass the quality filter, once each', () => {
    const rows = [
      fact(1),
      fact(2, { category: 'members' }),
      fact(3, { source: '  ' }),
      fact(4, { source: null }),
      fact(5, { fact: 'idk lol' }),
      fact(6, { fact: fact(1).fact }),
      fact(7, { entity_kind: 'character' }),
      fact(8, { entity_kind: 'arc' }),
      fact(9, { entity_kind: 'episode' }),
      fact(10, { entity_kind: 'theme' }),
    ];
    const anime = usablePool('anime', rows).map((r) => r.id);
    expect(anime).toHaveLength(2);
    expect(anime).toContain(fact(1).id);
    expect(anime).toContain(fact(10).id);
    // the spoiler kinds are an anime rule: a K-pop idol fact stays
    const kpop = usablePool('kpop', [fact(7, { entity_kind: 'idol' })]);
    expect(kpop).toHaveLength(1);
  });

  it('shows no fact twice within 60 days when the pool has 60 facts or more', () => {
    const pool = usablePool('anime', Array.from({ length: 75 }, (_, i) => fact(i + 1)));
    expect(pool).toHaveLength(75);
    const start = new Date('2026-10-25T12:00:00Z').getTime();
    for (let offset = 0; offset < 40; offset += 1) {
      const ids = new Set<string>();
      for (let d = 0; d < DYK_NO_REPEAT_DAYS; d += 1) ids.add(factOfDay(pool, new Date(start + (offset + d) * 86_400_000))!.id);
      expect(ids.size).toBe(DYK_NO_REPEAT_DAYS);
    }
  });

  it('repeats only when the pool is smaller than the window, and stays on one fact all day', () => {
    const pool = usablePool('kpop', Array.from({ length: 3 }, (_, i) => fact(i + 1)));
    const a = factOfDay(pool, new Date('2026-10-25T00:00:01Z'));
    expect(factOfDay(pool, new Date('2026-10-25T23:59:59Z'))).toEqual(a);
    expect(factOfDay(pool, new Date('2026-10-26T12:00:00Z'))).not.toEqual(a);
    expect(factOfDay(pool, new Date('2026-10-28T12:00:00Z'))).toEqual(a);
    expect(factOfDay([], new Date())).toBeNull();
  });

  it('reads both sites, names the source, and links the trivia page of each site', async () => {
    const db = fakeDb({
      trivia: [
        ...Array.from({ length: 5 }, (_, i) => ({ ...fact(i + 1), status: 'published', site_id: 'anime' })),
        { ...fact(100, { source: 'MusicBrainz', source_url: null }), status: 'published', site_id: 'kpop' },
        { ...fact(101), status: 'draft', site_id: 'kpop' },
        { ...fact(102), status: 'published', site_id: 'anime', category: 'achievements' },
      ],
    });
    const out = await readDidYouKnow(ORIGINS, day('2026-10-25'), db as never);
    expect(out?.kpop).toMatchObject({ source: 'MusicBrainz', sourceUrl: null, moreHref: 'https://kpop.example/trivia' });
    expect(out?.anime?.source).toBe('Wikipedia');
    expect(out?.anime?.sourceUrl).toMatch(/^https:\/\/en\.wikipedia\.org\//);
    expect(out?.anime?.moreHref).toBe('https://anime.example/trivia');
    expect(out?.pool).toEqual({ kpop: 1, anime: 5 });
    expect(sourceName('wikipedia')).toBe('Wikipedia');
    expect(sourceName('Billboard')).toBe('Billboard');
  });

  it('names the subject of each fact, the group or series of its row (embedded), and asks for it in the select (home v3 review)', async () => {
    const db = fakeDb({
      trivia: [
        { ...fact(1), status: 'published', site_id: 'anime', groups: { name: "Frieren: Beyond Journey's End" } },
        { ...fact(100), status: 'published', site_id: 'kpop', groups: [{ name: ' ZEROBASEONE ' }] },
      ],
    });
    const out = await readDidYouKnow(ORIGINS, day('2026-10-25'), db as never);
    expect(out?.anime?.subject).toBe("Frieren: Beyond Journey's End");
    expect(out?.kpop?.subject).toBe('ZEROBASEONE');
    for (const call of db.calls.filter((c) => c.table === 'trivia')) expect(call.ops[0]).toEqual(['select', 'id, fact, category, entity_kind, source, source_url, groups(name)']);
    // a row with no group, or a group with no name, has no subject
    expect(subjectOf({ groups: null })).toBeNull();
    expect(subjectOf({})).toBeNull();
    expect(subjectOf({ groups: { name: '  ' } })).toBeNull();
    expect(subjectOf({ groups: [] })).toBeNull();
  });

  it('gives a site with no usable fact null, and nothing when neither has one', async () => {
    const one = await readDidYouKnow(ORIGINS, day('2026-10-25'), fakeDb({ trivia: [{ ...fact(1), status: 'published', site_id: 'anime' }] }) as never);
    expect(one?.kpop).toBeNull();
    expect(one?.anime).not.toBeNull();
    expect(await readDidYouKnow(ORIGINS, day('2026-10-25'), fakeDb({ trivia: [] }) as never)).toBeNull();
    await expect(readDidYouKnow(ORIGINS, day('2026-10-25'), fakeDb({ trivia: [] }, { failing: { trivia: 'down' } }) as never)).rejects.toThrow('down');
  });
});
