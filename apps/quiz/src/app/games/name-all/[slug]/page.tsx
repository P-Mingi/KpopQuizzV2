import { notFound } from 'next/navigation';

import { getNameAllGameBySlug } from '@/lib/db/queries/games';
import { NameAllPlayer } from '@/components/game/name-all-player';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';
import type { NameAllMembersContent } from '@/lib/db/types';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await safeFetch(getNameAllGameBySlug(slug), null, '[name-all] getGame');
  if (!game) return { title: 'Game Not Found' };

  const content = game.content as NameAllMembersContent;
  const memberCount = content.members.length;
  const timer = content.timer_seconds;
  const groupName = game.group_name ?? 'K-pop';

  const description = `Can you name all ${memberCount} ${groupName} members in ${timer} seconds? ${game.play_count.toLocaleString('en-US')} fans have tried. Blind mode and photo clue mode.`;

  return {
    title: `${game.title} - K-pop Member Game | KpopQuiz`,
    description,
    openGraph: {
      title: `${game.title} | KpopQuiz`,
      description,
      url: `/games/name-all/${slug}`,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/games/name-all/${slug}` },
  };
}

export default async function NameAllGamePage({ params }: PageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const game = await safeFetch(getNameAllGameBySlug(slug), null, '[name-all] getGame');

  if (!game) notFound();

  const content = game.content as NameAllMembersContent;

  return (
    <div className="py-4 md:py-6">
      <NameAllPlayer game={game} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Game',
            name: game.title,
            description: `Name all ${content.members.length} ${game.group_name ?? 'K-pop'} members before time runs out.`,
            url: `https://kpopquiz.org/games/name-all/${game.slug}`,
            about: game.group_name ? { '@type': 'MusicGroup', name: game.group_name } : undefined,
            numberOfPlayers: { '@type': 'QuantitativeValue', value: 1 },
            interactionStatistic: {
              '@type': 'InteractionCounter',
              interactionType: 'https://schema.org/PlayAction',
              userInteractionCount: game.play_count,
            },
          }),
        }}
      />
    </div>
  );
}
