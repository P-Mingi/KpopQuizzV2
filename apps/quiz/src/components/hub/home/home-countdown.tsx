'use client';

// Run O1, lot H2a: "New picks in 8 h 47 min (2:05, Paris time)": the time to the change of the daily picks.
// Lot H2c: the target is the real rotation (the daily cron, 00:05 UTC: `nextAt`, read on the server) and the Paris time printed is that
// instant on a Paris clock, 2:05 in summer and 1:05 in winter. The server prints the fallback words; once the page is live in the
// browser the real time replaces them and follows the clock, and rolls to the next day when the instant has passed.
import { useEffect, useState } from 'react';

const DAY_MS = 86_400_000;

/** Minutes from `now` to the rotation `nextAt` (an ISO instant), whole days later once it has passed (a full 1440 when it is exactly now). */
export function minutesToReset(now: Date, nextAt: string): number {
  const target = Date.parse(nextAt);
  if (!Number.isFinite(target)) throw new Error('bad rotation instant');
  let ms = target - now.getTime();
  if (ms <= 0) ms += (Math.floor(-ms / DAY_MS) + 1) * DAY_MS;
  return Math.ceil(ms / 60_000);
}

/** "8 h 47 min". */
export function resetText(now: Date, nextAt: string): string {
  const left = minutesToReset(now, nextAt);
  return `${Math.floor(left / 60)} h ${left % 60} min`;
}

export function HomeCountdown({ template, fallback, nextAt }: { template: string; fallback: string; nextAt: string }): React.ReactElement {
  const [time, setTime] = useState(fallback);
  useEffect(() => {
    const tick = (): void => {
      try {
        setTime(resetText(new Date(), nextAt));
      } catch {
        setTime(fallback);
      }
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [fallback, nextAt]);
  return <span className="hub-h2-sub hub-h2-today-sub">{template.replace('{time}', time)}</span>;
}
