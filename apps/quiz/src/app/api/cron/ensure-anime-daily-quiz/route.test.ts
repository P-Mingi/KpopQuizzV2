// Stopgap hub cron that publishes the ANIME quiz of the day (see route.ts). Fakes only: rotateQotd and the supabase client are mocked.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  touched: 0,
  rotated: [] as Array<{ site: string; date: string }>,
  answer: (date: string): { date: string; method: string; quizId: string | null; reason?: string } => ({ date, method: 'existing', quizId: `q-${date}` }),
  throwOn: null as string | null,
  bank: 500 as number | null,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: () => {
      state.touched += 1;
      const b: Record<string, unknown> = {};
      b.select = () => b;
      b.eq = () => b;
      b.in = async () => (state.bank === null ? { count: null, error: null } : { count: state.bank, error: null });
      return b;
    },
  }),
}));
vi.mock('@/lib/ux-v1/p1/qotd-rotation', () => ({
  supabaseQotdStore: (_db: unknown, site: string) => ({ site }),
  rotateQotd: async (store: { site: string }, date: string) => {
    state.touched += 1;
    state.rotated.push({ site: store.site, date });
    if (state.throwOn === date) throw new Error('boom');
    return state.answer(date);
  },
}));

async function call(site: string, headers: Record<string, string> = { authorization: 'Bearer s3' }, path = './route'): Promise<Response> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('CRON_SECRET', 's3');
  vi.stubEnv('QOTD_ROTATION_FIX', '');
  const mod = path === './route' ? await import('./route') : await import('../ensure-anime-daily-quiz-eve/route');
  return mod.GET(new NextRequest('https://example.test/api/cron/x', { headers }));
}

function at(iso: string): void {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

beforeEach(() => {
  state.touched = 0;
  state.rotated = [];
  state.answer = (date) => ({ date, method: 'existing', quizId: `q-${date}` });
  state.throwOn = null;
  state.bank = 500;
  at('2026-11-12T00:23:00Z');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('ensure-anime-daily-quiz', () => {
  it('401 without the secret, on any build, and nothing is touched', async () => {
    for (const site of ['hub', 'kpop', 'anime']) {
      for (const headers of [{}, { authorization: 'Bearer wrong' }]) {
        expect((await call(site, headers)).status).toBe(401);
      }
    }
    expect(state.touched).toBe(0);
  });

  it('the eve path also answers 401 without the secret', async () => {
    expect((await call('hub', {}, '../ensure-anime-daily-quiz-eve/route')).status).toBe(401);
    expect(state.touched).toBe(0);
  });

  it.each(['kpop', 'anime'])('on the %s build: 200 skip, nothing read or written', async (site) => {
    const res = await call(site);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ skipped: true });
    expect(state.touched).toBe(0);
    expect(state.rotated).toEqual([]);
  });

  it('hub before noon UTC: today only, on the anime store, switch off or not', async () => {
    const res = await call('hub');
    expect(state.rotated).toEqual([{ site: 'anime', date: '2026-11-12' }]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true, site: 'anime', dates: [{ date: '2026-11-12', ok: true, method: 'existing', quiz_id: 'q-2026-11-12' }], bank_open: 500,
    });
  });

  it('hub after noon UTC: today then tomorrow', async () => {
    at('2026-11-12T12:00:00Z');
    const res = await call('hub');
    expect(state.rotated).toEqual([{ site: 'anime', date: '2026-11-12' }, { site: 'anime', date: '2026-11-13' }]);
    expect(res.status).toBe(200);
  });

  it('the 23:50 eve run (hub) ensures today and tomorrow, across a month end', async () => {
    at('2026-11-30T23:50:00Z');
    const res = await call('hub', undefined, '../ensure-anime-daily-quiz-eve/route');
    expect(state.rotated.map((r) => r.date)).toEqual(['2026-11-30', '2026-12-01']);
    expect(res.status).toBe(200);
  });

  it('a second run is idempotent: existing answers stay ok', async () => {
    await call('hub');
    const res = await call('hub');
    expect(res.status).toBe(200);
    expect(((await res.json()) as { dates: Array<{ method: string }> }).dates[0]!.method).toBe('existing');
  });

  it('a bank-published day reports its method and quiz id', async () => {
    state.answer = (date) => ({ date, method: 'bank', quizId: 'new-q' });
    const body = (await (await call('hub')).json()) as { dates: unknown[] };
    expect(body.dates).toEqual([{ date: '2026-11-12', ok: true, method: 'bank', quiz_id: 'new-q' }]);
  });

  it('500 when a date stays empty (method none), the other date is still tried', async () => {
    at('2026-11-12T15:00:00Z');
    state.answer = (date) => (date === '2026-11-12'
      ? { date, method: 'existing', quizId: 'a' }
      : { date, method: 'none', quizId: null, reason: 'bank empty' });
    const res = await call('hub');
    expect(res.status).toBe(500);
    const body = (await res.json()) as { ok: boolean; dates: Array<{ ok: boolean; reason?: string }> };
    expect(body.ok).toBe(false);
    expect(body.dates.map((d) => d.ok)).toEqual([true, false]);
    expect(body.dates[1]!.reason).toBe('bank empty');
  });

  it('500 when the rotation throws, and tomorrow is still tried', async () => {
    at('2026-11-12T15:00:00Z');
    state.throwOn = '2026-11-12';
    const res = await call('hub');
    expect(res.status).toBe(500);
    expect(state.rotated).toHaveLength(2);
  });

  it('a failed bank count never fails the run', async () => {
    state.bank = null;
    const res = await call('hub');
    expect(res.status).toBe(200);
    expect(await res.json()).not.toHaveProperty('bank_open');
  });
});
