// Bunnyverse (owner, 2026-10-28; lane 3): GET /auth/callback hands the hub and anime builds to the shared world handler
// (lib/passport/signin.ts handleWorldCallback: OAuth sessions only, the membership stamp, the basePath of the build) and
// keeps the kpop code as it was: on the kpop build the world handler is never called.
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const seen = vi.hoisted(() => ({ world: 0, exchange: 0 }));

vi.mock('@/lib/passport/signin', () => ({
  handleWorldCallback: async () => { seen.world += 1; return new Response(null, { status: 299 }); },
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: async () => ({
    auth: { exchangeCodeForSession: async () => { seen.exchange += 1; return { error: { message: 'refused' } }; } },
  }),
}));

async function routeOn(site: 'kpop' | 'anime' | 'hub'): Promise<typeof import('./route')> {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  return import('./route');
}

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); seen.world = 0; seen.exchange = 0; });

describe('GET /auth/callback by build', () => {
  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: the world handler answers, the kpop code is not run`, async () => {
      const { GET } = await routeOn(site);
      const res = await GET(new NextRequest('https://bunnyverse.org/auth/callback?code=c1&returnTo=%2F'));
      expect(res.status).toBe(299);
      expect(seen.world).toBe(1);
      expect(seen.exchange).toBe(0);
    });
  }

  it('kpop: the code of today (a refused code goes to /login on kpopquiz.org), the world handler is never called', async () => {
    const { GET } = await routeOn('kpop');
    const res = await GET(new NextRequest('https://kpopquiz.org/auth/callback?code=c1&returnTo=%2Fdaily'));
    expect(seen.world).toBe(0);
    expect(seen.exchange).toBe(1);
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/login');
  });
});
