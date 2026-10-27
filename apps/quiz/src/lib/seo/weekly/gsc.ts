// Search Console API, Search Analytics (SEO Mission 3, part C): one ISO week of rows by
// query x page x country x device. Request building and response parsing are pure and unit
// tested with fixtures; the real API is only called by the Monday cron, with the owner's key.
//
// API: POST https://searchconsole.googleapis.com/webmasters/v3/sites/{siteUrl}/searchAnalytics/query
// with a bearer token for the webmasters.readonly scope (google-auth.ts). Up to 25,000 rows a
// request; `startRow` pages through the rest. `dataState: 'all'` includes the freshest days, so
// the latest Sunday may still be filling in on Monday morning; the next Monday's run pulls that
// week again and the upsert replaces it with the settled numbers.

import type { FetchLike, HttpRequest } from './google-auth';

export const GSC_API_BASE = 'https://searchconsole.googleapis.com/webmasters/v3/sites/';
export const GSC_DIMENSIONS = ['query', 'page', 'country', 'device'] as const;
export const GSC_PAGE_SIZE = 25_000;
/** A safety cap per week (4 requests). The site is far below it today. */
export const GSC_MAX_ROWS_PER_WEEK = 100_000;

/** The Search Console property. A domain property is "sc-domain:kpopquiz.org". */
export function gscSiteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.GSC_SITE_URL ?? '').trim() || 'sc-domain:kpopquiz.org';
}

export interface GscRow {
  query: string;
  page: string;
  country: string;
  device: string;
  clicks: number;
  impressions: number;
  ctr: number | null;
  position: number | null;
}

export function buildSearchAnalyticsRequest(siteUrl: string, accessToken: string, week: { start: string; end: string }, startRow = 0, rowLimit = GSC_PAGE_SIZE): HttpRequest {
  const body = {
    startDate: week.start,
    endDate: week.end,
    dimensions: [...GSC_DIMENSIONS],
    type: 'web',
    dataState: 'all',
    rowLimit,
    startRow,
  };
  return {
    url: `${GSC_API_BASE}${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    init: {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Rows of one answer. Rows without the four keys are dropped, never guessed. */
export function parseSearchAnalyticsResponse(json: unknown): GscRow[] {
  const rows = (json && typeof json === 'object' ? (json as { rows?: unknown }).rows : null);
  if (!Array.isArray(rows)) return [];
  const out: GscRow[] = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const keys = Array.isArray(o.keys) ? o.keys : null;
    if (!keys || keys.length !== GSC_DIMENSIONS.length || !keys.every((k) => typeof k === 'string')) continue;
    const [query, page, country, device] = keys as string[];
    out.push({
      query: query!,
      page: page!,
      country: country!.toLowerCase(),
      device: device!.toUpperCase(),
      clicks: Math.max(0, Math.round(num(o.clicks) ?? 0)),
      impressions: Math.max(0, Math.round(num(o.impressions) ?? 0)),
      ctr: num(o.ctr),
      position: num(o.position),
    });
  }
  return out;
}

/** An API error as a short line without secrets ("HTTP 403 PERMISSION_DENIED"). */
export function describeGoogleError(status: number, json: unknown): string {
  const err = json && typeof json === 'object' ? (json as { error?: { status?: unknown } }).error : undefined;
  const code = err && typeof err.status === 'string' ? ` ${err.status}` : '';
  return `HTTP ${status}${code}`;
}

/** Every row of one week, page by page, up to the cap. Throws on an API error. */
export async function pullGscWeek(siteUrl: string, accessToken: string, week: { start: string; end: string }, fetchImpl: FetchLike, pageSize = GSC_PAGE_SIZE, maxRows = GSC_MAX_ROWS_PER_WEEK): Promise<{ rows: GscRow[]; truncated: boolean }> {
  const rows: GscRow[] = [];
  for (let startRow = 0; startRow < maxRows; startRow += pageSize) {
    const req = buildSearchAnalyticsRequest(siteUrl, accessToken, week, startRow, pageSize);
    const res = await fetchImpl(req.url, req.init);
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    if (res.status !== 200) throw new Error(`Search Console ${describeGoogleError(res.status, json)}`);
    const page = parseSearchAnalyticsResponse(json);
    rows.push(...page);
    if (page.length < pageSize) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}
