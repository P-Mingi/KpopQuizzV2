// Bunnyverse Cards, lane U: /cards/binder. The view and the sort are in the query (?view=pages|grid&sort=rarity|number|newest). Not indexed
// while the hub is private (decision 5).
import { Suspense } from 'react';

import { BinderView } from '@/components/cards/binder-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Binder',
  description: 'Your Bunnyverse Cards binder: every card, owned or missing, in pages of nine.',
  robots: robotsFor(false),
};

export default function CardsBinderPage(): React.ReactElement {
  // useSearchParams needs a boundary; the fallback is the same empty frame the page draws before the browser has mounted.
  return <Suspense fallback={<div className="wrap page"><h1 className="h1">Binder</h1></div>}><BinderView /></Suspense>;
}
