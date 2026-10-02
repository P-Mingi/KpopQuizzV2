// The live blindtest rules, framework free. Each function takes what the request
// carried and answers `{ status, body }`; the API routes (app/api/live/**) only
// parse the request and call one of them. The same functions run in the unit
// tests, in the e2e spec and in the load script's dry mode, against memoryStore().
//
// Who may do what:
//   host token    every host action (start, reveal, board, end, again, settings,
//                 remove, close) and the host view of the state
//   player token  one answer per round, its own view of the state
//   nobody else   anything: a phone never sends on the Realtime channel (it is
//                 private and the policies give receive only), every action is a
//                 call here, timed by the database clock.
//
// The server broadcasts the public state on the room's topic after every change a
// phone must see: round start, reveal, leaderboard, end, play again, a removal,
// the close. Joins and answers are NOT broadcast (the host screen polls its state
// once a second in the lobby and during a round): a broadcast costs one delivery
// per phone, and 50 answers x 50 phones per round would spend the project's
// Realtime message quota for nothing a phone shows.
//
// Node only (node:crypto). The browser imports types.ts, constants.ts, code.ts,
// scoring.ts, nickname.ts and qr.ts, never this file.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import { newRoomCode, parseRoomCode } from './code';
import {
  LIVE_COLOURS, LIVE_CREATE_LIMIT, LIVE_CREATE_WINDOW_MS, LIVE_DEFAULT_ROUNDS, LIVE_DEFAULT_SECONDS, LIVE_MAX_PLAYERS,
  LIVE_MAX_ROUNDS, liveTopic,
} from './constants';
import { checkNickname } from './nickname';
import { choiceCounts, rankPlayers, scoreRound } from './scoring';
import { LiveNotLiveError } from './store';

import type { LiveStore } from './store';
import type {
  LiveErrorCode, LiveHostState, LivePlayer, LivePlayerState, LivePublicState, LiveQuestion, LiveResult, RoomSnapshot, ScoreRow,
} from './types';

export interface LiveDeps {
  store: LiveStore;
  /** Send the public state to the room's private channel. Must not throw. */
  broadcast: (topic: string, state: LivePublicState) => Promise<void>;
  /** The site's moderation word list. A failed read gives an empty list (the host can remove a player). */
  bannedTerms: () => Promise<string[]>;
  /** Rooms opened outside production are marked `is_test`. */
  isTest: boolean;
  /** Test hooks. */
  newToken?: () => string;
  newCode?: () => string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function makeToken(): string {
  return randomBytes(32).toString('base64url');
}

function sameHash(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

const err = (status: number, error: LiveErrorCode): LiveResult<never> => ({ status, body: { error } });
const ok = <T extends object>(body: T, status = 200): LiveResult<T> => ({ status, body });

/** Run a service step; a missing table or function becomes 503 `not_live`, anything else 500. */
async function guarded<T>(fn: () => Promise<LiveResult<T>>): Promise<LiveResult<T>> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof LiveNotLiveError) return err(503, 'not_live');
    console.error('[live] service error:', e instanceof Error ? e.message : 'unknown');
    return err(500, 'server_error');
  }
}

// ---------------------------------------------------------------------------
// Input.
// ---------------------------------------------------------------------------

const PROMPT: Record<'title' | 'artist', string> = { title: 'Which song is this?', artist: 'Who sings this?' };

function tidy(v: unknown, max: number): string {
  // One line of visible text: control characters out, spaces collapsed.
  return String(v ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** A Deezer preview clip: https on the Deezer CDN, nothing else is ever played on a host screen. */
export function isPreviewUrl(v: unknown): v is string {
  if (typeof v !== 'string' || v.length > 600) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && (u.hostname === 'dzcdn.net' || u.hostname.endsWith('.dzcdn.net'));
  } catch {
    return false;
  }
}

/**
 * The questions of a room, from what /api/blind-test/generate returned to the host
 * screen (`song_id`, `question_type`, `preview_url`, `correct_answer`, `choices`).
 * The host is not a player, so it may know the answers; what is checked is the
 * shape, so a forged body cannot put markup, another site's audio or a question
 * with no right answer on the big screen. null = refuse the request.
 */
export function parseQuestions(raw: unknown, rounds: number): LiveQuestion[] | null {
  if (!Array.isArray(raw) || raw.length < rounds || raw.length > LIVE_MAX_ROUNDS) return null;
  const out: LiveQuestion[] = [];
  for (const item of raw.slice(0, rounds)) {
    const q = (item ?? {}) as Record<string, unknown>;
    const songId = String(q.song_id ?? '');
    if (!UUID_RE.test(songId)) return null;
    const kind = q.question_type === 'artist' ? 'artist' : q.question_type === 'title' ? 'title' : null;
    if (!kind) return null;
    if (!isPreviewUrl(q.preview_url)) return null;
    if (!Array.isArray(q.choices) || q.choices.length !== 4) return null;
    const options = q.choices.map((c) => tidy(c, 120));
    if (options.some((o) => !o) || new Set(options).size !== 4) return null;
    const correct = options.indexOf(tidy(q.correct_answer, 120));
    if (correct < 0) return null;
    out.push({
      song_id: songId.toLowerCase(),
      kind,
      prompt: PROMPT[kind],
      options: options as [string, string, string, string],
      correct: correct as 0 | 1 | 2 | 3,
      preview_url: q.preview_url,
    });
  }
  return out;
}

interface Settings { playlist: string; label: string; rounds: number; seconds: number; questions: LiveQuestion[] }

function parseSettings(body: unknown): Settings | null {
  const b = (body ?? {}) as Record<string, unknown>;
  const rounds = b.rounds === undefined ? LIVE_DEFAULT_ROUNDS : Number(b.rounds);
  const seconds = b.seconds === undefined ? LIVE_DEFAULT_SECONDS : Number(b.seconds);
  if (!Number.isInteger(rounds) || rounds < 1 || rounds > LIVE_MAX_ROUNDS) return null;
  if (!Number.isInteger(seconds) || seconds < 5 || seconds > 30) return null;
  const playlist = tidy(b.playlist ?? 'all', 80);
  if (!/^[A-Za-z0-9][A-Za-z0-9_.+-]{0,79}$/.test(playlist)) return null;
  const label = tidy(b.label ?? '', 60) || 'All K-pop';
  const questions = parseQuestions(b.questions, rounds);
  if (!questions) return null;
  return { playlist, label, rounds, seconds, questions };
}

// ---------------------------------------------------------------------------
// Views.
// ---------------------------------------------------------------------------

const activePlayers = (snap: RoomSnapshot): LivePlayer[] => snap.players.filter((p) => p.removed_at === null);

export function publicState(snap: RoomSnapshot): LivePublicState {
  const { room, question } = snap;
  const active = activePlayers(snap);
  const ids = new Set(active.map((p) => p.id));
  const answers = snap.answers.filter((a) => ids.has(a.player_id));
  const scored = room.round > 0 && room.scored_round >= room.round && (room.status === 'reveal' || room.status === 'board' || room.status === 'ended');
  const ranked = rankPlayers(active.map((p) => ({ ...p, totalMs: p.total_ms, joinedAt: p.joined_at })));
  const shown = room.status === 'round' || room.status === 'reveal' || room.status === 'board';
  return {
    v: 1,
    code: room.code,
    topic: liveTopic(room.id),
    seq: room.seq,
    status: room.status,
    game: room.game,
    round: room.round,
    rounds: room.rounds,
    seconds: room.seconds,
    label: room.label,
    now: snap.now,
    started_at: room.status === 'round' ? room.round_started_at : null,
    ends_at: room.status === 'round' && room.round_started_at !== null ? room.round_started_at + room.seconds * 1000 : null,
    prompt: shown && question ? question.prompt : null,
    max: LIVE_MAX_PLAYERS,
    answered: room.status === 'lobby' ? 0 : answers.length,
    players: ranked.map((p, i) => ({
      id: p.id,
      name: p.nickname,
      colour: p.colour,
      score: p.score,
      gain: scored ? p.last_gain : 0,
      bonus: scored ? p.last_bonus : 0,
      streak: p.streak,
      result: scored ? p.last_result : null,
      rank: i + 1,
    })),
    reveal: scored && question && room.status !== 'ended'
      ? {
        correct: question.correct,
        answer: question.options[question.correct],
        counts: choiceCounts(answers),
        song_id: question.song_id,
        kind: question.kind,
      }
      : null,
  };
}

export function hostState(snap: RoomSnapshot): LiveHostState {
  const { room, question, next } = snap;
  const shown = room.status === 'round' || room.status === 'reveal' || room.status === 'board';
  const upcoming = (room.status === 'lobby' || room.status === 'reveal' || room.status === 'board') && room.round < room.rounds;
  return {
    ...publicState(snap),
    host: {
      question: shown && question ? { prompt: question.prompt, options: question.options, preview_url: question.preview_url } : null,
      next_preview_url: upcoming && next ? next.preview_url : null,
    },
  };
}

export function playerState(snap: RoomSnapshot, player: LivePlayer): LivePlayerState {
  const mine = snap.room.status === 'round' ? snap.answers.find((a) => a.player_id === player.id) : undefined;
  return {
    ...publicState(snap),
    you: {
      id: player.id,
      name: player.nickname,
      colour: player.colour,
      answer: mine ? { choice: mine.choice, ms: mine.ms } : null,
    },
  };
}

type Who = { kind: 'host' } | { kind: 'player'; player: LivePlayer } | { kind: 'removed' } | { kind: 'nobody' };

function whoIs(snap: RoomSnapshot, token: string | null | undefined): Who {
  if (!token || token.length < 16 || token.length > 200) return { kind: 'nobody' };
  const h = hashToken(token);
  if (sameHash(h, snap.room.host_token_hash)) return { kind: 'host' };
  const player = snap.players.find((p) => sameHash(h, p.token_hash));
  if (!player) return { kind: 'nobody' };
  return player.removed_at === null ? { kind: 'player', player } : { kind: 'removed' };
}

async function tell(deps: LiveDeps, snap: RoomSnapshot): Promise<void> {
  try {
    await deps.broadcast(liveTopic(snap.room.id), publicState(snap));
  } catch (e) {
    // A lost broadcast never fails the action: every phone resyncs from the state route.
    console.error('[live] broadcast failed:', e instanceof Error ? e.message : 'unknown');
  }
}

// ---------------------------------------------------------------------------
// Routes.
// ---------------------------------------------------------------------------

/** GET /api/live: is the mode open (the tables exist)? */
export function liveStatus(deps: LiveDeps): Promise<LiveResult<{ ok: true; max: number }>> {
  return guarded(async () => {
    await deps.store.ping();
    return ok({ ok: true as const, max: LIVE_MAX_PLAYERS });
  });
}

/** POST /api/live/rooms: the host opens a room. */
export function createRoom(
  deps: LiveDeps,
  input: { body: unknown; ipHash: string },
): Promise<LiveResult<{ code: string; host_token: string; state: LiveHostState }>> {
  return guarded(async () => {
    await deps.store.ping();
    const settings = parseSettings(input.body);
    if (!settings) return err(400, 'bad_request');
    if (await deps.store.recentRooms(input.ipHash, LIVE_CREATE_WINDOW_MS) >= LIVE_CREATE_LIMIT) return err(429, 'rate_limited');
    const token = (deps.newToken ?? makeToken)();
    for (let attempt = 0; attempt < 6; attempt++) {
      const code = (deps.newCode ?? newRoomCode)();
      const made = await deps.store.createRoom({
        code,
        host_token_hash: hashToken(token),
        ...settings,
        is_test: deps.isTest,
        ip_hash: input.ipHash,
      });
      if (!made) continue;
      const snap = await deps.store.getRoom(code);
      if (!snap) return err(500, 'server_error');
      return ok({ code, host_token: token, state: hostState(snap) }, 201);
    }
    return err(500, 'server_error');
  });
}

/** GET /api/live/rooms/<code>: what the join page may know without a token. */
export function peekRoom(
  deps: LiveDeps,
  rawCode: unknown,
): Promise<LiveResult<{ code: string; status: string; label: string; players: number; max: number }>> {
  return guarded(async () => {
    const code = parseRoomCode(rawCode);
    if (!code) return err(400, 'bad_code');
    const snap = await deps.store.getRoom(code);
    if (!snap) return err(404, 'not_found');
    return ok({ code, status: snap.room.status, label: snap.room.label, players: activePlayers(snap).length, max: LIVE_MAX_PLAYERS });
  });
}

/** GET /api/live/rooms/<code>/state: the host view or a phone's view, by token. */
export function getState(
  deps: LiveDeps,
  rawCode: unknown,
  token: string | null | undefined,
): Promise<LiveResult<LiveHostState | LivePlayerState>> {
  return guarded<LiveHostState | LivePlayerState>(async () => {
    const code = parseRoomCode(rawCode);
    if (!code) return err(400, 'bad_code');
    const snap = await deps.store.getRoom(code);
    if (!snap) return err(404, 'gone');
    const who = whoIs(snap, token);
    if (who.kind === 'host') return ok(hostState(snap));
    if (who.kind === 'player') return ok(playerState(snap, who.player));
    if (who.kind === 'removed') return err(403, 'removed');
    return err(401, 'unauthorized');
  });
}

/** POST /api/live/rooms/<code>/join: a phone enters with a nickname. */
export function joinRoom(
  deps: LiveDeps,
  rawCode: unknown,
  body: unknown,
): Promise<LiveResult<{ token: string; state: LivePlayerState }>> {
  return guarded(async () => {
    const code = parseRoomCode(rawCode);
    if (!code) return err(400, 'bad_code');
    const b = (body ?? {}) as Record<string, unknown>;
    let terms: string[] = [];
    try { terms = await deps.bannedTerms(); } catch { terms = []; }
    const nick = checkNickname(b.nickname, terms);
    if (!nick.ok) return err(400, `nickname_${nick.error}`);
    const colour = Number.isInteger(b.colour) && (b.colour as number) >= 0 && (b.colour as number) < LIVE_COLOURS ? (b.colour as number) : 0;
    const before = await deps.store.getRoom(code);
    if (!before) return err(404, 'not_found');
    const token = (deps.newToken ?? makeToken)();
    const joined = await deps.store.join(before.room.id, hashToken(token), nick.value, colour, LIVE_MAX_PLAYERS);
    if (joined.status !== 'ok') return joined.status === 'full' ? err(409, 'full') : err(404, 'not_found');
    const snap = await deps.store.getRoom(code);
    if (!snap) return err(404, 'not_found');
    return ok({ token, state: playerState(snap, joined.player) }, 201);
  });
}

/** POST /api/live/rooms/<code>/answer: one answer per round, timed by the database. */
export function submitAnswer(
  deps: LiveDeps,
  rawCode: unknown,
  token: string | null | undefined,
  body: unknown,
): Promise<LiveResult<{ ok: true; ms: number; round: number }>> {
  return guarded(async () => {
    const code = parseRoomCode(rawCode);
    if (!code) return err(400, 'bad_code');
    const choice = (body as Record<string, unknown> | null)?.choice;
    if (!Number.isInteger(choice) || (choice as number) < 0 || (choice as number) > 3) return err(400, 'bad_request');
    if (!token || token.length < 16 || token.length > 200) return err(401, 'unauthorized');
    const out = await deps.store.submitAnswer(code, hashToken(token), choice as number);
    switch (out.status) {
      case 'ok': return ok({ ok: true as const, ms: out.ms, round: out.round });
      case 'late': return err(409, 'late');
      case 'duplicate': return err(409, 'duplicate');
      case 'not_open': return err(409, 'not_open');
      case 'removed': return err(403, 'removed');
      case 'unauthorized': return err(401, 'unauthorized');
      default: return err(404, 'gone');
    }
  });
}

export type HostAction = 'start' | 'reveal' | 'board' | 'end' | 'again' | 'settings' | 'remove' | 'close';
const HOST_ACTIONS: readonly HostAction[] = ['start', 'reveal', 'board', 'end', 'again', 'settings', 'remove', 'close'];

function scoreRows(snap: RoomSnapshot): ScoreRow[] {
  const q = snap.question;
  if (!q) return [];
  const active = activePlayers(snap);
  const ids = new Set(active.map((p) => p.id));
  const scored = scoreRound(
    active.map((p) => ({ id: p.id, score: p.score, streak: p.streak, correct: p.correct, answered: p.answered, totalMs: p.total_ms })),
    snap.answers.filter((a) => ids.has(a.player_id)).map((a) => ({ playerId: a.player_id, choice: a.choice, ms: a.ms })),
    q.correct,
    snap.room.seconds * 1000,
  );
  return scored.map((p) => ({
    player_id: p.id,
    score: p.score,
    streak: p.streak,
    correct: p.correct,
    answered: p.answered,
    total_ms: p.totalMs,
    gain: p.gain,
    bonus: p.bonus,
    result: p.result,
  }));
}

/** POST /api/live/rooms/<code>/host: every host action. The host tab drives the game. */
export function hostAction(
  deps: LiveDeps,
  rawCode: unknown,
  token: string | null | undefined,
  body: unknown,
): Promise<LiveResult<{ state: LiveHostState } | { closed: true }>> {
  return guarded<{ state: LiveHostState } | { closed: true }>(async () => {
    const code = parseRoomCode(rawCode);
    if (!code) return err(400, 'bad_code');
    const b = (body ?? {}) as Record<string, unknown>;
    const action = HOST_ACTIONS.find((a) => a === b.action);
    if (!action) return err(400, 'bad_request');
    let snap = await deps.store.getRoom(code);
    if (!snap) return err(404, 'gone');
    const who = whoIs(snap, token);
    if (who.kind !== 'host') return err(who.kind === 'nobody' ? 401 : 403, who.kind === 'nobody' ? 'unauthorized' : 'forbidden');
    const { room } = snap;
    const reread = async (): Promise<RoomSnapshot | null> => deps.store.getRoom(code);
    const done = async (announce: boolean): Promise<LiveResult<{ state: LiveHostState }>> => {
      const fresh = await reread();
      if (!fresh) return err(404, 'gone');
      if (announce) await tell(deps, fresh);
      return ok({ state: hostState(fresh) });
    };

    switch (action) {
      case 'start': {
        const round = Number(b.round);
        if (!Number.isInteger(round) || round < 1 || round > room.rounds) return err(400, 'bad_request');
        // A repeated click or a retry after a lost response: the round is already running.
        if (room.status === 'round' && room.round === round) return ok({ state: hostState(snap) });
        if (round === 1 && activePlayers(snap).length < 1) return err(409, 'bad_state');
        if (!await deps.store.startRound(room.id, room.game, round)) return err(409, 'bad_state');
        return done(true);
      }
      case 'reveal': {
        const round = Number(b.round);
        if (!Number.isInteger(round) || round !== room.round || round < 1) return err(400, 'bad_request');
        if (room.status !== 'round' && room.status !== 'reveal') return err(409, 'bad_state');
        if (room.status === 'round') {
          await deps.store.closeRound(room.id, room.game, round);
          snap = await reread();
          if (!snap) return err(404, 'gone');
        }
        // Also reached on a retry when the first call closed the round and died before scoring.
        if (snap.room.status === 'reveal' && snap.room.scored_round < round) {
          await deps.store.applyScores(room.id, room.game, round, scoreRows(snap));
        } else if (room.status === 'reveal') {
          return ok({ state: hostState(snap) });
        }
        return done(true);
      }
      case 'board': {
        if (room.status === 'board') return ok({ state: hostState(snap) });
        if (room.status !== 'reveal' || room.scored_round < room.round) return err(409, 'bad_state');
        if (!await deps.store.moveStatus(room.id, 'reveal', 'board')) return err(409, 'bad_state');
        return done(true);
      }
      case 'end': {
        if (room.status === 'ended') return ok({ state: hostState(snap) });
        if (room.status !== 'board') return err(409, 'bad_state');
        if (!await deps.store.moveStatus(room.id, 'board', 'ended')) return err(409, 'bad_state');
        return done(true);
      }
      case 'again':
      case 'settings': {
        const settings = parseSettings(b);
        if (!settings) return err(400, 'bad_request');
        const moved = action === 'again'
          ? await deps.store.resetGame(room.id, settings)
          : await deps.store.updateSettings(room.id, settings);
        if (!moved) return err(409, 'bad_state');
        return done(action === 'again');
      }
      case 'remove': {
        const playerId = String(b.player_id ?? '');
        if (!UUID_RE.test(playerId)) return err(400, 'bad_request');
        if (!await deps.store.removePlayer(room.id, playerId)) return err(404, 'not_found');
        return done(true);
      }
      default: {
        if (!await deps.store.closeRoom(room.id)) return err(404, 'gone');
        // The room is closed, so there is no state to read back: tell the phones from what we had.
        await tell(deps, { ...snap, room: { ...room, status: 'closed', seq: room.seq + 1 } });
        return ok({ closed: true as const });
      }
    }
  });
}

/** GET /api/cron/live-expire. */
export function expireRooms(deps: LiveDeps): Promise<LiveResult<{ ok: true; closed: number; deleted: number }>> {
  return guarded(async () => {
    const out = await deps.store.expireRooms();
    return ok({ ok: true as const, ...out });
  });
}
