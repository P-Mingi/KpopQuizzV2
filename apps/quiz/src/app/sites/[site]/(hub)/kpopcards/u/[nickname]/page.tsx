// KpopCards: /kpopcards/u/<nickname>, a player's page: the showcase of three starred cards and the badges. Nicknames only. Closed to search engines.
import { PlayerView } from '@/components/cards/ranking-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

// The [site] layout allows no param that was not generated at build (dynamicParams = false, O1 guard). An empty list of static params is not
// enough: a production server then answers every value with NoFallbackError (a 404; seen with next start on 2026-11-13). The rule of the
// hub's open-ended pages (as u/[username]): rendered per request, dynamicParams = true.
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export const metadata: Metadata = { title: 'Player', robots: robotsFor(false) };

export default async function KpopCardsPlayerPage({ params }: { params: Promise<{ nickname: string }> }): Promise<React.ReactElement> {
  const { nickname } = await params;
  return <PlayerView nickname={decodeURIComponent(nickname)} />;
}
