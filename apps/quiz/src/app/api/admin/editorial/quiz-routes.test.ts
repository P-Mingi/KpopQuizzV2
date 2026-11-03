// Run O1, lot E1b: the quiz actions of the admin routes /api/admin/editorial (POST) and /api/admin/editorial/<id> (PATCH).
// With EDITORIAL_QUIZ off the routes answer as before the lane existed (bad_action, the generic path); with it on they paste,
// approve, spread and reject quizzes through the quiz pipeline; before SQL 012 they answer 503 quiz_not_live and write nothing.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN, GROUPS, NOW, draftFor, memoryQuizStore } from '@/lib/editorial/quiz/test-fixtures';

import type { MemoryQuizStore } from '@/lib/editorial/quiz/test-fixtures';

const state = vi.hoisted(() => ({ store: null as unknown, live: true, generic: [] as string[] }));
vi.mock('@/lib/editorial/admin-api', () => ({
  adminGate: async () => ({ ok: true, adminId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', store: {
    async getDraft(id: number) { state.generic.push(`getDraft:${id}`); return null; },
    async accounts() { return []; },
  } }),
  generateTemplateDrafts: async () => ({ created: 0, existing: 0, empty: [] }),
}));
vi.mock('@/lib/editorial/quiz/store', () => ({
  quizLaneLive: async () => state.live,
  supabaseQuizStore: () => state.store,
}));

import { PATCH } from './[id]/route';
import { POST } from './route';

const m = (): MemoryQuizStore => state.store as MemoryQuizStore;
const post = (body: unknown): NextRequest => new NextRequest('http://localhost/api/admin/editorial', { method: 'POST', body: JSON.stringify(body) });
const patch = (id: number | string, body: unknown): Promise<Response> => PATCH(new NextRequest(`http://localhost/api/admin/editorial/${id}`, { method: 'PATCH', body: JSON.stringify(body) }), { params: Promise.resolve({ id: String(id) }) });
const json = async (r: Response): Promise<Record<string, unknown>> => (await r.json()) as Record<string, unknown>;

beforeEach(() => {
  vi.setSystemTime(NOW);
  state.store = memoryQuizStore();
  state.live = true;
  state.generic = [];
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

const drafts = (n: number): unknown[] => Array.from({ length: n }, (_, i) => draftFor(GROUPS[i]!, i + 1));

describe('EDITORIAL_QUIZ off (the default): the routes are what they were', () => {
  it('every quiz action is a bad_action, nothing is read and nothing is written', async () => {
    for (const action of ['import_quizzes', 'approve_quizzes', 'schedule_quizzes', 'close_review_batch']) {
      const r = await POST(post({ action, drafts: drafts(1), ids: [1], id: 1, errors: 0 }));
      expect(r.status, action).toBe(400);
      expect(await json(r)).toEqual({ error: 'bad_action' });
    }
    expect(m().drafts).toHaveLength(0);
    expect(m().batches).toHaveLength(0);
  });

  it('a PATCH goes to the generic path (which cannot see a quiz draft)', async () => {
    const r = await patch(1, { action: 'approve', scheduled_at: '2026-11-05T10:00:00Z' });
    expect(r.status).toBe(404);
    expect(state.generic).toEqual(['getDraft:1']);
  });

  it('the flag set to anything but 1 or true is off', async () => {
    for (const v of ['0', 'false', '', 'yes']) {
      vi.stubEnv('EDITORIAL_QUIZ', v);
      expect((await POST(post({ action: 'import_quizzes', drafts: drafts(1) }))).status, v).toBe(400);
    }
  });
});

describe('EDITORIAL_QUIZ on', () => {
  beforeEach(() => { vi.stubEnv('EDITORIAL_QUIZ', '1'); });

  it('before SQL 012: 503 quiz_not_live, before any write', async () => {
    state.live = false;
    const r = await POST(post({ action: 'import_quizzes', drafts: drafts(2) }));
    expect(r.status).toBe(503);
    expect(await json(r)).toEqual({ error: 'quiz_not_live' });
    expect(m().drafts).toHaveLength(0);
  });

  it('the steps of the admin: paste, close the review (spread over days), spread again, reject', async () => {
    const imp = await POST(post({ action: 'import_quizzes', label: 'Batch 1', drafts: drafts(6) }));
    expect(imp.status).toBe(200);
    const impBody = await json(imp);
    expect((impBody.created as unknown[]).length).toBe(6);
    expect(impBody.rejected).toEqual([]);
    expect(impBody.batch).toMatchObject({ id: 1, label: 'Batch 1', size: 6, sample_size: 2, status: 'open' });

    const close = await POST(post({ action: 'close_review_batch', id: 1, errors: 0, days: 3 }));
    expect(close.status).toBe(200);
    const closed = await json(close);
    expect((closed.approved as unknown[]).length).toBe(6);
    expect(closed.batch).toMatchObject({ status: 'approved', errors: 0, reviewed_by: ADMIN });
    expect(m().drafts.every((d) => d.status === 'approved')).toBe(true);

    const spread = await POST(post({ action: 'schedule_quizzes', days: 6 }));
    expect(spread.status).toBe(200);
    expect(((await json(spread)).scheduled as unknown[]).length).toBe(6);

    const rej = await patch(1, { action: 'reject' });
    expect(rej.status).toBe(200);
    expect(m().drafts[0]!.status).toBe('rejected');
    expect(m().quizzes).toHaveLength(0); // the admin never publishes: only the cron does
  });

  it('PATCH approve gives a quiz draft a random time and does not take a date from the caller', async () => {
    await POST(post({ action: 'import_quizzes', drafts: drafts(1) }));
    const r = await patch(1, { action: 'approve', scheduled_at: '2020-01-01T00:00:00Z' });
    expect(r.status).toBe(200);
    const at = m().drafts[0]!.scheduled_at!;
    expect(at).not.toBe('2020-01-01T00:00:00.000Z');
    expect(Date.parse(at)).toBeGreaterThan(NOW);
  });

  it('PATCH on a draft that is not a quiz falls through to the generic path; edit is refused for a quiz', async () => {
    expect((await patch(99, { action: 'approve', scheduled_at: '2026-11-05T10:00:00Z' })).status).toBe(404);
    expect(state.generic).toEqual(['getDraft:99']);
    await POST(post({ action: 'import_quizzes', drafts: drafts(1) }));
    const r = await patch(1, { action: 'edit', draft: {} });
    expect(r.status).toBe(400);
    expect(await json(r)).toEqual({ error: 'quiz_not_editable' });
  });

  it('PATCH approve of a draft the rules block answers 422 with the reason', async () => {
    await POST(post({ action: 'import_quizzes', drafts: drafts(1) }));
    m().drafts[0]!.payload = { nope: true };
    const r = await patch(1, { action: 'approve' });
    expect(r.status).toBe(422);
    expect(await json(r)).toMatchObject({ error: 'bad_payload' });
  });

  it('bad input is a 400, never a write', async () => {
    expect((await POST(post({ action: 'approve_quizzes', ids: [] }))).status).toBe(400);
    expect((await POST(post({ action: 'approve_quizzes', ids: ['1'] }))).status).toBe(400);
    expect((await POST(post({ action: 'approve_quizzes', ids: [0] }))).status).toBe(400);
    expect((await POST(post({ action: 'close_review_batch', id: 'x', errors: 0 }))).status).toBe(400);
    expect((await POST(post({ action: 'close_review_batch', id: 1, errors: 'two' }))).status).toBe(400);
    expect((await POST(post({ action: 'import_quizzes', drafts: [] }))).status).toBe(400);
    expect(m().drafts).toHaveLength(0);
  });

  it('the other actions are still what they were', async () => {
    const r = await POST(post({ action: 'nonsense' }));
    expect(r.status).toBe(400);
    expect(await json(r)).toEqual({ error: 'bad_action' });
    const g = await POST(post({ action: 'generate' }));
    expect(g.status).toBe(200);
  });
});
