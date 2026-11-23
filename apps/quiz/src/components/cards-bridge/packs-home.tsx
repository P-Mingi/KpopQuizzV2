// Bunnyverse Cards, lane B, bridge 1, replaced by lane KCBANNER: server wrapper of the kpopquiz.org home block, loaded only by lib/cards-bridge/home.ts
// with NET_CARDS and NET_CARDS_BRIDGES on. It is the KpopCards banner of the hub home (cards-banner.tsx, one shared component with its own styles); the
// button takes the signed-in jump whose destination is bunnyverse.org/kpopcards, as every other kpop bridge does.
import { cardsHref, CARDS_PATH } from '@/lib/cards-bridge/links';

import { CardsBanner } from './cards-banner';

export function packsHome(): React.ReactElement {
  return <CardsBanner href={cardsHref(CARDS_PATH)} />;
}
