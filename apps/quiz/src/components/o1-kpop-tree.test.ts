import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement as h } from 'react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { clientRefsOf, flightTree } from '@/lib/o1-flight-tree';

import type { Group, QuizCardData, QuizWithGroup } from '@/lib/db/types';
import type { TriviaFact } from '@/lib/trivia/types';
import type { P4HofRow } from '@/lib/ux-v1/p4/queries';

// Lot (b), O2: the kpop pages must keep the React Flight tree they had before the anime blocks were added to the shared
// components (the HTML was equal, the RSC payload was not). Each kpop page component below is rendered with realistic
// kpop props (no prop of the anime path) and walked like the Flight serializer (lib/o1-flight-tree.ts). The tree is
// compared with the file of __o1_kpop_tree__/. The files are written ONLY from the base commit 04298d3 (never from the
// head): O1_WRITE_TREE=1 writes them, a plain run compares.

const DIR = fileURLToPath(new URL('./__o1_kpop_tree__/', import.meta.url));
const WRITE = process.env.O1_WRITE_TREE === '1';
const SRC = fileURLToPath(new URL('..', import.meta.url));

const flags = globalThis as { __v12?: boolean };

// ------------------------------------------------------------------
// Fixtures: a group with 7 members and images, 5 quizzes, 12 trivia facts, a quiz with 5 related quizzes
// ------------------------------------------------------------------

const GROUP: Group = {
  id: 3, name: 'BTS', slug: 'bts', fandom_name: 'ARMY', display_color: '#7c3aed', text_color: '#ffffff',
  logo_url: '/logos/bts.png', quiz_count: 5, total_plays: 48210, seo_intro: 'Test your BTS knowledge with fan-made quizzes about the members, the albums and the eras.',
  is_custom: false, needs_review: false, created_by_user: false, created_at: '2024-03-05T10:00:00Z', generation: '3rd Gen',
};

const MEMBERS = [
  { name: 'RM', photoUrl: '/idols/members/rm.jpg' },
  { name: 'Jin', photoUrl: '/idols/members/jin.jpg' },
  { name: 'Suga', photoUrl: '/idols/members/suga.jpg' },
  { name: 'J-Hope', photoUrl: '/idols/members/j-hope.jpg' },
  { name: 'Jimin', photoUrl: 'https://upload.wikimedia.org/jimin.jpg' },
  { name: 'V', photoUrl: null },
  { name: 'Jungkook', photoUrl: '/idols/members/jungkook.jpg' },
];

function quizRow(i: number, over: Partial<QuizCardData> = {}): QuizCardData {
  const type = (['multiple_choice', 'true_false', 'guess_from_clues', 'image', 'intruder'] as const)[i % 5]!;
  return {
    id: `q-${i}`, title: `BTS quiz number ${i}`, slug: `bts-quiz-number-${i}`, quiz_type: type,
    difficulty: (['easy', 'medium', 'hard'] as const)[i % 3]!, language: 'en', play_count: 1200 - i * 150,
    total_score_sum: 640 + i * 11, total_completions: 90 + i, like_count: 30 - i, created_at: `2026-0${(i % 9) + 1}-1${i}T12:00:00Z`,
    group_name: 'BTS', group_slug: 'bts', display_color: '#7c3aed', text_color: '#ffffff', logo_url: null, fandom_name: 'ARMY',
    creator_username: `fan${i}`, creator_avatar_url: null, creator_avatar_bg: '#222222', creator_avatar_text: '#ffffff',
    creator_xp: 400 * i, question_count: 10 + i, cover_image_url: i % 2 === 0 ? `/covers/bts-${i}.jpg` : null, ...over,
  };
}

const QUIZZES = [1, 2, 3, 4, 5].map((i) => quizRow(i));
const NEWEST = [quizRow(6, { created_at: '2026-10-12T12:00:00Z' }), quizRow(7, { created_at: '2026-10-09T12:00:00Z' }), QUIZZES[0]!];
const HUB_QUIZZES = QUIZZES.map((q) => ({
  slug: q.slug, title: q.title, quiz_type: q.quiz_type, difficulty: q.difficulty, play_count: q.play_count, like_count: q.like_count,
  total_score_sum: q.total_score_sum, total_completions: q.total_completions, question_count: q.question_count, created_at: q.created_at,
}));
const RELATED_QUIZZES = [
  { id: 'r-1', title: 'SEVENTEEN trivia', slug: 'seventeen-trivia', play_count: 800, difficulty: 'medium', group_name: 'SEVENTEEN', group_slug: 'seventeen', group_logo_url: null },
  { id: 'r-2', title: 'TXT songs', slug: 'txt-songs', play_count: 640, difficulty: 'easy', group_name: 'TXT', group_slug: 'txt', group_logo_url: null },
];
const INDEX = [
  { slug: 'seventeen', name: 'SEVENTEEN', quizzes: 12, plays: 9000, photo: '/idols/SEVENTEEN.jpg' },
  { slug: 'txt', name: 'TXT', quizzes: 1, plays: 80, photo: null },
  { slug: 'enhypen', name: 'ENHYPEN', quizzes: 7, plays: 3300, photo: '/idols/ENHYPEN.jpg' },
];
const COMMENTS = [
  { id: 'c-1', text: 'The Wings era quiz was the hardest one I ever played, no question about it, I am still angry.', createdAt: '2026-10-18T09:00:00Z', quizSlug: 'bts-quiz-number-1', quizTitle: 'BTS quiz number 1', author: { username: 'jiminie', avatarUrl: null, accent: '#ff66aa', font: null } },
  { id: 'c-2', text: 'Team pick of the week.', createdAt: '2026-10-10T09:00:00Z', quizSlug: 'bts-quiz-number-2', quizTitle: 'BTS quiz number 2', author: { username: 'kpopquiz', avatarUrl: null, accent: null, font: null, team: true as const } },
  { id: 'c-3', text: 'Anonymous but friendly.', createdAt: '2026-09-01T09:00:00Z', quizSlug: 'bts-quiz-number-3', quizTitle: 'BTS quiz number 3', author: null },
];
const FAN_KNOWLEDGE = {
  masteredCount: 14, avgAccuracy: 0.713, trackedPlays: 420,
  topFans: [0, 1, 2].map((i) => ({
    accuracy: 0.9 - i * 0.05,
    person: { username: `topfan${i}`, displayName: i === 0 ? 'Top Fan' : null, avatarUrl: null, avatarBg: '#333333', avatarText: '#ffffff', xp: 900 + i * 700, followerCount: 10 * i, nameAccent: null, nameFont: null, bias: i === 1 ? 'Jin' : null },
  })),
};
const GROWTH = { ways: { slug: 'bts', name: 'BTS', quizzes: 5, songs: 9, nameAll: null, whichMember: null, thisOrThat: null, live: false }, recentPlays: 14, btPlays: 3, firstCreator: null, fansPicked: null };

let reads = {
  initial: QUIZZES as QuizCardData[],
  newest: NEWEST as QuizCardData[],
  hub: HUB_QUIZZES as unknown[],
  members: true,
  extras: true,
};

vi.mock('@/lib/db/queries/quizzes', () => ({ getQuizzesByGroup: async (_id: number, sort: string) => (sort === 'newest' ? reads.newest : reads.initial) }));
vi.mock('@/lib/db/queries/related-quizzes', () => ({ getRelatedQuizzes: async () => RELATED_QUIZZES }));
vi.mock('@/lib/db/queries/trivia', () => ({ hasTriviaPage: async () => true, TRIVIA_MIN_FACTS: 9 }));
vi.mock('@/lib/db/queries/group-hub', () => ({
  getGroupNameAllGame: async () => (reads.members ? { slug: 'bts-name-all', members: MEMBERS, count: MEMBERS.length } : null),
  getGroupBlindtestInfo: async () => ({ qualifies: reads.extras, songs: reads.extras ? 21 : 0 }),
  getGroupWarRank: async () => (reads.extras ? { rank: 3, delta: 1 } : null),
  getGroupActiveComeback: async () => (reads.extras ? { title: 'Arirang', artist: 'BTS', releaseDate: '2026-03-20', kind: 'album' } : null),
  getGroupMvPulse: async () => (reads.extras ? { viewsGained: 1234567, mvCount: 4, trackedSince: '2026-01-05' } : null),
  getGroupFanKnowledge: async () => (reads.extras ? FAN_KNOWLEDGE : { masteredCount: 0, avgAccuracy: null, trackedPlays: 0, topFans: [] }),
}));
vi.mock('@/lib/db/queries/group-freshness', async (orig) => ({ ...(await orig<object>()), getGroupContentDate: async () => '2026-10-01T00:00:00Z' }));
vi.mock('@/lib/ux-v1/p3/data', () => ({
  getHubQuizzes: async () => reads.hub,
  getGroupsIndex: async () => INDEX,
  getPlayableSongs: async () => ({ bts: 21 }),
  getGroupCommentsWithTeam: async () => (reads.extras ? COMMENTS : []),
}));
vi.mock('@/lib/ux-v1/p3/growth-data', () => ({ getHubGrowth: async () => GROWTH }));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.__v12 === true }));
vi.mock('@/lib/trivia/facts', () => ({ getOverriddenFacts: async () => triviaFacts }));
vi.mock('@/lib/ux-v1/p4/queries', () => ({
  relaxedRunsLive: async () => true,
  getP4HallOfFame: async () => HOF,
  getP4Creator: async () => ({ username: 'fan1', avatarUrl: null, xp: 400, quizzes: 6, playsReceived: 5400 }),
  getP4GroupQuizCount: async () => 5,
  getP4GroupPlaylist: async () => ({ songs: 21 }),
}));

const CATEGORIES = ['members', 'music', 'achievements', 'history', 'fun'] as const;
const triviaFacts: TriviaFact[] = Array.from({ length: 12 }, (_, i) => ({
  fact: `BTS fact number ${i + 1}: something only a real fan would know about the group.`,
  category: CATEGORIES[i % 3]!,
  sourceQuizTitle: `BTS quiz number ${(i % 5) + 1}`,
  sourceQuizSlug: `bts-quiz-number-${(i % 5) + 1}`,
}));
const HOF: P4HofRow[] = [
  { person: { username: 'jiminie', avatarUrl: null, accent: '#ff66aa', font: null, bias: 'Jimin' }, score: 10, total: 10, timeSeconds: 52 },
  { person: { username: 'army_01', avatarUrl: null, accent: null, font: null, bias: null }, score: 9, total: 10, timeSeconds: 61 },
  { person: null, score: 8, total: 10, timeSeconds: null },
];

// ------------------------------------------------------------------
// The comparison
// ------------------------------------------------------------------

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
  vi.setSystemTime(new Date('2026-10-19T12:00:00Z'));
  const entries = [
    'components/group/ux-v1/hub.tsx',
    'components/group/ux-v1/group-avatar.tsx',
    'components/ux-v1/text-card.tsx',
    'components/ui/breadcrumbs.tsx',
    'components/quiz/ux-v1/quiz-page.tsx',
    'app/(site)/q/[slug]/ux-page.tsx',
    'app/(site)/[slug]/group-trivia-page.tsx',
  ].map((f) => `${SRC}${f}`);
  const found = await clientRefsOf(entries);
  expect(found.unloaded).toEqual([]);
  refs = found.refs;
});

afterAll(() => {
  vi.useRealTimers();
  flags.__v12 = undefined as unknown as boolean;
});

async function hub(group: Group, v12: boolean): Promise<unknown> {
  flags.__v12 = v12;
  const { GroupHubV11 } = await import('@/components/group/ux-v1/hub');
  return GroupHubV11({ group });
}

describe('the kpop group hub /{group}-quiz keeps its tree', () => {
  it('hub, v11, with members, quizzes, comments, fan knowledge and related groups', async () => {
    reads = { initial: QUIZZES, newest: NEWEST, hub: HUB_QUIZZES, members: true, extras: true };
    await check('hub-v11', await hub(GROUP, false));
  });

  it('hub, v12', async () => {
    reads = { initial: QUIZZES, newest: NEWEST, hub: HUB_QUIZZES, members: true, extras: true };
    await check('hub-v12', await hub(GROUP, true));
  });

  it('hub, v11, a group with no member roster and no extra reads', async () => {
    reads = { initial: QUIZZES, newest: QUIZZES, hub: HUB_QUIZZES, members: false, extras: false };
    await check('hub-v11-bare', await hub(GROUP, false));
  });

  it('hub, v11 and v12, a group without a quiz yet', async () => {
    reads = { initial: [], newest: [], hub: [], members: true, extras: false };
    await check('hub-v11-empty', await hub(GROUP, false));
    await check('hub-v12-empty', await hub(GROUP, true));
  });

  it('hub, v11, the General K-pop category', async () => {
    reads = { initial: QUIZZES, newest: NEWEST, hub: HUB_QUIZZES, members: true, extras: true };
    await check('hub-v11-category', await hub({ ...GROUP, id: 1, name: 'General K-pop', slug: 'general-kpop', fandom_name: 'K-pop fans' }, false));
  });
});

describe('the shared pieces keep their tree', () => {
  it('GroupAvatar, with and without a photo', async () => {
    const { GroupAvatar } = await import('@/components/group/ux-v1/group-avatar');
    await check('group-avatar', [
      h(GroupAvatar, { name: 'BTS', photo: '/idols/BTS.jpg', size: 40 }),
      h(GroupAvatar, { name: 'TXT', photo: null, size: 40 }),
      h(GroupAvatar, { name: 'ENHYPEN', photo: '/idols/ENHYPEN.jpg', size: 56, className: 'x', priority: true }),
    ]);
  });

  it('TextCard, as the hub and the quiz page print it', async () => {
    const { TextCard, TextCardGrid } = await import('@/components/ux-v1/text-card');
    await check('text-card', h(TextCardGrid, {
      className: 'p4-more-grid',
      children: [
        ...QUIZZES.map((q) => h(TextCard, { key: q.id, href: `/q/${q.slug}`, title: q.title, quizType: q.quiz_type, difficulty: q.difficulty, plays: q.play_count, averagePct: 66, titleAs: 'h3' })),
        h(TextCard, { key: 'plain', href: '/q/x', title: 'No average yet', quizType: 'multiple_choice', difficulty: 'easy', plays: 0, averagePct: null, className: 'extra' }),
      ],
    }));
  });

  it('Breadcrumbs, with the last item as plain text', async () => {
    const { Breadcrumbs } = await import('@/components/ui/breadcrumbs');
    await check('breadcrumbs', h(Breadcrumbs, { items: [{ label: 'Home', href: '/' }, { label: 'BTS Quiz', href: '/bts-quiz' }, { label: 'BTS Trivia' }] }));
  });
});

describe('the kpop trivia page /{group}-trivia keeps its tree', () => {
  it('trivia, 12 facts in three categories', async () => {
    flags.__v12 = false;
    const { GroupTriviaPage } = await import('@/app/(site)/[slug]/group-trivia-page');
    await check('trivia', await GroupTriviaPage({ group: GROUP }));
  });

  it('trivia, a group without a logo', async () => {
    flags.__v12 = false;
    const { GroupTriviaPage } = await import('@/app/(site)/[slug]/group-trivia-page');
    await check('trivia-nologo', await GroupTriviaPage({ group: { ...GROUP, logo_url: null, slug: 'twice', name: 'TWICE', fandom_name: 'ONCE' } }));
  });
});

describe('the kpop quiz page /q/{slug} keeps its tree', () => {
  const quiz = {
    ...quizRow(1), questions: [], settings: { timer: true, timer_seconds: 20, shuffle: false, show_answers: true }, status: 'published', is_quiz_of_the_day: false,
    quiz_of_the_day_date: null, updated_at: '2026-10-01T12:00:00Z', creator_id: 'u-1', group_id: 3,
  } as unknown as QuizWithGroup;
  const args = (related: QuizCardData[]): Parameters<typeof import('@/app/(site)/q/[slug]/ux-page').renderUxQuizPage>[0] => ({
    quiz, questionCount: 11, intro: 'Eleven questions about BTS, from the debut to the latest era.', introAvg: 64, perQuestionScore: true,
    extraStats: { fastestTimeSeconds: 48, perfectScoreCount: 7, passingPlays: 60, totalPlaysWithScore: 90 }, passRate: 66,
    seoQuestions: [
      { question: 'Which member is the oldest?', options: ['Jin', 'Suga', 'RM', 'V'], correct: 0, fun_fact: 'Jin was born in 1992.' },
      { question: 'BTS debuted in 2013.', correct: true },
      { question: 'Guess the member', clues: ['He raps', 'He was born in Gwangju'], correct: 3 },
    ],
    related, triviaAvailable: true, dykFact: { fact: 'BTS means Bangtan Sonyeondan.', category: 'history' }, social: { comments: 4, reactions: 9 },
    inThisQuiz: { contextLine: 'This quiz covers the early years', topicsLine: 'members, debut and the first albums' } as never,
    creatorNote: 'Made for the ARMYs who read the liner notes.',
    breadcrumbItems: [{ label: 'Home', href: '/' }, { label: 'BTS', href: '/bts-quiz' }, { label: quiz.title }],
    quizJsonLd: { '@context': 'https://schema.org', '@type': 'Quiz', name: quiz.title },
  });

  it('quiz page, five related quizzes of the same group', async () => {
    flags.__v12 = false;
    const { renderUxQuizPage } = await import('@/app/(site)/q/[slug]/ux-page');
    await check('quiz-page', await renderUxQuizPage(args([2, 3, 4, 5, 6].map((i) => quizRow(i)))));
  });

  it('quiz page, v12, related quizzes of other groups and no trivia', async () => {
    flags.__v12 = true;
    const { renderUxQuizPage } = await import('@/app/(site)/q/[slug]/ux-page');
    const other = [2, 3, 4, 5, 6].map((i) => quizRow(i, { group_slug: i % 2 ? 'twice' : 'bts', group_name: i % 2 ? 'TWICE' : 'BTS' }));
    await check('quiz-page-mixed', await renderUxQuizPage({ ...args(other), triviaAvailable: false, dykFact: null, creatorNote: null, inThisQuiz: null }));
  });
});
