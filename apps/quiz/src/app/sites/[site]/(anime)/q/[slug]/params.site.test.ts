// Run O1, lane O1 (lot a, finishing): the build params of /q/[slug] on a site list only that site's quizzes (forSite); the kpop
// list is today's (the kpop page has its own generateStaticParams, untouched).
import { afterEach, describe, expect, it, vi } from 'vitest';

const log = vi.hoisted(() => ({ eq: [] as Array<[string, unknown]>, limit: 0 }));
vi.mock('@/lib/supabase/server', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = (col: string, val: unknown) => { log.eq.push([col, val]); return chain; };
  chain.order = () => chain;
  chain.limit = (n: number) => { log.limit = n; return Promise.resolve({ data: [{ slug: 'one-piece-quiz-1' }, { slug: 'naruto-quiz-2' }], error: null }); };
  return {
    createPublicReadClient: () => ({ from: () => chain }),
    createServerClient: async () => ({}),
    createServiceRoleClient: () => ({}),
  };
});

// The page pulls in the whole quiz play tree: the first import is slow on a busy machine.
vi.setConfig({ testTimeout: 60_000 });

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); log.eq.length = 0; log.limit = 0; });

async function params(site: 'anime' | 'hub') {
  vi.resetModules();
  vi.unstubAllEnvs();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  const mod = await import('./page');
  return mod.generateStaticParams({ params: { site } });
}

describe('/q/[slug] generateStaticParams', () => {
  for (const site of ['anime', 'hub'] as const) {
    it(`${site}: reads published quizzes of ${site} only and carries the site in every row`, async () => {
      const rows = await params(site);
      expect(rows).toEqual([{ slug: 'one-piece-quiz-1', site }, { slug: 'naruto-quiz-2', site }]);
      expect(log.eq).toEqual([['site_id', site], ['status', 'published']]);
      expect(log.limit).toBe(1000);
    });
  }

  it('without a site param nothing is listed', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const mod = await import('./page');
    expect(await mod.generateStaticParams({})).toEqual([]);
  });
});
