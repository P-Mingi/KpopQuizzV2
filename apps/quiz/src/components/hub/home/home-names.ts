// Run O1, lot H2a: the names the blocks of the home print, read from the registry (never written in a block).
import { REGISTRY, SITE } from '@/lib/site/registry';

import type { HomeSite } from '@/lib/site/hub/home-types';

/** The display name of a site of the home. */
export function siteName(site: HomeSite): string {
  return REGISTRY[site].brand.name;
}

/** The name of the hub itself (the wordmark of the navigation and of the footer). */
export function hubName(): string {
  return SITE.brand.name;
}
