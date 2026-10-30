// ADMIN-1 (owner, 2026-10-30): the one reader of ADMIN_USER_IDS, free of imports so the edge middleware can use it too. Being listed grants
// nothing on its own: a request is an admin only through requireAdmin (lib/admin/guard.ts). Two other uses, both narrowing: the middleware
// answers the plain 404 to any path under /admin for an account that is not listed, and the publisher cron checks a STORED reviewer id.
function listedIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? '').split(',').map((id) => id.trim()).filter((id) => id.length > 0);
}

export function isListedAdminId(id: string | null | undefined): boolean {
  return typeof id === 'string' && id.length > 0 && listedIds().includes(id);
}
