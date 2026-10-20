// Run O1, lane O1: /robots.txt and /sitemap.xml of anime and hub (routes.md, "Per-site root files"). Both are served by the
// route handlers of app/sites/[site]/ through the rewrite of rule 3, so app/robots.ts and app/sitemap.ts stay the kpop files.
// The pure parts (text of a robots file, XML of a sitemap) and the list of a site's URLs live here so they can be tested
// without a server. Every URL is on the registry origin of the site (never another site's, never a hardcoded host).

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';
import { loadSeriesDirectory } from '@/lib/anime/directory';

import { forSite } from './scope';

import type { MetadataRoute } from 'next';

import type { SeriesDb } from '@/lib/anime/series';
import type { SiteConfig } from './types';

/** One URL of a sitemap: a site-relative path and, when known, the date its content was created. */
export interface SitemapEntry {
  readonly path: string;
  readonly lastModified?: Date | undefined;
  readonly changeFrequency?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | undefined;
  readonly priority?: number | undefined;
}

const QUIZZES_LIMIT = 10000;

function lines(label: string, value: string | readonly string[] | undefined): string[] {
  if (value === undefined) return [];
  return (typeof value === 'string' ? [value] : value).map((v) => `${label}: ${v}`);
}

/** A robots file as text, in the order and spelling Next writes app/robots.ts: one block per rule, then the sitemap lines. */
export function robotsText(robots: MetadataRoute.Robots): string {
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  const blocks = rules.map((r) => [
    ...lines('User-Agent', r.userAgent ?? '*'),
    ...lines('Allow', r.allow),
    ...lines('Disallow', r.disallow),
    ...(r.crawlDelay !== undefined ? [`Crawl-delay: ${r.crawlDelay}`] : []),
  ].join('\n'));
  const tail = lines('Sitemap', robots.sitemap);
  return `${[...blocks, ...(tail.length ? [tail.join('\n')] : [])].join('\n\n')}\n`;
}

function xmlEscape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

/** A sitemap as XML: every `<loc>` is `origin` + the entry's path. */
export function sitemapXml(origin: string, entries: readonly SitemapEntry[]): string {
  const urls = entries.map((e) => [
    '<url>',
    `<loc>${xmlEscape(`${origin}${e.path}`)}</loc>`,
    ...(e.lastModified ? [`<lastmod>${e.lastModified.toISOString()}</lastmod>`] : []),
    ...(e.changeFrequency ? [`<changefreq>${e.changeFrequency}</changefreq>`] : []),
    ...(e.priority !== undefined ? [`<priority>${e.priority}</priority>`] : []),
    '</url>',
  ].join(''));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

/**
 * The URLs a non-kpop site lists, in the order a crawler should meet them.
 *   hub:   its home and /privacy (routes.md, hub table).
 *   anime: its home, /series, every series hub that has at least `seo.minPublishedForIndexableHub` published quizzes
 *          (below it the hub page is noindex, so it stays out), then every published quiz of the site, newest first.
 * A read that fails is not swallowed into a half list: the error reaches the caller, which answers 500 and lets the
 * crawler retry (a sitemap without its quizzes would read as "the site lost them").
 */
export async function sitemapEntriesFor(site: SiteConfig, db: SeriesDb = createPublicReadClient()): Promise<SitemapEntry[]> {
  if (site.id === 'hub') {
    return [
      { path: '/', changeFrequency: 'weekly', priority: 1 },
      { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    ];
  }
  if (site.id !== 'anime') throw new Error('sitemapEntriesFor: kpop has app/sitemap.ts');
  const home: SitemapEntry[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/series', changeFrequency: 'weekly', priority: 0.8 },
  ];

  const [series, quizzes] = await Promise.all([
    loadSeriesDirectory(db),
    fetchAllRows<{ slug: string; created_at: string }>(
      () => forSite(db.from('quizzes').select('slug, created_at'), site.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .order('slug', { ascending: true }),
    ),
  ]);
  const hubs = series
    .filter((row) => row.quizzes >= site.seo.minPublishedForIndexableHub)
    .map((row): SitemapEntry => ({ path: `/${row.group.slug}-quiz`, changeFrequency: 'weekly', priority: 0.8 }));
  const plays = quizzes.slice(0, QUIZZES_LIMIT).map((q): SitemapEntry => ({
    path: `/q/${q.slug}`, lastModified: new Date(q.created_at), changeFrequency: 'monthly', priority: 0.6,
  }));
  return [...home, ...hubs, ...plays];
}
