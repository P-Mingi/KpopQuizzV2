import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// F6b (AU3-003, G8 request R1): the click redirect remembers the creator's share
// code in a first-party cookie, only with the v12 flag. Flag off the response is
// today's. The database is a fake: no request leaves the test.

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

async function click(code: string): Promise<Response> {
  const req = new NextRequest(`https://kpopquiz.org/api/share/click/${code}`);
  return GET(req, { params: Promise.resolve({ code }) });
}

describe('GET /api/share/click/[code] share cookie (R1)', () => {
  beforeEach(() => {
    state.v12 = false;
    state.link = { ...LINK };
    state.slug = 'bts-quiz-abc';
    state.writes = [];
    process.env.NEXT_PUBLIC_SITE_URL = 'https://kpopquiz.org';
  });

  it('flag off: redirect to the quiz, no cookie, the same writes as today', async () => {
    const res = await click('Ab12Cd34');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/q/bts-quiz-abc');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(state.writes).toEqual(['insert:dev_share_clicks', 'update:dev_share_links']);
  });

  it('flag on: the same redirect plus an httpOnly first-party cookie with the code for a day', async () => {
    state.v12 = true;
    const res = await click('Ab12Cd34');
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/q/bts-quiz-abc');
    const c = res.headers.get('set-cookie') ?? '';
    expect(c).toMatch(/^kq_sl=Ab12Cd34;/);
    expect(c).toMatch(/Max-Age=86400/);
    expect(c).toMatch(/Path=\//);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/Secure/i);
    expect(c).toMatch(/SameSite=lax/i);
    expect(state.writes).toEqual(['insert:dev_share_clicks', 'update:dev_share_links']);
  });

  it('flag on, unknown code: redirect home, no cookie, no write', async () => {
    state.v12 = true;
    state.link = null;
    const res = await click('Zz99Zz99');
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(state.writes).toEqual([]);
  });

  it('flag on, the quiz is gone: redirect home, no cookie', async () => {
    state.v12 = true;
    state.slug = null;
    const res = await click('Ab12Cd34');
    expect(res.headers.get('location')).toBe('https://kpopquiz.org/');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('flag on, a code that is not a share code shape is never stored in the cookie', async () => {
    state.v12 = true;
    state.link = { ...LINK, share_code: 'a;b' };
    const res = await click('a;b');
    expect(res.headers.get('set-cookie')).toBeNull();
  });
});
