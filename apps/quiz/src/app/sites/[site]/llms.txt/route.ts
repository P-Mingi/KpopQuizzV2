// Run O1, lane C3: /llms.txt of the anime and hub builds, through the beforeFiles rewrite '/llms.txt' -> '/sites/<site>/llms.txt'
// (routes.md, "Per-site root files"); app/llms.txt/route.ts stays the kpop file. The text is lib/site/root-files.ts llmsText.

import { SITE } from '@/lib/site/registry';
import { llmsText } from '@/lib/site/root-files';
import { isServedSite, siteStaticParams } from '@/lib/site/routing';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): { site: string }[] {
  return siteStaticParams();
}

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site)) return new Response('Not found', { status: 404 });
  return new Response(llmsText(SITE), {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' },
  });
}
