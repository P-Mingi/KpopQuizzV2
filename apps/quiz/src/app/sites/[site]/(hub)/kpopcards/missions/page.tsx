// KpopCards: /kpopcards/missions, the sets with fixed rewards and the weekly list. Client view over the contract. Closed to search engines while the hub is private.
import { MissionsView } from '@/components/cards/missions-view';
import { robotsFor } from '@/lib/site/indexing';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Missions',
  description: 'KpopCards missions: sets that give packs once, and a weekly list that starts over every Monday.',
  robots: robotsFor(false),
};

export default function KpopCardsMissionsPage(): React.ReactElement {
  return <MissionsView />;
}
