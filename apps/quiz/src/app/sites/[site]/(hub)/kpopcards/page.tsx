// KpopCards: /kpopcards, the lobby (the home page of the game): the pack, Choose your pack, Can't wait, Almost there, the last pull and the six colour boxes.
// NET_CARDS off: 404 (the layout). Closed to search engines while the hub is private (decision 5: indexing waits for the owner).
import { LobbyData } from '@/components/cards/lobby-data';
import { readAdsContext } from '@/lib/cards/ads-server';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { dailyGroupOf } from '@/lib/cards/ui-daily';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KpopCards',
  description: 'KpopCards: free K-pop photocards. A free pack every 10 minutes, six editions of every idol, no money and no market.',
  robots: robotsFor(false),
};

export default async function KpopCardsLobbyPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  return <LobbyData ads={await readAdsContext()} odds={cat?.odds ?? null} dailyGuest={cat ? dailyGroupOf(cat, Date.now()) : null} />;
}
