// Bunnyverse (owner, 2026-10-28; lane 3): the passport jump between kpopquiz.org and bunnyverse.org. kpop stays
// https://kpopquiz.org; the hub is https://bunnyverse.org; anime is https://bunnyverse.org/anime (basePath '/anime', the
// same origin as the hub, so hub and anime share one session and never hand off to each other). The topology is given as a
// preview deployment (NEXT_PUBLIC_NET_ORIGINS), so these tests hold before and after the registry urls move.
//
// Proven here: the target and identity addresses of each leg (origin + basePath), the same-origin pair (no ticket, no code,
// no transaction cookie), the exact Origin check of redeem (look-alikes refused), and the land page of anime, which only ever
// goes to a path inside /anime. TTL, single use, PKCE, the ticket and transaction MACs are the unchanged code of
// handoff.test.ts and ticket.test.ts.
import { runInNewContext } from 'node:vm';

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  calls: [] as Array<{ fn: string; args: Record<string, unknown> }>,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: {
      getUser: async () => { state.calls.push({ fn: 'auth.getUser', args: {} }); return { data: { user: state.user } }; },
      verifyOtp: async () => { state.user = { id: 'user-1' }; return { data: { user: { id: 'user-1' }, session: { access_token: 'x' } }, error: null }; },
      signOut: async () => ({ error: null }),
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      return { data: fn === 'ensure_membership' ? [{ site_id: args.p_site, created: false }] : null, error: null };
    },
  }),
  createServiceRoleClient: () => ({
    auth: {
      admin: {
        getUserById: async (id: string) => ({ data: { user: { id, email: 'fan@example.test' } }, error: null }),
        generateLink: async () => ({ data: { properties: { hashed_token: 'hashed-token-1' } }, error: null }),
      },
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push({ fn, args });
      if (fn === 'passport_issue_code') return { data: 'issued', error: null };
      if (fn === 'passport_redeem_code') return { data: [{ outcome: 'redeemed', user_id: 'user-1', from_site: 'kpop' }], error: null };
      return { data: null, error: null };
    },
  }),
}));

import { handleArrive, handleAuthorize, handleLand, handleOut, handleRedeem, landHtml } from './handoff';
import { newCode, newState, newVerifier, pkceChallenge, signTicket, signTx, verifyTicket } from './ticket';

import type { HandoffCtx } from './handoff';
import type { SiteId } from '@/lib/site/types';

const SECRET = 'fandomverse-test-secret-0123456789';
const NOW_MS = 1_800_000_000_000;
const NOW = NOW_MS / 1000;
const FV = {
  PASSPORT_JUMP: '1', PASSPORT_TICKET_SECRET: SECRET, NET_IP_HASH_SALT: 'salt', VERCEL_ENV: 'preview',
  NEXT_PUBLIC_NET_ORIGINS: 'kpop=https://kpopquiz.org,anime=https://bunnyverse.org,hub=https://bunnyverse.org',
};
const KPOP = 'https://kpopquiz.org';
const FVO = 'https://bunnyverse.org';
const ctx = (site: SiteId): HandoffCtx => ({ site, env: FV, now: () => NOW_MS });
const get = (url: string, headers: Record<string, string> = {}): NextRequest => new NextRequest(url, { headers });
const loc = (res: Response): string => res.headers.get('location') ?? '';
const fns = (): string[] => state.calls.map((c) => c.fn);
/** Origins that are not https://bunnyverse.org, in every look-alike shape. */
const NOT_FV = [
  'https://bunnyverse.org.evil.com', 'https://evil.com', 'https://kpopquiz.org', 'http://bunnyverse.org', 'https://www.bunnyverse.org',
  'https://bunnyverse.org:8443', 'https://bunnyverse.org/anime', 'https://bunnyverse.org/', 'null', 'https://evil.com/bunnyverse.org',
];

beforeEach(() => {
  state.user = null;
  state.calls = [];
});

describe('kpopquiz.org to bunnyverse.org (and back): every leg at the origin and basePath of its site', () => {
  it('kpop to anime: the ticket goes to https://bunnyverse.org/anime/auth/arrive, its next an app path', async () => {
    state.user = { id: 'user-1' };
    const res = await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=%2Fquizzes%3Fx%3D1&via=k.menu`), ctx('kpop'));
    const url = new URL(loc(res));
    expect(`${url.origin}${url.pathname}`).toBe(`${FVO}/anime/auth/arrive`);
    expect(url.searchParams.get('next')).toBe('/quizzes?x=1');
    expect(verifyTicket(SECRET, url.searchParams.get('t')!, { to: 'anime', from: 'kpop', next: '/quizzes?x=1' }, NOW + 1).ok).toBe(true);
  });

  it('kpop to the hub: https://bunnyverse.org/auth/arrive', async () => {
    state.user = { id: 'user-1' };
    const url = new URL(loc(await handleOut(get(`${KPOP}/auth/passport/out?to=hub&next=%2Fpassport`), ctx('kpop'))));
    expect(`${url.origin}${url.pathname}`).toBe(`${FVO}/auth/arrive`);
    expect(verifyTicket(SECRET, url.searchParams.get('t')!, { to: 'hub', from: 'kpop', next: '/passport' }, NOW + 1).ok).toBe(true);
  });

  it('signed out on kpop: the anime page itself, under /anime; a browser path of anime as next is not doubled', async () => {
    expect(loc(await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=%2Fquizzes&via=k.menu`), ctx('kpop')))).toBe(`${FVO}/anime/quizzes?via=k.menu`);
    expect(loc(await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=%2Fanime%2Fdaily`), ctx('kpop')))).toBe(`${FVO}/anime/daily`);
    expect(loc(await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=%2F`), ctx('kpop')))).toBe(`${FVO}/anime`);
  });

  it('anime and hub to kpop: https://kpopquiz.org/auth/arrive', async () => {
    state.user = { id: 'user-1' };
    for (const from of ['anime', 'hub'] as const) {
      const url = new URL(loc(await handleOut(get(`${FVO}/auth/passport/out?to=kpop&next=%2F`), ctx(from))));
      expect(`${url.origin}${url.pathname}`).toBe(`${KPOP}/auth/arrive`);
      expect(url.searchParams.get('from')).toBe(from);
    }
  });

  it('a hostile next never leaves the target: bunnyverse.org inside /anime, the ticket carries the home', async () => {
    const hostile = ['https://bunnyverse.org.evil.com/x', 'https://evil.com/bunnyverse.org', '//bunnyverse.org.evil.com', '/\\evil.com', '/anime//evil.com', '/anime/../passport', '/%2e%2e/passport'];
    for (const next of hostile) {
      state.user = null;
      const plain = new URL(loc(await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=${encodeURIComponent(next)}`), ctx('kpop'))));
      expect(plain.origin, next).toBe(FVO);
      expect(plain.pathname === '/anime' || plain.pathname.startsWith('/anime/'), `${next} -> ${plain.href}`).toBe(true);
      state.user = { id: 'user-1' };
      const jump = new URL(loc(await handleOut(get(`${KPOP}/auth/passport/out?to=anime&next=${encodeURIComponent(next)}`), ctx('kpop'))));
      expect(jump.origin).toBe(FVO);
      expect(jump.pathname).toBe('/anime/auth/arrive');
      expect(jump.searchParams.get('next')!.startsWith('/') && !jump.searchParams.get('next')!.startsWith('//')).toBe(true);
    }
  });

  it('the target is a site id, never an address: an origin-shaped `to` is 400', async () => {
    for (const to of ['https://bunnyverse.org', 'bunnyverse.org', 'https://bunnyverse.org.evil.com', 'anime/']) {
      expect((await handleOut(get(`${KPOP}/auth/passport/out?to=${encodeURIComponent(to)}&next=%2F`), ctx('kpop'))).status).toBe(400);
    }
  });
});

describe('hub and anime share one origin: nothing to hand off between them', () => {
  it('out: the page itself, no ticket, not even a session lookup', async () => {
    state.user = { id: 'user-1' };
    expect(loc(await handleOut(get(`${FVO}/auth/passport/out?to=anime&next=%2Fquizzes&via=f.nav`), ctx('hub')))).toBe(`${FVO}/anime/quizzes?via=f.nav`);
    expect(loc(await handleOut(get(`${FVO}/anime/auth/passport/out?to=hub&next=%2Fpassport`), ctx('anime')))).toBe(`${FVO}/passport`);
    expect(fns()).toEqual([]);
  });

  it('arrive: a ticket from the other one is a bad ticket (it is never minted), no cookie, no session lookup', async () => {
    const t = signTicket(SECRET, { from: 'hub', to: 'anime', next: '/quizzes' }, NOW);
    const res = await handleArrive(get(`${FVO}/anime/auth/arrive?${new URLSearchParams({ from: 'hub', next: '/quizzes', t }).toString()}`), ctx('anime'));
    expect(loc(res)).toBe('/anime/quizzes');
    expect(res.headers.getSetCookie()).toEqual([]);
    expect(fns()).toEqual(['passport_log_event']);
    expect(state.calls[0]!.args.p_outcome).toBe('bad_ticket');
  });

  it('authorize: the other one is not a client (400, no code)', async () => {
    state.user = { id: 'user-1' };
    const q = (client: string) => new URLSearchParams({ client, state: newState(), code_challenge: pkceChallenge(newVerifier()), method: 'S256', prompt: 'none' }).toString();
    expect((await handleAuthorize(get(`${FVO}/auth/authorize?${q('anime')}`), ctx('hub'))).status).toBe(400);
    expect((await handleAuthorize(get(`${FVO}/anime/auth/authorize?${q('hub')}`), ctx('anime'))).status).toBe(400);
    expect(fns()).not.toContain('passport_issue_code');
  });
});

describe('arrive and authorize between kpop and bunnyverse.org', () => {
  it('arrive on anime: the __Host- transaction cookie (Path=/, no Domain), then kpop /auth/authorize with client anime', async () => {
    const t = signTicket(SECRET, { from: 'kpop', to: 'anime', next: '/quizzes' }, NOW);
    const res = await handleArrive(get(`${FVO}/anime/auth/arrive?${new URLSearchParams({ from: 'kpop', next: '/quizzes', t }).toString()}`), ctx('anime'));
    const url = new URL(loc(res));
    expect(`${url.origin}${url.pathname}`).toBe(`${KPOP}/auth/authorize`);
    expect(url.searchParams.get('client')).toBe('anime');
    const [set] = res.headers.getSetCookie();
    expect(set).toMatch(/^__Host-pp_tx=/);
    expect(set).toMatch(/Path=\//);
    expect(set).toMatch(/Secure/i);
    expect(set).not.toMatch(/Domain=/i);
  });

  it('authorize on kpop: the code goes to /auth/land of the client, at its origin and basePath', async () => {
    state.user = { id: 'user-1' };
    for (const [client, land] of [['anime', `${FVO}/anime/auth/land#`], ['hub', `${FVO}/auth/land#`]] as const) {
      const q = new URLSearchParams({ client, state: newState(), code_challenge: pkceChallenge(newVerifier()), method: 'S256', prompt: 'none' });
      const res = await handleAuthorize(get(`${KPOP}/auth/authorize?${q.toString()}`), ctx('kpop'));
      expect(loc(res).startsWith(land), loc(res)).toBe(true);
      expect(loc(res)).toContain('code=');
    }
  });
});

describe('POST /api/passport/redeem on bunnyverse.org', () => {
  function post(site: 'anime' | 'hub', headers: Record<string, string>, next = '/quizzes'): Promise<Response> {
    const st = newState();
    const cookie = signTx(SECRET, { state: st, verifier: newVerifier(), next, from: 'kpop', via: null, iat: NOW });
    const path = site === 'anime' ? '/anime/api/passport/redeem' : '/api/passport/redeem';
    return handleRedeem(
      new NextRequest(`${FVO}${path}`, {
        method: 'POST', body: JSON.stringify({ code: newCode(), state: st }),
        headers: { 'content-type': 'application/json', cookie: `__Host-pp_tx=${cookie}`, ...headers },
      }),
      ctx(site),
    );
  }

  it('anime and hub accept the Origin https://bunnyverse.org; anime answers a next inside /anime', async () => {
    const anime = await post('anime', { origin: FVO });
    expect(anime.status).toBe(200);
    expect(await anime.json()).toEqual({ next: '/anime/quizzes' });
    state.user = null;
    const hub = await post('hub', { origin: FVO }, '/passport');
    expect(hub.status).toBe(200);
    expect(await hub.json()).toEqual({ next: '/passport' });
  });

  it('refuses every other Origin shape with 403 before anything else', async () => {
    for (const site of ['anime', 'hub'] as const) {
      for (const origin of NOT_FV) {
        state.calls = [];
        const res = await post(site, { origin });
        expect(res.status, `${site} ${origin}`).toBe(403);
        expect(fns()).toEqual([]);
      }
    }
  });

  it('a hostile next in the cookie still answers a path inside /anime', async () => {
    for (const next of ['//evil.com', 'https://bunnyverse.org.evil.com', '/anime//evil.com', '/../passport', '/\\evil.com']) {
      state.user = null;
      const body = (await (await post('anime', { origin: FVO }, next)).json()) as { next: string };
      expect(body.next === '/anime' || body.next.startsWith('/anime/'), `${next} -> ${body.next}`).toBe(true);
    }
  });
});

describe('the land page', () => {
  /** Runs the land script with a fragment and a redeem answer; resolves with where it went. */
  async function land(html: string, hash: string, answer: unknown): Promise<{ replaced: string | null; posted: string | null; shown: string | null }> {
    const script = /<script nonce="[^"]+">([^]*)<\/script>/.exec(html)![1]!;
    const out = { replaced: null as string | null, posted: null as string | null, shown: null as string | null };
    let done: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => { done = resolve; });
    const sandbox = {
      URLSearchParams,
      JSON,
      location: { hash, replace: (u: string) => { out.replaced = u; done(); } },
      history: { replaceState: (_s: unknown, _t: string, u: string) => { out.shown = u; } },
      fetch: async (u: string) => { out.posted = u; return { json: async () => answer }; },
    };
    runInNewContext(script, sandbox);
    await Promise.race([finished, new Promise((r) => setTimeout(r, 200))]);
    return out;
  }

  it('anime: lives at /anime/auth/land, posts to /anime/api/passport/redeem, and only ever goes inside /anime', async () => {
    const res = await handleLand(get(`${FVO}/anime/auth/land`), ctx('anime'));
    const html = await res.text();
    expect(html).toContain('<noscript><p><a href="/anime">Continue</a></p></noscript>');
    for (const [next, expected] of [
      ['/anime/quizzes', '/anime/quizzes'], ['/anime', '/anime'], ['/anime?x=1', '/anime?x=1'], ['/anime#t', '/anime#t'],
      ['/passport', '/anime'], ['/animex', '/anime'], ['//evil.com', '/anime'], ['https://evil.com', '/anime'], ['/\\evil.com', '/anime'],
      [undefined, '/anime'], [7, '/anime'],
    ] as const) {
      const out = await land(html, '#code=c&state=s', { next });
      expect(out.shown).toBe('/anime/auth/land');
      expect(out.posted).toBe('/anime/api/passport/redeem');
      expect(out.replaced, String(next)).toBe(expected);
    }
    expect((await land(html, '', {})).replaced).toBe('/anime');
  });

  it('kpop and the hub: the script of before, byte for byte (no basePath)', async () => {
    const before = "function go(u){location.replace(typeof u==='string'&&u.charAt(0)==='/'&&u.charAt(1)!=='/'&&u.indexOf('\\\\')<0?u:'/');}";
    expect(landHtml('N')).toContain(before);
    expect(landHtml('N', '')).toBe(landHtml('N'));
    expect(landHtml('N')).toContain("history.replaceState(null,'','/auth/land');");
    expect(landHtml('N')).toContain("fetch('/api/passport/redeem',");
    const hub = await (await handleLand(get(`${FVO}/auth/land`), ctx('hub'))).text();
    expect((await land(hub, '#code=c&state=s', { next: '/passport' })).replaced).toBe('/passport');
    expect((await land(hub, '#code=c&state=s', { next: '//evil.com' })).replaced).toBe('/');
  });

  it('refuses to write a basePath that is not a plain path segment into the page', () => {
    for (const bad of ["/a'b", '/A', 'anime', '/anime/', '/x</script>']) expect(() => landHtml('N', bad)).toThrow();
  });
});
