// Fixtures of the weekly SEO data (SEO Mission 3, part C), for the unit tests and the e-mail
// preview script (scripts/seo-weekly-email-preview.mts). Never imported by app code.
//
// The API answers follow the shapes of the official references (Search Console
// searchAnalytics.query; Microsoft Learn's JSON samples for the Bing Webmaster API). The Bing AI
// Performance CSV keeps the exact format of the real export of 14 October 2026
// (docs/seo/bing-2026-10-14/AISearchQueriesReport.csv: BOM, CRLF, quoted fields) and some of its
// rows. The weekly rows below are SAMPLE numbers for the preview, not measurements.

import type { Engine, PageAgg, QueryAgg, QueryPageAgg } from './report';
import type { LinkRecord, RunRecord, WeeklyReader } from './report-data';

export const GSC_RESPONSE = {
  rows: [
    { keys: ['bts quiz', 'https://kpopquiz.org/bts-quiz', 'usa', 'MOBILE'], clicks: 12, impressions: 340, ctr: 0.0353, position: 7.2 },
    { keys: ['bts quiz', 'https://kpopquiz.org/bts-quiz', 'fra', 'DESKTOP'], clicks: 3, impressions: 41, ctr: 0.0732, position: 5.1 },
    { keys: ['stray kids quiz', 'https://kpopquiz.org/stray-kids-quiz', 'idn', 'MOBILE'], clicks: 5, impressions: 120, ctr: 0.0417, position: 8.9 },
    { keys: ['broken row'], clicks: 1, impressions: 2 },
  ],
  responseAggregationType: 'byPage',
};

export const BING_QUERY_STATS = {
  d: [
    { __type: 'QueryStats:#Microsoft.Bing.Webmaster.Api', AvgClickPosition: 18, AvgImpressionPosition: 17, Clicks: 15, Date: '/Date(1316156400000-0700)/', Impressions: 100, Query: 'query' },
  ],
};

export const BING_LINK_COUNTS = {
  d: {
    __type: 'LinkCounts:#Microsoft.Bing.Webmaster.Api',
    Links: [{ __type: 'LinkCount:#Microsoft.Bing.Webmaster.Api', Count: 14, Url: 'http://example.com/page1.html' }],
    TotalPages: 3,
  },
};

export const BING_URL_LINKS = {
  d: {
    __type: 'LinkDetails:#Microsoft.Bing.Webmaster.Api',
    Details: [{ __type: 'LinkDetail:#Microsoft.Bing.Webmaster.Api', AnchorText: 'link', Url: 'http://example.com/page1.html' }],
    TotalPages: 3,
  },
};

/** The real export's header and first rows (Bing Webmaster, AI Performance, 2026-10-14). */
export const AI_QUERIES_CSV =
  '﻿"Grounding Query","Intent","Topic","Citations","Citation Share"\r\n' +
  '"bts qui","Informational","Gaming","750","25.01%"\r\n' +
  '"bts trivia","Informational","Entertainment","580","37.44%"\r\n' +
  '"kpop generations","Informational","Music Genres (Pop, Rock, Hip-Hop, Classical)","465","19.06%"\r\n' +
  '"kpop games","Media","Gaming","453","5.13%"\r\n' +
  '"bts trivia games","Informational","Geography Facts & Trivia","279","71.54%"\r\n' +
  '"kpop trivia","Informational","Trivia & Quizzes","254","18.22%"\r\n' +
  '"stray kids test","Informational","Entertainment","212","14.80%"\r\n' +
  '"blind test kpop","Media","Music","182","77.78%"\r\n' +
  '"kpop generations timeline","Informational","Music Genres (Pop, Rock, Hip-Hop, Classical)","161","28.35%"\r\n' +
  '"bts test","Informational","Gaming","132","21.09%"\r\n' +
  '"kpop test","Informational","Music Genres (Pop, Rock, Hip-Hop, Classical)","131","23.43%"\r\n' +
  '"sporcle kpop","Informational","Entertainment","93","38.43%"\r\n' +
  '"generations of kpop","Informational","Music Genres (Pop, Rock, Hip-Hop, Classical)","91","32.97%"\r\n' +
  '"teste illit","Informational","Education","84","13.75%"\r\n' +
  '"bts army test","Informational","Gaming","80","16.60%"\r\n' +
  '"stray kids games online","Media","Free-to-Play Games","70","22.08%"\r\n';

/** TARGETS.md in the format of SEO Mission 2, part A (a few rows). */
export const TARGETS_MD = [
  '# TARGETS: one URL per query cluster',
  '',
  '| Cluster | Queries | URL | Intent | Language | Evidence | KPI | Status |',
  '|---|---|---|---|---|---|---|---|',
  '| kpop quiz | kpop quiz, quiz kpop | / | play K-pop quizzes | en | | clicks | live |',
  '| bts quiz | bts quiz, quiz bts, bts test | /bts-quiz | play BTS quizzes | en | | clicks | live |',
  '| bts army test | bts army test, army ranks | /q/bts-army-level-test | test level | en | | citations | planned |',
  '| bts trivia | bts trivia, bts trivia questions | /bts-trivia | read facts | en | | share | live |',
  '| kpop games | kpop games, kpop games online | /kpop-games | play games | en | | share | ready |',
  '| kpop generations | kpop generations, what gen is X | /articles/kpop-generations-explained | learn | en | | share | live |',
  '| kpop trivia | kpop trivia, kpop questions | /trivia | read facts | en | | share | live |',
  '| kpop test | kpop test | /kpop-test | test | en | | share | planned |',
  '| blind test kpop | blind test kpop, kpop blind test | /blindtest | play | en | | share | live |',
  '| which {group} member are you | which {group} member are you | /which-{group}-member-are-you | personality | en | | share | live |',
  '| name them all | sporcle kpop, name them all, type them all | /name-them-all | name | en | | citations | planned |',
  '| {group} quiz | {group} quiz, {group} test | /{group}-quiz | group quizzes | en | | clicks | live |',
  '| {group} games | {group} games | section of /{group}-quiz | group games | en | | citations | ready |',
  '',
  '## Rules that come with this table',
  '- One cluster, one URL.',
].join('\n');

export const CALENDAR_MD = [
  '# Calendar',
  '',
  '| Group | Type | Date | Source | Status |',
  '|---|---|---|---|---|',
  '| ILLIT | mini album | 2026-10-26 | https://example.com/illit | to confirm |',
  '| ATEEZ | comeback | 2026-11-13 | https://example.com/ateez | to confirm |',
  '| MAMA | awards (Osaka) | 2026-11-20 to 2026-11-21 | https://example.com/mama | to confirm |',
].join('\n');

export interface MemoryRow {
  engine: Engine;
  week: string;
  query: string;
  page: string;
  clicks: number;
  impressions: number;
}

/** A WeeklyReader over rows in memory: what the Supabase views would return for them. */
export function memoryWeeklyReader(rows: MemoryRow[], links: LinkRecord[] = [], runs: RunRecord[] = [], indexnowAlerts: number | null = null): WeeklyReader {
  const sum = <K extends string>(list: MemoryRow[], key: (r: MemoryRow) => string, make: (k: string) => Record<K, string>) => {
    const m = new Map<string, Record<string, unknown> & { clicks: number; impressions: number }>();
    for (const r of list) {
      const k = key(r);
      const a = m.get(k) ?? { ...make(k), clicks: 0, impressions: 0 };
      a.clicks += r.clicks;
      a.impressions += r.impressions;
      m.set(k, a);
    }
    return [...m.values()];
  };
  return {
    async latestWeeks(engine) {
      return [...new Set(rows.filter((r) => r.engine === engine).map((r) => r.week))].sort().reverse().slice(0, 2);
    },
    async pages(engine, week) {
      return sum(rows.filter((r) => r.engine === engine && r.week === week && r.page), (r) => r.page, (k) => ({ page: k })) as unknown as PageAgg[];
    },
    async queries(engine, week) {
      return sum(rows.filter((r) => r.engine === engine && r.week === week && r.query), (r) => r.query, (k) => ({ query: k })) as unknown as QueryAgg[];
    },
    async queryPages(engine, week, queries) {
      const set = new Set(queries);
      return sum(rows.filter((r) => r.engine === engine && r.week === week && set.has(r.query) && r.page), (r) => `${r.query}\u0000${r.page}`, (k) => ({ query: k.split('\u0000')[0]!, page: k.split('\u0000')[1]! })) as unknown as QueryPageAgg[];
    },
    async queriesSeen(engine, queries, fromWeek, beforeWeek) {
      const set = new Set(queries);
      return new Set(rows.filter((r) => r.engine === engine && r.week >= fromWeek && r.week < beforeWeek && set.has(r.query)).map((r) => r.query));
    },
    async links() {
      return links;
    },
    async lastRuns() {
      return runs;
    },
    async indexnowAlerts() {
      if (indexnowAlerts === null) throw new Error('table missing');
      return indexnowAlerts;
    },
  };
}

/** Two weeks of SAMPLE rows for the preview and the tests (not measurements). */
export const SAMPLE_ROWS: MemoryRow[] = [
  // Google, week of 2026-10-05 (current) and 2026-09-28 (previous).
  { engine: 'google', week: '2026-10-05', query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', clicks: 40, impressions: 900 },
  { engine: 'google', week: '2026-10-05', query: 'bts quiz', page: 'https://kpopquiz.org/q/bts-quiz-hard', clicks: 6, impressions: 210 },
  { engine: 'google', week: '2026-10-05', query: 'stray kids quiz', page: 'https://kpopquiz.org/stray-kids-quiz', clicks: 22, impressions: 400 },
  { engine: 'google', week: '2026-10-05', query: 'kpop quiz <b>', page: 'https://kpopquiz.org/', clicks: 9, impressions: 300 },
  { engine: 'google', week: '2026-10-05', query: 'illit test', page: 'https://kpopquiz.org/illit-quiz', clicks: 2, impressions: 80 },
  { engine: 'google', week: '2026-10-05', query: 'kpop lightstick names', page: 'https://kpopquiz.org/trivia', clicks: 1, impressions: 75 },
  { engine: 'google', week: '2026-09-28', query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', clicks: 70, impressions: 1100 },
  { engine: 'google', week: '2026-09-28', query: 'stray kids quiz', page: 'https://kpopquiz.org/stray-kids-quiz', clicks: 15, impressions: 350 },
  { engine: 'google', week: '2026-09-28', query: 'kpop quiz <b>', page: 'https://kpopquiz.org/', clicks: 10, impressions: 280 },
  // Bing, the same two weeks.
  { engine: 'bing', week: '2026-10-05', query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', clicks: 520, impressions: 48000 },
  { engine: 'bing', week: '2026-10-05', query: 'quiz bts', page: 'https://kpopquiz.org/bts-quiz', clicks: 90, impressions: 9000 },
  { engine: 'bing', week: '2026-10-05', query: 'kpop games', page: 'https://kpopquiz.org/quizzes', clicks: 30, impressions: 2000 },
  { engine: 'bing', week: '2026-09-28', query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', clicks: 480, impressions: 47000 },
  { engine: 'bing', week: '2026-09-28', query: 'quiz bts', page: 'https://kpopquiz.org/bts-quiz', clicks: 120, impressions: 9500 },
  { engine: 'bing', week: '2026-09-28', query: 'kpop games', page: 'https://kpopquiz.org/quizzes', clicks: 12, impressions: 1500 },
];

export const SAMPLE_LINKS: LinkRecord[] = [
  { targetUrl: 'https://kpopquiz.org/bts-quiz', sourceDomain: 'example.com', firstSeen: '2026-09-28' },
  { targetUrl: 'https://kpopquiz.org/q/old-slug', sourceDomain: 'blog.example.org', firstSeen: '2026-10-12' },
];
