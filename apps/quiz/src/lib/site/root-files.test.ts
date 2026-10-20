// Run O1, lane O1: /robots.txt and /sitemap.xml of anime and hub. The text and the XML are pure; the list of an anime site
// reads through forSite (site anime) and keeps hubs under the indexable floor out; the route handlers answer 200 with the
// origin of their own site only and 404 on a build that is not the site of the request.
import { afterEach, describe, expect, it, vi } from 'vitest';

import { recordingDb } from './test-recorder';

import type { RecordedQuery } from './test-recorder';

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => state.db,
  createServiceRoleClient: () => state.db,
}));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); state.db = null; });

const ctx = (site: string): { params: Promise<{ site: string }> } => ({ params: Promise.resolve({ site }) });

/** The rows an anime site has: two published series (3 and 1 published quizzes), 4 published quizzes. */
function animeDb(): ReturnType<typeof recordingDb> {
  const select = (rec: RecordedQuery): string => String(rec.ops.find(([m]) => m === 'select')?.[1][0] ?? '');
  return recordingDb({
    series: [{ group_id: 1 }, { group_id: 2 }],
    groups: [
      { id: 1, slug: 'death-note', name: 'Death Note' },
      { id: 2, slug: 'spy-x-family', name: 'Spy x Family' },
      { id: 3, slug: 'kpop-leftover', name: 'Not a series' },
    ],
    quizzes: (rec: RecordedQuery) => (select(rec).includes('slug')
      ? [
        { slug: 'dn-1', created_at: '2026-10-04T00:00:00Z' }, { slug: 'dn-2', created_at: '2026-10-03T00:00:00Z' },
        { slug: 'dn-3', created_at: '2026-10-02T00:00:00Z' }, { slug: 'sxf-1&x', created_at: '2026-10-01T00:00:00Z' },
      ]
      : [{ group_id: 1 }, { group_id: 1 }, { group_id: 1 }, { group_id: 2 }]),
  });
}

describe('robotsText and sitemapXml', () => {
  it('robotsText writes one block per rule, then the sitemap line', async () => {
    const { robotsText } = await import('./root-files');
    expect(robotsText({
      rules: [{ userAgent: '*', allow: ['/', '/api/og/'], disallow: ['/api/'] }, { userAgent: 'GPTBot', allow: '/' }],
      sitemap: 'https://otakuquiz.org/sitemap.xml',
    })).toBe('User-Agent: *\nAllow: /\nAllow: /api/og/\nDisallow: /api/\n\nUser-Agent: GPTBot\nAllow: /\n\nSitemap: https://otakuquiz.org/sitemap.xml\n');
  });

  it('sitemapXml puts the origin before every path and escapes the XML characters', async () => {
    const { sitemapXml } = await import('./root-files');
    const xml = sitemapXml('https://otakuquiz.org', [
      { path: '/', priority: 1 },
      { path: '/q/a&b', lastModified: new Date('2026-10-01T00:00:00Z'), changeFrequency: 'monthly' },
    ]);
    expect(xml).toContain('<loc>https://otakuquiz.org/</loc>');
    expect(xml).toContain('<loc>https://otakuquiz.org/q/a&amp;b</loc>');
    expect(xml).toContain('<lastmod>2026-10-01T00:00:00.000Z</lastmod>');
    expect([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].every((m) => m[1]!.startsWith('https://otakuquiz.org/'))).toBe(true);
  });
});

describe('sitemapEntriesFor', () => {
  it('hub: its home and /privacy, no read', async () => {
    const { REGISTRY } = await import('./registry');
    const { sitemapEntriesFor } = await import('./root-files');
    const db = recordingDb();
    expect((await sitemapEntriesFor(REGISTRY.hub, db)).map((e) => e.path)).toEqual(['/', '/privacy']);
    expect(db.queries).toHaveLength(0);
  });

  it('anime: home, /series, the hubs at the floor, then the published quizzes, every read scoped to anime', async () => {
    const { REGISTRY } = await import('./registry');
    const { sitemapEntriesFor } = await import('./root-files');
    expect(REGISTRY.anime.seo.minPublishedForIndexableHub).toBe(3);
    const db = animeDb();
    const paths = (await sitemapEntriesFor(REGISTRY.anime, db)).map((e) => e.path);
    // spy-x-family has 1 published quiz: under the floor of 3, so its hub is not listed; its quiz is.
    expect(paths).toEqual(['/', '/series', '/death-note-quiz', '/q/dn-1', '/q/dn-2', '/q/dn-3', '/q/sxf-1&x']);
    for (const table of ['groups', 'quizzes']) {
      const eqs = db.calls(table, 'eq').filter((a) => a[0] === 'site_id').map((a) => a[1]);
      expect(eqs.length, `${table} is read for site anime`).toBeGreaterThan(0);
      expect(new Set(eqs)).toEqual(new Set(['anime']));
    }
  });

  it('kpop has app/sitemap.ts: asking for it here is an error', async () => {
    const { REGISTRY } = await import('./registry');
    const { sitemapEntriesFor } = await import('./root-files');
    await expect(sitemapEntriesFor(REGISTRY.kpop, recordingDb())).rejects.toThrow(/app\/sitemap\.ts/);
  });
});

describe('the route handlers', () => {
  const robotsRoute = () => import('@/app/sites/[site]/robots.txt/route');
  const sitemapRoute = () => import('@/app/sites/[site]/sitemap.xml/route');
  const req = new Request('http://localhost/x');

  it('anime: robots.txt answers 200, its Sitemap line is its own origin, no kpop host', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    const res = await (await robotsRoute()).GET(req, ctx('anime'));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^text\/plain/);
    expect(body).toContain('Sitemap: https://otakuquiz.org/sitemap.xml');
    expect(body).not.toMatch(/kpopquiz|fanquiz/i);
  });

  it('hub: robots.txt names the hub origin', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    const res = await (await robotsRoute()).GET(req, ctx('hub'));
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('Sitemap: https://fanquiz.org/sitemap.xml');
  });

  it('hub: sitemap.xml lists its home and /privacy on its origin and reads nothing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'hub');
    state.db = recordingDb();
    const res = await (await sitemapRoute()).GET(req, ctx('hub'));
    const body = await res.text();
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/xml/);
    expect([...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])).toEqual(['https://fanquiz.org/', 'https://fanquiz.org/privacy']);
    expect((state.db as ReturnType<typeof recordingDb>).queries).toHaveLength(0);
  });

  it('anime: sitemap.xml lists home, /series, the hubs and the quizzes on its origin only', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    state.db = animeDb();
    const res = await (await sitemapRoute()).GET(req, ctx('anime'));
    const locs = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
    expect(res.status).toBe(200);
    expect(locs.slice(0, 3)).toEqual(['https://otakuquiz.org/', 'https://otakuquiz.org/series', 'https://otakuquiz.org/death-note-quiz']);
    expect(locs.length).toBe(7);
    expect(locs.every((l) => l.startsWith('https://otakuquiz.org/'))).toBe(true);
  });

  it('a failed read answers 503 with a retry hint, never a half list', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    state.db = { from: () => { throw new Error('db down'); } };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await (await sitemapRoute()).GET(req, ctx('anime'));
    spy.mockRestore();
    expect(res.status).toBe(503);
    expect(res.headers.get('retry-after')).toBe('600');
  });

  it('a request for another site than the build answers 404, and so does every request on the kpop build', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_ID', 'anime');
    expect((await (await robotsRoute()).GET(req, ctx('hub'))).status).toBe(404);
    expect((await (await sitemapRoute()).GET(req, ctx('hub'))).status).toBe(404);
    vi.unstubAllEnvs();
    vi.resetModules();
    expect((await (await robotsRoute()).GET(req, ctx('anime'))).status).toBe(404);
    expect((await (await sitemapRoute()).GET(req, ctx('anime'))).status).toBe(404);
  });
});
