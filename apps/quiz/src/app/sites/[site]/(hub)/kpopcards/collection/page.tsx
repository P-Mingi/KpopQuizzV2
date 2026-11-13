// KpopCards: /kpopcards/collection, the binder of every group. The view and the sort are in the query (?view=pages|grid&sort=rarity|number|newest). Not indexed
// while the hub is private (decision 5).
import { Suspense } from 'react';

import { readAdsContext } from '@/lib/cards/ads-server';
import { BinderView } from '@/components/cards/binder-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collection',
  description: 'Your KpopCards collection: every card, owned or missing, one page per group.',
  robots: robotsFor(false),
};

export default async function KpopCardsCollectionPage(): Promise<React.ReactElement> {
  const ads = await readAdsContext();
  // useSearchParams needs a boundary; the fallback is the same empty frame the page draws before the browser has mounted.
  return <Suspense fallback={<div className="wrap page" aria-busy="true"><p className="lede">Loading your collection.</p></div>}><BinderView ads={ads} /></Suspense>;
}
