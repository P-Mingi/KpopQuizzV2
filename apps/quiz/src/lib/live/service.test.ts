import { describe, expect, it } from 'vitest';

import { LIVE_CREATE_LIMIT, LIVE_MAX_PLAYERS, LIVE_ROOM_TTL_MS } from './constants';
import { fakeCorrect, fakeGenerated, fakeLive } from './fake';
import {
  createRoom, expireRooms, getState, hashToken, hostAction, isPreviewUrl, joinRoom, liveStatus, parseQuestions, peekRoom,
  submitAnswer,
} from './service';
import { LiveNotLiveError } from './store';

import type { FakeLive } from './fake';
import type { LiveHostState, LivePlayerState } from './types';

// The service against the memory store: the rules of every route. The same
// functions are what the route handlers call (api.test.ts checks the handlers).

type Body = Record<string, unknown>;
const body = <T>(r: { body: unknown }): T => r.body as T;
const errorOf = (r: { body: unknown }): string | undefined => (r.body as { error?: string }).error;

const settings = (over: Body = {}): Body => ({ playlist: 'all', label: 'All K-pop', rounds: 5, seconds: 15, questions: fakeGenerated(5), ...over });

async function open(f: FakeLive, over: Body = {}): Promise<{ code: string; host: string }> {
  const r = await createRoom(f.deps, { body: settings(over), ipHash: 'ip-host' });
  expect(r.status).toBe(201);
  const b = body<{ code: string; host_token: string }>(r);
  return { code: b.code, host: b.host_token };
}

async function join(f: FakeLive, code: string, nickname: string, colour = 0): Promise<{ token: string; id: string; name: string }> {
  const r = await joinRoom(f.deps, code, { nickname, colour });
  expect(r.status, JSON.stringify(r.body)).toBe(201);
  const b = body<{ token: string; state: LivePlayerState }>(r);
  return { token: b.token, id: b.state.you.id, name: b.state.you.name };
}

const host = async (f: FakeLive, code: string, token: string, action: Body): Promise<{ status: number; state: LiveHostState; error?: string | undefined }> => {
  const r = await hostAction(f.deps, code, token, action);
  return { status: r.status, state: (r.body as { state: LiveHostState }).state, error: errorOf(r) };
};

describe('create a room', () => {
  it('opens a lobby, gives a six character code and a host token once', async () => {
    const f = fakeLive();
    const r = await createRoom(f.deps, { body: settings(), ipHash: 'ip' });
    expect(r.status).toBe(201);
    const b = body<{ code: string; host_token: string; state: LiveHostState }>(r);
    expect(b.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(b.host_token.length).toBeGreaterThanOrEqual(40);
    expect(b.state).toMatchObject({ status: 'lobby', round: 0, rounds: 5, seconds: 15, label: 'All K-pop', players: [], max: 50, reveal: null });
    expect(b.state.topic).toMatch(/^live:[0-9a-f-]{36}$/);
    // The host preloads the first clip; no question is on screen yet.
    expect(b.state.host.question).toBeNull();
    expect(b.state.host.next_preview_url).toBe('https://cdnt-preview.dzcdn.net/api/1/1/test-1.mp3');
    // Only the hash is stored.
    const stored = [...f.store.rooms.values()][0]!;
    expect(stored.host_token_hash).toBe(hashToken(b.host_token));
    expect(JSON.stringify(stored)).not.toContain(b.host_token);
    expect(stored.is_test).toBe(true);
    expect(stored.expires_at - f.clock.now).toBe(LIVE_ROOM_TTL_MS);
  });

  it('marks the room is_test from the environment, never from the request', async () => {
    const f = fakeLive({ isTest: false });
    await createRoom(f.deps, { body: settings({ is_test: true }), ipHash: 'ip' });
    expect([...f.store.rooms.values()][0]!.is_test).toBe(false);
  });

  it.each([
    ['no questions', { questions: undefined }],
    ['fewer questions than rounds', { rounds: 10 }],
    ['0 rounds', { rounds: 0 }],
    ['21 rounds', { rounds: 21, questions: fakeGenerated(20) }],
    ['4 seconds', { seconds: 4 }],
    ['31 seconds', { seconds: 31 }],
    ['a fractional round count', { rounds: 5.5 }],
    ['a playlist with a slash', { playlist: '../x' }],
  ])('refuses %s', async (_name, over) => {
    const f = fakeLive();
    const r = await createRoom(f.deps, { body: settings(over), ipHash: 'ip' });
    expect(r.status).toBe(400);
    expect(errorOf(r)).toBe('bad_request');
    expect(f.store.rooms.size).toBe(0);
  });

  it('retries on a code already in use', async () => {
    const f = fakeLive();
    const codes = ['AAAAAA', 'AAAAAA', 'AAAAAA', 'BBBBBB'];
    f.deps.newCode = () => codes.shift() ?? 'CCCCCC';
    const first = await createRoom(f.deps, { body: settings(), ipHash: 'ip' });
    const second = await createRoom(f.deps, { body: settings(), ipHash: 'ip' });
    expect(body<{ code: string }>(first).code).toBe('AAAAAA');
    expect(body<{ code: string }>(second).code).toBe('BBBBBB');
  });

  it(`limits one address to ${LIVE_CREATE_LIMIT} rooms in ten minutes`, async () => {
    const f = fakeLive();
    for (let i = 0; i < LIVE_CREATE_LIMIT; i++) expect((await createRoom(f.deps, { body: settings(), ipHash: 'same' })).status).toBe(201);
    const over = await createRoom(f.deps, { body: settings(), ipHash: 'same' });
    expect(over.status).toBe(429);
    expect(errorOf(over)).toBe('rate_limited');
    // Another address is not affected, and the window passes.
    expect((await createRoom(f.deps, { body: settings(), ipHash: 'other' })).status).toBe(201);
    f.clock.advance(10 * 60 * 1000 + 1);
    expect((await createRoom(f.deps, { body: settings(), ipHash: 'same' })).status).toBe(201);
  });
});

describe('questions from the generate route', () => {
  it('keeps the four answers in order and finds the right one', () => {
    const q = parseQuestions(fakeGenerated(3), 3)!;
    expect(q).toHaveLength(3);
    expect(q[0]).toMatchObject({ kind: 'title', prompt: 'Which song is this?', options: ['Song 1A', 'Song 1B', 'Song 1C', 'Song 1D'], correct: 0 });
    expect(q[1]).toMatchObject({ kind: 'artist', prompt: 'Who sings this?', correct: 1 });
    expect(q[2]!.correct).toBe(2);
  });

  it('takes only as many questions as rounds', () => {
    expect(parseQuestions(fakeGenerated(10), 5)).toHaveLength(5);
  });

  it.each([
    ['a clip on another site', { preview_url: 'https://evil.example/x.mp3' }],
    ['a clip over http', { preview_url: 'http://cdnt-preview.dzcdn.net/x.mp3' }],
    ['a look-alike host', { preview_url: 'https://dzcdn.net.evil.example/x.mp3' }],
    ['a javascript url', { preview_url: 'javascript:alert(1)' }],
    ['three answers', { choices: ['a', 'b', 'c'] }],
    ['two identical answers', { choices: ['a', 'a', 'c', 'd'], correct_answer: 'a' }],
    ['an empty answer', { choices: ['a', '', 'c', 'd'], correct_answer: 'a' }],
    ['a right answer that is not one of the four', { correct_answer: 'nope' }],
    ['a song id that is not a uuid', { song_id: '1' }],
    ['an unknown question type', { question_type: 'lyrics' }],
  ])('refuses %s', (_name, over) => {
    const raw = fakeGenerated(2).map((q, i) => (i === 1 ? { ...q, ...over } : q));
    expect(parseQuestions(raw, 2)).toBeNull();
  });

  it('refuses a body that is not a list, and more than 20 questions', () => {
    expect(parseQuestions(null, 1)).toBeNull();
    expect(parseQuestions({}, 1)).toBeNull();
    expect(parseQuestions(fakeGenerated(21), 5)).toBeNull();
  });

  it('answers are plain text: control characters and long values are cut', () => {
    const [q] = fakeGenerated(1);
    const out = parseQuestions([{ ...q!, choices: ['a\u0000\nb', 'x'.repeat(300), 'c', 'd'], correct_answer: 'c' }], 1)!;
    expect(out[0]!.options[0]).toBe('a b');
    expect(out[0]!.options[1]).toHaveLength(120);
  });

  it('preview hosts', () => {
    expect(isPreviewUrl('https://cdnt-preview.dzcdn.net/api/1/1/a.mp3')).toBe(true);
    expect(isPreviewUrl('https://cdns-preview-d.dzcdn.net/stream/c-1.mp3')).toBe(true);
    expect(isPreviewUrl('https://dzcdn.net/a.mp3')).toBe(true);
    expect(isPreviewUrl('https://notdzcdn.net/a.mp3')).toBe(false);
    expect(isPreviewUrl(42)).toBe(false);
  });
});

describe('join', () => {
  it('a phone enters with a nickname and a colour, and gets a token once', async () => {
    const f = fakeLive();
    const { code } = await open(f);
    const r = await joinRoom(f.deps, code.toLowerCase(), { nickname: ' mingi ', colour: 2 });
    expect(r.status).toBe(201);
    const b = body<{ token: string; state: LivePlayerState }>(r);
    expect(b.state.you).toMatchObject({ name: 'mingi', colour: 2, answer: null });
    expect(b.state.players).toEqual([expect.objectContaining({ id: b.state.you.id, name: 'mingi', colour: 2, score: 0, rank: 1 })]);
    // No broadcast for a join: the host screen polls its state.
    expect(f.sent).toHaveLength(0);
    // Nothing a phone receives holds a token, a hash or an answer.
    const wire = JSON.stringify(b.state);
    expect(wire).not.toContain('token');
    expect(wire).not.toContain('preview');
    expect(wire).not.toContain('correct');
    expect(wire).not.toContain('Song 1');
  });

  it('two players with the same nickname: the second one gets a number', async () => {
    const f = fakeLive();
    const { code } = await open(f);
    expect((await join(f, code, 'mingi')).name).toBe('mingi');
    expect((await join(f, code, 'MINGI')).name).toBe('MINGI 2');
    expect((await join(f, code, 'mingi')).name).toBe('mingi 3');
  });

  it('the site word list blocks a nickname; a failed list read lets the name in', async () => {
    const f = fakeLive({ terms: ['badword'] });
    const { code } = await open(f);
    const blocked = await joinRoom(f.deps, code, { nickname: 'xX_b4dw0rd_Xx' });
    expect(blocked.status).toBe(400);
    expect(errorOf(blocked)).toBe('nickname_blocked');
    expect(errorOf(await joinRoom(f.deps, code, { nickname: '' }))).toBe('nickname_empty');
    expect(errorOf(await joinRoom(f.deps, code, { nickname: 'a'.repeat(17) }))).toBe('nickname_too_long');
    expect(f.store.players.size).toBe(0);
    f.deps.bannedTerms = async () => { throw new Error('db down'); };
    expect((await joinRoom(f.deps, code, { nickname: 'badword' })).status).toBe(201);
  });

  it('an unknown colour falls back to the first one', async () => {
    const f = fakeLive();
    const { code } = await open(f);
    for (const colour of [4, -1, 1.5, 'red', null]) {
      const r = await joinRoom(f.deps, code, { nickname: `p${String(colour)}`, colour });
      expect(body<{ state: LivePlayerState }>(r).state.you.colour).toBe(0);
    }
  });

  it(`refuses the ${LIVE_MAX_PLAYERS + 1}th player`, async () => {
    const f = fakeLive();
    const { code } = await open(f);
    for (let i = 0; i < LIVE_MAX_PLAYERS; i++) await join(f, code, `fan${i}`);
    const r = await joinRoom(f.deps, code, { nickname: 'one more' });
    expect(r.status).toBe(409);
    expect(errorOf(r)).toBe('full');
    expect(f.store.players.size).toBe(50);
    expect(body<{ players: number; max: number }>(await peekRoom(f.deps, code))).toMatchObject({ players: 50, max: 50 });
  });

  it('60 phones at the same time: 50 get in', async () => {
    const f = fakeLive();
    const { code } = await open(f);
    const results = await Promise.all(Array.from({ length: 60 }, (_, i) => joinRoom(f.deps, code, { nickname: `fan${i}` })));
    expect(results.filter((r) => r.status === 201)).toHaveLength(50);
    expect(results.filter((r) => r.status === 409)).toHaveLength(10);
  });

  it('a bad code and an unknown room', async () => {
    const f = fakeLive();
    expect((await joinRoom(f.deps, 'nope', { nickname: 'a' })).status).toBe(400);
    expect(errorOf(await joinRoom(f.deps, 'K7Q2P0', { nickname: 'a' }))).toBe('bad_code');
    const r = await joinRoom(f.deps, 'ZZZZZZ', { nickname: 'a' });
    expect(r.status).toBe(404);
    expect((await peekRoom(f.deps, 'ZZZZZZ')).status).toBe(404);
    expect((await peekRoom(f.deps, '<script>')).status).toBe(400);
  });

  it('a phone may join a game that already started, and starts at zero', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    await join(f, code, 'early');
    await host(f, code, h, { action: 'start', round: 1 });
    const late = await join(f, code, 'late');
    const s = body<LivePlayerState>(await getState(f.deps, code, late.token));
    expect(s.status).toBe('round');
    expect(s.players.find((p) => p.id === late.id)).toMatchObject({ score: 0 });
  });
});

describe('who may read and do what', () => {
  it('state: the host view, a phone view, nothing without a token', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });

    const asHost = body<LiveHostState>(await getState(f.deps, code, h));
    expect(asHost.host.question).toEqual({
      prompt: 'Which song is this?',
      options: ['Song 1A', 'Song 1B', 'Song 1C', 'Song 1D'],
      preview_url: 'https://cdnt-preview.dzcdn.net/api/1/1/test-1.mp3',
    });
    expect(asHost.reveal).toBeNull();
    // Even the host view does not carry the right answer before the reveal.
    expect(JSON.stringify(asHost)).not.toContain('correct');

    const asPhone = await getState(f.deps, code, p.token);
    expect(asPhone.status).toBe(200);
    expect(body<LivePlayerState>(asPhone).you.id).toBe(p.id);
    expect(JSON.stringify(asPhone.body)).not.toContain('Song 1');
    expect(JSON.stringify(asPhone.body)).not.toContain('preview');
    expect(body<LivePlayerState>(asPhone).prompt).toBe('Which song is this?');

    for (const token of [null, undefined, '', 'short', 'x'.repeat(64), 'x'.repeat(500)]) {
      const r = await getState(f.deps, code, token);
      expect(r.status).toBe(401);
      expect(errorOf(r)).toBe('unauthorized');
    }
  });

  it('a host token of another room does not open this one', async () => {
    const f = fakeLive();
    const a = await open(f);
    const b = await open(f);
    expect((await getState(f.deps, a.code, b.host)).status).toBe(401);
    expect((await hostAction(f.deps, a.code, b.host, { action: 'start', round: 1 })).status).toBe(401);
  });

  it('host actions need the host token: a player token is refused, no token too', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    for (const action of ['start', 'reveal', 'board', 'end', 'again', 'settings', 'remove', 'close']) {
      const asPlayer = await hostAction(f.deps, code, p.token, { action, round: 1, player_id: p.id, ...settings() });
      expect(asPlayer.status, action).toBe(403);
      expect(errorOf(asPlayer)).toBe('forbidden');
      const asNobody = await hostAction(f.deps, code, null, { action, round: 1, player_id: p.id, ...settings() });
      expect(asNobody.status, action).toBe(401);
    }
    // Nothing moved.
    expect(body<LiveHostState>(await getState(f.deps, code, h))).toMatchObject({ status: 'lobby', round: 0 });
    expect(f.sent).toHaveLength(0);
  });

  it('an unknown action and a bad code', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    expect((await hostAction(f.deps, code, h, { action: 'explode' })).status).toBe(400);
    expect((await hostAction(f.deps, code, h, null)).status).toBe(400);
    expect((await hostAction(f.deps, 'bad', h, { action: 'start', round: 1 })).status).toBe(400);
    expect((await hostAction(f.deps, 'ZZZZZZ', h, { action: 'start', round: 1 })).status).toBe(404);
  });

  it('an answer needs a player token: the host token and no token are refused', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });
    expect((await submitAnswer(f.deps, code, h, { choice: 0 })).status).toBe(401);
    expect((await submitAnswer(f.deps, code, null, { choice: 0 })).status).toBe(401);
    expect((await submitAnswer(f.deps, code, 'x'.repeat(43), { choice: 0 })).status).toBe(401);
    expect(f.store.answers).toHaveLength(0);
  });
});

describe('a whole game', () => {
  it('lobby, rounds, reveal, leaderboard, podium, play again', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f, { rounds: 5, seconds: 10, questions: fakeGenerated(5) });
    const a = await join(f, code, 'ace', 0);      // always right, fast
    const b = await join(f, code, 'bee', 1);      // always right, slow
    const c = await join(f, code, 'cee', 2);      // wrong on round 3, else right
    const d = await join(f, code, 'dee', 3);      // never answers

    for (let round = 1; round <= 5; round++) {
      const started = await host(f, code, h, { action: 'start', round });
      expect(started.status, `start ${round}`).toBe(200);
      expect(started.state).toMatchObject({ status: 'round', round, answered: 0, reveal: null });
      expect(started.state.ends_at! - started.state.started_at!).toBe(10_000);
      expect(started.state.host.question!.preview_url).toContain(`test-${round}.mp3`);
      // The phones are told, with nothing secret.
      const wire = f.sent.at(-1)!;
      expect(wire.topic).toBe(started.state.topic);
      expect(wire.state).toMatchObject({ status: 'round', round, prompt: started.state.host.question!.prompt });
      expect(JSON.stringify(wire.state)).not.toMatch(/preview|options|correct|host|token/);

      const right = fakeCorrect(round);
      f.clock.advance(1000);
      expect(body<{ ok: boolean; ms: number; round: number }>(await submitAnswer(f.deps, code, a.token, { choice: right }))).toEqual({ ok: true, ms: 1000, round });
      f.clock.advance(4000);
      expect((await submitAnswer(f.deps, code, b.token, { choice: right })).status).toBe(200);
      expect((await submitAnswer(f.deps, code, c.token, { choice: round === 3 ? (right + 1) % 4 : right })).status).toBe(200);

      // The host screen polls: three of four answered.
      expect(body<LiveHostState>(await getState(f.deps, code, h)).answered).toBe(3);
      // A phone sees its own locked answer when it asks again (a reload during the round).
      expect(body<LivePlayerState>(await getState(f.deps, code, a.token)).you.answer).toEqual({ choice: right, ms: 1000 });
      expect(body<LivePlayerState>(await getState(f.deps, code, d.token)).you.answer).toBeNull();

      const revealed = await host(f, code, h, { action: 'reveal', round });
      expect(revealed.status).toBe(200);
      expect(revealed.state.status).toBe('reveal');
      expect(revealed.state.reveal).toMatchObject({ correct: right, answer: revealed.state.host.question!.options[right] });
      const counts = [0, 0, 0, 0];
      counts[right] = round === 3 ? 2 : 3;
      if (round === 3) counts[(right + 1) % 4] = 1;
      expect(revealed.state.reveal!.counts).toEqual(counts);
      expect(f.sent.at(-1)!.state).toMatchObject({ status: 'reveal', round, reveal: { correct: right } });

      const board = await host(f, code, h, { action: 'board' });
      expect(board.state.status).toBe('board');
      expect(f.sent.at(-1)!.state.status).toBe('board');
    }

    // ace: 950 a round (1 s of 10 s), streak bonus +100, +200, +300 on rounds 3, 4, 5.
    // bee: 750 a round (5 s), same bonus.
    // cee: 750, 750, wrong, 750, 750 (the streak restarted: no bonus).
    const final = body<LiveHostState>(await getState(f.deps, code, h));
    const byName = Object.fromEntries(final.players.map((p) => [p.name, p]));
    expect(byName.ace).toMatchObject({ score: 950 * 5 + 600, streak: 5, rank: 1, gain: 1250, bonus: 300, result: 'ok' });
    expect(byName.bee).toMatchObject({ score: 750 * 5 + 600, streak: 5, rank: 2, gain: 1050, bonus: 300 });
    expect(byName.cee).toMatchObject({ score: 750 * 4, streak: 2, rank: 3, gain: 750, bonus: 0 });
    expect(byName.dee).toMatchObject({ score: 0, streak: 0, rank: 4, gain: 0, result: 'none' });
    expect(final.players.map((p) => p.name)).toEqual(['ace', 'bee', 'cee', 'dee']);

    // No sixth round; the podium.
    expect((await host(f, code, h, { action: 'start', round: 6 })).status).toBe(400);
    const ended = await host(f, code, h, { action: 'end' });
    expect(ended.state.status).toBe('ended');
    expect(ended.state.host.next_preview_url).toBeNull();
    expect(f.sent.at(-1)!.state.status).toBe('ended');
    expect(f.sent.at(-1)!.state.players[0]).toMatchObject({ name: 'ace', rank: 1 });

    // 5 rounds x (round, reveal, board) + the end.
    expect(f.sent).toHaveLength(16);
    // seq only ever grows: a phone keeps the newest state.
    const seqs = f.sent.map((s) => s.state.seq);
    expect([...seqs].sort((x, y) => x - y)).toEqual(seqs);
    expect(new Set(seqs).size).toBe(seqs.length);

    // Play again: same room, same players, scores at zero, new questions.
    const again = await host(f, code, h, { action: 'again', ...settings({ rounds: 5, questions: fakeGenerated(5) }) });
    expect(again.status).toBe(200);
    expect(again.state).toMatchObject({ status: 'lobby', game: 2, round: 0 });
    expect(again.state.players.every((p) => p.score === 0 && p.streak === 0 && p.gain === 0)).toBe(true);
    expect(again.state.players).toHaveLength(4);
    expect(f.sent.at(-1)!.state).toMatchObject({ status: 'lobby', game: 2 });
    // The old tokens still work, and round 1 can be answered again.
    await host(f, code, h, { action: 'start', round: 1 });
    expect((await submitAnswer(f.deps, code, a.token, { choice: 0 })).status).toBe(200);
  });

  it('nobody in the room: the game does not start', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const r = await host(f, code, h, { action: 'start', round: 1 });
    expect(r.status).toBe(409);
    expect(r.error).toBe('bad_state');
  });

  it('steps cannot be skipped or replayed', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    await join(f, code, 'mingi');
    expect((await host(f, code, h, { action: 'start', round: 2 })).status).toBe(409);
    expect((await host(f, code, h, { action: 'reveal', round: 1 })).status).toBe(400);   // no round is running: round 0
    expect((await host(f, code, h, { action: 'board' })).status).toBe(409);
    expect((await host(f, code, h, { action: 'end' })).status).toBe(409);
    expect((await host(f, code, h, { action: 'again', ...settings() })).status).toBe(409);

    await host(f, code, h, { action: 'start', round: 1 });
    expect((await host(f, code, h, { action: 'board' })).status).toBe(409);              // not revealed yet
    expect((await host(f, code, h, { action: 'start', round: 2 })).status).toBe(409);
    expect((await host(f, code, h, { action: 'settings', ...settings() })).status).toBe(409);
    expect((await host(f, code, h, { action: 'reveal', round: 2 })).status).toBe(400);   // not the running round

    await host(f, code, h, { action: 'reveal', round: 1 });
    expect((await host(f, code, h, { action: 'start', round: 2 })).status).toBe(409);    // leaderboard first
    expect((await host(f, code, h, { action: 'end' })).status).toBe(409);
  });

  it('a repeated click is harmless: start, reveal, board and end answer the same state without a second broadcast', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });
    const startedAt = body<LiveHostState>(await getState(f.deps, code, h)).started_at;
    f.clock.advance(3000);
    const twice = await host(f, code, h, { action: 'start', round: 1 });
    expect(twice.status).toBe(200);
    // The round clock did not restart.
    expect(twice.state.started_at).toBe(startedAt);
    expect(f.sent).toHaveLength(1);

    await submitAnswer(f.deps, code, p.token, { choice: 0 });
    await host(f, code, h, { action: 'reveal', round: 1 });
    const score = body<LiveHostState>(await getState(f.deps, code, h)).players[0]!.score;
    expect(score).toBe(900);
    const again = await host(f, code, h, { action: 'reveal', round: 1 });
    expect(again.status).toBe(200);
    // The round is scored once.
    expect(again.state.players[0]!.score).toBe(900);
    expect(f.sent).toHaveLength(2);

    await host(f, code, h, { action: 'board' });
    expect((await host(f, code, h, { action: 'board' })).status).toBe(200);
    expect(f.sent).toHaveLength(3);
  });

  it('a reveal that died after closing the round is finished by the retry', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });
    await submitAnswer(f.deps, code, p.token, { choice: 0 });
    // The first call closed the round, then the function was killed before the scores were written.
    const room = [...f.store.rooms.values()][0]!;
    await f.store.closeRound(room.id, 1, 1);
    expect(room.status).toBe('reveal');
    expect(room.scored_round).toBe(0);
    const retry = await host(f, code, h, { action: 'reveal', round: 1 });
    expect(retry.status).toBe(200);
    expect(retry.state.players[0]).toMatchObject({ score: 1000, result: 'ok' });
    expect(retry.state.reveal).not.toBeNull();
  });

  it('settings change in the lobby only, and are not broadcast', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const r = await host(f, code, h, { action: 'settings', ...settings({ rounds: 10, seconds: 20, label: 'Girl groups', playlist: 'gg', questions: fakeGenerated(10) }) });
    expect(r.state).toMatchObject({ rounds: 10, seconds: 20, label: 'Girl groups', status: 'lobby' });
    expect(f.sent).toHaveLength(0);
    expect((await host(f, code, h, { action: 'settings', ...settings({ rounds: 99 }) })).status).toBe(400);
  });
});

describe('answers and server time', () => {
  async function running(seconds = 15): Promise<{ f: FakeLive; code: string; h: string; p: { token: string; id: string } }> {
    const f = fakeLive();
    const { code, host: h } = await open(f, { seconds });
    const p = await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });
    return { f, code, h, p };
  }

  it('the time is the server clock from the round start; the phone sends no time', async () => {
    const { f, code, p } = await running();
    f.clock.advance(4321);
    const r = await submitAnswer(f.deps, code, p.token, { choice: 0, ms: 1, time: 1, client_time: 1 });
    expect(body<{ ms: number }>(r).ms).toBe(4321);
    expect(f.store.answers[0]).toMatchObject({ ms: 4321, choice: 0 });
  });

  it('an answer at the last millisecond is taken, one millisecond later it is late', async () => {
    const a = await running(15);
    a.f.clock.advance(15_000);
    expect((await submitAnswer(a.f.deps, a.code, a.p.token, { choice: 0 })).status).toBe(200);

    const b = await running(15);
    b.f.clock.advance(15_001);
    const late = await submitAnswer(b.f.deps, b.code, b.p.token, { choice: 0 });
    expect(late.status).toBe(409);
    expect(errorOf(late)).toBe('late');
    expect(b.f.store.answers).toHaveLength(0);
    // A late answer scores nothing at the reveal.
    const revealed = await host(b.f, b.code, b.h, { action: 'reveal', round: 1 });
    expect(revealed.state.players[0]).toMatchObject({ score: 0, result: 'none' });
  });

  it('one answer per round: the second is refused and the first stands', async () => {
    const { f, code, h, p } = await running();
    f.clock.advance(2000);
    expect((await submitAnswer(f.deps, code, p.token, { choice: 3 })).status).toBe(200);
    f.clock.advance(1000);
    const second = await submitAnswer(f.deps, code, p.token, { choice: 0 });
    expect(second.status).toBe(409);
    expect(errorOf(second)).toBe('duplicate');
    expect(f.store.answers).toHaveLength(1);
    const revealed = await host(f, code, h, { action: 'reveal', round: 1 });
    // The first answer (wrong) is the one scored, not the corrected one.
    expect(revealed.state.players[0]).toMatchObject({ score: 0, result: 'no' });
    expect(revealed.state.reveal!.counts).toEqual([0, 0, 0, 1]);
  });

  it('ten taps at once: one answer', async () => {
    const { f, code, p } = await running();
    const rs = await Promise.all(Array.from({ length: 10 }, (_, i) => submitAnswer(f.deps, code, p.token, { choice: i % 4 })));
    expect(rs.filter((r) => r.status === 200)).toHaveLength(1);
    expect(rs.filter((r) => errorOf(r) === 'duplicate')).toHaveLength(9);
  });

  it('no answer outside a round: lobby, reveal, leaderboard, podium', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f, { rounds: 1, questions: fakeGenerated(1) });
    const p = await join(f, code, 'mingi');
    const refused = async (when: string): Promise<void> => {
      const r = await submitAnswer(f.deps, code, p.token, { choice: 0 });
      expect(r.status, when).toBe(409);
      expect(errorOf(r), when).toBe('not_open');
    };
    await refused('lobby');
    await host(f, code, h, { action: 'start', round: 1 });
    await host(f, code, h, { action: 'reveal', round: 1 });
    await refused('reveal');
    await host(f, code, h, { action: 'board' });
    await refused('board');
    await host(f, code, h, { action: 'end' });
    await refused('ended');
    expect(f.store.answers).toHaveLength(0);
  });

  it.each([[-1], [4], [1.5], ['1'], [null], [undefined]])('refuses the choice %s', async (choice) => {
    const { f, code, p } = await running();
    const r = await submitAnswer(f.deps, code, p.token, { choice });
    expect(r.status).toBe(400);
    expect(f.store.answers).toHaveLength(0);
  });

  it('all the phones answered: the host sees it and may reveal before the timer', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const ps = await Promise.all(['a', 'b', 'c'].map((n) => join(f, code, n)));
    await host(f, code, h, { action: 'start', round: 1 });
    f.clock.advance(500);
    for (const p of ps) await submitAnswer(f.deps, code, p.token, { choice: 0 });
    const s = body<LiveHostState>(await getState(f.deps, code, h));
    expect(s.answered).toBe(s.players.length);
    f.clock.advance(100);
    const r = await host(f, code, h, { action: 'reveal', round: 1 });
    expect(r.state.status).toBe('reveal');
    expect(r.state.players.every((p) => p.score === 980)).toBe(true);
  });
});

describe('ties', () => {
  it('same points: the lower total answer time is ahead, on the leaderboard and on the podium', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f, { rounds: 2, seconds: 10, questions: fakeGenerated(2) });
    const first = await join(f, code, 'joined first');
    const second = await join(f, code, 'joined second');
    // Round 1: `first` answers at 2 s (900), `second` at 4 s (800).
    await host(f, code, h, { action: 'start', round: 1 });
    f.clock.advance(2000);
    await submitAnswer(f.deps, code, first.token, { choice: fakeCorrect(1) });
    f.clock.advance(2000);
    await submitAnswer(f.deps, code, second.token, { choice: fakeCorrect(1) });
    await host(f, code, h, { action: 'reveal', round: 1 });
    await host(f, code, h, { action: 'board' });
    // Round 2: `first` at 6.1 s (700, rounded), `second` at 4 s (800). Both 1600.
    await host(f, code, h, { action: 'start', round: 2 });
    f.clock.advance(4000);
    await submitAnswer(f.deps, code, second.token, { choice: fakeCorrect(2) });
    f.clock.advance(2100);
    await submitAnswer(f.deps, code, first.token, { choice: fakeCorrect(2) });
    const r = await host(f, code, h, { action: 'reveal', round: 2 });
    const [p1, p2] = r.state.players;
    expect(p1!.score).toBe(1600);
    expect(p2!.score).toBe(1600);
    // 8.0 s in total beats 8.1 s, although the other player joined first.
    expect(p1!.name).toBe('joined second');
    expect(p1!.rank).toBe(1);
    expect(p2!.rank).toBe(2);
  });
});

describe('removal', () => {
  it('the host removes a player: gone from the room, token refused, name free, phones told', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const keep = await join(f, code, 'keep');
    const out = await join(f, code, 'out');
    await host(f, code, h, { action: 'start', round: 1 });
    await submitAnswer(f.deps, code, out.token, { choice: fakeCorrect(1) });

    const removed = await host(f, code, h, { action: 'remove', player_id: out.id });
    expect(removed.status).toBe(200);
    expect(removed.state.players.map((p) => p.name)).toEqual(['keep']);
    expect(removed.state.answered).toBe(0);                       // its answer no longer counts
    expect(f.sent.at(-1)!.state.players.map((p) => p.id)).toEqual([keep.id]);

    const state = await getState(f.deps, code, out.token);
    expect(state.status).toBe(403);
    expect(errorOf(state)).toBe('removed');
    const answer = await submitAnswer(f.deps, code, out.token, { choice: 0 });
    expect(answer.status).toBe(403);
    expect(errorOf(answer)).toBe('removed');

    // Its answer is out of the reveal counts and it scores nothing.
    const revealed = await host(f, code, h, { action: 'reveal', round: 1 });
    expect(revealed.state.reveal!.counts).toEqual([0, 0, 0, 0]);
    expect(revealed.state.players).toHaveLength(1);
    expect(f.store.players.get(out.id)!.score).toBe(0);

    // Removing twice, an unknown player, a malformed id.
    expect((await host(f, code, h, { action: 'remove', player_id: out.id })).status).toBe(404);
    expect((await host(f, code, h, { action: 'remove', player_id: '00000000-0000-4000-8000-000000000000' })).status).toBe(404);
    expect((await host(f, code, h, { action: 'remove', player_id: 'x' })).status).toBe(400);

    // The name is free again, and the place too.
    expect((await join(f, code, 'out')).name).toBe('out');
  });

  it('a removed player frees a place in a full room', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const ps = [];
    for (let i = 0; i < LIVE_MAX_PLAYERS; i++) ps.push(await join(f, code, `fan${i}`));
    expect((await joinRoom(f.deps, code, { nickname: 'more' })).status).toBe(409);
    await host(f, code, h, { action: 'remove', player_id: ps[0]!.id });
    expect((await joinRoom(f.deps, code, { nickname: 'more' })).status).toBe(201);
  });
});

describe('reload, drop and rejoin', () => {
  it('a host reload resumes the room from its token, in every state', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });
    f.clock.advance(6000);
    // Reload during the round: same question, the clock went on.
    let s = body<LiveHostState>(await getState(f.deps, code, h));
    expect(s).toMatchObject({ status: 'round', round: 1 });
    expect(s.host.question!.preview_url).toContain('test-1.mp3');
    expect(s.ends_at! - s.now).toBe(9000);
    // Reload after the timer ran out while the tab was closed: the host reveals, late answers stay refused.
    f.clock.advance(60_000);
    expect(errorOf(await submitAnswer(f.deps, code, p.token, { choice: 0 }))).toBe('late');
    s = body<LiveHostState>(await getState(f.deps, code, h));
    expect(s.status).toBe('round');
    expect(s.ends_at!).toBeLessThan(s.now);
    const revealed = await host(f, code, h, { action: 'reveal', round: 1 });
    expect(revealed.state.status).toBe('reveal');
    // Reload on the reveal and on the leaderboard: the answer and the next clip are there.
    s = body<LiveHostState>(await getState(f.deps, code, h));
    expect(s.reveal).toMatchObject({ correct: 0, answer: 'Song 1A' });
    expect(s.host.next_preview_url).toContain('test-2.mp3');
    await host(f, code, h, { action: 'board' });
    expect(body<LiveHostState>(await getState(f.deps, code, h)).status).toBe('board');
  });

  it('a phone that drops comes back with its token and keeps its score', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f, { rounds: 3, questions: fakeGenerated(3) });
    const p = await join(f, code, 'mingi');
    await join(f, code, 'other');
    await host(f, code, h, { action: 'start', round: 1 });
    f.clock.advance(3000);
    await submitAnswer(f.deps, code, p.token, { choice: fakeCorrect(1) });
    await host(f, code, h, { action: 'reveal', round: 1 });
    await host(f, code, h, { action: 'board' });
    // The phone was away for the whole of round 2 (it missed the broadcasts).
    await host(f, code, h, { action: 'start', round: 2 });
    await host(f, code, h, { action: 'reveal', round: 2 });
    await host(f, code, h, { action: 'board' });
    await host(f, code, h, { action: 'start', round: 3 });
    // It comes back: one read gives it the room as it is now, with its score.
    const back = body<LivePlayerState>(await getState(f.deps, code, p.token));
    expect(back).toMatchObject({ status: 'round', round: 3 });
    expect(back.you).toMatchObject({ id: p.id, name: 'mingi', answer: null });
    expect(back.players.find((x) => x.id === p.id)).toMatchObject({ score: 900, streak: 0 });
    // And it plays on.
    expect((await submitAnswer(f.deps, code, p.token, { choice: fakeCorrect(3) })).status).toBe(200);
    // Joining again with the same name would be a new player: the token is the identity.
    expect(f.store.players.size).toBe(2);
  });
});

describe('expiry', () => {
  it('a room is gone two hours after it opened, for every route', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    await host(f, code, h, { action: 'start', round: 1 });
    f.clock.advance(LIVE_ROOM_TTL_MS - 1);
    expect((await getState(f.deps, code, h)).status).toBe(200);
    f.clock.advance(1);
    expect((await getState(f.deps, code, h)).status).toBe(404);
    expect(errorOf(await getState(f.deps, code, p.token))).toBe('gone');
    expect((await peekRoom(f.deps, code)).status).toBe(404);
    expect((await joinRoom(f.deps, code, { nickname: 'late' })).status).toBe(404);
    expect((await submitAnswer(f.deps, code, p.token, { choice: 0 })).status).toBe(404);
    expect((await hostAction(f.deps, code, h, { action: 'reveal', round: 1 })).status).toBe(404);
  });

  it('the cron deletes expired test rooms and empties expired real rooms', async () => {
    const test = fakeLive({ isTest: true });
    const a = await open(test);
    const pa = await join(test, a.code, 'mingi');
    await host(test, a.code, a.host, { action: 'start', round: 1 });
    await submitAnswer(test.deps, a.code, pa.token, { choice: 0 });
    // Not expired yet: nothing happens.
    expect(body(await expireRooms(test.deps))).toEqual({ ok: true, closed: 0, deleted: 0 });
    expect(test.store.rooms.size).toBe(1);
    test.clock.advance(LIVE_ROOM_TTL_MS);
    expect(body(await expireRooms(test.deps))).toEqual({ ok: true, closed: 0, deleted: 1 });
    expect(test.store.rooms.size).toBe(0);
    expect(test.store.players.size).toBe(0);
    expect(test.store.answers).toHaveLength(0);

    const real = fakeLive({ isTest: false });
    const b = await open(real);
    await join(real, b.code, 'mingi');
    real.clock.advance(LIVE_ROOM_TTL_MS);
    expect(body(await expireRooms(real.deps))).toEqual({ ok: true, closed: 1, deleted: 0 });
    const kept = [...real.store.rooms.values()][0]!;
    expect(kept).toMatchObject({ status: 'closed', questions: [], host_token_hash: '' });
    expect(real.store.players.size).toBe(0);
    // Running it again changes nothing.
    expect(body(await expireRooms(real.deps))).toEqual({ ok: true, closed: 0, deleted: 0 });
  });

  it('the host closes the room: every phone is told, every token stops working', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    const p = await join(f, code, 'mingi');
    const r = await hostAction(f.deps, code, h, { action: 'close' });
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ closed: true });
    expect(f.sent.at(-1)!.state.status).toBe('closed');
    expect((await getState(f.deps, code, p.token)).status).toBe(404);
    expect((await getState(f.deps, code, h)).status).toBe(404);
    // The code can be given to a new room.
    f.deps.newCode = () => code;
    expect(body<{ code: string }>(await createRoom(f.deps, { body: settings(), ipHash: 'x' })).code).toBe(code);
  });
});

describe('fail soft', () => {
  it('every route answers 503 not_live until the SQL is applied', async () => {
    const f = fakeLive();
    const notLive = async (): Promise<never> => { throw new LiveNotLiveError(); };
    for (const k of Object.keys(f.store) as Array<keyof typeof f.store>) {
      if (typeof f.store[k] === 'function') (f.store as unknown as Record<string, unknown>)[k] = notLive;
    }
    const results = [
      await liveStatus(f.deps),
      await createRoom(f.deps, { body: settings(), ipHash: 'ip' }),
      await peekRoom(f.deps, 'ABCDEF'),
      await getState(f.deps, 'ABCDEF', 'x'.repeat(43)),
      await joinRoom(f.deps, 'ABCDEF', { nickname: 'mingi' }),
      await submitAnswer(f.deps, 'ABCDEF', 'x'.repeat(43), { choice: 0 }),
      await hostAction(f.deps, 'ABCDEF', 'x'.repeat(43), { action: 'start', round: 1 }),
      await expireRooms(f.deps),
    ];
    for (const r of results) {
      expect(r.status).toBe(503);
      expect(errorOf(r)).toBe('not_live');
    }
  });

  it('open: 200', async () => {
    const f = fakeLive();
    expect(await liveStatus(f.deps)).toEqual({ status: 200, body: { ok: true, max: 50 } });
  });

  it('a store failure is a 500 with no detail', async () => {
    const f = fakeLive();
    f.store.getRoom = async () => { throw new Error('connection refused to db.internal:5432 password=hunter2'); };
    const r = await peekRoom(f.deps, 'ABCDEF');
    expect(r).toEqual({ status: 500, body: { error: 'server_error' } });
  });

  it('a broadcast that fails does not fail the action', async () => {
    const f = fakeLive();
    const { code, host: h } = await open(f);
    await join(f, code, 'mingi');
    f.deps.broadcast = async () => { throw new Error('realtime down'); };
    const r = await host(f, code, h, { action: 'start', round: 1 });
    expect(r.status).toBe(200);
    expect(r.state.status).toBe('round');
  });
});
