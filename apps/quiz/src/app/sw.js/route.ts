// Run PWA (docs/o1/PWA-PLAN.md, section 3): /sw.js of kpopquiz.org, at the root so the worker's scope is the whole site. The hub's is
// app/sites/[site]/sw.js, reached through the per-site root file rewrite (lib/site/routing.ts PER_SITE_ROOT_FILES), exactly as /llms.txt is.
// Off by default: with NEXT_PUBLIC_NET_PWA unset this answers 404, today's answer for that address. The text is built by lib/pwa.

import { swResponse } from '@/lib/pwa/sw-route';
import { SITE_ID } from '@/lib/site/registry';

// Read when asked, never prerendered: the switch is a server variable and the answer must carry its own Cache-Control.
export const dynamic = 'force-dynamic';

export function GET(): Response {
  // A dotted route is served before the site rewrites, so off kpop this file must not answer for another site: the rewrite sends those
  // builds to app/sites/[site]/sw.js first, and this guard is the same belt as the other dotted routes have.
  if (SITE_ID !== 'kpop') return new Response('Not found', { status: 404 });
  return swResponse(SITE_ID, { NEXT_PUBLIC_NET_PWA: process.env.NEXT_PUBLIC_NET_PWA, NET_PWA_KILL: process.env.NET_PWA_KILL, NODE_ENV: process.env.NODE_ENV });
}
