// FandomVerse (lane 1): /sitemap-hub.xml, the urlset of the hub's own pages once its /sitemap.xml is the index of fandomverse.org
// (the route next to this one). It is no rewrite rule: the dotted path meets no file and the afterFiles rule of the build sends it
// here (lib/site/routing.ts). Only a site with sites in its sub-folders answers it; any other build, and a site in a sub-folder
// (/anime/sitemap-hub.xml), answers 404.

import { zoneChildrenOf } from '@/lib/site/base-path';
import { SITE } from '@/lib/site/registry';
import { sitemapEntriesFor, sitemapXml } from '@/lib/site/root-files';
import { isServedSite } from '@/lib/site/routing';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site) || zoneChildrenOf(SITE).length === 0) return new Response('Not found', { status: 404 });
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
