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
 * The props of the "Passport" doors of the shared chrome (account menu, streak popover).
 *  - kpop keeps today's `/profile` (its own passport page; the markup and the Flight shape of its menu are pinned by __o1_kpop_nav__,
 *    so no new prop there).
 *  - anime (owner, 2026-11-09): its own `/profile` too, the OtakuQuiz passport (app/sites/[site]/(anime)/profile redirects to /me as
 *    kpop's /profile does; a next/link adds /anime). That page links the common Bunnyverse passport.
 *  - the hub: the common passport, its own page `/passport`.
 */
export function passportDoorProps(site: { readonly id: SiteId; readonly letter: string } = SITE): { href: string; prefetch?: false } {
  if (site.id === 'kpop') return { href: '/profile' };
  if (site.id === 'anime') return { href: '/profile', prefetch: false };
  return { href: commonPassportHref(site), prefetch: false };
}
