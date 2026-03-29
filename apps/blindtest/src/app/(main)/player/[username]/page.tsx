import { notFound } from 'next/navigation';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { ProfileView } from '@/components/profile/profile-view';

import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createServerClient();
  const { data: player } = await supabase
    .from('players').select('username, level, total_songs_correct, total_songs_played, xp')
    .eq('username', username).single();

  if (!player) return {};

  const accuracy = Math.round(player.total_songs_correct / Math.max(player.total_songs_played, 1) * 100);

  return {
    title: `${player.username} - K-pop Blind Test Profile`,
    description: `Level ${player.level} - ${player.total_songs_correct} songs guessed - ${accuracy}% accuracy`,
    openGraph: {
      images: [{ url: `/api/og/profile/${player.username}`, width: 1200, height: 630 }],
    },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();

  const { data: player } = await supabase
    .from('players').select('*').eq('username', username).single();

  if (!player) return notFound();

  const { data: masteries } = await supabase
    .from('player_group_mastery')
    .select('*, groups!inner(name, slug)')
    .eq('player_id', player.id)
    .order('mastery_xp', { ascending: false });

  const { data: achievements } = await supabase
    .from('player_achievements')
    .select('achievement_id')
    .eq('player_id', player.id);

  const { data: recentPlays } = await supabase
    .from('bt_plays')
    .select('mode_id, score, correct, total, created_at')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <ProfileView
      player={player}
      masteries={(masteries ?? []) as unknown as { group_id: number; mastery_level: number; mastery_xp: number; groups: { name: string; slug: string } | null }[]}
      achievements={(achievements ?? []) as { achievement_id: string }[]}
      recentPlays={(recentPlays ?? []) as { mode_id: string; score: number; correct: number; total: number; created_at: string }[]}
      isOwnProfile={user?.id === player.id}
    />
  );
}
