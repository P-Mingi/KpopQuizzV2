// Daily games: the hub's cron ensure-daily-quiz also runs dle_daily_maintenance (019). Real cron-auth here: CRON_SECRET stays
// required. The quiz's response never changes, on any site, whatever the maintenance answers.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

type RpcError = { code?: string; message: string };

const state = vi.hoisted(() => ({
  rpcs: [] as Array<{ fn: string; args: unknown }>,
  quizError: null as { message: string } | null,
  maintenance: { data: null, error: null } as { data: unknown; error: RpcError | null } | 'throw',
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args: unknown) => {
      state.rpcs.push({ fn, args });
      if (fn !== 'dle_daily_maintenance') return { data: null, error: state.quizError };
      if (state.maintenance === 'throw') throw new Error('network down');
      return state.maintenance;
    },
    from: () => {
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.limit = () => b;
      b.maybeSingle = async () => ({ data: { id: 'flagged-today' }, error: null });
      b.in = async () => ({ count: null, error: null });
      return b;
    },
  }),
}));

const NOT_APPLIED: RpcError = { code: 'PGRST202', message: 'Could not find the function public.dle_daily_maintenance(p_now) in the schema cache' };
const MAINTENANCE_CALL = { fn: 'dle_daily_maintenance', args: { p_now: '2026-10-20T00:05:00.000Z' } };
const secret = 'o1-test-secret';

async function run(site: string, opts: { fix?: string; auth?: string | null; cronSecret?: string } = {}): Promise<Response> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('QOTD_ROTATION_FIX', opts.fix ?? '');
  vi.stubEnv('CRON_SECRET', opts.cronSecret ?? secret);
  const auth = opts.auth === undefined ? `Bearer ${secret}` : opts.auth;
  const { GET } = await import('./route');
  return GET(new NextRequest('https://example.test/api/cron/ensure-daily-quiz', { headers: auth ? { authorization: auth } : {} }));
}

const logged = (spy: { mock: { calls: unknown[][] } }): string[] => spy.mock.calls.map((c) => String(c[0])).filter((l) => l.includes('dle_daily_maintenance'));

let log: ReturnType<typeof vi.spyOn>;
let err: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T00:05:00Z'));
  state.rpcs = [];
  state.quizError = null;
  state.maintenance = { data: [], error: null };
  log = vi.spyOn(console, 'log').mockImplementation(() => {});
  err = vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('ensure-daily-quiz: the nightly maintenance of the daily games', () => {
  it('hub, success: called with the clock, after the quiz, the counts logged, the response unchanged', async () => {
    state.maintenance = { data: [{ game: 'kpopdle-idol', pool: 120, rebuilt_days: 0 }], error: null };
    const res = await run('hub');
    expect(state.rpcs).toEqual([{ fn: 'ensure_daily_quiz_v2', args: { p_date: '2026-10-20', p_site: 'hub' } }, MAINTENANCE_CALL]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
    expect(logged(log)).toEqual(['[ensure-daily-quiz] dle_daily_maintenance: [{"game":"kpopdle-idol","pool":120,"rebuilt_days":0}]']);
    expect(logged(err)).toEqual([]);
  });

  it.each<[string, RpcError]>([
    ['PGRST202', NOT_APPLIED],
    ['42883 naming it', { code: '42883', message: 'function public.dle_daily_maintenance(p_now => text) does not exist' }],
  ])('hub, the function is missing (%s): one expected log line, no error, the response unchanged', async (_name, error) => {
    state.maintenance = { data: null, error };
    const res = await run('hub');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
    expect(logged(log)).toEqual(['[ensure-daily-quiz] dle_daily_maintenance: not applied on this database yet, expected before 019']);
    expect(logged(err)).toEqual([]);
  });

  it.each<[string, RpcError]>([
    ['pool too small', { code: 'P0001', message: 'dle_pool_too_small: 10 targets, 40 needed' }],
    ['no permission on a source table', { code: '42501', message: 'permission denied for table idols' }],
    ['a function missing inside it', { code: '42883', message: 'function public.dle_window(text) does not exist' }],
    ['a table missing inside it', { code: '42P01', message: 'relation "public.dle_games" does not exist' }],
    ['a timeout', { code: '57014', message: 'canceling statement due to statement timeout' }],
  ])('hub, a real failure (%s): logged as an error, the quiz and its response unchanged', async (_name, error) => {
    state.maintenance = { data: null, error };
    const res = await run('hub');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
    expect(state.rpcs[0]!.fn).toBe('ensure_daily_quiz_v2');
    expect(logged(err)).toEqual([`[ensure-daily-quiz] dle_daily_maintenance failed: ${error.code} ${error.message}`]);
    expect(logged(log)).toEqual([]);
  });

  it('hub, one game fails and one runs (CR-019): an error line names the bad game, the good one is logged, the response unchanged', async () => {
    state.maintenance = { data: [{ game: 'bad-game', error: 'dle_pool_too_small: 10 targets, 40 needed', code: 'P0001' }, { game: 'good-game', pool: 60, rebuilt_days: 0 }], error: null };
    const res = await run('hub');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
    expect(logged(err)).toEqual(['[ensure-daily-quiz] dle_daily_maintenance failed for game bad-game: P0001 dle_pool_too_small: 10 targets, 40 needed']);
    expect(logged(log)).toEqual(['[ensure-daily-quiz] dle_daily_maintenance: [{"game":"good-game","pool":60,"rebuilt_days":0}]']);
  });

  it('hub, every game fails: one error line per game and no line of counts', async () => {
    state.maintenance = { data: [{ game: 'aa', error: 'x', code: 'P0001' }, { game: 'bb', error: 'y', code: '23514' }], error: null };
    const res = await run('hub');
    expect(res.status).toBe(200);
    expect(logged(err)).toEqual([
      '[ensure-daily-quiz] dle_daily_maintenance failed for game aa: P0001 x',
      '[ensure-daily-quiz] dle_daily_maintenance failed for game bb: 23514 y',
    ]);
    expect(logged(log)).toEqual([]);
  });

  it('hub, no active game: the empty list is logged, no error', async () => {
    state.maintenance = { data: [], error: null };
    await run('hub');
    expect(logged(log)).toEqual(['[ensure-daily-quiz] dle_daily_maintenance: []']);
    expect(logged(err)).toEqual([]);
  });

  it('hub, the call throws: logged as an error, the response unchanged', async () => {
    state.maintenance = 'throw';
    const res = await run('hub');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: '2026-10-20' });
    expect(logged(err)).toEqual(['[ensure-daily-quiz] dle_daily_maintenance failed: network down']);
  });

  it('hub, the quiz fails: its 500 stays and the maintenance still runs', async () => {
    state.quizError = { message: 'boom' };
    const res = await run('hub');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
    expect(state.rpcs).toContainEqual(MAINTENANCE_CALL);
  });

  it('hub, a failed maintenance never turns a failed quiz into something else', async () => {
    state.quizError = { message: 'boom' };
    state.maintenance = 'throw';
    const res = await run('hub');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'boom' });
  });

  it('hub with the rotation switch on: the maintenance runs on that path too, the response unchanged', async () => {
    const res = await run('hub', { fix: '1' });
    expect(await res.json()).toMatchObject({ ok: true, date: '2026-10-20', method: 'existing', quiz_id: 'flagged-today' });
    expect(state.rpcs).toEqual([MAINTENANCE_CALL]);
  });

  it.each([['', 'kpop build, site unset'], ['kpop', 'kpop build'], ['anime', 'anime build']])('other sites never call it (%s, %s), rotation switch off or on', async (site) => {
    for (const fix of ['', '1']) {
      state.rpcs = [];
      await run(site, { fix });
      expect(state.rpcs.map((r) => r.fn)).not.toContain('dle_daily_maintenance');
    }
    expect(logged(log)).toEqual([]);
    expect(logged(err)).toEqual([]);
  });

  it.each<[string, { auth?: string | null; cronSecret?: string }]>([
    ['no header', { auth: null }],
    ['a wrong secret', { auth: 'Bearer nope' }],
    ['no CRON_SECRET on the project', { cronSecret: '' }],
  ])('CRON_SECRET stays required on the hub (%s): 401 and no call at all', async (_name, opts) => {
    const res = await run('hub', opts);
    expect(res.status).toBe(401);
    expect(state.rpcs).toEqual([]);
  });
});
