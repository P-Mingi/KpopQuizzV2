// Bunnyverse Cards, lot 3 point A18: the guest demo pack, server side. The server draws the pack (rules.ts drawPack through
// draw.ts, crypto.randomInt) and signs it: the token is base64url(payload) + '.' + HMAC SHA-256 (hex) with the server secret
// CARDS_DEMO_SECRET. The token carries the five card numbers, its own id (jti: one claim per token), and its dates. Missing or short
// secret: no demo at all (demoSecret() is null; the pages show the sign-in call to action only). Server only (node:crypto).
// The device id and the IP address are never stored in the clear: hashDemo() makes the salted hash the claim function stores.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { cardsOpen } from './flags';
import { PACK_SIZE } from './rules';

/** A token is valid this long. The claim table keeps its rows 7 days, so a token must die well before that (106-demo.sql). */
export const DEMO_TTL_MS = 2 * 24 * 60 * 60 * 1000;
export const DEMO_SECRET_MIN = 16;
/** The device id the browser makes up and keeps (a random string): 16 to 64 URL-safe characters. */
export const DEVICE_RE = /^[A-Za-z0-9_-]{16,64}$/;

export interface DemoPayload {
  v: 1;
  jti: string;
  cards: number[];
  iat: number;
  exp: number;
}

/** The secret, or null when there is none (or it is too short to be one): then the demo is off. */
export function demoSecret(secret: string | undefined = process.env.CARDS_DEMO_SECRET): string | null {
  const s = secret;
  return typeof s === 'string' && s.length >= DEMO_SECRET_MIN ? s : null;
}

const b64 = (b: Buffer): string => b.toString('base64url');
const mac = (secret: string, body: string): Buffer => createHmac('sha256', secret).update(`demo.v1.${body}`).digest();

export function signDemo(cards: readonly number[], secret: string, now: number = Date.now(), jti: string = randomBytes(16).toString('hex')): string {
  const payload: DemoPayload = { v: 1, jti, cards: [...cards], iat: now, exp: now + DEMO_TTL_MS };
  const body = b64(Buffer.from(JSON.stringify(payload), 'utf8'));
  return `${body}.${b64(mac(secret, body))}`;
}

/** The payload of a token that is genuine, well formed and not expired; else null. The signature is compared in constant time. */
export function verifyDemo(token: unknown, secret: string, now: number = Date.now()): DemoPayload | null {
  if (typeof token !== 'string' || token.length > 600) return null;
  const dot = token.indexOf('.');
  if (dot < 1 || token.indexOf('.', dot + 1) !== -1) return null;
  const body = token.slice(0, dot);
  const sig = Buffer.from(token.slice(dot + 1), 'base64url');
  const want = mac(secret, body);
  if (sig.length !== want.length || !timingSafeEqual(sig, want)) return null;
  let p: unknown;
  try {
    p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!p || typeof p !== 'object') return null;
  const o = p as Partial<DemoPayload>;
  if (o.v !== 1 || typeof o.jti !== 'string' || !/^[0-9a-f]{32}$/.test(o.jti)) return null;
  if (!Array.isArray(o.cards) || o.cards.length !== PACK_SIZE || !o.cards.every((n) => Number.isInteger(n) && n > 0)) return null;
  if (typeof o.iat !== 'number' || typeof o.exp !== 'number' || o.exp <= now || o.iat > now + 60_000 || o.exp - o.iat > DEMO_TTL_MS) return null;
  return { v: 1, jti: o.jti, cards: o.cards, iat: o.iat, exp: o.exp };
}

/** The salted hash the claim table stores for a device id or an IP address (HMAC SHA-256 with the server secret, one key per kind). */
export function hashDemo(kind: 'device' | 'ip', value: string, secret: string): string {
  return createHmac('sha256', secret).update(`demo.${kind}.${value}`).digest('hex');
}

/** The caller's address as the platform reports it (first hop of x-forwarded-for, else x-real-ip); 'unknown' when there is none. */
export function clientIp(headers: Pick<Headers, 'get'>): string {
  const fwd = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return fwd || headers.get('x-real-ip')?.trim() || 'unknown';
}

/** True when the demo pack exists on this build: the Cards are open and a secret is set. The pages show the sign-in call to action only otherwise. */
export function demoOn(): boolean {
  return cardsOpen() && demoSecret() !== null;
}
