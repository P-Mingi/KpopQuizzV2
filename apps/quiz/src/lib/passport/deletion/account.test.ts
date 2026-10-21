// Run O1, lot (e), lane B7: POST /api/passport/delete, /cancel, /leave and GET /api/cron/passport-deletions (apis.md 3.4 to 3.6, 5)
// with a mocked Supabase. Every status of the contract, in the order the contract lists them.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string | null; last_sign_in_at: string | null } | null,
  username: 'fan_one' as string | null,
  memberships: [{ site_id: 'kpop' }, { site_id: 'anime' }] as Array<{ site_id: string }>,
  rpc: {} as Record<string, { data: unknown; error: { code?: string; message?: string } | null }>,
  due: [] as Array<{ user_id: string }>,
  deleteUser: { error: null } as { error: { status?: number; message?: string } | null },
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  signOuts: [] as unknown[],
}));

vi.mock('@/lib/supabase/server', () => {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    state.calls.push({ fn, args });
    if (fn === 'passport_due_deletions') return { data: state.due, error: null };
    return state.rpc[fn] ?? { data: null, error: null };
  };
  const from = (table: string) => ({
    select: () => ({
      eq: () => {
        const q = {
          maybeSingle: async () => ({ data: table === 'profiles' && state.username ? { username: state.username } : null, error: null }),
          then: (resolve: (v: unknown) => void) => resolve({ data: table === 'world_memberships' ? state.memberships : [], error: null }),
        };
        return q;
      },
    }),
  });
  return {
    createServerClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: state.user } }),
        signOut: async (o: unknown) => { state.signOuts.push(o); return { error: null }; },
      },
      from,
    }),
    createServiceRoleClient: () => ({
      rpc,
      from,
      auth: { admin: { deleteUser: async (id: string) => { state.calls.push({ fn: 'admin.deleteUser', args: { id } }); return state.deleteUser; } } },
    }),
  };
});

import { handleCancel, handleCronDeletions, handleDelete, handleLeave, isFreshSignIn, leavableSites } from './account';

const HUB = 'https://fanquiz.org';
const NOW = Date.parse('2026-10-21T12:00:00Z');
const fresh = '2026-10-21T11:55:00Z';
const stale = '2026-10-21T11:40:00Z';

const ctx = (site: 'kpop' | 'anime' | 'hub' = 'hub') => ({
  site, env: { VERCEL_ENV: 'production' }, now: () => NOW,
  notify: async (u: string, s: readonly string[]) => { state.calls.push({ fn: 'notify', args: { u, s } }); },
  sendNotice: async (to: string, at: string) => { state.calls.push({ fn: 'notice', args: { to, at } }); },
});

function post(path: string, body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${HUB}${path}`, {
    method: 'POST',
    ...(body === undefined ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    headers: { 'content-type': 'application/json', origin: HUB, ...headers },
  });
}
const calls = (fn: string) => state.calls.filter((c) => c.fn === fn);
const signedIn = (last = fresh) => { state.user = { id: 'user-1', email: 'fan@example.test', last_sign_in_at: last }; };

beforeEach(() => {
  state.user = null;
  state.username = 'fan_one';
  state.memberships = [{ site_id: 'kpop' }, { site_id: 'anime' }];
  state.rpc = {};
  state.due = [];
  state.deleteUser = { error: null };
  state.calls = [];
  state.signOuts = [];
});

function expectPrivate(res: Response): void {
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
}

describe('isFreshSignIn', () => {
  it('600 seconds, no more; a missing or malformed time is not fresh', () => {
    expect(isFreshSignIn('2026-10-21T11:50:00Z', NOW)).toBe(true);
    expect(isFreshSignIn('2026-10-21T11:49:59Z', NOW)).toBe(false);
    expect(isFreshSignIn(null, NOW)).toBe(false);
    expect(isFreshSignIn('nope', NOW)).toBe(false);
  });
});

describe('POST /api/passport/delete', () => {
  const ok = { keepQuizzes: true, confirm: '@fan_one' };

  it('404 on kpop and anime, before anything else', async () => {
    signedIn();
    expect((await handleDelete(post('/api/passport/delete', ok), ctx('kpop'))).status).toBe(404);
    expect((await handleDelete(post('/api/passport/delete', ok), ctx('anime'))).status).toBe(404);
    expect(state.calls).toEqual([]);
  });

  it('403 origin for a foreign Origin header', async () => {
    signedIn();
    const res = await handleDelete(post('/api/passport/delete', ok, { origin: 'https://evil.example' }), ctx());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin' });
  });

  it('401 unauthenticated without a session', async () => {
    const res = await handleDelete(post('/api/passport/delete', ok), ctx());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
    expectPrivate(res);
  });

  it('403 reauth when the last sign-in is older than 600 s', async () => {
    signedIn(stale);
    const res = await handleDelete(post('/api/passport/delete', ok), ctx());
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'reauth' });
    expect(calls('passport_request_deletion')).toEqual([]);
  });

  it('400 confirm when confirm is not @username (checked after reauth)', async () => {
    signedIn();
    for (const confirm of ['fan_one', '@Fan_One', '@someone', '']) {
      const res = await handleDelete(post('/api/passport/delete', { keepQuizzes: true, confirm }), ctx());
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'confirm' });
    }
    expect(calls('passport_request_deletion')).toEqual([]);
  });

  it('400 bad_request for a body that is not JSON, too large, or missing keepQuizzes', async () => {
    signedIn();
    expect((await handleDelete(post('/api/passport/delete', '{oops'), ctx())).status).toBe(400);
    expect((await handleDelete(post('/api/passport/delete', { confirm: '@fan_one' }), ctx())).status).toBe(400);
    expect((await handleDelete(post('/api/passport/delete', { keepQuizzes: 'yes', confirm: '@fan_one' }), ctx())).status).toBe(400);
    expect((await handleDelete(post('/api/passport/delete', { ...ok, pad: 'x'.repeat(3000) }), ctx())).status).toBe(400);
    expect((await handleDelete(post('/api/passport/delete', JSON.stringify(ok), { 'content-type': 'text/plain' }), ctx())).status).toBe(400);
  });

  it('200 {runAfter}: records the request, signs out everywhere, sends the notice, revalidates every site of the member', async () => {
    signedIn();
    state.rpc.passport_request_deletion = { data: '2026-10-28T12:00:00+00:00', error: null };
    const res = await handleDelete(post('/api/passport/delete', ok), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ runAfter: '2026-10-28T12:00:00.000Z' });
    expectPrivate(res);
    expect(calls('passport_request_deletion')[0]!.args).toEqual({ p_user: 'user-1', p_from_site: 'hub', p_keep_quizzes: true });
    expect(state.signOuts).toEqual([{ scope: 'global' }]);
    await vi.waitFor(() => expect(calls('notice')).toHaveLength(1));
    expect(calls('notice')[0]!.args).toEqual({ to: 'fan@example.test', at: '2026-10-28T12:00:00.000Z' });
    await vi.waitFor(() => expect(calls('notify')).toHaveLength(1));
    expect(calls('notify')[0]!.args).toEqual({ u: 'fan_one', s: ['kpop', 'anime'] });
    // the order of the contract: request, then sign-out
    const order = state.calls.map((c) => c.fn);
    expect(order.indexOf('passport_request_deletion')).toBeLessThan(order.indexOf('notice'));
  });

  it('keepQuizzes false is passed on', async () => {
    signedIn();
    state.rpc.passport_request_deletion = { data: '2026-10-28T12:00:00+00:00', error: null };
    await handleDelete(post('/api/passport/delete', { keepQuizzes: false, confirm: '@fan_one' }), ctx());
    expect(calls('passport_request_deletion')[0]!.args.p_keep_quizzes).toBe(false);
  });

  it('500 server when the database refuses, and the member is not signed out', async () => {
    signedIn();
    state.rpc.passport_request_deletion = { data: null, error: { code: 'XX000' } };
    const res = await handleDelete(post('/api/passport/delete', ok), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server' });
    expect(state.signOuts).toEqual([]);
  });

  it('never returns or logs an address', async () => {
    signedIn();
    state.rpc.passport_request_deletion = { data: '2026-10-28T12:00:00+00:00', error: null };
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const res = await handleDelete(post('/api/passport/delete', ok), ctx());
    expect(JSON.stringify(await res.json())).not.toContain('example.test');
    expect(JSON.stringify(spy.mock.calls)).not.toMatch(/example\.test|fan_one|user-1/);
    spy.mockRestore();
  });
});

describe('POST /api/passport/cancel', () => {
  it('404 outside the hub, 401 without a session', async () => {
    expect((await handleCancel(post('/api/passport/cancel', undefined), ctx('anime'))).status).toBe(404);
    const res = await handleCancel(post('/api/passport/cancel', undefined), ctx());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
  });

  it('200 {cancelled: true} when a request was pending, false when nothing was (no reauth needed)', async () => {
    signedIn(stale);
    state.rpc.passport_cancel_deletion = { data: true, error: null };
    let res = await handleCancel(post('/api/passport/cancel', undefined), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelled: true });
    expectPrivate(res);
    expect(calls('passport_cancel_deletion')[0]!.args).toEqual({ p_user: 'user-1' });
    state.rpc.passport_cancel_deletion = { data: false, error: null };
    res = await handleCancel(post('/api/passport/cancel', undefined), ctx());
    expect(await res.json()).toEqual({ cancelled: false });
  });

  it('403 origin; 500 server on a database error', async () => {
    signedIn();
    expect((await handleCancel(post('/api/passport/cancel', undefined, { origin: 'https://evil.example' }), ctx())).status).toBe(403);
    state.rpc.passport_cancel_deletion = { data: null, error: { code: 'XX000' } };
    expect((await handleCancel(post('/api/passport/cancel', undefined), ctx())).status).toBe(500);
  });
});

describe('POST /api/passport/leave', () => {
  const ok = { site: 'anime', keepQuizzes: true, confirm: '@fan_one' };

  it('only the worlds other than kpop can be left', () => {
    expect(leavableSites()).toEqual(['anime']);
  });

  it('404 outside the hub, 403 origin, 401, 403 reauth, in that order', async () => {
    signedIn(stale);
    expect((await handleLeave(post('/api/passport/leave', ok), ctx('kpop'))).status).toBe(404);
    expect((await handleLeave(post('/api/passport/leave', ok, { origin: 'https://x.example' }), ctx())).status).toBe(403);
    expect((await handleLeave(post('/api/passport/leave', ok), ctx())).status).toBe(403);
    state.user = null;
    expect((await handleLeave(post('/api/passport/leave', ok), ctx())).status).toBe(401);
  });

  it('400 confirm; 400 bad_request for kpop, hub, an unknown site, a site the member never joined', async () => {
    signedIn();
    const r = await handleLeave(post('/api/passport/leave', { ...ok, confirm: '@nobody' }), ctx());
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'confirm' });
    for (const site of ['kpop', 'hub', 'bogus', 5]) {
      expect((await handleLeave(post('/api/passport/leave', { ...ok, site }), ctx())).status, String(site)).toBe(400);
    }
    state.memberships = [{ site_id: 'kpop' }];
    expect((await handleLeave(post('/api/passport/leave', ok), ctx())).status).toBe(400);
    expect(calls('passport_leave_world')).toEqual([]);
  });

  it('409 last_world when no other world membership would remain', async () => {
    signedIn();
    state.memberships = [{ site_id: 'anime' }];
    const res = await handleLeave(post('/api/passport/leave', ok), ctx());
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'last_world' });
    expect(calls('passport_leave_world')).toEqual([]);
    // a hub membership is not a world
    state.memberships = [{ site_id: 'anime' }, { site_id: 'hub' }];
    expect((await handleLeave(post('/api/passport/leave', ok), ctx())).status).toBe(409);
  });

  it('200 {counts}: a real run for that site only, revalidate on every site of the member', async () => {
    signedIn();
    state.rpc.passport_leave_world = { data: { favourites: 2, world_memberships: 1, quizzes_reassigned: 3, note: 'x' }, error: null };
    const res = await handleLeave(post('/api/passport/leave', { ...ok, keepQuizzes: false }), ctx());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ counts: { favourites: 2, world_memberships: 1, quizzes_reassigned: 3 } });
    expectPrivate(res);
    expect(calls('passport_leave_world')[0]!.args).toEqual({ p_user: 'user-1', p_site: 'anime', p_dry_run: false, p_keep_quizzes: false });
    await vi.waitFor(() => expect(calls('notify')).toHaveLength(1));
    expect(calls('notify')[0]!.args).toEqual({ u: 'fan_one', s: ['kpop', 'anime'] });
    expect(state.signOuts).toEqual([]);
  });

  it('500 server on a database error (the sentinel guard, for example)', async () => {
    signedIn();
    state.rpc.passport_leave_world = { data: null, error: { code: 'B7S01' } };
    const res = await handleLeave(post('/api/passport/leave', ok), ctx());
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'server' });
  });
});

describe('GET /api/cron/passport-deletions', () => {
  const get = (auth?: string) => new Request(`${HUB}/api/cron/passport-deletions`, { headers: auth ? { authorization: auth } : {} });
  const c = (site: 'kpop' | 'anime' | 'hub' = 'hub') => ({ site, secret: 'cron-secret', notify: ctx().notify });

  it('401 without the Bearer secret, before the site check and before any work', async () => {
    expect((await handleCronDeletions(get(), c())).status).toBe(401);
    expect((await handleCronDeletions(get('Bearer wrong'), c())).status).toBe(401);
    expect((await handleCronDeletions(get('Bearer cron-secret'), { site: 'hub', secret: undefined })).status).toBe(401);
    expect(state.calls).toEqual([]);
  });

  it('200 {skipped: true} on kpop and anime, nothing run', async () => {
    for (const site of ['kpop', 'anime'] as const) {
      const res = await handleCronDeletions(get('Bearer cron-secret'), c(site));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ skipped: true });
    }
    expect(state.calls).toEqual([]);
  });

  it('runs each due request: passport_run_deletion (real), then the auth user, then revalidate; counts only', async () => {
    state.due = [{ user_id: 'u-a' }, { user_id: 'u-b' }];
    const res = await handleCronDeletions(get('Bearer cron-secret'), c());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ processed: 2, failed: 0 });
    expect(calls('passport_run_deletion').map((x) => x.args)).toEqual([
      { p_user: 'u-a', p_dry_run: false }, { p_user: 'u-b', p_dry_run: false },
    ]);
    expect(calls('admin.deleteUser').map((x) => x.args)).toEqual([{ id: 'u-a' }, { id: 'u-b' }]);
    const order = state.calls.map((x) => x.fn);
    expect(order.indexOf('passport_run_deletion')).toBeLessThan(order.indexOf('admin.deleteUser'));
    expect(order.indexOf('admin.deleteUser')).toBeLessThan(order.indexOf('notify'));
  });

  it('a request the database refuses (Mission U part D missing) counts as failed and the auth user is kept', async () => {
    state.due = [{ user_id: 'u-a' }];
    state.rpc.passport_run_deletion = { data: null, error: { code: 'B7M01', message: 'Mission U part D is not installed' } };
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const res = await handleCronDeletions(get('Bearer cron-secret'), c());
    expect(await res.json()).toEqual({ processed: 0, failed: 1 });
    expect(calls('admin.deleteUser')).toEqual([]);
    expect(JSON.stringify(spy.mock.calls)).toContain('B7M01');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('u-a');
    spy.mockRestore();
  });

  it('an auth user that is already gone is done; another auth error is a failure to retry', async () => {
    state.due = [{ user_id: 'u-a' }];
    state.deleteUser = { error: { status: 404, message: 'User not found' } };
    expect(await (await handleCronDeletions(get('Bearer cron-secret'), c())).json()).toEqual({ processed: 1, failed: 0 });
    state.deleteUser = { error: { status: 500, message: 'boom' } };
    expect(await (await handleCronDeletions(get('Bearer cron-secret'), c())).json()).toEqual({ processed: 0, failed: 1 });
  });

  it('nothing due: 200 {processed: 0, failed: 0}', async () => {
    expect(await (await handleCronDeletions(get('Bearer cron-secret'), c())).json()).toEqual({ processed: 0, failed: 0 });
  });
});
