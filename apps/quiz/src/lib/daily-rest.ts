// Audit 01 P1-6 + P2-11: the streak arithmetic shared by the guest (this browser) and the account (server).
//
//  - One FREE rest day per 7 days, for everyone, automatic: when exactly one day was missed and no rest was used in the last 7
//    days, the streak goes on (the rest day itself does not count as a played day). Never bought, never repaired for money.
//  - Dates are plain YYYY-MM-DD strings. A guest passes the LOCAL date of the browser (P2-11, as Wordle does); the server passes
//    the UTC date unless the browser sent its local date.
// Pure, no I/O, no Date.now().

export const REST_EVERY_DAYS = 7;

export interface StreakCore {
  /** the last day a daily was played (YYYY-MM-DD) */
  last: string;
  count: number;
  /** the day that was covered by a rest day, or null/undefined when none was ever used */
  rest?: string | null | undefined;
}

export interface StreakStep extends StreakCore {
  rest: string | null;
  /** this step used the rest day */
  usedRest: boolean;
}

const MS = 86_400_000;

export function dayNumber(iso: string): number {
  return Math.floor(Date.parse(`${iso}T00:00:00Z`) / MS);
}

export function addDays(iso: string, n: number): string {
  return new Date((dayNumber(iso) + n) * MS).toISOString().slice(0, 10);
}

/** The browser's own calendar date (not UTC): 6 pm in Los Angeles is that day, whatever UTC says. */
export function localDate(now: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}

/** Is a rest day free on `today`? Not when one was used less than 7 days ago. */
export function restAvailable(rest: string | null | undefined, today: string): boolean {
  return !rest || dayNumber(today) - dayNumber(rest) >= REST_EVERY_DAYS;
}

export function advanceStreak(prev: StreakCore | null, today: string): StreakStep {
  if (!prev || !Number.isFinite(prev.count) || prev.count < 1) return { last: today, count: 1, rest: prev?.rest ?? null, usedRest: false };
  const rest = prev.rest ?? null;
  const gap = dayNumber(today) - dayNumber(prev.last);
  if (gap <= 0) return { last: prev.last, count: prev.count, rest, usedRest: false }; // the same day never double counts
  if (gap === 1) return { last: today, count: prev.count + 1, rest, usedRest: false };
  if (gap === 2 && restAvailable(rest, today)) return { last: today, count: prev.count + 1, rest: addDays(today, -1), usedRest: true };
  return { last: today, count: 1, rest, usedRest: false }; // a longer gap resets, honestly
}

/** A streak that is still alive on `today` (played today, or yesterday, or one missed day a rest day can cover). */
export function streakAlive(s: StreakCore | null, today: string): boolean {
  if (!s || s.count < 1) return false;
  const gap = dayNumber(today) - dayNumber(s.last);
  return gap <= 1 || (gap === 2 && restAvailable(s.rest, today));
}
