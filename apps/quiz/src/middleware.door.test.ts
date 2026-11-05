// ADMIN-2 (owner, 2026-10-30; PLAN-ADMIN-2 sections 1 and 7): the secret door in the real middleware, on local stand-ins only. ADMIN_PATH
// below is an obviously fake value set inside the test, never a real address. Proven: on the hub build /<door>/** is rewritten to the
// internal tree with the door header; a partial prefix, a longer segment, a dot segment and a weak value are no door; without ADMIN_PATH
// there is no door; on the other builds the same address is an unknown URL; a door header from outside is stripped on every build and path.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ADMIN_DOOR_HEADER, ADMIN_DOOR_NEXT_HEADER } from '@/lib/admin/door';

const auth = vi.hoisted(() => ({ user: null as { id: string; factors?: Array<{ status: string }> } | null }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: auth.user } }) } }) }));

const DOOR = 'test-door-not-a-secret';
const ADMIN = { id: 'admin-1', factors: [{ status: 'verified' }] };

async function mw(site: 'hub' | 'anime' | 'kpop'): Promise<(r: NextRequest) => Promise<Response>> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const mod = await import('./middleware');
  return mod.middleware as (r: NextRequest) => Promise<Response>;
}

const req = (path: string, headers: Record<string, string> = {}): NextRequest =>
  new NextRequest(`https://bunnyverse.org${path}`, { headers });

const rewriteOf = (res: Response): string | null => {
  const to = res.headers.get('x-middleware-rewrite');
  return to === null ? null : new URL(to).pathname;
};
const overrides = (res: Response): string[] => (res.headers.get('x-middleware-override-headers') ?? '').split(',').filter(Boolean);

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://proj.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
  vi.stubEnv('ADMIN_USER_IDS', 'admin-1');
  vi.stubEnv('ADMIN_PATH', DOOR);
  auth.user = ADMIN;
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the hub build opens the door', () => {
  it('rewrites /<door> to the internal admin root with the door header and the asked address', async () => {
    const res = await (await mw('hub'))(req(`/${DOOR}`));
    expect(rewriteOf(res)).toBe('/admin');
    const { adminDoorValue } = await import('@/lib/admin/door');
    const value = await adminDoorValue();
    expect(value).toMatch(/^[0-9a-f]{64}$/);
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).toBe(value);
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_NEXT_HEADER}`)).toBe(`/${DOOR}`);
    expect(overrides(res)).toContain(ADMIN_DOOR_HEADER);
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow');
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('the header value is derived from ADMIN_PATH, never the address itself and never a plain flag', async () => {
    const res = await (await mw('hub'))(req(`/${DOOR}`));
    const value = res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`) ?? '';
    expect(value).not.toContain(DOOR);
    expect(value).not.toBe('1');
    vi.stubEnv('ADMIN_PATH', `${DOOR}-other`);
    const other = await (await mw('hub'))(req(`/${DOOR}-other`));
    expect(other.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).not.toBe(value);
  });

  it.each([
    [`/${DOOR}/code`, '/admin/code'],
    [`/${DOOR}/setup`, '/admin/setup'],
    [`/${DOOR}/quizzes`, '/admin/quizzes'],
    [`/${DOOR}/journal`, '/admin/journal'],
    [`/${DOOR}/`, '/admin'],
  ])('%s opens %s', async (path, internal) => {
    expect(rewriteOf(await (await mw('hub'))(req(path)))).toBe(internal);
  });

  it('keeps the query string on the rewrite and the asked address in the next header', async () => {
    const res = await (await mw('hub'))(req(`/${DOOR}/quizzes?site=anime`));
    expect(res.headers.get('x-middleware-rewrite')).toContain('/admin/quizzes?site=anime');
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_NEXT_HEADER}`)).toBe(`/${DOOR}/quizzes?site=anime`);
  });

  it('a client-forged next header is replaced by the real address', async () => {
    const res = await (await mw('hub'))(req(`/${DOOR}/quizzes`, { [ADMIN_DOOR_HEADER]: 'forged', [ADMIN_DOOR_NEXT_HEADER]: 'https://evil.example/' }));
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_NEXT_HEADER}`)).toBe(`/${DOOR}/quizzes`);
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).not.toBe('forged');
  });

  it.each([
    ['a signed-out visitor', null],
    ['a signed-in account that is not listed', { id: 'fan-9', factors: [{ status: 'verified' }] }],
    ['a listed account with no verified factor, enrolment closed', { id: 'admin-1' }],
  ])('%s gets the answer of an unknown URL, with no door header', async (_n, user) => {
    auth.user = user;
    const res = await (await mw('hub'))(req(`/${DOOR}/quizzes`));
    expect(rewriteOf(res)).toBe('/page-not-found');
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).toBeNull();
    expect(res.headers.get('x-robots-tag')).toBeNull();
  });
});

describe('what is not the door', () => {
  const NOT_DOORS = [
    `/${DOOR.slice(0, -1)}`, `/${DOOR}x`, `/${DOOR}x/code`, `/${DOOR}-quizzes`, `/x${DOOR}`, `/${DOOR.toUpperCase()}`, '/test-door',
    `/${DOOR}/Code`, `/${DOOR}/code.json`, `/${DOOR}/a//b`, `/${DOOR}/%2e%2e/admin`, `/${DOOR}/../admin`, `/${DOOR}/code/x y`, `/${DOOR}_x`,
  ];
  it.each(NOT_DOORS)('%s is no door: the answer of an unknown URL, no door header', async (path) => {
    const res = await (await mw('hub'))(req(path));
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).toBeNull();
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_NEXT_HEADER}`)).toBeNull();
    expect(rewriteOf(res) ?? '').not.toMatch(/^\/admin/);
  });

  it('without ADMIN_PATH there is no door, and /admin of the hub is an unknown URL', async () => {
    vi.stubEnv('ADMIN_PATH', '');
    const run = await mw('hub');
    for (const path of [`/${DOOR}`, `/${DOOR}/code`, '/admin', '/admin/code', '/admin/quizzes']) {
      const res = await run(req(path));
      expect(rewriteOf(res), path).toBe('/page-not-found');
      expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`), path).toBeNull();
    }
  });

  it.each(['admin', 'short-door', 'test-door-not-a-secret.', 'Test-Door-Not-A-Secret-0', 'a'.repeat(65), 'test-door-not-a-secret-quiz', 'test-door-not-a-secret-trivia', '-test-door-not-a-secret', 'test door not a secret 0', ' '])(
    'a weak or odd ADMIN_PATH (%j) opens no door',
    async (value) => {
      vi.stubEnv('ADMIN_PATH', value);
      const path = `/${value.trim()}`;
      const res = await (await mw('hub'))(req(path));
      expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).toBeNull();
      expect(rewriteOf(res)).not.toBe('/admin');
    },
  );

  it('the hub /admin, reached directly, is an unknown URL even with the right ADMIN_PATH set and a listed admin signed in', async () => {
    for (const path of ['/admin', '/admin/code', '/admin/quizzes', '/sites/hub/admin', '/sites/hub/admin/quizzes']) {
      const res = await (await mw('hub'))(req(path));
      expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`), path).toBeNull();
      if (!path.startsWith('/sites')) expect(rewriteOf(res), path).toBe('/page-not-found');
    }
  });

  it.each(['anime', 'kpop'] as const)('on the %s build the same address is no door, whatever ADMIN_PATH says', async (site) => {
    const res = await (await mw(site))(req(`/${DOOR}`));
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).toBeNull();
    expect(rewriteOf(res)).not.toBe('/admin');
  });
});

describe('a door header from outside is stripped, on every build and path', () => {
  const FORGED = { [ADMIN_DOOR_HEADER]: 'not-a-real-value', [ADMIN_DOOR_NEXT_HEADER]: '/anything', 'x-keep': 'kept' };
  const PATHS = ['/', '/admin', '/admin/code', `/${DOOR}x`, '/not-a-page', '/settings', '/login', '/series', '/robots.txt'];

  for (const site of ['hub', 'anime', 'kpop'] as const) {
    it.each(PATHS)(`${site} build, %s: neither header reaches the page, other headers stay`, async (path) => {
      const res = await (await mw(site))(req(path, FORGED));
      expect(overrides(res)).not.toContain(ADMIN_DOOR_HEADER);
      expect(overrides(res)).not.toContain(ADMIN_DOOR_NEXT_HEADER);
      expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).toBeNull();
      expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_NEXT_HEADER}`)).toBeNull();
      expect(overrides(res)).toContain('x-keep');
      expect(res.headers.get('x-middleware-request-x-keep')).toBe('kept');
    });
  }

  it('a request with no door header is answered exactly as before (no override list added)', async () => {
    const res = await (await mw('hub'))(req('/series'));
    expect(res.headers.get('x-middleware-override-headers')).toBeNull();
  });

  it('the door answer for the real address does not leak the forged value', async () => {
    const res = await (await mw('hub'))(req(`/${DOOR}`, FORGED));
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_HEADER}`)).not.toBe('not-a-real-value');
    expect(res.headers.get(`x-middleware-request-${ADMIN_DOOR_NEXT_HEADER}`)).toBe(`/${DOOR}`);
  });
});

describe('the middleware matcher lets the door through', () => {
  it('runs the middleware on the secret address and its pages', async () => {
    const mod = await import('./middleware');
    const re = new RegExp(`^${(mod.config.matcher as string[])[0]}$`);
    for (const path of [`/${DOOR}`, `/${DOOR}/code`, `/${DOOR}/setup`, `/${DOOR}/quizzes`, `/${DOOR}/journal`]) expect(re.test(path), path).toBe(true);
  });
});
