// Launch polish, lane ADS: /ads.txt of the hub, through the beforeFiles rewrite '/ads.txt' -> '/sites/<site>/ads.txt' (routes.md, "Per-site root files").
// One line, derived from NEXT_PUBLIC_ADSENSE_PUB_ID (lib/site/adsense.ts). It depends on no ad flag: Google reads it before it approves the account.
// A 404 on every other site, on a sub-folder site, and on the hub while the variable is unset or malformed. kpopquiz.org has no such route.

import { basePathOf } from '@/lib/site/base-path';
import { adsTxtBody } from '@/lib/site/adsense';
import { SITE, SITE_ID } from '@/lib/site/registry';
import { isServedSite, siteStaticParams } from '@/lib/site/routing';

export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): { site: string }[] {
  return siteStaticParams();
}

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site) || SITE_ID !== 'hub' || basePathOf(SITE.url)) return new Response('Not found', { status: 404 });
  const body = adsTxtBody(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);
  if (body === null) return new Response('Not found', { status: 404 });
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' },
  });
}
