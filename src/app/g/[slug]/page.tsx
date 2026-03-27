import { notFound } from 'next/navigation';

import { getGameBySlug } from '@/lib/db/queries/games';
import { GamePlayer } from '@/components/game/game-player';

import type { Metadata } from 'next';
import type { GameContent } from '@/lib/db/types';

interface GamePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) {
    return { title: 'Game Not Found' };
  }

  const description = game.play_count > 0
    ? `${game.play_count.toLocaleString('en-US')} fans have played. Pick your favorite in each matchup and see what % of fans agree with you.`
    : `Pick your favorite in each matchup and see what other fans picked.`;

  return {
    title: game.title,
    description,
    openGraph: {
      title: `${game.title} | KpopQuiz`,
      description,
      url: `/g/${slug}`,
    },
    twitter: { card: 'summary_large_image' },
    alternates: { canonical: `/g/${slug}` },
  };
}

export default async function GamePage({ params }: GamePageProps): Promise<React.ReactElement> {
  const { slug } = await params;
  const game = await getGameBySlug(slug);

  if (!game) notFound();

  const raw = game as Record<string, unknown>;
  const groups = raw.groups as { name: string; slug: string; display_color: string; text_color: string; logo_url: string | null; fandom_name: string } | null;
  const profiles = raw.profiles as { username: string; avatar_url: string | null; avatar_bg: string; avatar_text: string };

  const gameData = {
    id: game.id as string,
    title: game.title as string,
    slug: game.slug as string,
    gameType: game.game_type as string,
    content: game.content as GameContent,
    matchupCount: game.matchup_count as number,
    playCount: game.play_count as number,
    likeCount: game.like_count as number,
    groupName: groups?.name ?? null,
    groupSlug: groups?.slug ?? null,
    displayColor: groups?.display_color ?? null,
    textColor: groups?.text_color ?? null,
    logoUrl: groups?.logo_url ?? null,
    creatorUsername: profiles.username,
    creatorAvatarUrl: profiles.avatar_url,
    creatorAvatarBg: profiles.avatar_bg,
    creatorAvatarText: profiles.avatar_text,
  };

  return (
    <div className="py-6">
      <GamePlayer game={gameData} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CreativeWork',
            name: game.title,
            description: `A This or That game created by ${profiles.username} on KpopQuiz`,
            author: {
              '@type': 'Person',
              name: profiles.username,
              url: `https://kpopquiz.org/u/${profiles.username}`,
            },
            dateCreated: game.created_at,
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
