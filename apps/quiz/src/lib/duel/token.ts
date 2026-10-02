// Voter hash and pair tokens for the This or that bonus (V12 G7). Server only.
//
// Voter hash: HMAC-SHA256 of the voter's identity (the signed-in user id, else the
// random browser id of lib/anon-id.ts), 32 hex characters. It is the only thing
// stored with a vote: no IP, no user agent, no user id. The same person gets the
// same hash every day, which is what "one vote per pair per day" needs; without
// the key the hash cannot be turned back into an id.
//
// Pair token: the server signs every pair it hands out (question, the two songs,
// the voter hash, an expiry). The vote route accepts a vote only with a valid
// token for the same voter, so a pair the server did not issue is refused, and so
// is a pair issued to someone else.
//
// Key: DUEL_SIGNING_SECRET when set; otherwise derived (HMAC, fixed label) from
// the service role key, which every server environment already has. The derived
// key never leaves the process. No key = no pair = the card stays hidden.

import { createHmac, timingSafeEqual } from 'crypto';

const LABEL = 'kpopquiz:v12:g7:duel';
export const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

export function duelKey(env: Record<string, string | undefined> = process.env): Buffer | null {
  const own = env.DUEL_SIGNING_SECRET;
  if (own && own.length >= 16) return createHmac('sha256', own).update(LABEL).digest();
  const base = env.SUPABASE_SERVICE_ROLE_KEY;
  if (base && base.length >= 16) return createHmac('sha256', base).update(LABEL).digest();
  return null;
}

/** identity: `u:<user id>` or `a:<browser id>` */
export function voterHash(key: Buffer, identity: string): string {
  return createHmac('sha256', key).update(`voter:${identity}`).digest('hex').slice(0, 32);
}

export interface PairClaims {
  /** question id */
  q: string;
  a: string;
  b: string;
  /** voter hash the pair was issued to */
  v: string;
  /** expiry, ms since epoch */
  exp: number;
}

const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64url');

function mac(key: Buffer, body: string): Buffer {
  return createHmac('sha256', key).update(`pair:${body}`).digest();
}

export function signPair(key: Buffer, claims: PairClaims): string {
  const body = b64(JSON.stringify([claims.q, claims.a, claims.b, claims.v, claims.exp]));
  return `${body}.${mac(key, body).toString('base64url')}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The claims of a token this server signed and that has not expired, else null. */
export function verifyPair(key: Buffer, token: unknown, now: number): PairClaims | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const dot = token.indexOf('.');
  if (dot <= 0 || dot !== token.lastIndexOf('.')) return null;
  const body = token.slice(0, dot);
  let given: Buffer;
  try { given = Buffer.from(token.slice(dot + 1), 'base64url'); } catch { return null; }
  const want = mac(key, body);
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  let parsed: unknown;
  try { parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch { return null; }
  if (!Array.isArray(parsed) || parsed.length !== 5) return null;
  const [q, a, b, v, exp] = parsed as unknown[];
  if (typeof q !== 'string' || typeof a !== 'string' || typeof b !== 'string' || typeof v !== 'string' || typeof exp !== 'number') return null;
  if (!UUID.test(q) || !UUID.test(a) || !UUID.test(b) || a === b) return null;
  if (exp < now) return null;
  return { q, a, b, v, exp };
}
