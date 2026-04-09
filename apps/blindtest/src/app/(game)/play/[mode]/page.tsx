import { redirect } from 'next/navigation';
import { createServiceRoleClient } from '@kpopquiz/shared/supabase/server';
import { GamePlayer } from '@/components/game/game-player';
import { getTodayKST } from '@/lib/daily';

const MODE_REDIRECTS: Record<string, string> = {
  classic: '/play?mode=classic&filter=all',
  'intro-challenge': '/play?mode=intro&filter=all',
  'speed-round': '/play?mode=speed&filter=all',
  'girl-groups': '/play?mode=classic&filter=gg',
  'boy-groups': '/play?mode=classic&filter=bg',
  'solo-artists': '/play?mode=classic&filter=solo',
  '4th-gen': '/play?mode=classic&filter=4th-gen',
  '3rd-gen': '/play?mode=classic&filter=3rd-gen',
  '2nd-gen': '/play?mode=classic&filter=2nd-gen',
  'title-tracks': '/play?mode=classic&filter=title-tracks',
  'b-sides': '/play?mode=classic&filter=b-sides',
  'recent-hits': '/play?mode=classic&filter=recent',
  'kpop-legends': '/play?mode=classic&filter=legends',
  'random-all': '/play?mode=classic&filter=all',
};

export default async function OldPlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode: modeId } = await params;

  // Daily: render the new immersive GamePlayer with preset questions from the
  // daily challenge. GamePlayer fetches /api/daily/questions via presetUrl.
  if (modeId === 'daily') {
    const supabase = createServiceRoleClient();
    const today = getTodayKST();
    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('id, day_number, questions')
      .eq('date', today)
      .maybeSingle();

    if (!challenge) redirect('/daily');
    if (!Array.isArray(challenge.questions) || challenge.questions.length === 0) {
      // The challenge row exists but hasn't been upgraded to v2 yet. Hitting
      // /daily will trigger the GET, which auto-builds the questions.
      redirect('/daily');
    }

    const dayNumber = (challenge.day_number as number | null) ?? undefined;
    return (
      <GamePlayer
        playlist={'all'}
        mode={'quick'}
        difficulty={'all'}
        presetUrl={'/api/daily/questions'}
        dailyChallengeId={challenge.id as string}
        {...(dayNumber !== undefined ? { dailyNumber: dayNumber } : {})}
      />
    );
  }

  // Group modes redirect
  if (modeId.startsWith('group-')) {
    const groupSlug = modeId.replace('group-', '');
    redirect(`/play?mode=classic&group=${groupSlug}`);
  }

  // Known old modes redirect
  const redirectUrl = MODE_REDIRECTS[modeId];
  if (redirectUrl) redirect(redirectUrl);

  // Unknown - go home
  redirect('/');
}
