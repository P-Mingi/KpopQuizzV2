// Bunnyverse (security review, 2026-10-28; lane 3): where Google and Discord send the visitor back to, kept on the server.
//
// GET /auth/start (lib/passport/signin.ts handleOAuthStart) asks Supabase for the provider URL with the EXACT callback of the
// build as redirectTo (no query string, so Supabase's Redirect URLs list it with no wildcard), and keeps the return path, the
// tab's via and the provider in this short-lived first-party cookie. The callback reads it, checks it again (safeAppPath, VIA_RE,
// the provider of the site) and clears it on every answer.
//
// The cookie: HttpOnly (only the server reads it), SameSite=Lax (the provider's redirect is a top-level GET), Path=/, 600 s,
// `__Host-fv_oauth` (Secure, no Domain) on every https request and always on a production deployment, `fv_oauth` only on plain
// http to localhost or *.localhost (the naming rule of the passport's transaction cookie, lib/passport/tx-cookie.ts).
// Server only (Buffer). The value is not secret and not signed: it is set and read by this origin only and re-checked on read.

import { VIA_RE } from '@/lib/network/types';
import { TX_COOKIE_NAMES } from '@/lib/passport/types';
import { txCookieNameFor } from '@/lib/passport/tx-cookie';
import { isSiteId } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

/** The OAuth providers a world site may offer (registry auth.providers of anime and hub, without email). */
export const OAUTH_PROVIDERS = ['google', 'discord'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export const OAUTH_RETURN_COOKIE = { https: '__Host-fv_oauth', devHttp: 'fv_oauth' } as const;

/** Lifetime of the cookie: enough for a consent screen, short enough to be stale soon after. */
export const OAUTH_RETURN_SECONDS = 600;

/** Longest value accepted on read (a 2048 character path, a via, the JSON keys, base64url). */
const MAX_COOKIE_LENGTH = 3000;

export interface OAuthReturn {
  readonly site: SiteId;
  readonly provider: OAuthProvider;
  /** An app path (safeAppPath answer). */
  readonly next: string;
  readonly via: string | null;
  /** Unix seconds when /auth/start set it. */
  readonly iat: number;
}

export function isOAuthProvider(v: unknown): v is OAuthProvider {
  return v === 'google' || v === 'discord';
}

/** The cookie name for a request (null when no cookie can be set: plain http to a host that is not localhost). */
export function oauthReturnCookieName(
  requestUrl: string | URL,
  forwardedProto: string | null,
  env: { readonly VERCEL_ENV?: string | undefined },
): string | null {
  const tx = txCookieNameFor(requestUrl, forwardedProto, { VERCEL_ENV: env.VERCEL_ENV });
  if (tx === TX_COOKIE_NAMES.https) return OAUTH_RETURN_COOKIE.https;
  if (tx === TX_COOKIE_NAMES.devHttp) return OAUTH_RETURN_COOKIE.devHttp;
  return null;
}

export interface OAuthReturnAttributes {
  readonly httpOnly: true;
  readonly secure: boolean;
  readonly sameSite: 'lax';
  readonly path: '/';
  readonly maxAge: number;
  readonly expires?: Date;
}

/** HttpOnly, SameSite=Lax, Path=/, no Domain, Secure with the `__Host-` name; maxAge 0 clears it (with an Expires in the past). */
export function oauthReturnAttributes(name: string, maxAge: number = OAUTH_RETURN_SECONDS): OAuthReturnAttributes {
  const base = { httpOnly: true, secure: name === OAUTH_RETURN_COOKIE.https, sameSite: 'lax', path: '/', maxAge } as const;
  return maxAge === 0 ? { ...base, expires: new Date(0) } : base;
}

export function encodeOAuthReturn(r: OAuthReturn): string {
  return Buffer.from(JSON.stringify({ site: r.site, provider: r.provider, next: r.next, via: r.via, iat: r.iat }), 'utf8').toString('base64url');
}

/**
 * The cookie of `site`, or null: malformed, another site's, an unknown provider, a via that fails VIA_RE, a next that is not
 * a string of at most 2048 characters, or older than OAUTH_RETURN_SECONDS (or from the future). `next` is re-checked by the
 * caller with safeAppPath.
 */
export function decodeOAuthReturn(raw: string | null | undefined, site: SiteId, nowSec: number): OAuthReturn | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > MAX_COOKIE_LENGTH || !/^[A-Za-z0-9_-]+$/.test(raw)) return null;
  let v: unknown;
  try {
    v = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!isSiteId(o.site) || o.site !== site || !isOAuthProvider(o.provider)) return null;
  if (typeof o.next !== 'string' || o.next.length > 2048) return null;
  if (!(o.via === null || (typeof o.via === 'string' && VIA_RE.test(o.via)))) return null;
  if (typeof o.iat !== 'number' || !Number.isFinite(o.iat)) return null;
  if (o.iat > nowSec + 60 || o.iat + OAUTH_RETURN_SECONDS <= nowSec) return null;
  return { site: o.site, provider: o.provider, next: o.next, via: o.via as string | null, iat: o.iat };
}
