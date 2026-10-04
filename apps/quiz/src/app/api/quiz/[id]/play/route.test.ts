import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// F6b (AU3-003, G8 request R2): a saved play that came through a creator's share
// link (cookie kq_sl) is recorded once in share_link_plays, only with the v12
// flag, fail soft, never changing the play. Every store is a fake: nothing leaves.

type Call = { table: string; op: string; arg?: unknown };
const state = vi.hoisted(() => ({
  v12: false,
  calls: [] as Array<{ table: string; op: string; arg?: unknown }>,
  link: null as Record<string, unknown> | null,
  linkThrows: false,
  upsertError: null as Record<string, unknown> | null,
  recordError: null as Record<string, unknown> | null,
}));

function fakeDb() {
  return {
    auth: { getUser: async () => ({ data: { user: null } }) },
    rpc: async (fn: string) => {
      state.calls.push({ table: `rpc:${fn}`, op: 'rpc' });
      return fn === 'record_play' && !state.recordError
        ? { data: [{ play_id: 'play-1', percentile: 64 }], error: null }
        : { data: null, error: state.recordError };
    },
    from(table: string) {
      const q: Record<string, unknown> = {};
      let op = 'select';
      for (const m of ['select', 'eq', 'gte', 'is', 'limit']) q[m] = () => q;
      q.update = (arg: unknown) => { op = 'update'; state.calls.push({ table, op, arg }); return q; };
      q.upsert = async (arg: unknown) => { state.calls.push({ table, op: 'upsert', arg }); return { error: state.upsertError, status: state.upsertError ? 500 : 201 }; };
      q.single = async () => ({ data: { difficulty: 'easy', creator_id: 'creator', play_count: 12, title: 'BTS quiz' } });
      q.maybeSingle = async () => {
        state.calls.push({ table, op: 'read' });
        if (state.linkThrows) throw new Error('network down');
        return { data: state.link, error: null };
      };
      q.then = (ok: (v: unknown) => unknown) => ok({ data: null, error: null, count: op === 'select' ? 10 : null });
      return q;
    },
  };
}

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => state.v12 }));
vi.mock('@/lib/supabase/server', () => ({ createServerClient: async () => fakeDb(), createServiceRoleClient: () => fakeDb() }));
vi.mock('@/lib/notifications', () => ({ notifyMilestone: async () => {} }));
vi.mock('@/lib/badges/award', () => ({ checkTierBadges: async () => {} }));
vi.mock('@/lib/quiz/time-stats', () => ({ timeSample: () => null, recordTimeSample: async () => {} }));

import { POST } from './route';

const ANON = '3f2b8c1e-5d4a-4b6c-9e7f-0a1b2c3d4e5f';
const LINK = { share_code: 'Ab12Cd34', quiz_id: 'quiz-1', user_id: 'creator' };

async function play(cookie?: string, quizId = 'quiz-1') {
  const req = new NextRequest(`https://kpopquiz.org/api/quiz/${quizId}/play`, {
    method: 'POST',
    body: JSON.stringify({ score: 7, total_questions: 10, time_taken_seconds: 80, anon_id: ANON }),
    headers: cookie ? { cookie } : {},
  });
  const cookieGet = vi.spyOn(req.cookies, 'get');
  const res = await POST(req, { params: Promise.resolve({ id: quizId }) });
  return { res, body: await res.json(), cookieReads: cookieGet.mock.calls.length };
}
const linkCalls = (): Call[] => state.calls.filter((c) => c.table === 'dev_share_links' || c.table === 'share_link_plays');

describe('POST /api/quiz/[id]/play share link plays (R2)', () => {
  let baseline: unknown;
  beforeEach(async () => {
    Object.assign(state, { v12: false, calls: [], link: { ...LINK }, linkThrows: false, upsertError: null, recordError: null });
    delete process.env.VERCEL_ENV;
    baseline = (await play()).body;
    state.calls = [];
  });

  it('flag off: the cookie is never read, no share query, the same response', async () => {
    const r = await play('kq_sl=Ab12Cd34');
    expect(r.res.status).toBe(200);
    expect(r.body).toEqual(baseline);
    expect(r.cookieReads).toBe(0);
    expect(linkCalls()).toEqual([]);
  });

  it('flag on, no cookie: no share query', async () => {
    state.v12 = true;
    const r = await play();
    expect(r.body).toEqual(baseline);
    expect(linkCalls()).toEqual([]);
  });

  it('flag on, cookie for this quiz: one row after the play is saved, the response unchanged', async () => {
    state.v12 = true;
    const r = await play('kq_sl=Ab12Cd34');
    expect(r.body).toEqual(baseline);
    const ups = state.calls.filter((c) => c.op === 'upsert');
    expect(ups).toHaveLength(1);
    expect(ups[0]?.table).toBe('share_link_plays');
    const row = ups[0]?.arg as Record<string, unknown>;
    expect(row).toMatchObject({ share_code: 'Ab12Cd34', quiz_id: 'quiz-1', is_test: true });
    expect(String(row.player_key)).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.stringify(row)).not.toContain(ANON);
    const order = state.calls.map((c) => c.table);
    expect(order.indexOf('rpc:record_play')).toBeLessThan(order.indexOf('share_link_plays'));
  });

  it('flag on, production: the row is not a test row', async () => {
    state.v12 = true;
    process.env.VERCEL_ENV = 'production';
    await play('kq_sl=Ab12Cd34');
    expect((state.calls.find((c) => c.op === 'upsert')?.arg as Record<string, unknown>).is_test).toBe(false);
  });

  it('flag on, the cookie names a link of another quiz: no row', async () => {
    state.v12 = true;
    state.link = { ...LINK, quiz_id: 'quiz-2' };
    const r = await play('kq_sl=Ab12Cd34');
    expect(r.body).toEqual(baseline);
    expect(state.calls.filter((c) => c.op === 'upsert')).toEqual([]);
  });

  it('flag on, the store fails or the table is missing: the play still answers 200, unchanged', async () => {
    state.v12 = true;
    state.linkThrows = true;
    expect((await play('kq_sl=Ab12Cd34')).body).toEqual(baseline);
    state.linkThrows = false;
    state.upsertError = { code: '42P01', message: 'relation "share_link_plays" does not exist' };
    const r = await play('kq_sl=Ab12Cd34');
    expect(r.res.status).toBe(200);
    expect(r.body).toEqual(baseline);
  });

  it('flag on, the play itself failed: nothing is recorded for the link', async () => {
    state.v12 = true;
    state.recordError = { message: 'boom' };
    const r = await play('kq_sl=Ab12Cd34');
    expect(r.res.status).toBe(500);
    expect(linkCalls()).toEqual([]);
  });
});
