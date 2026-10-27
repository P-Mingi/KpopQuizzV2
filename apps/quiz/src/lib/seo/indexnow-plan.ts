// SEO Mission 3, part A (2026-10-15): the pure rules of the IndexNow system. No network, no
// database: the flush, the reconciliation and the admin page call these, and
// indexnow-plan.test.ts pins them (dedupe, the 5-minute rule, batches of 10,000, the 429
// back-off, removals, coverage, the key file check).

import { INDEXNOW_BATCH_MAX, INDEXNOW_HOST, INDEXNOW_ORIGIN } from '@/lib/indexnow';

/** A URL submitted less than this long ago is not sent again (it waits for the next run). */
export const RESUBMIT_WINDOW_MS = 5 * 60 * 1000;
/** After this many failed attempts (a day of hourly runs) a row is given up, with an alert. */
export const MAX_ATTEMPTS = 24;
/** First wait after a 429, doubled on each 429 in a row, never more than BACKOFF_MAX_MS. */
export const BACKOFF_BASE_MS = 60 * 60 * 1000;
export const BACKOFF_MAX_MS = 24 * 60 * 60 * 1000;

export interface OutboxRow {
  id: number;
  url: string;
  reason: string;
  enqueued_at: string;
  last_enqueued_at: string;
  attempts: number;
}

/**
 * The one spelling of a URL in the system: https://kpopquiz.org + path, no query, no hash, no
 * trailing slash (the home page is https://kpopquiz.org/). Accepts a root-relative path or an
 * absolute URL on kpopquiz.org (www is folded). Anything else is null.
 */
export function normalizeUrl(input: string): string | null {
  const raw = (input ?? '').trim();
  if (!raw) return null;
  let u: URL;
  try {
    u = raw.startsWith('/') ? new URL(raw, INDEXNOW_ORIGIN) : new URL(raw);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (host !== INDEXNOW_HOST || (u.protocol !== 'https:' && u.protocol !== 'http:')) return null;
  const path = u.pathname.replace(/\/+$/, '') || '/';
  return `${INDEXNOW_ORIGIN}${path}`;
}

/** The path of a normalized URL ("/" for the home page). */
export function pathOf(url: string): string {
  return url.startsWith(INDEXNOW_ORIGIN) ? url.slice(INDEXNOW_ORIGIN.length) || '/' : url;
}

/** Split into consecutive slices of at most `size` (IndexNow takes 10,000 URLs per request). */
export function chunk<T>(items: readonly T[], size: number = INDEXNOW_BATCH_MAX): T[][] {
  if (size < 1) throw new Error('chunk size must be at least 1');
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export interface FlushPlan {
  /** One entry per URL, oldest first; `ids` are every pending row of that URL. */
  send: Array<{ url: string; ids: number[] }>;
  /** Already told: a submission of the URL came after its last enqueue. */
  covered: number[];
  /** Submitted less than 5 minutes ago and changed since: next run. */
  deferred: number[];
  /** Failed MAX_ATTEMPTS times. */
  gaveUp: number[];
}

/**
 * What one flush does with the pending rows. Rows are deduplicated by URL (the database
 * keeps one pending row per URL; this holds even if it did not). `lastSubmitted` maps a URL
 * to the time IndexNow last accepted it (seo_url_state.last_submitted_at).
 */
export function planFlush(rows: readonly OutboxRow[], lastSubmitted: ReadonlyMap<string, string | null>, now: Date): FlushPlan {
  const byUrl = new Map<string, OutboxRow[]>();
  for (const r of rows) {
    const url = normalizeUrl(r.url) ?? r.url;
    const list = byUrl.get(url);
    if (list) list.push(r);
    else byUrl.set(url, [r]);
  }
  const plan: FlushPlan = { send: [], covered: [], deferred: [], gaveUp: [] };
  const sendWithAge: Array<{ url: string; ids: number[]; first: number; firstId: number }> = [];
  for (const [url, list] of byUrl) {
    const ids = list.map((r) => r.id);
    if (list.some((r) => r.attempts >= MAX_ATTEMPTS)) { plan.gaveUp.push(...ids); continue; }
    const lastEnq = Math.max(...list.map((r) => Date.parse(r.last_enqueued_at || r.enqueued_at)));
    const lastSub = lastSubmitted.get(url);
    const lastSubMs = lastSub ? Date.parse(lastSub) : NaN;
    if (Number.isFinite(lastSubMs) && lastEnq <= lastSubMs) { plan.covered.push(...ids); continue; }
    if (Number.isFinite(lastSubMs) && now.getTime() - lastSubMs < RESUBMIT_WINDOW_MS) { plan.deferred.push(...ids); continue; }
    sendWithAge.push({ url, ids, first: Math.min(...list.map((r) => Date.parse(r.enqueued_at))), firstId: Math.min(...ids) });
  }
  // oldest first; rows enqueued in the same instant keep their enqueue order
  sendWithAge.sort((a, b) => a.first - b.first || a.firstId - b.firstId);
  plan.send = sendWithAge.map(({ url, ids }) => ({ url, ids }));
  return plan;
}

export type StatusClass = 'ok' | 'backoff' | 'alert' | 'retry';

/**
 * IndexNow answers (indexnow.org/documentation):
 *   200 OK, 202 accepted (key check pending)             ok
 *   429 too many requests                                 backoff: stop, wait, retry later
 *   400 bad request, 403 key not valid, 422 URL not ours  alert: stop, the next run retries
 *   anything else, 0 for a network error                  retry next run
 */
export function classifyStatus(status: number): StatusClass {
  if (status === 200 || status === 202) return 'ok';
  if (status === 429) return 'backoff';
  if (status === 400 || status === 403 || status === 422) return 'alert';
  return 'retry';
}

/** Retry-After as milliseconds from `now` (seconds or an HTTP date), or null. */
export function parseRetryAfter(value: string | null | undefined, now: Date): number | null {
  const v = (value ?? '').trim();
  if (!v) return null;
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const t = Date.parse(v);
  return Number.isFinite(t) ? Math.max(0, t - now.getTime()) : null;
}

/**
 * The wait after a 429. `consecutive` counts this one (1 for the first 429 after a good run):
 * 1 h, 2 h, 4 h ... capped at 24 h, never shorter than the Retry-After the server asked for
 * (itself capped at 24 h).
 */
export function nextBackoff(consecutive: number, retryAfter: string | null | undefined, now: Date): { until: Date; consecutive: number } {
  const c = Math.max(1, Math.floor(consecutive));
  const exp = Math.min(BACKOFF_BASE_MS * 2 ** (c - 1), BACKOFF_MAX_MS);
  const asked = parseRetryAfter(retryAfter, now) ?? 0;
  const wait = Math.min(Math.max(exp, asked), BACKOFF_MAX_MS);
  return { until: new Date(now.getTime() + wait), consecutive: c };
}

export interface EventLite {
  kind: string;
  created_at: string;
  detail: Record<string, unknown> | null;
}

/**
 * The back-off in force, from the latest events: the last 'backoff' row, unless a flush that
 * IndexNow accepted came after it. `consecutive` is what the next 429 builds on.
 */
export function backoffState(events: readonly EventLite[], now: Date): { active: boolean; until: Date | null; consecutive: number } {
  const latest = (pred: (e: EventLite) => boolean): EventLite | undefined =>
    [...events].filter(pred).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))[0];
  const b = latest((e) => e.kind === 'backoff');
  if (!b) return { active: false, until: null, consecutive: 0 };
  const okFlush = latest((e) => e.kind === 'flush' && Number(e.detail?.sent ?? 0) > 0 && e.detail?.ok === true);
  if (okFlush && Date.parse(okFlush.created_at) > Date.parse(b.created_at)) return { active: false, until: null, consecutive: 0 };
  const until = typeof b.detail?.until === 'string' ? new Date(b.detail.until) : null;
  const consecutive = Number(b.detail?.consecutive ?? 1) || 1;
  return { active: !!until && until.getTime() > now.getTime(), until, consecutive };
}

// ----- reconciliation --------------------------------------------------------------------

/**
 * code: a page defined in the code (static pages, articles, blind test modes, landings, /pt).
 * data: a page built from database rows, which the triggers cover (quizzes, group hubs and
 * trivia, blind test group pages, which member, name them all, pulse months, profiles, Verse).
 * The post-deploy diff checks the code pages; the nightly run checks both.
 */
export function urlScope(path: string): 'code' | 'data' {
  if (/^\/q\//.test(path)) return 'data';
  if (/^\/u\//.test(path)) return 'data';
  if (/^\/verse(\/|$)/.test(path)) return 'data';
  if (/^\/blindtest\/group-/.test(path)) return 'data';
  if (/^\/data\/pulse\/\d{4}-\d{2}$/.test(path)) return 'data';
  if (/^\/which-[a-z0-9-]+-member-are-you$/.test(path)) return 'data';
  if (/^\/[a-z0-9-]+-name-all-members$/.test(path)) return 'data';
  if (/^\/[a-z0-9-]+-(quiz|trivia)$/.test(path) && !CODE_QUIZ_PATHS.has(path)) return 'data';
  return 'code';
}

/** Code pages that end in -quiz like a group hub. */
const CODE_QUIZ_PATHS = new Set(['/kpop-demon-hunters-quiz']);

export interface StateRow {
  url: string;
  hash: string | null;
  indexable: boolean | null;
  in_sitemap: boolean;
  last_submitted_at: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  http_status: number | null;
  scope: 'code' | 'data' | null;
}

export interface Observation {
  url: string;
  /** HTTP status; 0 when the fetch failed or timed out. */
  status: number;
  hash: string | null;
  indexable: boolean;
}

export type ChangeReason = 'new' | 'changed' | 'removed';

/**
 * Compare one fetched page with what the state knew. A failed fetch (status 0 or 5xx) changes
 * nothing: a blip is never a removal. Returns the reason to enqueue, or null.
 *   no state row, or a row never fingerprinted and never submitted   new (when indexable)
 *   fingerprint or indexability differs                              changed
 *   (an indexable page that turns 404, noindex or canonical elsewhere is a change: a removal
 *   to tell IndexNow about)
 */
export function diffObservation(prev: StateRow | undefined, obs: Observation): ChangeReason | null {
  if (obs.status === 0 || obs.status >= 500) return null;
  if (!prev || (prev.hash === null && prev.indexable === null)) {
    if (!obs.indexable) return null;
    return prev?.last_submitted_at ? null : 'new';
  }
  if (prev.hash !== obs.hash || (prev.indexable ?? false) !== obs.indexable) {
    // a page that was never indexable and still is not: nothing to tell
    if (!prev.indexable && !obs.indexable) return null;
    return 'changed';
  }
  return null;
}

/**
 * The sitemap can come back short (on a database blip it lists only the static pages). Removal
 * detection is skipped when more than 10% of the URLs it listed last time (and more than 20
 * of them) are missing at once.
 */
export function sitemapLooksTruncated(previouslyListed: number, missingNow: number): boolean {
  return missingNow > 20 && missingNow > previouslyListed * 0.1;
}

/** Share of sitemap URLs IndexNow has accepted at least once (target 100%). */
export function coverage(rows: ReadonlyArray<Pick<StateRow, 'in_sitemap' | 'last_submitted_at'>>): { inSitemap: number; submitted: number; pct: number } {
  const listed = rows.filter((r) => r.in_sitemap);
  const submitted = listed.filter((r) => !!r.last_submitted_at).length;
  return { inSitemap: listed.length, submitted, pct: listed.length ? Math.floor((submitted / listed.length) * 1000) / 10 : 0 };
}

// ----- key file --------------------------------------------------------------------------

/** The key file must answer 200, as text/plain, with the key as its whole body. */
export function checkKeyFile(status: number, contentType: string | null, body: string, key: string): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  if (status !== 200) problems.push(`HTTP ${status} (expected 200)`);
  if (!/^text\/plain\b/i.test((contentType ?? '').trim())) problems.push(`content-type "${contentType ?? ''}" (expected text/plain)`);
  if (body.trim() !== key) problems.push('body is not the key');
  return { ok: problems.length === 0, problems };
}
