// Run O1, C2 fix S3: the kpop-only cron routes carry cronForSite(['kpop']) (nine in the run, quiz-corrections since 2026-10-27). vercel.json is shared by the three Vercel
// projects, so each route runs on every project; on a build that is not kpop it must answer its 200 skip and touch nothing,
// and on the kpop build it must keep today's behaviour (no skip answer, the work is reached).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({ touched: 0 }));

// A chainable stand-in for every supabase client: any call is counted, any await answers an empty success.
function chain(): unknown {
  const fn = (): unknown => proxy;
  const proxy: unknown = new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: null, error: null, count: 0 });
      return (): unknown => { state.touched += 1; return proxy; };
    },
    apply() { return proxy; },
  });
  return proxy;
}
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => chain(),
  createServerClient: async () => ({ ...(chain() as object), auth: { getUser: async () => ({ data: { user: null } }) }, from: () => { state.touched += 1; return chain(); } }),
  createPublicReadClient: () => chain(),
}));

const ROUTES: Array<[string, () => Promise<{ GET: (r: NextRequest) => Promise<Response> }>]> = [
  ['ensure-daily-debate', () => import('./ensure-daily-debate/route')],
  ['fans-picked', () => import('./fans-picked/route')],
  ['live-expire', () => import('./live-expire/route')],
  ['notification-prune', () => import('./notification-prune/route')],
  ['plays-counter-reconcile', () => import('./plays-counter-reconcile/route')],
  ['prune-activity', () => import('./prune-activity/route')],
  ['seo-indexability', () => import('./seo-indexability/route')],
  ['verse-role-decay', () => import('./verse-role-decay/route')],
  ['ranked nightly', () => import('../ranked/cron/nightly/route')],
  ['quiz-corrections', () => import('./quiz-corrections/route')],
];

async function call(site: string, load: (typeof ROUTES)[number][1]): Promise<Response | Error> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('CRON_SECRET', 'o1-test-secret');
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', '1');
  const { GET } = await load();
  try {
    return await GET(new NextRequest('https://example.test/api/cron/x', { headers: { authorization: 'Bearer o1-test-secret' } }));
  } catch (e) {
    return e instanceof Error ? e : new Error(String(e));
  }
}

beforeEach(() => {
  state.touched = 0;
  // seo-indexability would fetch the production sitemap: nothing leaves the process.
  vi.stubGlobal('fetch', vi.fn(async () => { state.touched += 1; return new Response('', { status: 500 }); }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('the kpop crons answer their skip on a build that is not kpop', () => {
  for (const [name, load] of ROUTES) {
    for (const site of ['anime', 'hub']) {
      it(`${name} on ${site}: 200 { skipped: true }, nothing read or written`, async () => {
        const res = await call(site, load);
        expect(res).toBeInstanceOf(Response);
        expect((res as Response).status).toBe(200);
        expect(await (res as Response).json()).toEqual({ skipped: true });
        expect(state.touched).toBe(0);
      });
    }
  }
});

describe('the kpop build keeps today\'s behaviour', () => {
  for (const [name, load] of ROUTES) {
    for (const site of ['', 'kpop']) {
      it(`${name} on kpop (site "${site}"): no skip answer`, async () => {
        const res = await call(site, load);
        if (res instanceof Response) {
          const body = await res.clone().json().catch(() => null) as { skipped?: unknown } | null;
          expect(body?.skipped).not.toBe(true);
        }
      });
    }
  }

  it('ensure-daily-debate still calls ensure_daily_debate on kpop and answers ok', async () => {
    const res = await call('kpop', ROUTES[0]![1]);
    expect(res).toBeInstanceOf(Response);
    expect((res as Response).status).toBe(200);
    expect(state.touched).toBeGreaterThan(0);
  });

  it('prune-activity still prunes on kpop', async () => {
    const res = await call('kpop', ROUTES[5]![1]);
    expect((res as Response).status).toBe(200);
    expect(await (res as Response).json()).toMatchObject({ ok: true });
    expect(state.touched).toBeGreaterThan(0);
  });
});
