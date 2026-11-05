// ADMIN-1 (owner, 2026-10-30): the paths of the admin lock, free of server imports so the two MFA forms (client code) read the
// same values as lib/admin/guard.ts. The MFA pages live under /admin (the admin's own prefix on kpop and anime: refreshed by
// the middleware's session branch, known to both route maps) at a segment that no robots file, sitemap, link or nav names;
// only an admin at aal1 is ever sent there, and everyone else gets the 404 of the site.
export const ADMIN_HOME_PATH = '/admin';
export const ADMIN_MFA_DIR = '/admin/k7q2m';
export const ADMIN_MFA_CODE_PATH = `${ADMIN_MFA_DIR}/code`;
export const ADMIN_MFA_SETUP_PATH = `${ADMIN_MFA_DIR}/setup`;
/** The one route of the two MFA pages (app/api/admin/k7q2m/route.ts). */
export const ADMIN_MFA_API = '/api/admin/k7q2m';

// ADMIN-2 (owner, 2026-10-30): on the hub the MFA pages follow the secret address, /<ADMIN_PATH>/code and /<ADMIN_PATH>/setup. The prefix is
// read on the server (lib/admin/door.ts) and handed to the two forms as a prop: this module, which client code imports, never reads it.
export const ADMIN_DOOR_CODE_STEP = 'code';
export const ADMIN_DOOR_SETUP_STEP = 'setup';

export interface AdminPaths {
  /** Where the admin lands after the code: the home of the admin (the door, or /admin on kpop and anime). */
  readonly home: string;
  readonly code: string;
  readonly setup: string;
}

/** The paths of the admin behind a door prefix ('/<ADMIN_PATH>'), or the fixed ones of the kpop and anime admins when `prefix` is null. */
export function adminPathsFor(prefix: string | null): AdminPaths {
  if (prefix === null) return { home: ADMIN_HOME_PATH, code: ADMIN_MFA_CODE_PATH, setup: ADMIN_MFA_SETUP_PATH };
  return { home: prefix, code: `${prefix}/${ADMIN_DOOR_CODE_STEP}`, setup: `${prefix}/${ADMIN_DOOR_SETUP_STEP}` };
}

/**
 * The address an admin returns to after a new code: an internal path under the door prefix, or null. Never an external URL: the value must
 * start with '/<prefix>' followed by nothing or a '/', hold no scheme, no '//', no backslash, no dot segment, no encoded character and no
 * control character, and may not be the code or setup page itself (that would loop). Length is capped.
 */
export function safeAdminNext(raw: string | null | undefined, prefix: string): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 300) return null;
  if (!/^\/[A-Za-z0-9\-._~/?=&]*$/.test(raw)) return null;
  if (raw.includes('//') || raw.includes('..') || raw.includes('\\')) return null;
  const path = raw.split('?')[0]!;
  if (path !== prefix && !path.startsWith(`${prefix}/`)) return null;
  const tail = path.slice(prefix.length);
  if (tail === `/${ADMIN_DOOR_CODE_STEP}` || tail === `/${ADMIN_DOOR_SETUP_STEP}`) return null;
  return raw;
}
