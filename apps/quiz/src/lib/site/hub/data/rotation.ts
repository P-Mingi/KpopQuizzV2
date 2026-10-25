// Run O1, lot H2b: the countdown of Today, from the real rotation time of the cron.
//
// The truth (read from apps/quiz/vercel.json and app/api/cron/ensure-daily-quiz/route.ts): the cron "5 0 * * *" runs at 00:05 UTC and
// publishes the quiz of the UTC date of that moment (`new Date().toISOString().split('T')[0]`); getQuizOfTheDay reads the same UTC date.
// The debate cron runs at 00:10 UTC, the daily blind test is made by the first request after 00:00 UTC. So the picks change at
// 00:05 UTC: 02:05 on a Paris clock in summer (CEST, UTC+2) and 01:05 in winter (CET, UTC+1). The canvas says "02:05 Paris" all year;
// that is true only in summer. The test rotation.test.ts pins these numbers to vercel.json.

import { DAY_MS } from './util';

import type { HubRotation } from './types';

/** The daily cron, in UTC. rotation.test.ts compares it with the schedule in vercel.json. */
export const DAILY_ROTATION_UTC = { hour: 0, minute: 5 } as const;

const pad = (n: number): string => String(n).padStart(2, '0');

/** The next rotation strictly after `now`. */
export function nextRotation(now: Date): Date {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), DAILY_ROTATION_UTC.hour, DAILY_ROTATION_UTC.minute);
  return new Date(day > now.getTime() ? day : day + DAY_MS);
}

/** Hours and minutes on a Paris clock, and the zone ("CEST" when Paris is two hours ahead of UTC, else "CET"). */
export function parisClock(at: Date): { time: string; zone: 'CEST' | 'CET' } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(at);
  let h = 0;
  let m = 0;
  for (const p of parts) {
    if (p.type === 'hour') h = parseInt(p.value, 10) % 24;
    if (p.type === 'minute') m = parseInt(p.value, 10);
  }
  const offset = (((h * 60 + m) - (at.getUTCHours() * 60 + at.getUTCMinutes())) + 1440) % 1440;
  return { time: `${pad(h)}:${pad(m)}`, zone: offset === 120 ? 'CEST' : 'CET' };
}

/** The countdown target of the home at `now`. */
export function rotationAt(now: Date): HubRotation {
  const next = nextRotation(now);
  const paris = parisClock(next);
  return {
    nextAt: next.toISOString(),
    utcTime: `${pad(DAILY_ROTATION_UTC.hour)}:${pad(DAILY_ROTATION_UTC.minute)}`,
    parisTime: paris.time,
    parisZone: paris.zone,
    secondsLeft: Math.max(0, Math.round((next.getTime() - now.getTime()) / 1000)),
  };
}

/**
 * The rotation as the page needs it. Not cached: it is a few lines of arithmetic, and `secondsLeft` must be fresh (the page counts down
 * from `nextAt`, which only moves once a day).
 */
export async function getRotation(opts?: { readonly now?: Date }): Promise<HubRotation> {
  return rotationAt(opts?.now ?? new Date());
}
