// KpopCards: /kpopcards/odds, every pack's odds and the guarantees, from the real catalog (computeOdds): each card, the fifth card, how a card is drawn, and the pack rules.
// Server component. Closed to search engines while the hub is private.
import { DropRates } from '@/components/cards/drop-rates';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Odds',
  description: 'The odds of every KpopCards pack and the guarantees, the same for everyone.',
  robots: robotsFor(false),
};

export default async function KpopCardsOddsPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  return (
    <article className="wrap help">
      <h1 className="h1" id="t-odds">Odds and guarantees</h1>
      <p className="lede">The same for everyone, in every pack. A theme or a focus pack only changes which idols can come out, never the odds of an edition.</p>
      <div className="box" style={{ padding: '6px 20px 20px', marginTop: 22 }}><DropRates odds={cat?.odds ?? null} /></div>
    </article>
  );
}
