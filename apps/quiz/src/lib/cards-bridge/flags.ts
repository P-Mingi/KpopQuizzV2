// Bunnyverse Cards, lane B (bridges): the switches. Server flags NET_CARDS and NET_CARDS_BRIDGES (kpopquiz.org and the hub), off by default
// (the bridges lead to the Cards pages, so they need NET_CARDS too, as lib/cards/flags.ts and flags-env.md say): with either off
// no bridge reads, imports or draws anything, so kpopquiz.org keeps its bytes. The ads switch is the hub's alone and kpopquiz.org never
// loads an ad script, flag or not.
import { cardsAdsOn as cardsAdsOnCore } from '@/lib/cards/flags';
import { flagOn, SITE_ID } from '@/lib/site/registry';

/** Bridges on the kpopquiz.org build only (home block, group block, Collection of /me; a quiz end earns no bonus pack, review 1 finding 1). */
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
