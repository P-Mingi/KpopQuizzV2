// FandomVerse (owner, 2026-10-28; lane 3): hub (https://fandomverse.org) and anime (https://fandomverse.org/anime, basePath
// '/anime') share one session. That holds because both builds write the Supabase session cookies with Path=/ and no Domain,
// under one name that comes from the Supabase project, never from the site or the host. Proven with the real @supabase/ssr
// behind our server client (lib/supabase/server.ts): a sign-in writes the cookies, a sign-out clears the same cookies, with
// the same attributes, on the anime and the hub build alike. The session middleware passes the options through unchanged,
// and puts the basePath back on its redirects (lib/supabase/middleware.ts).
import { DEFAULT_COOKIE_OPTIONS } from '@supabase/ssr';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Options = Record<string, unknown> | undefined;
const jar = vi.hoisted(() => ({
  values: new Map<string, string>(),
  writes: [] as Array<{ name: string; value: string; options: Options }>,
}));

vi.mock('next/headers', () => ({
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

async function serverClientOn(site: 'anime' | 'hub'): Promise<Awaited<ReturnType<typeof import('./server').createServerClient>>> {
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

describe('the session middleware on the anime build (basePath /anime)', () => {
  async function updateSessionOn(site: 'kpop' | 'anime' | 'hub', user: { id: string } | null, cookieWrite?: { name: string; value: string; options: Record<string, unknown> }): Promise<typeof import('./middleware').updateSession> {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', `https://${REF}.supabase.co`);
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    vi.doMock('@supabase/ssr', () => ({
      createServerClient: (_u: string, _k: string, config: { cookies: { setAll(c: Array<{ name: string; value: string; options: Record<string, unknown> }>): void } }) => ({
        auth: {
          getUser: async () => {
            if (cookieWrite) config.cookies.setAll([cookieWrite]);
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
    const res = await updateSession(new NextRequest('https://fandomverse.org/anime/settings', { nextConfig: { basePath: '/anime' } }));
    expect(res.headers.get('location')).toBe('https://fandomverse.org/anime/login?returnTo=%2Fsettings');
  });

  it('a signed-in visitor of /anime/login goes to /anime; the hub and kpop redirects are the URLs of before', async () => {
    const anime = await updateSessionOn('anime', { id: 'user-1' });
    expect((await anime(new NextRequest('https://fandomverse.org/anime/login', { nextConfig: { basePath: '/anime' } }))).headers.get('location')).toBe('https://fandomverse.org/anime');
    const hub = await updateSessionOn('hub', null);
    expect((await hub(new NextRequest('https://fandomverse.org/settings'))).headers.get('location')).toBe('https://fandomverse.org/login?returnTo=%2Fsettings');
    const kpop = await updateSessionOn('kpop', null);
    expect((await kpop(new NextRequest('https://kpopquiz.org/settings'))).headers.get('location')).toBe('https://kpopquiz.org/login?returnTo=%2Fsettings');
  });

  it('a refreshed session cookie leaves the middleware with Path=/ and no Domain on the anime build', async () => {
    const updateSession = await updateSessionOn('anime', { id: 'user-1' }, { name: KEY, value: 'base64-xyz', options: { ...DEFAULT_COOKIE_OPTIONS } });
    const res = await updateSession(new NextRequest('https://fandomverse.org/anime/settings', { nextConfig: { basePath: '/anime' } }));
    const set = res.headers.getSetCookie().find((c) => c.startsWith(`${KEY}=`));
    expect(set).toBeDefined();
    expect(set).toMatch(/Path=\/(;|$)/);
    expect(set).not.toMatch(/Domain=/i);
    expect(set).not.toMatch(/Path=\/anime/);
  });
});
