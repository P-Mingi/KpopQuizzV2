// Run O1, lot (e) part 1 (K1): the admin quiz bank routes per site. The kpop build sends today's queries (no site_id while
// SITE_SCOPE is off); the anime build reads and writes only its own bank rows.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

interface Call { table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> }
const state = vi.hoisted(() => ({
  calls: [] as Array<{ table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> }>,
  bank: [] as unknown[],
}));

// ADMIN-1: the real guard (lib/admin/guard.ts): admin-user is the listed admin (ADMIN_USER_IDS below), its session at aal2.
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: { id: 'admin-user' } })) }),
  createServiceRoleClient: () => ({
    from(table: string) {
      const c = { table, op: 'select', filters: [] as Array<[string, unknown]> } as { table: string; op: string; arg?: unknown; filters: Array<[string, unknown]> };
      state.calls.push(c);
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.update = (arg: unknown) => { c.op = 'update'; c.arg = arg; return b; };
      b.delete = () => { c.op = 'delete'; return b; };
      for (const m of ['eq', 'neq']) b[m] = (k: string, v: unknown) => { c.filters.push([k, v]); return b; };
      b.single = async () => ({ data: { id: 'b1' }, error: null });
      b.then = (ok: (v: unknown) => unknown) => ok({ data: table === 'quiz_bank' && c.op === 'select' ? state.bank : null, error: null });
      return b;
    },
  }),
}));

async function site(id: string): Promise<void> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', id);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('QOTD_ROTATION_FIX', '');
  vi.stubEnv('ADMIN_USER_IDS', 'admin-user');
}
const req = (url: string, method: string, body?: unknown): NextRequest =>
  new NextRequest(`https://example.test${url}`, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
const ctx = { params: Promise.resolve({ id: 'b1' }) };

beforeEach(() => { state.calls = []; state.bank = []; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('PATCH and DELETE /api/admin/quiz-bank/[id]', () => {
  it('kpop build: the update and the delete filter on the id only', async () => {
    await site('');
    const { PATCH, DELETE } = await import('./[id]/route');
    expect((await PATCH(req('/api/admin/quiz-bank/b1', 'PATCH', { status: 'verified' }), ctx)).status).toBe(200);
    expect((await DELETE(req('/api/admin/quiz-bank/b1', 'DELETE'), ctx)).status).toBe(200);
    const calls = state.calls as Call[];
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['quiz_bank:update', 'quiz_bank:delete']);
    expect(calls.map((c) => c.filters)).toEqual([[['id', 'b1']], [['id', 'b1']]]);
    expect(calls[0]!.arg).toMatchObject({ status: 'verified' });
  });

  it('anime build: both carry site_id anime, so an id of another site matches nothing', async () => {
    await site('anime');
    const { PATCH, DELETE } = await import('./[id]/route');
    await PATCH(req('/api/admin/quiz-bank/b1', 'PATCH', { status: 'verified' }), ctx);
    await DELETE(req('/api/admin/quiz-bank/b1', 'DELETE'), ctx);
    expect((state.calls as Call[]).map((c) => c.filters)).toEqual([[['site_id', 'anime'], ['id', 'b1']], [['site_id', 'anime'], ['id', 'b1']]]);
  });
});

describe('POST /api/admin/quiz-bank/auto-schedule', () => {
  const unscheduled = [
    { id: 'u1', title: 'A', group_id: 1, category: 'fun', scheduled_date: null, status: 'verified', quiz_type: 'multiple_choice' },
    { id: 'u2', title: 'B', group_id: 2, category: 'era', scheduled_date: null, status: 'verified', quiz_type: 'multiple_choice' },
  ];

  it('kpop build: reads the bank without a site filter and updates each row by id', async () => {
    await site('');
    state.bank = unscheduled;
    const { POST } = await import('./auto-schedule/route');
    const res = await POST(req('/api/admin/quiz-bank/auto-schedule', 'POST', { start_date: '2026-11-01' }));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { scheduled: number }).scheduled).toBe(2);
    const calls = state.calls as Call[];
    expect(calls[0]).toMatchObject({ table: 'quiz_bank', op: 'select', filters: [['status', 'published']] });
    expect(calls.slice(1).map((c) => c.filters.map((f) => f[0]))).toEqual([['id'], ['id']]);
  });

  it('anime build: the read and every update are scoped to site anime', async () => {
    await site('anime');
    state.bank = unscheduled;
    const { POST } = await import('./auto-schedule/route');
    expect((await POST(req('/api/admin/quiz-bank/auto-schedule', 'POST', { start_date: '2026-11-01' }))).status).toBe(200);
    const calls = state.calls as Call[];
    expect(calls[0]!.filters).toEqual([['site_id', 'anime'], ['status', 'published']]);
    expect(calls.slice(1).map((c) => c.filters[0])).toEqual([['site_id', 'anime'], ['site_id', 'anime']]);
  });
});
