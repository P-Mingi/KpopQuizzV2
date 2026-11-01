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
