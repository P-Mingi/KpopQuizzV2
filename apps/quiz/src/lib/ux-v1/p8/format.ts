// P8 community: pure formatting helpers (server and client safe, no imports).
// Copy follows the prototype (docs/design/ux-dashboard-v1/prototype.html, v11.2):
// "20 min ago", "1 hour ago", "yesterday", "1,902 votes", "1.9k", "closes in 2 days".
// No em or en dashes anywhere (verse-laws 14).

import type { P8Person } from './types';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "just now", "12 min ago", "1 hour ago", "3 hours ago", "yesterday", "4 days ago", "Sep 3". */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  const d = Math.max(0, now - t);
  if (d < MIN) return 'just now';
  if (d < HOUR) return `${Math.floor(d / MIN)} min ago`;
  if (d < DAY) { const h = Math.floor(d / HOUR); return h === 1 ? '1 hour ago' : `${h} hours ago`; }
  if (d < 2 * DAY) return 'yesterday';
  if (d < 7 * DAY) return `${Math.floor(d / DAY)} days ago`;
  const date = new Date(t);
  const y = new Date(now).getUTCFullYear();
  const md = `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
  return date.getUTCFullYear() === y ? md : `${md}, ${date.getUTCFullYear()}`;
}

/** Day-granular age for badge earns: "today", "yesterday", "3 days ago". */
export function dayAgo(iso: string | null | undefined, now: number = Date.now()): string {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return '';
  const days = Math.floor((utcDay(now) - utcDay(t)) / DAY);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function utcDay(ms: number): number {
  const d = new Date(ms);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** 1902 -> "1,902". */
export function comma(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Compact counts as the prototype writes them: 312, 1.9k, 24k, 1.2M. */
export function compact(n: number): string {
  const v = Math.max(0, Math.round(n));
  if (v < 1000) return String(v);
  if (v < 10_000) return `${(Math.floor(v / 100) / 10).toString().replace(/\.0$/, '')}k`;
  if (v < 1_000_000) return `${Math.floor(v / 1000)}k`;
  return `${(Math.floor(v / 100_000) / 10).toString().replace(/\.0$/, '')}M`;
}

/** "1 vote" / "1,902 votes". */
export function plural(n: number, one: string, many: string = `${one}s`): string {
  return `${comma(n)} ${n === 1 ? one : many}`;
}

/** Reading time from a word count (200 wpm, at least 1). */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 200));
}

/** "closes in 2 days" / "closes in 5 hours" / "closes in 20 min" / "closed". */
export function closesIn(closesAt: string | null | undefined, now: number = Date.now()): string {
  const t = closesAt ? Date.parse(closesAt) : NaN;
  if (!Number.isFinite(t)) return '';
  const d = t - now;
  if (d <= 0) return 'closed';
  if (d < HOUR) return `closes in ${Math.max(1, Math.floor(d / MIN))} min`;
  if (d < DAY) { const h = Math.floor(d / HOUR); return h === 1 ? 'closes in 1 hour' : `closes in ${h} hours`; }
  const days = Math.floor(d / DAY);
  return days === 1 ? 'closes in 1 day' : `closes in ${days} days`;
}

/** Integer percentages of a split that always add up to 100 (largest remainder). */
export function percents(counts: readonly number[]): number[] {
  const total = counts.reduce((s, c) => s + Math.max(0, c), 0);
  if (total === 0) return counts.map(() => 0);
  const raw = counts.map((c) => (Math.max(0, c) / total) * 100);
  const out = raw.map((r) => Math.floor(r));
  let left = 100 - out.reduce((s, v) => s + v, 0);
  const order = raw.map((r, i) => ({ i, rem: r - Math.floor(r) })).sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const o of order) { if (left <= 0) break; out[o.i] = (out[o.i] ?? 0) + 1; left--; }
  return out;
}

/** Index of the single leading option, or -1 when nobody voted or the top is a tie
 *  (no option is painted as the winner of a tie). */
export function leaderIndex(counts: readonly number[]): number {
  let best = -1;
  let max = 0;
  counts.forEach((c, i) => { if (c > max) { max = c; best = i; } });
  if (best >= 0 && counts.filter((c) => c === max).length > 1) return -1;
  return best;
}

/** First ~max characters of plain text, cut on a word, with an ellipsis. */
export function excerpt(text: string | null | undefined, max = 180): string {
  const s = (text ?? '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trimEnd()}...`;
}

/** Plain paragraphs of a thread or comment body (blank lines split). */
export function paragraphs(text: string | null | undefined): string[] {
  return (text ?? '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

/** UTC calendar day (YYYY-MM-DD), the day key of daily_debates (DB current_date is UTC). */
export function utcDate(now: number = Date.now()): string {
  return new Date(now).toISOString().slice(0, 10);
}

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** "Lv 9" or "Lv 9 Stan" (post view), "" for the system account. */
export function levelLine(p: Pick<P8Person, 'level' | 'levelTitle'> | null, withTitle = false): string {
  if (!p || p.level === null) return '';
  return withTitle && p.levelTitle ? `Lv ${p.level} ${p.levelTitle}` : `Lv ${p.level}`;
}
