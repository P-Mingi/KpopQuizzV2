// KpopCards: /kpopcards/u/<nickname>, a player's page: the showcase of three starred cards and the badges. Nicknames only. Closed to search engines.
import { PlayerView } from '@/components/cards/ranking-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout has generateStaticParams and dynamicParams = false (O1 guard), and a dynamic segment of its own with no generateStaticParams still answers 404 under it.
// The rule for every dynamic page of the hub: dynamicParams = true AND a generateStaticParams (the finite values when they are finite, else an empty list: rendered on first request).
export const dynamicParams = true;
export function generateStaticParams(): { nickname: string }[] { return []; }

export const metadata: Metadata = { title: 'Player', robots: robotsFor(false) };

export default async function KpopCardsPlayerPage({ params }: { params: Promise<{ nickname: string }> }): Promise<React.ReactElement> {
  const { nickname } = await params;
  return <PlayerView nickname={decodeURIComponent(nickname)} />;
}
