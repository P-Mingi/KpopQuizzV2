// Run O1, lot (e) part 1 (K1): the daily publish cron per site. The kpop build keeps today's call (ensure_daily_quiz with
// p_date only, same response); another build calls ensure_daily_quiz_v2 with its site id; with the rotation switch on, the
// store is the build's site. Mission U's bank status (open bank rows after the run, and the refill alert) counts the build's site only.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  rpcs: [] as Array<{ fn: string; args: unknown }>,
  rpcError: null as string | null,
  eqs: [] as Array<[string, unknown]>,
  // The quiz_bank rows the status count runs over; null = the count query answers no count (the status is left out of the response).
  bank: null as Array<{ site_id: string; status: string }> | null,
  inCalls: [] as Array<[string, unknown]>,
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
      const own: Array<[string, unknown]> = [];
      b.select = () => b;
      b.eq = (k: string, v: unknown) => { state.eqs.push([k, v]); own.push([k, v]); return b; };
      // The bank status count: .in('status', [...]) ends the chain. Rows are counted the way the database would: every eq on the
      // chain must match, and a row without a site filter on the chain counts whatever its site.
      b.in = async (k: string, v: unknown[]) => {
        state.inCalls.push([k, v]);
        if (state.bank === null) return { count: null, error: null };
        const rows = state.bank.filter((r) => v.includes(r.status) && own.every(([ek, ev]) => (r as Record<string, unknown>)[ek] === ev));
        return { count: rows.length, error: null };
      };
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
  state.bank = null;
  state.inCalls = [];
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

  // Mission U bank status, per site (Run O1): main's response gains bank_open and, under 30 open rows, refill_alert.
  const rows = (site: string, status: string, n: number): Array<{ site_id: string; status: string }> => Array.from({ length: n }, () => ({ site_id: site, status }));

  it('kpop build: the status is main\'s exact query (no site filter) and main\'s response shape', async () => {
    state.bank = [...rows('kpop', 'verified', 25), ...rows('kpop', 'scheduled', 10), ...rows('kpop', 'published', 7)];
    const res = await (await load(''))();
    expect(state.inCalls).toEqual([['status', ['verified', 'scheduled']]]);
    expect(state.eqs.filter(([k]) => k === 'site_id')).toEqual([]);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20', bank_open: 35 });
  });

  it('kpop build, under the threshold: main\'s refill alert text, unchanged', async () => {
    state.bank = rows('kpop', 'verified', 4);
    const body = await (await (await load('kpop'))()).json();
    expect(body).toEqual({
      ok: true,
      date: '2026-10-20',
      bank_open: 4,
      refill_alert: 'Only 4 quizzes left in the bank (under 30): about 4 days of quizzes of the day. Add a verified lot.',
    });
  });

  it('anime build: counts only the anime rows, and the alert names the site', async () => {
    state.bank = [...rows('kpop', 'verified', 80), ...rows('anime', 'verified', 3), ...rows('anime', 'scheduled', 1), ...rows('anime', 'published', 9)];
    const body = await (await (await load('anime'))()).json();
    expect(state.eqs).toContainEqual(['site_id', 'anime']);
    expect(body).toEqual({
      ok: true,
      date: '2026-10-20',
      bank_open: 4,
      refill_alert: 'Only 4 quizzes left in the anime bank (under 30): about 4 days of quizzes of the day. Add a verified lot.',
    });
  });

  it('anime build, empty anime bank while kpop is full: the anime alert, not the kpop count', async () => {
    state.bank = rows('kpop', 'verified', 80);
    const body = await (await (await load('anime'))()).json();
    expect(body.bank_open).toBe(0);
    expect(body.refill_alert).toContain('The anime quiz bank is empty');
  });

  it('rotation switch on, anime build: the status is counted on the anime rows too', async () => {
    state.bank = [...rows('kpop', 'verified', 80), ...rows('anime', 'scheduled', 31)];
    const body = await (await (await load('anime', '1'))()).json();
    expect(body).toMatchObject({ ok: true, method: 'existing', bank_open: 31 });
    expect(body.refill_alert).toBeUndefined();
  });

  it('a failed count never fails the run', async () => {
    state.bank = null;
    const res = await (await load('anime'))();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
  });
});
