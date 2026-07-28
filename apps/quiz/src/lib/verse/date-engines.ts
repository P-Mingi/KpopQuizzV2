// Verse date engines (W2.7): on-this-day, upcoming birthday, active comeback.
// Pure functions over already-fetched entity data so a space fetches once. These
// feed the space UI now and notifications later. All dates are entity facts
// (birth_date, release_date, inception) - never personal-life data.

export interface IdolDate { name: string; slug: string; birth_date: string | null; }
export interface AlbumDate { title: string; slug: string; release_date: string | null; type: string; }

export interface BirthdayInfo { name: string; slug: string; monthDay: string; inDays: number; isToday: boolean; }
export interface OnThisDayEntry { kind: 'birthday' | 'release' | 'debut'; label: string; slug?: string; yearsAgo: number | null; }

function mmdd(d: Date): string { return `${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`; }

function daysUntilMonthDay(monthDay: string, today: Date): number {
  const [m, d] = monthDay.split('-').map(Number);
  if (!m || !d) return 999;
  const year = today.getUTCFullYear();
  let next = Date.UTC(year, m - 1, d);
  const todayUTC = Date.UTC(year, today.getUTCMonth(), today.getUTCDate());
  if (next < todayUTC) next = Date.UTC(year + 1, m - 1, d);
  return Math.round((next - todayUTC) / 86400000);
}

/** Nearest idol birthday within `windowDays`, with an is-today flag. */
export function upcomingBirthday(idols: IdolDate[], today: Date, windowDays = 30): BirthdayInfo | null {
  let best: BirthdayInfo | null = null;
  for (const i of idols) {
    if (!i.birth_date || i.birth_date.length < 10) continue;
    const md = i.birth_date.slice(5, 10); // MM-DD
    const inDays = daysUntilMonthDay(md, today);
    if (inDays > windowDays) continue;
    const info: BirthdayInfo = { name: i.name, slug: i.slug, monthDay: md, inDays, isToday: inDays === 0 };
    if (!best || info.inDays < best.inDays) best = info;
  }
  return best;
}

/** Everything that happened on this calendar day (any year): birthdays, releases, debut. */
export function onThisDay(idols: IdolDate[], albums: AlbumDate[], inceptionDate: string | null, today: Date): OnThisDayEntry[] {
  const key = mmdd(today);
  const year = today.getUTCFullYear();
  const out: OnThisDayEntry[] = [];
  for (const i of idols) {
    if (i.birth_date && i.birth_date.slice(5, 10) === key) {
      const yr = Number(i.birth_date.slice(0, 4));
      out.push({ kind: 'birthday', label: `${i.name}'s birthday`, slug: i.slug, yearsAgo: yr ? year - yr : null });
    }
  }
  for (const a of albums) {
    if (a.release_date && a.release_date.slice(5, 10) === key) {
      const yr = Number(a.release_date.slice(0, 4));
      out.push({ kind: 'release', label: `"${a.title}" released`, slug: a.slug, yearsAgo: yr ? year - yr : null });
    }
  }
  if (inceptionDate && inceptionDate.slice(5, 10) === key) {
    const yr = Number(inceptionDate.slice(0, 4));
    out.push({ kind: 'debut', label: 'Group debut anniversary', yearsAgo: yr ? year - yr : null });
  }
  return out;
}

/** Days until a comeback release_date (>= today), for the countdown strip. */
export function comebackCountdown(releaseDate: string, today: Date): number {
  const [y, m, d] = releaseDate.split('-').map(Number);
  if (!y || !m || !d) return -1;
  const target = Date.UTC(y, m - 1, d);
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.round((target - todayUTC) / 86400000);
}
