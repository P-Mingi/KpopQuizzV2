'use client';

import { useEffect, useState } from 'react';

import { countdownLabel, minutesToUtcMidnight, pickedOnLabel, utcDay } from '@/lib/ux-v1/p1/format';

interface Props {
  /** Day it was (or is) the quiz of the day, YYYY-MM-DD. */
  featured: string;
  /** UTC day of the server read (the page is ISR). */
  served: string;
  /** A new pick is expected at the next UTC midnight. */
  rotates: boolean;
}

/** The note next to "Quiz of the day" (17.2). It never claims a rotation that is
 *  not coming: "New quiz in 6h 12m" only for today's pick when tomorrow's is on
 *  its way; "Today's pick" when it is today's but none is scheduled next; "Picked
 *  on June 30" / "Picked yesterday" when the stored pick is old (rotation stopped). */
export function QotdNote({ featured, served, rotates }: Props): React.ReactElement {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  const today = now ? utcDay(now) : served;
  let text: string;
  if (featured === today) {
    text = rotates ? (now ? `New quiz in ${countdownLabel(minutesToUtcMidnight(now))}` : '') : "Today's pick";
  } else {
    const on = pickedOnLabel(featured, today);
    text = on === 'yesterday' ? 'Picked yesterday' : `Picked on ${on}`;
  }
  return <span className="p1-note ux-num">{text}</span>;
}
