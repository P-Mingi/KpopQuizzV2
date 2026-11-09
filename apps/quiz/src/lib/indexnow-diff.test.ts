// O1 audit 03 P1-8: the deploy submission sends added, removed and lastmod-changed URLs only; an unchanged sitemap sends none.
import { describe, expect, it } from 'vitest';

import { diffSitemaps, parseSitemapEntries, urlsToSubmit } from './indexnow-diff';

const sm = (rows: Array<[string, string?]>): string =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows
    .map(([loc, lm]) => `<url><loc>${loc}</loc>${lm ? `<lastmod>${lm}</lastmod>` : ''}<changefreq>weekly</changefreq></url>`)
    .join('')}</urlset>`;

const U = (p: string): string => `https://kpopquiz.org${p}`;

describe('parseSitemapEntries', () => {
  it('reads loc and lastmod, decodes entities, and finds none in a sitemap index', () => {
    const e = parseSitemapEntries(sm([[U('/a?x=1&amp;y=2'), '2026-10-01T00:00:00.000Z'], [U('/b')]]));
    expect(e).toEqual([{ loc: U('/a?x=1&y=2'), lastmod: '2026-10-01T00:00:00.000Z' }, { loc: U('/b'), lastmod: null }]);
    expect(parseSitemapEntries('<sitemapindex><sitemap><loc>https://kpopquiz.org/s.xml</loc></sitemap></sitemapindex>')).toEqual([]);
  });
});

describe('diffSitemaps', () => {
  const prev = parseSitemapEntries(sm([[U('/a'), '2026-10-01T00:00:00Z'], [U('/b'), '2026-10-02T00:00:00Z'], [U('/c')], [U('/gone'), '2026-09-01T00:00:00Z']]));

  it('an unchanged sitemap submits 0', () => {
    const d = diffSitemaps(prev, prev);
    expect(d).toEqual({ added: [], removed: [], changed: [] });
    expect(urlsToSubmit(d)).toEqual([]);
  });

  it('an added URL, a removed URL and a moved lastmod are submitted, once each', () => {
    const curr = parseSitemapEntries(sm([[U('/a'), '2026-10-01T00:00:00Z'], [U('/b'), '2026-11-05T00:00:00Z'], [U('/c')], [U('/new'), '2026-11-05T00:00:00Z']]));
    const d = diffSitemaps(prev, curr);
    expect(d).toEqual({ added: [U('/new')], removed: [U('/gone')], changed: [U('/b')] });
    expect(urlsToSubmit(d)).toEqual([U('/new'), U('/b'), U('/gone')]);
  });

  it('the same instant written in another form is not a change', () => {
    const a = parseSitemapEntries(sm([[U('/a'), '2026-10-01T00:00:00Z']]));
    const b = parseSitemapEntries(sm([[U('/a'), '2026-10-01T00:00:00.000Z']]));
    expect(urlsToSubmit(diffSitemaps(a, b))).toEqual([]);
  });

  it('a lastmod that appears or disappears is not a content change (a page losing its date is not resubmitted)', () => {
    const dated = parseSitemapEntries(sm([[U('/a'), '2026-10-01T00:00:00Z']]));
    const undated = parseSitemapEntries(sm([[U('/a')]]));
    expect(urlsToSubmit(diffSitemaps(dated, undated))).toEqual([]);
    expect(urlsToSubmit(diffSitemaps(undated, dated))).toEqual([]);
  });
});
