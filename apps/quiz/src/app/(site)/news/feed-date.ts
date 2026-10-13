// /news feed dates. Pure, never throws.
//
// SEO (owner, 2026-10-13): a feed item's pubDate is third-party input. One item with
// a missing or malformed date made `new Date(x).toISOString()` throw "RangeError:
// Invalid time value" during render, which 500ed the whole page. Every date use on
// /news goes through these helpers: an invalid date is omitted (no label, sorted
// last), never thrown and never replaced by a made-up "now".

/** Epoch ms of a feed date, or null when it is missing or unparseable. */
export function parseFeedDate(raw: unknown): number | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/** Sort comparator: newest first, undated items last (ties keep their order). */
export function compareFeedDatesDesc(a: unknown, b: unknown): number {
  const ta = parseFeedDate(a);
  const tb = parseFeedDate(b);
  if (ta === null && tb === null) return 0;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return tb - ta;
}

/** "12m ago" / "3h ago" / "2d ago", or '' when the date is invalid (the label is omitted). */
export function feedTimeAgo(raw: unknown, now: number = Date.now()): string {
  const then = parseFeedDate(raw);
  if (then === null || !Number.isFinite(now)) return '';
  // A date slightly in the future (feed clock skew) reads as "0m ago", not "-3m ago".
  const mins = Math.max(0, Math.floor((now - then) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
