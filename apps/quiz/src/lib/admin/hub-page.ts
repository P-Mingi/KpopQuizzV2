// ADMIN-2: what every page of the hub admin shares once its two guards have passed (requireAdminDoor, then requireAdmin).
import { parseSite } from './site';

import type { SiteId } from '@/lib/site/types';

export interface HubSearch { readonly site?: string | string[]; readonly q?: string | string[]; readonly status?: string | string[] }

/** The first value of a query parameter. */
export function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/** The site of the page: `?site=` when it is one of the three, else null (the all-sites view). Never a default: the choice is the admin's. */
export function siteOfPage(search: HubSearch | undefined): SiteId | null {
  return parseSite(first(search?.site));
}
