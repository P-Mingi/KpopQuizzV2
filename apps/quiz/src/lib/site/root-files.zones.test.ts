// FandomVerse (lane 1): one robots.txt and one sitemap index for fandomverse.org (requirement 3 of the brief, ARCHITECTURE-FANDOMVERSE.md).
// The hub answers both for the whole domain; OtakuQuiz, in /anime, answers no robots.txt (404) and keeps its own sitemap at
// /anime/sitemap.xml, listed by the hub's index. The registry values of FandomVerse are stubbed, so the test holds before and
// after the registry carries them.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from './test-recorder';

import type { SiteConfig } from './types';

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => state.db,
  createServiceRoleClient: () => state.db,
}));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.doUnmock('./registry'); state.db = null; });

const ctx = (site: string): { params: Promise<{ site: string }> } => ({ params: Promise.resolve({ site }) });
const req = new Request('http://localhost/x');

async function fandomVerse(site: 'anime' | 'hub'): Promise<void> {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SITE_ID', site);
  vi.stubEnv('SITE_ID', '');
  vi.doMock('./registry', async (importOriginal) => {
    const m = await importOriginal<typeof import('./registry')>();
    const registry = {
      ...m.REGISTRY,
      anime: { ...m.REGISTRY.anime, url: 'https://fandomverse.org/anime', domain: 'fandomverse.org' },
      hub: { ...m.REGISTRY.hub, url: 'https://fandomverse.org', domain: 'fandomverse.org' },
    };
    return { ...m, REGISTRY: registry, SITE: registry[m.SITE_ID] };
  });
}

const locs = (xml: string): string[] => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);

describe('the pure parts', () => {
  it('zoneRobots writes the rules of a sub-folder site under its base path after the root site\'s own, \'/\' once', async () => {
    const { robotsText, zoneRobots } = await import('./root-files');
    const anime = { url: 'https://fandomverse.org/anime' } as SiteConfig;
    const text = robotsText(zoneRobots({
      rules: [{ userAgent: '*', allow: ['/', '/api/og/'], disallow: ['/api/', '/auth/'] }, { userAgent: 'Google-Extended', allow: '/' }],
      sitemap: 'https://fandomverse.org/sitemap.xml',
    }, [anime]));
    expect(text).toBe([
      'User-Agent: *', 'Allow: /', 'Allow: /api/og/', 'Allow: /anime/api/og/', 'Disallow: /api/', 'Disallow: /auth/', 'Disallow: /anime/api/', 'Disallow: /anime/auth/',
      '', 'User-Agent: Google-Extended', 'Allow: /',
      '', 'Sitemap: https://fandomverse.org/sitemap.xml', '',
    ].join('\n'));
  });

  it('zoneRobots with no sub-folder site is the robots it was given', async () => {
    const { zoneRobots } = await import('./root-files');
    const robots = { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://kpopquiz.org/sitemap.xml' };
    expect(zoneRobots(robots, [])).toBe(robots);
  });

  it('the index lists the hub\'s own pages, then each sub-folder site\'s sitemap once open (the hub\'s NET_INDEXING)', async () => {
    const { sitemapIndexXml, zoneSitemaps } = await import('./root-files');
    const hub = { id: 'hub', url: 'https://fandomverse.org' } as SiteConfig;
    const anime = { id: 'anime', url: 'https://fandomverse.org/anime' } as SiteConfig;
    for (const open of ['1', 'true']) {
      const urls = zoneSitemaps(hub, [anime], open);
      expect(urls).toEqual(['https://fandomverse.org/sitemap-hub.xml', 'https://fandomverse.org/anime/sitemap.xml']);
      const xml = sitemapIndexXml(urls);
      expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
      expect(locs(xml)).toEqual(urls);
      expect(xml).not.toContain('<url>');
    }
  });

  it('while closed the index lists the hub\'s own pages only: no /anime', async () => {
    const { sitemapIndexXml, zoneSitemaps } = await import('./root-files');
    const hub = { id: 'hub', url: 'https://fandomverse.org' } as SiteConfig;
    const anime = { id: 'anime', url: 'https://fandomverse.org/anime' } as SiteConfig;
    for (const closed of [undefined, '', '0', 'false', 'open']) {
      const urls = zoneSitemaps(hub, [anime], closed);
      expect(urls, String(closed)).toEqual(['https://fandomverse.org/sitemap-hub.xml']);
      expect(sitemapIndexXml(urls)).not.toContain('/anime');
    }
  });

  it('the hub\'s llms.txt names /anime once open, and no site in a sub-folder while closed (same text as before)', async () => {
    const { llmsText } = await import('./root-files');
    const { REGISTRY } = await import('./registry');
    const hub = { ...REGISTRY.hub, url: 'https://fandomverse.org', domain: 'fandomverse.org' };
    const anime = { ...REGISTRY.anime, url: 'https://fandomverse.org/anime', domain: 'fandomverse.org' };
    const open = llmsText(hub, [anime], '1');
    expect(open).toContain('- /: the sites of the network\n- /anime: OtakuQuiz, a quiz site of the network (its own llms.txt: /anime/llms.txt)\n- /privacy:');
    for (const closed of [undefined, '', '0']) {
      const text = llmsText(hub, [anime], closed);
      expect(text, String(closed)).not.toContain('/anime');
      expect(text, String(closed)).toContain('- /: the sites of the network\n- /privacy: what one account shares between the sites\n');
      expect(open.replace('- /anime: OtakuQuiz, a quiz site of the network (its own llms.txt: /anime/llms.txt)\n', '')).toBe(text);
    }
  });

  it('a sitemap of a site in a sub-folder lists its home without a trailing slash (Next answers /anime/ with a 308)', async () => {
    const { sitemapXml } = await import('./root-files');
    expect(locs(sitemapXml('https://fandomverse.org/anime', [{ path: '/' }, { path: '/series' }])))
      .toEqual(['https://fandomverse.org/anime', 'https://fandomverse.org/anime/series']);
    expect(locs(sitemapXml('https://fandomverse.org', [{ path: '/' }]))).toEqual(['https://fandomverse.org/']);
  });

  it('the llms.txt of a site in a sub-folder names its full address and its paths carry the sub-folder', async () => {
    const { llmsText } = await import('./root-files');
    const { REGISTRY } = await import('./registry');
    const text = llmsText({ ...REGISTRY.anime, url: 'https://fandomverse.org/anime', domain: 'fandomverse.org' });
    expect(text).toContain('fandomverse.org/anime is an independent anime quiz site.');
    expect(text).toContain('- /anime/series: every series with quizzes');
    expect(text).not.toMatch(/^- \/(?!anime)/m);
  });
});

describe('the route handlers on fandomverse.org', () => {
  const robotsRoute = () => import('@/app/sites/[site]/robots.txt/route');
  const sitemapRoute = () => import('@/app/sites/[site]/sitemap.xml/route');
  const hubPagesRoute = () => import('@/app/sites/[site]/sitemap-hub.xml/route');
  const llmsRoute = () => import('@/app/sites/[site]/llms.txt/route');

  it('hub: the one robots.txt of the domain, with the rules of /anime and the index as its sitemap', async () => {
    await fandomVerse('hub');
    const res = await (await robotsRoute()).GET(req, ctx('hub'));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(body).toContain('Disallow: /api/');
    expect(body).toContain('Disallow: /anime/api/');
    expect(body).toContain('Disallow: /anime/settings/');
    expect(body).toContain('Allow: /anime/api/og/');
    expect(body.match(/^Sitemap: .*$/gm)).toEqual(['Sitemap: https://fandomverse.org/sitemap.xml']);
  });

  it('anime: no second robots file (/anime/robots.txt is a 404)', async () => {
    await fandomVerse('anime');
    expect((await (await robotsRoute()).GET(req, ctx('anime'))).status).toBe(404);
  });

  it('hub closed: /sitemap.xml is the index of the domain with its own pages only (no /anime) and reads nothing; /sitemap-hub.xml lists its own pages', async () => {
    await fandomVerse('hub');
    state.db = recordingDb();
    const index = await (await sitemapRoute()).GET(req, ctx('hub'));
    const xml = await index.text();
    expect(index.status).toBe(200);
    expect(xml).toContain('<sitemapindex');
    expect(locs(xml)).toEqual(['https://fandomverse.org/sitemap-hub.xml']);
    const pages = await (await hubPagesRoute()).GET(req, ctx('hub'));
    expect(pages.status).toBe(200);
    expect(locs(await pages.text())).toEqual(['https://fandomverse.org/']);
    expect((state.db as ReturnType<typeof recordingDb>).queries).toHaveLength(0);
  });

  it('hub open (NET_INDEXING=1): the index lists its own pages and /anime/sitemap.xml, and llms.txt names /anime', async () => {
    await fandomVerse('hub');
    vi.stubEnv('NET_INDEXING', '1');
    state.db = recordingDb();
    const index = await (await sitemapRoute()).GET(req, ctx('hub'));
    expect(index.status).toBe(200);
    expect(locs(await index.text())).toEqual(['https://fandomverse.org/sitemap-hub.xml', 'https://fandomverse.org/anime/sitemap.xml']);
    const llms = await (await llmsRoute()).GET(req, ctx('hub'));
    expect(await llms.text()).toContain('- /anime: OtakuQuiz, a quiz site of the network (its own llms.txt: /anime/llms.txt)\n');
  });

  it('hub closed: llms.txt names no site in a sub-folder', async () => {
    await fandomVerse('hub');
    const llms = await (await llmsRoute()).GET(req, ctx('hub'));
    expect(llms.status).toBe(200);
    expect(await llms.text()).not.toContain('/anime');
  });

  it('anime: /anime/sitemap.xml is its urlset (home without a trailing slash); /anime/sitemap-hub.xml is a 404', async () => {
    await fandomVerse('anime');
    state.db = recordingDb({ series: [], groups: [], quizzes: [] });
    const res = await (await sitemapRoute()).GET(req, ctx('anime'));
    const urls = locs(await res.text());
    expect(res.status).toBe(200);
    expect(urls.slice(0, 2)).toEqual(['https://fandomverse.org/anime', 'https://fandomverse.org/anime/series']);
    expect(urls.every((u) => u === 'https://fandomverse.org/anime' || u.startsWith('https://fandomverse.org/anime/'))).toBe(true);
    expect((await (await hubPagesRoute()).GET(req, ctx('anime'))).status).toBe(404);
  });

  it('kpop: the routes under app/sites answer 404 as before', async () => {
    vi.resetModules();
    expect((await (await hubPagesRoute()).GET(req, ctx('hub'))).status).toBe(404);
  });
});
