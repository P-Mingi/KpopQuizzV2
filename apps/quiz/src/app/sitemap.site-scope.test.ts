// Run O1, lane O1: the kpop sitemap reads its site-scoped tables (quizzes, groups, songs, verse_essays) through forSite,
// so with SITE_SCOPE on no row of another site is listed, and with it off the requests are today's.
import { afterEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => {
  const sent: string[] = [];
  const record = async (input: unknown, init?: { method?: string }): Promise<Response> => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as { url: string }).url;
    const u = new URL(href);
    sent.push(decodeURIComponent(u.pathname + u.search));
    if (init?.method === 'HEAD') return new Response(null, { status: 200, headers: { 'content-range': '*/0' } });
    return new Response('[]', { status: 200, headers: { 'content-type': 'application/json', 'content-range': '*/0' } });
  };
  return { sent, record };
});

vi.mock('next/cache', () => ({ unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn }));
vi.mock('@/lib/supabase/server', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient('http://127.0.0.1:9', 'o1-fake-anon-key', {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: net.record as unknown as typeof fetch },
  });
  return { createPublicReadClient: () => client, createServiceRoleClient: () => client, createServerClient: async () => client };
});

const SCOPED = ['quizzes', 'groups', 'songs', 'verse_essays'];
const tableOf = (u: string): string => u.split('?')[0]!.split('/').pop()!;

async function requests(scope: boolean): Promise<string[]> {
  vi.resetModules();
  delete process.env.SITE_SCOPE;
  if (scope) process.env.SITE_SCOPE = '1';
  process.env.VERSE_PUBLIC = 'true'; // the Verse block of the sitemap (songs, essays) is read only when the Verse is public
  net.sent.length = 0;
  const { default: sitemap } = await import('./sitemap');
  await sitemap();
  return [...net.sent];
}

afterEach(() => { delete process.env.SITE_SCOPE; delete process.env.VERSE_PUBLIC; vi.resetModules(); });

describe('app/sitemap.ts', () => {
  it('with SITE_SCOPE on, every read of quizzes, groups, songs and verse_essays carries site_id=eq.kpop', async () => {
    const sent = await requests(true);
    const scoped = sent.filter((u) => SCOPED.includes(tableOf(u)));
    expect([...new Set(scoped.map(tableOf))].sort(), 'the four tables are read').toEqual([...SCOPED].sort());
    for (const u of scoped) expect(u, u.slice(0, 60)).toContain('site_id=eq.kpop');
  });

  it('with SITE_SCOPE off, no request names site_id (today\'s requests)', async () => {
    const sent = await requests(false);
    expect(sent.some((u) => SCOPED.includes(tableOf(u)))).toBe(true);
    expect(sent.filter((u) => u.includes('site_id'))).toEqual([]);
  });
});
