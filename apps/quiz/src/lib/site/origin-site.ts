// The site an address belongs to (the beacon's origin check), server side only (Bunnyverse review, 2026-10-28): it lived in
// registry.ts, which is in every client bundle of kpopquiz.org, and no client module calls it. Moved here so the kpop client JS
// does not carry it; registry.ts keeps the data (REGISTRY, parseNetOrigins) it reads.
import { REGISTRY, parseNetOrigins } from './registry';
import { SITE_IDS } from './types';

import type { NetOriginEnv } from './registry';
import type { SiteId } from './types';

/** The origin of an http(s) address and its base path ('' at the root), or null for anything else. */
function addressParts(address: string): { origin: string; path: string } | null {
  let u: URL;
  try {
    u = new URL(address);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  return { origin: u.origin, path: u.pathname === '/' ? '' : u.pathname };
}

/** The site whose base (an origin and an optional sub-folder) holds `at`; the longest sub-folder wins. */
function siteHolding(at: { origin: string; path: string }, bases: Partial<Record<SiteId, string>>): SiteId | null {
  let found: SiteId | null = null;
  let depth = -1;
  for (const id of SITE_IDS) {
    const base = bases[id] === undefined ? null : addressParts(bases[id]!);
    if (base === null || base.origin !== at.origin) continue;
    const inside = base.path === '' || at.path === base.path || at.path.startsWith(`${base.path}/`);
    if (inside && base.path.length > depth) {
      found = id;
      depth = base.path.length;
    }
  }
  return found;
}

/**
 * The site an address belongs to on this deployment (the beacon's origin check): a registry url always matches; outside
 * production an override of NEXT_PUBLIC_NET_ORIGINS matches too, with the sub-folder of the registry url. `address` is an Origin
 * header value or a full URL; anything that is not an http(s) address of a site of the network returns null.
 * The hub and OtakuQuiz share https://bunnyverse.org, and an Origin header carries no path: an origin alone names the site at the
 * root of its domain (the hub for https://bunnyverse.org, whichever of the two sent the request), so it says "a site of the
 * network", never "anime". 'anime' is the answer for an address under its sub-folder only (https://bunnyverse.org/anime,
 * .../anime/q/x): the longest sub-folder that holds the path wins. A caller that must tell the hub from /anime passes a full URL
 * (a redirect target, a Referer) or reads the build's SITE_ID.
 */
export function siteForOrigin(address: string, env: NetOriginEnv): SiteId | null {
  const at = addressParts(address);
  if (at === null) return null;
  const registry = siteHolding(at, Object.fromEntries(SITE_IDS.map((id) => [id, REGISTRY[id].url])));
  if (registry !== null || env.VERCEL_ENV === 'production') return registry;
  const o = parseNetOrigins(env.NEXT_PUBLIC_NET_ORIGINS);
  const overrides: Partial<Record<SiteId, string>> = {};
  for (const id of SITE_IDS) {
    const sub = addressParts(REGISTRY[id].url)?.path ?? '';
    if (o[id] !== undefined) overrides[id] = `${o[id]}${sub}`;
  }
  return siteHolding(at, overrides);
}
