// Run O1, lane O1: /robots.txt of the anime and hub builds, served through the beforeFiles rewrite '/robots.txt' ->
// '/sites/<site>/robots.txt' (routes.md, "Per-site root files"), so app/robots.ts stays the kpop file. The rules are the
// kpop file's (its Sitemap line already names the origin of the site of this build); the text is written by lib/site/root-files.ts.

import robots from '@/app/robots';
import { robotsText } from '@/lib/site/root-files';
import { isServedSite, siteStaticParams } from '@/lib/site/routing';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): { site: string }[] {
  return siteStaticParams();
}

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site)) return new Response('Not found', { status: 404 });
  return new Response(robotsText(robots()), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' },
  });
}
