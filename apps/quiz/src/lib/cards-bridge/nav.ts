// Bunnyverse Cards, lane BRIDGES: the "KpopCards" button of the top bar of kpopquiz.org. Pure and server side: the shell asks once; off, it answers
// null and the shell's props carry no key, so the served HTML is today's. A plain link through the existing signed-in jump (cardsHref), never
// followed. The "Bunnyverse" button it used to carry with it is now an entry of the site switcher (lib/site-switch/model.ts).
import { cardsBridgesKpopOn } from './flags';
import { CARDS_PATH, cardsHref } from './links';

export interface NavBridge {
  readonly key: 'cards';
  readonly label: string;
  readonly href: string;
}

export function navBridges(): readonly NavBridge[] | null {
  const out: NavBridge[] = [];
  if (cardsBridgesKpopOn()) out.push({ key: 'cards', label: 'KpopCards', href: cardsHref(CARDS_PATH) });
  return out.length > 0 ? out : null;
}
