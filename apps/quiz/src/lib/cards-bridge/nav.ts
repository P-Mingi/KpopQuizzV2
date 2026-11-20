// Bunnyverse Cards, lane BRIDGES: the two buttons of the top bar of kpopquiz.org and OtakuQuiz ("KpopCards" and "Bunnyverse"). Pure and server side:
// the shell asks once; off, it answers null and the shell's props carry no key, so the served HTML is today's. Both are plain links through the
// existing signed-in jump (cardsHref) on kpopquiz.org, and the hub's address on OtakuQuiz (same origin, another base path), never followed.
import { REGISTRY, SITE_ID } from '@/lib/site/registry';

import { cardsBridgesKpopOn, hubHomeLinkOn } from './flags';
import { CARDS_PATH, cardsHref } from './links';

export interface NavBridge {
  readonly key: 'cards' | 'hub';
  readonly label: string;
  readonly href: string;
}

export function navBridges(): readonly NavBridge[] | null {
  const out: NavBridge[] = [];
  if (cardsBridgesKpopOn()) out.push({ key: 'cards', label: 'KpopCards', href: cardsHref(CARDS_PATH) });
  if (hubHomeLinkOn()) out.push({ key: 'hub', label: 'Bunnyverse', href: SITE_ID === 'kpop' ? cardsHref('/') : `${REGISTRY.hub.url}/` });
  return out.length > 0 ? out : null;
}
