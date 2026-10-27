// The SEO events calendar (SEO Mission 3, part E point 2): comebacks, concerts, award shows
// and anniversaries that move K-pop searches, each with the URL of the source that confirms
// its date. The readable copy is docs/seo/CALENDAR.md; this file is the typed copy the code
// reads (the refresh queue, /admin/seo, the Monday e-mail). calendar.test.ts parses
// CALENDAR.md and fails when the two differ, so one cannot change without the other.
//
// Rules for a row (rulebook section 5): the date comes from an official page (label, artist
// or organizer site, verified account) or, when no official page can be opened, from a
// bylined reputable outlet (Yonhap, Korea JoongAng Daily, Korea Herald, Korea Times) that
// quotes the agency. Never kprofiles, Fandom or a fan schedule site. A date no source
// confirms keeps status 'unconfirmed' and says what was found in `note`.
//
// Dates are calendar days (YYYY-MM-DD) in the event's own time zone (KST for Korea), compared
// with today's UTC date: at most a few hours early or late, which a 10-day checklist ignores.

export type SeoEventType = 'comeback' | 'concert' | 'awards' | 'anniversary';
export type SeoEventStatus = 'confirmed' | 'unconfirmed';
/** official: the artist, label or organizer. press: a bylined outlet quoting them. reference: Wikipedia, Wikidata, MusicBrainz. */
export type SeoSourceKind = 'official' | 'press' | 'reference';

export interface SeoEventSource {
  url: string;
  kind: SeoSourceKind;
  /** Who said it, as shown in the admin page: "Korea JoongAng Daily, Lee Ji-won, 8 Oct 2026". */
  label: string;
}

export interface SeoEvent {
  /** Stable id, used as a key and in CALENDAR.md. */
  id: string;
  /** First day, YYYY-MM-DD. */
  date: string;
  /** Last day of a multi-day event, YYYY-MM-DD. */
  endDate?: string;
  /** groups.slug of the group, or null for a multi-artist event (an award show). */
  group: string | null;
  type: SeoEventType;
  /** Plain English, no dashes: what happens. */
  title: string;
  place?: string;
  status: SeoEventStatus;
  /** The first source is the one CALENDAR.md shows; the others back it up. */
  sources: SeoEventSource[];
  /** What was found, and anything that differs from the brief. */
  note?: string;
  /** Pages to refresh besides the group hub (paths, e.g. "/blindtest"). */
  pages?: string[];
}

export const SEO_EVENTS: readonly SeoEvent[] = [
  {
    id: 'illit-break-even',
    date: '2026-10-26',
    group: 'illit',
    type: 'comeback',
    title: 'ILLIT fifth EP "BREAK EVEN" (6 p.m. KST)',
    status: 'confirmed',
    sources: [
      { url: 'https://www.koreaherald.com/article/10872608', kind: 'press', label: 'The Korea Herald, Hwang You-mee, 14 Sep 2026 (quotes Belift Lab)' },
      { url: 'https://www.koreatimes.co.kr/entertainment/k-pop/20261006/ive-illit-riize-collide-as-october-k-pop-comeback-race-heats-up', kind: 'press', label: 'The Korea Times, Pyo Kyung-min, 6 Oct 2026 (gives 6 p.m.)' },
    ],
    note: 'No official page could be opened (Weverse needs a login). Two bylined outlets agree on 26 Oct; the Korea Times gives 6 p.m.',
  },
  {
    id: 'ateez-golden-hour-6',
    date: '2026-11-13',
    group: 'ateez',
    type: 'comeback',
    title: 'ATEEZ album "GOLDEN HOUR : Part.6" (2 p.m. KST)',
    status: 'confirmed',
    sources: [
      { url: 'https://www.koreajoongangdaily.com/entertainment/boy-band-ateez-to-return-with-golden-hour-part6-next-month/12910603', kind: 'press', label: 'Korea JoongAng Daily, Lee Ji-won, 8 Oct 2026 (quotes KQ Entertainment)' },
      { url: 'https://sports.khan.co.kr/en/article/202610081046007', kind: 'press', label: 'Sports Kyunghyang, Kang Shin-woo, 8 Oct 2026 (gives 2 p.m.)' },
    ],
    note: 'The official ATEEZ X post (x.com/ATEEZofficial/status/2107848426142814682) reads "2026. 11. 13 2PM(KST) RELEASE" in a search index; x.com needs a login, so it was not opened.',
  },
  {
    id: 'txt-perfect-storm',
    date: '2026-11-16',
    group: 'txt',
    type: 'comeback',
    title: 'TXT ninth EP "Perfect Storm"',
    status: 'confirmed',
    sources: [
      { url: 'https://www.koreajoongangdaily.com/entertainment/tomorrow-x-together-sets-perfect-storm-release/12893866', kind: 'press', label: 'Korea JoongAng Daily, Lee Soo-jung, 28 Sep 2026 (quotes BigHit Music)' },
      { url: 'https://www.koreaherald.com/article/10885874', kind: 'press', label: 'The Korea Herald, Hwang You-mee, 28 Sep 2026' },
    ],
    note: 'No release time published yet. The group plays KSPO Dome, Seoul, on 13 to 15 Nov, just before.',
  },
  {
    id: 'mama-2026',
    date: '2026-11-20',
    endDate: '2026-11-21',
    group: null,
    type: 'awards',
    title: '2026 MAMA AWARDS',
    place: 'Kyocera Dome Osaka, Japan',
    status: 'confirmed',
    sources: [
      { url: 'https://cjenm.com/en/news/2026-mama-awards-to-take-place-in-japan---from-november-2021/', kind: 'official', label: 'CJ ENM (organizer), 31 Mar 2026' },
      { url: 'https://www.koreajoongangdaily.com/entertainment/2026-mama-awards-to-take-place-in-osaka-in-november/12576374', kind: 'press', label: 'Korea JoongAng Daily, Lee Ji-won, 31 Mar 2026' },
    ],
  },
  {
    id: 'bts-arirang-tour-jakarta',
    date: '2026-12-26',
    endDate: '2026-12-29',
    group: 'bts',
    type: 'concert',
    title: 'BTS WORLD TOUR ARIRANG in Jakarta (shows on 26, 27 and 29 Dec)',
    place: 'Gelora Bung Karno Main Stadium, Jakarta, Indonesia',
    status: 'confirmed',
    sources: [
      { url: 'https://www.koreaherald.com/article/10774549', kind: 'press', label: 'The Korea Herald, Hwang You-mee, 18 Jun 2026 (quotes BigHit Music)' },
      { url: 'https://www.koreajoongangdaily.com/entertainment/bts-adds-two-dates-in-southeast-asia-to-its-world-tour/12727812', kind: 'press', label: 'Korea JoongAng Daily, Lee Ji-won, 17 Jun 2026 (venue)' },
    ],
    note: 'Differs from the brief (26 to 27 Dec): BigHit Music added a third show on 29 Dec on 17 Jun 2026. No show on 28 Dec.',
  },
  {
    id: 'golden-disc-41',
    date: '2027-01-09',
    endDate: '2027-01-10',
    group: null,
    type: 'awards',
    title: '41st Golden Disc Awards',
    place: 'Vietnam Exposition Center (VEC), Hanoi, Vietnam',
    status: 'confirmed',
    sources: [
      { url: 'https://www.koreajoongangdaily.com/entertainment/41st-golden-disc-awards-to-be-held-for-2-days-in-hanoi-in-january/12859862', kind: 'press', label: 'Korea JoongAng Daily, Lee Ji-won, 4 Sep 2026 (JoongAng group hosts the awards)' },
      { url: 'https://sports.khan.co.kr/en/article/202609041123007', kind: 'press', label: 'Sports Kyunghyang, Ahn Byung-gil, 4 Sep 2026' },
    ],
    note: 'The official site goldendisc.co.kr renders in the browser only and still shows the 40th edition; lineup not announced yet.',
  },
  {
    id: 'bts-arirang-1-year',
    date: '2027-03-20',
    group: 'bts',
    type: 'anniversary',
    title: 'One year of the BTS album "ARIRANG" (released 20 Mar 2026)',
    status: 'confirmed',
    sources: [
      { url: 'https://www.koreaherald.com/article/10698793', kind: 'press', label: 'Yonhap via The Korea Herald, 20 Mar 2026 (released 1 p.m. KST that day)' },
      { url: 'https://en.wikipedia.org/wiki/Arirang_(album)', kind: 'reference', label: 'Wikipedia, "Arirang (album)"' },
    ],
  },
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES: readonly SeoEventType[] = ['comeback', 'concert', 'awards', 'anniversary'];
const BANNED_SOURCE = /(^|\.)kprofiles\.com$|(^|\.)fandom\.com$|(^|\.)kpopping\.com$/i;

/** UTC midnight of a YYYY-MM-DD day, in ms. NaN when the string is not a real date. */
export function dayMs(day: string): number {
  if (!DATE_RE.test(day)) return NaN;
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  const ms = Date.UTC(y, m - 1, d);
  return new Date(ms).toISOString().slice(0, 10) === day ? ms : NaN;
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((dayMs(to) - dayMs(from)) / 86400000);
}

/** `day` moved by `n` days. */
export function addDays(day: string, n: number): string {
  return new Date(dayMs(day) + n * 86400000).toISOString().slice(0, 10);
}

/** Today's UTC date, YYYY-MM-DD. */
export function utcDay(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Why an event row is unusable, or null when it is fine. */
export function eventProblem(e: SeoEvent): string | null {
  if (!e.id || !/^[a-z0-9-]+$/.test(e.id)) return 'bad id';
  if (Number.isNaN(dayMs(e.date))) return 'bad date';
  if (e.endDate !== undefined && (Number.isNaN(dayMs(e.endDate)) || dayMs(e.endDate) < dayMs(e.date))) return 'bad end date';
  if (!TYPES.includes(e.type)) return 'bad type';
  if (e.group !== null && !/^[a-z0-9-]+$/.test(e.group)) return 'bad group slug';
  if (!e.title.trim()) return 'no title';
  if (e.status !== 'confirmed' && e.status !== 'unconfirmed') return 'bad status';
  if (e.sources.length === 0) return 'no source';
  for (const s of e.sources) {
    let host: string;
    try {
      const u = new URL(s.url);
      if (u.protocol !== 'https:') return 'source is not https';
      host = u.hostname;
    } catch {
      return 'bad source url';
    }
    if (BANNED_SOURCE.test(host)) return `banned source ${host}`;
  }
  if (e.status === 'unconfirmed' && !e.note) return 'unconfirmed without a note';
  return null;
}

/**
 * The calendar the code uses: valid rows only, sorted by date. A broken row is dropped and
 * logged rather than shown (calendar.test.ts keeps every shipped row valid).
 */
export function loadCalendar(events: readonly SeoEvent[] = SEO_EVENTS): SeoEvent[] {
  const out: SeoEvent[] = [];
  for (const e of events) {
    const problem = eventProblem(e);
    if (problem) {
      console.error(`[calendar] dropped ${e.id}: ${problem}`);
      continue;
    }
    out.push(e);
  }
  return out.sort((a, b) => dayMs(a.date) - dayMs(b.date) || a.id.localeCompare(b.id));
}

export const lastDay = (e: SeoEvent): string => e.endDate ?? e.date;

/** The preparation checklist opens this many days before the first day. */
export const CHECKLIST_LEAD_DAYS = 10;

/** First day the preparation checklist is open. */
export function checklistOpensOn(e: SeoEvent): string {
  return addDays(e.date, -CHECKLIST_LEAD_DAYS);
}

/** Open from 10 days before the first day through the last day of the event. */
export function isChecklistOpen(e: SeoEvent, today: string): boolean {
  const t = dayMs(today);
  return t >= dayMs(checklistOpensOn(e)) && t <= dayMs(lastDay(e));
}

/** Events not over yet that start within `withinDays` of `today` (ongoing ones included), soonest first. */
export function upcomingEvents(events: readonly SeoEvent[], today: string, withinDays: number): SeoEvent[] {
  const t = dayMs(today);
  const horizon = dayMs(addDays(today, withinDays));
  return events
    .filter((e) => dayMs(lastDay(e)) >= t && dayMs(e.date) <= horizon)
    .sort((a, b) => dayMs(a.date) - dayMs(b.date) || a.id.localeCompare(b.id));
}

/** The tasks of a preparation checklist, by event type. Tasks only: no fact is stated here. */
export const PREP_CHECKLISTS: Record<SeoEventType, readonly string[]> = {
  comeback: [
    'Check the date and time again on the official source (label site or verified account).',
    'Reread the group quiz hub: every fact still true, nothing about the new release before it is out.',
    'Check the group blind test playlist still plays (enough songs for a round).',
    'Plan one quiz on the release for release week, from sourced facts only, no lyrics.',
    'After release: add the album and title track to the hub only with a source link next to them.',
    'After the hub changes: check it reached IndexNow (/admin/seo/indexnow once that page is live).',
  ],
  concert: [
    'Check the dates and venue again on the official source.',
    'Reread the group quiz hub: every fact still true; no setlist, ticket or attendance claim.',
    'Check the hub links to the group trivia and blind test.',
    'After the shows: add nothing about them unless an official or bylined source reports it.',
  ],
  awards: [
    'Check the dates, venue and lineup on the organizer site or a bylined outlet.',
    'List the hubs of the announced performers and refresh the stale ones first.',
    'After the show: add wins to a hub only from the organizer or a bylined outlet, with the link.',
  ],
  anniversary: [
    'Check the original date in two sources (official or Wikipedia, plus one more).',
    'Reread the hub section about that release: facts and sources still right.',
    'Plan one quiz about the release, from sourced facts only, no lyrics.',
  ],
};
