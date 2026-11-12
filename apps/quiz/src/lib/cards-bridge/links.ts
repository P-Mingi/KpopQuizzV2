// Bunnyverse Cards, lane B: the links from kpopquiz.org to the Cards pages of the hub, through the existing signed-in jump
// (`/auth/passport/out?to=hub&next=...&via=k.pp`, the shape of commonPassportHref). On the hub they are plain paths.
import { SITE } from '@/lib/site/registry';

import type { SiteId } from '@/lib/site/types';

export const CARDS_PATH = '/cards';
export const BINDER_PATH = '/cards/binder';
export const CREDITS_PATH = '/credits';

export function cardsHref(path: string, site: { readonly id: SiteId; readonly letter: string } = SITE): string {
  if (site.id === 'hub') return path;
  return `/auth/passport/out?to=hub&next=${encodeURIComponent(path)}&via=${site.letter}.pp`;
}
