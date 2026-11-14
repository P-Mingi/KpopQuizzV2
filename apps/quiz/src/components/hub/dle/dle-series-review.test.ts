// Lot 3 DLE (2026-11-14): the owner's check of the remaining series pictures draws picture, slug, licence, verified or not and the source host, and
// nothing at all before the index answered or for anyone the page did not enable it for.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { isSeriesSlug, seriesImageUrl, seriesIndexUrl } from '@/lib/dle/preview';

import { DleSeriesReview, SeriesReviewGrid, seriesItemsOf, sourceLine } from './dle-series-review';

const ITEMS = [
  { slug: 'one-piece', license: 'public_domain', verified: false, source: 'host', host: 'commons.wikimedia.org' },
  { slug: 'naruto', license: 'cc0', verified: false, source: 'none', host: null },
  { slug: 'bleach', license: 'public_domain', verified: true, source: 'unreadable', host: null },
] as const;

describe('the series check of the owner', () => {
  it('draws the picture, the slug, the licence, verified or not and the source host of each series', () => {
    const html = renderToStaticMarkup(createElement(SeriesReviewGrid, { items: ITEMS }));
    expect(html).toContain('src="/api/admin/dle-preview/img?series=one-piece"');
    expect(html).toContain('<code>one-piece</code>');
    expect(html).toContain('Licence : public_domain');
    expect(html).toContain('Licence : cc0');
    expect(html).toContain('Non vérifiée');
    expect(html).toContain('Vérifiée');
    expect(html).toContain('Source : commons.wikimedia.org');
    expect(html).toContain('Source : aucune');
    expect(html).toContain('Source : adresse illisible');
    expect(html).toContain('3 séries, 1 vérifiée, 2 non vérifiées.');
    expect(html).toContain('ne supprime ni ne modifie');
    // no button, no form, no public address of the bucket
    expect(html).not.toMatch(/<button|<form|storage\/v1|supabase|https?:/);
  });

  it('draws nothing without a series, before the answer, or when the page did not enable it', () => {
    expect(renderToStaticMarkup(createElement(SeriesReviewGrid, { items: [] }))).toBe('');
    expect(renderToStaticMarkup(createElement(DleSeriesReview, { enabled: true }))).toBe('');
    expect(renderToStaticMarkup(createElement(DleSeriesReview, { enabled: false }))).toBe('');
  });

  it('keeps only well-formed items of an answer and says why a source is missing', () => {
    expect(seriesItemsOf(null)).toEqual([]);
    expect(seriesItemsOf([{ slug: 'a', license: 'cc0', verified: true, source: 'host', host: 'x.org' }, { slug: 1 }, null, 'x', { slug: 'b', license: 'cc0', verified: 'yes' }]))
      .toEqual([{ slug: 'a', license: 'cc0', verified: true, source: 'host', host: 'x.org' }]);
    expect(sourceLine({ source: 'host', host: 'x.org' })).toBe('Source : x.org');
    expect(sourceLine({ source: 'none', host: null })).toBe('Source : aucune');
  });

  it('the addresses and the slug shape', () => {
    expect(seriesIndexUrl('')).toBe('/api/admin/dle-preview?series=1');
    expect(seriesImageUrl('/x', 'one-piece')).toBe('/x/api/admin/dle-preview/img?series=one-piece');
    for (const ok of ['one-piece', 'a', 'dragon-ball-z', '7-seeds']) expect(isSeriesSlug(ok), ok).toBe(true);
    for (const bad of ['', '-a', 'A', 'a/b', '../x', 'a b', 'a.b', 'x'.repeat(81), null, 12]) expect(isSeriesSlug(bad), String(bad)).toBe(false);
  });
});
