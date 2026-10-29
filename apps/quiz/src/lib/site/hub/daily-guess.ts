// Home v3 (2026-10-29, docs/strategy/o1/dle/RAPPORT-JEUX-DU-JOUR-v2.md sections 3 and 12): the daily games of the Burrow (Kpopdle and
// Otakudle) are hidden until the owner turns them on, at step 4. `dailyGuess` is the server flag DAILY_GUESS (1 or true), off by default.
// The home shows the Burrow (its tab, its rows in Today, its line in the footer and in the SEO block) only when the flag is on AND the hub
// has the route (/daily, /kpopdle, /otakudle in the route map of the registry): a door is never drawn to a page that does not exist.

import { flagOn } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

/** The three pages of the Burrow on the hub. */
export const BURROW_PATHS = { burrow: '/daily', kpopdle: '/kpopdle', otakudle: '/otakudle' } as const;

/** The flag alone (DAILY_GUESS), off by default. */
export function dailyGuessOn(raw: string | undefined = process.env.DAILY_GUESS): boolean {
  return flagOn(raw);
}

/** True when the home may show the Burrow: the flag is on and the hub serves its three pages. */
export function burrowOpen(raw: string | undefined = process.env.DAILY_GUESS): boolean {
  return dailyGuessOn(raw) && Object.values(BURROW_PATHS).every((p) => isKnownRouteFor('hub', p, { v1: true, v12: true }));
}
