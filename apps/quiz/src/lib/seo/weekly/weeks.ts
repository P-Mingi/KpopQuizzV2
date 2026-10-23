// Calendar helpers of the weekly SEO data (SEO Mission 3, part C). Every week is an ISO week,
// Monday to Sunday, written as the date of its Monday ("2026-10-05"). Dates are calendar
// dates with no time zone: Search Console reports them in Pacific time, Bing in its own
// offset, and both are reduced to a plain YYYY-MM-DD before they meet here.

const DAY_MS = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** A calendar date plus n days (n may be negative). */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** The Monday of the ISO week that contains this date. */
export function mondayOf(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const fromMonday = (d.getUTCDay() + 6) % 7; // Monday 0 ... Sunday 6
  return addDays(date, -fromMonday);
}

/** Today's calendar date in a time zone (Search Console counts days in Pacific time). */
export function dateInZone(now: Date, timeZone: string): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export interface WeekRange {
  /** Monday. */
  start: string;
  /** Sunday. */
  end: string;
}

/**
 * The `count` complete ISO weeks before the week of `today`, most recent first. Run on a
 * Monday, the first one is the week that ended the day before.
 */
export function completedWeeks(today: string, count: number): WeekRange[] {
  const thisMonday = mondayOf(today);
  const out: WeekRange[] = [];
  for (let i = 1; i <= count; i++) {
    const start = addDays(thisMonday, -7 * i);
    out.push({ start, end: addDays(start, 6) });
  }
  return out;
}

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "6 oct." for the e-mail. */
export function shortDateFr(date: string): string {
  const [, m, d] = date.split('-');
  return `${Number(d)} ${MONTHS_FR[Number(m) - 1] ?? ''}`.trim();
}
