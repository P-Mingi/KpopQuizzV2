// Daily ranked limit: 15 runs per UTC day (DESIGN-SPEC 15.4). The count is of
// runs STARTED (issued), so quitting or abandoning a run to re-draw the songs
// still spends one. UTC matches the other daily features (daily blindtest
// submit/leaderboard use the UTC date).

import { DAILY_RUN_LIMIT } from './constants';

/** Midnight UTC of the day containing `now`. */
export function utcDayStart(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Next midnight UTC (when the daily count resets). */
export function nextUtcDayStart(now: Date): Date {
  return new Date(utcDayStart(now).getTime() + 86_400_000);
}

/** Runs still allowed today given how many were started today. */
export function runsLeftToday(startedToday: number): number {
  if (!Number.isInteger(startedToday) || startedToday < 0) throw new RangeError(`runsLeftToday: ${startedToday}`);
  return Math.max(0, DAILY_RUN_LIMIT - startedToday);
}

export function canStartRun(startedToday: number): boolean {
  return runsLeftToday(startedToday) > 0;
}
