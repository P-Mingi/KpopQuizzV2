// ADMIN-1 (owner, 2026-10-30): the one reader of ADMIN_USER_IDS and ADMIN_MFA_ENROL_OPEN, free of imports so the edge middleware can use it
// too. Being listed grants nothing on its own: a request is an admin only through requireAdmin (lib/admin/guard.ts). Two other uses, both
// narrowing: the middleware answers the plain 404 to any path under /admin for an account that may not go on (mayReachAdminPages), and the
// publisher cron checks a STORED reviewer id.
function listedIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '').split(',').map((id) => id.trim()).filter((id) => id.length > 0);
}

export function isListedAdminId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.length > 0 && listedIds().includes(id);
}

/**
 * The switch of TOTP enrolment (docs/o1/admin/MFA-OWNER.md). Off, the default: a listed account with no verified factor is refused like anyone,
 * so a stolen password cannot claim the TOTP of a listed id. The owner turns it on only while enrolling.
 */
export function adminEnrolOpen(): boolean {
  return process.env.ADMIN_MFA_ENROL_OPEN === '1';
}

/** A verified factor on a user the auth server has just returned (getUser). auth-js reads the same field for its nextLevel. */
export function hasVerifiedFactor(user: { readonly factors?: ReadonlyArray<{ readonly status?: string }> | null } | null | undefined): boolean {
  return (user?.factors ?? []).some((f) => f.status === 'verified');
}

/** Narrowing only, for the middleware: who may go on to an admin page, whose requireAdmin still decides. Everyone else gets the unknown URL's 404. */
export function mayReachAdminPages(user: { readonly id?: string; readonly factors?: ReadonlyArray<{ readonly status?: string }> | null } | null | undefined): boolean {
  return isListedAdminId(user?.id) && (hasVerifiedFactor(user) || adminEnrolOpen());
}
