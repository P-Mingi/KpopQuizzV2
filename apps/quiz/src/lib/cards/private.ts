// Bunnyverse Cards, review 1 finding 10: while the hub's private launch is on (lib/private-launch/config.ts), the Cards API answers only to
// the accounts the private launch allows; anyone else gets the 404 of a closed URL, like the Coming soon page answers the pages. kpopquiz.org
// never has a private launch (readPrivateLaunch answers off on kpop), so nothing changes there. Server only.
import { mayEnter, readPrivateLaunch } from '@/lib/private-launch/config';
import { SITE_ID } from '@/lib/site/registry';

import type { PrivateLaunchEnv } from '@/lib/private-launch/config';
import type { SiteId } from '@/lib/site/types';

/** True while the private launch is on for this build. */
export function privateLaunchOn(site: SiteId = SITE_ID, env: PrivateLaunchEnv = process.env): boolean {
  return readPrivateLaunch(site, env).on;
}

/** True when the private launch is on and this account (or a guest, null) may not enter: the Cards API then answers 404. */
export function privateLaunchBars(userId: string | null, site: SiteId = SITE_ID, env: PrivateLaunchEnv = process.env): boolean {
  const pl = readPrivateLaunch(site, env);
  return pl.on && !mayEnter(pl, userId);
}
