// Run PWA (docs/o1/PWA-PLAN.md, section 3): /sw.js of bunnyverse.org, reached through the beforeFiles rewrite '/sw.js' ->
// '/sites/hub/sw.js' (PER_SITE_ROOT_FILES, routes.md "Per-site root files"), so app/sw.js stays the kpop file. OtakuQuiz (anime build)
// is no app of its own: it answers 404 here, and the one worker of bunnyverse.org is the hub's. Same rules as app/sw.js.

import { swResponse } from '@/lib/pwa/sw-route';
import { isServedSite } from '@/lib/site/routing';
import { SITE_ID } from '@/lib/site/registry';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ site: string }> }): Promise<Response> {
  const { site } = await ctx.params;
  if (!isServedSite(site)) return new Response('Not found', { status: 404 });
  return swResponse(SITE_ID, { NEXT_PUBLIC_NET_PWA: process.env.NEXT_PUBLIC_NET_PWA, NET_PWA_KILL: process.env.NET_PWA_KILL, NODE_ENV: process.env.NODE_ENV });
}
