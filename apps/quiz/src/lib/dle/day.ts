// Daily games (step 1): the calendar of a game, the same rules as dle_utc_date, dle_bank_day and dle_playable of
// 019-dle-core.sql (the SQL tests check both give the same answers). Pure, no I/O. The server's clock decides (dle_day
// returns it); these functions only display it: the countdown, the game number.

const DAY_MS = 86_400_000;
/** Yesterday stays playable until this many hours after the reset (00:00 UTC). */
export const YESTERDAY_GRACE_HOURS = 3;
export const BANK_DAYS = 365;

/** The UTC date of an instant, YYYY-MM-DD. */
export function utcDate(now: Date): string {
  return now.toISOString().slice(0, 10);
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / DAY_MS);
}

export function addDays(date: string, days: number): string {
  return new Date((dayNumber(date) + days) * DAY_MS).toISOString().slice(0, 10);
}

/** Game n. 1 is played on the epoch; the number keeps growing after the 365 days of the bank. */
export function gameNumber(epoch: string, date: string): number {
  return dayNumber(date) - dayNumber(epoch) + 1;
}

/** The day of the bank (1 to 365) a date plays: after day 365 the bank starts again from day 1. */
export function bankDay(epoch: string, date: string): number {
  const d = dayNumber(date) - dayNumber(epoch);
  return (((d % BANK_DAYS) + BANK_DAYS) % BANK_DAYS) + 1;
}

/** True when a date may be played at `now`: today, or yesterday until 03:00 UTC; never before the epoch. */
export function isPlayable(epoch: string, now: Date, date: string): boolean {
  if (dayNumber(date) < dayNumber(epoch)) return false;
  const today = utcDate(now);
  if (date === today) return true;
  return date === addDays(today, -1) && now.getTime() < dayNumber(today) * DAY_MS + YESTERDAY_GRACE_HOURS * 3_600_000;
}

/** Seconds until the next reset (00:00 UTC). */
export function secondsUntilReset(now: Date): number {
  return Math.ceil(((dayNumber(utcDate(now)) + 1) * DAY_MS - now.getTime()) / 1000);
}

/** H:MM:SS for the countdown. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
