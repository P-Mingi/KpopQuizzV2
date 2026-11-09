// O1 audit 03 P2-1: the segments are a partition of the whole sitemap (nothing added, dropped or duplicated), cut by page template.
import { describe, expect, it } from 'vitest';

import { SITEMAP_SEGMENTS, isSitemapSegment, segmentOf, sitemapXml, splitSitemap } from './sitemap-segments';

import type { MetadataRoute } from 'next';

const U = (p: string): string => `https://kpopquiz.org${p}`;

describe('segmentOf', () => {
  const cases: Array<[string, string]> = [
    ['/q/some-quiz', 'quizzes'], ['/bts-quiz', 'hubs'], ['/kpop-history-quiz', 'hubs'], ['/bts-trivia', 'trivia'],
    ['/blindtest', 'blindtest'], ['/blindtest/classic', 'blindtest'], ['/blindtest/group-bts', 'blindtest'], ['/guess-the-kpop-song', 'blindtest'],
    ['/fr/blind-test-kpop', 'blindtest'], ['/bts-name-all-members', 'games'], ['/which-bts-member-are-you', 'games'],
    ['/kpop-demon-hunters-quiz', 'games'], ['/kpop-games', 'games'], ['/articles', 'articles'], ['/articles/kpop-generations-explained', 'articles'],
    ['/data/pulse/2026-10', 'articles'], ['/verse', 'verse'], ['/verse/bts/members/rm', 'verse'], ['/', 'pages'], ['/quizzes', 'pages'], ['/about', 'pages'],
  ];
  it.each(cases)('%s is in %s', (path, want) => expect(segmentOf(path)).toBe(want));

  it('every result is a known segment', () => {
    for (const [p] of cases) expect(isSitemapSegment(segmentOf(p))).toBe(true);
    expect(isSitemapSegment('everything')).toBe(false);
  });
});

describe('splitSitemap', () => {
  const whole: MetadataRoute.Sitemap = [
    { url: 'https://kpopquiz.org', lastModified: new Date('2026-10-01') },
    { url: U('/q/a'), lastModified: new Date('2026-10-02'), changeFrequency: 'monthly', priority: 0.6 },
    { url: U('/q/b') },
    { url: U('/bts-quiz'), lastModified: new Date('2026-10-03') },
    { url: U('/bts-trivia') },
    { url: U('/blindtest/group-bts') },
    { url: U('/verse/promises') },
  ];

  it('is a partition: every entry exactly once, the order inside a segment kept, every key present', () => {
    const parts = splitSitemap(whole);
    expect(Object.keys(parts).sort()).toEqual([...SITEMAP_SEGMENTS].sort());
    const flat = SITEMAP_SEGMENTS.flatMap((s) => parts[s]);
    expect(flat.map((e) => e.url).sort()).toEqual(whole.map((e) => e.url).sort());
    expect(parts.quizzes.map((e) => e.url)).toEqual([U('/q/a'), U('/q/b')]);
    expect(parts.pages.map((e) => e.url)).toEqual(['https://kpopquiz.org']);
  });
});

describe('sitemapXml', () => {
  it('writes loc, lastmod only when there is one, changefreq and priority, and escapes', () => {
    const xml = sitemapXml([
      { url: U('/q/a?x=1&y=2'), lastModified: new Date('2026-10-02T00:00:00Z'), changeFrequency: 'monthly', priority: 0.6 },
      { url: U('/q/b') },
    ]);
    expect(xml).toContain('<loc>https://kpopquiz.org/q/a?x=1&amp;y=2</loc><lastmod>2026-10-02T00:00:00.000Z</lastmod><changefreq>monthly</changefreq><priority>0.6</priority>');
    expect(xml).toContain('<url><loc>https://kpopquiz.org/q/b</loc></url>');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });

  it('an empty segment is a valid empty urlset', () => {
    expect(sitemapXml([])).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
  });
});
