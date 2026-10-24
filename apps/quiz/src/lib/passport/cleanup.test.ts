// Run O1, lane L1: GET /api/cron/passport-cleanup (apis.md 5) with a mocked Supabase: the secret first (401), the hub only (200 skipped
// elsewhere, nothing run), then passport_cleanup() with counts only; the route file and its build-time site.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  result: { data: [{ codes_deleted: 4, events_deleted: 9 }], error: null } as { data: unknown; error: { code?: string; message?: string } | null },
  calls: [] as Array<{ fn: string; args: unknown }>,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args?: unknown) => { state.calls.push({ fn, args }); return state.result; },
    from: () => { state.calls.push({ fn: 'from', args: null }); return {}; },
  }),
  createServerClient: async () => { state.calls.push({ fn: 'createServerClient', args: null }); return {}; },
  createPublicReadClient: () => { state.calls.push({ fn: 'createPublicReadClient', args: null }); return {}; },
}));

import { handleCronCleanup } from './cleanup';

const HUB = 'https://fanquiz.org';
const get = (auth?: string): Request => new Request(`${HUB}/api/cron/passport-cleanup`, { headers: auth ? { authorization: auth } : {} });
const c = (site: 'kpop' | 'anime' | 'hub' = 'hub') => ({ site, secret: 'cron-secret' });

beforeEach(() => {
  state.result = { data: [{ codes_deleted: 4, events_deleted: 9 }], error: null };
  state.calls = [];
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('handleCronCleanup', () => {
  it('401 without the Bearer secret, before the site check and before any work', async () => {
    expect((await handleCronCleanup(get(), c())).status).toBe(401);
    expect((await handleCronCleanup(get('Bearer wrong'), c())).status).toBe(401);
    expect((await handleCronCleanup(get('Basic cron-secret'), c())).status).toBe(401);
    expect((await handleCronCleanup(get('Bearer cron-secret'), { site: 'hub', secret: undefined })).status).toBe(401);
    // a skipped site still needs the secret: 401, not 200
    expect((await handleCronCleanup(get(), c('anime'))).status).toBe(401);
    expect(state.calls).toEqual([]);
  });

  it('no CRON_SECRET in the environment: nobody is authorized (fail closed)', async () => {
    vi.stubEnv('CRON_SECRET', '');
    expect((await handleCronCleanup(get('Bearer '), { site: 'hub' })).status).toBe(401);
    expect(state.calls).toEqual([]);
  });

  it('200 {skipped: true} on kpop and anime, nothing run', async () => {
    for (const site of ['kpop', 'anime'] as const) {
      const res = await handleCronCleanup(get('Bearer cron-secret'), c(site));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ skipped: true });
    }
    expect(state.calls).toEqual([]);
  });

  it('on the hub it calls passport_cleanup() once and answers the counts, and nothing else', async () => {
    const res = await handleCronCleanup(get('Bearer cron-secret'), c());
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/json');
    expect(await res.json()).toEqual({ codesDeleted: 4, eventsDeleted: 9 });
    expect(state.calls).toEqual([{ fn: 'passport_cleanup', args: undefined }]);
  });

  it('reads the counts of a single row object or an empty answer as numbers, never as anything else', async () => {
    state.result = { data: { codes_deleted: 2, events_deleted: null }, error: null };
    expect(await (await handleCronCleanup(get('Bearer cron-secret'), c())).json()).toEqual({ codesDeleted: 2, eventsDeleted: 0 });
    state.result = { data: [], error: null };
    expect(await (await handleCronCleanup(get('Bearer cron-secret'), c())).json()).toEqual({ codesDeleted: 0, eventsDeleted: 0 });
    state.result = { data: [{ codes_deleted: 'x', events_deleted: -3 }], error: null };
    expect(await (await handleCronCleanup(get('Bearer cron-secret'), c())).json()).toEqual({ codesDeleted: 0, eventsDeleted: 0 });
  });

  it('a database error answers 500 {error: cleanup_failed}; the log line has the code and no message', async () => {
    state.result = { data: null, error: { code: '42501', message: 'permission denied for function passport_cleanup' } };
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const res = await handleCronCleanup(get('Bearer cron-secret'), c());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'cleanup_failed' });
    expect(JSON.stringify(spy.mock.calls)).toContain('42501');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('permission denied');
  });
});

describe('GET /api/cron/passport-cleanup (the route file, per build site)', () => {
  async function call(site: string, auth: string | undefined): Promise<Response> {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
    vi.stubEnv('SITE_ID', '');
    vi.stubEnv('CRON_SECRET', 'cron-secret');
    vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
    vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
    const { GET } = await import('../../app/api/cron/passport-cleanup/route');
    return GET(new NextRequest(`${HUB}/api/cron/passport-cleanup`, { headers: auth ? { authorization: auth } : {} }));
  }

  it('hub build: 401 without the secret, the counts with it (cronForSite lists the hub only)', async () => {
    expect((await call('hub', undefined)).status).toBe(401);
    expect((await call('hub', 'Bearer nope')).status).toBe(401);
    expect(state.calls).toEqual([]);
    const ok = await call('hub', 'Bearer cron-secret');
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ codesDeleted: 4, eventsDeleted: 9 });
    expect(state.calls.map((x) => x.fn)).toEqual(['passport_cleanup']);
  });

  it('kpop and anime builds: 200 {skipped: true} and no database call at all', async () => {
    for (const site of ['kpop', 'anime']) {
      const res = await call(site, 'Bearer cron-secret');
      expect(res.status, site).toBe(200);
      expect(await res.json(), site).toEqual({ skipped: true });
    }
    expect(state.calls).toEqual([]);
  });
});
