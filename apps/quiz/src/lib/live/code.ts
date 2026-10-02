// Room codes: six characters a person can read off a TV and type on a phone.
// No I, O, 0 or 1 (they read alike), no lower case. 32 symbols, so 32^6 (about one
// billion) codes: a code is a way in, not a secret. What protects a room is the
// 50 player cap, the nickname filter, the host's remove button and the tokens.

export const LIVE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const LIVE_CODE_LENGTH = 6;

const CODE_RE = new RegExp(`^[${LIVE_CODE_ALPHABET}]{${LIVE_CODE_LENGTH}}$`);

/** Random bytes source: crypto in the browser, in Node and on the edge. */
function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n);
  crypto.getRandomValues(out);
  return out;
}

/**
 * A fresh code. 32 symbols = 5 bits, so one random byte masked to 5 bits picks a
 * symbol with no modulo bias. `bytes` is injectable for tests.
 */
export function newRoomCode(bytes: (n: number) => Uint8Array = randomBytes): string {
  const b = bytes(LIVE_CODE_LENGTH);
  let code = '';
  for (let i = 0; i < LIVE_CODE_LENGTH; i++) code += LIVE_CODE_ALPHABET[(b[i] ?? 0) & 31];
  return code;
}

/** What a person typed, tidied: upper case, spaces and dashes dropped. */
export function normalizeRoomCode(input: unknown): string {
  return String(input ?? '').toUpperCase().replace(/[\s-]+/g, '').slice(0, LIVE_CODE_LENGTH * 2);
}

export function isRoomCode(code: string): boolean {
  return CODE_RE.test(code);
}

/** The code of a typed value, or null when it cannot be one. */
export function parseRoomCode(input: unknown): string | null {
  const code = normalizeRoomCode(input);
  return isRoomCode(code) ? code : null;
}
