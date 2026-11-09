// O1 audit 03 (P0-1, P0-2, P0-3): the sitemap lists no /news, no derived trivia and no Verse teaser while the Verse is hidden.
import { afterEach, describe, expect, it, vi } from 'vitest';

const net = vi.hoisted(() => ({
  respond: (url: URL): unknown[] => {
    const table = url.pathname.split('/').pop();
    if (table === 'groups') return [{ id: 1, slug: 'twice' }, { id: 2, slug: 'bts' }];
    if (table === 'quizzes') {
      // 12 distinct facts worth of questions would make the OLD sitemap list twice-trivia; it must stay out now.
      const questions = Array.from({ length: 30 }, (_, i) => ({ question: `Q${i}`, options: ['a', 'b', 'c', 'd'], correct: 0, explanation: `Fact number ${i} about the group in one sentence.` }));
      return [{ id: 'q1', slug: 'twice-q', created_at: '2026-10-01T00:00:00Z', group_id: 1, questions, title: 'Twice', question_count: 30, play_count: 5, like_count: 1 }];
    }
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

vi.mock('@/lib/blind-test-playlists', async (orig) => ({
  ...(await orig<object>()),
  getAdvertisablePlaylists: async () => ({ groups: [{ slug: 'twice' }, { slug: 'bts' }] }),
}));

async function entries(): Promise<Array<{ url: string; lastModified?: string | Date }>> {
  vi.resetModules();
  delete process.env.VERSE_PUBLIC;
  const { default: sitemap } = await import('./sitemap');
  return sitemap() as Promise<Array<{ url: string; lastModified?: string | Date }>>;
}

async function urls(versePublic: boolean): Promise<string[]> {
  vi.resetModules();
  delete process.env.VERSE_PUBLIC;
  if (versePublic) process.env.VERSE_PUBLIC = 'true';
  const { default: sitemap } = await import('./sitemap');
  return (await sitemap()).map((e) => e.url.replace('https://kpopquiz.org', '') || '/');
}

afterEach(() => { delete process.env.VERSE_PUBLIC; vi.resetModules(); });

describe('app/sitemap.ts indexing gates', () => {
  it('P0-1: /news is not listed', async () => {
    expect(await urls(false)).not.toContain('/news');
  });

  it('P0-2: a -trivia URL is listed only for a group with a sourced fact file', async () => {
    const { getSourcedTrivia } = await import('@/lib/trivia/sourced/store');
    const listed = (await urls(false)).filter((u) => u.endsWith('-trivia'));
    for (const u of listed) expect(getSourcedTrivia(u.slice(1, -'-trivia'.length)), u).toBeTruthy();
    expect(listed).not.toContain('/twice-trivia');
    expect(listed).toContain('/bts-trivia');
  });

  it('P0-3: /verse is out while the Verse is hidden, /verse/promises stays; /verse returns when it is public', async () => {
    const hidden = await urls(false);
    expect(hidden).not.toContain('/verse');
    expect(hidden).toContain('/verse/promises');
    expect(await urls(true)).toContain('/verse');
  });

  it('P1-1: lists of the newest quizzes carry the newest quiz date, ranking pages carry none, the report keeps its own date', async () => {
    const all = await entries();
    const by = (path: string) => all.find((e) => e.url === `https://kpopquiz.org${path}`);
    for (const p of ['/new', '/quizzes', '']) expect(new Date(by(p)!.lastModified!).toISOString(), p).toBe('2026-10-01T00:00:00.000Z');
    for (const p of ['/trending', '/most-liked', '/quizzes/popular-today', '/quizzes/popular-this-week', '/quizzes/popular-this-month', '/blindtest', '/stats', '/groups', '/leaderboard', '/trivia']) {
      expect(by(p), p).toBeDefined();
      expect(by(p)!.lastModified, p).toBeUndefined();
    }
    expect(new Date(by('/data/knowledge-report-2026')!.lastModified!).toISOString().slice(0, 10)).toBe('2026-08-17');
  });

  it('P1-1: no blind test group page carries a lastmod, and no date is shared by more than 25 entries', async () => {
    const all = await entries();
    const bt = all.filter((x) => x.url.includes('/blindtest/group-'));
    expect(bt.length).toBe(2);
    for (const e of bt) expect(e.lastModified).toBeUndefined();
    const counts = new Map<string, number>();
    for (const e of all) if (e.lastModified) counts.set(new Date(e.lastModified).toISOString(), (counts.get(new Date(e.lastModified).toISOString()) ?? 0) + 1);
    // The evergreen static pages share STATIC_DATE (a stable date, not a fake one); the 104 shared newest-quiz dates are gone.
    for (const [d, n] of counts) expect(n, d).toBeLessThanOrEqual(25);
  });

  it('P1-5: today the six candidate lists are all listed; once decided they leave the sitemap', async () => {
    const candidates = ['/trending', '/new', '/most-liked', '/quizzes/popular-today', '/quizzes/popular-this-month', '/kpop-quiz-2026'];
    const before = await urls(false);
    for (const c of candidates) expect(before, c).toContain(c);

    vi.resetModules();
    vi.doMock('@/lib/seo/list-noindex', async (orig) => {
      const real = await orig<typeof import('@/lib/seo/list-noindex')>();
      const decided = ['/trending', '/quizzes/popular-today'];
      return { ...real, LIST_NOINDEX_DECIDED: decided, isListNoindex: (p: string) => decided.includes(p) };
    });
    try {
      const after = await urls(false);
      expect(after).not.toContain('/trending');
      expect(after).not.toContain('/quizzes/popular-today');
      expect(after).toContain('/new');
      expect(after).toContain('/quizzes/popular-this-week');
    } finally { vi.doUnmock('@/lib/seo/list-noindex'); }
  });
});
