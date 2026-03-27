import { getPopularGames } from '@/lib/db/queries/games';
import { GameCard } from '@/components/game/game-card';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K-pop Blind Tests - Guess the Song',
  description: 'Listen to K-pop song clips and guess the title. Test your ear with blind tests for BTS, BLACKPINK, aespa, and more.',
  alternates: { canonical: '/games' },
};

export const revalidate = 60;

export default async function GamesPage(): Promise<React.ReactElement> {
  const games = await getPopularGames(0, 20, 'blind_test');

  return (
    <div className="py-6">
      <h1 className="text-xl font-medium text-[var(--text-primary)] mb-1">Blind tests</h1>
      <p className="text-sm text-[var(--text-secondary)] mb-6">
        Listen to the clip and guess the song
      </p>

      <div className="space-y-3">
        {games.map(g => (
          <GameCard key={g.id} game={g} />
        ))}
      </div>

      {games.length === 0 && (
        <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No blind tests yet.</p>
      )}
    </div>
  );
}
