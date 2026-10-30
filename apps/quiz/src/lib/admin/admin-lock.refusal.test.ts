// ADMIN-1 (owner, 2026-10-30): every admin page and every admin route, run for real against the local auth stand-in, in each case the
// guard refuses. A page throws notFound() (an admin with a factor at aal1, or with none while enrolment is open, is redirected to the MFA
// page instead); a route answers the admin 404 JSON; a generateMetadata names nothing; and nothing is read or written first (no query on the
// user's client, no service-role client made). The flags of the gated pages are on, so the guard itself is what answers.
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NextRequest } from 'next/server';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthStubState } from './test-support';

const s = vi.hoisted(() => {
  const saved = { v1: process.env.NEXT_PUBLIC_UX_V1, v12: process.env.NEXT_PUBLIC_UX_V12, bt: process.env.NEXT_PUBLIC_BT_TRACKING };
  process.env.NEXT_PUBLIC_UX_V1 = '1';
  process.env.NEXT_PUBLIC_UX_V12 = '1';
  process.env.NEXT_PUBLIC_BT_TRACKING = '1';
  return { saved, auth: { user: null } as { user: { id: string } | null; sessionUser?: { id: string } | null; aal?: 'aal1' | 'aal2'; factor?: boolean }, reads: [] as string[] };
});

vi.mock('next/navigation', async (orig) => ({
  ...(await orig<typeof import('next/navigation')>()),
  notFound: () => { throw new Error('NEXT_NOT_FOUND'); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT ${to}`); },
}));
vi.mock('@/lib/supabase/server', async () => {
  const { stubAuth } = await import('./test-support');
  const trap = (who: string): unknown => new Proxy({}, { get: (_t, k) => { s.reads.push(`${who}.${String(k)}`); throw new Error(`read before the guard: ${who}.${String(k)}`); } });
  return {
    createServerClient: async () => ({ auth: stubAuth(() => s.auth as AuthStubState), from: (t: string) => trap(`user.from(${t})`), rpc: (f: string) => trap(`user.rpc(${f})`), storage: trap('user.storage') }),
    createServiceRoleClient: () => { s.reads.push('service-role client'); return trap('service'); },
    createPublicReadClient: () => { s.reads.push('public client'); return trap('public'); },
  };
});
vi.mock('@supabase/supabase-js', async (orig) => ({
  ...(await orig<typeof import('@supabase/supabase-js')>()),
  createClient: () => { s.reads.push('supabase-js client'); return new Proxy({}, { get: () => { throw new Error('read before the guard'); } }); },
}));
vi.mock('next/cache', async (orig) => ({ ...(await orig<typeof import('next/cache')>()), unstable_cache: (fn: unknown) => fn, revalidateTag: () => undefined, revalidatePath: () => undefined }));

const SRC = fileURLToPath(new URL('../../', import.meta.url));
function walk(rel: string): string[] {
  const dir = join(SRC, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? walk(relative(SRC, join(dir, n))) : [relative(SRC, join(dir, n))]));
}
const TREES = [...walk('app/(site)/admin'), ...walk('app/sites/[site]/(anime)/admin'), ...walk('app/api/admin')];
const PAGES = TREES.filter((f) => /(^|\/)(page|template|default)\.(tsx|ts|jsx|js|mdx)$/.test(f));
const ROUTES = TREES.filter((f) => /(^|\/)route\.(tsx|ts|jsx|js)$/.test(f));
const modulePath = (f: string): string => `@/${f.replace(/\.[a-z]+$/, '')}`;
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
const isMfaPage = (f: string): boolean => f.includes('/admin/k7q2m/');

const OPEN = '1';
const REFUSED: Array<[string, typeof s.auth, string?]> = [
  ['a signed-out visitor', { user: null }],
  ['a signed-in fan', { user: { id: 'fan-9' } }],
  ['a forged cookie that claims the admin', { user: null, sessionUser: { id: 'admin-1' } }],
  ['the admin at aal1 with a factor', { user: { id: 'admin-1' }, aal: 'aal1', factor: true }],
  ['the admin at aal1 with no factor, enrolment closed', { user: { id: 'admin-1' }, factor: false }],
  ['the admin at aal2 with no factor left, enrolment closed', { user: { id: 'admin-1' }, aal: 'aal2', factor: false }],
  ['the admin at aal1 with no factor, enrolment open', { user: { id: 'admin-1' }, factor: false }, OPEN],
  ['the admin at aal2 with no factor left, enrolment open', { user: { id: 'admin-1' }, aal: 'aal2', factor: false }, OPEN],
];
/** The MFA pages serve this case: a listed admin with a factor, or with none while enrolment is open. */
const reachesMfa = (a: typeof s.auth, enrol?: string): boolean => a.user?.id === 'admin-1' && (a.factor !== false || enrol === OPEN);
const setEnrol = (enrol?: string): void => { if (enrol === undefined) delete process.env.ADMIN_MFA_ENROL_OPEN; else process.env.ADMIN_MFA_ENROL_OPEN = enrol; };

beforeAll(() => { process.env.ADMIN_USER_IDS = 'admin-1'; process.env.CRON_SECRET = 'unit-test-cron-secret'; });
afterAll(() => {
  delete process.env.ADMIN_USER_IDS;
  delete process.env.CRON_SECRET;
  delete process.env.ADMIN_MFA_ENROL_OPEN;
  const put = (k: string, v: string | undefined): void => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  put('NEXT_PUBLIC_UX_V1', s.saved.v1);
  put('NEXT_PUBLIC_UX_V12', s.saved.v12);
  put('NEXT_PUBLIC_BT_TRACKING', s.saved.bt);
});
beforeEach(() => { s.reads = []; });

const props = { params: Promise.resolve({ id: '1', site: 'anime' }), searchParams: Promise.resolve({}) };

describe('admin pages: notFound() (or the MFA page for an admin it serves), before any read, and no title from generateMetadata', () => {
  it('covers every page of both admin trees', () => {
    expect(PAGES.length).toBe(30);
  });

  for (const [name, auth, enrol] of REFUSED) {
    it.each(PAGES)(`${name}: %s`, async (f) => {
      s.auth = auth;
      setEnrol(enrol);
      const mod = await import(/* @vite-ignore */ modulePath(f)) as { default: (p: unknown) => Promise<unknown>; generateMetadata?: (p: unknown) => Promise<{ title?: unknown }> };
      const err = await mod.default(props).then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
      if (isMfaPage(f)) {
        // The MFA pages answer every admin they serve (that is their job) and 404 everyone else.
        if (reachesMfa(auth, enrol)) expect(err === null || /^NEXT_REDIRECT \/admin\/k7q2m\/(code|setup)$/.test(err)).toBe(true);
        else expect(err).toBe('NEXT_NOT_FOUND');
      } else if (reachesMfa(auth, enrol)) {
        expect(err).toBe(auth.factor === false ? 'NEXT_REDIRECT /admin/k7q2m/setup' : 'NEXT_REDIRECT /admin/k7q2m/code');
      } else {
        expect(err).toBe('NEXT_NOT_FOUND');
      }
      if (mod.generateMetadata) {
        const meta: { title?: unknown } = await mod.generateMetadata(props).catch((e: unknown) => (e instanceof Error && e.message === 'NEXT_NOT_FOUND' ? {} : Promise.reject(e)));
        expect(meta.title, `${f}: a title for a refused request`).toBeUndefined();
      }
      expect(s.reads).toEqual([]);
    });
  }
});

describe('the anime admin layout: a refused visitor never reaches a page of the tree', () => {
  const layout = async (): Promise<{ default: (p: { children: unknown }) => Promise<unknown> }> =>
    await import(/* @vite-ignore */ '@/app/sites/[site]/(anime)/admin/layout') as never;

  it.each(REFUSED)('%s', async (_n, auth, enrol) => {
    s.auth = auth;
    setEnrol(enrol);
    const l = await layout();
    if (reachesMfa(auth, enrol)) {
      const { renderToStaticMarkup } = await import('react-dom/server');
      expect(renderToStaticMarkup((await l.default({ children: 'x' })) as never)).toBe('x');
    } else {
      await expect(l.default({ children: null })).rejects.toThrow('NEXT_NOT_FOUND');
    }
    expect(s.reads).toEqual([]);
  });

  it('an admin at aal2 gets the page', async () => {
    s.auth = { user: { id: 'admin-1' }, aal: 'aal2' };
    setEnrol();
    const { renderToStaticMarkup } = await import('react-dom/server');
    expect(renderToStaticMarkup((await (await layout()).default({ children: 'x' })) as never)).toBe('x');
  });
});

describe('the kpop admin layout: its nav and its title never reach a refused visitor', () => {
  const layout = async (): Promise<{ default: (p: { children: unknown }) => Promise<unknown>; generateMetadata: () => Promise<{ title?: unknown; robots?: unknown }> }> =>
    await import(/* @vite-ignore */ '@/app/(site)/admin/layout') as never;
  const NAV = 'Quiz Bank';

  it.each(REFUSED.filter(([, a, e]) => !reachesMfa(a, e)))('%s: notFound(), and no title', async (_n, auth, enrol) => {
    s.auth = auth;
    setEnrol(enrol);
    const l = await layout();
    await expect(l.default({ children: null })).rejects.toThrow('NEXT_NOT_FOUND');
    const m = await l.generateMetadata();
    expect(m.title).toBeUndefined();
    expect(m.robots).toEqual({ index: false, follow: false });
  });

  it.each(REFUSED.filter(([, a, e]) => reachesMfa(a, e)))('%s: the MFA pages render, without the nav and without the title', async (_n, auth, enrol) => {
    s.auth = auth;
    setEnrol(enrol);
    const l = await layout();
    const { renderToStaticMarkup } = await import('react-dom/server');
    expect(renderToStaticMarkup((await l.default({ children: 'x' })) as never)).not.toContain(NAV);
    expect((await l.generateMetadata()).title).toBeUndefined();
  });

  it('an admin at aal2 gets the nav and the title', async () => {
    s.auth = { user: { id: 'admin-1' }, aal: 'aal2' };
    setEnrol();
    const l = await layout();
    const { renderToStaticMarkup } = await import('react-dom/server');
    expect(renderToStaticMarkup((await l.default({ children: 'x' })) as never)).toContain(NAV);
    expect((await l.generateMetadata()).title).toBe('Admin');
  });
});

describe('admin routes: the admin 404 JSON for every method, before any read', () => {
  it('covers every route under api/admin, the catch-all included', () => {
    expect(ROUTES.length).toBe(47);
  });

  for (const [name, auth, enrol] of REFUSED) {
    it.each(ROUTES)(`${name}: %s`, async (f) => {
      s.auth = auth;
      setEnrol(enrol);
      const mod = await import(/* @vite-ignore */ modulePath(f)) as Record<string, unknown>;
      const url = `http://localhost:3021/${f.replace(/^app\//, '').replace(/\/route\.[a-z]+$/, '').replace(/\[id\]/g, '1').replace('[...rest]', 'a/b')}`;
      let seen = 0;
      for (const method of METHODS) {
        const h = mod[method] as ((req: NextRequest, ctx: unknown) => Promise<Response>) | undefined;
        if (!h) continue;
        seen += 1;
        // The MFA route serves the admin the MFA pages serve (its own steps, tested in mfa.test.ts); every other case here is its 404.
        if (f === 'app/api/admin/k7q2m/route.ts' && reachesMfa(auth, enrol) && method === 'POST') continue;
        const req = new NextRequest(url, {
          method,
          headers: { host: 'localhost:3021', origin: 'http://localhost:3021', 'content-type': 'application/json' },
          ...(method === 'GET' || method === 'HEAD' ? {} : { body: JSON.stringify({ action: 'verify', code: '123456', quiz_id: '1', id: 1 }) }),
        });
        const res = await h(req, { params: Promise.resolve({ id: '1' }) });
        expect(res.status, `${method} ${f}`).toBe(404);
        expect(await res.json(), `${method} ${f}`).toMatchObject({ error: expect.stringMatching(/^(Not found\.|not_found)$/) });
      }
      expect(seen, f).toBeGreaterThan(0);
      expect(s.reads).toEqual([]);
    });
  }
});
