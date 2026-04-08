import { notFound } from 'next/navigation';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { ProfileView } from '@/components/profile/profile-view';

import type { Metadata } from 'next';

async function findPlayerByUsername(username: string) {
  const adminDb = createServiceRoleClient();
  // bt_players stores display names like "mimimingi#0" (Discord-style).
  // We accept either the full display_name or the prefix (no discriminator).
  const decoded = decodeURIComponent(username);
  const { data: exact } = await adminDb
    .from('bt_players')
    .select('*')
    .eq('display_name', decoded)
    .maybeSingle();
  if (exact) return exact;
  const { data: prefix } = await adminDb
    .from('bt_players')
    .select('*')
    .ilike('display_name', `${decoded}#%`)
    .limit(1)
    .maybeSingle();
  return prefix ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const player = await findPlayerByUsername(username);
  if (!player) return {};

  const totalPlayed = (player.total_songs_played as number) ?? 0;
  const totalCorrect = (player.total_correct as number) ?? 0;
  const accuracy = Math.round((totalCorrect / Math.max(totalPlayed, 1)) * 100);
  const display = (player.display_name as string)?.replace(/#\d+$/, '') ?? username;

  return {
    title: `${display} - K-pop Blind Test Profile`,
    description: `Level ${player.level} - ${totalCorrect} songs guessed - ${accuracy}% accuracy`,
    openGraph: {
      images: [{ url: `/api/og/profile/${display}`, width: 1200, height: 630 }],
    },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const player = await findPlayerByUsername(username);
  if (!player) return notFound();

  const adminDb = createServiceRoleClient();

  const [masteryRes, recentRes] = await Promise.all([
    adminDb
      .from('bt_playlist_mastery')
      .select('id, playlist, play_count, best_score, total_correct, total_songs_played, mastery_stars')
      .eq('player_id', player.id)
      .order('play_count', { ascending: false }),
    adminDb
      .from('bt_game_results')
      .select('mode, playlist, score, correct_count, total_songs, played_at')
      .eq('player_id', player.id)
      .order('played_at', { ascending: false })
      .limit(10),
  ]);

  return (
    <ProfileView
      player={player as Parameters<typeof ProfileView>[0]['player']}
      masteries={(masteryRes.data ?? []) as Parameters<typeof ProfileView>[0]['masteries']}
      achievements={[]}
      recentPlays={(recentRes.data ?? []) as Parameters<typeof ProfileView>[0]['recentPlays']}
      isOwnProfile={user?.id === (player.user_id as string)}
    />
  );
}
