// Run O1, lane O1: /sitemap.xml of the anime and hub builds, through the beforeFiles rewrite '/sitemap.xml' ->
// '/sites/<site>/sitemap.xml' (routes.md, "Per-site root files"), so app/sitemap.ts stays the kpop file. Every URL is on the
// registry origin of the site; the list is lib/site/root-files.ts sitemapEntriesFor (hub: home and /privacy; anime: home,
// /series, the series hubs and the published quizzes). Read per request and kept by the CDN for an hour, so a quiz published
// today is listed within the hour and a build never reads the database for it.

import { SITE } from '@/lib/site/registry';
import { sitemapEntriesFor, sitemapXml } from '@/lib/site/root-files';
import { isServedSite } from '@/lib/site/routing';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site)) return new Response('Not found', { status: 404 });
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
