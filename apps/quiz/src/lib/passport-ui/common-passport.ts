// The one link to the common Bunnyverse passport (the hub page /passport) from any build. On the hub it is the page itself; on
// kpop and anime it is the same-origin signed-in jump `/auth/passport/out?to=hub&next=/passport&via=<letter>.pp` (apis.md 2.1),
// which each build serves under its own base path (a next/link adds /anime on the anime build, a plain <a> adds BASE_PATH).
// A relative "/passport" is never right off the hub: on anime it would be /anime/passport, which no page serves.
import { SITE } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

export const COMMON_PASSPORT_PATH = '/passport';

export function commonPassportHref(site: { readonly id: SiteId; readonly letter: string } = SITE): string {
  if (site.id === 'hub') return COMMON_PASSPORT_PATH;
  return `/auth/passport/out?to=hub&next=${encodeURIComponent(COMMON_PASSPORT_PATH)}&via=${site.letter}.pp`;
}

/**
 * The props of the "Passport" doors of the shared chrome (account menu, streak popover). kpop keeps today's `/profile` (its own
 * passport page; the markup and the Flight shape of its menu are pinned by __o1_kpop_nav__, so no new prop there). Every other build
 * goes to the common passport: `/profile` is a kpop-only path and a 404 on anime and on the hub.
 */
export function passportDoorProps(site: { readonly id: SiteId; readonly letter: string } = SITE): { href: string; prefetch?: false } {
  return site.id === 'kpop' ? { href: '/profile' } : { href: commonPassportHref(site), prefetch: false };
}
