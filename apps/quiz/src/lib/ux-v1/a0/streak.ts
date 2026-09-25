// Streak pill + popover model (DESIGN-SPEC 16.5, WIRING-MAP "Streak pill +
// popover"). Pure: derived only from the canonical profiles.daily_streak and
// last_daily_date (via /api/auth/me) and lib/streak.ts, the same UTC-day rule the
// rest of the site uses. No new streak logic, no invented days.

import { streakState } from '@/lib/streak';

import type { StreakState } from '@/lib/streak';

export interface StreakView {
  state: Exclude<StreakState, 'none'>;
  days: number;
  /** Mon..Sun of the current UTC week: done = inside the live streak run. */
  week: { label: string; done: boolean; today: boolean }[];
  /** Time left to play today (UTC midnight), e.g. "5h 12m". */
  left: string;
  /** Hours left, rounded down (aria-label). */
  hoursLeft: number;
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function utcDay(d: Date): string { return d.toISOString().slice(0, 10); }

/** null when there is nothing to show (no streak, stale, or signed out). */
export function streakView(days: number | null | undefined, lastActive: string | null | undefined, now: Date = new Date()): StreakView | null {
  const n = typeof days === 'number' ? days : 0;
  const state = streakState(n, lastActive ?? null);
  if (state === 'none' || !lastActive) return null;

  const today = utcDay(now);
  const last = new Date(`${lastActive}T00:00:00Z`);
  const first = new Date(last); first.setUTCDate(first.getUTCDate() - (n - 1));
  const dow = (now.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(`${today}T00:00:00Z`); monday.setUTCDate(monday.getUTCDate() - dow);
  const week = DAY_LABELS.map((label, i) => {
    const d = new Date(monday); d.setUTCDate(monday.getUTCDate() + i);
    return { label, done: d >= first && d <= last, today: utcDay(d) === today };
  });

  const midnight = new Date(`${today}T00:00:00Z`); midnight.setUTCDate(midnight.getUTCDate() + 1);
  const mins = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 60000));
  const hoursLeft = Math.floor(mins / 60);
  return { state, days: n, week, left: `${hoursLeft}h ${mins % 60}m`, hoursLeft };
}
