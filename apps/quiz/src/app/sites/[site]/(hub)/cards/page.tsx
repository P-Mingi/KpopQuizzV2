// Bunnyverse Cards, lane U: /cards, the Packs page. NET_CARDS off: 404 (the layout). Closed to search engines while the hub is private
// (owner decision 5 of the Cards plan: indexing of /cards waits for the owner); robotsFor(false) keeps it so whatever NET_INDEXING says.
import { DropRates } from '@/components/cards/drop-rates';
import { PacksView } from '@/components/cards/packs-view';
import { readAdsContext } from '@/lib/cards/ads-server';
import { loadCatalog } from '@/lib/cards/ui-catalog';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Packs',
  description: 'Open Bunnyverse Cards packs: five cards a pack, a new pack every ten minutes, free.',
  robots: robotsFor(false),
};

export default async function CardsPacksPage(): Promise<React.ReactElement> {
  const cat = await loadCatalog();
  const rarities = [...new Set((cat?.cards ?? []).map((c) => c.rarity))];
  return <PacksView rates={<DropRates rarities={rarities} />} ads={await readAdsContext()} />;
}
