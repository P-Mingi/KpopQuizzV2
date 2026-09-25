// Pure display helpers for the v11 home (P1). No I/O, no React: unit-tested.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** UTC calendar day of an instant, YYYY-MM-DD. */
export function utcDay(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10);
}

/** Minutes until the next UTC midnight (the daily rotation of the site). */
export function minutesToUtcMidnight(now: Date = new Date()): number {
  const next = new Date(`${utcDay(now)}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return Math.max(0, Math.ceil((next.getTime() - now.getTime()) / 60000));
}

/** "6h 12m" (the prototype's countdown format). */
export function countdownLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** "6 hours left" / "1 hour left" / "40 minutes left" (daily band kicker). */
export function hoursLeftLabel(mins: number): string {
  if (mins >= 120) return `${Math.floor(mins / 60)} hours left`;
  if (mins >= 60) return '1 hour left';
  return `${Math.max(1, mins)} ${mins === 1 ? 'minute' : 'minutes'} left`;
}

/** "June 30" for a YYYY-MM-DD, relative words for today and yesterday. */
export function pickedOnLabel(featured: string, today: string): string {
  if (featured === today) return 'today';
  const y = new Date(`${today}T00:00:00Z`);
  y.setUTCDate(y.getUTCDate() - 1);
  if (featured === utcDay(y)) return 'yesterday';
  const d = new Date(`${featured}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return featured;
  const sameYear = featured.slice(0, 4) === today.slice(0, 4);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}${sameYear ? '' : `, ${d.getUTCFullYear()}`}`;
}

/** Local-time greeting (the prototype's "Good evening"). */
export function greetingFor(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** Real average score of a quiz, in percent, or null below `minRuns` completions. */
export function averagePct(scoreSum: number, completions: number, questions: number, minRuns = 3): number | null {
  if (!completions || completions < minRuns || !questions) return null;
  const pct = Math.round((scoreSum / completions / questions) * 100);
  return Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : null;
}

/** Weighted mean run time (seconds) from quiz_time_stats rows, or null. */
export function meanRunSeconds(rows: { attempt_count: number; avg_time_seconds: number; total_questions?: number }[], questions?: number): number | null {
  const matching = questions ? rows.filter((r) => r.total_questions === questions) : rows;
  const use = matching.length > 0 ? matching : rows;
  let n = 0;
  let sum = 0;
  for (const r of use) {
    if (!(r.attempt_count > 0) || !(r.avg_time_seconds > 0)) continue;
    n += r.attempt_count;
    sum += r.attempt_count * r.avg_time_seconds;
  }
  return n > 0 ? sum / n : null;
}

/** "about 3 min" from seconds (at least 1 minute). */
export function aboutMinutes(seconds: number | null): string | null {
  if (seconds == null || !(seconds > 0)) return null;
  return `about ${Math.max(1, Math.round(seconds / 60))} min`;
}

/** "2 days ago" style age of a creation date (the New quizzes rows). */
export function ageLabel(iso: string, now: Date = new Date()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.floor((now.getTime() - t) / 60000));
  if (mins < 60) return mins <= 1 ? 'just now' : `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? 'yesterday' : `${days} days ago`;
  if (days < 30) { const w = Math.floor(days / 7); return w === 1 ? '1 week ago' : `${w} weeks ago`; }
  const m = Math.floor(days / 30);
  if (m < 12) return m === 1 ? '1 month ago' : `${m} months ago`;
  const y = Math.floor(days / 365);
  return y <= 1 ? '1 year ago' : `${y} years ago`;
}

/** Group initials for an avatar without a photo (the prototype's ini()). */
export function groupInitials(name: string): string {
  if (name === 'General K-pop') return 'K';
  const words = name.replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\s+/).filter(Boolean);
  const raw = words.length > 1 ? `${words[0]![0]}${words[1]![0]}` : name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2);
  return (raw || 'K').toUpperCase();
}

/** The quarantine row is not a group (91 rows, 90 visible groups, DESIGN-SPEC 16.10). */
export function isVisibleGroupSlug(slug: string): boolean {
  return !/^zzz-|quarantine/i.test(slug);
}

/** 1204 -> "1,204". */
export function comma(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** "1 fan" / "1,204 fans". */
export function fansLabel(n: number): string {
  return `${comma(n)} ${n === 1 ? 'fan' : 'fans'}`;
}
