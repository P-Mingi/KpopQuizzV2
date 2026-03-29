import { redirect } from 'next/navigation';
import { BlindTestGame } from '@/components/game/blind-test-game';

import type { BlindTestMode } from '@/lib/blind-test-modes';

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

const DAILY_MODE: BlindTestMode = {
  id: 'daily',
  title: "Today's challenge",
  description: 'Same 10 songs for everyone. One shot.',
  clip_point: 'chorus',
  clip_duration: 10,
  song_count: 10,
  difficulty: 'medium',
  filter: {},
  category: 'special',
};

export default async function OldPlayPage({ params }: { params: Promise<{ mode: string }> }) {
  const { mode: modeId } = await params;

  // Daily stays on the old route
  if (modeId === 'daily') {
    return <BlindTestGame mode={DAILY_MODE} />;
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
