// Live blindtest (SYSTEM.md 5.5): the numbers every side agrees on. Pure, safe in
// the browser, on the server and in the load script. The SQL file
// docs/pending-migrations/v12-g4-live.sql repeats the limits as CHECK constraints.

/** Phones in one room (the host screen is not a player). */
export const LIVE_MAX_PLAYERS = 50;
/** A room lives two hours from its creation, whatever happens in it. */
export const LIVE_ROOM_TTL_MS = 2 * 60 * 60 * 1000;

export const LIVE_ROUND_OPTIONS = [5, 10, 15] as const;
export const LIVE_SECOND_OPTIONS = [10, 15, 20] as const;
export const LIVE_DEFAULT_ROUNDS = 5;
export const LIVE_DEFAULT_SECONDS = 15;
/** The load test plays 20 rounds in one room; the setup screen offers 5, 10, 15. */
export const LIVE_MAX_ROUNDS = 20;

export const LIVE_NICK_MAX = 16;
/** Avatar colours: the four answer colours (A1 `--ux-lt-a..d`). */
export const LIVE_COLOURS = 4;

/** Rooms one address may open in ten minutes (hashed address, never stored raw). */
export const LIVE_CREATE_LIMIT = 10;
export const LIVE_CREATE_WINDOW_MS = 10 * 60 * 1000;

/** Realtime topic of a room: private channel, phones only receive. */
export function liveTopic(roomId: string): string {
  return `live:${roomId}`;
}

/** Broadcast event name: one event, the full public state, ordered by `seq`. */
export const LIVE_EVENT = 'state';

/** Header carrying the host token or the player token. */
export const LIVE_TOKEN_HEADER = 'x-live-token';

export type LiveStatus = 'lobby' | 'round' | 'reveal' | 'board' | 'ended' | 'closed';
export const LIVE_STATUSES: readonly LiveStatus[] = ['lobby', 'round', 'reveal', 'board', 'ended', 'closed'];
