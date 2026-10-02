import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIVE_TOKEN_HEADER } from './constants';
import { fakeGenerated, fakeLive } from './fake';
import { LiveNotLiveError } from './store';
import { isLiveNotLive, supabaseStore } from './supabase-store';

import type { FakeLive } from './fake';
import type { LiveHostState, LivePlayerState } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

// The route handlers themselves (app/api/live/**, app/api/cron/live-expire), called
// with real NextRequest objects. The store is the memory one: no check of this
// run may write to the production database. What is tested here is what the
// handlers add to the service: the v12 flag, the token header, the body limits,
// the cron secret, the status codes on the wire, no caching.

const flags = vi.hoisted(() => ({ v12: true }));
const current = vi.hoisted(() => ({ fake: null as unknown }));

vi.mock('@/lib/ux-v12', () => ({ isUxV12: () => flags.v12 }));
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => { throw new Error('the tests never build a database client'); },
}));
vi.mock('./server', async (original) => {
  const actual = await original<typeof import('./server')>();
  return { ...actual, liveDeps: () => (current.fake as FakeLive).deps };
});

const { GET: statusGET } = await import('@/app/api/live/route');
const { POST: roomsPOST } = await import('@/app/api/live/rooms/route');
const { GET: peekGET } = await import('@/app/api/live/rooms/[code]/route');
const { GET: stateGET } = await import('@/app/api/live/rooms/[code]/state/route');
const { POST: joinPOST } = await import('@/app/api/live/rooms/[code]/join/route');
const { POST: answerPOST } = await import('@/app/api/live/rooms/[code]/answer/route');
const { POST: hostPOST } = await import('@/app/api/live/rooms/[code]/host/route');
const { GET: cronGET } = await import('@/app/api/cron/live-expire/route');

const ORIGIN = 'http://localhost:3064';
const ctx = (code: string): { params: Promise<{ code: string }> } => ({ params: Promise.resolve({ code }) });

function req(path: string, init: { method?: string; body?: unknown; raw?: string; token?: string; headers?: Record<string, string> } = {}): NextRequest {
  const headers: Record<string, string> = { 'x-forwarded-for': '203.0.113.7', ...init.headers };
  if (init.token) headers[LIVE_TOKEN_HEADER] = init.token;
  const hasBody = init.body !== undefined || init.raw !== undefined;
  if (hasBody) headers['content-type'] = 'application/json';
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? (hasBody ? 'POST' : 'GET'),
    headers,
    ...(hasBody ? { body: init.raw ?? JSON.stringify(init.body) } : {}),
  });
}

const settings = (over: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ playlist: 'all', label: 'All K-pop', rounds: 5, seconds: 15, questions: fakeGenerated(5), ...over });

async function json<T>(res: Response): Promise<T> {
  return await res.json() as T;
}

let f: FakeLive;
beforeEach(() => {
  flags.v12 = true;
  f = fakeLive();
  current.fake = f;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

async function openRoom(): Promise<{ code: string; host: string }> {
  const res = await roomsPOST(req('/api/live/rooms', { body: settings() }));
  expect(res.status).toBe(201);
  const b = await json<{ code: string; host_token: string }>(res);
  return { code: b.code, host: b.host_token };
}

async function joinAs(code: string, nickname: string): Promise<{ token: string; id: string }> {
  const res = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname, colour: 1 } }), ctx(code));
  expect(res.status).toBe(201);
  const b = await json<{ token: string; state: LivePlayerState }>(res);
  return { token: b.token, id: b.state.you.id };
}

describe('flag off: no live route exists', () => {
  it('every route answers 404 and touches nothing', async () => {
    const { code, host } = await openRoom();
    flags.v12 = false;
    const before = JSON.stringify([...f.store.rooms.values()]);
    const calls = [
      await statusGET(),
      await roomsPOST(req('/api/live/rooms', { body: settings() })),
      await peekGET(req(`/api/live/rooms/${code}`), ctx(code)),
      await stateGET(req(`/api/live/rooms/${code}/state`, { token: host }), ctx(code)),
      await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: 'mingi' } }), ctx(code)),
      await answerPOST(req(`/api/live/rooms/${code}/answer`, { body: { choice: 0 }, token: host }), ctx(code)),
      await hostPOST(req(`/api/live/rooms/${code}/host`, { body: { action: 'close' }, token: host }), ctx(code)),
    ];
    for (const res of calls) {
      expect(res.status).toBe(404);
      expect(await json(res)).toEqual({ error: 'not_found' });
    }
    expect(JSON.stringify([...f.store.rooms.values()])).toBe(before);
    expect(f.store.players.size).toBe(0);
  });

  it('the cron does nothing with the flag off, and still needs its secret', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    flags.v12 = false;
    const spy = vi.spyOn(f.store, 'expireRooms');
    const noAuth = await cronGET(req('/api/cron/live-expire'));
    expect(noAuth.status).toBe(401);
    const res = await cronGET(req('/api/cron/live-expire', { headers: { authorization: 'Bearer test-cron-secret' } }));
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true, skipped: 'ux_v12_off' });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('GET /api/live', () => {
  it('200 when the tables are there, 503 not_live before the SQL is applied', async () => {
    const open = await statusGET();
    expect(open.status).toBe(200);
    expect(await json(open)).toEqual({ ok: true, max: 50 });
    expect(open.headers.get('cache-control')).toBe('no-store');
    f.store.ping = async () => { throw new LiveNotLiveError(); };
    const closed = await statusGET();
    expect(closed.status).toBe(503);
    expect(await json(closed)).toEqual({ error: 'not_live' });
  });
});

describe('POST /api/live/rooms', () => {
  it('201 with the code, the host token and the host view; never cached', async () => {
    const res = await roomsPOST(req('/api/live/rooms', { body: settings() }));
    expect(res.status).toBe(201);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const b = await json<{ code: string; host_token: string; state: LiveHostState }>(res);
    expect(b.code).toMatch(/^[A-Z2-9]{6}$/);
    expect(b.state.status).toBe('lobby');
    // The address is stored hashed, never raw.
    const room = [...f.store.rooms.values()][0]!;
    expect(room.ip_hash).toMatch(/^[0-9a-f]{16}$/);
    expect(JSON.stringify(room)).not.toContain('203.0.113.7');
  });

  it('400 on a body that is not JSON, not an object of settings, or too large', async () => {
    expect((await roomsPOST(req('/api/live/rooms', { raw: '{not json' }))).status).toBe(400);
    expect((await roomsPOST(req('/api/live/rooms', { raw: '[]' }))).status).toBe(400);
    expect((await roomsPOST(req('/api/live/rooms', { raw: '' , method: 'POST' }))).status).toBe(400);
    const huge = await roomsPOST(req('/api/live/rooms', { body: settings({ pad: 'x'.repeat(70_000) }) }));
    expect(huge.status).toBe(400);
    expect(f.store.rooms.size).toBe(0);
  });

  it('429 after ten rooms from one address', async () => {
    for (let i = 0; i < 10; i++) expect((await roomsPOST(req('/api/live/rooms', { body: settings() }))).status).toBe(201);
    const res = await roomsPOST(req('/api/live/rooms', { body: settings() }));
    expect(res.status).toBe(429);
    expect(await json(res)).toEqual({ error: 'rate_limited' });
    const other = await roomsPOST(req('/api/live/rooms', { body: settings(), headers: { 'x-forwarded-for': '198.51.100.9' } }));
    expect(other.status).toBe(201);
  });

  it('503 not_live before the SQL is applied', async () => {
    f.store.ping = async () => { throw new LiveNotLiveError(); };
    const res = await roomsPOST(req('/api/live/rooms', { body: settings() }));
    expect(res.status).toBe(503);
    expect(await json(res)).toEqual({ error: 'not_live' });
  });
});

describe('GET /api/live/rooms/<code>', () => {
  it('says what a phone may know before it joins, and nothing else', async () => {
    const { code } = await openRoom();
    await joinAs(code, 'mingi');
    const res = await peekGET(req(`/api/live/rooms/${code}`), ctx(code));
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ code, status: 'lobby', label: 'All K-pop', players: 1, max: 50 });
    expect((await peekGET(req('/api/live/rooms/ZZZZZZ'), ctx('ZZZZZZ'))).status).toBe(404);
    expect((await peekGET(req('/api/live/rooms/nope'), ctx('nope'))).status).toBe(400);
  });
});

describe('POST /api/live/rooms/<code>/join', () => {
  it('201 with a player token; nickname errors are 400; a full room is 409', async () => {
    const { code } = await openRoom();
    const ok = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: 'mingi', colour: 3 } }), ctx(code));
    expect(ok.status).toBe(201);
    const b = await json<{ token: string; state: LivePlayerState }>(ok);
    expect(b.token.length).toBeGreaterThanOrEqual(40);
    expect(b.state.you).toMatchObject({ name: 'mingi', colour: 3 });

    const empty = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: '  ' } }), ctx(code));
    expect(empty.status).toBe(400);
    expect(await json(empty)).toEqual({ error: 'nickname_empty' });
    const long = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: 'x'.repeat(17) } }), ctx(code));
    expect(await json(long)).toEqual({ error: 'nickname_too_long' });
    const big = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: 'x', pad: 'y'.repeat(3000) } }), ctx(code));
    expect(big.status).toBe(400);
    expect((await joinPOST(req(`/api/live/rooms/${code}/join`, { raw: 'nope' }), ctx(code))).status).toBe(400);

    for (let i = 0; i < 49; i++) await joinAs(code, `fan${i}`);
    const full = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: 'one more' } }), ctx(code));
    expect(full.status).toBe(409);
    expect(await json(full)).toEqual({ error: 'full' });
  });

  it('a blocked nickname is 400 nickname_blocked', async () => {
    f = fakeLive({ terms: ['badword'] });
    current.fake = f;
    const { code } = await openRoom();
    const res = await joinPOST(req(`/api/live/rooms/${code}/join`, { body: { nickname: 'BadWord' } }), ctx(code));
    expect(res.status).toBe(400);
    expect(await json(res)).toEqual({ error: 'nickname_blocked' });
  });

  it('404 for an unknown room, 400 for a code that cannot exist', async () => {
    expect((await joinPOST(req('/api/live/rooms/ZZZZZZ/join', { body: { nickname: 'a' } }), ctx('ZZZZZZ'))).status).toBe(404);
    expect((await joinPOST(req('/api/live/rooms/abc/join', { body: { nickname: 'a' } }), ctx('abc'))).status).toBe(400);
  });
});

describe('GET /api/live/rooms/<code>/state', () => {
  it('reads the token from x-live-token: host view, phone view, 401, 403 removed, 404 gone', async () => {
    const { code, host } = await openRoom();
    const p = await joinAs(code, 'mingi');

    const asHost = await stateGET(req(`/api/live/rooms/${code}/state`, { token: host }), ctx(code));
    expect(asHost.status).toBe(200);
    expect(asHost.headers.get('cache-control')).toBe('no-store');
    expect(await json<LiveHostState>(asHost)).toHaveProperty('host');

    const asPhone = await stateGET(req(`/api/live/rooms/${code}/state`, { token: p.token }), ctx(code));
    const phone = await json<LivePlayerState & { host?: unknown }>(asPhone);
    expect(phone.you.id).toBe(p.id);
    expect(phone.host).toBeUndefined();

    expect((await stateGET(req(`/api/live/rooms/${code}/state`), ctx(code))).status).toBe(401);
    // A token in the query string or in a cookie is not read.
    expect((await stateGET(req(`/api/live/rooms/${code}/state?token=${host}`, { headers: { cookie: `x-live-token=${host}` } }), ctx(code))).status).toBe(401);

    await hostPOST(req(`/api/live/rooms/${code}/host`, { body: { action: 'remove', player_id: p.id }, token: host }), ctx(code));
    const removed = await stateGET(req(`/api/live/rooms/${code}/state`, { token: p.token }), ctx(code));
    expect(removed.status).toBe(403);
    expect(await json(removed)).toEqual({ error: 'removed' });

    f.clock.advance(2 * 60 * 60 * 1000);
    const gone = await stateGET(req(`/api/live/rooms/${code}/state`, { token: host }), ctx(code));
    expect(gone.status).toBe(404);
    expect(await json(gone)).toEqual({ error: 'gone' });
  });
});

describe('POST /api/live/rooms/<code>/answer', () => {
  it('auth, the one answer rule, late answers, bad bodies', async () => {
    const { code, host } = await openRoom();
    const p = await joinAs(code, 'mingi');
    const q = await joinAs(code, 'other');
    const answer = (token: string | undefined, body: unknown): Promise<Response> =>
      answerPOST(req(`/api/live/rooms/${code}/answer`, { body, ...(token ? { token } : {}) }), ctx(code));

    // No round yet.
    const early = await answer(p.token, { choice: 0 });
    expect(early.status).toBe(409);
    expect(await json(early)).toEqual({ error: 'not_open' });

    await hostPOST(req(`/api/live/rooms/${code}/host`, { body: { action: 'start', round: 1 }, token: host }), ctx(code));
    f.clock.advance(2500);

    expect((await answer(undefined, { choice: 0 })).status).toBe(401);
    expect((await answer(host, { choice: 0 })).status).toBe(401);
    expect((await answer('x'.repeat(43), { choice: 0 })).status).toBe(401);
    expect((await answer(p.token, { choice: 9 })).status).toBe(400);
    expect((await answer(p.token, {})).status).toBe(400);
    expect((await answerPOST(req(`/api/live/rooms/${code}/answer`, { raw: 'x', token: p.token }), ctx(code))).status).toBe(400);
    expect((await answer(p.token, { choice: 0, pad: 'x'.repeat(600) })).status).toBe(400);

    const ok = await answer(p.token, { choice: 0, ms: 1 });
    expect(ok.status).toBe(200);
    expect(await json(ok)).toEqual({ ok: true, ms: 2500, round: 1 });

    const dup = await answer(p.token, { choice: 1 });
    expect(dup.status).toBe(409);
    expect(await json(dup)).toEqual({ error: 'duplicate' });

    f.clock.advance(12_501);
    const late = await answer(q.token, { choice: 0 });
    expect(late.status).toBe(409);
    expect(await json(late)).toEqual({ error: 'late' });
    expect(f.store.answers).toHaveLength(1);

    // A removed player.
    await hostPOST(req(`/api/live/rooms/${code}/host`, { body: { action: 'remove', player_id: q.id }, token: host }), ctx(code));
    const removed = await answer(q.token, { choice: 0 });
    expect(removed.status).toBe(403);
    expect(await json(removed)).toEqual({ error: 'removed' });
  });
});

describe('POST /api/live/rooms/<code>/host', () => {
  it('needs the host token; plays a round through the handlers; broadcasts to the room topic', async () => {
    const { code, host } = await openRoom();
    const p = await joinAs(code, 'mingi');
    const act = (token: string | undefined, body: unknown): Promise<Response> =>
      hostPOST(req(`/api/live/rooms/${code}/host`, { body, ...(token ? { token } : {}) }), ctx(code));

    expect((await act(undefined, { action: 'start', round: 1 })).status).toBe(401);
    const asPlayer = await act(p.token, { action: 'start', round: 1 });
    expect(asPlayer.status).toBe(403);
    expect(await json(asPlayer)).toEqual({ error: 'forbidden' });
    expect((await act(host, { action: 'nope' })).status).toBe(400);
    expect((await hostPOST(req(`/api/live/rooms/${code}/host`, { raw: '{', token: host }), ctx(code))).status).toBe(400);
    expect((await act(host, { action: 'board' })).status).toBe(409);

    const started = await act(host, { action: 'start', round: 1 });
    expect(started.status).toBe(200);
    const s = (await json<{ state: LiveHostState }>(started)).state;
    expect(s).toMatchObject({ status: 'round', round: 1 });
    expect(f.sent).toHaveLength(1);
    expect(f.sent[0]!.topic).toBe(s.topic);

    f.clock.advance(1000);
    await answerPOST(req(`/api/live/rooms/${code}/answer`, { body: { choice: 0 }, token: p.token }), ctx(code));
    const revealed = (await json<{ state: LiveHostState }>(await act(host, { action: 'reveal', round: 1 }))).state;
    expect(revealed.reveal).toMatchObject({ correct: 0, counts: [1, 0, 0, 0] });
    expect(revealed.players[0]).toMatchObject({ score: 970, gain: 970, result: 'ok' });
    expect((await json<{ state: LiveHostState }>(await act(host, { action: 'board' }))).state.status).toBe('board');

    const closed = await act(host, { action: 'close' });
    expect(await json(closed)).toEqual({ closed: true });
    expect((await act(host, { action: 'start', round: 2 })).status).toBe(404);
  });
});

describe('GET /api/cron/live-expire', () => {
  it('401 without the cron secret or with no secret configured; runs the expiry with it', async () => {
    const { code } = await openRoom();
    await joinAs(code, 'mingi');
    f.clock.advance(2 * 60 * 60 * 1000);

    // No CRON_SECRET in the environment: nobody is authorized.
    vi.stubEnv('CRON_SECRET', '');
    expect((await cronGET(req('/api/cron/live-expire', { headers: { authorization: 'Bearer ' } }))).status).toBe(401);
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    expect((await cronGET(req('/api/cron/live-expire'))).status).toBe(401);
    expect((await cronGET(req('/api/cron/live-expire', { headers: { authorization: 'Bearer wrong' } }))).status).toBe(401);
    expect((await cronGET(req('/api/cron/live-expire', { headers: { 'x-vercel-cron': '1' } }))).status).toBe(401);
    expect(f.store.rooms.size).toBe(1);

    const res = await cronGET(req('/api/cron/live-expire', { headers: { authorization: 'Bearer test-cron-secret' } }));
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true, closed: 0, deleted: 1 });
    expect(f.store.rooms.size).toBe(0);
    expect(f.store.players.size).toBe(0);
  });

  it('503 not_live before the SQL is applied', async () => {
    vi.stubEnv('CRON_SECRET', 'test-cron-secret');
    f.store.expireRooms = async () => { throw new LiveNotLiveError(); };
    const res = await cronGET(req('/api/cron/live-expire', { headers: { authorization: 'Bearer test-cron-secret' } }));
    expect(res.status).toBe(503);
    expect(await json(res)).toEqual({ error: 'not_live' });
  });
});

// ---------------------------------------------------------------------------
// The production store against a recorded client: the function names, the
// arguments and the "not applied yet" errors. No network.
// ---------------------------------------------------------------------------

describe('supabaseStore', () => {
  type Reply = { data: unknown; error: { code?: string; message?: string } | null; count?: number | null };

  function recorded(replies: Record<string, Reply>): { db: SupabaseClient; calls: Array<{ fn: string; args: unknown }> } {
    const calls: Array<{ fn: string; args: unknown }> = [];
    const table = (name: string): unknown => {
      const chain: Record<string, unknown> = {};
      const reply = replies[`table:${name}`] ?? { data: null, error: null, count: 0 };
      for (const m of ['select', 'eq', 'gte', 'limit']) {
        chain[m] = (...args: unknown[]) => { calls.push({ fn: `${name}.${m}`, args }); return chain; };
      }
      chain.then = (resolve: (v: Reply) => unknown) => resolve(reply);
      return chain;
    };
    const db = {
      rpc: async (fn: string, args: unknown) => { calls.push({ fn, args }); return replies[fn] ?? { data: null, error: null }; },
      from: (name: string) => table(name),
    };
    return { db: db as unknown as SupabaseClient, calls };
  }

  it('calls the functions of the pending migration with their parameter names', async () => {
    const { db, calls } = recorded({
      live_create_room: { data: 'room-id', error: null },
      live_join: { data: { status: 'ok', player: { id: 'p1', nickname: 'mingi' } }, error: null },
      live_submit_answer: { data: { status: 'ok', ms: 1234, round: 2 }, error: null },
      live_start_round: { data: true, error: null },
      live_close_round: { data: false, error: null },
      live_apply_scores: { data: true, error: null },
      live_expire_rooms: { data: { closed: 2, deleted: 3 }, error: null },
      'table:live_rooms': { data: null, error: null, count: 4 },
    });
    const store = supabaseStore(db);
    const s = { playlist: 'all', label: 'All K-pop', rounds: 5, seconds: 15, questions: [] };

    expect(await store.createRoom({ code: 'ABCDEF', host_token_hash: 'h', ...s, is_test: true, ip_hash: 'ip' })).toEqual({ id: 'room-id' });
    expect(await store.join('room-id', 'th', 'mingi', 2, 50)).toMatchObject({ status: 'ok', player: { id: 'p1' } });
    expect(await store.submitAnswer('ABCDEF', 'th', 3)).toEqual({ status: 'ok', ms: 1234, round: 2 });
    expect(await store.startRound('room-id', 1, 1)).toBe(true);
    expect(await store.closeRound('room-id', 1, 1)).toBe(false);
    expect(await store.applyScores('room-id', 1, 1, [])).toBe(true);
    expect(await store.expireRooms()).toEqual({ closed: 2, deleted: 3 });
    expect(await store.recentRooms('ip', 600_000)).toBe(4);
    await store.getRoom('ABCDEF');
    await store.moveStatus('room-id', 'reveal', 'board');
    await store.updateSettings('room-id', s);
    await store.resetGame('room-id', s);
    await store.removePlayer('room-id', 'p1');
    await store.closeRoom('room-id');

    const rpc = Object.fromEntries(calls.filter((c) => c.fn.startsWith('live_')).map((c) => [c.fn, c.args]));
    expect(rpc.live_create_room).toEqual({
      p_code: 'ABCDEF', p_host_token_hash: 'h', p_playlist: 'all', p_label: 'All K-pop', p_rounds: 5, p_seconds: 15,
      p_questions: [], p_is_test: true, p_ip_hash: 'ip',
    });
    expect(rpc.live_room_state).toEqual({ p_code: 'ABCDEF' });
    expect(rpc.live_join).toEqual({ p_room: 'room-id', p_token_hash: 'th', p_nickname: 'mingi', p_colour: 2, p_max: 50 });
    expect(rpc.live_start_round).toEqual({ p_room: 'room-id', p_game: 1, p_round: 1 });
    expect(rpc.live_submit_answer).toEqual({ p_code: 'ABCDEF', p_token_hash: 'th', p_choice: 3 });
    expect(rpc.live_close_round).toEqual({ p_room: 'room-id', p_game: 1, p_round: 1 });
    expect(rpc.live_apply_scores).toEqual({ p_room: 'room-id', p_game: 1, p_round: 1, p_rows: [] });
    expect(rpc.live_move_status).toEqual({ p_room: 'room-id', p_from: 'reveal', p_to: 'board' });
    expect(rpc.live_update_settings).toEqual({ p_room: 'room-id', p_playlist: 'all', p_label: 'All K-pop', p_rounds: 5, p_seconds: 15, p_questions: [] });
    expect(rpc.live_reset_game).toEqual(rpc.live_update_settings);
    expect(rpc.live_remove_player).toEqual({ p_room: 'room-id', p_player: 'p1' });
    expect(rpc.live_close_room).toEqual({ p_room: 'room-id' });
    expect(rpc.live_expire_rooms).toEqual({});
  });

  it('a taken code and the refusals of join and answer', async () => {
    const { db } = recorded({
      live_create_room: { data: null, error: null },
      live_join: { data: { status: 'full' }, error: null },
      live_submit_answer: { data: { status: 'late' }, error: null },
    });
    const store = supabaseStore(db);
    expect(await store.createRoom({ code: 'ABCDEF', host_token_hash: 'h', playlist: 'all', label: 'x', rounds: 5, seconds: 15, questions: [], is_test: true, ip_hash: '' })).toBeNull();
    expect(await store.join('r', 't', 'n', 0, 50)).toEqual({ status: 'full' });
    expect(await store.submitAnswer('ABCDEF', 't', 0)).toEqual({ status: 'late' });
    const odd = supabaseStore(recorded({ live_submit_answer: { data: { status: 'something new' }, error: null }, live_join: { data: { status: 'gone' }, error: null } }).db);
    expect(await odd.submitAnswer('ABCDEF', 't', 0)).toEqual({ status: 'gone' });
    expect(await odd.join('r', 't', 'n', 0, 50)).toEqual({ status: 'gone' });
  });

  it('a missing table or function is "not live"', async () => {
    for (const error of [
      { code: '42P01', message: 'relation "public.live_rooms" does not exist' },
      { code: 'PGRST205', message: "Could not find the table 'public.live_rooms' in the schema cache" },
      { code: 'PGRST202', message: 'Could not find the function public.live_room_state(p_code) in the schema cache' },
      { code: '42883', message: 'function public.live_join(uuid) does not exist' },
    ]) {
      expect(isLiveNotLive(error)).toBe(true);
      const store = supabaseStore(recorded({ live_room_state: { data: null, error }, 'table:live_rooms': { data: null, error, count: null } }).db);
      await expect(store.getRoom('ABCDEF')).rejects.toBeInstanceOf(LiveNotLiveError);
      await expect(store.ping()).rejects.toBeInstanceOf(LiveNotLiveError);
      await expect(store.recentRooms('ip', 1)).rejects.toBeInstanceOf(LiveNotLiveError);
    }
    expect(isLiveNotLive(null)).toBe(false);
    expect(isLiveNotLive({ code: '23505', message: 'duplicate key value' })).toBe(false);
  });

  it('any other database error is thrown with its code and without its message', async () => {
    const store = supabaseStore(recorded({ live_room_state: { data: null, error: { code: '23514', message: 'row for "secret value" violates check' } } }).db);
    await expect(store.getRoom('ABCDEF')).rejects.toThrow('live store: live_room_state failed (23514)');
    await expect(store.getRoom('ABCDEF')).rejects.not.toThrow(/secret value/);
  });
});

// ---------------------------------------------------------------------------
// Server helpers.
// ---------------------------------------------------------------------------

describe('broadcastState (Realtime HTTP endpoint)', () => {
  it('posts one private message to the room topic with the service key, and never the key in the body', async () => {
    const { broadcastState } = await vi.importActual<typeof import('./server')>('./server');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.example/');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-for-tests');
    const fetchMock = vi.fn(async () => new Response(null, { status: 202 }));
    vi.stubGlobal('fetch', fetchMock);
    const state = { v: 1, code: 'ABCDEF', seq: 3, status: 'round' } as unknown as Parameters<typeof broadcastState>[1];
    expect(await broadcastState('live:room-id', state)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://project.example/realtime/v1/api/broadcast');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).apikey).toBe('service-key-for-tests');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer service-key-for-tests');
    expect(JSON.parse(init.body as string)).toEqual({ messages: [{ topic: 'live:room-id', event: 'state', payload: state, private: true }] });
    expect(init.body as string).not.toContain('service-key-for-tests');
    vi.unstubAllGlobals();
  });

  it('throws on a refusal (the service logs it and goes on) and does nothing without configuration', async () => {
    const { broadcastState } = await vi.importActual<typeof import('./server')>('./server');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.example');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-key-for-tests');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('no', { status: 403 })));
    await expect(broadcastState('live:x', {} as never)).rejects.toThrow('realtime broadcast answered 403');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const none = vi.fn();
    vi.stubGlobal('fetch', none);
    expect(await broadcastState('live:x', {} as never)).toBe(false);
    expect(none).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe('liveDeps without configuration', () => {
  it('no service key in the environment: the store says not live instead of throwing at build or request time', async () => {
    const { liveDeps } = await vi.importActual<typeof import('./server')>('./server');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const deps = liveDeps();
    await expect(deps.store.ping()).rejects.toBeInstanceOf(LiveNotLiveError);
    await expect(deps.store.getRoom('ABCDEF')).rejects.toBeInstanceOf(LiveNotLiveError);
  });
});
