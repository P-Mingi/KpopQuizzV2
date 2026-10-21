// Run O1, C2 fix S5: editing an anime quiz recomputes its spoiler level from the new questions (computeSpoilerLevel,
// as create does); the kpop build sends today's update payload, with no spoiler column.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const db = vi.hoisted(() => ({ updates: [] as Array<Record<string, unknown>>, arcs: [] as Array<{ ord: number }> }));

function builder(table: string): unknown {
  const b: Record<string, unknown> = {};
  const self = (): unknown => b;
  for (const m of ['select', 'eq']) b[m] = self;
  b.update = (row: Record<string, unknown>) => { db.updates.push(row); return b; };
  const one = async (): Promise<{ data: unknown; error: null }> => ({
    data: table === 'quizzes' ? { id: 'q1', creator_id: 'u1', slug: 'a-quiz', status: 'draft', groups: { slug: 'a-group' } } : null,
    error: null,
  });
  b.single = one;
  b.maybeSingle = one;
  b.then = (resolve: (v: unknown) => void) => resolve({ data: table === 'arcs' ? db.arcs : null, error: null });
  return b;
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) }, from: (t: string) => builder(t) }),
}));
vi.mock('@/lib/quiz-validation', () => ({ validateQuestions: () => [] }));
vi.mock('@/lib/seo/quiz-freshness', () => ({ onQuizChanged: () => undefined }));

const QUESTIONS = [
  { question: 'early', spoiler: { arc: 1, scope: 'anime' } },
  { question: 'late', spoiler: { arc: 6, scope: 'both' } },
  { question: 'untagged' },
];

async function put(site: 'anime' | 'kpop', questions: unknown[]): Promise<Response> {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (site === 'anime') vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
  const { PUT } = await import('./route');
  const req = new NextRequest('https://x.test/api/quiz/q1', {
    method: 'PUT', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'A fine quiz title', quiz_type: 'true_false', group_id: 7, settings: {}, questions }),
  });
  return PUT(req, { params: Promise.resolve({ id: 'q1' }) });
}

beforeEach(() => { db.updates = []; db.arcs = []; });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('PUT /api/quiz/[id]', () => {
  it('anime: the update carries the level of the new questions (latest arc, both scopes)', async () => {
    const res = await put('anime', QUESTIONS);
    expect(res.status).toBe(200);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).toMatchObject({ spoiler_arc_ord: 6, spoiler_scope: 'both' });
  });

  it('anime: an arc of the series that is manga only turns the scope to manga', async () => {
    db.arcs = [{ ord: 6 }];
    await put('anime', QUESTIONS);
    expect(db.updates[0]).toMatchObject({ spoiler_arc_ord: 6, spoiler_scope: 'manga' });
  });

  it('anime: a quiz edited down to untagged questions goes back to spoiler free', async () => {
    await put('anime', [{ question: 'a' }, { question: 'b' }]);
    expect(db.updates[0]).toMatchObject({ spoiler_arc_ord: 0, spoiler_scope: null });
  });

  it('kpop: today\'s update payload, no spoiler column', async () => {
    const res = await put('kpop', QUESTIONS);
    expect(res.status).toBe(200);
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).not.toHaveProperty('spoiler_arc_ord');
    expect(db.updates[0]).not.toHaveProperty('spoiler_scope');
    expect(Object.keys(db.updates[0]!).sort()).toEqual(
      ['cover_image_url', 'difficulty', 'group_id', 'questions', 'quiz_type', 'settings', 'title', 'updated_at'],
    );
  });
});
