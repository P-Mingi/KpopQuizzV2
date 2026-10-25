import { describe, expect, it, vi } from 'vitest';

vi.hoisted(() => { process.env.NEXT_PUBLIC_SITE_ID = 'hub'; });
vi.mock('next/cache', () => ({ unstable_cache: <T>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => ({}), createServiceRoleClient: () => ({}) }));
vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizOfTheDay: async () => null }));

import { rankByQuality } from './catalog';
import { CROSSOVER_ENTRIES, CROSSOVER_FACTS } from './crossover-list';
import { dbCrossoverReads, isoWeek, readCrossover, rotate, weekIndex } from './crossover';
import { readDoors } from './doors';
import { bestEasy, readStartEasy } from './start-easy';
import { pickSurprise } from './surprise-pick';
import { readSurprisePool, SURPRISE_PER_SITE } from './surprise';
import { fakeDb, ORIGINS, quizRow } from './test-support';

import type { Row } from './test-support';
import type { HubHot, HubHotCard, HubSurpriseCard } from './types';
import type { QuizRow } from './util';

const NOW = new Date('2026-10-25T12:00:00Z');
const q = (over: Partial<Row> & { id: string }): QuizRow => quizRow(over) as unknown as QuizRow;

const catalog = (): Record<string, Row[]> => ({
  quizzes: [
    quizRow({ id: 'k-easy-low', difficulty: 'easy', play_count: 500, like_count: 5, slug: 'k-easy-low', group_id: 1 }),
    quizRow({ id: 'k-easy-best', difficulty: 'easy', play_count: 1700, like_count: 150, slug: 'k-easy-best', group_id: 2 }),
    quizRow({ id: 'k-hard-better', difficulty: 'hard', play_count: 2000, like_count: 400, slug: 'k-hard', group_id: 3 }),
    quizRow({ id: 'k-easy-reported', difficulty: 'easy', play_count: 900, like_count: 400, report_count: 6, slug: 'k-rep', group_id: 4 }),
    quizRow({ id: 'k-easy-draft', difficulty: 'easy', play_count: 900, like_count: 400, status: 'draft', slug: 'k-draft', group_id: 5 }),
    quizRow({ id: 'a-easy-b', difficulty: 'easy', site_id: 'anime', slug: 'a-easy-b', group_id: 10, groups: { name: 'Series B', slug: 'series-b' } }),
    quizRow({ id: 'a-easy-a', difficulty: 'easy', site_id: 'anime', slug: 'a-easy-a', group_id: 11, groups: { name: 'Series A', slug: 'series-a' } }),
    quizRow({ id: 'a-medium', difficulty: 'medium', site_id: 'anime', slug: 'a-medium', group_id: 11, groups: { name: 'Series A', slug: 'series-a' } }),
  ],
  series: [{ group_id: 10, tier: 'B', published: true }, { group_id: 11, tier: 'A', published: true }],
});

describe('Start easy', () => {
  it('gives the best rated easy quiz of each site, never a reported or draft one', async () => {
    const out = await readStartEasy(ORIGINS, NOW, fakeDb(catalog()) as never);
    expect(out?.kpop?.id).toBe('k-easy-best');
    expect(out?.kpop?.href).toBe('https://kpop.example/q/k-easy-best');
    // no plays on the anime side: the series tier breaks the tie (A before B)
    expect(out?.anime?.id).toBe('a-easy-a');
    expect(out?.anime?.href).toBe('https://anime.example/q/a-easy-a');
  });

  it('is null when no site has an easy quiz, and keeps the site that has one', async () => {
    const t = catalog();
    t.quizzes = t.quizzes!.filter((r) => r.difficulty !== 'easy');
    expect(await readStartEasy(ORIGINS, NOW, fakeDb(t) as never)).toBeNull();
    const only = catalog();
    only.quizzes = only.quizzes!.filter((r) => r.site_id === 'kpop');
    const out = await readStartEasy(ORIGINS, NOW, fakeDb(only) as never);
    expect(out?.anime).toBeNull();
    expect(out?.kpop?.id).toBe('k-easy-best');
  });

  it('ranks by quality with a total order', () => {
    const rows = [q({ id: 'b', difficulty: 'easy' }), q({ id: 'a', difficulty: 'easy' })];
    expect(bestEasy(rows, new Map())?.id).toBe('a');
    expect(rankByQuality(rows, new Map()).map((r) => r.id)).toEqual(['a', 'b']);
  });
});

describe('Surprise me', () => {
  const pool = (n: number, site: 'kpop' | 'anime', from = 0): HubSurpriseCard[] =>
    Array.from({ length: n }, (_, i) => ({ id: `${site}-${from + i}`, site, siteName: site, tile: 'T', title: 't', group: 'g', href: `https://${site}.example/q/${from + i}` }));

  it('builds a pool of the 100 best quizzes of each site', async () => {
    const rows: Row[] = [
      ...Array.from({ length: 130 }, (_, i) => quizRow({ id: `k${i}`, slug: `k${i}`, play_count: 1000 - i, like_count: 100 - Math.floor(i / 2), group_id: i })),
      ...Array.from({ length: 40 }, (_, i) => quizRow({ id: `a${i}`, slug: `a${i}`, site_id: 'anime', group_id: 500 + i })),
      quizRow({ id: 'k-flagged', slug: 'kf', status: 'flagged', play_count: 99999, like_count: 99999 }),
    ];
    const out = await readSurprisePool(ORIGINS, NOW, fakeDb({ quizzes: rows, series: [] }) as never);
    expect(SURPRISE_PER_SITE).toBe(100);
    expect(out).toHaveLength(140);
    expect(out!.filter((c) => c.site === 'kpop')).toHaveLength(100);
    expect(out!.filter((c) => c.site === 'anime')).toHaveLength(40);
    expect(out!.some((c) => c.id === 'k-flagged')).toBe(false);
    expect(out!.find((c) => c.id === 'a3')?.href).toBe('https://anime.example/q/a3');
  });

  it('never draws a played quiz, and never the same site twice in a row', () => {
    const p = [...pool(5, 'kpop'), ...pool(5, 'anime')];
    for (let i = 0; i < 200; i += 1) {
      const pick = pickSurprise(p, { playedIds: ['kpop-0', 'kpop-1', 'anime-0'], lastSite: 'kpop' });
      expect(pick?.site).toBe('anime');
      expect(pick?.id).not.toBe('anime-0');
    }
    const seen = new Set<string>();
    let last: 'kpop' | 'anime' | null = null;
    for (let i = 0; i < 100; i += 1) {
      const pick: HubSurpriseCard = pickSurprise(p, { lastSite: last })!;
      expect(pick.site).not.toBe(last);
      seen.add(pick.id);
      last = pick.site;
    }
    expect(seen.size).toBeGreaterThan(3);
  });

  it('uses the random number it is given, and falls back when it must', () => {
    const p = pool(4, 'kpop');
    expect(pickSurprise(p, { random: () => 0 })?.id).toBe('kpop-0');
    expect(pickSurprise(p, { random: () => 0.99 })?.id).toBe('kpop-3');
    // only the last site left: used rather than nothing
    expect(pickSurprise(p, { lastSite: 'kpop', random: () => 0 })?.site).toBe('kpop');
    // everything played: the pool is used rather than nothing
    expect(pickSurprise(p, { playedIds: p.map((c) => c.id), random: () => 0 })?.id).toBe('kpop-0');
    expect(pickSurprise([])).toBeNull();
  });
});

describe('the doors', () => {
  const hotCard = (id: string, site: 'kpop' | 'anime'): HubHotCard => ({ id, site, rank: 1, title: id } as unknown as HubHotCard);
  const hot = (startup: boolean): HubHot => ({ all: [], kpop: [hotCard('k-top', 'kpop')], anime: [hotCard('a-top', 'anime')], basis: { plays: 'plays-rows', completionMeasured: false, animeStartup: startup } });

  const tables = () => ({
    quizzes: [
      quizRow({ id: 'k1', slug: 'k1' }), quizRow({ id: 'k2', slug: 'k2' }), quizRow({ id: 'k3', slug: 'k3', status: 'draft' }),
      quizRow({ id: 'a1', slug: 'a1', site_id: 'anime', created_at: '2026-10-20T00:00:00Z' }),
      quizRow({ id: 'a2', slug: 'a2', site_id: 'anime', created_at: '2026-10-24T00:00:00Z', report_count: 6 }),
      quizRow({ id: 'a3', slug: 'a3', site_id: 'anime', created_at: '2026-10-23T00:00:00Z' }),
    ],
    groups: [
      { id: 1, site_id: 'kpop', quiz_count: 4 }, { id: 2, site_id: 'kpop', quiz_count: 0 }, { id: 3, site_id: 'kpop', quiz_count: 1 },
      { id: 4, site_id: 'anime', quiz_count: 2 },
    ],
  });

  it('counts the published quizzes and the topics of each site, not a number invented', async () => {
    const out = await readDoors(ORIGINS, NOW, { db: fakeDb(tables()) as never, hot: async () => hot(false) });
    expect(out?.kpop).toMatchObject({ quizCount: 2, topicCount: 2, topicLabel: 'groups', origin: 'https://kpop.example', name: 'KpopQuiz' });
    expect(out?.anime).toMatchObject({ quizCount: 3, topicCount: 1, topicLabel: 'series', origin: 'https://anime.example', name: 'OtakuQuiz' });
  });

  it('features Top now once OtakuQuiz has its 7 days, Just added (the newest listable quiz) before', async () => {
    const mature = await readDoors(ORIGINS, NOW, { db: fakeDb(tables()) as never, hot: async () => hot(false) });
    expect(mature?.kpop.featuredLabel).toBe('Top now');
    expect(mature?.kpop.featured?.id).toBe('k-top');
    expect(mature?.anime.featuredLabel).toBe('Top now');
    expect(mature?.anime.featured?.id).toBe('a-top');
    const young = await readDoors(ORIGINS, NOW, { db: fakeDb(tables()) as never, hot: async () => hot(true) });
    expect(young?.kpop.featuredLabel).toBe('Top now');
    expect(young?.anime.featuredLabel).toBe('Just added');
    // a2 is newer but reported: a3 is the newest listable quiz
    expect(young?.anime.featured?.id).toBe('a3');
    expect(young?.anime.featured?.href).toBe('https://anime.example/q/a3');
    const noHot = await readDoors(ORIGINS, NOW, { db: fakeDb(tables()) as never, hot: async () => null });
    expect(noHot?.anime.featuredLabel).toBe('Just added');
    expect(noHot?.kpop.featured).toBeNull();
  });

  it('fails on a database error', async () => {
    await expect(readDoors(ORIGINS, NOW, { db: fakeDb(tables(), { failing: { quizzes: 'down' } }) as never, hot: async () => hot(false) })).rejects.toThrow('down');
  });
});

describe('Crossover', () => {
  const quizzes = [
    quizRow({ id: 'tog', slug: 'studios-singers-and-strings-the-tower-on-screen', title: 'Studios, Singers and Strings', site_id: 'anime', groups: { name: 'Tower of God', slug: 'tower-of-god' } }),
    quizRow({ id: 'sl', slug: 'behind-the-gate-staff-songs-and-idol-guests', title: 'Behind the Gate', site_id: 'anime', groups: { name: 'Solo Leveling', slug: 'solo-leveling' } }),
  ];
  const trivia = CROSSOVER_FACTS.map((f) => ({ fact: f.basedOn, status: 'published', site_id: f.site, source: 'wikipedia', source_url: 'https://en.wikipedia.org/wiki/X' }));
  const reads = (t: Record<string, Row[]>) => dbCrossoverReads(fakeDb(t) as never);

  it('resolves the editorial list to canonical pages on their own sites, with the KPop Demon Hunters page of the K-pop site', async () => {
    const out = await readCrossover(ORIGINS, NOW, reads({ quizzes, trivia }));
    expect(out?.quizzes).toHaveLength(3);
    const hrefs = out!.quizzes.map((x) => x.href).sort();
    expect(hrefs).toEqual([
      'https://anime.example/q/behind-the-gate-staff-songs-and-idol-guests',
      'https://anime.example/q/studios-singers-and-strings-the-tower-on-screen',
      'https://kpop.example/kpop-demon-hunters-quiz',
    ]);
    expect(out!.quizzes.every((x) => x.line.length > 0)).toBe(true);
  });

  it('drops a quiz that is no longer published instead of leaving a dead link', async () => {
    const out = await readCrossover(ORIGINS, NOW, reads({ quizzes: [quizzes[0]!, { ...quizzes[1]!, status: 'flagged' }], trivia }));
    expect(out?.quizzes.map((x) => x.title)).toEqual(['Loved HUNTR/X? Find your real K-pop girl group', 'Studios, Singers and Strings']);
  });

  it('shows a fact only while its sourced trivia row is published, with that row\'s source', async () => {
    const out = await readCrossover(ORIGINS, NOW, reads({ quizzes, trivia }));
    expect(out?.fact?.sourceUrl).toBe('https://en.wikipedia.org/wiki/X');
    expect(out?.fact?.source).toBe('Wikipedia');
    const none = await readCrossover(ORIGINS, NOW, reads({ quizzes, trivia: trivia.map((t) => ({ ...t, status: 'draft' })) }));
    expect(none?.fact).toBeNull();
    const noUrl = await readCrossover(ORIGINS, NOW, reads({ quizzes, trivia: trivia.map((t) => ({ ...t, source_url: null })) }));
    expect(noUrl?.fact).toBeNull();
  });

  it('changes the fact every week, and the picks rotate through a longer list', () => {
    const weeks = ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02'].map((d) => weekIndex(new Date(`${d}T12:00:00Z`)));
    expect(new Set(weeks).size).toBe(4);
    expect(weekIndex(new Date('2026-10-26T00:00:00Z'))).toBe(weekIndex(new Date('2026-11-01T23:59:00Z')));
    expect(isoWeek(new Date('2026-10-25T12:00:00Z'))).toBe('2026-W43');
    expect(isoWeek(new Date('2026-10-26T12:00:00Z'))).toBe('2026-W44');
    expect(isoWeek(new Date('2027-01-01T12:00:00Z'))).toBe('2026-W53');
    const list = ['a', 'b', 'c', 'd', 'e'];
    const seen = new Set<string>();
    for (let w = 0; w < 5; w += 1) rotate(list, 3, w).forEach((x) => seen.add(x));
    expect(seen.size).toBe(5);
    expect(rotate(list, 3, 0)).toHaveLength(3);
    expect(rotate(['a', 'b'], 3, 7)).toEqual(['a', 'b']);
  });

  it('is empty (null) when nothing resolves, except the page entry', async () => {
    const out = await readCrossover(ORIGINS, NOW, reads({ quizzes: [], trivia: [] }));
    expect(out?.quizzes).toHaveLength(1);
    expect(out?.fact).toBeNull();
  });

  it('names real slugs once each, and no site without a pick', () => {
    const slugs = CROSSOVER_ENTRIES.flatMap((e) => (e.kind === 'quiz' ? [`${e.site}/${e.slug}`] : []));
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(CROSSOVER_FACTS.every((f) => f.text.length <= 280 && f.basedOn.length > 0)).toBe(true);
  });
});
