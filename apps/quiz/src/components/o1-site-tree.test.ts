import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

// Run O1, lane O1 (fix lot): the kpop server components whose copy now follows the site keep the React Flight tree they had
// (the RSC payload, not only the HTML): the v11 home, the blindtest hub (V12 flag off and on), the three popular pages, the
// /quizzes page of UX v11 and the two leaderboard panels. Same method as o1-kpop-tree.test.ts: each render is walked like the
// Flight serializer (lib/o1-flight-tree.ts) and compared with the file of __o1_site_tree__/, written ONLY from the base commit
// da33e52 (never from the head): O1_WRITE_TREE=1 writes them, a plain run compares.

const DIR = fileURLToPath(new URL('./__o1_site_tree__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('..', import.meta.url));
const flags = globalThis as { __v12?: boolean };

const CARD = {
  id: 'q1', title: 'A quiz', slug: 'a-quiz', quiz_type: 'multiple_choice', difficulty: 'easy', language: 'en', play_count: 12,
  total_score_sum: 40, total_completions: 5, like_count: 2, created_at: '2026-10-01T00:00:00Z', group_name: 'A Group', group_slug: 'a-group',
  display_color: '#000000', text_color: '#ffffff', logo_url: null, fandom_name: null, creator_username: 'fan', creator_avatar_url: null,
  creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff', creator_xp: 10, question_count: 3, cover_image_url: null,
};
const RAIL = { slug: 'a-group', name: 'A Group', photo: null, initials: 'AG', quizzes: 3, isNew: false };
const AROUND = { today: { plays: 5, quizzes: 2, masters: 1, hot: null }, qotd: { title: 'The quiz of the day', href: '/q/the-quiz', note: 'Easy' }, happening: [], fresh: [], comments: [], badges: [] };
const FAQ = [{ q: 'A question?', a: 'An answer.' }];
const LD = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [] };
const Slot = (name: string) => ({ [name]: (p: { children?: React.ReactNode }) => h('div', { 'data-slot': name }, p.children) })[name]!;
const SLOTS = {
  BtBoardLoader: Slot('BtBoardLoader'), BtChallengeCardLoader: Slot('BtChallengeCardLoader'), BtDailyCardLoader: Slot('BtDailyCardLoader'),
  BtGroupIndexLoader: Slot('BtGroupIndexLoader'), BtHubControllerLoader: Slot('BtHubControllerLoader'), BtLiveCountLoader: Slot('BtLiveCountLoader'),
  BtRankedFootLoader: Slot('BtRankedFootLoader'), BtSetupLoader: Slot('BtSetupLoader'),
};

// -- reads ---------------------------------------------------------------------------------------------------------------
vi.mock('@/lib/ux-v1/p1/home-data', () => ({
  getHomeQotd: async () => null,
  getHomeGroups: async () => ({ groups: [RAIL], visibleGroups: 12 }),
  getHomeCommunity: async () => ({ rows: [], verse: null }),
  getHomeBand: async () => ({ date: '2026-10-20', fans: 5 }),
  getHomeLists: async () => ({ trending: [CARD], best: [CARD], fresh: [CARD] }),
}));
vi.mock('./blindtest/ux-v1/loader', () => SLOTS);
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.__v12 === true }));
vi.mock('@/lib/ux-v1/p6/hub-data', async (orig) => ({ ...(await orig<object>()), hasDbEnv: () => false }));
vi.mock('@/lib/growth/bt-data', () => ({
  getThemeState: async () => ({
    playable: new Set(['kpop-hits-2026', '5th-gen', 'tiktok-viral', 'kpop-legends', '4th-gen-gg', '4th-gen-bg', 'recent-hits', 'kpop-demon-hunters', '4th-gen']),
    counts: { 'kpop-hits-2026': 40, '5th-gen': 55 },
  }),
}));
vi.mock('@/lib/db/queries/popular', () => ({
  getPopularQuizzes: async (window: string) => ({ window, generatedAt: '2026-10-20T10:00:00Z', state: 'ok', rowsScanned: 1, qualifyingCount: 1, rows: [{ card: CARD, windowPlays: 7 }] }),
}));
vi.mock('@/lib/db/queries/groups', () => ({ getAllGroups: async () => [{ id: 1, name: 'A Group', slug: 'a-group', quiz_count: 1 }] }));
vi.mock('@/lib/ux-v1/p2/queries', () => ({ getP2FacetRows: async () => [], getP2Page: async () => [CARD], getP2Pages: async () => [[CARD]] }));
vi.mock('@/lib/stats/site-stats', async (orig) => ({
  ...(await orig<object>()),
  getPublicStatsOrNull: async () => ({ quizzes: 120, groupsWithQuizzes: 12, groupsListed: 12, songs: 0, songGroups: 0, plays: 0, asOf: '2026-10-20' }),
}));

// -- the comparison ------------------------------------------------------------------------------------------------------
let refs: Map<unknown, string>;

function firstDifference(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

async function check(name: string, node: unknown): Promise<void> {
  const tree = JSON.stringify(await flightTree(node, { client: refs }));
  const file = `${DIR}${name}.json`;
  if (WRITE) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(file, `${tree}\n`);
    return;
  }
  const want = readFileSync(file, 'utf8').trimEnd();
  if (tree === want) return;
  const at = firstDifference(tree, want);
  const around = (s: string): string => s.slice(Math.max(0, at - 90), at + 110);
  expect({ name, bytes: tree.length, firstDifferenceAt: at, around: around(tree) }).toEqual({ name, bytes: want.length, firstDifferenceAt: at, around: around(want) });
}

beforeAll(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
  const entries = [
    'components/home/ux-v1/ux-home.tsx',
    'components/blindtest/ux-v1/hub.tsx',
    'components/quiz/popular-page.tsx',
    'app/(site)/quizzes/ux-page.tsx',
    'components/leaderboard/ux-v1/points.tsx',
    'components/leaderboard/ux-v1/around.tsx',
  ].map((f) => `${SRC}${f}`);
  const found = await clientRefsOf(entries);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
  for (const [name, fn] of Object.entries(SLOTS)) refs.set(fn, name);
});

afterAll(() => {
  vi.useRealTimers();
  flags.__v12 = undefined as unknown as boolean;
});

describe('the kpop server components keep their Flight tree', () => {
  it('the v11 home', async () => {
    const { UxHome } = await import('@/components/home/ux-v1/ux-home');
    await check('home', await UxHome({}));
  });
  it('the blindtest hub, V12 off and on', async () => {
    const { BlindtestHubV11 } = await import('@/components/blindtest/ux-v1/hub');
    for (const v12 of [false, true]) {
      flags.__v12 = v12;
      await check(`blindtest-hub-v12-${v12 ? 'on' : 'off'}`, await BlindtestHubV11({ faq: FAQ, faqJsonLd: LD, webAppJsonLd: LD }));
    }
    flags.__v12 = false;
  });
  it('the three popular pages', async () => {
    const { PopularPage } = await import('@/components/quiz/popular-page');
    for (const window of ['today', 'week', 'month'] as const) await check(`popular-${window}`, await PopularPage({ window }));
  });
  it('the /quizzes page of UX v11', async () => {
    const { renderP2Quizzes } = await import('@/app/(site)/quizzes/ux-page');
    await check('quizzes-page', await renderP2Quizzes({}));
  });
  it('the leaderboard panels', async () => {
    const { HowPoints } = await import('@/components/leaderboard/ux-v1/points');
    const { AroundCommunity } = await import('@/components/leaderboard/ux-v1/around');
    await check('leaderboard-points', HowPoints({ creatorViews: ['week', 'rising'] }));
    await check('leaderboard-around', AroundCommunity({ data: AROUND }));
  });
});
