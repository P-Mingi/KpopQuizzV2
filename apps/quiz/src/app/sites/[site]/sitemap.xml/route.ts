// Run O1, lane O1: /sitemap.xml of the anime and hub builds, through the beforeFiles rewrite '/sitemap.xml' ->
// '/sites/<site>/sitemap.xml' (routes.md, "Per-site root files"), so app/sitemap.ts stays the kpop file. Every URL is on the
// registry origin of the site; the list is lib/site/root-files.ts sitemapEntriesFor (hub: home and /privacy; anime: home,
// /series, the series hubs and the published quizzes). Read per request and kept by the CDN for an hour, so a quiz published
// today is listed within the hour and a build never reads the database for it.
// FandomVerse (lane 1): the hub's /sitemap.xml is the one index of fandomverse.org: its own pages (/sitemap-hub.xml, the route
// next to this one) and, once open (the hub's NET_INDEXING, root-files.ts openZoneChildren), the sitemap of every site in its
// sub-folders (https://fandomverse.org/anime/sitemap.xml). A site in a sub-folder, and a site with none, keep their urlset here.

import { zoneChildrenOf } from '@/lib/site/base-path';
import { SITE } from '@/lib/site/registry';
import { sitemapEntriesFor, sitemapIndexXml, sitemapXml, zoneSitemaps } from '@/lib/site/root-files';
import { isServedSite } from '@/lib/site/routing';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site)) return new Response('Not found', { status: 404 });
  const children = zoneChildrenOf(SITE);
  if (children.length > 0) {
    return new Response(sitemapIndexXml(zoneSitemaps(SITE, children)), {
      headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }
  try {
    const body = sitemapXml(SITE.url, await sitemapEntriesFor(SITE));
    return new Response(body, {
      headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400' },
    });
  } catch (err) {
    console.error('[sitemap] read failed:', (err as Error)?.message ?? err);
    return new Response('Sitemap unavailable', { status: 503, headers: { 'retry-after': '600', 'content-type': 'text/plain; charset=utf-8' } });
  }
}
