import { afterEach, describe, expect, it, vi } from 'vitest';

// SEO phase 1 (2026-10-27): IndexNow pings the build's own site with its own key, and nothing while that
// site is closed to search engines (NET_INDEXING), so an anime or hub build never pings kpopquiz.org.

async function ping(site: string, indexing: string, urls: string[]): Promise<{ result: { submitted: number; batches: number }; bodies: Array<{ host: string; key: string; keyLocation: string; urlList: string[] }> }> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NET_INDEXING', indexing);
  const bodies: Array<{ host: string; key: string; keyLocation: string; urlList: string[] }> = [];
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: { body: string }) => { bodies.push(JSON.parse(init.body)); return new Response('', { status: 200 }); }));
  const { pingIndexNow } = await import('./indexnow');
  return { result: await pingIndexNow(urls), bodies };
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('pingIndexNow per site', () => {
  it('kpop pings kpopquiz.org with its key, paths made absolute', async () => {
    const { result, bodies } = await ping('kpop', '', ['/q/bts-quiz-x', 'https://kpopquiz.org/bts-quiz']);
    expect(result).toEqual({ submitted: 2, batches: 1 });
    expect(bodies[0]).toMatchObject({ host: 'kpopquiz.org', key: '4b2f9a7ce8d1465fb0a3e6c95d47128a', keyLocation: 'https://kpopquiz.org/4b2f9a7ce8d1465fb0a3e6c95d47128a.txt' });
    expect(bodies[0]?.urlList).toEqual(['https://kpopquiz.org/q/bts-quiz-x', 'https://kpopquiz.org/bts-quiz']);
  });

  it('a site still closed to search engines pings nothing', async () => {
    const { result, bodies } = await ping('anime', '', ['/q/death-note-quiz']);
    expect(result).toEqual({ submitted: 0, batches: 0 });
    expect(bodies).toEqual([]);
  });

  it('an open anime site pings its own domain with its own key', async () => {
    const { bodies } = await ping('anime', '1', ['/q/death-note-quiz']);
    expect(bodies[0]).toMatchObject({ host: 'otakuquiz.org', key: '760f9a9459d4db0bd8a08f13a0f1ec6e' });
    expect(bodies[0]?.urlList).toEqual(['https://otakuquiz.org/q/death-note-quiz']);
  });

  it('never submits a URL of another domain', async () => {
    const { result, bodies } = await ping('kpop', '', ['https://otakuquiz.org/q/x', 'https://kpopquiz.org/q/y']);
    expect(result.submitted).toBe(1);
    expect(bodies[0]?.urlList).toEqual(['https://kpopquiz.org/q/y']);
  });
});
