// Run O1, lot (b), lane P1: POST /api/passport/after-signin and GET /auth/confirm (apis.md 3.1 and 3.2) with a mocked
// Supabase. Every status of the contract: 404 on kpop, 403 origin, 400, 401, 403 banned, 200 with and without a profile,
// the membership stamp and its join counter, the confirm branches (onboarding, hub home, banned, success, every failure).
// FandomVerse (owner, 2026-10-28): anime is served under the basePath '/anime', so every Location of the anime build carries
// it (an app path '/daily' is the browser path '/anime/daily'); /auth/confirm answers 404 on a production deployment of anime
// and hub (no email sign-in there); GET /auth/callback of anime and hub (handleWorldCallback) takes OAuth sessions only.
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
  signOutScopes: [] as string[],
  exchangeError: false,
  token: '' as string | null,
  oauthUrl: undefined as string | null | undefined,
  oauthError: false,
  identities: [{ provider: 'google' }] as Array<{ provider: string }> | undefined,
  signOutFails: '' as '' | 'error' | 'throw',
  requestCookies: [] as Array<{ name: string; value: string }>,
  cookieWrites: [] as Array<{ name: string; value: string; options: Record<string, unknown> | undefined }>,
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => state.requestCookies,
    set: (name: string, value: string, options?: Record<string, unknown>) => { state.cookieWrites.push({ name, value, options }); },
  }),
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
      exchangeCodeForSession: async (code: string) => {
        state.calls.push({ fn: 'auth.exchangeCodeForSession', args: { code } });
        if (state.exchangeError) return { data: { user: null, session: null }, error: { message: 'exchange' } };
        state.user = state.otpUser ? ({ id: state.otpUser, identities: state.identities } as { id: string }) : null;
        return { data: { user: state.user, session: state.token === null ? null : { access_token: state.token } }, error: null };
      },
      signOut: async (args?: { scope?: string }) => {
        state.signOuts += 1;
        state.signOutScopes.push(args?.scope ?? 'global');
        if (state.signOutFails === 'throw') throw new Error('network');
        return { error: state.signOutFails === 'error' ? { message: 'status 503' } : null };
      },
      signInWithOAuth: async (args: { provider: string; options: { redirectTo: string } }) => {
        state.calls.push({ fn: 'auth.signInWithOAuth', args });
        if (state.oauthError) return { data: { provider: args.provider, url: null }, error: { message: 'oauth' } };
        const url = state.oauthUrl !== undefined ? state.oauthUrl
          : `https://abcdefghijklmnopqrst.supabase.co/auth/v1/authorize?provider=${args.provider}&redirect_to=${encodeURIComponent(args.options.redirectTo)}&code_challenge=x&code_challenge_method=s256`;
        return { data: { provider: args.provider, url }, error: null };
      },
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

import { OAUTH_RETURN_COOKIE, decodeOAuthReturn, encodeOAuthReturn, oauthReturnAttributes, oauthReturnCookieName } from '@/lib/auth/oauth-return';

import {
  confirmLive, handleAfterSignin, handleConfirm, handleOAuthStart, handleWorldCallback, oauthProviderAllowed, sessionMethod,
} from './signin';

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
const confirm = (query: string): NextRequest => new NextRequest(`${ANIME}/anime/auth/confirm${query}`);

/** An access token whose payload carries `amr` (header and signature are not read by sessionMethod). */
function jwt(amr: unknown): string {
  const b64u = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: 'user-1', aud: 'authenticated', amr })}.c2ln`;
}

function expectPrivate(res: Response): void {
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
}

beforeEach(() => {
  Object.assign(state, {
    user: null, profile: { id: 'user-1', banned_at: null }, calls: [], otpError: false, otpUser: 'user-1', created: true,
    stampThrows: false, signOuts: 0, signOutScopes: [], exchangeError: false, token: jwt([{ method: 'oauth', timestamp: 1_800_000_000 }]),
    oauthUrl: undefined, oauthError: false, identities: [{ provider: 'google' }], signOutFails: '', requestCookies: [], cookieWrites: [],
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
      expect(loc(res)).toBe('/anime/daily?a=1');
      expectPrivate(res);
      expect(calls('auth.verifyOtp')[0]!.args).toEqual({ token_hash: 'hash-1', type });
      expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'anime', p_via: 'signup', p_via_code: null });
      expect(calls('service.net_bridge_bump')).toEqual([]);
    }
  });

  it('goes to /onboarding?returnTo=next on anime and to / on the hub when there is no profile', async () => {
    state.profile = null;
    const anime = await handleConfirm(confirm('?token_hash=h&type=email&next=%2Fdaily'), ctx('anime'));
    expect(loc(anime)).toBe('/anime/onboarding?returnTo=%2Fdaily');
    const hub = await handleConfirm(confirm('?token_hash=h&type=email&next=%2Fpassport'), ctx('hub'));
    expect(loc(hub)).toBe('/');
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('signs a banned profile out and goes to /login, with no stamp', async () => {
    state.profile = { id: 'user-1', banned_at: '2026-10-01T00:00:00Z' };
    const res = await handleConfirm(confirm('?token_hash=h&type=email&next=%2F'), ctx('anime'));
    expect(loc(res)).toBe('/anime/login');
    expect(state.signOuts).toBe(1);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('goes to /login on a missing hash, a missing or unknown type, an expired or used link, and no user', async () => {
    for (const q of ['', '?type=email', '?token_hash=h', '?token_hash=h&type=recovery', '?token_hash=h&type=invite', '?token_hash=&type=email']) {
      expect(loc(await handleConfirm(confirm(q), ctx('anime')))).toBe('/anime/login');
    }
    expect(calls('auth.verifyOtp')).toEqual([]);
    state.otpError = true;
    expect(loc(await handleConfirm(confirm('?token_hash=h&type=email'), ctx('anime')))).toBe('/anime/login');
    state.otpError = false;
    state.otpUser = null;
    expect(loc(await handleConfirm(confirm('?token_hash=h&type=email'), ctx('anime')))).toBe('/anime/login');
  });

  it('sends next through safeReturnTo of the site: an outside address becomes /', async () => {
    for (const next of ['https%3A%2F%2Fevil.example%2F', '%2F%2Fevil.example', '%2F%5Cevil']) {
      expect(loc(await handleConfirm(confirm(`?token_hash=h&type=email&next=${next}`), ctx('anime')))).toBe('/anime');
    }
    expect(loc(await handleConfirm(confirm('?token_hash=h&type=email'), ctx('anime')))).toBe('/anime');
  });

  it('never writes the hash or the email in its log line', async () => {
    const spy = vi.spyOn(console, 'info');
    await handleConfirm(confirm('?token_hash=secret-hash-xyz&type=email&next=%2F'), ctx('anime'));
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-hash-xyz');
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// FandomVerse (owner, 2026-10-28)
// ---------------------------------------------------------------------------------------------------------------

/** The FandomVerse topology on a preview deployment: hub and anime on one origin, anime under '/anime'. */
const FV = { VERCEL_ENV: 'preview', NEXT_PUBLIC_NET_ORIGINS: 'kpop=https://kpopquiz.org,anime=https://fandomverse.org,hub=https://fandomverse.org' };
const fv = (site: SiteId) => ({ site, env: FV });
/** Origin headers that are not fandomverse.org, whatever they look like. */
const NOT_FV = [
  'https://fandomverse.org.evil.com', 'https://evil.com', 'https://kpopquiz.org', 'http://fandomverse.org', 'https://www.fandomverse.org',
  'https://fandomverse.org:8443', 'https://fandomverse.org/anime', 'https://fandomverse.org/', 'null', 'https://xn--fandomverse-q2b.org',
];

describe('GET /auth/confirm off in production (FandomVerse: no email sign-in on hub and anime)', () => {
  it('answers 404 on anime and hub, before it reads anything, for every type of link', async () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const type of ['email', 'magiclink', 'signup', 'email_change']) {
        const res = await handleConfirm(confirm(`?token_hash=hash-1&type=${type}&next=%2F`), { site, env: { VERCEL_ENV: 'production' } });
        expect(res.status).toBe(404);
        expectPrivate(res);
      }
    }
    expect(state.calls).toEqual([]);
  });

  it('fail closed: a deployed preview (NODE_ENV production) answers 404 unless it opts in with AUTH_FIXTURE_CONFIRM', async () => {
    const q = '?token_hash=hash-1&type=magiclink&next=%2F';
    for (const site of ['anime', 'hub'] as const) {
      for (const env of [
        { NODE_ENV: 'production', VERCEL_ENV: 'preview' }, { NODE_ENV: 'production' }, { NODE_ENV: 'production', AUTH_FIXTURE_CONFIRM: '0' },
        { NODE_ENV: 'production', AUTH_FIXTURE_CONFIRM: 'yes' }, { NODE_ENV: 'development', VERCEL_ENV: 'production' },
        { NODE_ENV: 'production', VERCEL_ENV: 'production', AUTH_FIXTURE_CONFIRM: '1' },
      ]) {
        const res = await handleConfirm(confirm(q), { site, env });
        expect(res.status, `${site} ${JSON.stringify(env)}`).toBe(404);
      }
    }
    expect(state.calls).toEqual([]);
    for (const env of [{ NODE_ENV: 'production', VERCEL_ENV: 'preview', AUTH_FIXTURE_CONFIRM: '1' }, { NODE_ENV: 'development' }, { NODE_ENV: 'test' }]) {
      expect((await handleConfirm(confirm(q), { site: 'anime', env })).status, JSON.stringify(env)).toBe(302);
    }
  });

  it('confirmLive: only off production, and on a production build only with the switch', () => {
    expect(confirmLive({ NODE_ENV: 'development' })).toBe(true);
    expect(confirmLive({ NODE_ENV: 'production' })).toBe(false);
    expect(confirmLive({ NODE_ENV: 'production', VERCEL_ENV: 'preview', AUTH_FIXTURE_CONFIRM: 'true' })).toBe(true);
    expect(confirmLive({ NODE_ENV: 'production', VERCEL_ENV: 'production', AUTH_FIXTURE_CONFIRM: '1' })).toBe(false);
    expect(confirmLive({ NODE_ENV: 'development', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('kpop still answers 404 there too (it keeps /auth/callback)', async () => {
    const res = await handleConfirm(confirm('?token_hash=h&type=email'), { site: 'kpop', env: { VERCEL_ENV: 'production' } });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/passport/after-signin on fandomverse.org', () => {
  it('hub and anime both accept their one origin https://fandomverse.org (the anime base has a path, the Origin never does)', async () => {
    state.user = { id: 'user-1' };
    for (const site of ['hub', 'anime'] as const) {
      const res = await handleAfterSignin(post({ next: '/' }, { origin: 'https://fandomverse.org' }), fv(site));
      expect(res.status).toBe(200);
    }
  });

  it('refuses every other origin shape with 403 origin: exact match only, no prefix, no suffix, no path', async () => {
    state.user = { id: 'user-1' };
    for (const site of ['hub', 'anime'] as const) {
      for (const origin of NOT_FV) {
        const res = await handleAfterSignin(post({ next: '/' }, { origin }), fv(site));
        expect(res.status, `${site} ${origin}`).toBe(403);
        expect(await res.json()).toEqual({ error: 'origin' });
      }
    }
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('answers an app path: a browser path of the anime build loses its basePath, an outside address becomes /', async () => {
    state.user = { id: 'user-1' };
    const own = await handleAfterSignin(post({ next: '/anime/daily?x=1' }, { origin: 'https://fandomverse.org' }), fv('anime'));
    expect(await own.json()).toEqual({ next: '/daily?x=1', needsUsername: false });
    for (const next of ['https://fandomverse.org.evil.com/x', 'https://evil.com/fandomverse.org', '//fandomverse.org.evil.com', '/anime//evil.com']) {
      const res = await handleAfterSignin(post({ next }), fv('anime'));
      expect(await res.json()).toEqual({ next: '/', needsUsername: false });
    }
  });
});

describe('sessionMethod (how an access token was opened)', () => {
  it('reads the method of the newest amr entry', () => {
    expect(sessionMethod(jwt([{ method: 'oauth', timestamp: 5 }]))).toBe('oauth');
    expect(sessionMethod(jwt([{ method: 'otp', timestamp: 5 }]))).toBe('otp');
    expect(sessionMethod(jwt([{ method: 'oauth', timestamp: 1 }, { method: 'magiclink', timestamp: 2 }]))).toBe('magiclink');
    expect(sessionMethod(jwt([{ method: 'otp', timestamp: 1 }, { method: 'oauth', timestamp: 2 }]))).toBe('oauth');
  });

  it('answers null for anything it cannot read (fail closed)', () => {
    for (const t of [
      undefined, null, '', 'x', 'a.b', 'a.b.c.d', 'a.!!.c', `a.${Buffer.from('not json').toString('base64url')}.c`,
      jwt(undefined), jwt([]), jwt('oauth'), jwt([{ method: 'oauth' }]), jwt([{ timestamp: 1 }]), jwt([null]),
      jwt([{ method: 'oauth', timestamp: 1 }, 'x']), jwt([{ method: 7, timestamp: 1 }]),
    ]) {
      expect(sessionMethod(t as string | null | undefined)).toBeNull();
    }
  });
});

/** The cookie /auth/start leaves for the callback (lib/auth/oauth-return.ts), as the browser sends it back. */
function startCookie(site: 'anime' | 'hub', next: string, via: string | null = null, provider: 'google' | 'discord' = 'google', iat = Math.floor(Date.now() / 1000)): string {
  return `${OAUTH_RETURN_COOKIE.https}=${encodeOAuthReturn({ site, provider, next, via, iat })}`;
}

describe('GET /auth/callback of anime and hub (handleWorldCallback)', () => {
  const callback = (query: string, base = 'https://fandomverse.org/anime', cookie: string | null = null): NextRequest =>
    new NextRequest(`${base}/auth/callback${query}`, { headers: cookie ? { cookie } : {} });
  const HUB_BASE = 'https://fandomverse.org';
  const clearsCookie = (res: Response): boolean =>
    res.headers.getSetCookie().some((c) => c.startsWith(`${OAUTH_RETURN_COOKIE.https}=;`) && /Max-Age=0/i.test(c) && /Path=\//.test(c) && /HttpOnly/i.test(c) && /Secure/i.test(c));

  it('answers 404 on kpop, which keeps its own /auth/callback code', async () => {
    const res = await handleWorldCallback(callback('?code=c1', 'https://kpopquiz.org'), { site: 'kpop', env: FV });
    expect(res.status).toBe(404);
    expect(state.calls).toEqual([]);
  });

  it('an OAuth session with a profile: the stamp with the via of the cookie, then its next with the basePath of the build', async () => {
    const res = await handleWorldCallback(callback('?code=c1', undefined, startCookie('anime', '/daily?a=1', 'k.menu')), fv('anime'));
    expect(res.status).toBe(302);
    expect(loc(res)).toBe('/anime/daily?a=1');
    expectPrivate(res);
    expect(clearsCookie(res)).toBe(true);
    expect(calls('auth.exchangeCodeForSession')[0]!.args).toEqual({ code: 'c1' });
    expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'anime', p_via: 'signup', p_via_code: 'k.menu' });
    expect(calls('service.net_bridge_bump')[0]!.args).toEqual({ p_src: 'kpop', p_dst: 'anime', p_bridge: 'menu', p_step: 'join', p_signed_in: true, p_n: 1 });

    state.calls = [];
    const hub = await handleWorldCallback(callback('?code=c2', HUB_BASE, startCookie('hub', '/passport')), fv('hub'));
    expect(loc(hub)).toBe('/passport');
    expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'hub', p_via: 'signup', p_via_code: null });
  });

  it('reads nothing from the query but the code: a returnTo or via there is ignored', async () => {
    const res = await handleWorldCallback(callback(`?code=c1&returnTo=${encodeURIComponent('/elsewhere')}&via=k.menu`), fv('anime'));
    expect(loc(res)).toBe('/anime');
    expect(calls('ensure_membership')[0]!.args.p_via_code).toBeNull();
  });

  it('a missing, stale, foreign or malformed cookie: the home of the build, no via (Google or Discord identities only: still signed in)', async () => {
    const old = Math.floor(Date.now() / 1000) - 601;
    for (const cookie of [
      null, startCookie('anime', '/daily', 'k.menu', 'google', old), startCookie('hub', '/daily'), `${OAUTH_RETURN_COOKIE.https}=garbage!`,
      `${OAUTH_RETURN_COOKIE.devHttp}=${encodeOAuthReturn({ site: 'anime', provider: 'google', next: '/daily', via: null, iat: Math.floor(Date.now() / 1000) })}`,
    ]) {
      state.calls = [];
      const res = await handleWorldCallback(callback('?code=c1', undefined, cookie), fv('anime'));
      expect(loc(res), String(cookie)).toBe('/anime');
      expect(calls('ensure_membership')[0]!.args.p_via_code).toBeNull();
    }
  });

  it('no profile: the username page of anime (with returnTo, an app path), the home of the hub; no stamp', async () => {
    state.profile = null;
    expect(loc(await handleWorldCallback(callback('?code=c1', undefined, startCookie('anime', '/daily')), fv('anime')))).toBe('/anime/onboarding?returnTo=%2Fdaily');
    expect(loc(await handleWorldCallback(callback('?code=c1', HUB_BASE, startCookie('hub', '/passport')), fv('hub')))).toBe('/');
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('a banned profile is signed out and sent to the login page of its build', async () => {
    state.profile = { id: 'user-1', banned_at: '2026-10-01T00:00:00Z' };
    const res = await handleWorldCallback(callback('?code=c1', undefined, startCookie('anime', '/')), fv('anime'));
    expect(loc(res)).toBe('/anime/login');
    expect(clearsCookie(res)).toBe(true);
    expect(state.signOuts).toBe(1);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('no code (the visitor said no at the provider) or a code Supabase refuses: the login page, nothing stamped', async () => {
    for (const q of ['', '?error=access_denied&error_description=denied', '?code=']) {
      const res = await handleWorldCallback(callback(q, undefined, startCookie('anime', '/')), fv('anime'));
      expect(loc(res)).toBe('/anime/login');
      expect(clearsCookie(res)).toBe(true);
    }
    expect(calls('auth.exchangeCodeForSession')).toEqual([]);
    state.exchangeError = true;
    expect(loc(await handleWorldCallback(callback('?code=c1', HUB_BASE), fv('hub')))).toBe('/login');
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('refuses every session an OAuth provider did not open: signed out on this browser, the login page, nothing read', async () => {
    const tokens = [
      jwt([{ method: 'otp', timestamp: 1 }]), jwt([{ method: 'magiclink', timestamp: 1 }]), jwt([{ method: 'email/signup', timestamp: 1 }]),
      jwt([{ method: 'password', timestamp: 1 }]), jwt([{ method: 'email_change', timestamp: 1 }]), jwt([{ method: 'recovery', timestamp: 1 }]),
      jwt([{ method: 'invite', timestamp: 1 }]), jwt([{ method: 'anonymous', timestamp: 1 }]),
      jwt([{ method: 'oauth', timestamp: 1 }, { method: 'otp', timestamp: 2 }]), jwt([]), 'not-a-jwt', null,
    ];
    for (const site of ['anime', 'hub'] as const) {
      for (const token of tokens) {
        state.calls = [];
        state.signOutScopes = [];
        state.token = token;
        const res = await handleWorldCallback(callback('?code=c1', site === 'hub' ? HUB_BASE : undefined, startCookie(site, '/daily')), fv(site));
        expect(loc(res), `${site} ${token}`).toBe(site === 'anime' ? '/anime/login' : '/login');
        expect(state.signOutScopes).toEqual(['local']);
        expect(calls('from.profiles')).toEqual([]);
        expect(calls('ensure_membership')).toEqual([]);
      }
    }
  });

  it('the next of the cookie goes through safeAppPath: an outside address is the home, the anime answer never leaves /anime', async () => {
    const hostile = [
      'https://fandomverse.org.evil.com/x', 'https://evil.com/fandomverse.org', '//fandomverse.org.evil.com', '//evil.com', '/\\evil.com',
      'javascript:alert(1)', '/anime//evil.com', 'https://fandomverse.org/x', '/anime/../x', '/%2e%2e/x', '/anime/%2e%2e/passport', '/..%2f..%2fx',
      '/.//evil.com', '/a/..//evil.com', '/%2e//evil.com',
    ];
    for (const raw of hostile) {
      state.calls = [];
      const res = await handleWorldCallback(callback('?code=c1', undefined, startCookie('anime', raw)), fv('anime'));
      const where = new URL(loc(res), 'https://fandomverse.org');
      expect(where.origin, raw).toBe('https://fandomverse.org');
      expect(where.pathname === '/anime' || where.pathname.startsWith('/anime/'), `${raw} -> ${loc(res)}`).toBe(true);
    }
    // a browser path of the anime build is not doubled
    expect(loc(await handleWorldCallback(callback('?code=c1', undefined, startCookie('anime', '/anime/q/x?y=1')), fv('anime')))).toBe('/anime/q/x?y=1');
    expect(loc(await handleWorldCallback(callback('?code=c1', HUB_BASE, startCookie('hub', '//evil.com')), fv('hub')))).toBe('/');
  });

  it('never writes the code or the via in its log line', async () => {
    const spy = vi.spyOn(console, 'info');
    await handleWorldCallback(callback('?code=secret-code-xyz', undefined, startCookie('anime', '/', 'k.menu')), fv('anime'));
    expect(JSON.stringify(spy.mock.calls)).not.toContain('secret-code-xyz');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('k.menu');
    expect(spy.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('the provider of the sign-in: Google or Discord only (security review, 2026-10-28)', () => {
  const callback = (cookie: string | null, site: 'anime' | 'hub' = 'anime'): NextRequest =>
    new NextRequest(`https://fandomverse.org${site === 'anime' ? '/anime' : ''}/auth/callback?code=c1`, { headers: cookie ? { cookie } : {} });

  it('accepts Google and Discord when the account holds that identity (an email identity next to it is fine)', async () => {
    for (const provider of ['google', 'discord'] as const) {
      for (const identities of [[{ provider }], [{ provider: 'email' }, { provider }], [{ provider: 'github' }, { provider }]]) {
        state.calls = [];
        state.identities = identities;
        const res = await handleWorldCallback(callback(startCookie('anime', '/daily', null, provider)), fv('anime'));
        expect(loc(res), `${provider} ${JSON.stringify(identities)}`).toBe('/anime/daily');
      }
    }
  });

  it('refuses another OAuth provider of the shared project: signed out on this browser, the login page, nothing read', async () => {
    const cases: Array<{ cookie: string | null; identities: Array<{ provider: string }> | undefined }> = [
      { cookie: startCookie('anime', '/daily', null, 'google'), identities: [{ provider: 'github' }] },
      { cookie: startCookie('anime', '/daily', null, 'discord'), identities: [{ provider: 'google' }] },
      { cookie: startCookie('anime', '/daily', null, 'google'), identities: [] },
      { cookie: startCookie('anime', '/daily', null, 'google'), identities: undefined },
      { cookie: null, identities: [{ provider: 'github' }] },
      { cookie: null, identities: [{ provider: 'google' }, { provider: 'twitter' }] },
      { cookie: null, identities: [{ provider: 'email' }] },
      { cookie: null, identities: [] },
    ];
    for (const c of cases) {
      state.calls = [];
      state.signOutScopes = [];
      state.identities = c.identities;
      const res = await handleWorldCallback(callback(c.cookie), fv('anime'));
      expect(loc(res), JSON.stringify(c)).toBe('/anime/login');
      expect(state.signOutScopes).toEqual(['local']);
      expect(calls('from.profiles')).toEqual([]);
      expect(calls('ensure_membership')).toEqual([]);
    }
  });

  it('oauthProviderAllowed: the started provider must be allowed and held; without it every OAuth identity must be allowed', () => {
    const allowed = ['google', 'discord'];
    expect(oauthProviderAllowed({ identities: [{ provider: 'discord' }] }, 'discord', allowed)).toBe(true);
    expect(oauthProviderAllowed({ identities: [{ provider: 'discord' }] }, 'github', allowed)).toBe(false);
    expect(oauthProviderAllowed({ identities: [{ provider: 'google' }, { provider: 'discord' }, { provider: 'email' }] }, null, allowed)).toBe(true);
    expect(oauthProviderAllowed({ identities: [{ provider: 'google' }, { provider: 'github' }] }, null, allowed)).toBe(false);
    for (const user of [null, undefined, 'x', {}, { identities: 'google' }, { identities: [null, 7, { provider: 3 }] }]) {
      expect(oauthProviderAllowed(user, null, allowed)).toBe(false);
      expect(oauthProviderAllowed(user, 'google', allowed)).toBe(false);
    }
  });
});

describe('a refused session leaves no session cookie, even when the sign-out fails (security review, 2026-10-28)', () => {
  const KEY = 'sb-abcdefghijklmnopqrst-auth-token';
  const ENV_URL = { ...FV, NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co' };
  const callback = (cookie: string): NextRequest => new NextRequest('https://fandomverse.org/anime/auth/callback?code=c1', { headers: { cookie } });
  const deleted = (): string[] => state.cookieWrites.filter((w) => w.value === '' && w.options?.maxAge === 0 && w.options?.path === '/').map((w) => w.name);

  for (const fails of ['', 'error', 'throw'] as const) {
    for (const why of ['not_oauth', 'provider'] as const) {
      it(`${why}, sign-out ${fails || 'ok'}: the key, its chunks and the verifier are deleted on Path=/`, async () => {
        state.signOutFails = fails;
        if (why === 'not_oauth') state.token = jwt([{ method: 'magiclink', timestamp: 1 }]);
        else state.identities = [{ provider: 'github' }];
        const res = await handleWorldCallback(callback(startCookie('anime', '/daily')), { site: 'anime', env: ENV_URL });
        expect(loc(res)).toBe('/anime/login');
        expect(state.signOutScopes).toEqual(['local']);
        const gone = deleted();
        for (const name of [KEY, `${KEY}.0`, `${KEY}.1`, `${KEY}.9`, `${KEY}-code-verifier`]) expect(gone, name).toContain(name);
      });
    }
  }

  it('without the project url, the session cookies the request carries are deleted by name (and nothing else)', async () => {
    state.signOutFails = 'error';
    state.token = jwt([{ method: 'otp', timestamp: 1 }]);
    state.requestCookies = [{ name: 'sb-otherref-auth-token.0', value: 'x' }, { name: 'sb-otherref-auth-token.1', value: 'y' }, { name: 'theme', value: 'dark' }];
    await handleWorldCallback(callback(startCookie('anime', '/')), fv('anime'));
    expect(deleted().sort()).toEqual(['sb-otherref-auth-token.0', 'sb-otherref-auth-token.1']);
  });

  it('an accepted session deletes nothing', async () => {
    await handleWorldCallback(callback(startCookie('anime', '/daily')), { site: 'anime', env: ENV_URL });
    expect(state.cookieWrites).toEqual([]);
  });
});

describe('GET /auth/start of anime and hub (handleOAuthStart)', () => {
  const FV_START = { ...FV, NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co' };
  const start = (query: string, base = 'https://fandomverse.org/anime'): NextRequest => new NextRequest(`${base}/auth/start${query}`);
  const ctxStart = (site: SiteId) => ({ site, env: FV_START, now: () => 1_800_000_000_000 });
  const startCookieOf = (res: Response): string | undefined => res.headers.getSetCookie().find((c) => c.startsWith(`${OAUTH_RETURN_COOKIE.https}=`));

  it('asks Supabase for the provider with the EXACT callback of the build (no query) and redirects to it', async () => {
    for (const [site, base, callbackUrl] of [
      ['anime', 'https://fandomverse.org/anime', 'https://fandomverse.org/anime/auth/callback'],
      ['hub', 'https://fandomverse.org', 'https://fandomverse.org/auth/callback'],
    ] as const) {
      for (const provider of ['google', 'discord'] as const) {
        state.calls = [];
        const res = await handleOAuthStart(start(`?provider=${provider}&returnTo=%2Fdaily&via=k.menu`, base), ctxStart(site));
        expect(res.status).toBe(302);
        expectPrivate(res);
        expect(calls('auth.signInWithOAuth')[0]!.args).toEqual({ provider, options: { redirectTo: callbackUrl } });
        expect(loc(res).startsWith('https://abcdefghijklmnopqrst.supabase.co/auth/v1/authorize?')).toBe(true);
      }
    }
  });

  it('keeps returnTo, via and the provider in an HttpOnly, Secure, SameSite=Lax, Path=/ cookie of 600 s, no Domain', async () => {
    const res = await handleOAuthStart(start('?provider=discord&returnTo=%2Fanime%2Fdaily%3Fa%3D1&via=k.menu'), ctxStart('anime'));
    const set = startCookieOf(res)!;
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/SameSite=lax/i);
    expect(set).toMatch(/Path=\/(;|$)/);
    expect(set).toMatch(/Max-Age=600/);
    expect(set).not.toMatch(/Domain=/i);
    const value = set.split(';')[0]!.slice(`${OAUTH_RETURN_COOKIE.https}=`.length);
    expect(decodeOAuthReturn(value, 'anime', 1_800_000_000)).toEqual({ site: 'anime', provider: 'discord', next: '/daily?a=1', via: 'k.menu', iat: 1_800_000_000 });
  });

  it('a hostile returnTo or via never reaches the cookie as it is', async () => {
    for (const raw of ['//evil.com', 'https://fandomverse.org.evil.com', '/.//evil.com', '/anime//evil.com']) {
      const res = await handleOAuthStart(start(`?provider=google&returnTo=${encodeURIComponent(raw)}&via=x.evil`), ctxStart('anime'));
      const value = startCookieOf(res)!.split(';')[0]!.slice(`${OAUTH_RETURN_COOKIE.https}=`.length);
      expect(decodeOAuthReturn(value, 'anime', 1_800_000_000)).toMatchObject({ next: '/', via: null });
    }
  });

  it('refuses a provider the site does not offer (400, no Supabase call), and answers 404 on kpop', async () => {
    for (const provider of ['email', 'github', 'GOOGLE', '', 'apple']) {
      const res = await handleOAuthStart(start(`?provider=${provider}`), ctxStart('anime'));
      expect(res.status, provider).toBe(400);
    }
    expect((await handleOAuthStart(start('?returnTo=%2F'), ctxStart('hub'))).status).toBe(400);
    expect((await handleOAuthStart(start('?provider=google', 'https://kpopquiz.org'), { site: 'kpop', env: FV_START })).status).toBe(404);
    expect(calls('auth.signInWithOAuth')).toEqual([]);
  });

  it('never redirects to an address Supabase did not give for its own authorize endpoint (the login page instead, no cookie)', async () => {
    for (const url of ['https://evil.com/auth/v1/authorize', 'https://abcdefghijklmnopqrst.supabase.co.evil.com/auth/v1/authorize', 'https://abcdefghijklmnopqrst.supabase.co/elsewhere', null]) {
      state.oauthUrl = url;
      const res = await handleOAuthStart(start('?provider=google'), ctxStart('anime'));
      expect(loc(res), String(url)).toBe('/anime/login');
      expect(startCookieOf(res)).toBeUndefined();
    }
    state.oauthUrl = undefined;
    state.oauthError = true;
    expect(loc(await handleOAuthStart(start('?provider=google', 'https://fandomverse.org'), ctxStart('hub')))).toBe('/login');
  });
});

describe('the return cookie (lib/auth/oauth-return.ts)', () => {
  const now = 1_800_000_000;
  const enc = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const good = { site: 'anime', provider: 'google', next: '/daily', via: 'k.menu', iat: now };

  it('reads back what it wrote, for its own site only, for 600 s', () => {
    expect(decodeOAuthReturn(enc(good), 'anime', now + 599)).toEqual(good);
    expect(decodeOAuthReturn(enc(good), 'anime', now + 600)).toBeNull();
    expect(decodeOAuthReturn(enc(good), 'hub', now)).toBeNull();
    expect(decodeOAuthReturn(enc({ ...good, iat: now + 120 }), 'anime', now)).toBeNull();
  });

  it('refuses anything malformed (fail closed)', () => {
    for (const bad of [
      { ...good, provider: 'email' }, { ...good, provider: 'github' }, { ...good, site: 'mars' }, { ...good, via: 'x.evil' }, { ...good, via: 3 },
      { ...good, next: 7 }, { ...good, next: `/${'a'.repeat(2048)}` }, { ...good, iat: 'now' },
    ]) {
      expect(decodeOAuthReturn(enc(bad), 'anime', now)).toBeNull();
    }
    for (const raw of [null, undefined, '', 'a.b', 'not base64!', enc('x'), 'x'.repeat(4000)]) expect(decodeOAuthReturn(raw as string, 'anime', now)).toBeNull();
  });

  it('the name follows the request like the passport cookie: __Host- on https and in production, plain only on http localhost', () => {
    expect(oauthReturnCookieName('https://fandomverse.org/anime/auth/start', null, {})).toBe('__Host-fv_oauth');
    expect(oauthReturnCookieName('http://localhost:3063/auth/start', null, { VERCEL_ENV: 'production' })).toBe('__Host-fv_oauth');
    expect(oauthReturnCookieName('http://anime.localhost:3063/anime/auth/start', null, {})).toBe('fv_oauth');
    expect(oauthReturnCookieName('http://fandomverse.org/auth/start', null, {})).toBeNull();
    expect(oauthReturnAttributes('fv_oauth')).toEqual({ httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 600 });
  });
});
