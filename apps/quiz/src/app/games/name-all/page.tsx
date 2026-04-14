import { getNameAllGames } from '@/lib/db/queries/games';
import { safeFetch } from '@/lib/error-handling';
import { NameAllLanding } from '@/components/game/name-all-landing';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Name All Members - K-pop Typing Game | KpopQuiz',
  description: 'Can you name every member of BTS, BLACKPINK, SEVENTEEN, Stray Kids before time runs out? 24 groups available. Blind mode and photo clue mode.',
  alternates: { canonical: '/games/name-all' },
};

export default async function NameAllLandingPage(): Promise<React.ReactElement> {
  const games = await safeFetch(getNameAllGames(0, 50), [], '[name-all] getGames');

  return (
    <div className="py-6">
      <NameAllLanding games={games} />
    </div>
  );
}
