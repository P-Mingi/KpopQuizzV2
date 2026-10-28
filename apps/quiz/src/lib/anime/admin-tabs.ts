// Run O1 (ADM front): the tabs of /admin on fandomverse.org/anime. Images first; to add a tab, add a row here and a branch in the page.

export const ADMIN_TABS = [
  { id: 'images', label: 'Images' },
  { id: 'overview', label: 'Overview' },
] as const;

export type AdminTabId = (typeof ADMIN_TABS)[number]['id'];

/** The tab named by `?tab=`: the first one when it is missing, repeated or unknown. */
export function adminTabOf(raw: string | readonly string[] | undefined): AdminTabId {
  const v = typeof raw === 'string' ? raw : undefined;
  return ADMIN_TABS.find((t) => t.id === v)?.id ?? ADMIN_TABS[0].id;
}

/** The gate of the admin page: true only for a signed-in account that `isAdmin` accepts; everything else is a 404 (the page calls notFound). */
export function adminGate(userId: string | null | undefined, isAdminFn: (id: string) => boolean): 'ok' | 'notfound' {
  return userId && isAdminFn(userId) ? 'ok' : 'notfound';
}
