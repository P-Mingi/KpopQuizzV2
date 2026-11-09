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
});
