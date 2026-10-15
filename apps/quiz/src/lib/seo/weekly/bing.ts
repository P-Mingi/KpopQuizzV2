// Bing Webmaster API, JSON endpoint (SEO Mission 3, part C). Request building and response
// parsing are pure and unit tested with the samples of Microsoft's reference pages; the real
// API is only called by the Monday cron, with the owner's key (BING_WEBMASTER_API_KEY).
//
// What the API gives, and what it does not (Microsoft Learn, IWebmasterApi, read 2026-10-15):
//   GetQueryStats(siteUrl)            top queries: clicks, impressions, average positions, Date
//   GetPageStats(siteUrl)             top pages, same fields (the page URL sits in "Query")
//   GetPageQueryStats(siteUrl, page)  the queries of one page: our query x page rows
//   GetLinkCounts(siteUrl, page)      our pages that have inbound links, with a count, paged
//   GetUrlLinks(siteUrl, link, page)  the inbound links of one of our URLs (source URL, anchor)
// There is NO country and NO device breakdown for site traffic in this API (the only country
// parameter, in GetKeyword, is keyword research, not our traffic). So seo_bing_weekly has no
// country or device column. Microsoft notes that "the data will be updated every week".
//
// Request format: GET https://ssl.bing.com/webmaster/api.svc/json/{Method}?siteUrl=...&apikey=...
// As in Microsoft's JSON samples, siteUrl goes as plain text while the other string
// parameters (page, link) go as a JSON string literal with escaped slashes:
//   page=%22http%3a%5c%2f%5c%2fexample.com%5c%2furl1.html%22
// The key is a query parameter, so a URL built here is never logged.

import { addDays, mondayOf } from './weeks';

import type { FetchLike } from './google-auth';

export const BING_API_BASE = 'https://ssl.bing.com/webmaster/api.svc/json/';

export type BingMethod = 'GetQueryStats' | 'GetPageStats' | 'GetPageQueryStats' | 'GetLinkCounts' | 'GetUrlLinks';

/** The Bing Webmaster site, exactly as registered there. */
export function bingSiteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.BING_SITE_URL ?? '').trim() || 'https://kpopquiz.org/';
}

/** A string as the JSON endpoint wants it: a JSON literal with "\/" for each slash. */
export function bingJsonString(s: string): string {
  return JSON.stringify(s).replace(/\//g, '\\/');
}

export function buildBingUrl(method: BingMethod, apiKey: string, siteUrl: string, extra: { page?: string; link?: string; pageIndex?: number } = {}): string {
  const parts = [`siteUrl=${encodeURIComponent(siteUrl)}`];
  if (extra.page !== undefined) parts.push(`page=${encodeURIComponent(bingJsonString(extra.page))}`);
  if (extra.link !== undefined) parts.push(`link=${encodeURIComponent(bingJsonString(extra.link))}`);
  if (extra.pageIndex !== undefined) parts.push(`page=${Math.max(0, Math.floor(extra.pageIndex))}`);
  parts.push(`apikey=${encodeURIComponent(apiKey)}`);
  return `${BING_API_BASE}${method}?${parts.join('&')}`;
}

/**
 * "/Date(1316156400000-0700)/" to the calendar date in the offset it carries ("2011-09-16").
 * Null for anything else.
 */
export function parseBingDate(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const m = /^\/Date\((-?\d+)([+-]\d{4})?\)\/$/.exec(v.trim());
  if (!m) {
    // The XML form ("2011-09-16T00:00:00-07:00") keeps its local date in the first 10 characters.
    return /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null;
  }
  let ms = Number(m[1]);
  if (m[2]) {
    const sign = m[2][0] === '-' ? -1 : 1;
    const hours = Number(m[2].slice(1, 3));
    const minutes = Number(m[2].slice(3, 5));
    ms += sign * (hours * 60 + minutes) * 60_000;
  }
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export interface BingStatRow {
  date: string;
  /** The query, or the page URL for GetPageStats. */
  key: string;
  clicks: number;
  impressions: number;
  avgClickPosition: number | null;
  avgImpressionPosition: number | null;
}

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function dPayload(json: unknown): unknown {
  return json && typeof json === 'object' && 'd' in (json as Record<string, unknown>) ? (json as { d: unknown }).d : null;
}

/** QueryStats rows (GetQueryStats, GetPageStats, GetPageQueryStats). Malformed rows are dropped. */
export function parseQueryStats(json: unknown): BingStatRow[] {
  const d = dPayload(json);
  if (!Array.isArray(d)) return [];
  const out: BingStatRow[] = [];
  for (const r of d) {
    if (!r || typeof r !== 'object') continue;
    const o = r as Record<string, unknown>;
    const date = parseBingDate(o.Date);
    const key = typeof o.Query === 'string' ? o.Query : '';
    if (!date || !key) continue;
    const pos = (v: unknown): number | null => {
      const n = num(v);
      return n !== null && n > 0 ? n : null;
    };
    out.push({
      date,
      key,
      clicks: Math.max(0, Math.round(num(o.Clicks) ?? 0)),
      impressions: Math.max(0, Math.round(num(o.Impressions) ?? 0)),
      avgClickPosition: pos(o.AvgClickPosition),
      avgImpressionPosition: pos(o.AvgImpressionPosition),
    });
  }
  return out;
}

export interface BingWeekAgg {
  weekStart: string;
  key: string;
  clicks: number;
  impressions: number;
  avgClickPosition: number | null;
  avgImpressionPosition: number | null;
}

/**
 * Rows summed into ISO weeks (whatever the granularity Bing answers with). Positions are
 * weighted: by clicks for the click position, by impressions for the impression position.
 * Weeks that are not over yet (Monday on or after `currentMonday`) are dropped, and so are
 * weeks older than `keepWeeks`.
 */
export function aggregateWeekly(rows: BingStatRow[], currentMonday: string, keepWeeks = 12): BingWeekAgg[] {
  const oldest = addDays(currentMonday, -7 * keepWeeks);
  const acc = new Map<string, { weekStart: string; key: string; clicks: number; impressions: number; cpW: number; cpN: number; ipW: number; ipN: number }>();
  for (const r of rows) {
    const weekStart = mondayOf(r.date);
    if (weekStart >= currentMonday || weekStart < oldest) continue;
    const id = `${weekStart}\u0000${r.key}`;
    let a = acc.get(id);
    if (!a) {
      a = { weekStart, key: r.key, clicks: 0, impressions: 0, cpW: 0, cpN: 0, ipW: 0, ipN: 0 };
      acc.set(id, a);
    }
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    if (r.avgClickPosition !== null && r.clicks > 0) {
      a.cpW += r.avgClickPosition * r.clicks;
      a.cpN += r.clicks;
    }
    if (r.avgImpressionPosition !== null && r.impressions > 0) {
      a.ipW += r.avgImpressionPosition * r.impressions;
      a.ipN += r.impressions;
    }
  }
  return [...acc.values()].map((a) => ({
    weekStart: a.weekStart,
    key: a.key,
    clicks: a.clicks,
    impressions: a.impressions,
    avgClickPosition: a.cpN > 0 ? round2(a.cpW / a.cpN) : null,
    avgImpressionPosition: a.ipN > 0 ? round2(a.ipW / a.ipN) : null,
  }));
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface BingLinkCount {
  url: string;
  count: number;
}

export function parseLinkCounts(json: unknown): { links: BingLinkCount[]; totalPages: number } {
  const d = dPayload(json);
  if (!d || typeof d !== 'object') return { links: [], totalPages: 0 };
  const o = d as Record<string, unknown>;
  const links: BingLinkCount[] = [];
  if (Array.isArray(o.Links)) {
    for (const l of o.Links) {
      if (!l || typeof l !== 'object') continue;
      const r = l as Record<string, unknown>;
      if (typeof r.Url !== 'string' || !r.Url) continue;
      links.push({ url: r.Url, count: Math.max(0, Math.round(num(r.Count) ?? 0)) });
    }
  }
  return { links, totalPages: Math.max(0, Math.round(num(o.TotalPages) ?? 0)) };
}

export interface BingLinkDetail {
  sourceUrl: string;
  anchorText: string;
}

export function parseUrlLinks(json: unknown): { details: BingLinkDetail[]; totalPages: number } {
  const d = dPayload(json);
  if (!d || typeof d !== 'object') return { details: [], totalPages: 0 };
  const o = d as Record<string, unknown>;
  const details: BingLinkDetail[] = [];
  if (Array.isArray(o.Details)) {
    for (const l of o.Details) {
      if (!l || typeof l !== 'object') continue;
      const r = l as Record<string, unknown>;
      if (typeof r.Url !== 'string' || !r.Url) continue;
      details.push({ sourceUrl: r.Url, anchorText: typeof r.AnchorText === 'string' ? r.AnchorText.slice(0, 300) : '' });
    }
  }
  return { details, totalPages: Math.max(0, Math.round(num(o.TotalPages) ?? 0)) };
}

/** The host of a URL without "www.", lower case; '' when it is not a URL. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** A Bing error as a short line ("HTTP 400, ErrorCode 3"), never the key. */
export function describeBingError(status: number, json: unknown): string {
  const o = json && typeof json === 'object' ? (json as Record<string, unknown>) : {};
  const code = typeof o.ErrorCode === 'number' ? `, ErrorCode ${o.ErrorCode}` : '';
  return `HTTP ${status}${code}`;
}

/** One Bing call: the parsed JSON, or an error that names no secret. */
export async function bingGet(url: string, fetchImpl: FetchLike): Promise<unknown> {
  const res = await fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (res.status !== 200) throw new Error(`Bing Webmaster ${describeBingError(res.status, json)}`);
  return json;
}

export interface BingWeeklyRow {
  weekStart: string;
  kind: 'query' | 'page' | 'page_query';
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  avgClickPosition: number | null;
  avgImpressionPosition: number | null;
}

export interface BingLinkRow {
  targetUrl: string;
  sourceUrl: string;
  sourceDomain: string;
  anchorText: string;
}

export interface BingPullLimits {
  /** Pages whose queries are read (GetPageQueryStats), the most seen first. */
  pageQueryPages: number;
  /** Pages of GetLinkCounts read. */
  linkCountPages: number;
  /** Linked URLs whose links are read (GetUrlLinks). */
  linkedUrls: number;
  /** Pages of GetUrlLinks read per URL. */
  urlLinkPages: number;
  keepWeeks: number;
}

export const BING_DEFAULT_LIMITS: BingPullLimits = { pageQueryPages: 25, linkCountPages: 10, linkedUrls: 50, urlLinkPages: 3, keepWeeks: 12 };

/**
 * Everything the Monday job stores from Bing. A failure of the traffic calls throws; a failure
 * of a links call is kept in `errors` and the rest goes on.
 */
export async function pullBing(apiKey: string, siteUrl: string, currentMonday: string, fetchImpl: FetchLike, limits: BingPullLimits = BING_DEFAULT_LIMITS): Promise<{ weekly: BingWeeklyRow[]; links: BingLinkRow[]; errors: string[] }> {
  const errors: string[] = [];
  const weekly: BingWeeklyRow[] = [];

  const queries = aggregateWeekly(parseQueryStats(await bingGet(buildBingUrl('GetQueryStats', apiKey, siteUrl), fetchImpl)), currentMonday, limits.keepWeeks);
  for (const q of queries) weekly.push({ ...strip(q), kind: 'query', query: q.key, page: '' });

  const pages = aggregateWeekly(parseQueryStats(await bingGet(buildBingUrl('GetPageStats', apiKey, siteUrl), fetchImpl)), currentMonday, limits.keepWeeks);
  for (const p of pages) weekly.push({ ...strip(p), kind: 'page', query: '', page: p.key });

  // The most seen pages of the latest week get their query x page rows.
  const latest = pages.reduce((m, p) => (p.weekStart > m ? p.weekStart : m), '');
  const topPages = pages.filter((p) => p.weekStart === latest).sort((a, b) => b.impressions - a.impressions).slice(0, limits.pageQueryPages).map((p) => p.key);
  for (const page of topPages) {
    try {
      const rows = aggregateWeekly(parseQueryStats(await bingGet(buildBingUrl('GetPageQueryStats', apiKey, siteUrl, { page }), fetchImpl)), currentMonday, limits.keepWeeks);
      for (const r of rows) weekly.push({ ...strip(r), kind: 'page_query', query: r.key, page });
    } catch (e) {
      errors.push(`GetPageQueryStats: ${(e as Error).message}`);
      break;
    }
  }

  // Inbound links: our linked pages, then the links of each.
  const links: BingLinkRow[] = [];
  const linked: BingLinkCount[] = [];
  try {
    for (let i = 0; i < limits.linkCountPages; i++) {
      const page = parseLinkCounts(await bingGet(buildBingUrl('GetLinkCounts', apiKey, siteUrl, { pageIndex: i }), fetchImpl));
      linked.push(...page.links);
      if (i + 1 >= page.totalPages) break;
    }
  } catch (e) {
    errors.push(`GetLinkCounts: ${(e as Error).message}`);
  }
  const targets = linked.sort((a, b) => b.count - a.count).slice(0, limits.linkedUrls);
  for (const t of targets) {
    try {
      for (let i = 0; i < limits.urlLinkPages; i++) {
        const page = parseUrlLinks(await bingGet(buildBingUrl('GetUrlLinks', apiKey, siteUrl, { link: t.url, pageIndex: i }), fetchImpl));
        for (const d of page.details) {
          const sourceDomain = domainOf(d.sourceUrl);
          if (!sourceDomain) continue;
          links.push({ targetUrl: t.url, sourceUrl: d.sourceUrl, sourceDomain, anchorText: d.anchorText });
        }
        if (i + 1 >= page.totalPages) break;
      }
    } catch (e) {
      errors.push(`GetUrlLinks: ${(e as Error).message}`);
      break;
    }
  }
  return { weekly, links, errors };
}

function strip(a: BingWeekAgg): Omit<BingWeekAgg, 'key'> {
  return { weekStart: a.weekStart, clicks: a.clicks, impressions: a.impressions, avgClickPosition: a.avgClickPosition, avgImpressionPosition: a.avgImpressionPosition };
}
