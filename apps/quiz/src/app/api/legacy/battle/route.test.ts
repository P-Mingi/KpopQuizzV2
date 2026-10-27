import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GONE_HTML } from '@/lib/seo/legacy-urls';

// SEO (owner, 2026-10-27): /battle?quiz=<slug or id> answers 301 to the published quiz, else
// 410, and 503 when a read fails. The database is a fake: no request leaves the test.

const ID = '30d97824-ce02-4d3b-8e91-cecfd66c62f5';

const state = vi.hoisted(() => ({
  byId: {} as Record<string, string>, // published quiz id -> slug
  bySlug: new Set<string>(), // slugs getQuizBySlug finds
  idError: false,
  slugThrows: false,
  reads: [] as string[],
}));

vi.mock('@/lib/db/queries/quizzes', () => ({
  getQuizBySlug: async (slug: string) => {
    state.reads.push(`slug:${slug}`);
    if (state.slugThrows) throw new Error('db down');
    return state.bySlug.has(slug) ? { slug } : null;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createPublicReadClient: () => ({
    from(table: string) {
      const where: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (col: string, v: unknown) => { where[col] = v; return q; },
        maybeSingle: async () => {
          state.reads.push(`${table}:id:${String(where.id)}:${String(where.status)}`);
          if (state.idError) return { data: null, error: { message: 'timeout' } };
          const slug = where.status === 'published' ? state.byId[String(where.id)] : undefined;
          return { data: slug ? { slug } : null, error: null };
        },
      };
      return q;
    },
  }),
}));

import { GET } from './route';

async function battle(quiz: string | null): Promise<Response> {
  const url = new URL('https://kpopquiz.org/api/legacy/battle');
  if (quiz !== null) url.searchParams.set('quiz', quiz);
  return GET(new NextRequest(url));
}

describe('GET /api/legacy/battle', () => {
  beforeEach(() => {
    state.byId = { [ID]: 'itzy-the-crazy-in-love-era' };
    state.bySlug = new Set(['itzy-the-crazy-in-love-era', 'illit-quiz']);
    state.idError = false;
    state.slugThrows = false;
    state.reads = [];
  });

  it('a published quiz id goes 301 to its quiz, read by id then by slug', async () => {
    const res = await battle(ID.toUpperCase());
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/q/itzy-the-crazy-in-love-era');
    expect(state.reads).toEqual([`quizzes:id:${ID}:published`, 'slug:itzy-the-crazy-in-love-era']);
  });

  it('a published quiz slug goes 301 to its quiz', async () => {
    const res = await battle('illit-quiz');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/q/illit-quiz');
  });

  it('410 for an id or a slug that is no published quiz', async () => {
    state.bySlug.delete('itzy-the-crazy-in-love-era'); // the id finds a slug /q/ would not serve
    for (const q of ['30d97824-ce02-4d3b-8e91-000000000000', ID, 'bts-quiz']) {
      const res = await battle(q);
      expect(res.status, q).toBe(410);
      expect(res.headers.get('x-robots-tag'), q).toBe('noindex');
      expect(await res.text(), q).toBe(GONE_HTML);
    }
  });

  it('410 without a read for an empty, missing or malformed value', async () => {
    for (const q of [null, '', '../admin', 'Illit-Quiz']) {
      expect((await battle(q)).status, String(q)).toBe(410);
    }
    expect(state.reads).toEqual([]);
  });

  it('503 when a read fails, by id or by slug', async () => {
    state.idError = true;
    expect((await battle(ID)).status).toBe(503);
    state.idError = false;
    state.slugThrows = true;
    expect((await battle(ID)).status).toBe(503);
    expect((await battle('illit-quiz')).status).toBe(503);
  });
});
