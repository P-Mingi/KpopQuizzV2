// ADMIN-2: forSite and withSite bound to the site an admin call named (lib/admin/site.ts), so a route reads
//   const { forSite, withSite } = siteScope(site);
// and every query it already writes as forSite(query) / withSite(row) filters by THAT site, not by the build's SITE_ID. The routes of
// app/api/admin never import lib/site/scope directly (admin-site.static.test.ts).
import { forSite as scopedRead, siteScoped, withSite as scopedInsert } from '@/lib/site/scope';

import type { SiteId } from '@/lib/site/types';

export interface SiteScope {
  readonly site: SiteId;
  /** True when forSite really filters for this site on this build (false only for kpop on the kpop build with SITE_SCOPE off: today's queries). */
  readonly scoped: boolean;
  /** `query.eq('site_id', site)` (see lib/site/scope.ts for when the filter applies). */
  forSite<Q extends { readonly eq: unknown }>(query: Q): Q;
  /** A copy of `row` with site_id set to the site, for an insert or upsert. */
  withSite<T extends object>(row: T): T & { readonly site_id: SiteId };
}

export function siteScope(site: SiteId): SiteScope {
  return {
    site,
    scoped: siteScoped(site),
    forSite: (query) => scopedRead(query, site),
    withSite: (row) => scopedInsert(row, site),
  };
}
