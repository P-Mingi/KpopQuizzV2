// PUSH-GATE-1 (VERSE_PUBLIC, rulings L-077/L-078): the pre-launch hide switch.
// PURE + edge-safe (no Supabase imports) so the middleware can import it. The privileged
// role check lives in roles.ts (isVersePrivileged) because it needs Supabase.
//
// Fail-closed: VERSE_PUBLIC absent or not exactly 'true' => the Verse is HIDDEN. Flip the
// env var to 'true' to relaunch (local dev sets it in .env.local, so gates are unaffected).

export function verseHidden(): boolean {
  return process.env.VERSE_PUBLIC !== 'true';
}

// V-FOUNDATION F1 Phase G / R1 (L-071): BTS-ONLY. stray-kids + ateez are UNPUBLISHED for the
// F-series - fail-closed 404 for non-privileged, ZERO data deleted, restore = remove a slug
// here (a code flip, no data touched). Independent of VERSE_PUBLIC: these stay parked even
// after the verse relaunches, until an owner restores them. The owner (isVersePrivileged)
// still sees them for editing.
const UNPUBLISHED_SPACES = new Set(['stray-kids', 'ateez']);

/** True when a space slug is parked (unpublished). A non-privileged visitor gets a 404; the
 * data is untouched, so restoring is just deleting the slug from the set above. */
export function spaceUnpublished(slug: string): boolean {
  return UNPUBLISHED_SPACES.has(slug);
}

// The two routes that stay public even while hidden: the teaser and the covenant.
// "We hide the product, never the promises." Everything else under the Verse surface
// (spaces, members, community, the builder, the verse admin queues) is gated.
const VERSE_ALLOWLIST = new Set(['/verse', '/verse/promises']);
const VERSE_ADMIN_PREFIXES = ['/admin/space-images', '/admin/member-review', '/admin/verse'];

/** True when this path is part of the gated Verse surface (hidden from anonymous visitors
 *  while VERSE_PUBLIC is off). The /verse teaser + /verse/promises are never gated. */
export function isGatedVersePath(pathname: string): boolean {
  if (VERSE_ALLOWLIST.has(pathname)) return false;
  if (pathname === '/build' || pathname.startsWith('/build/')) return true;
  if (pathname.startsWith('/verse/')) return true;
  return VERSE_ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// The Supabase SSR session cookie is `sb-<project-ref>-auth-token` (chunked into `.0`/`.1`
// for large sessions). The middleware only checks PRESENCE (never calls Supabase): no cookie
// = anonymous = redirect; a cookie = logged in = let the server-side role gate decide.
const AUTH_COOKIE_RE = /^sb-.*-auth-token/;
export function hasAuthCookie(cookieNames: string[]): boolean {
  return cookieNames.some((n) => AUTH_COOKIE_RE.test(n));
}
