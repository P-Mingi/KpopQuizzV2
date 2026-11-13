// KpopCards: /kpopcards/u/<nickname>, a player's page: the showcase of three starred cards and the badges. Nicknames only. Closed to search engines.
import { PlayerView } from '@/components/cards/ranking-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout sets dynamicParams = false (O1 guard); a dynamic segment without generateStaticParams needs true or it never matches (the catch-all answers 404).
export const dynamicParams = true;

export const metadata: Metadata = { title: 'Player', robots: robotsFor(false) };

export default async function KpopCardsPlayerPage({ params }: { params: Promise<{ nickname: string }> }): Promise<React.ReactElement> {
  const { nickname } = await params;
  return <PlayerView nickname={decodeURIComponent(nickname)} />;
}
