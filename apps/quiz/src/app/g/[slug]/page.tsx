import { notFound } from 'next/navigation';

import { getGameBySlug } from '@/lib/db/queries/games';
import { BlindTestPlayer } from '@/components/game/blind-test-player';

import type { Metadata } from 'next';
import type { BlindTestContent } from '@/lib/db/types';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) return {};

  if (game.game_type === 'blind_test') {
    const content = game.content as BlindTestContent;
    return {
      title: `${game.title} - K-pop Blind Test`,
      description: `Listen to ${content.settings.song_count} song clips and guess the title. ${game.play_count} fans have played.`,
      alternates: { canonical: `/g/${game.slug}` },
      openGraph: {
        title: game.title,
        description: `${content.settings.song_count} songs, ${content.settings.clip_duration}s clips. Can you beat the average?`,
        url: `https://kpopquiz.org/g/${game.slug}`,
      },
    };
  }

  return {
    title: `${game.title} | KpopQuiz`,
    description: `${game.play_count} fans have played. Pick your favorite in each matchup.`,
    alternates: { canonical: `/g/${game.slug}` },
  };
}

export default async function GamePage({ params }: GamePageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);
  if (!game) notFound();

  if (game.game_type === 'blind_test') {
    return (
      <div className="py-6">
        <BlindTestPlayer game={game} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Game',
              name: game.title,
              description: `K-pop blind test with ${(game.content as BlindTestContent).settings.song_count} songs`,
              url: `https://kpopquiz.org/g/${game.slug}`,
              numberOfPlayers: { '@type': 'QuantitativeValue', value: 1 },
              publisher: { '@type': 'Organization', name: 'KpopQuiz', url: 'https://kpopquiz.org' },
            }),
          }}
        />
      </div>
    );
  }

  return notFound();
}
