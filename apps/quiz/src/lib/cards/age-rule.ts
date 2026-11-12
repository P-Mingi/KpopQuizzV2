// Bunnyverse Cards lot 2 (integrator rule, 2026-11-12, takes priority over decision 17): a card exists only when EVERY person in its
// photo is 18 or older today AND was 18 or older on the photo date. For a group photo the people in it are the group's lineup on that
// date (Wikidata membership with start and end dates, checked against English Wikipedia); every current member must also be an adult
// today (decision 17, kept). Any doubt excludes: a person whose membership dates are unsure counts as in the photo, an unsure birth date
// counts as the latest possible day, and a missing birth date, lineup or photo date leaves the subject out.
// Pure: no network, no database, no clock (today is an argument). The data comes from a local research file that never enters the
// repository (it holds the birth dates of minors); only the verdicts do.

export type DatePrecision = 'day' | 'month' | 'year';

export interface LineupPerson {
  birth_date: string | null;
  birth_precision: DatePrecision | null;
  /** First day of membership; null means a member from the start. */
  joined: string | null;
  joined_precision?: DatePrecision | null;
  /** Last day of membership; null means never left. */
  left: string | null;
  left_precision?: DatePrecision | null;
  current: boolean;
}

export interface AgeInput {
  kind: 'idol' | 'group';
  photo_date: string | null;
  photo_precision?: DatePrecision | null;
  /** False when the sources do not say who was in the group on the photo date. */
  lineup_complete: boolean;
  people: LineupPerson[];
}

export type AgeReason = 'unknown_photo_date' | 'unknown_lineup' | 'unknown_birth_date' | 'minor_today' | 'minor_at_photo';

export type AgeVerdict = { ok: true } | { ok: false; reason: AgeReason };

/** Plain words for a reason, for the report (no personal data in them). */
export const AGE_REASON_TEXT: Record<AgeReason, string> = {
  unknown_photo_date: 'the photo date is unknown',
  unknown_lineup: 'the sources do not say who was in the group on the photo date',
  unknown_birth_date: 'a birth date of a person in the photo or of a current member is unknown',
  minor_today: 'a person in the photo or a current member is under 18 today',
  minor_at_photo: 'a person in the photo was under 18 on the photo date',
};

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Days since 1970-01-01 of a calendar date (UTC arithmetic, no time zone involved). */
function dayNumber(y: number, m: number, d: number): number {
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

function parts(iso: string): [number, number, number] | null {
  const m = ISO.exec(iso);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  // reject 2023-02-30 and the like: the date must survive a round trip
  const t = new Date(Date.UTC(y, mo - 1, d));
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return [y, mo, d];
}

const lastDayOfMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The first and the last day a date of this precision can mean, as day numbers; null when unreadable. */
export function dateRange(iso: string | null, precision: DatePrecision | null | undefined): [number, number] | null {
  if (iso == null) return null;
  const p = parts(iso);
  if (!p) return null;
  const [y, m, d] = p;
  switch (precision ?? 'day') {
    case 'day': return [dayNumber(y, m, d), dayNumber(y, m, d)];
    case 'month': return [dayNumber(y, m, 1), dayNumber(y, m, lastDayOfMonth(y, m))];
    case 'year': return [dayNumber(y, 1, 1), dayNumber(y, 12, 31)];
    default: return null;
  }
}

/** The day a person born on that day turns 18 (a 29 February birthday turns 18 on 1 March of a common year). */
export function eighteenthBirthday(birthDay: number): number {
  const b = new Date(birthDay * 86_400_000);
  const y = b.getUTCFullYear() + 18, m = b.getUTCMonth() + 1, d = b.getUTCDate();
  return d > lastDayOfMonth(y, m) ? dayNumber(y, m + 1, 1) : dayNumber(y, m, d);
}

/** Adult on every day of [from, ...): the latest possible birth date already 18 years back on `from`. */
function adultOn(person: LineupPerson, from: number): boolean | null {
  const r = dateRange(person.birth_date, person.birth_precision);
  if (!r) return null;
  return eighteenthBirthday(r[1]) <= from;
}

/** In the photo when the membership could overlap the photo date at all (doubt counts as in). */
export function inLineupOn(person: LineupPerson, photo: [number, number]): boolean {
  const j = person.joined == null ? null : dateRange(person.joined, person.joined_precision);
  const l = person.left == null ? null : dateRange(person.left, person.left_precision);
  // an unreadable join or leave date is a doubt: the person counts as in
  if (person.joined != null && !j) return true;
  if (person.left != null && !l) return true;
  const joinedBy = j == null || j[0] <= photo[1];
  const notLeft = l == null || l[1] >= photo[0];
  return joinedBy && notLeft;
}

/** The verdict for one subject. `today` is YYYY-MM-DD. */
export function ageVerdict(input: AgeInput, today: string): AgeVerdict {
  const t = dateRange(today, 'day');
  if (!t) throw new Error(`ageVerdict: today must be YYYY-MM-DD, got ${String(today)}`);
  const photo = dateRange(input.photo_date, input.photo_precision);
  if (!photo || photo[0] > t[0]) return { ok: false, reason: 'unknown_photo_date' };
  if (!input.lineup_complete || input.people.length === 0) return { ok: false, reason: 'unknown_lineup' };
  if (input.kind === 'idol' && input.people.length !== 1) return { ok: false, reason: 'unknown_lineup' };

  const inPhoto = input.kind === 'idol' ? input.people : input.people.filter((p) => inLineupOn(p, photo));
  if (inPhoto.length === 0) return { ok: false, reason: 'unknown_lineup' };
  const current = input.kind === 'idol' ? [] : input.people.filter((p) => p.current);
  const everyone = [...new Set([...inPhoto, ...current])];

  if (everyone.some((p) => adultOn(p, t[0]) === null)) return { ok: false, reason: 'unknown_birth_date' };
  if (everyone.some((p) => adultOn(p, t[0]) === false)) return { ok: false, reason: 'minor_today' };
  // the earliest day the photo can have been taken: the person must already be 18 then
  if (inPhoto.some((p) => adultOn(p, photo[0]) === false)) return { ok: false, reason: 'minor_at_photo' };
  return { ok: true };
}
