import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { ProfileView } from '@/components/profile/profile-view';

async function fetchPlayerData(userId: string) {
  // bt_players is the canonical table written by /api/game/save-result.
  // The legacy 'players' table is no longer kept in sync.
  const adminDb = createServiceRoleClient();

  const { data: player } = await adminDb
    .from('bt_players')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!player) return { player: null, masteries: [], achievements: [], recentPlays: [] };

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

  return {
    player,
    masteries: (masteryRes.data ?? []) as Array<{
      id: string;
      playlist: string;
      play_count: number;
      best_score: number;
      total_correct: number;
      total_songs_played: number;
      mastery_stars: number;
    }>,
    // Achievements aren't tracked yet in bt_* tables; ProfileView shows the catalog
    // with everything locked until we add a bt_player_achievements table.
    achievements: [] as { achievement_id: string }[],
    recentPlays: (recentRes.data ?? []) as Array<{
      mode: string;
      playlist: string;
      score: number;
      correct_count: number;
      total_songs: number;
      played_at: string;
    }>,
  };
}

export default async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const data = await fetchPlayerData(user.id);

  if (!data.player) {
    return (
      <div className="pt-7 pb-8 text-center">
        <p className="text-sm text-secondary">Player profile not found</p>
        <Link href="/" className="text-sm text-accent mt-2 inline-block">Back to home</Link>
      </div>
    );
  }

  return <ProfileView {...data} player={data.player} isOwnProfile={true} />;
}
