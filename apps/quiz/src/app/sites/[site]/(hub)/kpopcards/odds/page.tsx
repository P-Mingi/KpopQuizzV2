// KpopCards: /kpopcards/odds, every pack's odds and the guarantees, from the real catalog (computeOdds): each card, the fifth card, how a card is drawn, and the pack rules.
// Server component. Indexable once NET_INDEXING opens the hub (cardsMetadata): the H1, the answer block from the odds, a self canonical, a breadcrumb.
import { CardsJsonLd, OddsIntro, OddsLinks } from '@/components/cards/cards-landing';
import { DropRates } from '@/components/cards/drop-rates';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { cardsMetadata } from '@/lib/kpopcards/seo';

import type { Metadata } from 'next';

export const metadata: Metadata = cardsMetadata('odds');

export default async function KpopCardsOddsPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  return (
    <article className="wrap help">
      <CardsJsonLd page="odds" />
      <OddsIntro odds={cat?.odds ?? null} />
      <p className="lede">A theme only changes which idols can come out, never the odds of an edition.</p>
      <div className="box" style={{ padding: '6px 20px 20px', marginTop: 22 }}><DropRates odds={cat?.odds ?? null} /></div>
      <OddsLinks />
    </article>
  );
}
