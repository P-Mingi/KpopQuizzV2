import Link from 'next/link';

import { getPopularGames } from '@/lib/db/queries/games';
import { InfiniteGameList } from '@/components/game/infinite-game-list';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Games — This or That, Polls & More | KpopQuiz',
  description: 'Play fan-made K-pop games. Pick your favorites in This or That matchups and see what other fans chose. BTS, BLACKPINK, Stray Kids, and 30+ groups.',
  alternates: { canonical: '/games' },
  openGraph: {
    title: 'K-pop Games — This or That',
    description: 'Pick your favorites and see what other K-pop fans think.',
    url: '/games',
  },
};

export default async function GamesPage(): Promise<React.ReactElement> {
  const initialGames = await getPopularGames(0, 20);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-medium text-txt-primary">Games</h1>
        <Link
          href="/create?type=this_or_that"
          className="text-sm font-medium text-txt-secondary hover:text-txt-primary transition-colors"
        >
          Create a game +
        </Link>
      </div>
      <p className="text-sm text-txt-secondary mb-6">
        Pick your favorites and see what other fans think
      </p>

      {initialGames.length > 0 ? (
        <InfiniteGameList initialGames={initialGames} fetchUrl="/api/games?tab=popular" />
      ) : (
        <div className="text-center py-16">
          <p className="text-sm text-txt-secondary mb-4">No games yet. Be the first!</p>
          <Link
            href="/create?type=this_or_that"
            className="inline-block px-6 py-3 rounded-full bg-txt-primary text-white text-sm font-medium"
          >
            Create a game
          </Link>
        </div>
      )}
    </div>
  );
}
