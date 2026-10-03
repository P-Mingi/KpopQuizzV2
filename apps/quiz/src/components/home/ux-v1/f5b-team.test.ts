// V12 F5b: the home "From the community" rows. A thread or blog by an editorial
// account shows the Team badge after the author. Flag off: no team read and the rows
// (and their markup) of today.

import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const TEAM = '11111111-1111-4111-8111-111111111111';
const FAN = '22222222-2222-4222-8222-222222222222';
const log = vi.hoisted(() => [] as string[]);

vi.mock('next/cache', () => ({ unstable_cache: <T,>(fn: T) => fn, revalidateTag: () => undefined }));
vi.mock('next/image', () => ({ default: () => null }));
vi.mock('@/lib/verse/visibility', () => ({ verseHidden: () => false, spaceUnpublished: () => false }));
vi.mock('@/lib/verse/space-data', () => ({ getVerseDirectory: async () => [] }));
vi.mock('@/lib/verse/threads', () => ({
  listThreads: async () => [{ id: 1, groupId: 7, slug: 't', title: 'Best era?', createdBy: TEAM, createdAt: '2026-10-02T00:00:00Z', updatedAt: '2026-10-02T00:00:00Z', author: { displayName: 'Mina from KpopQuiz' }, replyCount: 4, lastActivityAt: '' }],
}));
vi.mock('@/lib/verse/essays', () => ({
  getEssayPage: async () => ({ id: 5, title: 'An essay', status: 'featured', authorId: FAN, author: { displayName: 'Jae', username: 'jae' }, readingMin: 6, createdAt: '2026-10-01T00:00:00Z' }),
}));

function chain(table: string): unknown {
  const rows: Record<string, unknown> = {
    editorial_accounts: [{ user_id: TEAM, display_name: 'Mina from KpopQuiz', beat: 'news', active: true }],
    daily_debates: null,
    verse_spaces: [{ group_id: 7 }],
    groups: [{ id: 7, slug: 'bts', name: 'BTS' }],
    verse_threads: { id: 1, group_id: 7, slug: 't', title: 'Best era?', created_at: '2026-10-02T00:00:00Z' },
    verse_essays: { id: 5, group_id: 7, featured_at: '2026-10-01T00:00:00Z' },
  };
  const result = (): unknown => ({ data: rows[table] ?? null, error: null, count: 0, status: 200 });
  const proxy: unknown = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown) => Promise.resolve(result()).then(res);
      return () => proxy;
    },
  });
  return proxy;
}
const client = { from: (t: string) => { log.push(t); return chain(t); } };
vi.mock('@/lib/supabase/server', () => ({ createPublicReadClient: () => client, createServiceRoleClient: () => client }));

async function flags(v12: boolean): Promise<void> {
  vi.resetModules();
  log.length = 0;
  vi.stubEnv('NEXT_PUBLIC_UX_V1', '1');
  vi.stubEnv('NEXT_PUBLIC_UX_V12', v12 ? '1' : '');
}
afterEach(() => { vi.unstubAllEnvs(); });

describe('home community rows', () => {
  it('flag off: no team read, no teamAuthor, plain sub line', async () => {
    await flags(false);
    const { getHomeCommunity } = await import('@/lib/ux-v1/p1/home-data');
    const { CommunityRows } = await import('./community-rows');
    const c = await getHomeCommunity(new Date('2026-10-03T00:00:00Z'));
    expect(log).not.toContain('editorial_accounts');
    expect(c.rows.map((r) => r.kind)).toEqual(['thread', 'blog']);
    expect(c.rows.every((r) => !('teamAuthor' in r))).toBe(true);
    const out = renderToStaticMarkup(h(CommunityRows, { rows: c.rows }));
    expect(out).toContain('Thread · Mina from KpopQuiz · 4 replies');
    expect(out).not.toContain('ux-teamtag');
  });

  it('flag on: the editorial thread author carries the Team badge, the fan blog does not', async () => {
    await flags(true);
    const { getHomeCommunity } = await import('@/lib/ux-v1/p1/home-data');
    const { CommunityRows } = await import('./community-rows');
    const c = await getHomeCommunity(new Date('2026-10-03T00:00:00Z'));
    expect(log).toContain('editorial_accounts');
    expect(c.rows.map((r) => r.teamAuthor ?? null)).toEqual(['Mina from KpopQuiz', null]);
    const out = renderToStaticMarkup(h(CommunityRows, { rows: c.rows }));
    expect(out).toMatch(/Thread · Mina from KpopQuiz <span class="ux-teamtag"[^>]*>Team<\/span> · 4 replies/);
    expect(out).toContain('Blog · Jae · 6 min read');
    expect(out.match(/ux-teamtag/g)).toHaveLength(1);
    expect(out).not.toMatch(/Lv \d/);
  });
});
