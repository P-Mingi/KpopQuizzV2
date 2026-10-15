import { describe, expect, it } from 'vitest';

import { buildSearchAnalyticsRequest, describeGoogleError, gscSiteUrl, parseSearchAnalyticsResponse, pullGscWeek } from './gsc';
import { GSC_RESPONSE } from './fixtures';

import type { FetchLike } from './google-auth';

const WEEK = { start: '2026-10-05', end: '2026-10-11' };

describe('Search Console request', () => {
  it('targets searchAnalytics.query of the encoded property, with the four dimensions', () => {
    const req = buildSearchAnalyticsRequest('sc-domain:kpopquiz.org', 'tok', WEEK, 25000, 25000);
    expect(req.url).toBe('https://searchconsole.googleapis.com/webmasters/v3/sites/sc-domain%3Akpopquiz.org/searchAnalytics/query');
    expect(req.init.method).toBe('POST');
    expect(req.init.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(req.init.body!)).toEqual({
      startDate: '2026-10-05',
      endDate: '2026-10-11',
      dimensions: ['query', 'page', 'country', 'device'],
      type: 'web',
      dataState: 'all',
      rowLimit: 25000,
      startRow: 25000,
    });
  });

  it('encodes a URL-prefix property too', () => {
    expect(buildSearchAnalyticsRequest('https://kpopquiz.org/', 't', WEEK).url).toContain('/sites/https%3A%2F%2Fkpopquiz.org%2F/searchAnalytics/query');
  });

  it('defaults to the domain property, and reads GSC_SITE_URL', () => {
    expect(gscSiteUrl({})).toBe('sc-domain:kpopquiz.org');
    expect(gscSiteUrl({ GSC_SITE_URL: ' https://kpopquiz.org/ ' })).toBe('https://kpopquiz.org/');
  });
});

describe('Search Console answer', () => {
  it('maps keys to query, page, country, device and drops malformed rows', () => {
    const rows = parseSearchAnalyticsResponse(GSC_RESPONSE);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', country: 'usa', device: 'MOBILE', clicks: 12, impressions: 340, ctr: 0.0353, position: 7.2 });
  });

  it('reads an empty week (no rows key) as no rows', () => {
    expect(parseSearchAnalyticsResponse({ responseAggregationType: 'byPage' })).toEqual([]);
    expect(parseSearchAnalyticsResponse(null)).toEqual([]);
  });

  it('describes an error by status only', () => {
    expect(describeGoogleError(403, { error: { code: 403, message: 'User does not have sufficient permission', status: 'PERMISSION_DENIED' } })).toBe('HTTP 403 PERMISSION_DENIED');
  });
});

describe('pullGscWeek', () => {
  const row = (i: number) => ({ keys: [`q${i}`, 'https://kpopquiz.org/', 'fra', 'MOBILE'], clicks: 1, impressions: 2, ctr: 0.5, position: 3 });

  it('pages with startRow until a short page (fake fetch, no network)', async () => {
    const starts: number[] = [];
    const fake: FetchLike = async (_url, init) => {
      const { startRow } = JSON.parse(init!.body!) as { startRow: number };
      starts.push(startRow);
      const rows = startRow === 0 ? [row(1), row(2)] : startRow === 2 ? [row(3), row(4)] : [row(5)];
      return { status: 200, ok: true, json: async () => ({ rows }), text: async () => '' };
    };
    const out = await pullGscWeek('sc-domain:kpopquiz.org', 'tok', WEEK, fake, 2, 100);
    expect(starts).toEqual([0, 2, 4]);
    expect(out.rows.map((r) => r.query)).toEqual(['q1', 'q2', 'q3', 'q4', 'q5']);
    expect(out.truncated).toBe(false);
  });

  it('stops at the cap and says so', async () => {
    const fake: FetchLike = async () => ({ status: 200, ok: true, json: async () => ({ rows: [row(1), row(2)] }), text: async () => '' });
    const out = await pullGscWeek('sc-domain:kpopquiz.org', 'tok', WEEK, fake, 2, 4);
    expect(out.rows).toHaveLength(4);
    expect(out.truncated).toBe(true);
  });

  it('throws on an API error, naming the status only', async () => {
    const fake: FetchLike = async () => ({ status: 403, ok: false, json: async () => ({ error: { status: 'PERMISSION_DENIED' } }), text: async () => '' });
    await expect(pullGscWeek('sc-domain:kpopquiz.org', 'secret-token', WEEK, fake)).rejects.toThrow(/^Search Console HTTP 403 PERMISSION_DENIED$/);
  });
});
