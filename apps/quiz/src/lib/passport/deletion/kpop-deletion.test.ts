// Run O1, lot (e), lane B7 (owner decision of 2026-10-24): the account routes on the kpop build. Flag off (the default): 404 exactly as
// before, nothing is read or written. Flag on (NEXT_PUBLIC_NET_DELETION): request, status and cancel work for a kpop member; leave and
// the cron stay on the hub. A mocked Supabase, like account.test.ts.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null as { id: string; email: string | null; last_sign_in_at: string | null } | null,
  memberships: [{ site_id: 'kpop' }] as Array<{ site_id: string }>,
  rpc: {} as Record<string, { data: unknown; error: { code?: string } | null }>,
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  signOuts: [] as unknown[],
}));

vi.mock('@/lib/supabase/server', () => {
  const rpc = async (fn: string, args: Record<string, unknown>) => {
    state.calls.push({ fn, args });
    return state.rpc[fn] ?? { data: null, error: null };
  };
  const from = (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: table === 'profiles' ? { username: 'kfan' } : null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: table === 'world_memberships' ? state.memberships : [], error: null }),
      }),
    }),
  });
  return {
    createServerClient: async () => ({
      auth: { getUser: async () => ({ data: { user: state.user } }), signOut: async (o: unknown) => { state.signOuts.push(o); return { error: null }; } },
      from,
    }),
    createServiceRoleClient: () => ({ rpc, from, auth: { admin: { deleteUser: async () => ({ error: null }) } } }),
  };
});

import { accountRoutesOpen, handleCancel, handleCronDeletions, handleDelete, handleDeletionStatus, handleLeave } from './account';

const KPOP = 'https://kpopquiz.org';
const NOW = Date.parse('2026-10-24T12:00:00Z');
const fresh = '2026-10-24T11:55:00Z';
const ctx = (kpopDeletion?: boolean) => ({
  site: 'kpop' as const, env: { VERCEL_ENV: 'production' }, now: () => NOW,
  ...(kpopDeletion === undefined ? {} : { kpopDeletion }),
  notify: async (u: string, s: readonly string[]) => { state.calls.push({ fn: 'notify', args: { u, s } }); },
  sendNotice: async (to: string, at: string, site: string) => { state.calls.push({ fn: 'notice', args: { to, at, site } }); },
});
const post = (path: string, body?: unknown): NextRequest => new NextRequest(`${KPOP}${path}`, {
  method: 'POST', ...(body === undefined ? {} : { body: JSON.stringify(body) }), headers: { 'content-type': 'application/json', origin: KPOP },
});
const get = (path: string): NextRequest => new NextRequest(`${KPOP}${path}`, { method: 'GET' });
const calls = (fn: string) => state.calls.filter((c) => c.fn === fn);

beforeEach(() => {
  state.user = { id: 'user-1', email: 'k@example.test', last_sign_in_at: fresh };
  state.memberships = [{ site_id: 'kpop' }];
  state.rpc = {};
  state.calls = [];
  state.signOuts = [];
  vi.unstubAllEnvs();
});

describe('accountRoutesOpen', () => {
  it('hub always, kpop only with the flag, anime never', () => {
    expect(accountRoutesOpen('hub')).toBe(true);
    expect(accountRoutesOpen('hub', false)).toBe(true);
    expect(accountRoutesOpen('kpop', true)).toBe(true);
    expect(accountRoutesOpen('kpop', false)).toBe(false);
    expect(accountRoutesOpen('anime', true)).toBe(false);
  });

  it('reads NEXT_PUBLIC_NET_DELETION when the context says nothing: "1" and "true" are on, anything else is off', () => {
    expect(accountRoutesOpen('kpop')).toBe(false);
    for (const [v, on] of [['1', true], ['true', true], ['0', false], ['', false], ['yes', false]] as const) {
      vi.stubEnv('NEXT_PUBLIC_NET_DELETION', v);
      expect(accountRoutesOpen('kpop'), v).toBe(on);
    }
  });
});

describe('flag off: kpop answers 404 and touches nothing', () => {
  it('delete, cancel and the status read', async () => {
    const body = { keepQuizzes: true, confirm: '@kfan' };
    expect((await handleDelete(post('/api/passport/delete', body), ctx(false))).status).toBe(404);
    expect((await handleCancel(post('/api/passport/cancel'), ctx(false))).status).toBe(404);
    expect((await handleDeletionStatus(get('/api/passport/delete'), ctx(false))).status).toBe(404);
    expect((await handleDelete(post('/api/passport/delete', body), ctx())).status).toBe(404);
    expect(state.calls).toEqual([]);
    expect(state.signOuts).toEqual([]);
  });
});

describe('flag on: kpop', () => {
  const ok = { keepQuizzes: true, confirm: '@kfan' };

  it('request: 200 {runAfter}, global sign-out, notice under the kpop site, revalidates the kpop page', async () => {
    state.rpc.passport_request_deletion = { data: '2026-10-31T12:00:00+00:00', error: null };
    const res = await handleDelete(post('/api/passport/delete', ok), ctx(true));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ runAfter: '2026-10-31T12:00:00.000Z' });
    expect(calls('passport_request_deletion')[0]!.args).toEqual({ p_user: 'user-1', p_from_site: 'kpop', p_keep_quizzes: true });
    expect(state.signOuts).toEqual([{ scope: 'global' }]);
    await vi.waitFor(() => expect(calls('notice')).toHaveLength(1));
    expect(calls('notice')[0]!.args).toEqual({ to: 'k@example.test', at: '2026-10-31T12:00:00.000Z', site: 'kpop' });
    await vi.waitFor(() => expect(calls('notify')).toHaveLength(1));
    expect(calls('notify')[0]!.args).toEqual({ u: 'kfan', s: ['kpop'] });
  });

  it('"also remove my published quizzes" is keepQuizzes false', async () => {
    state.rpc.passport_request_deletion = { data: '2026-10-31T12:00:00+00:00', error: null };
    await handleDelete(post('/api/passport/delete', { keepQuizzes: false, confirm: '@kfan' }), ctx(true));
    expect(calls('passport_request_deletion')[0]!.args.p_keep_quizzes).toBe(false);
  });

  it('the same rules as the hub: 401 without a session, 403 reauth after 10 minutes, 400 on a wrong confirm', async () => {
    state.user = null;
    expect((await handleDelete(post('/api/passport/delete', ok), ctx(true))).status).toBe(401);
    state.user = { id: 'user-1', email: null, last_sign_in_at: '2026-10-24T11:40:00Z' };
    expect(await (await handleDelete(post('/api/passport/delete', ok), ctx(true))).json()).toEqual({ error: 'reauth' });
    state.user = { id: 'user-1', email: null, last_sign_in_at: fresh };
    expect(await (await handleDelete(post('/api/passport/delete', { keepQuizzes: true, confirm: 'kfan' }), ctx(true))).json()).toEqual({ error: 'confirm' });
    expect(calls('passport_request_deletion')).toEqual([]);
    expect(state.signOuts).toEqual([]);
  });

  it('a foreign Origin is refused', async () => {
    const req = new NextRequest(`${KPOP}/api/passport/delete`, { method: 'POST', body: JSON.stringify(ok), headers: { 'content-type': 'application/json', origin: 'https://evil.example' } });
    expect((await handleDelete(req, ctx(true))).status).toBe(403);
  });

  it('status: 401, then {pending:false}, then {pending:true, runAfter}', async () => {
    state.user = null;
    expect((await handleDeletionStatus(get('/api/passport/delete'), ctx(true))).status).toBe(401);
    state.user = { id: 'user-1', email: null, last_sign_in_at: fresh };
    let res = await handleDeletionStatus(get('/api/passport/delete'), ctx(true));
    expect(await res.json()).toEqual({ pending: false });
    expect(res.headers.get('cache-control')).toBe('no-store');
    state.rpc.passport_deletion_status = { data: '2026-10-31T12:00:00+00:00', error: null };
    res = await handleDeletionStatus(get('/api/passport/delete'), ctx(true));
    expect(await res.json()).toEqual({ pending: true, runAfter: '2026-10-31T12:00:00.000Z' });
    expect(calls('passport_deletion_status')[1]!.args).toEqual({ p_user: 'user-1' });
    state.rpc.passport_deletion_status = { data: null, error: { code: 'XX000' } };
    expect((await handleDeletionStatus(get('/api/passport/delete'), ctx(true))).status).toBe(500);
  });

  it('cancel: 401, then 200 {cancelled}', async () => {
    state.user = null;
    expect((await handleCancel(post('/api/passport/cancel'), ctx(true))).status).toBe(401);
    state.user = { id: 'user-1', email: null, last_sign_in_at: fresh };
    state.rpc.passport_cancel_deletion = { data: true, error: null };
    const res = await handleCancel(post('/api/passport/cancel'), ctx(true));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cancelled: true });
    expect(calls('passport_cancel_deletion')[0]!.args).toEqual({ p_user: 'user-1' });
  });

  it('leave and the cron stay on the hub', async () => {
    const leave = await handleLeave(post('/api/passport/leave', { site: 'anime', keepQuizzes: true, confirm: '@kfan' }), ctx(true));
    expect(leave.status).toBe(404);
    const cron = await handleCronDeletions(new Request(`${KPOP}/api/cron/passport-deletions`, { headers: { authorization: 'Bearer s3cret-s3cret' } }), { site: 'kpop', secret: 's3cret-s3cret' });
    expect(cron.status).toBe(200);
    expect(await cron.json()).toMatchObject({ skipped: true });
    expect(calls('passport_due_deletions')).toEqual([]);
  });
});
