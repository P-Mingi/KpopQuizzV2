'use client';

// Run O1, lot H2a: "New picks in 8 h 47 min (2:05, Paris time)": the time to the change of the daily picks, which is at 2:05 in Paris.
// The server prints the fallback words; once the page is live in the browser the real time replaces them and follows the clock.
import { useEffect, useState } from 'react';

/** Minutes from `now` to the next 2:05 in Paris (1440 when it is exactly 2:05), the design's rule. */
export function minutesToReset(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  let h = 0;
  let m = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') m = parseInt(p.value, 10);
  }
  return (2 * 60 + 5 - (h * 60 + m) + 1440) % 1440 || 1440;
}

/** "8 h 47 min". */
export function resetText(now: Date): string {
  const left = minutesToReset(now);
  return `${Math.floor(left / 60)} h ${left % 60} min`;
}

export function HomeCountdown({ template, fallback }: { template: string; fallback: string }): React.ReactElement {
  const [time, setTime] = useState(fallback);
  useEffect(() => {
    const tick = (): void => {
      try {
        setTime(resetText(new Date()));
      } catch {
        setTime(fallback);
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [fallback]);
  return <span className="hub-h2-sub hub-h2-today-sub">{template.replace('{time}', time)}</span>;
}
