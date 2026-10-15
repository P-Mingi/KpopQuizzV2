// IndexNow (SEO indexation, audit v2). Bing is our #1 search referrer and
// IndexNow lets us push changed URLs to Bing/Yandex/Seznam the instant they
// change instead of waiting for a crawl. Standard protocol, no SEO risk: it
// only asks engines to (re)crawl URLs we own. The key is published at
// https://kpopquiz.org/<KEY>.txt (public/ file) which proves ownership.
//
// SEO Mission 3 (2026-10-15): this module is the only one that talks to
// api.indexnow.org. Feature code never calls it directly: it writes the outbox
// (lib/seo/indexnow-outbox.ts), and the hourly flush or the publish fast path send.
// INDEXNOW_DRY_RUN=1 turns every send into a log line: nothing leaves the server.

// Exported so a unit test can assert public/<KEY>.txt matches it. If the key is
// ever rotated here but not in the public file (or the file is deleted), every
// IndexNow submission silently 403s and Bing - our #1 referrer - stops recrawling.
export const INDEXNOW_KEY = '4b2f9a7ce8d1465fb0a3e6c95d47128a';
const KEY = INDEXNOW_KEY;
export const INDEXNOW_HOST = 'kpopquiz.org';
export const INDEXNOW_ORIGIN = `https://${INDEXNOW_HOST}`;
export const INDEXNOW_KEY_LOCATION = `${INDEXNOW_ORIGIN}/${KEY}.txt`;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
/** IndexNow hard limit per request. */
export const INDEXNOW_BATCH_MAX = 10000;
const BATCH = INDEXNOW_BATCH_MAX;
const POST_TIMEOUT_MS = 20000;

function toAbsolute(pathOrUrl: string): string {
  return pathOrUrl.startsWith('http') ? pathOrUrl : `${INDEXNOW_ORIGIN}${pathOrUrl}`;
}

/** INDEXNOW_DRY_RUN set to 1, true, yes or on: log what would be sent, send nothing. */
export function isIndexNowDryRun(env: Record<string, string | undefined> = process.env): boolean {
  return /^(1|true|yes|on)$/i.test((env.INDEXNOW_DRY_RUN ?? '').trim());
}

export type FetchLike = (input: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ status: number; headers: { get(name: string): string | null } }>;

/**
 * One POST to api.indexnow.org with host, key and keyLocation. Never throws: a network
 * failure or a timeout is status 0. `retryAfter` is the Retry-After header of a 429.
 * Callers check the dry-run switch before calling this.
 */
export async function postIndexNowBatch(urlList: string[], fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<{ status: number; retryAfter: string | null }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), POST_TIMEOUT_MS);
  try {
    const res = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: INDEXNOW_HOST, key: KEY, keyLocation: INDEXNOW_KEY_LOCATION, urlList }),
      signal: ctrl.signal,
    });
    return { status: res.status, retryAfter: res.headers.get('retry-after') };
  } catch (err) {
    console.warn('[indexnow] batch failed:', err instanceof Error ? err.message : err);
    return { status: 0, retryAfter: null };
  } finally {
    clearTimeout(timer);
  }
}

export interface PingResult {
  submitted: number;
  batches: number;
  /** Every batch answered 200 or 202. False in dry run. */
  ok: boolean;
  statuses: number[];
  dryRun: boolean;
}

/**
 * Submit one or more URLs (absolute or root-relative paths) to IndexNow.
 * Fire-and-forget and fully swallowed: indexing is a hint, never worth failing
 * a user action (publish) or a deploy over. Batches to the 10k-per-call limit.
 */
export async function pingIndexNow(pathsOrUrls: string[], fetchImpl?: FetchLike): Promise<PingResult> {
  const urls = [...new Set(pathsOrUrls.map(toAbsolute))];
  if (urls.length === 0) return { submitted: 0, batches: 0, ok: true, statuses: [], dryRun: false };

  const batchCount = Math.ceil(urls.length / BATCH);
  if (isIndexNowDryRun()) {
    console.info(`[indexnow] dry run: would submit ${urls.length} URL(s) in ${batchCount} batch(es)`);
    return { submitted: urls.length, batches: batchCount, ok: false, statuses: [], dryRun: true };
  }

  const statuses: number[] = [];
  for (let i = 0; i < urls.length; i += BATCH) {
    const { status } = await postIndexNowBatch(urls.slice(i, i + BATCH), fetchImpl);
    if (status !== 200 && status !== 202) console.warn(`[indexnow] batch ${statuses.length} returned ${status}`);
    statuses.push(status);
  }
  return { submitted: urls.length, batches: statuses.length, ok: statuses.every((s) => s === 200 || s === 202), statuses, dryRun: false };
}

/** Pull every <loc> from the live sitemap for a full-site resubmit on deploy. */
export async function sitemapUrls(): Promise<string[]> {
  const res = await fetch(`${INDEXNOW_ORIGIN}/sitemap.xml`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`sitemap fetch ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!.trim()).filter(Boolean);
}
