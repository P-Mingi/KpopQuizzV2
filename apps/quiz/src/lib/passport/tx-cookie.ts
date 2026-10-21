// Run O1, lane O1 (lot a, finishing): the name and the attributes of the transaction cookie of the relying party
// (docs/o1/contracts/cookies.md section 2), in one place. The three handlers of the jump that set or clear it (lib/passport/
// handoff.ts: /auth/arrive and /api/passport/redeem) read them here, and the dev-multi cookie spec
// (e2e/o1/dev-multi/cookies.o1.ts) imports `txCookieName` from this module.
//
// No Node API and no alias import: the module is loadable by a spec or by the edge. The cookie on the wire is the one B3 wrote
// in lib/passport/ticket.ts before this module existed (ticket.ts re-exports these two functions under their old names).

import { PASSPORT_SECONDS, TX_COOKIE_NAMES } from './types';

/** The environment the name reads: only VERCEL_ENV. */
export type TxCookieEnv = Readonly<Record<string, string | undefined>>;

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname.endsWith('.localhost');
}

/**
 * The name of the cookie for a request, or null when no transaction can be opened for it: `__Host-pp_tx` on every https
 * request (the forwarded proto counts) and always on a production deployment, `pp_tx` only on http requests to localhost or
 * `*.localhost`, null for anything else (the jump then falls back to the signed-out page) and for a URL that does not parse.
 * A server never reads `pp_tx` on an https request.
 */
export function txCookieNameFor(requestUrl: string | URL, forwardedProto: string | null = null, env: TxCookieEnv = process.env): string | null {
  let u: URL;
  try {
    u = typeof requestUrl === 'string' ? new URL(requestUrl) : requestUrl;
  } catch {
    return null;
  }
  const https = u.protocol === 'https:' || forwardedProto?.split(',')[0]?.trim() === 'https';
  if (https || env.VERCEL_ENV === 'production') return TX_COOKIE_NAMES.https;
  if (u.protocol === 'http:' && isLocalHost(u.hostname)) return TX_COOKIE_NAMES.devHttp;
  return null;
}

/**
 * The name for a URL, always a name (the contract table of cookies.md section 2 and the dev-multi spec): the `__Host-` one
 * unless the request is plain http to localhost or `*.localhost` outside production. A request that has no cookie name in
 * txCookieNameFor (an http request to a real host) gets `__Host-pp_tx` here, a name no browser will keep over http.
 */
export function txCookieName(url: string | URL, env: TxCookieEnv = process.env): string {
  return txCookieNameFor(url, null, env) ?? TX_COOKIE_NAMES.https;
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

/** The two things a handler does with the cookie, on a response object that has `cookies.set` (NextResponse). */
export interface CookieJar {
  cookies: { set(name: string, value: string, options: TxCookieAttributes): unknown };
}

/** Sets the transaction cookie on a response. */
export function setTxCookie<R extends CookieJar>(res: R, name: string, value: string): R {
  res.cookies.set(name, value, txCookieAttributes(name));
  return res;
}

/** Clears the transaction cookie on a response (same name and attributes, Max-Age=0). */
export function clearTxCookie<R extends CookieJar>(res: R, name: string): R {
  res.cookies.set(name, '', txCookieAttributes(name, 0));
  return res;
}
