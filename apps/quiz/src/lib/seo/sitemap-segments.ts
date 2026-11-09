// O1 audit 03 P2-1 (section 4, rule 4): /sitemap.xml stays whole (check:sitemap-hygiene reads it, the ratchet law protects it) and is
// ALSO served in segments, one per page template, at /sitemaps/<segment>.xml, so Search Console and Bing can be given each one and report
// the index rate of each template. A segment is a partition of the whole sitemap: every URL is in exactly one, none is added or dropped,
// and each is built from the very entries sitemap.ts returns, so no gate differs. Pure; the route is app/sitemaps/[segment]/route.ts.

import { BRIDGE_PATH } from '@/lib/personality/bridge';

import type { MetadataRoute } from 'next';

export const SITEMAP_SEGMENTS = ['quizzes', 'hubs', 'trivia', 'blindtest', 'games', 'articles', 'verse', 'pages'] as const;
export type SitemapSegment = (typeof SITEMAP_SEGMENTS)[number];

export function isSitemapSegment(v: string): v is SitemapSegment {
  return (SITEMAP_SEGMENTS as readonly string[]).includes(v);
}

/** The segment of a public path. The first matching rule wins; `pages` takes the rest (static pages, themes, data pages, the home page). */
export function segmentOf(path: string): SitemapSegment {
  if (/^\/q\/[^/]+$/.test(path)) return 'quizzes';
  if (/^\/verse(\/|$)/.test(path)) return 'verse';
  if (path === '/guess-the-kpop-song' || /^\/(fr|es|id)\//.test(path) || /^\/blindtest(\/|$)/.test(path)) return 'blindtest';
  if (path === BRIDGE_PATH || /-name-all-members$/.test(path) || /^\/which-.+-member-are-you$/.test(path) || path === '/kpop-games' || path === '/name-them-all') return 'games';
  if (/^\/[^/]+-trivia$/.test(path)) return 'trivia';
  if (/^\/[^/]+-quiz$/.test(path)) return 'hubs';
  if (path === '/articles' || path.startsWith('/articles/') || path === '/data' || path.startsWith('/data/')) return 'articles';
  return 'pages';
}

const pathOf = (url: string): string => {
  try { return new URL(url).pathname.replace(/\/+$/, '') || '/'; } catch { return url; }
};

/** Split the whole sitemap into its segments (every key present, possibly empty). */
export function splitSitemap(entries: MetadataRoute.Sitemap): Record<SitemapSegment, MetadataRoute.Sitemap> {
  const out = Object.fromEntries(SITEMAP_SEGMENTS.map((s) => [s, [] as MetadataRoute.Sitemap])) as Record<SitemapSegment, MetadataRoute.Sitemap>;
  for (const e of entries) out[segmentOf(pathOf(e.url))].push(e);
  return out;
}

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

/** The same <url> fields Next writes for /sitemap.xml: loc, lastmod when there is one, changefreq, priority. */
export function sitemapXml(entries: MetadataRoute.Sitemap): string {
  const rows = entries.map((e) => {
    const parts = [`<loc>${esc(e.url)}</loc>`];
    if (e.lastModified) parts.push(`<lastmod>${(e.lastModified instanceof Date ? e.lastModified : new Date(e.lastModified)).toISOString()}</lastmod>`);
    if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
    if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
    return `<url>${parts.join('')}</url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows.join('')}</urlset>\n`;
}
