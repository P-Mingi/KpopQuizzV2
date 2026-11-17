// Bunnyverse Cards, lane B (bridges): the switches. Server flags NET_CARDS and NET_CARDS_BRIDGES (kpopquiz.org and the hub), off by default
// (the bridges lead to the Cards pages, so they need NET_CARDS too, as lib/cards/flags.ts and flags-env.md say): with either off
// no bridge reads, imports or draws anything, so kpopquiz.org keeps its bytes. The ads switch is the hub's alone and kpopquiz.org never
// loads an ad script, flag or not.
import { cardsAdsOn as cardsAdsOnCore } from '@/lib/cards/flags';
import { readPrivateLaunch } from '@/lib/private-launch/config';
import { flagOn, SITE_ID } from '@/lib/site/registry';

/** Bridges on the kpopquiz.org build only (home block, group block, Collection of /me; the end of a quiz ships no Cards code and reports nothing: the quiz of the day's pack is recorded by the hub's server, 115). */
export function cardsBridgesKpopOn(): boolean {
  return SITE_ID === 'kpop' && flagOn(process.env.NET_CARDS) && flagOn(process.env.NET_CARDS_BRIDGES);
}

/** Bridges on the hub build only (Kpopdle-win line, Collection of /passport). */
export function cardsBridgesHubOn(): boolean {
  return SITE_ID === 'hub' && flagOn(process.env.NET_CARDS) && flagOn(process.env.NET_CARDS_BRIDGES);
}

/** The bridge switch on either build (the API route that answers the islands). */
export function cardsBridgesOn(): boolean {
  return cardsBridgesKpopOn() || cardsBridgesHubOn();
}

/** Server side of the ads layer: hub only. Both the server flag and its public twin must be on. */
export function cardsAdsOn(): boolean {
  return cardsAdsOnCore() && flagOn(process.env.NEXT_PUBLIC_NET_CARDS_ADS);
}

/**
 * The button to the Bunnyverse home in the nav of kpopquiz.org and OtakuQuiz. kpopquiz.org: the same switch as the cards bridges (NET_CARDS and
 * NET_CARDS_BRIDGES: the owner sets them only once the hub is open to the public). OtakuQuiz shares the hub's private launch gate, so it also needs
 * that gate off (lib/private-launch/config.ts, the gate the hub pages themselves sit behind) and NET_CARDS_BRIDGES on. Any other build: never.
 */
export function hubHomeLinkOn(): boolean {
  if (SITE_ID === 'kpop') return cardsBridgesKpopOn();
  if (SITE_ID === 'anime') return flagOn(process.env.NET_CARDS_BRIDGES) && !readPrivateLaunch('anime', process.env).on;
  return false;
}
