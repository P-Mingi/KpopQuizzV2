// KpopCards: /kpopcards/u/<nickname>, a player's page: the showcase of three starred cards and the badges. Nicknames only. Closed to search engines.
import { PlayerView } from '@/components/cards/ranking-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Player', robots: robotsFor(false) };

export default async function KpopCardsPlayerPage({ params }: { params: Promise<{ nickname: string }> }): Promise<React.ReactElement> {
  const { nickname } = await params;
  return <PlayerView nickname={decodeURIComponent(nickname)} />;
}
