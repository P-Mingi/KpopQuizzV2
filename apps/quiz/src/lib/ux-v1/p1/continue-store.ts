// "Continue playing" runs (UX v11 home, P1), per WIRING-MAP.verified (c) 9: no
// server-side in-progress state exists, so an unfinished run lives in this
// browser's localStorage, written by the quiz player (P4: quit / leave mid-run)
// and read by the home. The home only READS; writeRun / clearRun are exported so
// the player uses the same key and shape. Tolerant when storage is blocked.
//
// Key: kq_ux_continue_v1 -> JSON array, newest first, max 6 runs:
//   { slug, title, groupSlug, answered, total, updatedAt }
// Resume target: /q/{slug} (the quiz page reads its own saved run).

export interface ContinueRun {
  slug: string;
  title: string;
  groupSlug: string | null;
  answered: number;
  total: number;
  /** ISO time of the last answer. */
  updatedAt: string;
}

export const CONTINUE_KEY = 'kq_ux_continue_v1';
const MAX_RUNS = 6;
/** Runs older than this are not offered any more. */
export const CONTINUE_MAX_AGE_DAYS = 14;

function valid(r: unknown): r is ContinueRun {
  if (!r || typeof r !== 'object') return false;
  const x = r as Record<string, unknown>;
  return typeof x.slug === 'string' && /^[a-z0-9-]{1,120}$/.test(x.slug)
    && typeof x.title === 'string' && x.title.length > 0
    && (x.groupSlug === null || typeof x.groupSlug === 'string')
    && typeof x.answered === 'number' && typeof x.total === 'number'
    && x.total > 0 && x.answered > 0 && x.answered < x.total
    && typeof x.updatedAt === 'string' && !Number.isNaN(Date.parse(x.updatedAt));
}

/** Pure: parse the stored value, drop invalid / finished / stale runs, newest first. */
export function parseRuns(raw: string | null, now: number = Date.now()): ContinueRun[] {
  if (!raw) return [];
  let list: unknown;
  try { list = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(list)) return [];
  const cutoff = now - CONTINUE_MAX_AGE_DAYS * 86_400_000;
  const seen = new Set<string>();
  return list
    .filter(valid)
    .filter((r) => Date.parse(r.updatedAt) >= cutoff)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .filter((r) => (seen.has(r.slug) ? false : (seen.add(r.slug), true)))
    .slice(0, MAX_RUNS);
}

export function readRuns(): ContinueRun[] {
  if (typeof window === 'undefined') return [];
  try { return parseRuns(window.localStorage.getItem(CONTINUE_KEY)); } catch { return []; }
}

/** For the quiz player: save or update an unfinished run (answered < total). */
export function writeRun(run: ContinueRun): void {
  if (typeof window === 'undefined' || !valid(run)) return;
  try {
    const rest = readRuns().filter((r) => r.slug !== run.slug);
    window.localStorage.setItem(CONTINUE_KEY, JSON.stringify([run, ...rest].slice(0, MAX_RUNS)));
  } catch { /* storage blocked or full */ }
}

/** For the quiz player: the run finished (or was abandoned on purpose). */
export function clearRun(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const rest = readRuns().filter((r) => r.slug !== slug);
    window.localStorage.setItem(CONTINUE_KEY, JSON.stringify(rest));
  } catch { /* storage blocked */ }
}
