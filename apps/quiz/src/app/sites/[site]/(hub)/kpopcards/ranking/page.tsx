// KpopCards: /kpopcards/ranking, players ranked by the completion of their collection (friends first). Closed to search engines while the hub is private.
import { RankingView } from '@/components/cards/ranking-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ranking',
  description: 'KpopCards ranking: collections ranked by how complete they are, never by packs opened.',
  robots: robotsFor(false),
};

export default function KpopCardsRankingPage(): React.ReactElement {
  return <RankingView />;
}
