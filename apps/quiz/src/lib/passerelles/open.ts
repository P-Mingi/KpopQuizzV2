// P5 (CR-025), the links between the sites and the daily games (Plan.dc.html). The one rule every link below shares: a link to a game of the Burrow exists only while the
// hub's `dailyGuess` is on, the game has its page, and the hub's route map carries that page. A door is never drawn to a page that answers 404. Pure, no I/O.
import { DAILY_PATH, dleGame } from '@/lib/dle/games';
import { dailyGuessOn } from '@/lib/site/hub/daily-guess';
import { REGISTRY } from '@/lib/site/registry';
import { isKnownRouteFor } from '@/lib/site/routing';

import type { DleGameId } from '@/lib/dle/games';
import type { SiteFeatures } from '@/lib/site/types';

/** True when the game's page exists on the hub: the switch is on, the game is built, the route map has its path. */
export function hubGameOpen(id: DleGameId, features: Readonly<SiteFeatures> = REGISTRY.hub.features): boolean {
  const g = dleGame(id);
  return dailyGuessOn(features) && g.built && isKnownRouteFor('hub', g.path, { v1: true, v12: true });
}

/** The same for the Burrow itself (/daily). */
export function hubBurrowOpen(features: Readonly<SiteFeatures> = REGISTRY.hub.features): boolean {
  return dailyGuessOn(features) && isKnownRouteFor('hub', DAILY_PATH, { v1: true, v12: true });
}
