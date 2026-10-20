// Run O1, lot (e) part 1 (K1): the daily publish cron per site. The kpop build keeps today's call (ensure_daily_quiz with
// p_date only, same response); another build calls ensure_daily_quiz_v2 with its site id; with the rotation switch on, the
// store is the build's site.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  rpcs: [] as Array<{ fn: string; args: unknown }>,
  rpcError: null as string | null,
  eqs: [] as Array<[string, unknown]>,
}));

vi.mock('@/lib/cron-auth', () => ({ isCronAuthorized: () => true }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args: unknown) => {
      state.rpcs.push({ fn, args });
      return { data: 'quiz-of-the-day', error: state.rpcError ? { message: state.rpcError } : null };
    },
    from: () => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = (k: string, v: unknown) => { state.eqs.push([k, v]); return b; };
      b.limit = () => b;
      b.maybeSingle = async () => ({ data: { id: 'flagged-today' }, error: null });
      return b;
    },
  }),
}));

async function load(site: string, fix = ''): Promise<() => Promise<Response>> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('QOTD_ROTATION_FIX', fix);
  const { GET } = await import('./route');
  return () => GET(new NextRequest('https://example.test/api/cron/ensure-daily-quiz'));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T00:05:00Z'));
  state.rpcs = [];
  state.rpcError = null;
  state.eqs = [];
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('GET /api/cron/ensure-daily-quiz', () => {
  it('kpop build (site unset): ensure_daily_quiz with p_date only, the same response as before', async () => {
    const run = await load('');
    const res = await run();
    expect(state.rpcs).toEqual([{ fn: 'ensure_daily_quiz', args: { p_date: '2026-10-20' } }]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
  });

  it('kpop build named explicitly: the same call', async () => {
    const run = await load('kpop');
    await run();
    expect(state.rpcs).toEqual([{ fn: 'ensure_daily_quiz', args: { p_date: '2026-10-20' } }]);
  });

  it('anime build: ensure_daily_quiz_v2 with p_site anime', async () => {
    const run = await load('anime');
    const res = await run();
    expect(state.rpcs).toEqual([{ fn: 'ensure_daily_quiz_v2', args: { p_date: '2026-10-20', p_site: 'anime' } }]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
  });

  it('an RPC error answers 500 with its message on both builds', async () => {
    state.rpcError = 'boom';
    for (const site of ['', 'anime']) {
      const res = await (await load(site))();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'boom' });
    }
  });

  it('rotation switch on, anime build: the store filters on site anime (an existing flagged quiz is answered, no RPC)', async () => {
    const run = await load('anime', '1');
    const res = await run();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: '2026-10-20', method: 'existing', quiz_id: 'flagged-today' });
    expect(state.eqs).toContainEqual(['site_id', 'anime']);
    expect(state.rpcs).toEqual([]);
  });

  it('rotation switch on, kpop build: no site filter while SITE_SCOPE is off', async () => {
    const run = await load('', '1');
    await run();
    expect(state.eqs.filter(([k]) => k === 'site_id')).toEqual([]);
  });
});
