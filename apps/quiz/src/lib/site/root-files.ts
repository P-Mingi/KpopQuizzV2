// Run O1, lane O1: /robots.txt and /sitemap.xml of anime and hub (routes.md, "Per-site root files"). Both are served by the
// route handlers of app/sites/[site]/ through the rewrite of rule 3, so app/robots.ts and app/sitemap.ts stay the kpop files.
// The pure parts (text of a robots file, XML of a sitemap) and the list of a site's URLs live here so they can be tested
// without a server. Every URL is on the registry origin of the site (never another site's, never a hardcoded host).

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';
import { loadSeriesDirectory } from '@/lib/anime/directory';

import { indexingOpenFor, parseLaunchDate } from './indexing';
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
 *   hub:   its home, and its /privacy once the network is open (NET_INDEXING); while it is closed /privacy is a noindex draft and stays out.
 *   anime: its home, /series, every series hub that has at least `seo.minPublishedForIndexableHub` published quizzes
 *          (below it the hub page is noindex, so it stays out), then every published quiz of the site, newest first.
 * A read that fails is not swallowed into a half list: the error reaches the caller, which answers 500 and lets the
 * crawler retry (a sitemap without its quizzes would read as "the site lost them").
 */
export async function sitemapEntriesFor(site: SiteConfig, db: SeriesDb = createPublicReadClient()): Promise<SitemapEntry[]> {
  if (site.id === 'hub') {
    // /privacy is the network policy. While the network is closed it is a noindex draft (app/sites/[site]/privacy/page.tsx), and a
    // noindex URL stays out of the sitemap; once NET_INDEXING opens the site it is indexable, dated NET_LAUNCH_DATE, and listed.
    const home: SitemapEntry = { path: '/', changeFrequency: 'weekly', priority: 1 };
    if (!indexingOpenFor(site.id)) return [home];
    const launch = parseLaunchDate(process.env.NET_LAUNCH_DATE);
    return [home, { path: '/privacy', ...(launch ? { lastModified: new Date(`${launch}T00:00:00Z`) } : {}), changeFrequency: 'yearly', priority: 0.3 }];
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

/**
 * /llms.txt of anime and hub (routes.md, "Per-site root files"): fixed facts and real routes only, no count (a hardcoded one
 * would rot, a live one is not worth a read for a file nothing is proven to consume), the site's own name and host, never
 * kpopquiz.org's. kpop keeps app/llms.txt/route.ts.
 */
export function llmsText(site: SiteConfig): string {
  const { name } = site.brand;
  const title = site.seo.llmsTxt.title;
  if (site.id === 'hub') {
    return `# ${title}

> ${name} is the home of one account shared by a network of independent fan quiz sites. It holds no quiz of its own.

## What this site is
${name} lists the quiz sites of the network and shows a signed-in member which of them they have joined. Each site keeps its
own quizzes, scores and community; the account is the only thing they share.

## Best entry points
- /: the sites of the network
- /privacy: what one account shares between the sites

## What we do not publish
We do not publish simulated scores, invented play counts, or fabricated opponents.
`;
  }
  return `# ${title}

> Free, fan-made anime quizzes. Every quiz is written by a fan, and every statistic on the site comes from real plays, never simulated.

## What this site is
${site.domain} is an independent anime quiz site. Visitors play quizzes about anime series, with a spoiler shield that keeps
questions beyond the episode or chapter a visitor has reached out of sight. Quizzes are created by fans and checked before they go live.

## Best entry points
- /quizzes: every published quiz, filterable by series and type
- /series: every series with quizzes, A to Z
- /{series}-quiz: a series hub with its quizzes, e.g. /attack-on-titan-quiz
- /trivia: sourced trivia and fun facts by series
- /blindtest: guess the opening from a short clip
- /community: threads, blogs and debates from the fandoms

## What we do not publish
We do not publish simulated scores, invented play counts, or fabricated opponents. If a number appears on this site, a person produced it.
`;
}
