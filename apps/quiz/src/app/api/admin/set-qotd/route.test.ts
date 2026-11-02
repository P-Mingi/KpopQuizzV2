// Run O1, lot (e) part 1 (K1): /api/admin/set-qotd per site. The kpop build writes what it wrote (same filters, same row,
// no site_id) and the log upsert now keys on (site_id, featured_date); the anime build scopes the unflagging, the flagging and
// the log row to site anime.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

interface Call { table: string; op: string; arg?: unknown; opts?: unknown; filters: Array<[string, unknown]> }
const state = vi.hoisted(() => ({ calls: [] as Array<{ table: string; op: string; arg?: unknown; opts?: unknown; filters: Array<[string, unknown]> }>, user: null as { id: string } | null }));

// ADMIN-1: the real guard (lib/admin/guard.ts): admin-user is the listed admin (ADMIN_USER_IDS below), its session at aal2.
vi.mock('@/lib/supabase/server', async () => ({
  createServerClient: async () => ({ auth: (await import('@/lib/admin/test-support')).stubAuth(() => ({ user: state.user })) }),
  createServiceRoleClient: () => ({
    from(table: string) {
      const c = { table, op: 'select', filters: [] as Array<[string, unknown]> } as { table: string; op: string; arg?: unknown; opts?: unknown; filters: Array<[string, unknown]> };
      state.calls.push(c);
      const b: Record<string, unknown> = {};
      b.update = (arg: unknown) => { c.op = 'update'; c.arg = arg; return b; };
      b.upsert = (arg: unknown, opts: unknown) => { c.op = 'upsert'; c.arg = arg; c.opts = opts; return Promise.resolve({ data: null, error: null }); };
      b.eq = (k: string, v: unknown) => { c.filters.push([k, v]); return b; };
      b.then = (ok: (v: unknown) => unknown) => ok({ data: null, error: null });
      return b;
    },
  }),
}));

async function post(site: string, body: unknown): Promise<Response> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('ADMIN_USER_IDS', 'admin-user');
  const { POST } = await import('./route');
  return POST(new NextRequest('https://example.test/api/admin/set-qotd', { method: 'POST', body: JSON.stringify(body) }));
}

beforeEach(() => { state.calls = []; state.user = { id: 'admin-user' }; });
afterEach(() => { vi.unstubAllEnvs(); });

describe('POST /api/admin/set-qotd', () => {
  it('a non-admin gets the admin 404 (ADMIN-1: never a 401 or 403) and nothing is written', async () => {
    state.user = { id: 'some-fan' };
    expect((await post('', { quiz_id: 'q1', date: '2026-10-20' })).status).toBe(404);
    expect(state.calls).toEqual([]);
  });

  it('kpop build: the three writes of today (no site_id), the log upsert keyed on site_id,featured_date', async () => {
    const res = await post('', { quiz_id: 'q1', date: '2026-10-20' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    const calls = state.calls as Call[];
    expect(calls.map((c) => `${c.table}:${c.op}`)).toEqual(['quizzes:update', 'quizzes:update', 'qotd_log:upsert']);
    expect(calls[0]).toMatchObject({ arg: { is_quiz_of_the_day: false, quiz_of_the_day_date: null }, filters: [['quiz_of_the_day_date', '2026-10-20']] });
    expect(calls[1]).toMatchObject({ arg: { is_quiz_of_the_day: true, quiz_of_the_day_date: '2026-10-20' }, filters: [['id', 'q1']] });
    expect(calls[2]!.arg).toEqual({ quiz_id: 'q1', featured_date: '2026-10-20', selection_method: 'manual', score: null });
    expect(calls[2]!.opts).toEqual({ onConflict: 'site_id,featured_date' });
  });

  it('anime build: the unflagging and the flagging carry site_id anime, the log row is filed under anime', async () => {
    const res = await post('anime', { quiz_id: 'q1', date: '2026-10-20' });
    expect(res.status).toBe(200);
    const calls = state.calls as Call[];
    expect(calls[0]!.filters).toEqual([['site_id', 'anime'], ['quiz_of_the_day_date', '2026-10-20']]);
    expect(calls[1]!.filters).toEqual([['site_id', 'anime'], ['id', 'q1']]);
    expect(calls[2]!.arg).toEqual({ quiz_id: 'q1', featured_date: '2026-10-20', selection_method: 'manual', score: null, site_id: 'anime' });
    expect(calls[2]!.opts).toEqual({ onConflict: 'site_id,featured_date' });
  });

  it('a missing field is a 400 on both builds', async () => {
    for (const site of ['', 'anime']) expect((await post(site, { quiz_id: 'q1' })).status).toBe(400);
    expect(state.calls).toEqual([]);
  });
});
