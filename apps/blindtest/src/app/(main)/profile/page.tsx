import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@kpopquiz/shared/supabase/server';
import { ProfileView } from '@/components/profile/profile-view';

async function fetchPlayerData(userId: string) {
  const supabase = await createServerClient();

  const { data: player } = await supabase
    .from('players').select('*').eq('id', userId).single();
  const { data: masteries } = await supabase
    .from('player_group_mastery')
    .select('*, groups!inner(name, slug)')
    .eq('player_id', userId)
    .order('mastery_xp', { ascending: false });
  const { data: achievements } = await supabase
    .from('player_achievements')
    .select('achievement_id')
    .eq('player_id', userId);
  const { data: recentPlays } = await supabase
    .from('bt_plays')
    .select('mode_id, score, correct, total, created_at')
    .eq('player_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    player,
    masteries: (masteries ?? []) as unknown as {
      group_id: number;
      mastery_level: number;
      mastery_xp: number;
      songs_played?: number;
      songs_correct?: number;
      groups: { name: string; slug: string } | null;
    }[],
    achievements: (achievements ?? []) as { achievement_id: string }[],
    recentPlays: (recentPlays ?? []) as { mode_id: string; score: number; correct: number; total: number; created_at: string }[],
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
