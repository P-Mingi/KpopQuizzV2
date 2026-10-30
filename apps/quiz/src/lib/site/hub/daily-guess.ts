// Home v3 (2026-10-29, docs/strategy/o1/dle/RAPPORT-JEUX-DU-JOUR-v2.md sections 3 and 12): the daily games of the Burrow (Kpopdle and
// Otakudle) are hidden until the owner turns them on, at step 4. The owner's switch is the registry feature `dailyGuess` of the hub (daily
// games step 1 adds `readonly dailyGuess: boolean` to SiteFeatures, false on every site); a registry without the key reads as off.
// The home shows the Burrow (its tab, its rows in Today, its line in the footer and in the SEO block) only when the feature is on AND the
// hub has the route (/daily, /kpopdle, /otakudle in the route map of the registry): a door is never drawn to a page that does not exist.

import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

import type { SiteFeatures } from '@/lib/site/types';

/** The three pages of the Burrow on the hub. */
export const BURROW_PATHS = { burrow: '/daily', kpopdle: '/kpopdle', otakudle: '/otakudle' } as const;

/** The registry feature `dailyGuess` alone: true only when the key is there and on; a missing key is false. */
export function dailyGuessOn(features: Readonly<SiteFeatures> = REGISTRY.hub.features): boolean {
  // Narrow cast: daily games step 1 (not on main yet) adds `dailyGuess` to SiteFeatures. Drop the cast once step 1 is on main.
  return (features as Readonly<SiteFeatures> & { readonly dailyGuess?: boolean }).dailyGuess === true;
}

/** True when the home may show the Burrow: the feature is on and the hub serves its three pages. */
export function burrowOpen(features: Readonly<SiteFeatures> = REGISTRY.hub.features): boolean {
  return dailyGuessOn(features) && Object.values(BURROW_PATHS).every((p) => isKnownRouteFor('hub', p, { v1: true, v12: true }));
}
