// Run O1, lot (e) part 2 (E1a): the admin quiz tools read and write the build's site. On kpop with SITE_SCOPE off no
// query carries a site (today's queries); on the anime build every read and update of quizzes and reports does.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from '@/lib/site/test-recorder';

import type { RecordingDb } from '@/lib/site/test-recorder';

const state = vi.hoisted(() => ({ site: 'kpop', db: null as unknown }));
const dbOf = (): RecordingDb => state.db as RecordingDb;

vi.mock('@/lib/site/registry', async (orig) => ({ ...(await orig<typeof import('@/lib/site/registry')>()), get SITE_ID() { return state.site; } }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => state.db, createServiceRoleClient: () => state.db }));
vi.mock('@/lib/admin', () => ({ isAdmin: (id: string) => id === 'admin-1' }));
vi.mock('@/lib/seo/quiz-freshness', () => ({ onQuizChanged: () => undefined }));

import { GET as listQuizzes } from './quizzes/route';
import { GET as searchQuizzes } from './search-quizzes/route';
import { GET as getQuiz, PATCH as patchQuiz } from './quiz/[id]/route';
import { POST as setDifficulty } from './quiz/[id]/difficulty/route';
import { POST as removeQuiz } from './quiz/[id]/remove/route';
import { POST as restoreQuiz } from './quiz/[id]/restore/route';

const ctx = { params: Promise.resolve({ id: 'q-1' }) };
const get = (path: string): NextRequest => new NextRequest(`http://localhost${path}`);
const post = (path: string, body: unknown = {}): NextRequest => new NextRequest(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body) });
const patch = (path: string, body: unknown): NextRequest => new NextRequest(`http://localhost${path}`, { method: 'PATCH', body: JSON.stringify(body) });

beforeEach(() => {
  delete process.env.SITE_SCOPE;
  state.db = recordingDb({ quizzes: [], reports: [], profiles: [] });
});
afterEach(() => { delete process.env.SITE_SCOPE; });

const CASES: Array<[string, () => Promise<unknown>, string]> = [
  ['GET /api/admin/quizzes', () => listQuizzes(get('/api/admin/quizzes')), 'quizzes'],
  ['GET /api/admin/search-quizzes', () => searchQuizzes(get('/api/admin/search-quizzes?q=death')), 'quizzes'],
  ['GET /api/admin/quiz/[id]', () => getQuiz(get('/api/admin/quiz/q-1'), ctx), 'quizzes'],
  ['PATCH /api/admin/quiz/[id]', () => patchQuiz(patch('/api/admin/quiz/q-1', { title: 'New title', questions: [{ question: 'q', spoiler: { arc: 2, scope: 'anime' } }] }), ctx), 'quizzes'],
  ['POST difficulty', () => setDifficulty(post('/api/admin/quiz/q-1/difficulty', { difficulty: 'hard' }), ctx), 'quizzes'],
  ['POST remove', () => removeQuiz(post('/api/admin/quiz/q-1/remove'), ctx), 'quizzes'],
  ['POST restore', () => restoreQuiz(post('/api/admin/quiz/q-1/restore'), ctx), 'quizzes'],
];

describe('admin quiz routes, kpop build with SITE_SCOPE off', () => {
  for (const [name, call, table] of CASES) {
    it(`${name} sends no site filter`, async () => {
      state.site = 'kpop';
      await call();
      expect(dbOf().queries.some((q) => q.table === table)).toBe(true);
      expect(dbOf().calls(table, 'eq').some((a) => a[0] === 'site_id')).toBe(false);
    });
  }

  it('the PATCH payload is today\'s: no spoiler column, no site', async () => {
    state.site = 'kpop';
    await patchQuiz(patch('/api/admin/quiz/q-1', { title: 'T', questions: [{ question: 'q' }] }), ctx);
    const upd = dbOf().calls('quizzes', 'update')[0]![0] as Record<string, unknown>;
    expect(Object.keys(upd).sort()).toEqual(['question_count', 'questions', 'title', 'updated_at']);
  });

  it('remove resolves the reports without a site filter', async () => {
    state.site = 'kpop';
    await removeQuiz(post('/api/admin/quiz/q-1/remove'), ctx);
    expect(dbOf().calls('reports', 'eq').some((a) => a[0] === 'site_id')).toBe(false);
  });
});

describe('admin quiz routes, kpop build with SITE_SCOPE on', () => {
  it('filters on kpop', async () => {
    state.site = 'kpop';
    process.env.SITE_SCOPE = '1';
    await listQuizzes(get('/api/admin/quizzes'));
    expect(dbOf().scopedTo('quizzes', 'kpop')).toBe(true);
  });
});

describe('admin quiz routes, anime build', () => {
  for (const [name, call, table] of CASES) {
    it(`${name} is scoped to anime`, async () => {
      state.site = 'anime';
      await call();
      expect(dbOf().scopedTo(table, 'anime')).toBe(true);
      expect(dbOf().scopedTo(table, 'kpop')).toBe(false);
    });
  }

  it('remove scopes the quiz update and the reports update', async () => {
    state.site = 'anime';
    await removeQuiz(post('/api/admin/quiz/q-1/remove'), ctx);
    expect(dbOf().scopedTo('quizzes', 'anime')).toBe(true);
    expect(dbOf().scopedTo('reports', 'anime')).toBe(true);
  });

  it('PATCH recomputes the spoiler level from the tags and updates only a quiz of the site', async () => {
    state.site = 'anime';
    state.db = recordingDb({ quizzes: { group_id: 7 }, arcs: [] });
    await patchQuiz(patch('/api/admin/quiz/q-1', { questions: [{ question: 'a', spoiler: { arc: 3, scope: 'anime' } }, { question: 'b', spoiler: { arc: 1, scope: 'both' } }] }), ctx);
    const upd = dbOf().calls('quizzes', 'update')[0]![0] as Record<string, unknown>;
    expect(upd.spoiler_arc_ord).toBe(3);
    expect(upd.spoiler_scope).toBe('both');
    expect(dbOf().scopedTo('quizzes', 'anime')).toBe(true);
  });

  it('a non admin is refused before any query', async () => {
    state.site = 'anime';
    state.db = recordingDb({}, {}, 'someone');
    const res = await listQuizzes(get('/api/admin/quizzes')) as Response;
    expect(res.status).toBe(403);
    expect(dbOf().queries).toHaveLength(0);
  });
});
