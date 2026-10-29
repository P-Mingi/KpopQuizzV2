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
    expect(bodies[0]).toMatchObject({ host: 'bunnyverse.org', key: '760f9a9459d4db0bd8a08f13a0f1ec6e' });
    expect(bodies[0]?.urlList).toEqual(['https://bunnyverse.org/anime/q/death-note-quiz']);
  });

  it('never submits a URL of another domain', async () => {
    const { result, bodies } = await ping('kpop', '', ['https://bunnyverse.org/anime/q/x', 'https://kpopquiz.org/q/y']);
    expect(result.submitted).toBe(1);
    expect(bodies[0]?.urlList).toEqual(['https://kpopquiz.org/q/y']);
  });
});

// Bunnyverse (finding 3): the hub's /sitemap.xml is a sitemap index. A deploy resubmit sends the page URLs of its child sitemaps,
// never the URL of a sitemap file.
const urlset = (urls: string[]): string => `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${u}</loc><changefreq>weekly</changefreq></url>`).join('\n')}\n</urlset>\n`;
const index = (urls: string[]): string => `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<sitemap><loc>${u}</loc></sitemap>`).join('\n')}\n</sitemapindex>\n`;

async function sitemapsOf(site: string, files: Record<string, string>, indexing = '1'): Promise<{ urls: string[] | Error; fetched: string[]; bodies: Array<{ urlList: string[] }>; load: () => Promise<typeof import('./indexnow')> }> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.stubEnv('NET_INDEXING', indexing);
  const fetched: string[] = [];
  const bodies: Array<{ urlList: string[] }> = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === 'POST') { bodies.push(JSON.parse(init.body!)); return new Response('', { status: 200 }); }
    fetched.push(url);
    return url in files ? new Response(files[url], { status: 200 }) : new Response('', { status: 503 });
  }));
  const load = (): Promise<typeof import('./indexnow')> => import('./indexnow');
  const { sitemapUrls } = await load();
  let urls: string[] | Error;
  try { urls = await sitemapUrls(); } catch (e) { urls = e as Error; }
  return { urls, fetched, bodies, load };
}

describe('sitemapUrls on a sitemap index', () => {
  const HUB_PAGES = ['https://bunnyverse.org/', 'https://bunnyverse.org/privacy', 'https://bunnyverse.org/legal'];
  const ANIME_PAGES = ['https://bunnyverse.org/anime', 'https://bunnyverse.org/anime/series', 'https://bunnyverse.org/anime/q/who-is-l'];

  it('hub: the page URLs of /sitemap-hub.xml and /anime/sitemap.xml, never a sitemap file URL, and no child off its origin', async () => {
    const { urls, fetched } = await sitemapsOf('hub', {
      'https://bunnyverse.org/sitemap.xml': index(['https://bunnyverse.org/sitemap-hub.xml', 'https://bunnyverse.org/anime/sitemap.xml', 'https://evil.example/sitemap.xml']),
      'https://bunnyverse.org/sitemap-hub.xml': urlset(HUB_PAGES),
      'https://bunnyverse.org/anime/sitemap.xml': urlset(ANIME_PAGES),
    });
    expect(urls).toEqual([...HUB_PAGES, ...ANIME_PAGES]);
    expect((urls as string[]).some((u) => u.endsWith('.xml'))).toBe(false);
    expect(fetched).toEqual(['https://bunnyverse.org/sitemap.xml', 'https://bunnyverse.org/sitemap-hub.xml', 'https://bunnyverse.org/anime/sitemap.xml']);
  });

  it('hub: a child that is an index again is not followed and none of its locs is returned', async () => {
    const { urls, fetched } = await sitemapsOf('hub', {
      'https://bunnyverse.org/sitemap.xml': index(['https://bunnyverse.org/sitemap-hub.xml', 'https://bunnyverse.org/more.xml']),
      'https://bunnyverse.org/sitemap-hub.xml': urlset(HUB_PAGES),
      'https://bunnyverse.org/more.xml': index(['https://bunnyverse.org/deeper.xml']),
    });
    expect(urls).toEqual(HUB_PAGES);
    expect(fetched).not.toContain('https://bunnyverse.org/deeper.xml');
  });

  it('hub: a child sitemap that fails makes the resubmit fail, as the index itself does (never a half list)', async () => {
    const { urls } = await sitemapsOf('hub', {
      'https://bunnyverse.org/sitemap.xml': index(['https://bunnyverse.org/sitemap-hub.xml', 'https://bunnyverse.org/anime/sitemap.xml']),
      'https://bunnyverse.org/sitemap-hub.xml': urlset(HUB_PAGES),
    });
    expect(urls).toBeInstanceOf(Error);
    expect((urls as Error).message).toBe('sitemap fetch 503');
  });

  it('kpop and anime: a urlset is read as before, one fetch, every <loc>', async () => {
    const kpop = await sitemapsOf('kpop', { 'https://kpopquiz.org/sitemap.xml': urlset(['https://kpopquiz.org/', 'https://kpopquiz.org/q/x']) });
    expect(kpop.urls).toEqual(['https://kpopquiz.org/', 'https://kpopquiz.org/q/x']);
    expect(kpop.fetched).toEqual(['https://kpopquiz.org/sitemap.xml']);
    const anime = await sitemapsOf('anime', { 'https://bunnyverse.org/anime/sitemap.xml': urlset(ANIME_PAGES) });
    expect(anime.urls).toEqual(ANIME_PAGES);
    expect(anime.fetched).toEqual(['https://bunnyverse.org/anime/sitemap.xml']);
  });

  it('hub open, the deploy resubmit end to end: IndexNow receives the page URLs only', async () => {
    const { urls, load, bodies } = await sitemapsOf('hub', {
      'https://bunnyverse.org/sitemap.xml': index(['https://bunnyverse.org/sitemap-hub.xml', 'https://bunnyverse.org/anime/sitemap.xml']),
      'https://bunnyverse.org/sitemap-hub.xml': urlset(HUB_PAGES),
      'https://bunnyverse.org/anime/sitemap.xml': urlset(ANIME_PAGES),
    });
    const { pingIndexNow } = await load();
    expect(await pingIndexNow(urls as string[])).toEqual({ submitted: 6, batches: 1 });
    expect(bodies[0]?.urlList).toEqual([...HUB_PAGES, ...ANIME_PAGES]);
    expect(bodies[0]?.urlList.some((u) => u.endsWith('.xml'))).toBe(false);
  });
});
