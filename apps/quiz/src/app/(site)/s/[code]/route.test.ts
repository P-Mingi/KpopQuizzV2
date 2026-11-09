// O1 audit 03 P1-2: /s/{code} counts the click and answers one 302 to /q/{slug}, never through /api/, and 404 otherwise.
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  v12: false,
  link: null as Record<string, unknown> | null,
  slug: 'bts-quiz-abc' as string | null,
  writes: [] as string[],
}));

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => state.v12 }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from(table: string) {
      const q: Record<string, unknown> = {};
      let op = 'select';
      for (const m of ['select', 'eq', 'limit']) q[m] = () => q;
      q.insert = () => { op = 'insert'; state.writes.push(`insert:${table}`); return q; };
      q.update = () => { op = 'update'; state.writes.push(`update:${table}`); return q; };
      q.single = async () => {
        if (table === 'dev_share_links') return { data: state.link };
        if (table === 'quizzes') return { data: state.slug ? { slug: state.slug } : null };
        return { data: null };
      };
      q.then = (ok: (v: unknown) => unknown) => ok({ data: op === 'select' ? [] : null, error: null });
      return q;
    },
  }),
}));

import { GET } from './route';

const LINK = { id: 7, share_code: 'Ab12Cd34', quiz_id: 'quiz-1', user_id: 'creator', click_count: 3, unique_click_count: 2 };

function hit(code: string): Promise<Response> {
  return GET(new NextRequest(`https://kpopquiz.org/s/${code}`), { params: Promise.resolve({ code }) });
}

describe('GET /s/[code]', () => {
  beforeEach(() => {
    state.v12 = false;
    state.link = { ...LINK };
    state.slug = 'bts-quiz-abc';
    state.writes = [];
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kpopquiz.org';
  });

  it('counts the click and answers one 302 straight to the quiz, no /api/ hop', async () => {
    const res = await hit('Ab12Cd34');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/q/bts-quiz-abc');
    expect(res.headers.get('location')).not.toContain('/api/');
    expect(state.writes).toEqual(['insert:dev_share_clicks', 'update:dev_share_links']);
  });

  it('flag on: the same redirect keeps the first-party share cookie', async () => {
    state.v12 = true;
    const res = await hit('Ab12Cd34');
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/q/bts-quiz-abc');
    expect(res.headers.get('set-cookie') ?? '').toMatch(/^kq_sl=Ab12Cd34;/);
  });

  it('an unknown code is a 404 and writes nothing', async () => {
    state.link = null;
    const res = await hit('Zz99Zz99');
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
    expect(state.writes).toEqual([]);
  });

  it('a link whose quiz is gone is a 404, not a redirect home', async () => {
    state.slug = null;
    const res = await hit('Ab12Cd34');
    expect(res.status).toBe(404);
    expect(res.headers.get('location')).toBeNull();
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
