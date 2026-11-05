// Run O1, lot E1b: the cron /api/cron/editorial-publish. With EDITORIAL_QUIZ off the answer is the one it was before the quiz lane
// (no `quiz` key, the lane never called); with it on the same run also carries the quiz lane, and a failure of one lane never hides
// the other.
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  authorized: true, v12: true, live: true, regular: null as null | (() => unknown), lane: [] as number[],
}));
vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => state.v12 }));
vi.mock('@/lib/cron-auth', () => ({ isCronAuthorized: () => state.authorized }));
vi.mock('@/lib/admin/guard', () => ({ adminNotFound: () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 }), isListedAdminId: () => true }));
vi.mock('@/lib/editorial/store', () => ({ editorialLive: async () => state.live, supabaseStore: () => ({}) }));
vi.mock('@/lib/editorial/pipeline', () => ({ runPublisher: async () => { if (state.regular) return state.regular(); return { published: null, reason: 'nothing_due', skipped: [] }; } }));
vi.mock('@/lib/editorial/quiz/cron', () => ({
  publishQuizLane: async () => { state.lane.push(1); return { published: { id: 4, ref: 'quiz:x', slug: 'x' }, reason: 'ok', skipped: 0 }; },
}));

import { GET } from './route';

const call = (): Promise<Response> => GET(new NextRequest('http://localhost/api/cron/editorial-publish', { headers: { authorization: 'Bearer s' } })) as Promise<Response>;

beforeEach(() => { state.authorized = true; state.v12 = true; state.live = true; state.regular = null; state.lane = []; vi.spyOn(console, 'error').mockImplementation(() => undefined); });
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('with EDITORIAL_QUIZ off', () => {
  it('the answer is the regular publisher answer, with no quiz key, and the quiz lane is never called', async () => {
    state.regular = () => ({ published: { id: 9, ref: 'post:1', kind: 'thread', account_id: 'a' }, reason: 'ok', skipped: [{ id: 1, reason: 'not_due' }] });
    const r = await call();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ ok: true, published: { id: 9, ref: 'post:1', kind: 'thread', account_id: 'a' }, reason: 'ok', skipped: 1 });
    expect(state.lane).toHaveLength(0);
  });

  it('a failure of the regular publisher is the 500 it always was', async () => {
    state.regular = () => { throw new Error('db down'); };
    const r = await call();
    expect(r.status).toBe(500);
    expect(await r.json()).toEqual({ error: 'publish_failed' });
    expect(state.lane).toHaveLength(0);
  });

  it('the gates are the ones they were: flag v12, secret, editorial tables', async () => {
    state.v12 = false;
    expect((await call()).status).toBe(404);
    state.v12 = true;
    state.authorized = false;
    expect((await call()).status).toBe(404);
    state.authorized = true;
    state.live = false;
    expect(await (await call()).json()).toEqual({ ok: true, published: null, reason: 'not_live' });
    expect(state.lane).toHaveLength(0);
  });

  it.each(['0', 'false', '', 'on'])('EDITORIAL_QUIZ=%j is off', async (v) => {
    vi.stubEnv('EDITORIAL_QUIZ', v);
    await call();
    expect(state.lane).toHaveLength(0);
  });
});

describe('with EDITORIAL_QUIZ on', () => {
  beforeEach(() => { vi.stubEnv('EDITORIAL_QUIZ', '1'); });

  it('the same run also carries the quiz lane', async () => {
    const r = await call();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      ok: true, published: null, reason: 'nothing_due', skipped: 0, quiz: { published: { id: 4, ref: 'quiz:x', slug: 'x' }, reason: 'ok', skipped: 0 },
    });
    expect(state.lane).toHaveLength(1);
  });

  it('a failure of the regular publisher is still a 500, and the quiz lane still ran', async () => {
    state.regular = () => { throw new Error('db down'); };
    const r = await call();
    expect(r.status).toBe(500);
    expect(state.lane).toHaveLength(1);
  });

  it('the editorial tables missing: nothing runs, not even the quiz lane', async () => {
    state.live = false;
    expect(await (await call()).json()).toEqual({ ok: true, published: null, reason: 'not_live' });
    expect(state.lane).toHaveLength(0);
  });
});
