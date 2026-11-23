// LAUNCH-POLISH-2 E (integrator, 2026-11-23): /ads.txt of kpopquiz.org, the same line as the hub's (app/sites/[site]/ads.txt/route.ts), from the
// same code (lib/site/adsense.ts adsTxtBody) and the same variable, NEXT_PUBLIC_ADSENSE_PUB_ID of the kpopquiz project. It depends on no ad flag:
// Google reads it while it reviews the site. Unset or malformed: 404. kpopquiz.org shows no ad yet.
// On the anime and hub builds /ads.txt is rewritten to their own route before the filesystem (lib/site/routing.ts PER_SITE_ROOT_FILES), and this
// handler answers 404 off the kpop build anyway.
import { adsTxtBody } from '@/lib/site/adsense';
import { SITE_ID } from '@/lib/site/registry';

export const dynamic = 'force-static';

export async function GET(): Promise<Response> {
  if (SITE_ID !== 'kpop') return new Response('Not found', { status: 404 });
  const body = adsTxtBody(process.env.NEXT_PUBLIC_ADSENSE_PUB_ID);
  if (body === null) return new Response('Not found', { status: 404 });
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400' },
  });
}
