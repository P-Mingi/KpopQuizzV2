// ADMIN-2 (owner, 2026-10-30; docs/o1/admin/PLAN-ADMIN-2.md section 1): the secret door of the one admin. The admin of the three sites
// lives on the hub build of bunnyverse.org at /<ADMIN_PATH>. The hub middleware, and it alone, rewrites that address to the internal tree
// (app/sites/[site]/(hub)/admin/...) and sets a request header on the rewrite; the layout of the tree answers notFound() without it.
//
// ADMIN_PATH is a secret (a Sensitive variable of the fandomverse project only). This module is its ONE reader (admin-door.static.test.ts):
// it is free of imports so the edge middleware can use it, it never logs the value, and nothing here is inlined in a client bundle (the
// variable has no NEXT_PUBLIC_ prefix; the two forms that need the prefix get it as a server prop).
//
// The header carries a value derived from ADMIN_PATH (a SHA-256), not a flag: a client that forges the header name cannot guess the value
// without the address, so the strip in the middleware is the first wall and the value is the second.

/** The request header the middleware sets on the rewrite of the door and strips from every other request. */
export const ADMIN_DOOR_HEADER = 'x-admin-door';
/** The public path the visitor asked for (prefix included), so a code page can send the admin back to it. Only trusted behind a valid door header. */
export const ADMIN_DOOR_NEXT_HEADER = 'x-admin-door-next';
/** The internal folder of the admin tree, as a public-style path: the catch-all of the hub build puts /sites/hub in front of it. */
export const ADMIN_INTERNAL_ROOT = '/admin';

type Env = Readonly<Record<string, string | undefined>>;

/**
 * 20 to 64 lowercase letters, digits and dashes, starting and ending with a letter or a digit. A shorter or odder value is no door at all (fail
 * closed: a weak address is worse than none). No dot: a dotted last segment would be taken for a file by the matcher of the middleware.
 */
const NAME_RE = /^[a-z0-9][a-z0-9-]{18,62}[a-z0-9]$/;
/** The middleware matcher skips a first segment ending -quiz or -trivia: such a value would never reach the door. */
const MATCHER_SKIPPED_SUFFIX = /-(?:quiz|trivia)$/;

/** The configured address segment, or null when ADMIN_PATH is absent or not a usable value (then the admin does not exist: 404 everywhere). */
export function adminPathName(env: Env = process.env): string | null {
  const value = (env.ADMIN_PATH ?? '').trim();
  return NAME_RE.test(value) && !MATCHER_SKIPPED_SUFFIX.test(value) ? value : null;
}

/** '/<ADMIN_PATH>' or null. For server code that builds the links of the admin (it reaches the admin's browser only, as props). */
export function adminDoorPrefix(env: Env = process.env): string | null {
  const name = adminPathName(env);
  return name === null ? null : `/${name}`;
}

/** The tail of a door address that maps to a page of the tree: '', '/code', '/quizzes'. Anything odder is no page of the admin. */
const TAIL_RE = /^(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/**
 * The internal path a public path opens, or null when it is not the door. '/<door>' gives '/admin', '/<door>/code' gives '/admin/code'.
 * A longer first segment that merely starts like the door (a partial prefix), a tail that is no page name and any other path give null,
 * so they get the answer of an unknown URL.
 */
export function adminDoorTarget(pathname: string, env: Env = process.env): string | null {
  const prefix = adminDoorPrefix(env);
  if (prefix === null) return null;
  if (pathname === prefix) return ADMIN_INTERNAL_ROOT;
  if (!pathname.startsWith(`${prefix}/`)) return null;
  const tail = pathname.slice(prefix.length).replace(/\/+$/, '');
  return TAIL_RE.test(tail) ? `${ADMIN_INTERNAL_ROOT}${tail}` : null;
}

const toHex = (buf: ArrayBuffer): string => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** The value of the door header for this ADMIN_PATH, or null without a door. Web Crypto: the same call on the edge and in Node. */
export async function adminDoorValue(env: Env = process.env): Promise<string | null> {
  const name = adminPathName(env);
  if (name === null) return null;
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`admin-door|v1|${name}`)));
}

/** True only for the exact value the middleware sets. Compared without stopping at the first different character. */
export async function isAdminDoorValue(value: string | null | undefined, env: Env = process.env): Promise<boolean> {
  if (typeof value !== 'string' || value.length === 0) return false;
  const want = await adminDoorValue(env);
  if (want === null || value.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i += 1) diff |= value.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}
