// Run O1, lane O1: /robots.txt and /sitemap.xml of anime and hub (routes.md, "Per-site root files"). Both are served by the
// route handlers of app/sites/[site]/ through the rewrite of rule 3, so app/robots.ts and app/sitemap.ts stay the kpop files.
// The pure parts (text of a robots file, XML of a sitemap) and the list of a site's URLs live here so they can be tested
// without a server. Every URL is on the registry origin of the site (never another site's, never a hardcoded host).

import { fetchAllRows } from '@/lib/db/fetch-all';
import { createPublicReadClient } from '@/lib/supabase/server';
import { loadSeriesDirectory } from '@/lib/anime/directory';
import { whichCharacterPath } from '@/lib/personality/series';
import { listSeriesSets } from '@/lib/personality/sets';

import { basePathOf, joinSiteUrl, zoneChildrenOf } from './base-path';
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

/**
 * A sitemap as XML: every `<loc>` is `origin` + the entry's path. `origin` is the site url: for a site in a sub-folder
 * (https://fandomverse.org/anime) its home is the url itself, with no trailing slash (lib/site/base-path.ts joinSiteUrl).
 */
export function sitemapXml(origin: string, entries: readonly SitemapEntry[]): string {
  const urls = entries.map((e) => [
    '<url>',
    `<loc>${xmlEscape(joinSiteUrl(origin, e.path))}</loc>`,
    ...(e.lastModified ? [`<lastmod>${e.lastModified.toISOString()}</lastmod>`] : []),
    ...(e.changeFrequency ? [`<changefreq>${e.changeFrequency}</changefreq>`] : []),
    ...(e.priority !== undefined ? [`<priority>${e.priority}</priority>`] : []),
    '</url>',
  ].join(''));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

// ---------------------------------------------------------------------------------------------------------------------------
// FandomVerse (owner, 2026-10-28; docs/launch/o1/ARCHITECTURE-FANDOMVERSE.md): one domain, sub-folders. The site at the root of the
// domain (the hub) answers the one robots.txt and the one sitemap index of the domain for the sites in its sub-folders; a site in a
// sub-folder answers neither robots.txt (404) nor anything at the root, and keeps its own sitemap at <base>/sitemap.xml.

/** The urlset of the hub's own pages once /sitemap.xml is the index of the domain. */
export const HUB_PAGES_SITEMAP = '/sitemap-hub.xml';

function list(value: string | string[] | undefined): string[] {
  return value === undefined ? [] : typeof value === 'string' ? [value] : value;
}

/**
 * The robots of the domain: the root site's rules, each followed by the same rules of every site in a sub-folder with its base
 * path in front (`Disallow: /anime/api/`, `Allow: /anime/api/og/`), so one file speaks for the whole domain. '/' is not repeated
 * (it already allows the whole domain). The sub-folder sites build their rules with the same app/robots.ts, so the rule of a user
 * agent is the same list there.
 */
export function zoneRobots(robots: MetadataRoute.Robots, children: readonly SiteConfig[]): MetadataRoute.Robots {
  if (children.length === 0) return robots;
  const under = (value: string | string[] | undefined): string[] =>
    children.flatMap((c) => list(value).filter((p) => p !== '/').map((p) => `${basePathOf(c.url)}${p}`));
  const rules = Array.isArray(robots.rules) ? robots.rules : [robots.rules];
  return {
    ...robots,
    rules: rules.map((r) => {
      const allow = [...list(r.allow), ...under(r.allow)];
      const disallow = [...list(r.disallow), ...under(r.disallow)];
      return {
        ...r,
        userAgent: r.userAgent ?? '*',
        ...(allow.length ? { allow } : {}),
        ...(disallow.length ? { disallow } : {}),
      };
    }),
  };
}

/** A sitemap index as XML: one `<sitemap><loc>` per absolute URL, in the order given. */
export function sitemapIndexXml(locs: readonly string[]): string {
  const items = locs.map((l) => `<sitemap><loc>${xmlEscape(l)}</loc></sitemap>`);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

/**
 * The sites in the sub-folders of a domain that its sitemap index and its llms.txt list: only those open to search engines. A build
 * cannot read the NET_INDEXING of another Vercel project, so the hub decides with its own flag (`raw`, the NET_INDEXING of the hub
 * build): the hub and /anime open together at launch (K10). While it is off, the index lists the hub's own pages only and llms.txt
 * names no site in a sub-folder.
 */
export function openZoneChildren(children: readonly SiteConfig[], raw: string | undefined = process.env.NET_INDEXING): SiteConfig[] {
  return children.filter((c) => indexingOpenFor(c.id, raw));
}

/** The sitemaps the index of `site`'s domain lists: its own pages, then the sitemap of each open site in a sub-folder. */
export function zoneSitemaps(site: SiteConfig, children: readonly SiteConfig[], raw: string | undefined = process.env.NET_INDEXING): string[] {
  return [joinSiteUrl(site.url, HUB_PAGES_SITEMAP), ...openZoneChildren(children, raw).map((c) => `${c.url}/sitemap.xml`)];
}

/**
 * The URLs a non-kpop site lists, in the order a crawler should meet them.
 *   hub:   its home, and its /privacy and /legal once the network is open (NET_INDEXING); while it is closed /privacy is a noindex draft and stays out.
 *          (/legal is indexable only once its [BRACKETED] facts are filled: lib/site/hub/legal.ts fails an open build that still prints one.)
 *   anime: its home, /series, every series hub that has at least `seo.minPublishedForIndexableHub` published quizzes
 *          (below it the hub page is noindex, so it stays out), the Which character are you page of every series that has a quiz
 *          (six active profiles, lane PERS), then every published quiz of the site, newest first.
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
    return [
      home,
      { path: '/privacy', ...(launch ? { lastModified: new Date(`${launch}T00:00:00Z`) } : {}), changeFrequency: 'yearly', priority: 0.3 },
      { path: '/legal', ...(launch ? { lastModified: new Date(`${launch}T00:00:00Z`) } : {}), changeFrequency: 'yearly', priority: 0.3 },
    ];
  }
  if (site.id !== 'anime') throw new Error('sitemapEntriesFor: kpop has app/sitemap.ts');
  const home: SitemapEntry[] = [
    { path: '/', changeFrequency: 'daily', priority: 1 },
    { path: '/series', changeFrequency: 'weekly', priority: 0.8 },
  ];

  const [series, sets, quizzes] = await Promise.all([
    loadSeriesDirectory(db),
    listSeriesSets(db),
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
  const characterQuizzes = sets.map((slug): SitemapEntry => ({ path: whichCharacterPath(slug), changeFrequency: 'monthly', priority: 0.6 }));
  const plays = quizzes.slice(0, QUIZZES_LIMIT).map((q): SitemapEntry => ({
    path: `/q/${q.slug}`, lastModified: new Date(q.created_at), changeFrequency: 'monthly', priority: 0.6,
  }));
  return [...home, ...hubs, ...characterQuizzes, ...plays];
}

/**
 * /llms.txt of anime and hub (routes.md, "Per-site root files"): fixed facts and real routes only, no count (a hardcoded one
 * would rot, a live one is not worth a read for a file nothing is proven to consume), the site's own name and host, never
 * kpopquiz.org's. kpop keeps app/llms.txt/route.ts.
 */
export function llmsText(site: SiteConfig, children: readonly SiteConfig[] = zoneChildrenOf(site), raw: string | undefined = process.env.NET_INDEXING): string {
  const { name } = site.brand;
  const title = site.seo.llmsTxt.title;
  // FandomVerse (lane 1): a site in a sub-folder is named by its full address (fandomverse.org/anime, the url without its scheme: the
  // idea of siteAddress in lib/site/brand.ts) and its paths carry the sub-folder, since the file is read at <base>/llms.txt.
  const address = site.url.replace(/^https?:\/\//, '');
  const b = basePathOf(site.url);
  if (site.id === 'hub') {
    // The sites in its sub-folders (/anime), once open (openZoneChildren): each keeps its own llms.txt under its base path.
    const zones = openZoneChildren(children, raw).map((c) => `- ${basePathOf(c.url)}: ${c.brand.name}, a quiz site of the network (its own llms.txt: ${basePathOf(c.url)}/llms.txt)\n`).join('');
    return `# ${title}

> ${name} is the home of one account shared by a network of independent fan quiz sites. It holds no quiz of its own.

## What this site is
${name} lists the quiz sites of the network and shows a signed-in member which of them they have joined. Each site keeps its
own quizzes, scores and community; the account is the only thing they share.

## Best entry points
- /: the sites of the network
${zones}- /privacy: what one account shares between the sites

## What we do not publish
We do not publish simulated scores, invented play counts, or fabricated opponents.
`;
  }
  return `# ${title}

> Free, fan-made anime quizzes. Every quiz is written by a fan, and every statistic on the site comes from real plays, never simulated.

## What this site is
${address} is an independent anime quiz site. Visitors play quizzes about anime series, with a spoiler shield that keeps
questions beyond the episode or chapter a visitor has reached out of sight. Quizzes are created by fans and checked before they go live.

## Best entry points
- ${b}/quizzes: every published quiz, filterable by series and type
- ${b}/series: every series with quizzes, A to Z
- ${b}/{series}-quiz: a series hub with its quizzes, e.g. ${b}/attack-on-titan-quiz
- ${b}/trivia: sourced trivia and fun facts by series
- ${b}/community: threads, blogs and debates from the fandoms

## What we do not publish
We do not publish simulated scores, invented play counts, or fabricated opponents. If a number appears on this site, a person produced it.
`;
}
