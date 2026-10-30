// Run O1, lane O1: /robots.txt of the anime and hub builds, served through the beforeFiles rewrite '/robots.txt' ->
// '/sites/<site>/robots.txt' (routes.md, "Per-site root files"), so app/robots.ts stays the kpop file. The rules are the
// kpop file's (its Sitemap line already names the origin of the site of this build); the text is written by lib/site/root-files.ts.
// Bunnyverse (lane 1): the one robots.txt of bunnyverse.org is the hub's, and it carries the rules of the sites in its sub-folders
// (zoneRobots). A site in a sub-folder (OtakuQuiz, /anime) answers 404 here: never a second robots file at /anime/robots.txt.

import robots from '@/app/robots';
import { basePathOf, zoneChildrenOf } from '@/lib/site/base-path';
import { SITE } from '@/lib/site/registry';
import { robotsText, zoneRobots } from '@/lib/site/root-files';
import { isServedSite, siteStaticParams } from '@/lib/site/routing';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): { site: string }[] {
  return siteStaticParams();
}

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site) || basePathOf(SITE.url)) return new Response('Not found', { status: 404 });
  return new Response(robotsText(zoneRobots(robots(), zoneChildrenOf(SITE))), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' },
  });
}
