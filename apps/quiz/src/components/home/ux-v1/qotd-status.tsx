'use client';

import { useEffect, useState } from 'react';

import { useUxMe } from '@/components/ux-v1/use-ux-me';
import { dailyScoreToday, hasPlayedDaily } from '@/lib/daily-played';
import { timeToNextDaily } from '@/lib/daily-ui';
import { guestLiveStreak } from '@/lib/guest-streak';
import { streakView } from '@/lib/ux-v1/a0/streak';

/**
 * Audit 01 P1-6: the played state of the home card, from this browser: "Done · 8/10 · day 4 · next in 9h". Nothing renders on the
 * server or when today is not played, so the card keeps its height; it sits in the card's top line, beside the label.
 */
export function QotdStatus(): React.ReactElement | null {
  const me = useUxMe();
  const [done, setDone] = useState<{ score: { score: number; max: number } | null; guestDays: number; next: string } | null>(null);
  const [guestDays, setGuestDays] = useState(0);
  useEffect(() => {
    const g = guestLiveStreak().count;
    setGuestDays(g);
    if (!hasPlayedDaily('quiz')) { setDone(null); return; }
    setDone({ score: dailyScoreToday(), guestDays: g, next: timeToNextDaily() });
  }, []);
  // not played yet: a guest with a streak of 2 days or more sees it here (no popover, no threat); an account has its header line
  if (!done) {
    return guestDays >= 2 && !me?.profile ? <span className="p1-qdone ux-num" data-testid="p1-qotd-guest-streak">{guestDays}-day streak</span> : null;
  }
  const account = me?.profile ? streakView(me.profile.daily_streak, me.profile.last_daily_date) : null;
  const days = account ? account.days : done.guestDays;
  const next = `next in ${done.next.includes('h') ? done.next.split(' ')[0] : done.next}`;
  const parts = ['Done', done.score ? `${done.score.score}/${done.score.max}` : null, days >= 1 ? `day ${days}` : null, next].filter((x): x is string => !!x);
  return <span className="p1-qdone ux-num" data-testid="p1-qotd-done">{parts.join(' · ')}</span>;
}
