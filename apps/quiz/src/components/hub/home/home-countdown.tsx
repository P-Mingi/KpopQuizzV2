'use client';

// Run O1, lot H2a: the time to the change of the daily picks.
// Lot H2c: the target is the real rotation (the daily cron, 00:05 UTC: `nextAt`, read on the server). The server prints the fallback words;
// once the page is live in the browser the real time replaces them and follows the clock, and rolls to the next day when the instant has passed.
// Home v3 (2026-10-29, Home.dc.html): "New picks in 08:47:12", hours, minutes and seconds, ticking every second.
import { useEffect, useState } from 'react';

const DAY_S = 86_400;

/** Seconds from `now` to the rotation `nextAt` (an ISO instant), whole days later once it has passed (a full day when it is exactly now). */
export function secondsToReset(now: Date, nextAt: string): number {
  const target = Date.parse(nextAt);
  if (!Number.isFinite(target)) throw new Error('bad rotation instant');
  let s = Math.ceil((target - now.getTime()) / 1000);
  if (s <= 0) s += (Math.floor(-s / DAY_S) + 1) * DAY_S;
  return s;
}

/** "08:47:12". */
export function clockText(now: Date, nextAt: string): string {
  const left = secondsToReset(now, nextAt);
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor((left % 3600) / 60))}:${pad(left % 60)}`;
}

export function HomeCountdown({ template, fallback, nextAt }: { template: string; fallback: string; nextAt: string }): React.ReactElement {
  const [time, setTime] = useState<string | null>(null);
  useEffect(() => {
    const tick = (): void => {
      try {
        setTime(clockText(new Date(), nextAt));
      } catch {
        setTime(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextAt]);
  const [before, after = ''] = template.split('{time}');
  return (
    <span className="hub-h2-countdown">
      {before}{time ? <span className="hub-h2-num hub-h2-countdown-t">{time}</span> : fallback}{after}
    </span>
  );
}
