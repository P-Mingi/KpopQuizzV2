// Run O1, lot (c) part 2, lane B3: the crypto of the passport jump (docs/o1/contracts/cookies.md 1 to 4). Server
// only (node:crypto): the ticket the source site mints, the signed transaction cookie of the relying party, PKCE,
// the one-time code and its hash, and the hashes of the client address. Names, labels, lifetimes and regexes come
// from lib/passport/types.ts (MAC_LABELS is the one place the domain labels live); nothing here reads a request.
//
// Encoding: b64u(x) is base64url without padding. Every MAC is HMAC-SHA256 keyed with PASSPORT_TICKET_SECRET (the
// same value on the three sites) over label + p, where p is the received base64url text of the JSON, never a
// re-serialisation. Every comparison of a MAC, a hash or a state is constant-time. A missing or too short secret
// means the jump is off (passportJumpOn), so no route ever signs with an empty key.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { flagOn, isSiteId } from '@/lib/site/registry';

import {
  B64U_16_RE, B64U_32_RE, MAC_LABELS, PASSPORT_LIMITS, PASSPORT_SECONDS, TX_COOKIE_NAMES,
} from './types';

import type { SiteId } from '@/lib/site/types';
import type { TicketPayload, TxCookiePayload } from './types';

/** The environment the jump reads (process.env in the routes, a plain object in tests). */
export type PassportEnv = Readonly<Record<string, string | undefined>>;

/** A secret shorter than this is treated as missing: the flag stays off rather than sign with a weak key. */
export const MIN_SECRET_LENGTH = 16;

const B64U_RE = /^[A-Za-z0-9_-]+$/;

export function b64u(data: Buffer | Uint8Array | string): string {
  return Buffer.from(data as Buffer).toString('base64url');
}

function b64uDecode(s: string): Buffer | null {
  if (!B64U_RE.test(s)) return null;
  return Buffer.from(s, 'base64url');
}

/** Constant-time string equality (a different length is a plain false: lengths are not secret here). */
export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

// ---------------------------------------------------------------------------------------------------------------
// Flag and secret
// ---------------------------------------------------------------------------------------------------------------

/** PASSPORT_TICKET_SECRET, or null when it is unset or shorter than MIN_SECRET_LENGTH. */
export function ticketSecret(env: PassportEnv = process.env): string | null {
  const s = env.PASSPORT_TICKET_SECRET?.trim() ?? '';
  return s.length >= MIN_SECRET_LENGTH ? s : null;
}

/** The jump is on only when the server flag PASSPORT_JUMP is on AND the shared secret is set (missing = off). */
export function passportJumpOn(env: PassportEnv = process.env): boolean {
  return flagOn(env.PASSPORT_JUMP) && ticketSecret(env) !== null;
}

// ---------------------------------------------------------------------------------------------------------------
// MAC, ticket, transaction cookie
// ---------------------------------------------------------------------------------------------------------------

function mac(secret: string, label: string, p: string): string {
  return b64u(createHmac('sha256', secret).update(label + p, 'utf8').digest());
}

function sealed(secret: string, label: string, payload: object): string {
  const p = b64u(JSON.stringify(payload));
  return `${p}.${mac(secret, label, p)}`;
}

/** Splits `p.s`, checks the MAC in constant time and returns the decoded JSON text of p, or null. */
function opened(secret: string, label: string, raw: string): unknown | null {
  const parts = raw.split('.');
  if (parts.length !== 2) return null;
  const [p, s] = parts as [string, string];
  if (!p || !s || !B64U_RE.test(p) || !B64U_RE.test(s)) return null;
  if (!safeEqual(mac(secret, label, p), s)) return null;
  const json = b64uDecode(p);
  if (!json) return null;
  try {
    return JSON.parse(json.toString('utf8')) as unknown;
  } catch {
    return null;
  }
}

/** Mints a ticket (cookies.md 1): keys in the order v, from, to, next, exp; `exp` is mint time + 10 minutes. */
export function signTicket(
  secret: string,
  t: { from: SiteId; to: SiteId; next: string },
  nowSec: number,
): string {
  const payload: TicketPayload = { v: 1, from: t.from, to: t.to, next: t.next, exp: nowSec + PASSPORT_SECONDS.ticket };
  return sealed(secret, MAC_LABELS.ticket, payload);
}

export type TicketFailure = 'format' | 'mac' | 'version' | 'to' | 'from' | 'expired' | 'next';
export type TicketCheck = { ok: true; ticket: TicketPayload } | { ok: false; reason: TicketFailure };

/**
 * Verifies a ticket on the target: MAC valid, v === 1, `to` is this site, `from` is a SiteId equal to the `from`
 * query parameter, exp in the future, and `next` equal to the `next` query parameter (a string, as received).
 */
export function verifyTicket(
  secret: string,
  raw: string,
  expect: { to: SiteId; from: string | null; next: string | null },
  nowSec: number,
): TicketCheck {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > PASSPORT_LIMITS.nextMaxLength * 2) {
    return { ok: false, reason: 'format' };
  }
  const parts = raw.split('.');
  if (parts.length !== 2) return { ok: false, reason: 'format' };
  const body = opened(secret, MAC_LABELS.ticket, raw);
  if (body === null) return { ok: false, reason: B64U_RE.test(parts[0] ?? '') && B64U_RE.test(parts[1] ?? '') ? 'mac' : 'format' };
  if (typeof body !== 'object' || body === null) return { ok: false, reason: 'format' };
  const t = body as Partial<Record<keyof TicketPayload, unknown>>;
  if (t.v !== 1) return { ok: false, reason: 'version' };
  if (!isSiteId(t.from) || !isSiteId(t.to) || typeof t.next !== 'string' || typeof t.exp !== 'number') {
    return { ok: false, reason: 'format' };
  }
  if (t.to !== expect.to) return { ok: false, reason: 'to' };
  if (t.from === t.to || expect.from === null || t.from !== expect.from) return { ok: false, reason: 'from' };
  if (!(t.exp > nowSec)) return { ok: false, reason: 'expired' };
  if (expect.next === null || t.next !== expect.next || t.next.length > PASSPORT_LIMITS.nextMaxLength) {
    return { ok: false, reason: 'next' };
  }
  return { ok: true, ticket: { v: 1, from: t.from, to: t.to, next: t.next, exp: t.exp } };
}

/** Seals the relying party's transaction cookie value (cookies.md 2): keys state, verifier, next, from, via, iat. */
export function signTx(secret: string, tx: TxCookiePayload): string {
  const payload: TxCookiePayload = {
    state: tx.state, verifier: tx.verifier, next: tx.next, from: tx.from, via: tx.via, iat: tx.iat,
  };
  return sealed(secret, MAC_LABELS.tx, payload);
}

export type TxFailure = 'format' | 'mac' | 'expired';
export type TxCheck = { ok: true; tx: TxCookiePayload } | { ok: false; reason: TxFailure; tx?: TxCookiePayload };

/**
 * Opens a transaction cookie: MAC valid and the fields well formed. A cookie past `iat + 300` is `expired` and is
 * returned with its payload, so the caller can still log it and send the visitor to its `next`.
 */
export function verifyTx(secret: string, raw: string | null | undefined, nowSec: number): TxCheck {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 4096) return { ok: false, reason: 'format' };
  const body = opened(secret, MAC_LABELS.tx, raw);
  if (body === null) return { ok: false, reason: 'mac' };
  if (typeof body !== 'object' || body === null) return { ok: false, reason: 'format' };
  const t = body as Partial<Record<keyof TxCookiePayload, unknown>>;
  if (
    typeof t.state !== 'string' || !B64U_16_RE.test(t.state)
    || typeof t.verifier !== 'string' || !B64U_32_RE.test(t.verifier)
    || typeof t.next !== 'string' || t.next.length > PASSPORT_LIMITS.nextMaxLength
    || !isSiteId(t.from)
    || !(t.via === null || typeof t.via === 'string')
    || typeof t.iat !== 'number' || !Number.isFinite(t.iat)
  ) {
    return { ok: false, reason: 'format' };
  }
  const tx: TxCookiePayload = { state: t.state, verifier: t.verifier, next: t.next, from: t.from, via: t.via, iat: t.iat };
  if (!(tx.iat + PASSPORT_SECONDS.txCookie > nowSec)) return { ok: false, reason: 'expired', tx };
  return { ok: true, tx };
}

// ---------------------------------------------------------------------------------------------------------------
// The transaction cookie's name and attributes (cookies.md 2)
// ---------------------------------------------------------------------------------------------------------------

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

/**
 * The cookie name follows the request: `__Host-pp_tx` on every https request (and always on a production
 * deployment), `pp_tx` only on http requests to localhost or *.localhost, and null otherwise (no transaction can
 * be opened, so the jump falls back to the signed-out page). A server never reads `pp_tx` on an https request.
 */
export function txCookieName(requestUrl: string, forwardedProto: string | null, env: PassportEnv = process.env): string | null {
  let u: URL;
  try {
    u = new URL(requestUrl);
  } catch {
    return null;
  }
  const https = u.protocol === 'https:' || forwardedProto?.split(',')[0]?.trim() === 'https';
  if (https || env.VERCEL_ENV === 'production') return TX_COOKIE_NAMES.https;
  if (u.protocol === 'http:' && isLocalHost(u.hostname)) return TX_COOKIE_NAMES.devHttp;
  return null;
}

export interface TxCookieAttributes {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax';
  readonly path: '/';
  readonly maxAge: number;
  /** Only on the clearing cookie: the epoch, so a client that drops a falsy Max-Age=0 still deletes the cookie. */
  readonly expires?: Date;
}

/**
 * HttpOnly, SameSite=Lax, Path=/, Max-Age=300, no Domain; Secure whenever the name is the `__Host-` one. With
 * maxAge 0 (clearing) the same attributes plus an Expires in the past: Next re-serialises the cookies of a response
 * that also set session cookies and then writes no Max-Age=0, so the Expires is what deletes the cookie there.
 */
export function txCookieAttributes(name: string, maxAge: number = PASSPORT_SECONDS.txCookie): TxCookieAttributes {
  const base = { httpOnly: true, secure: name === TX_COOKIE_NAMES.https, sameSite: 'lax', path: '/', maxAge } as const;
  return maxAge === 0 ? { ...base, expires: new Date(0) } : base;
}

// ---------------------------------------------------------------------------------------------------------------
// PKCE, state, code (cookies.md 2 and 3)
// ---------------------------------------------------------------------------------------------------------------

/** 16 random bytes in base64url: the state (22 characters). */
export function newState(): string {
  return b64u(randomBytes(16));
}

/** 32 random bytes in base64url: the PKCE verifier (43 characters, RFC 7636 section 4.1). */
export function newVerifier(): string {
  return b64u(randomBytes(32));
}

/** 32 random bytes in base64url: the one-time code (43 characters). */
export function newCode(): string {
  return b64u(randomBytes(32));
}

/** PKCE S256: b64u(SHA256(verifier)), 43 characters. */
export function pkceChallenge(verifier: string): string {
  return b64u(createHash('sha256').update(verifier, 'utf8').digest());
}

/** The stored form of a code: lowercase hex of SHA256(code), 64 characters. The code itself is never stored. */
export function codeHash(code: string): string {
  return createHash('sha256').update(code, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------------------------------------------
// The visitor, for the event log
// ---------------------------------------------------------------------------------------------------------------

/**
 * Hash of the client address with NET_IP_HASH_SALT (HMAC-SHA256, lowercase hex). Null when the address or the salt
 * is missing: no address is ever stored in clear, and without the salt nothing is stored at all.
 */
export function ipHash(ip: string | null, env: PassportEnv = process.env): string | null {
  const salt = env.NET_IP_HASH_SALT?.trim() ?? '';
  if (!ip || salt.length === 0) return null;
  return createHmac('sha256', salt).update(ip, 'utf8').digest('hex');
}

/** First address of the proxy headers (Vercel sets x-vercel-forwarded-for / x-forwarded-for / x-real-ip). */
export function clientIp(headers: { get(name: string): string | null }): string | null {
  const raw = headers.get('x-vercel-forwarded-for') ?? headers.get('x-forwarded-for') ?? headers.get('x-real-ip');
  const first = raw?.split(',')[0]?.trim();
  return first ? first : null;
}

/** A coarse browser family for the log (never the full user agent). */
export function uaFamily(ua: string | null): string {
  if (!ua) return 'unknown';
  if (/bot|crawl|spider|slurp|curl|wget|headless|python|java\/|go-http|node/i.test(ua)) return 'bot';
  if (/edg(e|a|ios)?\//i.test(ua)) return 'edge';
  if (/opr\/|opera/i.test(ua)) return 'opera';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  if (/chrome|chromium|crios/i.test(ua)) return 'chrome';
  if (/safari/i.test(ua)) return 'safari';
  return 'other';
}
