// Bunnyverse Cards, lot 3 point A18: /cards/help, the Help tab of the Cards: how it works, the questions, then the photo credits. Server
// HTML under real headings, no FAQPage JSON-LD. NET_CARDS off: 404 (the layout). Closed to search engines while the hub is private.
import { CardsFaq } from '@/components/cards/cards-faq';
import { CardsCreditsSection } from '@/components/cards/credits-section';
import { cardCreditRows } from '@/lib/cards/ui-credit';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help',
  description: 'How Bunnyverse Cards works, the questions people ask, and the photo credits.',
  robots: robotsFor(false),
};

export default async function CardsHelpPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  const rows = cat ? cardCreditRows(cat) : [];
  return (
    <div className="wrap page">
      <h1 className="h1" id="t-help">Help</h1>
      <p className="lede">How Bunnyverse Cards works, in plain words.</p>
      <CardsFaq />
      {rows.length > 0 ? <div className="faq-credits"><CardsCreditsSection rows={rows} /></div> : null}
    </div>
  );
}
