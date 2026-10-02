// Shapes of the live blindtest: what the database holds (server only), what the
// store hands to the service, and what the API and the broadcast send to a
// browser. No import with a side effect: safe everywhere.

import type { LiveStatus } from './constants';
import type { RoundResult } from './scoring';

/** One round. Stored in `live_rooms.questions`; `correct` and `preview_url` never reach a phone. */
export interface LiveQuestion {
  song_id: string;
  kind: 'title' | 'artist';
  /** "Which song is this?" or "Who sings this?". */
  prompt: string;
  /** The four answers, in the order of the four colours and shapes. */
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  preview_url: string;
}

export interface LiveRoom {
  id: string;
  code: string;
  host_token_hash: string;
  playlist: string;
  label: string;
  rounds: number;
  seconds: number;
  status: LiveStatus;
  /** 1 for the first game of the room; "Play again" adds one. */
  game: number;
  /** 0 in the lobby, then the round being played or shown. */
  round: number;
  /** Database time of the round start, epoch ms. */
  round_started_at: number | null;
  /** The last round whose scores are applied. */
  scored_round: number;
  /** Grows with every change a phone must see. */
  seq: number;
  is_test: boolean;
  expires_at: number;
}

export interface LivePlayer {
  id: string;
  token_hash: string;
  nickname: string;
  colour: number;
  score: number;
  streak: number;
  correct: number;
  answered: number;
  total_ms: number;
  last_gain: number;
  last_bonus: number;
  last_result: RoundResult | null;
  /** Epoch ms when the host removed the player, else null. */
  removed_at: number | null;
  /** A number that grows with the join order (the database gives microseconds). */
  joined_at: number;
}

export interface LiveAnswer {
  player_id: string;
  choice: number;
  /** Database time from the round start to the answer, ms. */
  ms: number;
}

/** Everything the service needs about a room, read in one call. */
export interface RoomSnapshot {
  room: LiveRoom;
  /** The question of `room.round` (null in the lobby). */
  question: LiveQuestion | null;
  /** The question of the next round (the host preloads its clip), null after the last. */
  next: LiveQuestion | null;
  /** Every player, removed ones included (the service hides them). */
  players: LivePlayer[];
  /** Answers of the current game and round. */
  answers: LiveAnswer[];
  /** Database time, epoch ms. */
  now: number;
}

export interface ScoreRow {
  player_id: string;
  score: number;
  streak: number;
  correct: number;
  answered: number;
  total_ms: number;
  gain: number;
  bonus: number;
  result: RoundResult;
}

// ---------------------------------------------------------------------------
// What a browser sees.
// ---------------------------------------------------------------------------

export interface LivePublicPlayer {
  id: string;
  name: string;
  colour: number;
  score: number;
  /** Points of the last scored round. */
  gain: number;
  /** The streak part of `gain`. */
  bonus: number;
  streak: number;
  result: RoundResult | null;
  /** 1 for the leader. */
  rank: number;
}

export interface LiveReveal {
  correct: number;
  answer: string;
  counts: [number, number, number, number];
  song_id: string;
  kind: 'title' | 'artist';
}

/** Broadcast to the room and returned by the state route. Nothing in it is secret. */
export interface LivePublicState {
  v: 1;
  code: string;
  /** Realtime topic of the room (private channel). */
  topic: string;
  seq: number;
  status: LiveStatus;
  game: number;
  round: number;
  rounds: number;
  seconds: number;
  label: string;
  /** Server time when this state was built, epoch ms: the browser derives its clock offset from it. */
  now: number;
  started_at: number | null;
  ends_at: number | null;
  prompt: string | null;
  max: number;
  /** Phones that answered the current round. */
  answered: number;
  /** In leaderboard order. */
  players: LivePublicPlayer[];
  /** The right answer and the counts, from the reveal on. */
  reveal: LiveReveal | null;
}

export interface LiveHostQuestion {
  prompt: string;
  options: [string, string, string, string];
  preview_url: string;
}

/** The host screen also gets the clip and the answer texts of the current round. */
export interface LiveHostState extends LivePublicState {
  host: { question: LiveHostQuestion | null; next_preview_url: string | null };
}

/** A phone also gets its own row and its answer of the current round. */
export interface LivePlayerState extends LivePublicState {
  you: { id: string; name: string; colour: number; answer: { choice: number; ms: number } | null };
}

export type LiveErrorCode =
  | 'not_live' | 'not_found' | 'bad_request' | 'bad_code' | 'unauthorized' | 'forbidden' | 'removed' | 'gone'
  | 'full' | 'rate_limited' | 'nickname_empty' | 'nickname_too_long' | 'nickname_blocked'
  | 'late' | 'duplicate' | 'not_open' | 'bad_state' | 'server_error';

export interface LiveResult<T = Record<string, unknown>> {
  status: number;
  body: T | { error: LiveErrorCode };
}
