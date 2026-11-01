// Daily games step 4: the browser's calls to the four public functions of 019-dle-core.sql. The app never compares two entities: it shows what they send back. On
// dle_token_taken (a shared browser, the play belongs to another account) it draws a new token and tries once more, as the SQL asks.
import { getToken, resetToken } from './local';

import type { KeyStore } from './local';
import type { DleDay, DlePlayState } from './types';

/** The one thing the client needs of supabase-js: `rpc`. The tests give it a PGlite. */
export type DleRpc = (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;

export const DLE_ERRORS = [
  'dle_unavailable', 'dle_bad_date', 'dle_bad_token', 'dle_unknown_entity', 'dle_no_guess', 'dle_too_many_guesses', 'dle_rate_limited', 'dle_token_taken',
] as const;
export type DleErrorCode = (typeof DLE_ERRORS)[number] | 'dle_network';

export class DleError extends Error {
  constructor(readonly code: DleErrorCode) {
    super(code);
  }
}

/** The error code in a message of Postgres or PostgREST; anything else is a network failure. */
export function errorCode(message: string | undefined): DleErrorCode {
  const hit = DLE_ERRORS.find((c) => (message ?? '').includes(c));
  return hit ?? 'dle_network';
}

async function call<T>(rpc: DleRpc, fn: string, args: Record<string, unknown>): Promise<T> {
  let res: { data: unknown; error: { message?: string } | null };
  try {
    res = await rpc(fn, args);
  } catch (e) {
    throw new DleError(errorCode((e as Error)?.message));
  }
  if (res.error) throw new DleError(errorCode(res.error.message));
  return res.data as T;
}

export interface DleClient {
  day(game: string): Promise<DleDay>;
  guess(game: string, date: string, entity: string): Promise<DlePlayState>;
  giveUp(game: string, date: string): Promise<DlePlayState>;
}

export function dleClient(rpc: DleRpc, store: KeyStore): DleClient {
  /** One call with this browser's token; a taken token is replaced once. */
  async function withToken<T>(run: (token: string) => Promise<T>): Promise<T> {
    try {
      return await run(getToken(store));
    } catch (e) {
      if (e instanceof DleError && e.code === 'dle_token_taken') return run(resetToken(store));
      throw e;
    }
  }
  return {
    day: (game) => withToken((token) => call<DleDay>(rpc, 'dle_day', { p_game: game, p_token: token })),
    guess: (game, date, entity) => withToken((token) => call<DlePlayState>(rpc, 'dle_guess', { p_game: game, p_date: date, p_token: token, p_entity: entity })),
    giveUp: (game, date) => withToken((token) => call<DlePlayState>(rpc, 'dle_give_up', { p_game: game, p_date: date, p_token: token })),
  };
}

/** The value of ?r=: the right cells of each guess, at most 20 guesses (SHARE_R_PATTERN of games.ts). */
export function shareParam(counts: readonly number[]): string {
  return counts.slice(0, 20).join('-');
}
