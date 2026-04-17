import { notFound } from 'next/navigation';

import { getNameAllGameBySlug } from '@/lib/db/queries/games';
import { NameAllPlayer } from '@/components/game/name-all-player';
import { safeFetch } from '@/lib/error-handling';

import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Read item count from content JSONB (handles both `members` and `items` formats). */
function getItemCount(content: Record<string, unknown>): number {
  const members = content.members as unknown[] | undefined;
  const items = content.items as unknown[] | undefined;
  return members?.length ?? items?.length ?? 0;
}

/** Item label based on game type. */
function getItemLabel(gameType: string): string {
  if (gameType === 'name_all_songs' || gameType === 'name_top_songs') return 'songs';
  if (gameType === 'name_all_groups') return 'groups';
  if (gameType === 'name_all_idols') return 'idols';
  return 'members';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await safeFetch(getNameAllGameBySlug(slug), null, '[name-all] getGame');
  if (!game) return { title: 'Game Not Found' };

  const content = game.content as unknown as Record<string, unknown>;
  const itemCount = getItemCount(content);
  const timer = (content.timer_seconds as number) ?? 60;
  const groupName = game.group_name ?? 'K-pop';
  const label = getItemLabel(game.game_type);

  const description = `Can you name all ${itemCount} ${groupName} ${label} in ${timer} seconds? ${game.play_count.toLocaleString('en-US')} fans have tried.`;

  return {
    title: `${game.title} - K-pop Game | KpopQuiz`,
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

  const content = game.content as unknown as Record<string, unknown>;
  const itemCount = getItemCount(content);
  const label = getItemLabel(game.game_type);

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
            description: `Name all ${itemCount} ${game.group_name ?? 'K-pop'} ${label} before time runs out.`,
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
