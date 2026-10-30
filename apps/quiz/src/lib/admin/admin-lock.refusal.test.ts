// ADMIN-1 (owner, 2026-10-30): every admin page and every admin route, run for real against the local auth stand-in, in each case the
// guard refuses. A page throws notFound() (an admin at aal1 is redirected to the MFA page instead); a route answers the admin 404 JSON;
// and nothing is read or written first (no query on the user's client, no service-role client made). The flags of the gated pages
// are on, so the guard itself is what answers.
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
const PAGES = [...walk('app/(site)/admin'), ...walk('app/sites/[site]/(anime)/admin')].filter((f) => f.endsWith('/page.tsx'));
const ROUTES = walk('app/api/admin').filter((f) => f.endsWith('/route.ts'));
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;
const isMfaPage = (f: string): boolean => f.includes('/admin/k7q2m/');

const REFUSED: Array<[string, typeof s.auth]> = [
  ['a signed-out visitor', { user: null }],
  ['a signed-in fan', { user: { id: 'fan-9' } }],
  ['a forged cookie that claims the admin', { user: null, sessionUser: { id: 'admin-1' } }],
  ['the admin at aal1 with a factor', { user: { id: 'admin-1' }, aal: 'aal1', factor: true }],
  ['the admin at aal1 with no factor', { user: { id: 'admin-1' }, factor: false }],
];
const isAal1 = (a: typeof s.auth): boolean => a.user?.id === 'admin-1';

beforeAll(() => { process.env.ADMIN_USER_IDS = 'admin-1'; process.env.CRON_SECRET = 'unit-test-cron-secret'; });
afterAll(() => {
  delete process.env.ADMIN_USER_IDS;
  delete process.env.CRON_SECRET;
  const put = (k: string, v: string | undefined): void => { if (v === undefined) delete process.env[k]; else process.env[k] = v; };
  put('NEXT_PUBLIC_UX_V1', s.saved.v1);
  put('NEXT_PUBLIC_UX_V12', s.saved.v12);
  put('NEXT_PUBLIC_BT_TRACKING', s.saved.bt);
});
beforeEach(() => { s.reads = []; });

const props = { params: Promise.resolve({ id: '1', site: 'anime' }), searchParams: Promise.resolve({}) };

describe('admin pages: notFound() (or the MFA page for an admin at aal1), before any read', () => {
  it('covers every page of both admin trees', () => {
    expect(PAGES.length).toBe(30);
  });

  for (const [name, auth] of REFUSED) {
    it.each(PAGES)(`${name}: %s`, async (f) => {
      s.auth = auth;
      const mod = await import(/* @vite-ignore */ `@/${f.replace(/\.tsx$/, '')}`) as { default: (p: unknown) => Promise<unknown> };
      const err = await mod.default(props).then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
      if (isMfaPage(f)) {
        // The MFA pages answer every listed admin at aal1 (that is their job) and 404 everyone else.
        if (isAal1(auth)) expect(err === null || /^NEXT_REDIRECT \/admin\/k7q2m\/(code|setup)$/.test(err)).toBe(true);
        else expect(err).toBe('NEXT_NOT_FOUND');
      } else if (isAal1(auth)) {
        expect(err).toBe(auth.factor === false ? 'NEXT_REDIRECT /admin/k7q2m/setup' : 'NEXT_REDIRECT /admin/k7q2m/code');
      } else {
        expect(err).toBe('NEXT_NOT_FOUND');
      }
      expect(s.reads).toEqual([]);
    });
  }
});

describe('admin routes: the admin 404 JSON for every method, before any read', () => {
  it('covers every route under api/admin', () => {
    expect(ROUTES.length).toBe(46);
  });

  for (const [name, auth] of REFUSED) {
    it.each(ROUTES)(`${name}: %s`, async (f) => {
      s.auth = auth;
      const mod = await import(/* @vite-ignore */ `@/${f.replace(/\.ts$/, '')}`) as Record<string, unknown>;
      const url = `http://localhost:3021/${f.replace(/^app\//, '').replace(/\/route\.ts$/, '').replace(/\[id\]/g, '1')}`;
      let seen = 0;
      for (const method of METHODS) {
        const h = mod[method] as ((req: NextRequest, ctx: unknown) => Promise<Response>) | undefined;
        if (!h) continue;
        seen += 1;
        // The MFA route serves a listed admin at aal1 (its own steps, tested in mfa.test.ts); every other case here is its 404.
        if (f === 'app/api/admin/k7q2m/route.ts' && isAal1(auth) && method === 'POST') continue;
        const req = new NextRequest(url, {
          method,
          headers: { host: 'localhost:3021', origin: 'http://localhost:3021', 'content-type': 'application/json' },
          ...(method === 'GET' ? {} : { body: JSON.stringify({ action: 'verify', code: '123456', quiz_id: '1', id: 1 }) }),
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
