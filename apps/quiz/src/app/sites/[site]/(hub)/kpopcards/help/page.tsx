// KpopCards: /kpopcards/help, the Help tab (v6): how it works, the questions, the credits and "Report a photo". Server HTML under real headings, no FAQPage JSON-LD.
// NET_CARDS off: 404 (the layout). Closed to search engines while the hub is private.
import Link from 'next/link';

import { CardsFaq } from '@/components/cards/cards-faq';
import { HelpDemo } from '@/components/cards/help-demo';
import { kcPath } from '@/lib/cards/kc-paths';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help',
  description: 'How KpopCards works, the questions people ask, and the photo credits.',
  robots: robotsFor(false),
};

export default function KpopCardsHelpPage(): React.ReactElement {
  return (
    <article className="wrap help">
      <h1 className="h1" id="t-help">How KpopCards works</h1>
      <p className="lede">A free card game of K-pop idols. Every photo is free to reuse and credited on the card.</p>
      <CardsFaq><HelpDemo /></CardsFaq>
      <h2 id="credits">Credits</h2>
      <p className="lede" style={{ fontSize: '15.5px' }}>Every photo used in the game is listed on the credits page, with its author, licence, source and what was changed (cropped, frame and text added). A card made from a CC BY-SA photo is shared under CC BY-SA too.</p>
      <p style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 10 }}><Link href={kcPath.credits} className="btn-outline">All photo credits</Link><Link href={kcPath.report} className="btn-quiet">Report a photo</Link></p>
    </article>
  );
}
