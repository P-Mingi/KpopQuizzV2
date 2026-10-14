import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { compareFeedDatesDesc, feedTimeAgo, parseFeedDate } from './feed-date';
import { newsItemListLd } from './news-ld';

// /news: a feed item with a missing or malformed pubDate must never throw (it used to
// 500 the page via `new Date(x).toISOString()`), and the page's JSON-LD must not claim
// third-party headlines as NewsArticle entities.

const NOW = Date.parse('2026-10-13T12:00:00Z');
const MIN = 60 * 1000;
const BAD = ['', '   ', 'not a date', 'Mon, 99 Foo 2026 99:99:99 +0000', '2026-13-45T99:00:00Z', undefined, null, 42, {}];

describe('parseFeedDate', () => {
  it('reads RSS (RFC 822) and ISO dates', () => {
    expect(parseFeedDate('Mon, 13 Oct 2026 11:00:00 +0000')).toBe(NOW - 60 * MIN);
    expect(parseFeedDate('2026-10-13T12:00:00Z')).toBe(NOW);
  });

  it('returns null for a missing or invalid value instead of throwing', () => {
    for (const raw of BAD) {
      expect(() => parseFeedDate(raw)).not.toThrow();
      expect(parseFeedDate(raw)).toBeNull();
    }
    // The exact crash the helper replaces.
    expect(() => new Date('not a date').toISOString()).toThrow(RangeError);
  });
});

describe('feedTimeAgo', () => {
  it('formats minutes, hours and days', () => {
    expect(feedTimeAgo('2026-10-13T11:55:00Z', NOW)).toBe('5m ago');
    expect(feedTimeAgo('2026-10-13T09:00:00Z', NOW)).toBe('3h ago');
    expect(feedTimeAgo('2026-10-10T12:00:00Z', NOW)).toBe('3d ago');
  });

  it('omits the label (empty string) for an invalid date, never throws', () => {
    for (const raw of BAD) {
      expect(() => feedTimeAgo(raw, NOW)).not.toThrow();
      expect(feedTimeAgo(raw, NOW)).toBe('');
    }
    expect(feedTimeAgo('2026-10-13T11:55:00Z', Number.NaN)).toBe('');
  });

  it('a date in the future (feed clock skew) reads as 0m ago, not a negative time', () => {
    expect(feedTimeAgo('2026-10-13T12:10:00Z', NOW)).toBe('0m ago');
  });
});

describe('compareFeedDatesDesc', () => {
  it('sorts newest first and undated items last, without throwing', () => {
    const dates = ['', '2026-10-12T00:00:00Z', 'garbage', '2026-10-13T00:00:00Z', 'Sun, 11 Oct 2026 00:00:00 +0000'];
    const sorted = [...dates].sort(compareFeedDatesDesc);
    expect(sorted.slice(0, 3)).toEqual(['2026-10-13T00:00:00Z', '2026-10-12T00:00:00Z', 'Sun, 11 Oct 2026 00:00:00 +0000']);
    expect(new Set(sorted.slice(3))).toEqual(new Set(['', 'garbage']));
  });
});

describe('newsItemListLd', () => {
  const items = [
    { title: 'Headline one', link: 'https://www.soompi.com/article/1/one' },
    { title: 'Headline two', link: 'https://www.allkpop.com/article/2026/10/two' },
  ];

  it('is an ItemList of ListItem (position, url, name), no NewsArticle, no dates', () => {
    const ld = newsItemListLd(items);
    expect(ld).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'K-pop news headlines',
      itemListElement: [
        { '@type': 'ListItem', position: 1, url: items[0]!.link, name: items[0]!.title },
        { '@type': 'ListItem', position: 2, url: items[1]!.link, name: items[1]!.title },
      ],
    });
    const json = JSON.stringify(ld);
    expect(json).not.toMatch(/NewsArticle|"Article"|datePublished|publisher/);
  });

  it('skips non-http links and empty titles; nothing to list = no block', () => {
    const ld = newsItemListLd([
      { title: 'ok', link: 'https://www.koreaboo.com/news/ok/' },
      { title: 'bad scheme', link: 'javascript:alert(1)' },
      { title: 'not a url', link: 'koreaboo' },
      { title: '  ', link: 'https://www.koreaboo.com/news/blank/' },
    ]) as { itemListElement: { position: number; url: string }[] };
    expect(ld.itemListElement).toEqual([{ '@type': 'ListItem', position: 1, url: 'https://www.koreaboo.com/news/ok/', name: 'ok' }]);
    expect(newsItemListLd([])).toBeNull();
  });
});

describe('/news page source', () => {
  const dir = __dirname;
  const page = fs.readFileSync(path.join(dir, 'page.tsx'), 'utf8');

  it('no raw date conversion that can throw, no NewsArticle markup', () => {
    expect(page).not.toMatch(/toISOString\(|new Date\([^)]/);
    expect(page).not.toMatch(/'@type':\s*'NewsArticle'/);
  });

  it('no em or en dash in the /news sources', () => {
    for (const f of ['page.tsx', 'feed-date.ts', 'news-ld.ts', 'feed-date.test.ts']) {
      const src = fs.readFileSync(path.join(dir, f), 'utf8');
      expect(/[\u2013\u2014]/.test(src), f).toBe(false);
    }
  });
});
