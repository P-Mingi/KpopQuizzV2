import { redirect } from 'next/navigation';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { ChallengePlayer } from '@/components/challenge/challenge-player';

export default async function ChallengePlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createServiceRoleClient();
  const { data: challenge } = await admin
    .from('challenges')
    .select('id, short_code, playlist, mode, difficulty, expires_at')
    .eq('short_code', code)
    .maybeSingle();

  if (!challenge) redirect('/');
  if (new Date(challenge.expires_at as string) < new Date()) redirect(`/challenge/${code}`);

  return (
    <ChallengePlayer
      shortCode={challenge.short_code as string}
      playlist={(challenge.playlist as string) ?? 'all'}
      mode={(challenge.mode as string) ?? 'quick'}
      difficulty={(challenge.difficulty as string) ?? 'all'}
    />
  );
}
