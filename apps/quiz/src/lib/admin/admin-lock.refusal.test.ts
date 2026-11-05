// ADMIN-1 (owner, 2026-10-30): every admin page and every admin route, run for real against the local auth stand-in, in each case the
// guard refuses. A page throws notFound() (an admin with a factor at aal1, or with none while enrolment is open, is redirected to the MFA
// page instead); a route answers the admin 404 JSON; a generateMetadata names nothing; and nothing is read or written first (no query on the
// user's client, no service-role client made). The flags of the gated pages are on, so the guard itself is what answers. A route's refusal is
// checked to the byte, with a same-origin request and with each kind of foreign origin: the origin never decides what a refused request sees.
// ADMIN-2: the pages and the layout of the hub tree (the one admin behind the secret door) get the same run, plus the door: without the header the
// middleware sets, every one of them is a 404 before the session is even read, a perfect admin included.
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
  return { saved, auth: { user: null } as { user: { id: string } | null; sessionUser?: { id: string } | null; aal?: 'aal1' | 'aal2'; factor?: boolean; totpAgeMs?: number | null }, reads: [] as string[], headers: {} as Record<string, string> };
});

vi.mock('next/headers', () => ({ headers: async () => new Headers(s.headers) }));

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
const HUB_TREE = walk('app/sites/[site]/(hub)/admin');
const HUB_PAGES = HUB_TREE.filter((f) => /(^|\/)page\.tsx$/.test(f));
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
beforeEach(() => { s.reads = []; s.headers = {}; });

const props = { params: Promise.resolve({ id: '1', site: 'anime' }), searchParams: Promise.resolve({}) };

/** The one answer of a refused route: the body and the two headers of adminNotFound, byte for byte the catch-all's. */
async function expectAdminNotFound(res: Response, label: string): Promise<void> {
  expect(res.status, label).toBe(404);
  expect(await res.text(), label).toBe('{"error":"Not found.","code":"not_found"}');
  expect(res.headers.get('x-robots-tag'), label).toBe('noindex, nofollow');
  expect(res.headers.get('cache-control'), label).toBe('no-store');
}

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
      const url = `http://localhost:3021/${f.replace(/^app\//, '').replace(/\/route\.[a-z]+$/, '').replace(/\[id\]/g, '1').replace('[[...rest]]', 'a/b')}`;
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
        await expectAdminNotFound(res, `${method} ${f}`);
      }
      expect(seen, f).toBeGreaterThan(0);
      expect(s.reads).toEqual([]);
    });
  }
});

describe('admin routes: a foreign origin changes nothing for anyone the guard refuses', () => {
  const FOREIGN: Array<[string, Record<string, string>]> = [
    ['an Origin of another site', { host: 'localhost:3021', origin: 'https://evil.example', 'sec-fetch-site': 'cross-site' }],
    ['a null Origin', { host: 'localhost:3021', origin: 'null', 'sec-fetch-site': 'cross-site' }],
    ['no Origin, Sec-Fetch-Site cross-site', { host: 'localhost:3021', 'sec-fetch-site': 'cross-site' }],
    ['no Origin and no Sec-Fetch-Site', { host: 'localhost:3021' }],
  ];
  for (const [who, auth, enrol] of REFUSED) {
    for (const [from, headers] of FOREIGN) {
      it.each(ROUTES)(`${who}, ${from}: %s`, async (f) => {
        s.auth = auth;
        setEnrol(enrol);
        const mod = await import(/* @vite-ignore */ modulePath(f)) as Record<string, unknown>;
        const url = `http://localhost:3021/${f.replace(/^app\//, '').replace(/\/route\.[a-z]+$/, '').replace(/\[id\]/g, '1').replace('[[...rest]]', 'a/b')}`;
        for (const method of METHODS) {
          const h = mod[method] as ((req: NextRequest, ctx: unknown) => Promise<Response>) | undefined;
          if (!h) continue;
          const req = new NextRequest(url, {
            method,
            headers: { ...headers, 'content-type': 'application/json' },
            ...(method === 'GET' || method === 'HEAD' ? {} : { body: JSON.stringify({ action: 'verify', code: '123456', quiz_id: '1', id: 1 }) }),
          });
          const res = await h(req, { params: Promise.resolve({ id: '1' }) });
          await expectAdminNotFound(res, `${method} ${f}`);
        }
        expect(s.reads).toEqual([]);
      });
    }
  }
});

describe('admin routes behind the v12 flag: flag off is the same admin 404', () => {
  it.each(['app/api/admin/community-reports/route.ts', 'app/api/admin/editorial/route.ts'])('%s', async (f) => {
    s.auth = { user: null };
    setEnrol();
    vi.stubEnv('NEXT_PUBLIC_UX_V12', '0');
    try {
      const mod = await import(/* @vite-ignore */ modulePath(f)) as { POST: (req: NextRequest) => Promise<Response> };
      const res = await mod.POST(new NextRequest('http://localhost:3021/x', { method: 'POST', headers: { host: 'localhost:3021', origin: 'http://localhost:3021', 'content-type': 'application/json' }, body: '{}' }));
      await expectAdminNotFound(res, f);
    } finally {
      vi.unstubAllEnvs();
    }
    expect(s.reads).toEqual([]);
  });
});


// ---------------------------------------------------------------------------------------------------------------------------------------
// ADMIN-2: the hub tree behind the secret door. ADMIN_PATH below is an obviously fake value set for these cases only.
// ---------------------------------------------------------------------------------------------------------------------------------------
describe('the hub admin tree: the secret door, then the guard, before any read', () => {
  const DOOR = 'test-door-not-a-secret';
  const P = `/${DOOR}`;
  const hubModule = (f: string): string => `@/${f.replace(/\.[a-z]+$/, '')}`;
  const isHubMfaPage = (f: string): boolean => /\/admin\/(code|setup)\/page\.tsx$/.test(f);
  const HUB_LAYOUT = 'app/sites/[site]/(hub)/admin/layout.tsx';

  beforeAll(() => { process.env.ADMIN_PATH = DOOR; });
  afterAll(() => { delete process.env.ADMIN_PATH; });

  async function throughTheDoor(): Promise<void> {
    const { adminDoorValue } = await import('./door');
    s.headers = { 'x-admin-door': (await adminDoorValue())!, 'x-admin-door-next': `${P}/quizzes` };
  }

  const PERFECT: [string, typeof s.auth, string?] = ['a perfect admin: aal2, a fresh code, a verified factor', { user: { id: 'admin-1' }, aal: 'aal2', factor: true }];
  const STALE: [string, typeof s.auth, string?] = ['the admin at aal2 whose code is 12 h 01 old', { user: { id: 'admin-1' }, aal: 'aal2', factor: true, totpAgeMs: 12 * 60 * 60 * 1000 + 60_000 }];

  it('covers the 4 pages, the 2 TOTP pages and the layout of the tree', () => {
    expect(HUB_PAGES.length).toBe(6);
    expect(HUB_TREE.filter((f) => /layout\.tsx$/.test(f))).toEqual([HUB_LAYOUT]);
  });

  describe('without the door header, every page and the layout are the 404, the session is never read', () => {
    for (const [name, auth, enrol] of [PERFECT, STALE, ...REFUSED]) {
      it.each(HUB_PAGES)(`${name}: %s`, async (f) => {
        s.auth = auth;
        setEnrol(enrol);
        const mod = await import(/* @vite-ignore */ hubModule(f)) as { default: (p: unknown) => Promise<unknown> };
        await expect(mod.default(props)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(s.reads).toEqual([]);
      });

      it(`${name}: the layout`, async () => {
        s.auth = auth;
        setEnrol(enrol);
        const l = await import(/* @vite-ignore */ hubModule(HUB_LAYOUT)) as { default: (p: { children: unknown }) => Promise<unknown>; generateMetadata: () => Promise<{ title?: unknown; robots?: unknown }> };
        await expect(l.default({ children: 'x' })).rejects.toThrow('NEXT_NOT_FOUND');
        const meta = await l.generateMetadata();
        expect(meta.title).toBeUndefined();
        expect(meta.robots).toEqual({ index: false, follow: false });
        expect(s.reads).toEqual([]);
      });
    }
  });

  describe('with a header that is not the one the middleware sets, the same 404', () => {
    const FORGED: Array<[string, Record<string, string>]> = [
      ['a flag', { 'x-admin-door': '1' }],
      ['the address itself', { 'x-admin-door': DOOR }],
      ['a 64-character guess', { 'x-admin-door': 'a'.repeat(64) }],
      ['only the next header', { 'x-admin-door-next': `${P}/quizzes` }],
    ];
    for (const [what, headers] of FORGED) {
      it.each(HUB_PAGES)(`${what}, a perfect admin: %s`, async (f) => {
        s.auth = PERFECT[1];
        setEnrol();
        s.headers = headers;
        const mod = await import(/* @vite-ignore */ hubModule(f)) as { default: (p: unknown) => Promise<unknown> };
        await expect(mod.default(props)).rejects.toThrow('NEXT_NOT_FOUND');
        expect(s.reads).toEqual([]);
      });
    }

    it('a header that was right for another ADMIN_PATH, or for a deployment without one', async () => {
      await throughTheDoor();
      s.auth = PERFECT[1];
      setEnrol();
      const mod = await import(/* @vite-ignore */ hubModule(HUB_PAGES[0]!)) as { default: (p: unknown) => Promise<unknown> };
      process.env.ADMIN_PATH = `${DOOR}-other`;
      await expect(mod.default(props)).rejects.toThrow('NEXT_NOT_FOUND');
      delete process.env.ADMIN_PATH;
      await expect(mod.default(props)).rejects.toThrow('NEXT_NOT_FOUND');
      process.env.ADMIN_PATH = DOOR;
      expect(s.reads).toEqual([]);
    });
  });

  describe('through the door, the guard decides as everywhere: the 404, or the code pages under the secret address, before any read', () => {
    for (const [name, auth, enrol] of REFUSED) {
      it.each(HUB_PAGES)(`${name}: %s`, async (f) => {
        await throughTheDoor();
        s.auth = auth;
        setEnrol(enrol);
        const mod = await import(/* @vite-ignore */ hubModule(f)) as { default: (p: unknown) => Promise<unknown>; generateMetadata?: (p: unknown) => Promise<{ title?: unknown }> };
        const err = await mod.default(props).then(() => null, (e: unknown) => (e instanceof Error ? e.message : String(e)));
        if (isHubMfaPage(f)) {
          if (reachesMfa(auth, enrol)) expect(err === null || new RegExp(`^NEXT_REDIRECT ${P}/(code|setup)$`).test(err)).toBe(true);
          else expect(err).toBe('NEXT_NOT_FOUND');
        } else if (reachesMfa(auth, enrol)) {
          expect(err).toBe(auth.factor === false ? `NEXT_REDIRECT ${P}/setup` : `NEXT_REDIRECT ${P}/code?next=${encodeURIComponent(`${P}/quizzes`)}`);
        } else {
          expect(err).toBe('NEXT_NOT_FOUND');
        }
        if (mod.generateMetadata) expect((await mod.generateMetadata(props).catch((): { title?: unknown } => ({}))).title).toBeUndefined();
        expect(s.reads).toEqual([]);
      });
    }

    it.each(HUB_PAGES.filter((f) => !isHubMfaPage(f)))('the admin whose code is 12 h 01 old is sent to the code page, with the address asked for: %s', async (f) => {
      await throughTheDoor();
      s.auth = STALE[1];
      setEnrol();
      const mod = await import(/* @vite-ignore */ hubModule(f)) as { default: (p: unknown) => Promise<unknown> };
      await expect(mod.default(props)).rejects.toThrow(`NEXT_REDIRECT ${P}/code?next=${encodeURIComponent(`${P}/quizzes`)}`);
      expect(s.reads).toEqual([]);
    });

    it('the code page serves the admin whose code is due again, and sends an admin whose code is fresh on to the address asked for', async () => {
      const mod = await import(/* @vite-ignore */ hubModule('app/sites/[site]/(hub)/admin/code/page.tsx')) as { default: (p: unknown) => Promise<unknown> };
      await throughTheDoor();
      setEnrol();
      s.auth = STALE[1];
      await expect(mod.default({ searchParams: Promise.resolve({ next: `${P}/journal?site=kpop` }) })).resolves.toBeTruthy();
      s.auth = PERFECT[1];
      await expect(mod.default({ searchParams: Promise.resolve({ next: `${P}/journal?site=kpop` }) })).rejects.toThrow(`NEXT_REDIRECT ${P}/journal?site=kpop`);
      await expect(mod.default({ searchParams: Promise.resolve({ next: 'https://evil.example/' }) })).rejects.toThrow(`NEXT_REDIRECT ${P}/quizzes`);
      await expect(mod.default({ searchParams: Promise.resolve({}) })).rejects.toThrow(`NEXT_REDIRECT ${P}/quizzes`);
      expect(s.reads).toEqual([]);
    });
  });

  describe('the hub layout through the door', () => {
    const layout = async (): Promise<{ default: (p: { children: unknown }) => Promise<unknown>; generateMetadata: () => Promise<{ title?: unknown; robots?: unknown }> }> =>
      await import(/* @vite-ignore */ hubModule(HUB_LAYOUT)) as never;

    it.each(REFUSED)('%s', async (_n, auth, enrol) => {
      await throughTheDoor();
      s.auth = auth;
      setEnrol(enrol);
      const l = await layout();
      if (reachesMfa(auth, enrol)) {
        const { renderToStaticMarkup } = await import('react-dom/server');
        expect(renderToStaticMarkup((await l.default({ children: 'x' })) as never)).toBe('x');
      } else {
        await expect(l.default({ children: null })).rejects.toThrow('NEXT_NOT_FOUND');
      }
      expect((await l.generateMetadata()).title).toBeUndefined();
      expect(s.reads).toEqual([]);
    });

    it('a perfect admin gets the layout and the title Admin; a code that is due again gets the layout only, no title', async () => {
      await throughTheDoor();
      setEnrol();
      const l = await layout();
      const { renderToStaticMarkup } = await import('react-dom/server');
      s.auth = PERFECT[1];
      expect(renderToStaticMarkup((await l.default({ children: 'x' })) as never)).toBe('x');
      expect((await l.generateMetadata()).title).toBe('Admin');
      s.auth = STALE[1];
      expect(renderToStaticMarkup((await l.default({ children: 'x' })) as never)).toBe('x');
      expect((await l.generateMetadata()).title).toBeUndefined();
    });
  });
});
