// O1 audit 03 P2-1: /sitemaps/<segment>.xml serves a slice of the whole sitemap; the slices together are the whole sitemap.
import { afterEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => ({
  respond: (url: URL): unknown[] => {
    const table = url.pathname.split('/').pop();
    if (table === 'groups') return [{ id: 1, slug: 'twice' }, { id: 2, slug: 'bts' }];
    if (table === 'quizzes') return [
      { id: 'q1', slug: 'twice-q', created_at: '2026-10-01T00:00:00Z', group_id: 1, questions: [], title: 'Twice', question_count: 3, play_count: 5, like_count: 1 },
      { id: 'q2', slug: 'bts-q', created_at: '2026-10-02T00:00:00Z', group_id: 2, questions: [], title: 'BTS', question_count: 3, play_count: 9, like_count: 1 },
    ];
    return [];
  },
}));

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const record = async (input: unknown, init?: { method?: string }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url: string }).url;
    const rows = net.respond(new URL(href));
    const range = `0-${Math.max(rows.length - 1, 0)}/${rows.length}`;
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': range } });
    return new Response(JSON.stringify(rows), { status: 200, headers: { 'content-type': 'application/json', 'content-range': range } });
  };
  const client = createClient('http://127.0.0.1:9', 'o1-fake-anon-key', { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch: record as unknown as typeof fetch } });
  return { createPublicReadClient: () => client, createServiceRoleClient: () => client, createServerClient: async () => client };
});

afterEach(() => { vi.resetModules(); });

const locs = (xml: string): string[] => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));

async function get(segment: string): Promise<Response> {
  const { GET } = await import('./route');
  return GET(new Request(`https://kpopquiz.org/sitemaps/${segment}`), { params: Promise.resolve({ segment }) });
}

describe('GET /sitemaps/[segment]', () => {
  it('the segments together are exactly /sitemap.xml: same URLs, none twice, none missing', async () => {
    const { default: sitemap } = await import('@/app/sitemap');
    const { SITEMAP_SEGMENTS } = await import('@/lib/seo/sitemap-segments');
    const whole = (await sitemap()).map((e) => e.url).sort();
    const parts: string[] = [];
    for (const s of SITEMAP_SEGMENTS) {
      const res = await get(`${s}.xml`);
      expect(res.status, s).toBe(200);
      expect(res.headers.get('content-type')).toContain('application/xml');
      parts.push(...locs(await res.text()));
    }
    expect(parts.sort()).toEqual(whole);
    expect(new Set(parts).size).toBe(parts.length);
  });

  it('the quizzes segment holds the /q/ URLs and nothing else', async () => {
    const urls = locs(await (await get('quizzes.xml')).text());
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u).toContain('https://kpopquiz.org/q/');
  });

  it('an unknown segment, or a name without .xml, is a 404', async () => {
    expect((await get('everything.xml')).status).toBe(404);
    expect((await get('quizzes')).status).toBe(404);
    expect((await get('..%2Fsitemap.xml')).status).toBe(404);
  });
});
