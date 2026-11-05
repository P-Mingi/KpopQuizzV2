// A player deletes their own quiz (2026-11-03, session B): the owner check runs on the player's session, the write on the
// service role, scoped to the quiz and its creator. On the player's session Postgres refused it: the only SELECT policy of
// quizzes shows published rows and is checked on the updated row ('removed').
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type Call = { client: 'player' | 'service'; table: string; update?: Record<string, unknown>; eqs: Array<[string, unknown]> };

const db = vi.hoisted(() => ({
  calls: [] as Call[],
  user: { id: 'u1' } as { id: string } | null,
  row: { id: 'q1', creator_id: 'u1', status: 'published', slug: 'a-quiz', groups: { slug: 'a-group' } } as Record<string, unknown> | null,
  updateError: null as { message: string } | null,
}));

function builder(client: Call['client'], table: string): unknown {
  const call: Call = { client, table, eqs: [] };
  db.calls.push(call);
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = (col: string, v: unknown) => { call.eqs.push([col, v]); return b; };
  b.update = (row: Record<string, unknown>) => { call.update = row; return b; };
  b.maybeSingle = async () => ({ data: db.row, error: null });
  b.then = (resolve: (v: unknown) => void) => resolve({ data: null, error: db.updateError });
  return b;
}
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({ auth: { getUser: async () => ({ data: { user: db.user } }) }, from: (t: string) => builder('player', t) }),
  createServiceRoleClient: () => ({ from: (t: string) => builder('service', t) }),
}));
vi.mock('@/lib/quiz-validation', () => ({ validateQuestions: () => [] }));
vi.mock('@/lib/seo/quiz-freshness', () => ({ onQuizChanged: () => undefined }));

async function del(): Promise<Response> {
  const { DELETE } = await import('./route');
  return DELETE(new NextRequest('https://x.test/api/quiz/q1', { method: 'DELETE' }), { params: Promise.resolve({ id: 'q1' }) });
}
const updates = (): Call[] => db.calls.filter((c) => c.update);

beforeEach(() => {
  db.calls = []; db.user = { id: 'u1' }; db.updateError = null;
  db.row = { id: 'q1', creator_id: 'u1', status: 'published', slug: 'a-quiz', groups: { slug: 'a-group' } };
});
afterEach(() => { vi.resetModules(); });

describe('DELETE /api/quiz/[id]', () => {
  it('the creator: 200, one update to removed on the service role, scoped to the quiz and its creator', async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(updates()).toHaveLength(1);
    const [u] = updates();
    expect(u!.client).toBe('service');
    expect(u!.table).toBe('quizzes');
    expect(u!.update).toMatchObject({ status: 'removed' });
    expect(u!.eqs).toEqual([['id', 'q1'], ['creator_id', 'u1']]);
  });

  it('the owner check reads the quiz on the player session, never on the service role', async () => {
    await del();
    const reads = db.calls.filter((c) => !c.update);
    expect(reads.map((c) => c.client)).toEqual(['player']);
  });

  it('another player: 403 and no write', async () => {
    db.user = { id: 'u2' };
    expect((await del()).status).toBe(403);
    expect(updates()).toEqual([]);
  });

  it('signed out: 401 and no write', async () => {
    db.user = null;
    expect((await del()).status).toBe(401);
    expect(updates()).toEqual([]);
  });

  it('a quiz the player cannot see: 404 and no write', async () => {
    db.row = null;
    expect((await del()).status).toBe(404);
    expect(updates()).toEqual([]);
  });

  it('already removed: 200 and no write', async () => {
    db.row = { ...db.row!, status: 'removed' };
    const res = await del();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ alreadyRemoved: true });
    expect(updates()).toEqual([]);
  });

  it('a failed write: 500', async () => {
    db.updateError = { message: 'boom' };
    expect((await del()).status).toBe(500);
  });
});
