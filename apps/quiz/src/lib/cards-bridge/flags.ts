// Bunnyverse Cards, lane B (bridges): the switches. Server flag NET_CARDS_BRIDGES (kpopquiz.org and the hub), off by default: with it off
// no bridge reads, imports or draws anything, so kpopquiz.org keeps its bytes. The ads switch is the hub's alone and kpopquiz.org never
// loads an ad script, flag or not.
import { flagOn, SITE_ID } from '@/lib/site/registry';

/** Bridges on the kpopquiz.org build only (home block, group block, quiz-end line, Collection of /me). */
export function cardsBridgesKpopOn(): boolean {
  return SITE_ID === 'kpop' && flagOn(process.env.NET_CARDS_BRIDGES);
}

/** Bridges on the hub build only (Kpopdle-win line, Collection of /passport). */
export function cardsBridgesHubOn(): boolean {
  return SITE_ID === 'hub' && flagOn(process.env.NET_CARDS_BRIDGES);
}

/** The bridge switch on either build (the API route that answers the islands). */
export function cardsBridgesOn(): boolean {
  return cardsBridgesKpopOn() || cardsBridgesHubOn();
}

/** Server side of the ads layer: hub only. Both the server flag and its public twin must be on. */
export function cardsAdsOn(): boolean {
  return SITE_ID === 'hub' && flagOn(process.env.NET_CARDS_ADS) && flagOn(process.env.NEXT_PUBLIC_NET_CARDS_ADS);
}
