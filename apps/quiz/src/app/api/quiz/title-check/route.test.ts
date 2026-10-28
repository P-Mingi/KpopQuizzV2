import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// SEO phase 1, PR 12: the soft title advice. The database is a fake: no request leaves the test.

const state = vi.hoisted(() => ({
  exactTitles: new Set<string>(), // published titles, lowercased
  groups: {} as Record<string, { id: number; name: string; fandom_name: string | null }>,
  hub: {} as Record<number, Array<{ slug: string; title: string; play_count: number }>>,
  reads: [] as string[],
}));

vi.mock('@/lib/site/scope', () => ({
  // Every read must go through forSite: the fake scope marks the query with a site id.
  forSite: <Q extends { eq: (c: string, v: unknown) => Q }>(q: Q) => q.eq('site_id', 'site-under-test'),
}));

vi.mock('@/lib/ux-v1/p3/data', () => ({
  getHubQuizzes: async (groupId: number) => {
    state.reads.push(`hub:${groupId}`);
    return state.hub[groupId] ?? [];
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({
    from(table: string) {
      const where: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (col: string, v: unknown) => { where[col] = v; return q; },
        ilike: (col: string, v: unknown) => { where[`ilike:${col}`] = v; return q; },
        limit: async () => {
          state.reads.push(`${table}:${String(where.site_id)}`);
          const t = String(where['ilike:title']).toLowerCase();
          return { data: where.status === 'published' && state.exactTitles.has(t) ? [{ slug: 'x' }] : [], error: null };
        },
        maybeSingle: async () => {
          state.reads.push(`${table}:${String(where.site_id)}`);
          return { data: state.groups[String(where.slug)] ?? null, error: null };
        },
      };
      return q;
    },
  }),
}));

import { GET } from './route';

async function check(title: string, group?: string): Promise<unknown> {
  const url = new URL('https://kpopquiz.org/api/quiz/title-check');
  url.searchParams.set('title', title);
  if (group) url.searchParams.set('group', group);
  return (await GET(new NextRequest(url))).json();
}

beforeEach(() => {
  state.exactTitles = new Set(['bts true or false']);
  state.groups = { bts: { id: 7, name: 'BTS', fandom_name: 'ARMY' } };
  state.hub = { 7: [{ slug: 'bts-true-or-false', title: 'BTS True or False', play_count: 28 }, { slug: 'bts-wings-era', title: 'BTS Wings era quiz', play_count: 50 }] };
  state.reads = [];
});

describe('GET /api/quiz/title-check', () => {
  it('an exact title, with or without a group (the flag-off form sends none)', async () => {
    expect(await check('BTS TRUE or false')).toEqual({ exists: true, kind: 'exact' });
    expect(await check('BTS true or false', 'bts')).toEqual({ exists: true, kind: 'exact' });
  });

  it('a close title in the picked group', async () => {
    expect(await check('BTS true or false: harder edition', 'bts')).toEqual({ exists: true, kind: 'near' });
    expect(await check('BTS true or false: harder edition')).toEqual({ exists: false });
  });

  it("a title that is the group page's own", async () => {
    for (const t of ['BTS quiz', 'bts test', 'Quiz BTS']) expect(await check(t, 'bts')).toEqual({ exists: true, kind: 'hub' });
  });

  it('no advice for a distinct title, an unknown group or a short title', async () => {
    expect(await check('BTS Love Yourself era quiz', 'bts')).toEqual({ exists: false });
    expect(await check('BTS true or false: harder edition', 'nobody')).toEqual({ exists: false });
    expect(await check('BTS', 'bts')).toEqual({ exists: false });
  });

  it('every database read is scoped to the site', async () => {
    await check('BTS true or false: harder edition', 'bts');
    expect(state.reads).toEqual(['quizzes:site-under-test', 'groups:site-under-test', 'hub:7']);
  });
});
