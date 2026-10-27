// The SEO refresh queue (SEO Mission 3, part E point 1): which pages to refresh first. It is
// computed for each week (anchored on its Monday, so it reads the same all week) from four
// signals, and the owner approves the top 5 once a month in /admin/seo.
//
//   event_soon      an event of the page's group starts within 14 days, or is on now
//                   (docs/seo/CALENDAR.md, lib/seo/calendar.ts)
//   hub_stale       a group quiz hub has not changed for 90 days or more. A hub changes when a
//                   quiz of its group is published: its date is the newest published quiz
//                   created_at, the same honest lastmod the sitemap gives it
//   clicks_down     Search Console clicks of the week fell 30% or more against the baseline
//   citations_down  Bing AI (Copilot) citations of the week fell 30% or more
//
// Search Console and Bing numbers are not in the database yet (part C adds seo_gsc_weekly
// and seo_bing_weekly). The ranking takes them through SearchSignals; while a source gives
// null, its signal is off and adds nothing. Nothing is estimated in their place.
//
// Pure module (no Supabase, no Next): refresh-queue-server.ts feeds it real rows.

import { addDays, dayMs, daysBetween, lastDay, type SeoEvent } from './calendar';

export const REFRESH = {
  /** A hub with no change for this many days is stale. */
  staleDays: 90,
  /** An event this many days away or less puts its pages in the queue. */
  eventWindowDays: 14,
  /** A fall of this share or more against the baseline counts. */
  dropShare: 0.3,
  /** Floors: below these baselines a fall is noise. */
  minBaselineClicks: 20,
  minBaselineCitations: 10,
  /** How many pages the owner approves each month. */
  monthlyApprovals: 5,
} as const;

/**
 * Points per signal. The score of a page is the sum of its signals (each counted once).
 * Alone, age never outranks a real fall in traffic, and a fall of less than half never
 * outranks a dated event.
 *   event_soon      60 + 2 per day closer than 14   (60 to 88)
 *   clicks_down     40 + 0.4 per point of fall      (52 to 80)
 *   citations_down  40 + 0.4 per point of fall      (52 to 80)
 *   hub_stale       30 + 1 per 6 days past 90, at most 20 more   (30 to 50)
 * Ties: more finished plays on the hub's published quizzes first (a page more people use),
 * then the path in alphabetical order, so the order is stable.
 */
export function eventPoints(daysUntil: number): number {
  return 60 + 2 * (REFRESH.eventWindowDays - Math.max(0, Math.min(REFRESH.eventWindowDays, daysUntil)));
}
export function dropPoints(share: number): number {
  return 40 + Math.round(40 * Math.max(0, Math.min(1, share)));
}
export function stalePoints(daysStale: number): number {
  return 30 + Math.min(20, Math.floor(Math.max(0, daysStale - REFRESH.staleDays) / 6));
}

export type RefreshReasonCode = 'event_soon' | 'clicks_down' | 'citations_down' | 'hub_stale';

export interface RefreshReason {
  code: RefreshReasonCode;
  points: number;
  /** Plain English for the admin page and the e-mail. */
  text: string;
}

/** One group quiz hub, from published quizzes only. */
export interface HubFreshness {
  /** "/bts-quiz" */
  path: string;
  groupSlug: string;
  groupName: string;
  /** created_at of the newest published quiz of the group (ISO). */
  lastUpdated: string;
  /** Finished plays summed over the group's published quizzes (quizzes.play_count). */
  plays: number;
}

/** One week of a metric against its baseline (for example the mean of the 4 weeks before). */
export interface WeeklyChange {
  current: number;
  baseline: number;
}

export interface SearchSignals {
  /** Search Console clicks by path, or null while there is no data. */
  clicks: ReadonlyMap<string, WeeklyChange> | null;
  /** Bing AI citations by path, or null while there is no data. */
  citations: ReadonlyMap<string, WeeklyChange> | null;
}

/** Where the search numbers come from. Part C plugs a real source in. */
export interface SearchSignalsSource {
  read(weekOf: string): Promise<SearchSignals>;
}

/** Today: no Search Console or Bing data in the database, so both signals are off. */
export const NO_SEARCH_SIGNALS: SearchSignalsSource = {
  read: async () => ({ clicks: null, citations: null }),
};

export interface RefreshInput {
  /** Monday of the week, YYYY-MM-DD. */
  weekOf: string;
  hubs: readonly HubFreshness[];
  events: readonly SeoEvent[];
  search: SearchSignals;
}

export interface RefreshItem {
  rank: number;
  path: string;
  label: string;
  score: number;
  reasons: RefreshReason[];
  plays: number;
}

/** Monday (UTC) of the week holding `now`, YYYY-MM-DD. */
export function weekOf(now: Date = new Date()): string {
  const day = now.toISOString().slice(0, 10);
  const dow = new Date(dayMs(day)).getUTCDay(); // 0 Sunday .. 6 Saturday
  return addDays(day, -((dow + 6) % 7));
}

/** First day of the month of a YYYY-MM-DD day: "2026-10-01". */
export function monthOf(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

const fmtDay = (day: string): string =>
  new Date(dayMs(day)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const TYPE_WORD: Record<SeoEvent['type'], string> = { comeback: 'comeback', concert: 'concert', awards: 'award show', anniversary: 'anniversary' };

/** The pages an event asks to refresh: its group's hub (when the hub exists) and its extra pages. */
export function eventPaths(e: SeoEvent, hubByGroup: ReadonlyMap<string, HubFreshness>): string[] {
  const out = new Set<string>();
  if (e.group) {
    const hub = hubByGroup.get(e.group);
    if (hub) out.add(hub.path);
  }
  for (const p of e.pages ?? []) out.add(p);
  return [...out];
}

function dropReason(code: 'clicks_down' | 'citations_down', change: WeeklyChange | undefined, floor: number): RefreshReason | null {
  if (!change || !(change.baseline >= floor) || !Number.isFinite(change.current)) return null;
  const share = (change.baseline - change.current) / change.baseline;
  if (share < REFRESH.dropShare) return null;
  const pct = Math.round(share * 100);
  const what = code === 'clicks_down' ? 'Search clicks' : 'Copilot citations';
  return { code, points: dropPoints(share), text: `${what} down ${pct}% (${Math.round(change.current)} this week, baseline ${Math.round(change.baseline)})` };
}

/** Rank every page with at least one signal. Highest score first; rank starts at 1. */
export function rankRefreshQueue(input: RefreshInput): RefreshItem[] {
  const { weekOf: week, hubs, events, search } = input;
  const hubByGroup = new Map(hubs.map((h) => [h.groupSlug, h]));
  const hubByPath = new Map(hubs.map((h) => [h.path, h]));
  const reasons = new Map<string, Map<RefreshReasonCode, RefreshReason>>();
  const add = (path: string, r: RefreshReason): void => {
    const m = reasons.get(path) ?? new Map<RefreshReasonCode, RefreshReason>();
    const prev = m.get(r.code);
    if (!prev || r.points > prev.points) m.set(r.code, r);
    reasons.set(path, m);
  };

  // event_soon: starts within the window, or is on now.
  for (const e of events) {
    const until = daysBetween(week, e.date);
    const ongoing = until < 0 && dayMs(lastDay(e)) >= dayMs(week);
    if (!ongoing && (until < 0 || until > REFRESH.eventWindowDays)) continue;
    const d = Math.max(0, until);
    const who = e.group ? (hubByGroup.get(e.group)?.groupName ?? e.group) : e.title;
    const when = ongoing ? 'on now' : d === 0 ? 'starts this Monday' : `in ${d} day${d === 1 ? '' : 's'}`;
    const text = `${who} ${TYPE_WORD[e.type]} ${when} (${fmtDay(e.date)}): ${e.title}`;
    for (const path of eventPaths(e, hubByGroup)) add(path, { code: 'event_soon', points: eventPoints(d), text });
  }

  // hub_stale: no published quiz for 90 days or more.
  for (const h of hubs) {
    const age = daysBetween(h.lastUpdated.slice(0, 10), week);
    if (!(age >= REFRESH.staleDays)) continue;
    add(h.path, { code: 'hub_stale', points: stalePoints(age), text: `Hub not updated for ${age} days (newest quiz ${fmtDay(h.lastUpdated.slice(0, 10))})` });
  }

  // clicks_down and citations_down: off while their source gives null.
  for (const [code, map, floor] of [
    ['clicks_down', search.clicks, REFRESH.minBaselineClicks],
    ['citations_down', search.citations, REFRESH.minBaselineCitations],
  ] as const) {
    if (!map) continue;
    for (const [path, change] of map) {
      const r = dropReason(code, change, floor);
      if (r) add(path, r);
    }
  }

  const order: Record<RefreshReasonCode, number> = { event_soon: 0, clicks_down: 1, citations_down: 2, hub_stale: 3 };
  const items = [...reasons.entries()].map(([path, m]) => {
    const rs = [...m.values()].sort((a, b) => order[a.code] - order[b.code]);
    const hub = hubByPath.get(path);
    return {
      rank: 0,
      path,
      label: hub ? `${hub.groupName} quiz hub` : path,
      score: rs.reduce((s, r) => s + r.points, 0),
      reasons: rs,
      plays: hub?.plays ?? 0,
    };
  });
  items.sort((a, b) => b.score - a.score || b.plays - a.plays || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return items.map((it, i) => ({ ...it, rank: i + 1 }));
}

/**
 * Check an approval request against the current top of the queue. The month is never taken
 * from the request: the server passes it. Returns the approved paths, in queue order.
 */
export function parseApproval(body: unknown, top: readonly string[]): { paths: string[] } | { error: string } {
  const raw = (body ?? {}) as { paths?: unknown };
  if (!Array.isArray(raw.paths)) return { error: 'paths must be a list' };
  const asked = new Set<string>();
  for (const p of raw.paths) {
    if (typeof p !== 'string') return { error: 'paths must be strings' };
    asked.add(p);
  }
  if (asked.size === 0) return { error: 'choose at least one page' };
  if (asked.size > REFRESH.monthlyApprovals) return { error: `at most ${REFRESH.monthlyApprovals} pages a month` };
  const allowed = top.slice(0, REFRESH.monthlyApprovals);
  for (const p of asked) if (!allowed.includes(p)) return { error: `${p.slice(0, 80)} is not in the current top ${REFRESH.monthlyApprovals}` };
  return { paths: allowed.filter((p) => asked.has(p)) };
}
