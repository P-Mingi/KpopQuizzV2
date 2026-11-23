// KpopCards: /kpopcards, the landing page and the lobby (the home page of the game). For every visitor, and for Googlebot, the server sends the one H1,
// the answer block, the lobby shell and the question H2s (lib/kpopcards/seo.ts); the signed-in player gets the lobby ("Your packs", an H2) filled in the browser.
// NET_CARDS off: 404 (the layout). Indexable once NET_INDEXING opens the hub (robotsFor(true) in cardsMetadata), with a self canonical.
import { CardsIntro, CardsJsonLd, CardsQuestions } from '@/components/cards/cards-landing';
import { LobbyData } from '@/components/cards/lobby-data';
import { readAdsContext } from '@/lib/cards/ads-server';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { dailyGroupOf } from '@/lib/cards/ui-daily';
import { cardsMetadata, cardsStats } from '@/lib/kpopcards/seo';

import type { Metadata } from 'next';

export const metadata: Metadata = cardsMetadata('landing');

export default async function KpopCardsLobbyPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  const stats = cardsStats(cat);
  return (
    <>
      <CardsJsonLd page="landing" stats={stats} />
      <CardsIntro stats={stats} />
      <LobbyData ads={await readAdsContext()} odds={cat?.odds ?? null} dailyGuest={cat ? dailyGroupOf(cat, Date.now()) : null} />
      <CardsQuestions />
    </>
  );
}
