'use client';

import { useEffect, useState } from 'react';

import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { hasPlayedDaily } from '@/lib/daily-played';
import { timeToNextDaily } from '@/lib/daily-ui';
import { guestLiveStreak } from '@/lib/guest-streak';
import { streakView } from '@/lib/ux-v1/a0/streak';

/** Audit 01 P2-9: the player's own state on the daily hub, read in this browser after load (the page itself is the same for everyone). */
export function DailyHubStatus(): React.ReactElement {
  const me = useUxMe();
  const [s, setS] = useState<{ quiz: boolean; bt: boolean; guest: number; next: string } | null>(null);
  useEffect(() => { setS({ quiz: hasPlayedDaily('quiz'), bt: hasPlayedDaily('blindtest'), guest: guestLiveStreak().count, next: timeToNextDaily() }); }, []);
  const account = me?.profile ? streakView(me.profile.daily_streak, me.profile.last_daily_date) : null;
  const days = account ? account.days : s?.guest ?? 0;
  return (
    <p data-testid="daily-hub-status" style={{ minHeight: '1.6em' }}>
      {s ? `Quiz: ${s.quiz ? 'done' : 'not played yet'} · Blindtest: ${s.bt ? 'done' : 'not played yet'}${days >= 1 ? ` · Streak: ${days} ${days === 1 ? 'day' : 'days'}` : ''} · Next in ${s.next}` : ''}
    </p>
  );
}
