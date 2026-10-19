// Run O1, lane B1 (rpcs.md 3, manifest.md cron table, apis.md 5). vercel.json is shared by the three
// Vercel projects, so every cron fires on every site: a cron route calls `cronForSite([...])` right
// after its auth check and returns the answer when it is not null. A site outside the list gets a
// 200 `{ "skipped": true }` and the work does not run. Node and edge safe: no next/* import.

import { SITE_ID } from './registry';

import type { SiteId } from './types';

/** The answer of a cron that does not act on `site`, or null when it does. */
export function cronSkipFor(site: SiteId, sites: readonly SiteId[]): Response | null {
  if (sites.includes(site)) return null;
  return new Response(JSON.stringify({ skipped: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

/** `SiteServerFns['cronForSite']`: null when the site of this build is in `sites`, else the skipped answer. */
export function cronForSite(sites: readonly SiteId[]): Response | null {
  return cronSkipFor(SITE_ID, sites);
}
