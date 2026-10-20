// Run O1, lot (b), lane P1: POST /api/passport/after-signin and GET /auth/confirm (apis.md 3.1 and 3.2) with a mocked
// Supabase. Every status of the contract: 404 on kpop, 403 origin, 400, 401, 403 banned, 200 with and without a profile,
// the membership stamp and its join counter, the confirm branches (onboarding, hub home, banned, success, every failure).
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { fn: string; args: Record<string, unknown> };
const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  profile: { id: 'user-1', banned_at: null } as { id: string; banned_at: string | null } | null,
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  otpError: false,
  otpUser: 'user-1' as string | null,
  created: true,
  stampThrows: false,
  signOuts: 0,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      verifyOtp: async (args: Record<string, unknown>) => {
        state.calls.push({ fn: 'auth.verifyOtp', args });
        if (state.otpError) return { data: { user: null, session: null }, error: { message: 'otp' } };
        state.user = state.otpUser ? { id: state.otpUser } : null;
        return { data: { user: state.user, session: { access_token: 'x' } }, error: null };
      },
      signOut: async () => { state.signOuts += 1; return { error: null }; },
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            state.calls.push({ fn: `from.${table}`, args: {} });
            return { data: state.profile, error: null };
          },
        }),
      }),
    }),
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      if (fn === 'ensure_membership') {
        if (state.stampThrows) throw new Error('boom');
        return { data: [{ site_id: args.p_site, created: state.created }], error: null };
      }
      return { data: null, error: null };
    },
  }),
  createServiceRoleClient: () => ({
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn: `service.${fn}`, args });
      return { data: null, error: null };
    },
  }),
}));

import { handleAfterSignin, handleConfirm } from './signin';

import type { SiteId } from '@/lib/site/types';

const ORIGINS = 'kpop=http://kpop.localhost:3103,anime=http://anime.localhost:3104,hub=http://hub.localhost:3105';
const ENV = { NEXT_PUBLIC_NET_ORIGINS: ORIGINS };
const ANIME = 'http://anime.localhost:3104';
const ctx = (site: SiteId) => ({ site, env: ENV });
const calls = (fn: string): Call[] => state.calls.filter((c) => c.fn === fn);
const loc = (res: Response): string => res.headers.get('location') ?? '';

function post(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`${ANIME}/api/passport/after-signin`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}
const confirm = (query: string): NextRequest => new NextRequest(`${ANIME}/auth/confirm${query}`);

function expectPrivate(res: Response): void {
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
}

beforeEach(() => {
  Object.assign(state, {
    user: null, profile: { id: 'user-1', banned_at: null }, calls: [], otpError: false, otpUser: 'user-1', created: true,
    stampThrows: false, signOuts: 0,
  });
  vi.spyOn(console, 'info').mockImplementation(() => undefined);
});

describe('POST /api/passport/after-signin (apis.md 3.1)', () => {
  it('answers 404 on kpop, before it reads anything', async () => {
    state.user = { id: 'user-1' };
    const res = await handleAfterSignin(post({ next: '/', via: null }), ctx('kpop'));
    expect(res.status).toBe(404);
    expectPrivate(res);
    expect(state.calls).toEqual([]);
  });

  it('refuses another origin with 403 origin, accepts its own and an absent one', async () => {
    state.user = { id: 'user-1' };
    const other = await handleAfterSignin(post({ next: '/' }, { origin: 'https://evil.example' }), ctx('anime'));
    expect(other.status).toBe(403);
    expect(await other.json()).toEqual({ error: 'origin' });
    expectPrivate(other);
    expect((await handleAfterSignin(post({ next: '/' }, { origin: ANIME }), ctx('anime'))).status).toBe(200);
    expect((await handleAfterSignin(post({ next: '/' }), ctx('anime'))).status).toBe(200);
  });

  it('answers 400 to a body that is not JSON, too big, or sent as text', async () => {
    state.user = { id: 'user-1' };
    expect((await handleAfterSignin(post('not json'), ctx('anime'))).status).toBe(400);
    expect((await handleAfterSignin(post({ next: '/'.padEnd(3000, 'a') }), ctx('anime'))).status).toBe(400);
    const text = new NextRequest(`${ANIME}/api/passport/after-signin`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{"next":"/"}' });
    const res = await handleAfterSignin(text, ctx('anime'));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'bad_request' });
  });

  it('answers 401 unauthenticated without a session, and stamps nothing', async () => {
    const res = await handleAfterSignin(post({ next: '/daily', via: 'k.menu' }), ctx('anime'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'unauthenticated' });
    expectPrivate(res);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('answers 403 banned and signs the session out for a banned profile', async () => {
    state.user = { id: 'user-1' };
    state.profile = { id: 'user-1', banned_at: '2026-10-01T00:00:00Z' };
    const res = await handleAfterSignin(post({ next: '/' }), ctx('anime'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'banned' });
    expect(state.signOuts).toBe(1);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('says needsUsername for an account with no profile, with next kept, and makes no stamp', async () => {
    state.user = { id: 'user-1' };
    state.profile = null;
    const res = await handleAfterSignin(post({ next: '/series?x=1' }), ctx('anime'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ next: '/series?x=1', needsUsername: true });
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('stamps the membership with the site, signup and a valid via, then says needsUsername false', async () => {
    state.user = { id: 'user-1' };
    const res = await handleAfterSignin(post({ next: '/daily', via: 'k.menu' }), ctx('anime'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ next: '/daily', needsUsername: false });
    expectPrivate(res);
    expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'anime', p_via: 'signup', p_via_code: 'k.menu' });
    // created with a via: one join counter, from the source site of the letter
    expect(calls('service.net_bridge_bump')[0]!.args).toEqual({ p_src: 'kpop', p_dst: 'anime', p_bridge: 'menu', p_step: 'join', p_signed_in: true, p_n: 1 });
  });

  it('drops a via that does not match VIA_RE, writes no counter without a via or when the stamp already existed', async () => {
    state.user = { id: 'user-1' };
    await handleAfterSignin(post({ next: '/', via: 'x.menu' }), ctx('anime'));
    expect(calls('ensure_membership')[0]!.args.p_via_code).toBeNull();
    expect(calls('service.net_bridge_bump')).toEqual([]);
    state.calls = [];
    state.created = false;
    await handleAfterSignin(post({ next: '/', via: 'k.menu' }), ctx('anime'));
    expect(calls('ensure_membership')[0]!.args.p_via_code).toBe('k.menu');
    expect(calls('service.net_bridge_bump')).toEqual([]);
  });

  it('sends next through safeReturnTo of the site: an outside address becomes /', async () => {
    state.user = { id: 'user-1' };
    for (const next of ['https://evil.example/x', '//evil.example', '/\\evil', 'javascript:alert(1)']) {
      const res = await handleAfterSignin(post({ next }), ctx('anime'));
      expect(await res.json()).toEqual({ next: '/', needsUsername: false });
    }
  });

  it('a stamp that throws still answers 200 (the next write repairs it)', async () => {
    state.user = { id: 'user-1' };
    state.stampThrows = true;
    const res = await handleAfterSignin(post({ next: '/' }), ctx('anime'));
    expect(res.status).toBe(200);
  });

  it('works the same on the hub', async () => {
    state.user = { id: 'user-1' };
    state.profile = null;
    const res = await handleAfterSignin(post({ next: '/passport' }, { origin: 'http://hub.localhost:3105' }), ctx('hub'));
    expect(await res.json()).toEqual({ next: '/passport', needsUsername: true });
  });
});

describe('GET /auth/confirm (apis.md 3.2)', () => {
  it('answers 404 on kpop, which keeps /auth/callback', async () => {
    const res = await handleConfirm(confirm('?token_hash=h&type=email&next=/'), ctx('kpop'));
    expect(res.status).toBe(404);
    expectPrivate(res);
    expect(state.calls).toEqual([]);
  });

  it('verifies the hash with the type, stamps the membership with signup and no via, and goes to next', async () => {
    for (const type of ['email', 'magiclink', 'signup', 'email_change']) {
      state.calls = [];
      const res = await handleConfirm(confirm(`?token_hash=hash-1&type=${type}&next=%2Fdaily%3Fa%3D1`), ctx('anime'));
      expect(res.status).toBe(302);
      expect(loc(res)).toBe('/daily?a=1');
      expectPrivate(res);
      expect(calls('auth.verifyOtp')[0]!.args).toEqual({ token_hash: 'hash-1', type });
      expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'anime', p_via: 'signup', p_via_code: null });
      expect(calls('service.net_bridge_bump')).toEqual([]);
    }
  });

  it('goes to /onboarding?returnTo=next on anime and to / on the hub when there is no profile', async () => {
    state.profile = null;
    const anime = await handleConfirm(confirm('?token_hash=h&type=email&next=%2Fdaily'), ctx('anime'));
    expect(loc(anime)).toBe('/onboarding?returnTo=%2Fdaily');
    const hub = await handleConfirm(confirm('?token_hash=h&type=email&next=%2Fpassport'), ctx('hub'));
    expect(loc(hub)).toBe('/');
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('signs a banned profile out and goes to /login, with no stamp', async () => {
    state.profile = { id: 'user-1', banned_at: '2026-10-01T00:00:00Z' };
    const res = await handleConfirm(confirm('?token_hash=h&type=email&next=%2F'), ctx('anime'));
    expect(loc(res)).toBe('/login');
    expect(state.signOuts).toBe(1);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('goes to /login on a missing hash, a missing or unknown type, an expired or used link, and no user', async () => {
    for (const q of ['', '?type=email', '?token_hash=h', '?token_hash=h&type=recovery', '?token_hash=h&type=invite', '?token_hash=&type=email']) {
      expect(loc(await handleConfirm(confirm(q), ctx('anime')))).toBe('/login');
    }
    expect(calls('auth.verifyOtp')).toEqual([]);
    state.otpError = true;
    expect(loc(await handleConfirm(confirm('?token_hash=h&type=email'), ctx('anime')))).toBe('/login');
    state.otpError = false;
    state.otpUser = null;
    expect(loc(await handleConfirm(confirm('?token_hash=h&type=email'), ctx('anime')))).toBe('/login');
  });

  it('sends next through safeReturnTo of the site: an outside address becomes /', async () => {
    for (const next of ['https%3A%2F%2Fevil.example%2F', '%2F%2Fevil.example', '%2F%5Cevil']) {
      expect(loc(await handleConfirm(confirm(`?token_hash=h&type=email&next=${next}`), ctx('anime')))).toBe('/');
    }
    expect(loc(await handleConfirm(confirm('?token_hash=h&type=email'), ctx('anime')))).toBe('/');
  });

  it('never writes the hash or the email in its log line', async () => {
    const spy = vi.spyOn(console, 'info');
    await handleConfirm(confirm('?token_hash=secret-hash-xyz&type=email&next=%2F'), ctx('anime'));
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-hash-xyz');
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });
});
