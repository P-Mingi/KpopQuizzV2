// The production store of the live blindtest: the tables and functions of
// docs/pending-migrations/v12-g4-live.sql, called with the service role (RLS has
// no policy on the three tables, so nothing else can read or write them).
//
// Fail soft: until the owner applies the SQL, PostgREST answers "relation does not
// exist" / "function not found"; that becomes LiveNotLiveError and the routes
// answer 503 `not_live`. A missing service key does the same. Server only.

import { LiveNotLiveError } from './store';

import type { LiveStatus } from './constants';
import type { AnswerOutcome, JoinOutcome, LiveStore, NewRoom } from './store';
import type { LivePlayer, RoomSnapshot, ScoreRow } from './types';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PgError { code?: string | null; message?: string | null }

/** The table or the function is not there yet (same test as lib/tracking/bt-server.ts). */
export function isLiveNotLive(error: PgError | null | undefined): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === '42P01' || code === '42883' || code === 'PGRST205' || code === 'PGRST202' || code === 'PGRST204') return true;
  return /does not exist|could not find the (table|function)|schema cache/i.test(error.message ?? '');
}

function fail(step: string, error: PgError): never {
  if (isLiveNotLive(error)) throw new LiveNotLiveError();
  // The message of a database error can quote a value: keep the code only.
  throw new Error(`live store: ${step} failed (${error.code ?? 'no code'})`);
}

type Settings = Pick<NewRoom, 'playlist' | 'label' | 'rounds' | 'seconds' | 'questions'>;

export function supabaseStore(db: SupabaseClient): LiveStore {
  async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    const { data, error } = await db.rpc(fn, args);
    if (error) fail(fn, error);
    return data as T;
  }
  const settingsArgs = (roomId: string, s: Settings): Record<string, unknown> => ({
    p_room: roomId, p_playlist: s.playlist, p_label: s.label, p_rounds: s.rounds, p_seconds: s.seconds, p_questions: s.questions,
  });

  return {
    async ping() {
      // A GET, not a HEAD: on a HEAD the client reads the empty 404 of a missing table as
      // "no content" and reports no error, so the mode would look open before the SQL is applied.
      const { error } = await db.from('live_rooms').select('id').limit(1);
      if (error) fail('ping', error);
    },

    async recentRooms(ipHash, sinceMs) {
      const since = new Date(Date.now() - sinceMs).toISOString();
      // The exact count comes in a header; one row at most is fetched (PostgREST caps a
      // select at 1000 rows, so rows are never counted in JS). GET for the reason above.
      const { count, error } = await db
        .from('live_rooms')
        .select('id', { count: 'exact' })
        .eq('ip_hash', ipHash)
        .gte('created_at', since)
        .limit(1);
      if (error) fail('recentRooms', error);
      if (count === null || count === undefined) throw new LiveNotLiveError();
      return count;
    },

    async createRoom(room) {
      const id = await rpc<string | null>('live_create_room', {
        p_code: room.code,
        p_host_token_hash: room.host_token_hash,
        p_playlist: room.playlist,
        p_label: room.label,
        p_rounds: room.rounds,
        p_seconds: room.seconds,
        p_questions: room.questions,
        p_is_test: room.is_test,
        p_ip_hash: room.ip_hash,
      });
      return id ? { id } : null;
    },

    async getRoom(code) {
      return rpc<RoomSnapshot | null>('live_room_state', { p_code: code });
    },

    async join(roomId, tokenHash, nickname, colour, max) {
      const out = await rpc<{ status: string; player?: LivePlayer }>('live_join', {
        p_room: roomId, p_token_hash: tokenHash, p_nickname: nickname, p_colour: colour, p_max: max,
      });
      if (out.status === 'ok' && out.player) return { status: 'ok', player: out.player };
      return { status: out.status === 'full' ? 'full' : 'gone' } satisfies JoinOutcome;
    },

    async startRound(roomId, game, round) {
      return (await rpc<boolean>('live_start_round', { p_room: roomId, p_game: game, p_round: round })) === true;
    },

    async submitAnswer(code, tokenHash, choice) {
      const out = await rpc<{ status: string; ms?: number; round?: number }>('live_submit_answer', {
        p_code: code, p_token_hash: tokenHash, p_choice: choice,
      });
      if (out.status === 'ok') return { status: 'ok', ms: Number(out.ms ?? 0), round: Number(out.round ?? 0) };
      const known = ['late', 'duplicate', 'not_open', 'removed', 'unauthorized', 'gone'] as const;
      const status = known.find((s) => s === out.status) ?? 'gone';
      return { status } satisfies AnswerOutcome;
    },

    async closeRound(roomId, game, round) {
      return (await rpc<boolean>('live_close_round', { p_room: roomId, p_game: game, p_round: round })) === true;
    },

    async applyScores(roomId, game, round, rows: ScoreRow[]) {
      return (await rpc<boolean>('live_apply_scores', { p_room: roomId, p_game: game, p_round: round, p_rows: rows })) === true;
    },

    async moveStatus(roomId, from: LiveStatus, to: LiveStatus) {
      return (await rpc<boolean>('live_move_status', { p_room: roomId, p_from: from, p_to: to })) === true;
    },

    async updateSettings(roomId, s) {
      return (await rpc<boolean>('live_update_settings', settingsArgs(roomId, s))) === true;
    },

    async resetGame(roomId, s) {
      return (await rpc<boolean>('live_reset_game', settingsArgs(roomId, s))) === true;
    },

    async removePlayer(roomId, playerId) {
      return (await rpc<boolean>('live_remove_player', { p_room: roomId, p_player: playerId })) === true;
    },

    async closeRoom(roomId) {
      return (await rpc<boolean>('live_close_room', { p_room: roomId })) === true;
    },

    async expireRooms() {
      const out = await rpc<{ closed?: number; deleted?: number } | null>('live_expire_rooms', {});
      return { closed: Number(out?.closed ?? 0), deleted: Number(out?.deleted ?? 0) };
    },
  };
}
