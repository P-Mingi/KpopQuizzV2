// Where a sign-in flow may send the fan afterwards. `returnTo` comes from the
// URL, so it is attacker-controlled: a link like
// /auth/callback?returnTo=https://evil.tld would otherwise bounce a freshly
// signed-in fan to another site (open redirect). Only a same-site path is kept;
// anything else falls back to the home.
//
// Rejected: no leading slash, `//host` and `/\host` (both resolve to another
// host), any backslash or control character (the URL parser treats `\` as `/`
// and drops tab / CR / LF, so `/\t/evil.tld` would become `//evil.tld`), any
// scheme (`https:`, `javascript:`), and anything that does not resolve to the
// same origin. Pure and isomorphic: the callback route, the onboarding form and
// the login page all use it.
//
// Run O1 (B3): an optional third parameter names the site that will serve the path; the
// origin of the check is then that site's registry url. Without it the origin is today's
// literal, so every call of today answers exactly what it answered before.
//
// Security fix (Bunnyverse review, 2026-10-28): the answer is the path the URL parser NORMALISED, and dot segments can
// turn a path that passed the first checks into a protocol-relative one: '/.//evil.com', '/a/..//evil.com' and
// '/%2e//evil.com' all normalise to '//evil.com', which a browser reads as another host. A normalised answer that starts
// with two slashes (or a slash and a backslash) is refused like the raw form. kpop changes only for those inputs.
import { REGISTRY } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

const ORIGIN = 'https://kpopquiz.org';

export function safeReturnTo(raw: string | null | undefined, fallback = '/', site?: SiteId): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return fallback;
  if (raw[0] !== '/' || raw[1] === '/' || raw.includes('\\')) return fallback;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return fallback;
  }
  const origin = site === undefined ? ORIGIN : new URL(REGISTRY[site].url).origin;
  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return fallback;
  }
  if (url.origin !== origin) return fallback;
  const out = `${url.pathname}${url.search}${url.hash}`;
  if (out[1] === '/' || out[1] === '\\') return fallback;
  return out;
}
