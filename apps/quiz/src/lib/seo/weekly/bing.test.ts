import { describe, expect, it } from 'vitest';

import { aggregateWeekly, bingJsonString, bingSiteUrl, buildBingUrl, describeBingError, domainOf, parseBingDate, parseLinkCounts, parseQueryStats, parseUrlLinks, pullBing } from './bing';
import { BING_LINK_COUNTS, BING_QUERY_STATS, BING_URL_LINKS } from './fixtures';

import type { FetchLike } from './google-auth';

describe('Bing request URLs (shapes of Microsoft Learn JSON samples)', () => {
  it('GetQueryStats: siteUrl as plain text, then the key', () => {
    expect(buildBingUrl('GetQueryStats', 'KEY', 'https://kpopquiz.org/')).toBe('https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=https%3A%2F%2Fkpopquiz.org%2F&apikey=KEY');
  });

  it('GetPageQueryStats: the page as a JSON string with escaped slashes', () => {
    const url = buildBingUrl('GetPageQueryStats', 'KEY', 'http://example.com', { page: 'http://example.com/url1.html' });
    const page = new URL(url).searchParams.get('page');
    expect(page).toBe('"http:\\/\\/example.com\\/url1.html"');
    // Microsoft's sample, decoded, is the same string.
    expect(decodeURIComponent('%22http%3a%5c%2f%5c%2fexample.com%5c%2furl1.html%22')).toBe(page);
  });

  it('GetLinkCounts and GetUrlLinks: a numeric page index', () => {
    expect(buildBingUrl('GetLinkCounts', 'K', 'http://example.com', { pageIndex: 2 })).toContain('GetLinkCounts?siteUrl=http%3A%2F%2Fexample.com&page=2&apikey=K');
    const links = new URL(buildBingUrl('GetUrlLinks', 'K', 'http://example.com', { link: 'http://example.com/url1.html', pageIndex: 0 }));
    expect(links.searchParams.get('link')).toBe(bingJsonString('http://example.com/url1.html'));
    expect(links.searchParams.get('page')).toBe('0');
  });

  it('defaults the site to https://kpopquiz.org/', () => {
    expect(bingSiteUrl({})).toBe('https://kpopquiz.org/');
    expect(bingSiteUrl({ BING_SITE_URL: 'https://www.kpopquiz.org/' })).toBe('https://www.kpopquiz.org/');
  });
});

describe('Bing answers', () => {
  it('reads /Date(ms-0700)/ as the local calendar date', () => {
    expect(parseBingDate('/Date(1316156400000-0700)/')).toBe('2011-09-16');
    expect(parseBingDate('/Date(1316156400000)/')).toBe('2011-09-16');
    expect(parseBingDate('2011-09-16T00:00:00-07:00')).toBe('2011-09-16');
    expect(parseBingDate('soon')).toBeNull();
  });

  it('parses the QueryStats sample', () => {
    expect(parseQueryStats(BING_QUERY_STATS)).toEqual([{ date: '2011-09-16', key: 'query', clicks: 15, impressions: 100, avgClickPosition: 18, avgImpressionPosition: 17 }]);
    expect(parseQueryStats({ d: [{ Query: 'x' }] })).toEqual([]);
    expect(parseQueryStats({})).toEqual([]);
  });

  it('parses the LinkCounts and LinkDetails samples', () => {
    expect(parseLinkCounts(BING_LINK_COUNTS)).toEqual({ links: [{ url: 'http://example.com/page1.html', count: 14 }], totalPages: 3 });
    expect(parseUrlLinks(BING_URL_LINKS)).toEqual({ details: [{ sourceUrl: 'http://example.com/page1.html', anchorText: 'link' }], totalPages: 3 });
  });

  it('describes an error without the key', () => {
    expect(describeBingError(400, { ErrorCode: 3, Message: 'ERROR!!! InvalidApiKey' })).toBe('HTTP 400, ErrorCode 3');
  });

  it('domainOf drops www and lower-cases', () => {
    expect(domainOf('https://WWW.Example.com/a?b')).toBe('example.com');
    expect(domainOf('not a url')).toBe('');
  });
});

describe('aggregateWeekly', () => {
  const day = (date: string, key: string, clicks: number, impressions: number, cp: number | null, ip: number | null) => ({ date, key, clicks, impressions, avgClickPosition: cp, avgImpressionPosition: ip });

  it('sums days into ISO weeks with weighted positions', () => {
    const out = aggregateWeekly([
      day('2026-10-05', 'bts quiz', 10, 100, 2, 4), // Monday
      day('2026-10-11', 'bts quiz', 30, 300, 4, 8), // Sunday, same week
      day('2026-09-30', 'bts quiz', 5, 50, 3, 6), // the week before
    ], '2026-10-12');
    const w = out.find((r) => r.weekStart === '2026-10-05')!;
    expect(w.clicks).toBe(40);
    expect(w.impressions).toBe(400);
    expect(w.avgClickPosition).toBe(3.5); // (2*10 + 4*30) / 40
    expect(w.avgImpressionPosition).toBe(7); // (4*100 + 8*300) / 400
    expect(out.find((r) => r.weekStart === '2026-09-28')!.clicks).toBe(5);
  });

  it('drops the week that is not over and weeks older than the window', () => {
    const out = aggregateWeekly([day('2026-10-12', 'a', 1, 1, 1, 1), day('2026-01-05', 'a', 1, 1, 1, 1), day('2026-10-06', 'a', 1, 1, 1, 1)], '2026-10-12', 12);
    expect(out.map((r) => r.weekStart)).toEqual(['2026-10-05']);
  });
});

describe('pullBing (fake fetch, no network)', () => {
  const week = (ms: number) => `/Date(${ms}-0000)/`;
  const MON = Date.parse('2026-10-05T00:00:00Z');

  it('reads traffic, the top pages, then the links of each linked URL', async () => {
    const seen: string[] = [];
    const fake: FetchLike = async (url) => {
      const u = new URL(url);
      const method = u.pathname.split('/').pop()!;
      seen.push(method);
      const json = (() => {
        switch (method) {
          case 'GetQueryStats':
            return { d: [{ Query: 'bts quiz', Clicks: 5, Impressions: 50, AvgClickPosition: 2, AvgImpressionPosition: 3, Date: week(MON) }] };
          case 'GetPageStats':
            return { d: [{ Query: 'https://kpopquiz.org/bts-quiz', Clicks: 5, Impressions: 50, AvgClickPosition: 2, AvgImpressionPosition: 3, Date: week(MON) }] };
          case 'GetPageQueryStats':
            return { d: [{ Query: 'bts quiz', Clicks: 4, Impressions: 40, AvgClickPosition: 2, AvgImpressionPosition: 3, Date: week(MON) }] };
          case 'GetLinkCounts':
            return { d: { Links: [{ Url: 'https://kpopquiz.org/bts-quiz', Count: 2 }], TotalPages: 1 } };
          case 'GetUrlLinks':
            return { d: { Details: [{ Url: 'https://www.example.com/post', AnchorText: 'Quiz: BTS on kpopquiz.org' }, { Url: 'garbage', AnchorText: '' }], TotalPages: 1 } };
          default:
            return {};
        }
      })();
      return { status: 200, ok: true, json: async () => json, text: async () => '' };
    };
    const out = await pullBing('KEY', 'https://kpopquiz.org/', '2026-10-12', fake);
    expect(seen).toEqual(['GetQueryStats', 'GetPageStats', 'GetPageQueryStats', 'GetLinkCounts', 'GetUrlLinks']);
    expect(out.weekly).toEqual([
      { weekStart: '2026-10-05', kind: 'query', query: 'bts quiz', page: '', clicks: 5, impressions: 50, avgClickPosition: 2, avgImpressionPosition: 3 },
      { weekStart: '2026-10-05', kind: 'page', query: '', page: 'https://kpopquiz.org/bts-quiz', clicks: 5, impressions: 50, avgClickPosition: 2, avgImpressionPosition: 3 },
      { weekStart: '2026-10-05', kind: 'page_query', query: 'bts quiz', page: 'https://kpopquiz.org/bts-quiz', clicks: 4, impressions: 40, avgClickPosition: 2, avgImpressionPosition: 3 },
    ]);
    expect(out.links).toEqual([{ targetUrl: 'https://kpopquiz.org/bts-quiz', sourceUrl: 'https://www.example.com/post', sourceDomain: 'example.com', anchorText: 'Quiz: BTS on kpopquiz.org' }]);
    expect(out.errors).toEqual([]);
  });

  it('throws on a traffic error and never puts the key in the message', async () => {
    const fake: FetchLike = async () => ({ status: 400, ok: false, json: async () => ({ ErrorCode: 3, Message: 'InvalidApiKey' }), text: async () => '' });
    await expect(pullBing('SUPER-SECRET', 'https://kpopquiz.org/', '2026-10-12', fake)).rejects.toThrow('Bing Webmaster HTTP 400, ErrorCode 3');
    await expect(pullBing('SUPER-SECRET', 'https://kpopquiz.org/', '2026-10-12', fake)).rejects.not.toThrow(/SUPER-SECRET/);
  });

  it('keeps the traffic when a links call fails', async () => {
    const fake: FetchLike = async (url) => {
      const method = new URL(url).pathname.split('/').pop()!;
      if (method === 'GetLinkCounts') return { status: 500, ok: false, json: async () => ({}), text: async () => '' };
      return { status: 200, ok: true, json: async () => ({ d: [] }), text: async () => '' };
    };
    const out = await pullBing('K', 'https://kpopquiz.org/', '2026-10-12', fake);
    expect(out.errors).toEqual(['GetLinkCounts: Bing Webmaster HTTP 500']);
    expect(out.links).toEqual([]);
  });
});
