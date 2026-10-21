// Run O1, lot (c), lane B6: the two browser stores of the network layer (cookies.md 7). Every access is in try/catch: a
// blocked store reads as empty and writes nothing.
//   fq.net.caps.v1  localStorage    impression counters and the dismissal count of the interactive cross-site links
//   fq.net.via      sessionStorage  the validated `via` of this tab, read by the sign-in redirect, removed after sign-in
import { VIA_RE } from './types';

import type { NetCapState } from './types';

export const CAPS_KEY = 'fq.net.caps.v1';
export const VIA_KEY = 'fq.net.via';

interface CapsRecord {
  v: 1;
  day: string;
  today: number;
  week: string;
  weekCount: number;
  dismissals: number;
}

const dayKey = (now: number): string => new Date(now).toISOString().slice(0, 10);

/** ISO week label (UTC) like 2026-W43. */
export function weekKey(now: number): string {
  const d = new Date(Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate()));
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const y = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(y, 0, 1)) / 86_400_000 + 1) / 7);
  return `${y}-W${String(week).padStart(2, '0')}`;
}

function blank(now: number): CapsRecord {
  return { v: 1, day: dayKey(now), today: 0, week: weekKey(now), weekCount: 0, dismissals: 0 };
}

function load(now: number): CapsRecord {
  try {
    const raw = window.localStorage.getItem(CAPS_KEY);
    if (!raw) return blank(now);
    const r = JSON.parse(raw) as Partial<CapsRecord>;
    const n = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0);
    const rec: CapsRecord = {
      v: 1,
      day: typeof r.day === 'string' ? r.day : '',
      today: n(r.today),
      week: typeof r.week === 'string' ? r.week : '',
      weekCount: n(r.weekCount),
      dismissals: n(r.dismissals),
    };
    if (rec.day !== dayKey(now)) { rec.day = dayKey(now); rec.today = 0; }
    if (rec.week !== weekKey(now)) { rec.week = weekKey(now); rec.weekCount = 0; }
    return rec;
  } catch {
    return blank(now);
  }
}

function save(rec: CapsRecord): void {
  try {
    window.localStorage.setItem(CAPS_KEY, JSON.stringify(rec));
  } catch { /* blocked store: nothing is remembered */ }
}

// The per-page counter lives in memory, keyed by the page it was counted on (a soft navigation is a new page view).
let pageKey = '';
let pageShown = 0;
function pageCount(): number {
  const key = typeof window === 'undefined' ? '' : `${window.location.pathname}${window.location.search}`;
  if (key !== pageKey) { pageKey = key; pageShown = 0; }
  return pageShown;
}

/** The counters `canShow` reads. */
export function readCaps(now: number = Date.now()): NetCapState {
  const r = load(now);
  return { pageShown: pageCount(), today: r.today, week: r.weekCount, dismissals: r.dismissals };
}

/** One interactive link was shown: the page, day and week counters go up. */
export function recordShown(now: number = Date.now()): void {
  pageCount();
  pageShown += 1;
  const r = load(now);
  r.today += 1;
  r.weekCount += 1;
  save(r);
}

/** One dismissal of any kind ("Not interested"). */
export function recordDismissal(now: number = Date.now()): void {
  const r = load(now);
  r.dismissals += 1;
  save(r);
}

/** The `via` of this tab, only when it still matches VIA_RE. */
export function readVia(): string | null {
  try {
    const v = window.sessionStorage.getItem(VIA_KEY);
    return v !== null && VIA_RE.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeVia(via: string): void {
  try {
    if (VIA_RE.test(via)) window.sessionStorage.setItem(VIA_KEY, via);
  } catch { /* blocked store */ }
}

export function clearVia(): void {
  try {
    window.sessionStorage.removeItem(VIA_KEY);
  } catch { /* blocked store */ }
}
