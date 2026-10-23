// SEO Mission 3, part A (2026-10-15): the nightly IndexNow reconciliation, the post-deploy
// diff and the key file check.
//
// Reconciliation (nightly, every sitemap URL): fetch the live page, fingerprint what a search
// engine indexes (lib/seo/indexnow-fingerprint.ts), compare with seo_url_state, enqueue the
// new, changed and removed URLs. It is the safety net behind the triggers: whatever changed
// without a trigger (a code page, a rendering change, a page that turned noindex) is caught
// within a day, and nothing is sent for a page whose only change is a counter.
//
// Post-deploy diff: the same on the pages defined in the code only (urlScope 'code'), run
// right after a production deploy, so an edited article or static page is sent within the hour
// instead of the next night. The state it compares with is the last check, made on the
// previous deployment.
//
// Bounded: a time budget (the oldest-checked URLs first, the rest carried to the next run),
// at most 4 pages fetched at once, 15 s per page. A sitemap that comes back short (database
// blip) never turns into mass removals.

import { INDEXNOW_KEY, INDEXNOW_KEY_LOCATION, INDEXNOW_ORIGIN } from '@/lib/indexnow';
import { extractSignals, fingerprint, isIndexable } from '@/lib/seo/indexnow-fingerprint';
import { checkKeyFile, diffObservation, normalizeUrl, pathOf, sitemapLooksTruncated, urlScope } from '@/lib/seo/indexnow-plan';

import type { IndexNowStore } from '@/lib/seo/indexnow-outbox';
import type { ChangeReason, Observation, StateRow } from '@/lib/seo/indexnow-plan';

const UA = 'Mozilla/5.0 (compatible; kpopquiz-indexnow)';
const PAGE_TIMEOUT_MS = 15000;

export interface PageFetch {
  status: number;
  html: string;
  xRobots: string;
}

export async function fetchPage(url: string): Promise<PageFetch> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'manual', cache: 'no-store', signal: ctrl.signal, headers: { 'user-agent': UA } });
    const html = res.status === 200 ? await res.text() : '';
    if (res.status !== 200) await res.body?.cancel().catch(() => undefined);
    return { status: res.status, html, xRobots: res.headers.get('x-robots-tag') ?? '' };
  } catch {
    return { status: 0, html: '', xRobots: '' };
  } finally {
    clearTimeout(timer);
  }
}

/** Every <loc> of the live sitemap, normalized; null when it cannot be read. */
export async function fetchSitemapUrls(): Promise<string[] | null> {
  const page = await fetchPage(`${INDEXNOW_ORIGIN}/sitemap.xml`);
  if (page.status !== 200) return null;
  const out = new Set<string>();
  for (const m of page.html.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)) {
    const u = normalizeUrl(m[1]!.replace(/&amp;/g, '&'));
    if (u) out.add(u);
  }
  return [...out];
}

/** Fetch one URL and reduce it to what the state stores. */
export function observe(url: string, page: PageFetch): Observation {
  if (page.status !== 200) return { url, status: page.status, hash: null, indexable: false };
  const signals = extractSignals(page.html, pathOf(url), page.xRobots);
  return { url, status: 200, hash: fingerprint(signals), indexable: isIndexable(200, signals, url) };
}

export interface ReconcileOptions {
  scope: 'all' | 'code';
  kind: 'reconcile' | 'deploy_diff';
  now?: Date;
  budgetMs?: number;
  concurrency?: number;
  fetchPage?: (url: string) => Promise<PageFetch>;
  fetchSitemap?: () => Promise<string[] | null>;
}

export interface ReconcileReport {
  ok: boolean;
  error?: string;
  sitemapUrls: number;
  checked: number;
  carriedOver: number;
  fetchErrors: number;
  notIndexable: number;
  enqueued: Record<ChangeReason, number>;
  removalsSkipped: boolean;
}

async function pool<T>(items: readonly T[], size: number, deadline: number, work: (item: T) => Promise<void>): Promise<number> {
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length && Date.now() < deadline) {
      const item = items[next++]!;
      await work(item);
      done += 1;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(size, items.length)) }, worker));
  return done;
}

export async function runReconcile(store: IndexNowStore, opts: ReconcileOptions): Promise<ReconcileReport> {
  const now = opts.now ?? new Date();
  const nowIso = now.toISOString();
  const deadline = Date.now() + (opts.budgetMs ?? 240000);
  const getPage = opts.fetchPage ?? fetchPage;
  const inScope = (url: string): boolean => opts.scope === 'all' || urlScope(pathOf(url)) === 'code';
  const report: ReconcileReport = { ok: true, sitemapUrls: 0, checked: 0, carriedOver: 0, fetchErrors: 0, notIndexable: 0, enqueued: { new: 0, changed: 0, removed: 0 }, removalsSkipped: false };

  const listed = await (opts.fetchSitemap ?? fetchSitemapUrls)();
  if (!listed) {
    report.ok = false;
    report.error = 'sitemap_unreadable';
    console.error(`[indexnow-${opts.kind}] ALERT: the sitemap could not be read`);
    await store.event('alert', null, { reason: 'sitemap_unreadable', run: opts.kind });
    return report;
  }
  const sitemap = new Set(listed.filter(inScope));
  report.sitemapUrls = sitemap.size;

  const states = new Map<string, StateRow>((await store.states()).map((s) => [s.url, s]));
  const previouslyListed = [...states.values()].filter((s) => s.in_sitemap && inScope(s.url));
  const missing = previouslyListed.filter((s) => !sitemap.has(s.url)).map((s) => s.url);
  report.removalsSkipped = sitemapLooksTruncated(previouslyListed.length, missing.length);
  if (report.removalsSkipped) {
    console.error(`[indexnow-${opts.kind}] ALERT: ${missing.length} of ${previouslyListed.length} URLs left the sitemap at once; removals not enqueued`);
    await store.event('alert', null, { reason: 'sitemap_shrank', run: opts.kind, missing: missing.length, previouslyListed: previouslyListed.length, sample: missing.slice(0, 10) });
  }

  // Never checked first, then the oldest check; removal candidates are confirmed by a fetch.
  const age = (u: string): number => {
    const t = states.get(u)?.last_checked_at;
    return t ? Date.parse(t) : 0;
  };
  const queue = [...sitemap].sort((a, b) => age(a) - age(b) || (a < b ? -1 : 1));
  const removalQueue = report.removalsSkipped ? [] : missing;

  const toEnqueue: Record<ChangeReason, string[]> = { new: [], changed: [], removed: [] };
  const upserts: Array<Omit<StateRow, 'last_submitted_at'>> = [];

  const handleListed = async (url: string): Promise<void> => {
    const prev = states.get(url);
    const obs = observe(url, await getPage(url));
    report.checked += 1;
    const failed = obs.status === 0 || obs.status >= 500;
    if (failed) report.fetchErrors += 1;
    else if (!obs.indexable) report.notIndexable += 1;
    const reason = diffObservation(prev, obs);
    if (reason) toEnqueue[reason].push(url);
    upserts.push({
      url,
      hash: failed ? (prev?.hash ?? null) : obs.hash,
      indexable: failed ? (prev?.indexable ?? null) : obs.indexable,
      in_sitemap: true,
      last_checked_at: nowIso,
      last_changed_at: reason ? nowIso : (prev?.last_changed_at ?? null),
      http_status: obs.status,
      scope: urlScope(pathOf(url)),
    });
  };

  const handleRemoved = async (url: string): Promise<void> => {
    const prev = states.get(url);
    const obs = observe(url, await getPage(url));
    report.checked += 1;
    if (obs.status === 0 || obs.status >= 500) { report.fetchErrors += 1; return; } // retried next run
    const gone = !obs.indexable;
    if (gone && prev?.indexable !== false) toEnqueue.removed.push(url);
    upserts.push({
      url,
      hash: obs.hash ?? prev?.hash ?? null,
      indexable: obs.indexable,
      in_sitemap: false,
      last_checked_at: nowIso,
      last_changed_at: gone ? nowIso : (prev?.last_changed_at ?? null),
      http_status: obs.status,
      scope: urlScope(pathOf(url)),
    });
  };

  const items: Array<{ url: string; removed: boolean }> = [
    ...removalQueue.map((url) => ({ url, removed: true })),
    ...queue.map((url) => ({ url, removed: false })),
  ];
  const done = await pool(items, opts.concurrency ?? 4, deadline, (it) => (it.removed ? handleRemoved(it.url) : handleListed(it.url)));
  report.carriedOver = items.length - done;

  if (upserts.length) await store.upsertStates(upserts);
  const prefix = opts.kind === 'deploy_diff' ? 'deploy' : 'reconcile';
  for (const reason of ['new', 'changed', 'removed'] as const) {
    const urls = toEnqueue[reason];
    report.enqueued[reason] = urls.length;
    if (urls.length) await store.enqueue(urls.map(pathOf), `${prefix}:${reason}`);
  }
  await store.event(opts.kind, null, { ...report });
  return report;
}

// ----- key file --------------------------------------------------------------------------

/** Nightly: the key file answers 200, text/plain, with the key as its body. Alert otherwise. */
export async function runKeyCheck(store: IndexNowStore | null, getPage: (url: string) => Promise<PageFetch & { contentType?: string | null }> = fetchKeyFile): Promise<{ ok: boolean; problems: string[] }> {
  const page = await getPage(INDEXNOW_KEY_LOCATION);
  const result = checkKeyFile(page.status, page.contentType ?? null, page.html, INDEXNOW_KEY);
  if (!result.ok) console.error(`[indexnow-keycheck] ALERT: ${INDEXNOW_KEY_LOCATION}: ${result.problems.join('; ')}`);
  if (store) {
    await store.event(result.ok ? 'keycheck' : 'alert', page.status, result.ok ? { ok: true } : { reason: 'key_file', problems: result.problems });
  }
  return result;
}

async function fetchKeyFile(url: string): Promise<PageFetch & { contentType: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: 'manual', cache: 'no-store', signal: ctrl.signal, headers: { 'user-agent': UA } });
    return { status: res.status, html: await res.text(), xRobots: '', contentType: res.headers.get('content-type') };
  } catch {
    return { status: 0, html: '', xRobots: '', contentType: null };
  } finally {
    clearTimeout(timer);
  }
}
