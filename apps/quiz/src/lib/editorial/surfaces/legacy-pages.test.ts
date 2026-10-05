// V12 F5c: the pages still in the old design. Server free: Supabase is a recording
// fake, so each test also proves which tables a render reads.
//   /blindtest/leaderboard  flag on: the editorial account leaves the board, ranks
//                           close up; flag off: every row, and editorial_accounts
//                           is never read.
//   /new /trending /most-liked /search quiz cards: with the v12 flag on (which needs
//                           NEXT_PUBLIC_UX_V1) every legacy card delegates to the
//                           v11 card, which names no author, so no level or fan
//                           title of an editorial author can show; flags off: the
//                           legacy card, author and fan title as today.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { boardWithoutTeam } from './daily-board';

import type { QuizCardData } from '@/lib/db/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }), usePathname: () => '/new' }));
vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));

const reads: string[] = [];
const fake = vi.hoisted(() => ({ rows: {} as Record<string, unknown[]> }));
function chain(table: string): unknown {
  const result = (): { data: unknown[]; error: null; count: null; status: number } => ({ data: fake.rows[table] ?? [], error: null, count: null, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
      return () => proxy;
    },
  });
  return proxy;
}
const client = { from: (t: string) => { reads.push(t); return chain(t); }, rpc: (fn: string) => { reads.push(`rpc:${fn}`); return chain(`rpc:${fn}`); } };
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => client,
  createPublicReadClient: () => client,
  createServerClient: async () => client,
}));

const MINA = '11111111-1111-4111-8111-111111111111';
const FAN1 = '22222222-2222-4222-8222-222222222222';
const FAN2 = '33333333-3333-4333-8333-333333333333';

function flags(v1: boolean, v12: boolean): void {
  vi.resetModules();
  reads.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', v1 ? '1' : '');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
  fake.rows = {
    editorial_accounts: [{ user_id: MINA, display_name: 'Mina K', beat: 'News', active: true }],
    'rpc:get_daily_bt_leaderboard': [
      { rank: 1, user_id: MINA, username: 'mina_team', display_name: 'Mina K', avatar_url: null, score: 10, time_ms: 41000 },
      { rank: 2, user_id: FAN1, username: 'fan_one', display_name: null, avatar_url: null, score: 9, time_ms: 52000 },
      { rank: 3, user_id: FAN2, username: 'fan_two', display_name: null, avatar_url: null, score: 7, time_ms: 60000 },
    ],
    daily_blindtests: [{ date: '2026-09-01' }],
  };
}

afterEach(() => { vi.unstubAllEnvs(); });

describe('boardWithoutTeam', () => {
  const rows = [
    { rank: 1, user_id: 'a' }, { rank: 2, user_id: 't' }, { rank: 3, user_id: 'b' }, { rank: 3, user_id: 'c' }, { rank: 5, user_id: 'd' },
  ];
  it('drops the team rows and closes the ranks up, ties kept', () => {
    expect(boardWithoutTeam(rows, new Set(['t']))).toEqual([
      { rank: 1, user_id: 'a' }, { rank: 2, user_id: 'b' }, { rank: 2, user_id: 'c' }, { rank: 4, user_id: 'd' },
    ]);
  });
  it('a team row tied with a fan does not move the fan', () => {
    expect(boardWithoutTeam([{ rank: 1, user_id: 't' }, { rank: 1, user_id: 'a' }, { rank: 3, user_id: 'b' }], new Set(['t'])))
      .toEqual([{ rank: 1, user_id: 'a' }, { rank: 2, user_id: 'b' }]);
  });
  it('null or empty team: the very same array', () => {
    expect(boardWithoutTeam(rows, null)).toBe(rows);
    expect(boardWithoutTeam(rows, new Set())).toBe(rows);
    expect(boardWithoutTeam(rows, new Set(['zz']))).toBe(rows);
  });
});

async function renderBoard(): Promise<string> {
  const { default: Page } = await import('@/app/(site)/blindtest/leaderboard/page');
  return renderToStaticMarkup(await Page({ searchParams: Promise.resolve({}) }));
}

describe('/blindtest/leaderboard', () => {
  it('v12 on: the editorial account is left out, the fans rank 1 and 2', async () => {
    flags(true, true);
    const html = await renderBoard();
    expect(reads).toContain('editorial_accounts');
    expect(html).not.toContain('Mina K');
    expect(html).not.toContain('/u/mina_team');
    expect(html).toMatch(/>1<\/span><a [^>]*href="\/u\/fan_one"/);
    expect(html).toMatch(/>2<\/span><a [^>]*href="\/u\/fan_two"/);
  });
  for (const [label, v1] of [['both flags off', false], ['v11 only', true]] as const) {
    it(`${label}: every row as today and no editorial read`, async () => {
      flags(v1, false);
      const html = await renderBoard();
      expect(reads).not.toContain('editorial_accounts');
      expect(reads.sort()).toEqual(['daily_blindtests', 'rpc:get_daily_bt_leaderboard']);
      expect(html).toMatch(/>1<\/span><a [^>]*href="\/u\/mina_team"/);
      expect(html).toMatch(/>2<\/span><a [^>]*href="\/u\/fan_one"/);
      expect(html).toMatch(/>3<\/span><a [^>]*href="\/u\/fan_two"/);
    });
  }
});

/** A quiz authored by the editorial account, with the XP a fan title would show. */
const TEAM_QUIZ = {
  id: 'q1', title: 'How well do you know BTS eras', slug: 'bts-eras', quiz_type: 'multiple_choice', difficulty: 'medium', language: 'en',
  play_count: 120, total_score_sum: 600, total_completions: 10, like_count: 4, created_at: '2026-09-30T10:00:00Z',
  group_name: 'BTS', group_slug: 'bts', display_color: '#7c5cfc', text_color: '#ffffff', logo_url: null, fandom_name: 'ARMY',
  creator_username: 'mina_team', creator_avatar_url: null, creator_avatar_bg: '#222', creator_avatar_text: '#fff', creator_xp: 50000,
  question_count: 10, cover_image_url: null,
} as unknown as QuizCardData;

async function renderCards(): Promise<string[]> {
  const [a, b, list] = await Promise.all([
    import('@/components/quiz/quiz-card'), import('@/components/ui/quiz-card'), import('@/components/home/infinite-quiz-list'),
  ]);
  return [
    renderToStaticMarkup(createElement(a.QuizCard, { quiz: TEAM_QUIZ })),
    renderToStaticMarkup(createElement(b.QuizCard, { quiz: TEAM_QUIZ })),
    renderToStaticMarkup(createElement(list.InfiniteQuizList, { initialQuizzes: [TEAM_QUIZ], fetchUrl: '/api/quizzes?tab=new' })),
  ];
}

describe('legacy quiz cards (/new, /trending, /most-liked, /search)', () => {
  it('v12 on: the editorial author is not named, so no level and no fan title', async () => {
    flags(true, true);
    for (const html of await renderCards()) {
      expect(html).toContain('href="/q/bts-eras"');
      expect(html).toContain('ux-qcard');
      expect(html).not.toContain('mina_team');
      expect(html).not.toMatch(/Lv\b|quiz-author|fan-title/);
    }
    expect(reads).toEqual([]);
  });
  it('both flags off: the legacy cards as today, author and fan title, no read', async () => {
    flags(false, false);
    const [a, b, list] = await renderCards();
    expect(a).toContain('mina_team');
    expect(a).not.toContain('ux-qcard');
    expect(b).toContain('quiz-author');
    expect(b).toContain('mina_team');
    expect(list).toContain('mina_team');
    expect(reads).toEqual([]);
  });
});
