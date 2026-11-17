// Bunnyverse Cards, lane BRIDGES: the row after a quiz result on kpopquiz.org that leads to KpopCards. Same gate as the home block
// (NET_CARDS and NET_CARDS_BRIDGES on the kpop build). Off: null, the run's props carry no key and the page is today's.
import { cardsBridgesKpopOn } from './flags';
import { CARDS_PATH, cardsHref } from './links';

export interface CardsEndBridge { readonly href: string }

export function cardsEndBridge(): CardsEndBridge | null {
  return cardsBridgesKpopOn() ? { href: cardsHref(CARDS_PATH) } : null;
}
