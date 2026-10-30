// Run O1, lot (c) part 2 (B3): the five handlers of the jump (apis.md 2.1 to 2.5) with a mocked Supabase. Each
// handler with the flag off, then each outcome of the brief on the handlers: ok, replay, pkce_fail, state_mismatch,
// expired, open_redirect, banned, unconfirmed, other_user, no_session. Nothing leaves the process.
// Bunnyverse (owner, 2026-10-28): the anime build is served under the basePath '/anime' (lib/auth/site-base.ts). Its
// addresses below move under /anime: the target page and /auth/arrive of the jump, /auth/land of authorize, the Locations of
// arrive and the `next` of redeem (browser paths). The `next` of a ticket and of the transaction cookie stays an app path.
// The Bunnyverse topology itself (hub and anime on one origin) is tested in handoff-fandomverse.test.ts.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { fn: string; args: Record<string, unknown> };
const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
  issue: 'issued' as string,
  redeem: { outcome: 'redeemed', user_id: 'user-1', from_site: 'kpop' } as { outcome: string; user_id: string | null; from_site: string | null },
  redeemError: false,
  otpError: false,
  otpUser: 'user-1' as string,
  email: 'fan@example.test' as string | null,
  linkError: false,
  created: true,
  membershipThrows: false,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
      verifyOtp: async (args: Record<string, unknown>) => {
        state.calls.push({ fn: 'auth.verifyOtp', args });
        if (state.otpError) return { data: { user: null, session: null }, error: { message: 'otp' } };
        state.user = { id: state.otpUser };
        return { data: { user: { id: state.otpUser }, session: { access_token: 'x' } }, error: null };
      },
      signOut: async () => ({ error: null }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      if (fn === 'ensure_membership') {
        if (state.membershipThrows) throw new Error('boom');
        return { data: [{ site_id: args.p_site, created: state.created }], error: null };
      }
      return { data: null, error: null };
    },
  }),
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => {
          state.calls.push({ fn: 'admin.getUserById', args: { id } });
          return { data: { user: state.email ? { id, email: state.email } : { id } }, error: null };
        },
        generateLink: async (args: Record<string, unknown>) => {
          state.calls.push({ fn: 'admin.generateLink', args });
          return state.linkError
            ? { data: null, error: { message: 'link' } }
            : { data: { properties: { hashed_token: 'hashed-token-1' } }, error: null };
        },
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      if (fn === 'passport_issue_code') return { data: state.issue, error: null };
      if (fn === 'passport_redeem_code') return state.redeemError ? { data: null, error: { message: 'x' } } : { data: [state.redeem], error: null };
      return { data: null, error: null };
    },
  }),
}));

import {
  handleArrive, handleAuthorize, handleLand, handleOut, handleRedeem, landHtml,
} from './handoff';
import {
  codeHash, newCode, newState, newVerifier, pkceChallenge, signTicket, signTx, verifyTicket,
} from './ticket';
import { B64U_32_RE } from './types';

import type { HandoffCtx } from './handoff';
import type { SiteId } from '@/lib/site/types';

const SECRET = 'test-secret-0123456789-abcdefghijklmnop';
const NOW_MS = 1_800_000_000_000;
const NOW = NOW_MS / 1000;
const ORIGINS = 'kpop=http://kpop.localhost:3103,anime=http://anime.localhost:3104,hub=http://hub.localhost:3105';
const ON = { PASSPORT_JUMP: '1', PASSPORT_TICKET_SECRET: SECRET, NET_IP_HASH_SALT: 'salt', NEXT_PUBLIC_NET_ORIGINS: ORIGINS };
const OFF = { PASSPORT_JUMP: '0', PASSPORT_TICKET_SECRET: SECRET, NEXT_PUBLIC_NET_ORIGINS: ORIGINS };
const KPOP = 'http://kpop.localhost:3103';
const ANIME = 'http://anime.localhost:3104';
/** A browser path of the anime build: its basePath, then the path inside it. */
const IN_ANIME = /^\/anime(?:[/?#]|$)/;

const ctx = (site: SiteId, env: Record<string, string | undefined> = ON): HandoffCtx => ({ site, env, now: () => NOW_MS });
const get = (url: string, headers: Record<string, string> = {}) => new NextRequest(url, { headers });
const calls = (fn: string): Call[] => state.calls.filter((c) => c.fn === fn);
const events = (): string[] => calls('passport_log_event').map((c) => String(c.args.p_outcome));
const loc = (res: Response): string => res.headers.get('location') ?? '';
const cookies = (res: Response): string[] => res.headers.getSetCookie();

beforeEach(() => {
  Object.assign(state, {
    user: null, calls: [], issue: 'issued', redeemError: false, otpError: false, otpUser: 'user-1', email: 'fan@example.test',
    linkError: false, created: true, membershipThrows: false,
    redeem: { outcome: 'redeemed', user_id: 'user-1', from_site: 'kpop' },
  });
});

function expectPrivate(res: Response): void {
  expect(res.headers.get('cache-control')).toBe('no-store');
  expect(res.headers.get('referrer-policy')).toBe('no-referrer');
}

describe('flag off (or no secret): nothing new is reachable', () => {
  it('/auth/passport/out 302s to the target page signed out, with via as a query parameter', async () => {
    state.user = { id: 'user-1' };
    for (const env of [OFF, { ...ON, PASSPORT_TICKET_SECRET: undefined }, { ...ON, PASSPORT_JUMP: undefined }]) {
      const res = await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=/quizzes&via=k.menu`), ctx('kpop', env));
      expect(res.status).toBe(302);
      expect(loc(res)).toBe(`${ANIME}/anime/quizzes?via=k.menu`);
      expectPrivate(res);
    }
    expect(state.calls).toEqual([]); // not even a session lookup: the flag is read first
  });

  it('/auth/arrive 302s to next, writes nothing, sets nothing', async () => {
    const res = await handleArrive(get(`${ANIME}/auth/arrive?from=kpop&next=/quizzes&t=anything`), ctx('anime', OFF));
    expect(res.status).toBe(302);
    expect(loc(res)).toBe('/anime/quizzes');
    expect(cookies(res)).toEqual([]);
    expect(state.calls).toEqual([]);
  });

  it('authorize, land and redeem answer 404', async () => {
    const q = `client=anime&state=${newState()}&code_challenge=${pkceChallenge(newVerifier())}&method=S256&prompt=none`;
    for (const env of [OFF, { ...ON, PASSPORT_TICKET_SECRET: '' }]) {
      const a = await handleAuthorize(get(`${KPOP}/auth/authorize?${q}`), ctx('kpop', env));
      const l = await handleLand(get(`${ANIME}/auth/land`), ctx('anime', env));
      const r = await handleRedeem(
        new NextRequest(`${ANIME}/api/passport/redeem`, { method: 'POST', body: '{}', headers: { 'content-type': 'application/json' } }),
        ctx('anime', env),
      );
      for (const res of [a, l, r]) {
        expect(res.status).toBe(404);
        expectPrivate(res);
      }
    }
    expect(state.calls).toEqual([]);
  });
});

describe('GET /auth/passport/out (flag on)', () => {
  it('signed in: mints a ticket and 302s to the target /auth/arrive', async () => {
    state.user = { id: 'user-1' };
    const res = await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=/quizzes%3Fx%3D1&via=k.menu`), ctx('kpop'));
    expect(res.status).toBe(302);
    const url = new URL(loc(res));
    expect(url.origin).toBe(ANIME);
    expect(url.pathname).toBe('/anime/auth/arrive');
    expect(url.searchParams.get('from')).toBe('kpop');
    expect(url.searchParams.get('next')).toBe('/quizzes?x=1');
    expect(url.searchParams.get('via')).toBe('k.menu');
    const t = url.searchParams.get('t')!;
    expect(verifyTicket(SECRET, t, { to: 'anime', from: 'kpop', next: '/quizzes?x=1' }, NOW + 1).ok).toBe(true);
    expect(cookies(res)).toEqual([]);
    expect(events()).toEqual([]); // it logs nothing
    expectPrivate(res);
  });

  it('signed out here: the target page, signed out', async () => {
    const res = await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=/&via=k.menu`), ctx('kpop'));
    expect(loc(res)).toBe(`${ANIME}/anime?via=k.menu`);
  });

  it('drops a via that is malformed or does not start with this site letter', async () => {
    state.user = { id: 'user-1' };
    for (const via of ['a.menu', 'k.MENU', 'k.m', 'k.menumenum', 'x.menu', '']) {
      const res = await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=/&via=${via}`), ctx('kpop'));
      expect(new URL(loc(res)).searchParams.has('via')).toBe(false);
    }
  });

  it('refuses a missing, unknown or same-site target with 400 bad_request', async () => {
    for (const to of ['', 'mars', 'kpop']) {
      const res = await handleOut(get(`${KPOP}/auth/passport/out?to=${to}&next=/`), ctx('kpop'));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'bad_request' });
    }
    expect((await handleOut(get(`${KPOP}/auth/passport/out?next=/`), ctx('kpop'))).status).toBe(400);
  });

  it('never carries an open redirect: next goes through safeReturnTo for the target site', async () => {
    state.user = { id: 'user-1' };
    for (const next of ['//evil.tld', 'https://evil.tld/x', '/\\evil.tld', 'javascript:alert(1)']) {
      const res = await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=${encodeURIComponent(next)}`), ctx('kpop'));
      expect(new URL(loc(res)).searchParams.get('next')).toBe('/');
      expect(new URL(loc(res)).origin).toBe(ANIME);
    }
  });
});

describe('GET /auth/arrive (flag on)', () => {
  const ticket = (over: { from?: SiteId; to?: SiteId; next?: string } = {}, now = NOW) =>
    signTicket(SECRET, { from: 'kpop', to: 'anime', next: '/quizzes', ...over }, now);
  const arrive = (q: Record<string, string>, headers: Record<string, string> = {}, base = ANIME) =>
    handleArrive(get(`${base}/auth/arrive?${new URLSearchParams(q).toString()}`, headers), ctx('anime'));

  it('a valid ticket: sets the transaction cookie and 302s to the identity site /auth/authorize', async () => {
    const res = await arrive({ from: 'kpop', next: '/quizzes', t: ticket(), via: 'k.menu' });
    expect(res.status).toBe(302);
    const url = new URL(loc(res));
    expect(url.origin).toBe(KPOP);
    expect(url.pathname).toBe('/auth/authorize');
    expect(url.searchParams.get('client')).toBe('anime');
    expect(url.searchParams.get('method')).toBe('S256');
    expect(url.searchParams.get('prompt')).toBe('none');
    expect(url.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(url.searchParams.get('code_challenge')).toMatch(B64U_32_RE);

    const [set] = cookies(res);
    expect(set).toMatch(/^pp_tx=/); // http on a *.localhost host
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/SameSite=lax/i);
    expect(set).toMatch(/Path=\//);
    expect(set).toMatch(/Max-Age=300/);
    expect(set).not.toMatch(/Domain=/i);
    expect(set).not.toMatch(/Secure/i);
    expectPrivate(res);
    expect(events()).toEqual([]);

    // The cookie holds the verifier whose S256 challenge the authorize URL carries, and the same state.
    const raw = decodeURIComponent(set!.split(';')[0]!.slice('pp_tx='.length));
    const payload = JSON.parse(Buffer.from(raw.split('.')[0]!, 'base64url').toString('utf8')) as Record<string, unknown>;
    expect(payload).toMatchObject({ next: '/quizzes', from: 'kpop', via: 'k.menu', iat: NOW });
    expect(pkceChallenge(String(payload.verifier))).toBe(url.searchParams.get('code_challenge'));
    expect(payload.state).toBe(url.searchParams.get('state'));
  });

  it('uses __Host-pp_tx with Secure on an https request', async () => {
    const res = await arrive({ from: 'kpop', next: '/quizzes', t: ticket() }, {}, 'https://anime.localhost:3104');
    const [set] = cookies(res);
    expect(set).toMatch(/^__Host-pp_tx=/);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/HttpOnly/i);
    expect(set).not.toMatch(/Domain=/i);
  });

  it('no t: 302 to next, nothing written (crawlers), no log', async () => {
    const res = await arrive({ from: 'kpop', next: '/anime/quizzes' });
    expect(loc(res)).toBe('/anime/quizzes');
    expect(cookies(res)).toEqual([]);
    expect(state.calls).toEqual([]);
  });

  it('already signed in here (any user): 302 to next, never switches account', async () => {
    state.user = { id: 'someone-else' };
    const res = await arrive({ from: 'kpop', next: '/quizzes', t: ticket() });
    expect(loc(res)).toBe('/anime/quizzes');
    expect(cookies(res)).toEqual([]);
    expect(events()).toEqual([]);
  });

  it('a mode parameter: 302 to next, logged bad_ticket', async () => {
    const res = await arrive({ from: 'kpop', next: '/quizzes', t: ticket(), mode: 'seed' });
    expect(loc(res)).toBe('/anime/quizzes');
    expect(cookies(res)).toEqual([]);
    expect(events()).toEqual(['bad_ticket']);
  });

  it('a ticket that fails its checks: 302 to next signed out, logged bad_ticket', async () => {
    const good = ticket();
    const bad: Array<Record<string, string>> = [
      { from: 'kpop', next: '/quizzes', t: `${good.slice(0, -2)}AA` }, // MAC
      { from: 'kpop', next: '/quizzes', t: 'garbage' },
      { from: 'hub', next: '/quizzes', t: good }, // from differs
      { from: 'kpop', next: '/other', t: good }, // next differs
      { from: 'kpop', next: '/quizzes', t: ticket({ to: 'hub' }) }, // another target
      { from: 'kpop', next: '/quizzes', t: ticket({}, NOW - 601) }, // expired
      { from: 'mars', next: '/quizzes', t: good },
    ];
    for (const q of bad) {
      state.calls = [];
      const res = await arrive(q);
      expect(res.status).toBe(302);
      expect(loc(res)).toMatch(/^\/(?!\/)/); // a path of this site, never another origin
      expect(loc(res)).toMatch(IN_ANIME); // and inside the basePath of the build
      expect(cookies(res)).toEqual([]);
      expect(events()).toEqual(['bad_ticket']);
    }
  });

  it('open_redirect: an unsafe next goes to the sanitised path on this site, logged bad_ticket, no cookie', async () => {
    for (const next of ['//evil.tld', 'https://evil.tld', '/\\evil.tld']) {
      state.calls = [];
      const res = await arrive({ from: 'kpop', next, t: ticket({ next }) });
      expect(loc(res)).toBe('/anime');
      expect(cookies(res)).toEqual([]);
      expect(events()).toEqual(['bad_ticket']);
    }
  });

  it('the log row holds sites, via and a hashed address, never the ticket', async () => {
    const t = ticket();
    await arrive({ from: 'kpop', next: '/other', t, via: 'k.menu' }, { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Mozilla/5.0 Firefox/120' });
    const [row] = calls('passport_log_event');
    expect(row!.args).toMatchObject({ p_outcome: 'bad_ticket', p_from_site: 'kpop', p_to_site: 'anime', p_via_code: 'k.menu', p_ua_family: 'firefox' });
    expect(String(row!.args.p_ip_hash)).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(state.calls)).not.toContain(t);
    expect(JSON.stringify(state.calls)).not.toContain('203.0.113.9');
  });
});

describe('GET /auth/authorize (flag on)', () => {
  const challenge = pkceChallenge(newVerifier());
  const params = (over: Record<string, string | null> = {}) => {
    const p: Record<string, string> = {
      client: 'anime', state: newState(), code_challenge: challenge, method: 'S256', prompt: 'none',
    };
    for (const [k, v] of Object.entries(over)) {
      if (v === null) delete p[k];
      else p[k] = v;
    }
    return p;
  };
  const authorize = (p: Record<string, string>, headers: Record<string, string> = {}) =>
    handleAuthorize(get(`${KPOP}/auth/authorize?${new URLSearchParams(p).toString()}`, headers), ctx('kpop'));

  it('a signed-in user gets a one-time code on the target /auth/land fragment', async () => {
    state.user = { id: 'user-1' };
    const p = params();
    const res = await authorize(p, { 'x-forwarded-for': '203.0.113.9', 'user-agent': 'Mozilla/5.0 Chrome/120 Safari/537' });
    expect(res.status).toBe(302);
    const target = loc(res);
    expect(target.startsWith(`${ANIME}/anime/auth/land#`)).toBe(true);
    const frag = new URLSearchParams(target.split('#')[1]);
    const code = frag.get('code')!;
    expect(code).toMatch(B64U_32_RE);
    expect(frag.get('state')).toBe(p.state);
    expect(frag.has('error')).toBe(false);
    // The database gets only the hash, the challenge and the sites.
    const [issue] = calls('passport_issue_code');
    expect(issue!.args).toMatchObject({
      p_user: 'user-1', p_from_site: 'kpop', p_to_site: 'anime', p_code_hash: codeHash(code), p_code_challenge: challenge,
      p_via_code: null, p_ua_family: 'chrome',
    });
    expect(JSON.stringify(issue!.args)).not.toContain(code);
    expect(String(issue!.args.p_ip_hash)).toMatch(/^[0-9a-f]{64}$/);
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expectPrivate(res);
  });

  it('no_session: no session here (a crawler, a signed-out visitor) gets login_required, logged login_required', async () => {
    const p = params();
    const res = await authorize(p);
    expect(loc(res)).toBe(`${ANIME}/anime/auth/land#error=login_required&state=${p.state}`);
    expect(events()).toEqual(['login_required']);
    expect(calls('passport_issue_code')).toEqual([]);
    expect(calls('passport_log_event')[0]!.args).toMatchObject({ p_from_site: 'kpop', p_to_site: 'anime', p_user: null });
  });

  it.each(['banned', 'unconfirmed', 'deletion_pending', 'rate_limited'])(
    '%s: the relying party sees only login_required, never why (the function logged the real outcome)', async (refusal) => {
      state.user = { id: 'user-1' };
      state.issue = refusal;
      const p = params();
      const res = await authorize(p);
      expect(loc(res)).toBe(`${ANIME}/anime/auth/land#error=login_required&state=${p.state}`);
      expect(loc(res)).not.toContain(refusal);
      expect(loc(res)).not.toContain('code=');
    },
  );

  it('a database error is login_required too (fail closed)', async () => {
    state.user = { id: 'user-1' };
    state.issue = '';
    expect(loc(await authorize(params())).includes('error=login_required')).toBe(true);
  });

  it('answers 400 plain text, no redirect, for a malformed request', async () => {
    state.user = { id: 'user-1' };
    const bad: Array<Record<string, string>> = [
      params({ prompt: 'select' }), params({ prompt: null }), params({ method: 'plain' }), params({ method: null }),
      params({ code_challenge: 'short' }), params({ code_challenge: null }), params({ state: 'short' }), params({ state: null }),
      params({ client: 'kpop' }), params({ client: 'mars' }), params({ client: null }),
    ];
    for (const p of bad) {
      const res = await authorize(p);
      expect(res.status).toBe(400);
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('content-type')).toContain('text/plain');
    }
    expect(calls('passport_issue_code')).toEqual([]);
  });
});

describe('GET /auth/land (flag on)', () => {
  it('is a tiny page: nonce CSP, no layout, no-referrer, no-store, frame-ancestors none', async () => {
    const res = await handleLand(get(`${ANIME}/auth/land`), ctx('anime'));
    expect(res.status).toBe(200);
    expectPrivate(res);
    const csp = res.headers.get('content-security-policy')!;
    const nonce = /script-src 'nonce-([A-Za-z0-9_-]{22})'/.exec(csp)?.[1];
    expect(nonce).toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("default-src 'none'");
    expect(csp).not.toContain('unsafe-inline');
    const html = await res.text();
    expect(html).toContain(`<script nonce="${nonce}">`);
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).not.toMatch(/src=|https?:\/\//);
    // The fragment is read and stripped before anything else, then posted to redeem.
    const script = html.split('<script nonce')[1]!;
    expect(script.indexOf('location.hash')).toBeLessThan(script.indexOf('replaceState'));
    expect(script.indexOf('replaceState')).toBeLessThan(script.indexOf('fetch('));
    expect(script).toContain("'/anime/api/passport/redeem'");
    expect(script).toContain("history.replaceState(null,'','/anime/auth/land')");
    expect(script).toContain('location.replace');
  });

  it('a fresh nonce on every answer, and landHtml puts it in the script tag', async () => {
    const a = (await handleLand(get(`${ANIME}/auth/land`), ctx('anime'))).headers.get('content-security-policy');
    const b = (await handleLand(get(`${ANIME}/auth/land`), ctx('anime'))).headers.get('content-security-policy');
    expect(a).not.toBe(b);
    expect(landHtml('NONCE')).toContain('<script nonce="NONCE">');
  });
});

describe('POST /api/passport/redeem (flag on)', () => {
  interface Setup { verifier: string; state: string; code: string; cookie: string; name: string }
  function setup(over: { iat?: number; next?: string; via?: string | null; from?: SiteId } = {}): Setup {
    const verifier = newVerifier();
    const st = newState();
    const name = 'pp_tx';
    const cookie = signTx(SECRET, {
      state: st, verifier, next: over.next ?? '/quizzes', from: over.from ?? 'kpop', via: over.via === undefined ? 'k.menu' : over.via, iat: over.iat ?? NOW,
    });
    return { verifier, state: st, code: newCode(), cookie, name };
  }
  function redeem(s: Setup | null, body: unknown, headers: Record<string, string> = {}, base = ANIME) {
    const h: Record<string, string> = { 'content-type': 'application/json', origin: ANIME, ...headers };
    if (s) h.cookie = `${s.name}=${s.cookie}`;
    return handleRedeem(
      new NextRequest(`${base}/api/passport/redeem`, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: h }),
      ctx('anime'),
    );
  }
  const cleared = (res: Response): boolean => cookies(res).some((c) => /^pp_tx=;/.test(c) && /Max-Age=0/i.test(c) && /Path=\//.test(c) && /HttpOnly/i.test(c));

  it('ok: checks state and PKCE, makes the session without sending an email, ensures the membership, answers next', async () => {
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state }, { 'x-forwarded-for': '203.0.113.9' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ next: '/anime/quizzes' });
    expect(cleared(res)).toBe(true);
    expectPrivate(res);

    const [rc] = calls('passport_redeem_code');
    expect(rc!.args).toMatchObject({
      p_code_hash: codeHash(s.code), p_to_site: 'anime', p_code_challenge: pkceChallenge(s.verifier), p_via_code: 'k.menu',
    });
    expect(JSON.stringify(rc!.args)).not.toContain(s.verifier);
    expect(JSON.stringify(rc!.args)).not.toContain(s.code);
    expect(calls('admin.getUserById')[0]!.args).toEqual({ id: 'user-1' });
    expect(calls('admin.generateLink')[0]!.args).toEqual({ type: 'magiclink', email: 'fan@example.test' });
    expect(calls('auth.verifyOtp')[0]!.args).toEqual({ type: 'email', token_hash: 'hashed-token-1' });
    expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'anime', p_via: 'jump', p_via_code: 'k.menu' });
    // The join is counted where it happens, with the via code's link id.
    expect(calls('net_bridge_bump')[0]!.args).toEqual({
      p_src: 'kpop', p_dst: 'anime', p_bridge: 'menu', p_step: 'join', p_signed_in: true, p_n: 1,
    });
    // Order: the code is consumed before the session exists, the stamp comes last.
    const order = state.calls.map((c) => c.fn);
    expect(order.indexOf('passport_redeem_code')).toBeLessThan(order.indexOf('auth.verifyOtp'));
    expect(order.indexOf('auth.verifyOtp')).toBeLessThan(order.indexOf('ensure_membership'));
  });

  it('no join counter when the stamp already existed or the visit had no via', async () => {
    state.created = false;
    const s = setup();
    expect((await redeem(s, { code: s.code, state: s.state })).status).toBe(200);
    expect(calls('net_bridge_bump')).toEqual([]);
    state.calls = [];
    state.created = true;
    state.user = null;
    const t = setup({ via: null });
    expect((await redeem(t, { code: t.code, state: t.state })).status).toBe(200);
    expect(calls('ensure_membership')[0]!.args).toEqual({ p_site: 'anime', p_via: 'jump', p_via_code: null });
    expect(calls('net_bridge_bump')).toEqual([]);
  });

  it('a failing stamp keeps the session and still answers 200', async () => {
    state.membershipThrows = true;
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(200);
    expect(calls('auth.verifyOtp')).toHaveLength(1);
  });

  it('replay: a code already used is 400 replay, no session', async () => {
    state.redeem = { outcome: 'replay', user_id: null, from_site: null };
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'replay', next: '/anime/quizzes' });
    expect(cleared(res)).toBe(true);
    expect(calls('auth.verifyOtp')).toEqual([]);
    expect(calls('admin.generateLink')).toEqual([]);
  });

  it('pkce_fail: a challenge that does not match is 400 pkce_fail, no session', async () => {
    state.redeem = { outcome: 'pkce_fail', user_id: null, from_site: null };
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'pkce_fail', next: '/anime/quizzes' });
    expect(calls('auth.verifyOtp')).toEqual([]);
  });

  it('expired: an expired or unknown code is 400 expired', async () => {
    state.redeem = { outcome: 'expired', user_id: null, from_site: null };
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'expired', next: '/anime/quizzes' });
  });

  it('expired: a transaction cookie past 300 s is 400 expired, logged, and the code is never redeemed', async () => {
    const s = setup({ iat: NOW - 301 });
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'expired', next: '/anime/quizzes' });
    expect(cleared(res)).toBe(true);
    expect(events()).toEqual(['expired']);
    expect(calls('passport_redeem_code')).toEqual([]);
  });

  it('state_mismatch: a different state is 400 state_mismatch, logged, the code is never redeemed', async () => {
    const s = setup();
    const res = await redeem(s, { code: s.code, state: newState() });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'state_mismatch', next: '/anime/quizzes' });
    expect(cleared(res)).toBe(true);
    expect(events()).toEqual(['state_mismatch']);
    expect(calls('passport_redeem_code')).toEqual([]);
  });

  it('state_mismatch: a missing, tampered or foreign cookie is 400 state_mismatch with next "/"', async () => {
    const s = setup();
    for (const cookie of [null, `${s.cookie.slice(0, -2)}AA`, 'garbage']) {
      state.calls = [];
      const send = cookie === null ? null : { ...s, cookie };
      const res = await redeem(send, { code: s.code, state: s.state });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'state_mismatch', next: '/anime' });
      expect(cleared(res)).toBe(true);
      expect(events()).toEqual(['state_mismatch']);
      expect(calls('passport_redeem_code')).toEqual([]);
    }
  });

  it('other_user: another user already signed in here is 409, never a silent switch', async () => {
    state.user = { id: 'someone-else' };
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: 'other_user', next: '/anime/quizzes' });
    expect(cleared(res)).toBe(true);
    expect(calls('auth.verifyOtp')).toEqual([]);
    expect(calls('admin.generateLink')).toEqual([]);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('the same user already signed in here keeps the session: 200 without a new one', async () => {
    state.user = { id: 'user-1' };
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ next: '/anime/quizzes' });
    expect(calls('auth.verifyOtp')).toEqual([]);
    expect(calls('admin.generateLink')).toEqual([]);
    expect(calls('ensure_membership')).toHaveLength(1);
  });

  it('banned and unconfirmed never reach redeem: the identity site refused them (no code), the land page posts login_required', async () => {
    const s = setup();
    const res = await redeem(s, { error: 'login_required', state: s.state });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'login_required', next: '/anime/quizzes' });
    expect(cleared(res)).toBe(true);
    expect(calls('passport_redeem_code')).toEqual([]);
    expect(events()).toEqual([]); // the identity site logged the real outcome
  });

  it('a session that cannot be made (Auth error, no email, wrong user) is 400 expired and signs nobody in', async () => {
    const s = setup();
    state.otpError = true;
    expect((await redeem(s, { code: s.code, state: s.state })).status).toBe(400);
    state.otpError = false; state.linkError = true; state.user = null;
    expect((await redeem(s, { code: s.code, state: s.state })).status).toBe(400);
    state.linkError = false; state.email = null; state.user = null;
    expect((await redeem(s, { code: s.code, state: s.state })).status).toBe(400);
    state.email = 'fan@example.test'; state.otpUser = 'a-different-user'; state.user = null;
    const wrong = await redeem(s, { code: s.code, state: s.state });
    expect(wrong.status).toBe(400);
    expect(calls('ensure_membership')).toEqual([]);
  });

  it('a code issued by another site than the cookie names is refused', async () => {
    state.redeem = { outcome: 'redeemed', user_id: 'user-1', from_site: 'hub' };
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(res.status).toBe(400);
    expect(calls('auth.verifyOtp')).toEqual([]);
  });

  it('refuses a foreign Origin with 403 before anything else, and accepts none or the own one', async () => {
    const s = setup();
    const res = await redeem(s, { code: s.code, state: s.state }, { origin: 'https://evil.tld' });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: 'origin' });
    expect(state.calls).toEqual([]);
    const h: Record<string, string> = { 'content-type': 'application/json', cookie: `pp_tx=${s.cookie}` };
    const noOrigin = await handleRedeem(
      new NextRequest(`${ANIME}/api/passport/redeem`, { method: 'POST', body: JSON.stringify({ code: s.code, state: s.state }), headers: h }),
      ctx('anime'),
    );
    expect(noOrigin.status).toBe(200);
  });

  it('refuses a body that is not JSON, too large, or malformed with 400 bad_request, and a code that is not 43 characters', async () => {
    const s = setup();
    expect((await redeem(s, 'not json')).status).toBe(400);
    expect((await redeem(s, { code: s.code })).status).toBe(400);
    expect((await redeem(s, { code: 'x'.repeat(3000), state: s.state })).status).toBe(400);
    const wrongType = await handleRedeem(
      new NextRequest(`${ANIME}/api/passport/redeem`, {
        method: 'POST', body: JSON.stringify({ code: s.code, state: s.state }),
        headers: { 'content-type': 'text/plain', origin: ANIME, cookie: `pp_tx=${s.cookie}` },
      }),
      ctx('anime'),
    );
    expect(wrongType.status).toBe(400);
    expect(await wrongType.json()).toEqual({ error: 'bad_request', next: '/anime' });
    state.calls = [];
    const shortCode = await redeem(s, { code: 'short', state: s.state });
    expect(shortCode.status).toBe(400);
    expect(await shortCode.json()).toEqual({ error: 'expired', next: '/anime/quizzes' });
    expect(calls('passport_redeem_code')).toEqual([]);
  });

  it('answers the cookie next, re-checked with safeReturnTo', async () => {
    const s = setup({ next: '//evil.tld' });
    const res = await redeem(s, { code: s.code, state: s.state });
    expect(await res.json()).toEqual({ next: '/anime' });
  });

  it('never logs or returns a code, a verifier, a state, a ticket or an email', async () => {
    const s = setup();
    const ok = await redeem(s, { code: s.code, state: s.state }, { 'x-forwarded-for': '203.0.113.9' });
    const body = JSON.stringify(await ok.json()) + cookies(ok).join('|');
    for (const secretValue of [s.code, s.verifier, s.state, 'fan@example.test']) expect(body).not.toContain(secretValue);
    const logged = JSON.stringify(calls('passport_log_event'));
    for (const secretValue of [s.code, s.verifier, s.state, 'fan@example.test', '203.0.113.9']) expect(logged).not.toContain(secretValue);
  });

  it('the cookie name follows the request: __Host-pp_tx on https, and a pp_tx sent over https is ignored', async () => {
    const s = setup();
    const https = 'https://anime.localhost:3104';
    const dev = await handleRedeem(
      new NextRequest(`${https}/api/passport/redeem`, {
        method: 'POST', body: JSON.stringify({ code: s.code, state: s.state }),
        headers: { 'content-type': 'application/json', origin: ANIME, cookie: `pp_tx=${s.cookie}` },
      }),
      ctx('anime'),
    );
    expect(dev.status).toBe(400); // no downgrade: the dev name is never read on https
    expect(await dev.json()).toEqual({ error: 'state_mismatch', next: '/anime' });
    const host = await handleRedeem(
      new NextRequest(`${https}/api/passport/redeem`, {
        method: 'POST', body: JSON.stringify({ code: s.code, state: s.state }),
        headers: { 'content-type': 'application/json', origin: ANIME, cookie: `__Host-pp_tx=${s.cookie}` },
      }),
      ctx('anime'),
    );
    expect(host.status).toBe(200);
    expect(cookies(host).some((c) => /^__Host-pp_tx=;/.test(c) && /Max-Age=0/i.test(c) && /Secure/i.test(c))).toBe(true);
  });
});

describe('the three sites share the handlers', () => {
  it('the hub and kpop builds answer /auth/passport/out like anime does (each reads its own site first)', async () => {
    state.user = { id: 'user-1' };
    const fromHub = await handleOut(get('http://hub.localhost:3105/auth/passport/out?to=anime&next=/&via=f.nav'), ctx('hub'));
    expect(new URL(loc(fromHub)).searchParams.get('from')).toBe('hub');
    expect(new URL(loc(fromHub)).searchParams.get('via')).toBe('f.nav');
    const fromAnime = await handleOut(get(`${ANIME}/auth/passport/out?to=kpop&next=/`), ctx('anime'));
    expect(new URL(loc(fromAnime)).origin).toBe(KPOP);
    expect(new URL(loc(fromAnime)).searchParams.get('from')).toBe('anime');
  });
});
