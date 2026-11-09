// Audit 04 section 4 (P0-5): the award-show calendar the award quiz engine reads. The data is src/data/events/award-shows.json,
// every date has a source with the day it was read; a show is "confirmed" only on an official source (rulebook 5.4, 5.5), else
// "reported". checkAwardShows is the lint: calendar.test.ts runs it on the file, so a bad edit fails the build.
// Nothing here publishes anything: the award-prep cron (lib/events/award-prep.ts, flag AWARD_PREP off) drafts, the owner approves.

import raw from '@/data/events/award-shows.json';

export type ShowStatus = 'confirmed' | 'reported';
export type SourceKind = 'official' | 'outlet';
/** What a draft may ask about. Never a fan-vote category, never a prediction (audit 04 section 4, rule 4.4). */
export const ALLOWED_CATEGORIES = ['grand_prize', 'main_prize', 'genre_prize', 'show_facts', 'history'] as const;
export type AwardCategory = (typeof ALLOWED_CATEGORIES)[number];
/** Categories that need winners: a show that gives no awards (SBS Gayo Daejeon) may only ask these. */
export const NO_WINNER_CATEGORIES: readonly AwardCategory[] = ['show_facts', 'history'];

export interface ShowSource { url: string; publisher: string; kind: SourceKind; read_on: string }
export interface AwardShow {
  id: string;
  name: string;
  /** UTC calendar days of the show, YYYY-MM-DD, in order. */
  days: string[];
  venue: string;
  status: ShowStatus;
  gives_awards: boolean;
  sources: ShowSource[];
  nominees_url: string | null;
  winners_url: string | null;
  quiz_slug: string;
  /** Days before the first show day when the draft is prepared. */
  prep_days: number;
  allowed_categories: AwardCategory[];
}

export const PREP_DAYS = 10;
/** Hosts that are never a source (rulebook 5.2 and 5.3). */
const BLOCKED_HOSTS = ['kprofiles.com', 'fandom.com', 'wikia.com', 'soompi.com', 'allkpop.com'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const DASH = /[–—]/;

const hostOf = (url: string): string => /^https:\/\/([a-z0-9.-]+)/i.exec(url)?.[1]?.toLowerCase() ?? '';
const validDay = (d: string): boolean => DAY.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d);

/** Every problem of a calendar, as lines ([] when it is clean). */
export function checkAwardShows(shows: readonly AwardShow[]): string[] {
  const out: string[] = [];
  const ids = new Set<string>();
  const slugs = new Set<string>();
  for (const s of shows) {
    const at = (m: string): void => { out.push(`${s.id || '(no id)'}: ${m}`); };
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.id ?? '')) at('the id is lowercase words joined by hyphens');
    if (ids.has(s.id)) at('the id repeats');
    ids.add(s.id);
    if (DASH.test(JSON.stringify(s))) at('contains an en or em dash');
    if (!s.name || !s.venue) at('needs a name and a venue');
    if (!Array.isArray(s.days) || s.days.length < 1 || s.days.length > 4 || !s.days.every(validDay)) at('days are 1 to 4 real YYYY-MM-DD dates');
    else if (s.days.some((d, i) => i > 0 && d <= s.days[i - 1]!)) at('days must be in increasing order');
    if (s.status !== 'confirmed' && s.status !== 'reported') at('status is confirmed or reported');
    if (!Array.isArray(s.sources) || s.sources.length < 1) at('needs at least one source');
    for (const src of s.sources ?? []) {
      if (!/^https:\/\/[a-z0-9.-]+\//i.test(src.url ?? '')) at(`source "${src.url}" is not an https link`);
      if (BLOCKED_HOSTS.some((b) => hostOf(src.url ?? '') === b || hostOf(src.url ?? '').endsWith(`.${b}`))) at(`source ${hostOf(src.url)} is not an allowed source`);
      if (src.kind !== 'official' && src.kind !== 'outlet') at(`source ${src.url} needs a kind (official or outlet)`);
      if (!validDay(src.read_on ?? '')) at(`source ${src.url} needs the day it was read`);
      if (!src.publisher) at(`source ${src.url} needs a publisher`);
    }
    if (s.status === 'confirmed' && !(s.sources ?? []).some((x) => x.kind === 'official')) at('confirmed needs an official source');
    for (const u of [s.nominees_url, s.winners_url]) if (u !== null && !/^https:\/\/[a-z0-9.-]+\//i.test(u ?? '')) at('nominees_url and winners_url are an https link or null');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s.quiz_slug ?? '') || /\d{4}/.test(s.quiz_slug ?? '')) at('quiz_slug is an evergreen slug with no year');
    if (!/-quiz$/.test(s.quiz_slug ?? '')) at('quiz_slug ends with -quiz');
    if (slugs.has(s.quiz_slug)) at('quiz_slug repeats');
    slugs.add(s.quiz_slug);
    if (s.prep_days !== PREP_DAYS) at(`prep_days is ${PREP_DAYS}`);
    if (!Array.isArray(s.allowed_categories) || s.allowed_categories.length < 1 || !s.allowed_categories.every((c) => (ALLOWED_CATEGORIES as readonly string[]).includes(c))) at('allowed_categories come from the allowed list (no fan vote, no prediction)');
    if (s.gives_awards === false && (s.allowed_categories ?? []).some((c) => !NO_WINNER_CATEGORIES.includes(c))) at('a show with no awards asks only show facts and history');
    if (s.gives_awards === false && s.winners_url !== null) at('a show with no awards has no winners_url');
  }
  return out;
}

export const AWARD_SHOWS: readonly AwardShow[] = (raw as { shows: AwardShow[] }).shows;

const DAY_MS = 86_400_000;
/** The first show day (UTC midnight, ms). */
export const firstDayMs = (s: AwardShow): number => Date.parse(`${s.days[0]}T00:00:00Z`);
export const lastDayMs = (s: AwardShow): number => Date.parse(`${s.days[s.days.length - 1]}T00:00:00Z`) + DAY_MS - 1;

/** The preparation window of a show: from prep_days before its first day (T-10) to the evening before it (T-1). */
export function prepWindow(s: AwardShow): { from: number; to: number } {
  return { from: firstDayMs(s) - s.prep_days * DAY_MS, to: firstDayMs(s) - 1 };
}
