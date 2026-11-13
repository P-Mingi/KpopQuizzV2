// Bunnyverse Cards, lot 4: when a reminder may leave. Pure, Paris time. The hours are QUIET_HOURS of rules.ts (22:00 to 08:00): nothing is sent
// inside them, and a stack that filled during the night is told at 08:00 (the cron's next run after it). One a Paris day for a player.
import { PARIS_TZ, QUIET_HOURS } from './rules';

let fmt: Intl.DateTimeFormat | null = null;

/** The Paris hour of an instant, 0 to 23. */
export function parisHourOf(t: number | Date): number {
  fmt ??= new Intl.DateTimeFormat('en-GB', { timeZone: PARIS_TZ, hour: '2-digit', hourCycle: 'h23' });
  return Number(fmt.format(new Date(t)));
}

/** True from 22:00 up to (not including) 08:00 Paris time. */
export function pushQuiet(t: number | Date): boolean {
  const h = parisHourOf(t);
  return h >= QUIET_HOURS.from || h < QUIET_HOURS.to;
}

/** True when a reminder may leave now for a player last told on `lastSentDay` (a Paris 'YYYY-MM-DD', or null) and not told today. */
export function mayPush(now: number | Date, lastSentDay: string | null, today: string): boolean {
  return !pushQuiet(now) && lastSentDay !== today;
}
