// Run O1, lot (e) part 2 (E1a): POST /api/quiz/create. On the kpop build the quiz goes through create_quiz_bypass and the XP
// through award_xp with today's arguments; on the anime build the row is inserted with site_id anime and its spoiler level,
// the XP goes to award_world_xp, and a group of another site is refused.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

import type { RecordedQuery, RecordingDb } from '@/lib/site/test-recorder';

const state = vi.hoisted(() => ({ site: 'kpop', db: null as unknown, ownGroup: true }));
const dbOf = (): RecordingDb => state.db as RecordingDb;

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => state.db, createServiceRoleClient: () => state.db }));
vi.mock('@/lib/seo/quiz-freshness', () => ({ onQuizChanged: () => undefined }));
vi.mock('@/lib/features', () => ({ COMMUNITY_FEATURES_ENABLED: false }));

import { POST } from './route';

function fresh(): RecordingDb {
  return recordingDb(
    {
      groups: (r: RecordedQuery) => (r.ops.some(([m, a]) => m === 'eq' && a[0] === 'id') && !state.ownGroup ? null : { id: 7, slug: 'death-note' }),
      quizzes: (r: RecordedQuery) => (r.ops.some(([m]) => m === 'insert') ? { id: 'quiz-1', slug: 'my-new-quiz' } : null),
      profiles: { total_quizzes_created: 3, total_plays_received: 0 },
    },
    { create_quiz_bypass: { id: 'quiz-1', slug: 'my-new-quiz' }, award_xp: 125, award_world_xp: 125 },
    'user-1',
  );
}

const QUESTIONS = [
  { question: 'Who wrote the name?', options: ['Light', 'L', 'Ryuk', 'Misa'], correct: 0, kind: 'character', spoiler: { arc: 2, scope: 'anime' } },
  { question: 'Which notebook?', options: ['Death Note', 'Diary', 'Ledger', 'Atlas'], correct: 0, kind: 'lore', spoiler: { arc: 0, scope: 'both' } },
  { question: 'What does Ryuk love?', options: ['Apples', 'Pears', 'Grapes', 'Plums'], correct: 0, kind: 'character', spoiler: { arc: 0, scope: 'both' } },
];

function request(over: Record<string, unknown> = {}): NextRequest {
  return new NextRequest('http://localhost/api/quiz/create', {
    method: 'POST',
    body: JSON.stringify({
      title: 'My new quiz about notebooks', quiz_type: 'multiple_choice', difficulty: 'medium', group_id: 7, questions: QUESTIONS,
      settings: { timer: true, shuffle: true, show_answers: false, timer_seconds: 15 }, ...over,
    }),
  });
}

beforeEach(() => {
  delete process.env.SITE_SCOPE;
  state.ownGroup = true;
  state.db = fresh();
});

describe('POST /api/quiz/create on the kpop build', () => {
  it('creates through create_quiz_bypass with today\'s payload and awards XP with award_xp', async () => {
    state.site = 'kpop';
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 'quiz-1', slug: 'my-new-quiz' });
    const rpc = dbOf().rpcs.find((r) => r.fn === 'create_quiz_bypass')!;
    expect(Object.keys(rpc.args)).toEqual(['p_data']);
    expect(Object.keys(rpc.args.p_data as object).sort()).toEqual([
      'cover_image_url', 'creator_id', 'difficulty', 'group_id', 'language', 'question_count', 'questions', 'quiz_type', 'settings', 'slug', 'title',
    ]);
    expect(dbOf().calls('quizzes', 'insert')).toHaveLength(0);
    const xp = dbOf().rpcs.find((r) => r.fn === 'award_xp')!;
    expect(xp.args).toEqual({ p_user_id: 'user-1', p_amount: 25, p_reason: 'create' });
    expect(dbOf().rpcs.some((r) => r.fn === 'award_world_xp')).toBe(false);
  });

  it('sends no site filter on the group lookups (SITE_SCOPE off)', async () => {
    state.site = 'kpop';
    await POST(request({ group_id: undefined, group_name: 'Some Group' }));
    expect(dbOf().calls('groups', 'eq').some((a) => a[0] === 'site_id')).toBe(false);
  });

  it('a first quiz earns the bonus as before', async () => {
    state.site = 'kpop';
    state.db = recordingDb({ groups: { id: 7, slug: 'x' }, quizzes: null, profiles: { total_quizzes_created: 1, total_plays_received: 0 } }, { create_quiz_bypass: { id: 'q', slug: 's' } }, 'user-1');
    await POST(request());
    expect(dbOf().rpcs.find((r) => r.fn === 'award_xp')!.args.p_amount).toBe(75);
  });
});

describe('POST /api/quiz/create on the anime build', () => {
  beforeEach(() => { state.site = 'anime'; });

  it('inserts the quiz with site_id anime and the computed spoiler level, not through the rpc', async () => {
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: 'quiz-1', slug: 'my-new-quiz' });
    expect(dbOf().rpcs.some((r) => r.fn === 'create_quiz_bypass')).toBe(false);
    const row = dbOf().calls('quizzes', 'insert')[0]![0] as Record<string, unknown>;
    expect(row).toMatchObject({ site_id: 'anime', creator_id: 'user-1', group_id: 7, quiz_type: 'multiple_choice', question_count: 3, spoiler_arc_ord: 2, spoiler_scope: 'anime' });
  });

  it('earns XP on its own world through award_world_xp', async () => {
    await POST(request());
    const xp = dbOf().rpcs.find((r) => r.fn === 'award_world_xp')!;
    expect(xp.args).toEqual({ p_user: 'user-1', p_site: 'anime', p_amount: 25, p_reason: 'create' });
    expect(dbOf().rpcs.some((r) => r.fn === 'award_xp')).toBe(false);
  });

  it('scopes the group lookups to anime and files a new group under anime', async () => {
    state.db = recordingDb({ groups: (r: RecordedQuery) => (r.ops.some(([m]) => m === 'insert') ? { id: 9 } : null), quizzes: (r: RecordedQuery) => (r.ops.some(([m]) => m === 'insert') ? { id: 'q', slug: 's' } : null), profiles: { total_quizzes_created: 2, total_plays_received: 0 } }, {}, 'user-1');
    await POST(request({ group_id: undefined, group_name: 'Some New Series' }));
    expect(dbOf().scopedTo('groups', 'anime')).toBe(true);
    const grp = dbOf().calls('groups', 'insert')[0]![0] as Record<string, unknown>;
    expect(grp.site_id).toBe('anime');
  });

  it('refuses a group id that is not a group of the site (400, no insert)', async () => {
    state.ownGroup = false;
    const res = await POST(request());
    expect(res.status).toBe(400);
    expect(dbOf().calls('quizzes', 'insert')).toHaveLength(0);
    expect(dbOf().rpcs).toHaveLength(0);
  });
});
