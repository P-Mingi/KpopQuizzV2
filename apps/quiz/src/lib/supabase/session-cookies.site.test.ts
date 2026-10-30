// Bunnyverse (owner, 2026-10-28; lane 3): hub (https://bunnyverse.org) and anime (https://bunnyverse.org/anime, basePath
// '/anime') share one session. That holds because both builds write the Supabase session cookies with Path=/ and no Domain,
// under one name that comes from the Supabase project, never from the site or the host. Proven with the real @supabase/ssr
// behind our server client (lib/supabase/server.ts): a sign-in writes the cookies, a sign-out clears the same cookies, with
// the same attributes, on the anime and the hub build alike. The session middleware passes the options through unchanged,
// and puts the basePath back on its redirects (lib/supabase/middleware.ts).
// Security review (2026-10-28): on the hub and anime the cookies carry Secure over https (server client, middleware and
// browser client); plain http to a local dev server keeps working; kpop keeps @supabase/ssr's defaults exactly.
import { DEFAULT_COOKIE_OPTIONS } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Options = Record<string, unknown> | undefined;
const jar = vi.hoisted(() => ({
  values: new Map<string, string>(),
  writes: [] as Array<{ name: string; value: string; options: Options }>,
  proto: 'http' as string | null,
}));

vi.mock('next/headers', () => ({
  headers: async () => new Headers(jar.proto ? { 'x-forwarded-proto': jar.proto } : {}),
  cookies: async () => ({
    getAll: () => [...jar.values].map(([name, value]) => ({ name, value })),
    set: (name: string, value: string, options?: Options) => {
      jar.writes.push({ name, value, options });
      if (options && (options.maxAge === 0)) jar.values.delete(name);
      else jar.values.set(name, value);
    },
  }),
}));

const REF = 'abcdefghijklmnopqrst';
const KEY = `sb-${REF}-auth-token`;

function accessToken(): string {
  const b64u = (o: unknown): string => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  return `${b64u({ alg: 'HS256', typ: 'JWT' })}.${b64u({ sub: 'user-1', aud: 'authenticated', role: 'authenticated', exp: now + 3600, iat: now, session_id: 's1', amr: [{ method: 'oauth', timestamp: now }] })}.c2ln`;
}

/** Supabase Auth, as far as a PKCE exchange and a local sign-out go. */
const fakeFetch = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('/auth/v1/token')) {
    const now = Math.floor(Date.now() / 1000);
    return new Response(JSON.stringify({
      access_token: accessToken(), token_type: 'bearer', expires_in: 3600, expires_at: now + 3600, refresh_token: 'refresh-1',
      user: { id: 'user-1', aud: 'authenticated', role: 'authenticated', app_metadata: { provider: 'discord' }, user_metadata: {}, created_at: '2026-10-28T00:00:00Z' },
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (url.includes('/auth/v1/logout')) return new Response(null, { status: 204 });
  return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
});

async function serverClientOn(site: 'anime' | 'hub' | 'kpop'): Promise<Awaited<ReturnType<typeof import('./server').createServerClient>>> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${REF}.supabase.co`);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
  vi.stubGlobal('fetch', fakeFetch);
  const { createServerClient } = await import('./server');
  return createServerClient();
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  jar.values.clear();
  jar.writes.length = 0;
  jar.proto = 'http';
  fakeFetch.mockClear();
});

describe('the session cookies of the hub and anime builds', () => {
  it('@supabase/ssr writes with Path=/ and no Domain by default (our clients pass no cookie options)', () => {
    expect(DEFAULT_COOKIE_OPTIONS.path).toBe('/');
    expect((DEFAULT_COOKIE_OPTIONS as Record<string, unknown>).domain).toBeUndefined();
  });

  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: a sign-in writes ${KEY} with Path=/ and no Domain; a sign-out clears the same cookie with the same attributes`, async () => {
      jar.values.set(`${KEY}-code-verifier`, 'verifier-0123456789-0123456789-0123456789');
      const db = await serverClientOn(site);
      const { error } = await db.auth.exchangeCodeForSession('code-1');
      expect(error).toBeNull();

      const session = jar.writes.filter((w) => w.value !== '' && (w.name === KEY || w.name.startsWith(`${KEY}.`)));
      expect(session.length).toBeGreaterThan(0);
      for (const w of [...session]) {
        expect(w.options?.path, w.name).toBe('/');
        expect(w.options?.domain, w.name).toBeUndefined();
      }
      // the cookie name is the project's, not the site's: the other build reads the very same cookie
      expect(session.every((w) => !w.name.includes(site))).toBe(true);

      jar.writes.length = 0;
      await db.auth.signOut({ scope: 'local' });
      const cleared = jar.writes.filter((w) => w.name === KEY || w.name.startsWith(`${KEY}.`));
      expect(cleared.length).toBeGreaterThan(0);
      for (const w of cleared) {
        expect(w.value).toBe('');
        expect(w.options?.maxAge).toBe(0);
        expect(w.options?.path).toBe('/');
        expect(w.options?.domain).toBeUndefined();
      }
      expect([...jar.values.keys()].filter((n) => n === KEY || n.startsWith(`${KEY}.`))).toEqual([]);
    });
  }
});

describe('Secure session cookies over https on the hub and anime, kpop untouched', () => {
  async function signInAndOut(site: 'anime' | 'hub' | 'kpop'): Promise<Array<{ name: string; value: string; options: Options }>> {
    jar.values.set(`${KEY}-code-verifier`, 'verifier-0123456789-0123456789-0123456789');
    const db = await serverClientOn(site);
    await db.auth.exchangeCodeForSession('code-1');
    await db.auth.signOut({ scope: 'local' });
    return jar.writes.filter((w) => w.name === KEY || w.name.startsWith(`${KEY}.`));
  }

  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: every write and every deletion carries Secure on https, none on http (local dev)`, async () => {
      jar.proto = 'https';
      const https = await signInAndOut(site);
      expect(https.length).toBeGreaterThan(1);
      for (const w of https) expect(w.options?.secure, `${w.name}=${w.value.slice(0, 8)}`).toBe(true);
      jar.values.clear();
      jar.writes.length = 0;
      jar.proto = 'http';
      const http = await signInAndOut(site);
      expect(http.length).toBeGreaterThan(1);
      for (const w of http) expect(w.options?.secure).toBeUndefined();
    });
  }

  it('kpop: no Secure option is added, even on https (the options of before, byte for byte)', async () => {
    jar.proto = 'https';
    const writes = await signInAndOut('kpop');
    expect(writes.length).toBeGreaterThan(1);
    for (const w of writes) {
      expect(w.options?.secure).toBeUndefined();
      const { maxAge: _maxAge, ...rest } = (w.options ?? {}) as Record<string, unknown>;
      const { maxAge: _defaultMaxAge, ...defaults } = DEFAULT_COOKIE_OPTIONS as Record<string, unknown>;
      expect(rest).toEqual(defaults);
    }
  });

  it('the browser client: kpop is called with no option at all; hub and anime add Secure only on an https page', async () => {
    const seen: unknown[][] = [];
    for (const [site, protocol] of [['kpop', 'https:'], ['anime', 'https:'], ['hub', 'https:'], ['anime', 'http:']] as const) {
      vi.resetModules();
      vi.unstubAllEnvs();
      vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${REF}.supabase.co`);
      vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
      vi.stubGlobal('window', { location: { protocol } });
      vi.doMock('@supabase/ssr', () => ({ createBrowserClient: (...args: unknown[]) => { seen.push(args); return {}; } }));
      const { createBrowserClient } = await import('./client');
      createBrowserClient();
      vi.doUnmock('@supabase/ssr');
    }
    expect(seen[0]).toHaveLength(2);
    expect(seen[1]![2]).toEqual({ cookieOptions: { secure: true } });
    expect(seen[2]![2]).toEqual({ cookieOptions: { secure: true } });
    expect(seen[3]![2]).toEqual({});
  });
});

describe('the session middleware on the anime build (basePath /anime)', () => {
  async function updateSessionOn(site: 'kpop' | 'anime' | 'hub', user: { id: string } | null, cookieWrite?: { name: string; value: string; options: Record<string, unknown> }): Promise<typeof import('./middleware').updateSession> {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${REF}.supabase.co`);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.doMock('@supabase/ssr', () => ({
      // As @supabase/ssr does: the client's cookieOptions are merged over the defaults of every cookie it writes.
      createServerClient: (_u: string, _k: string, config: { cookieOptions?: Record<string, unknown>; cookies: { setAll(c: Array<{ name: string; value: string; options: Record<string, unknown> }>): void } }) => ({
        auth: {
          getUser: async () => {
            if (cookieWrite) config.cookies.setAll([{ ...cookieWrite, options: { ...cookieWrite.options, ...(config.cookieOptions ?? {}) } }]);
            return { data: { user } };
          },
        },
        from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'user-1' } }) }) }) }),
      }),
    }));
    const mod = await import('./middleware');
    return mod.updateSession;
  }

  afterEach(() => { vi.doUnmock('@supabase/ssr'); });

  it('a signed-out visitor of /anime/settings goes to /anime/login with returnTo the app path', async () => {
    const updateSession = await updateSessionOn('anime', null);
    const res = await updateSession(new NextRequest('https://bunnyverse.org/anime/settings', { nextConfig: { basePath: '/anime' } }));
    expect(res.headers.get('location')).toBe('https://bunnyverse.org/anime/login?returnTo=%2Fsettings');
  });

  it('a signed-in visitor of /anime/login goes to /anime; the hub and kpop redirects are the URLs of before', async () => {
    const anime = await updateSessionOn('anime', { id: 'user-1' });
    expect((await anime(new NextRequest('https://bunnyverse.org/anime/login', { nextConfig: { basePath: '/anime' } }))).headers.get('location')).toBe('https://bunnyverse.org/anime');
    const hub = await updateSessionOn('hub', null);
    expect((await hub(new NextRequest('https://bunnyverse.org/settings'))).headers.get('location')).toBe('https://bunnyverse.org/login?returnTo=%2Fsettings');
    const kpop = await updateSessionOn('kpop', null);
    expect((await kpop(new NextRequest('https://kpopquiz.org/settings'))).headers.get('location')).toBe('https://kpopquiz.org/login?returnTo=%2Fsettings');
  });

  it('the refreshed cookie of the hub and anime carries Secure on https; kpop\'s does not (as before)', async () => {
    for (const [site, url, secure] of [
      ['anime', 'https://bunnyverse.org/anime/settings', true], ['hub', 'https://bunnyverse.org/settings', true],
      ['anime', 'http://anime.localhost:3063/anime/settings', false], ['kpop', 'https://kpopquiz.org/settings', false],
    ] as const) {
      const updateSession = await updateSessionOn(site, { id: 'user-1' }, { name: KEY, value: 'base64-xyz', options: { ...DEFAULT_COOKIE_OPTIONS } });
      const res = await updateSession(new NextRequest(url, site === 'anime' ? { nextConfig: { basePath: '/anime' } } : {}));
      const set = res.headers.getSetCookie().find((c) => c.startsWith(`${KEY}=`));
      expect(set, url).toBeDefined();
      expect(/;\s*Secure/i.test(set!), url).toBe(secure);
    }
  });

  it('a refreshed session cookie leaves the middleware with Path=/ and no Domain on the anime build', async () => {
    const updateSession = await updateSessionOn('anime', { id: 'user-1' }, { name: KEY, value: 'base64-xyz', options: { ...DEFAULT_COOKIE_OPTIONS } });
    const res = await updateSession(new NextRequest('https://bunnyverse.org/anime/settings', { nextConfig: { basePath: '/anime' } }));
    const set = res.headers.getSetCookie().find((c) => c.startsWith(`${KEY}=`));
    expect(set).toBeDefined();
    expect(set).toMatch(/Path=\/(;|$)/);
    expect(set).not.toMatch(/Domain=/i);
    expect(set).not.toMatch(/Path=\/anime/);
  });
});
