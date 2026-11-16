// KpopCards: /kpopcards/credits, every photo used by a card with its author, licence, source and what was changed (the full list the Help page links to).
// NET_CARDS off: 404 (the layout). Closed to search engines while the hub is private.
import { CardsCreditsSection } from '@/components/cards/credits-section';
import { cardCreditRows } from '@/lib/cards/ui-credit';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Photo credits',
  description: 'Every photo used in KpopCards, with its author, licence and source.',
  robots: robotsFor(false),
};

export default async function KpopCardsCreditsPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  const rows = cat ? cardCreditRows(cat) : [];
  return (
    <article className="wrap help">
      <h1 className="h1" id="t-credits">Photo credits</h1>
      <p className="lede">Every photo used in the game is listed here, with its author, licence, source and what was changed. A card made from a CC BY-SA photo is shared under CC BY-SA too.</p>
      {rows.length > 0 ? <div className="faq-credits" id="photo-credits"><CardsCreditsSection rows={rows} /></div> : <p className="emptyline">No photo is in use yet.</p>}
    </article>
  );
}
