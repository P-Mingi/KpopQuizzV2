import Link from 'next/link';

import { getPopularGames } from '@/lib/db/queries/games';
import { GameCard } from '@/components/game/game-card';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Games - Blind Tests, This or That & More',
  description: 'Play fan-made K-pop games. Test your ear with blind tests, pick favorites in This or That matchups, and see what other fans chose.',
  alternates: { canonical: '/games' },
};

export const revalidate = 60;

export default async function GamesPage(): Promise<React.ReactElement> {
  const games = await getPopularGames(0, 20);

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-[var(--text-primary)] mb-1">Games</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Pick your favorites and see what other fans think
      </p>

      <div className="space-y-3">
        {games.map(g => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>

      {games.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No games yet.</p>
      )}

      <div className="mt-6 text-center">
        <Link
          href="/create"
          className="inline-block px-6 py-3 rounded-full bg-[var(--text-primary)] text-white text-sm font-medium"
        >
          Create a game
        </Link>
      </div>
    </div>
  );
}
