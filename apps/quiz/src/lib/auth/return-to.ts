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
const ORIGIN = 'https://kpopquiz.org';

export function safeReturnTo(raw: string | null | undefined, fallback = '/'): string {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return fallback;
  if (raw[0] !== '/' || raw[1] === '/' || raw.includes('\\')) return fallback;
  for (let i = 0; i < raw.length; i++) {
    const c = raw.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return fallback;
  }
  let url: URL;
  try {
    url = new URL(raw, ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== ORIGIN) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
