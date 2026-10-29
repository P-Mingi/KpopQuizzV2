// Bunnyverse (lane 3): the pure part of lib/auth/site-base.ts, with no import, so a shared client component (the /login body)
// can build a link of a world build without pulling the registry into the kpop bundle.

/** A path that safeReturnTo would keep as it is: a leading slash, not '//', no backslash. */
export function isSitePath(path: string): boolean {
  return path.length > 0 && path[0] === '/' && path[1] !== '/' && !path.includes('\\');
}

/**
 * The browser path of an app path of a build whose basePath is `base`: '/' becomes the base itself, '/?x' and '/#x' keep
 * their query or fragment on the base, any other path is appended. Anything that is not a same-site path answers the
 * home of the build (fail closed: the answer never leaves the base, and is never protocol-relative).
 */
export function joinBase(base: string, path: string): string {
  if (!isSitePath(path)) return base || '/';
  if (!base) return path;
  if (path === '/') return base;
  if (path[1] === '?' || path[1] === '#') return `${base}${path.slice(1)}`;
  return `${base}${path}`;
}

/**
 * The exact OAuth callback of a build whose base is `base` (origin and basePath): base + /auth/callback, never a query. Supabase's
 * Redirect URLs list it as it is, with no wildcard (security review, 2026-10-28): a pattern like 'callback**' also matched
 * 'callback/../../<any page>', which a browser normalises to any page of the shared origin.
 */
export function oauthCallbackUrl(base: string): string {
  return `${base}/auth/callback`;
}
