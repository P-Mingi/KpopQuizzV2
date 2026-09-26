'use client';

import { countdownLabel, minutesToUtcMidnight, pickedOnLabel, utcDay } from '@/lib/ux-v1/p1/format';

import { useNowMs } from './use-client-values';

interface Props {
  /** Day the quiz was first picked as the quiz of the day, YYYY-MM-DD (null if unknown). */
  featured: string | null;
  /** UTC day of the server read (the page is ISR). */
  served: string;
}

/** The note next to "Quiz of the day" (17.2). The quiz changes at every UTC midnight
 *  (a new pick, or the live read's next replay while the rotation is stopped), so
 *  the countdown is always true; a replay of an older pick says so, it is never
 *  presented as a new pick: "Replay of the June 17 pick · New quiz in 6h 12m". */
export function QotdNote({ featured, served }: Props): React.ReactElement {
  const ms = useNowMs();
  const now = ms === null ? null : new Date(ms);
  const today = now ? utcDay(now) : served;
  const next = now ? `New quiz in ${countdownLabel(minutesToUtcMidnight(now))}` : '';
  let replay = '';
  if (featured && featured !== today) {
    const on = pickedOnLabel(featured, today);
    replay = on === 'yesterday' ? "Replay of yesterday's pick" : `Replay of the ${on} pick`;
  }
  const text = [replay, next].filter(Boolean).join(' · ');
  return <span className="p1-note ux-num">{text}</span>;
}
