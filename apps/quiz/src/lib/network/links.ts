// Run O1, lot (c), lane B6: the two links of the network (types.ts NetLinkFns, apis.md 2.1, link-allowlist.md).
import { REGISTRY, SITE } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';
import type { NetBridgeId, NetLinkFns } from './types';

/** A site-relative path: it starts with one slash, never two, never a scheme. Anything else becomes the home. */
function sitePath(path: string): string {
  return /^\/(?!\/)[^\\\s]*$/.test(path) ? path : '/';
}

/**
 * A signed-in UI link: the same-origin jump of this site, `/auth/passport/out?to=<dst>&next=<path>&via=<letter>.<id>`.
 * Never an absolute URL, never a token.
 */
export const bridgeHref: NetLinkFns['bridgeHref'] = (dst: SiteId, path: string, bridge: NetBridgeId) =>
  `/auth/passport/out?to=${dst}&next=${encodeURIComponent(sitePath(path))}&via=${SITE.letter}.${bridge}`;

/** An editorial link (followed, crawlable): the canonical url of `dst` and the path, no query. */
export const editorialHref: NetLinkFns['editorialHref'] = (dst: SiteId, path: string) =>
  `${REGISTRY[dst].url}${sitePath(path.split(/[?#]/)[0] ?? '/')}`;
