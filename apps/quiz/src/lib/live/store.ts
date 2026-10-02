// Where a live room is kept. The service (service.ts) only talks to this
// interface. Two implementations:
//   supabase-store.ts  production: the tables and functions of
//                      docs/pending-migrations/v12-g4-live.sql, service role only.
//   memoryStore()      below: the same rules in memory. It is what the unit tests,
//                      the e2e spec and the load script's dry mode run against,
//                      since no check of this run may write to the production
//                      database. It is never used by a route.
// Each method is one atomic step: in SQL a function or a guarded UPDATE, here a
// synchronous block.

import { LIVE_ROOM_TTL_MS } from './constants';
import { uniqueNickname } from './nickname';

import type { LiveStatus } from './constants';
import type { LiveAnswer, LivePlayer, LiveQuestion, LiveRoom, RoomSnapshot, ScoreRow } from './types';

/** The pending migration is not applied (or the store is not configured): every route answers 503 `not_live`. */
export class LiveNotLiveError extends Error {
  constructor(message = 'not_live') {
    super(message);
    this.name = 'LiveNotLiveError';
  }
}

export interface NewRoom {
  code: string;
  host_token_hash: string;
  host_user_id: string | null;
  playlist: string;
  label: string;
  rounds: number;
  seconds: number;
  questions: LiveQuestion[];
  is_test: boolean;
  ip_hash: string;
}

export type JoinOutcome =
  | { status: 'ok'; player: LivePlayer }
  | { status: 'full' | 'gone' };

export type AnswerOutcome =
  | { status: 'ok'; ms: number; round: number }
  | { status: 'late' | 'duplicate' | 'not_open' | 'removed' | 'unauthorized' | 'gone' };

export interface LiveStore {
  /** Cheap check that the tables exist. Throws LiveNotLiveError when they do not. */
  ping(): Promise<void>;
  /** Rooms opened from this hashed address since `sinceMs` ago. */
  recentRooms(ipHash: string, sinceMs: number): Promise<number>;
  /** The new room's id, or null when the code is already in use by an open room. */
  createRoom(room: NewRoom): Promise<{ id: string } | null>;
  /** null when no open room has this code (unknown, closed or past its two hours). */
  getRoom(code: string): Promise<RoomSnapshot | null>;
  /** Atomic: the cap and the nickname suffix are decided under the room's lock. */
  join(roomId: string, tokenHash: string, nickname: string, colour: number, max: number): Promise<JoinOutcome>;
  /** lobby -> round 1, or board of round n-1 -> round n. The round clock starts at the database's now(). */
  startRound(roomId: string, game: number, round: number): Promise<boolean>;
  /** One call: finds the player by token hash, times the answer with the database clock, refuses it after
   *  `seconds`, and takes one answer per player and round. */
  submitAnswer(code: string, tokenHash: string, choice: number): Promise<AnswerOutcome>;
  /** round -> reveal. False when the room was not in that round. */
  closeRound(roomId: string, game: number, round: number): Promise<boolean>;
  /** Atomic and once per round (guarded by `scored_round`). */
  applyScores(roomId: string, game: number, round: number, rows: ScoreRow[]): Promise<boolean>;
  /** A guarded status change (reveal -> board, board -> ended). */
  moveStatus(roomId: string, from: LiveStatus, to: LiveStatus): Promise<boolean>;
  /** Lobby only: new rounds, seconds, playlist and questions. */
  updateSettings(roomId: string, s: Pick<NewRoom, 'playlist' | 'label' | 'rounds' | 'seconds' | 'questions'>): Promise<boolean>;
  /** ended -> lobby: next game, scores back to zero, new questions. Players stay. */
  resetGame(roomId: string, s: Pick<NewRoom, 'playlist' | 'label' | 'rounds' | 'seconds' | 'questions'>): Promise<boolean>;
  removePlayer(roomId: string, playerId: string): Promise<boolean>;
  closeRoom(roomId: string): Promise<boolean>;
  /** Rooms past their two hours: test rooms are deleted, the others closed and emptied. */
  expireRooms(): Promise<{ closed: number; deleted: number }>;
}

// ---------------------------------------------------------------------------
// Memory store.
// ---------------------------------------------------------------------------

interface MemRoom extends LiveRoom {
  questions: LiveQuestion[];
  ip_hash: string;
  created_at: number;
}

interface MemAnswer extends LiveAnswer {
  room_id: string;
  game: number;
  round: number;
}

export interface MemoryStore extends LiveStore {
  /** Test hooks. */
  rooms: Map<string, MemRoom>;
  players: Map<string, LivePlayer & { room_id: string }>;
  answers: MemAnswer[];
}

let memSeq = 0;
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  memSeq += 1;
  return `00000000-0000-4000-8000-${String(memSeq).padStart(12, '0')}`;
}

/** The same rules as the SQL file, in memory. `now` is the "database clock". */
export function memoryStore(now: () => number = Date.now): MemoryStore {
  const rooms = new Map<string, MemRoom>();
  const players = new Map<string, LivePlayer & { room_id: string }>();
  const answers: MemAnswer[] = [];

  const open = (r: MemRoom | undefined): r is MemRoom => !!r && r.status !== 'closed' && r.expires_at > now();
  const playersOf = (roomId: string): Array<LivePlayer & { room_id: string }> =>
    [...players.values()].filter((p) => p.room_id === roomId).sort((a, b) => a.joined_at - b.joined_at);

  const store: MemoryStore = {
    rooms,
    players,
    answers,

    async ping() { /* always there */ },

    async recentRooms(ipHash, sinceMs) {
      const from = now() - sinceMs;
      return [...rooms.values()].filter((r) => r.ip_hash === ipHash && r.created_at >= from).length;
    },

    async createRoom(room) {
      for (const r of rooms.values()) if (r.code === room.code && open(r)) return null;
      const id = uuid();
      rooms.set(id, {
        id,
        code: room.code,
        host_token_hash: room.host_token_hash,
        playlist: room.playlist,
        label: room.label,
        rounds: room.rounds,
        seconds: room.seconds,
        questions: room.questions,
        status: 'lobby',
        game: 1,
        round: 0,
        round_started_at: null,
        scored_round: 0,
        seq: 1,
        is_test: room.is_test,
        expires_at: now() + LIVE_ROOM_TTL_MS,
        ip_hash: room.ip_hash,
        created_at: now(),
      });
      return { id };
    },

    async getRoom(code) {
      const r = [...rooms.values()].find((x) => x.code === code && open(x));
      if (!r) return null;
      const { questions, ip_hash: _ip, created_at: _created, ...room } = r;
      return {
        room: { ...room },
        question: r.round > 0 ? questions[r.round - 1] ?? null : null,
        next: questions[r.round] ?? null,
        players: playersOf(r.id).map(({ room_id: _room, ...p }) => ({ ...p })),
        answers: answers
          .filter((a) => a.room_id === r.id && a.game === r.game && a.round === r.round)
          .map((a) => ({ player_id: a.player_id, choice: a.choice, ms: a.ms })),
        now: now(),
      };
    },

    async join(roomId, tokenHash, nickname, colour, max) {
      const r = rooms.get(roomId);
      if (!open(r)) return { status: 'gone' };
      const active = playersOf(roomId).filter((p) => p.removed_at === null);
      if (active.length >= max) return { status: 'full' };
      const player: LivePlayer & { room_id: string } = {
        id: uuid(),
        room_id: roomId,
        token_hash: tokenHash,
        nickname: uniqueNickname(nickname, active.map((p) => p.nickname)),
        colour,
        score: 0,
        streak: 0,
        correct: 0,
        answered: 0,
        total_ms: 0,
        last_gain: 0,
        last_bonus: 0,
        last_result: null,
        removed_at: null,
        // Strictly increasing, so two joins in the same millisecond keep their order.
        joined_at: Math.max(now(), ...playersOf(roomId).map((p) => p.joined_at + 1)),
      };
      players.set(player.id, player);
      const { room_id: _room, ...out } = player;
      return { status: 'ok', player: out };
    },

    async startRound(roomId, game, round) {
      const r = rooms.get(roomId);
      if (!open(r) || r.game !== game) return false;
      const fromLobby = r.status === 'lobby' && round === 1;
      const fromBoard = r.status === 'board' && round === r.round + 1;
      if (!(fromLobby || fromBoard) || round > r.rounds || round > r.questions.length) return false;
      r.status = 'round';
      r.round = round;
      r.round_started_at = now();
      r.seq += 1;
      return true;
    },

    async submitAnswer(code, tokenHash, choice) {
      const r = [...rooms.values()].find((x) => x.code === code && open(x));
      if (!r) return { status: 'gone' };
      const roomId = r.id;
      const p = playersOf(roomId).find((x) => x.token_hash === tokenHash);
      if (!p) return { status: 'unauthorized' };
      if (p.removed_at !== null) return { status: 'removed' };
      const playerId = p.id;
      if (r.status !== 'round' || r.round_started_at === null) return { status: 'not_open' };
      const ms = now() - r.round_started_at;
      if (ms > r.seconds * 1000) return { status: 'late' };
      if (answers.some((a) => a.room_id === roomId && a.game === r.game && a.round === r.round && a.player_id === playerId)) {
        return { status: 'duplicate' };
      }
      answers.push({ room_id: roomId, game: r.game, round: r.round, player_id: playerId, choice, ms: Math.max(0, Math.round(ms)) });
      return { status: 'ok', ms: Math.max(0, Math.round(ms)), round: r.round };
    },

    async closeRound(roomId, game, round) {
      const r = rooms.get(roomId);
      if (!open(r) || r.game !== game || r.round !== round || r.status !== 'round') return false;
      r.status = 'reveal';
      r.seq += 1;
      return true;
    },

    async applyScores(roomId, game, round, rows) {
      const r = rooms.get(roomId);
      if (!open(r) || r.game !== game || r.round !== round || r.status !== 'reveal' || r.scored_round >= round) return false;
      for (const row of rows) {
        const p = players.get(row.player_id);
        if (!p || p.room_id !== roomId) continue;
        p.score = row.score;
        p.streak = row.streak;
        p.correct = row.correct;
        p.answered = row.answered;
        p.total_ms = row.total_ms;
        p.last_gain = row.gain;
        p.last_bonus = row.bonus;
        p.last_result = row.result;
      }
      r.scored_round = round;
      r.seq += 1;
      return true;
    },

    async moveStatus(roomId, from, to) {
      const r = rooms.get(roomId);
      if (!open(r) || r.status !== from) return false;
      r.status = to;
      r.seq += 1;
      return true;
    },

    async updateSettings(roomId, s) {
      const r = rooms.get(roomId);
      if (!open(r) || r.status !== 'lobby') return false;
      Object.assign(r, { playlist: s.playlist, label: s.label, rounds: s.rounds, seconds: s.seconds, questions: s.questions });
      r.seq += 1;
      return true;
    },

    async resetGame(roomId, s) {
      const r = rooms.get(roomId);
      if (!open(r) || r.status !== 'ended') return false;
      Object.assign(r, { playlist: s.playlist, label: s.label, rounds: s.rounds, seconds: s.seconds, questions: s.questions });
      r.status = 'lobby';
      r.game += 1;
      r.round = 0;
      r.round_started_at = null;
      r.scored_round = 0;
      r.seq += 1;
      for (const p of playersOf(roomId)) {
        Object.assign(p, { score: 0, streak: 0, correct: 0, answered: 0, total_ms: 0, last_gain: 0, last_bonus: 0, last_result: null });
      }
      return true;
    },

    async removePlayer(roomId, playerId) {
      const r = rooms.get(roomId);
      const p = players.get(playerId);
      if (!open(r) || !p || p.room_id !== roomId || p.removed_at !== null) return false;
      p.removed_at = now();
      r.seq += 1;
      return true;
    },

    async closeRoom(roomId) {
      const r = rooms.get(roomId);
      if (!open(r)) return false;
      r.status = 'closed';
      r.seq += 1;
      return true;
    },

    async expireRooms() {
      let closed = 0;
      let deleted = 0;
      for (const r of [...rooms.values()]) {
        if (r.expires_at > now()) continue;
        const wipe = (): void => {
          for (const p of playersOf(r.id)) players.delete(p.id);
          for (let i = answers.length - 1; i >= 0; i--) if ((answers[i] as MemAnswer).room_id === r.id) answers.splice(i, 1);
        };
        if (r.is_test) {
          wipe();
          rooms.delete(r.id);
          deleted += 1;
        } else if (r.status !== 'closed' || r.questions.length > 0) {
          wipe();
          r.status = 'closed';
          r.questions = [];
          r.host_token_hash = '';
          closed += 1;
        }
      }
      return { closed, deleted };
    },
  };
  return store;
}
