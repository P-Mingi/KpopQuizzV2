// Lot HUB-HOT-B (2026-11-22): the eyebrow of "Popular this week": the ISO week in progress and its Monday to Sunday range, in UTC like the
// day counts the ranking is made of ("Week 47" and "16-22 Nov", or "30 Nov-6 Dec" across two months; a plain hyphen, never a dash).

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const DAY_MS = 86_400_000;

/** The ISO 8601 week number (1 to 53) of the UTC day of `now`. */
export function isoWeek(now: Date): number {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  // the Thursday of this week decides the ISO year
  day.setUTCDate(day.getUTCDate() + 4 - (day.getUTCDay() || 7));
  const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);
  return Math.ceil(((day.getTime() - yearStart) / DAY_MS + 1) / 7);
}

/** "16-22 Nov", or "30 Nov-6 Dec" when the week crosses a month: Monday to Sunday of the UTC week of `now`. */
export function weekRange(now: Date): string {
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() || 7) - 1));
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  const m1 = MONTHS[monday.getUTCMonth()]!;
  const m2 = MONTHS[sunday.getUTCMonth()]!;
  return m1 === m2 ? `${monday.getUTCDate()}-${sunday.getUTCDate()} ${m2}` : `${monday.getUTCDate()} ${m1}-${sunday.getUTCDate()} ${m2}`;
}
