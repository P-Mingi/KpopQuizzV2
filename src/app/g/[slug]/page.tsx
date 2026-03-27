import { notFound } from 'next/navigation';

import { getGameBySlug } from '@/lib/db/queries/games';
import { createServerClient } from '@/lib/supabase/server';
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

  const ogImage = `https://kpopquiz.org/api/og/game/${slug}/status`;

  return {
    title: game.title,
    description,
    openGraph: {
      title: `${game.title} | KpopQuiz`,
      description,
      url: `/g/${slug}`,
      images: [{ url: ogImage, width: 1080, height: 1350, alt: game.title as string }],
    },
    twitter: { card: 'summary_large_image', images: [ogImage] },
    alternates: { canonical: `/g/${slug}` },
  };
}

export default async function GamePage({ params }: GamePageProps): Promise<React.ReactElement> {
  const { slug } = await params;

  const [game, supabase] = await Promise.all([
    getGameBySlug(slug),
    createServerClient(),
  ]);

  if (!game) notFound();

  const { data: { user } } = await supabase.auth.getUser();

  // Check if logged-in user has already played
  let initialPlay: { choices: Record<string, 'a' | 'b'>; created_at: string } | null = null;
  if (user) {
    const { data: existingPlay } = await supabase
      .from('game_plays')
      .select('choices, created_at')
      .eq('game_id', game.id)
      .eq('player_id', user.id)
      .maybeSingle();

    if (existingPlay) {
      initialPlay = {
        choices: existingPlay.choices as Record<string, 'a' | 'b'>,
        created_at: existingPlay.created_at as string,
      };
    }
  }

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
    creatorId: game.creator_id as string,
    isCreator: user?.id === (game.creator_id as string),
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
      <GamePlayer game={gameData} initialPlay={initialPlay} />

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
