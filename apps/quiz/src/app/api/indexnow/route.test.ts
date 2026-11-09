// O1 audit 03 P1-8: POST /api/indexnow submits only the diff against the posted previous sitemap; no previous sitemap submits 0.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ pinged: [] as string[][], live: [] as Array<{ loc: string; lastmod: string | null }> }));

vi.mock('@/lib/indexnow', () => ({
  pingIndexNow: async (urls: string[]) => { state.pinged.push(urls); return { submitted: urls.length, batches: urls.length ? 1 : 0 }; },
  sitemapEntries: async () => state.live,
}));

import { GET, POST } from './route';

const U = (p: string): string => `https://kpopquiz.org${p}`;
const xml = (rows: Array<[string, string?]>): string => `<urlset>${rows.map(([l, m]) => `<url><loc>${l}</loc>${m ? `<lastmod>${m}</lastmod>` : ''}</url>`).join('')}</urlset>`;
const req = (method: string, body: string | null = null, token: string | null = 't0k'): NextRequest =>
  new NextRequest(`https://kpopquiz.org/api/indexnow${token ? `?token=${token}` : ''}`, { method, body });

beforeEach(() => {
  state.pinged = [];
  state.live = [{ loc: U('/a'), lastmod: '2026-10-01T00:00:00Z' }, { loc: U('/b'), lastmod: null }];
  process.env.INDEXNOW_TRIGGER_TOKEN = 't0k';
});

describe('/api/indexnow', () => {
  it('rejects a wrong or missing token', async () => {
    expect((await POST(req('POST', xml([[U('/a')]]), 'nope'))).status).toBe(401);
    expect((await POST(req('POST', xml([[U('/a')]]), null))).status).toBe(401);
    expect(state.pinged).toEqual([]);
  });

  it('an unchanged push submits 0', async () => {
    const res = await POST(req('POST', xml([[U('/a'), '2026-10-01T00:00:00Z'], [U('/b')]])));
    expect(await res.json()).toMatchObject({ ok: true, submitted: 0, added: 0, removed: 0, changed: 0 });
    expect(state.pinged).toEqual([[]]);
  });

  it('a new page, a removed page and a moved lastmod are the only URLs sent', async () => {
    state.live = [{ loc: U('/a'), lastmod: '2026-11-05T00:00:00Z' }, { loc: U('/b'), lastmod: null }, { loc: U('/new'), lastmod: null }];
    const res = await POST(req('POST', xml([[U('/a'), '2026-10-01T00:00:00Z'], [U('/b')], [U('/gone')]])));
    expect(await res.json()).toMatchObject({ added: 1, removed: 1, changed: 1, submitted: 3 });
    expect(state.pinged).toEqual([[U('/new'), U('/a'), U('/gone')]]);
  });

  it('with no previous sitemap (first run, or a GET) it submits 0 and asks for the baseline', async () => {
    for (const res of [await POST(req('POST', '')), await GET(req('GET'))]) {
      expect(await res.json()).toMatchObject({ ok: true, submitted: 0 });
    }
    expect(state.pinged).toEqual([]);
  });
});
