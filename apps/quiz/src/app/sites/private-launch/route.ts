// Private launch (lib/private-launch/config.ts): the Coming soon page every visitor of the hub and of OtakuQuiz gets while PRIVATE_LAUNCH
// is on, unless their browser holds the cookie of an allowed account. Only the gate's rewrite reaches it (COMING_SOON_INTERNAL), so the
// answer is a 200 at the address the visitor asked for. Static: built once, served from the cache, no function per visitor. noindex, nofollow
// in the document and in X-Robots-Tag. With the gate off, and on kpopquiz.org (where no rewrite leads here), a 404.
import { comingSoonHtml } from '@/lib/private-launch/copy';
import { readPrivateLaunch } from '@/lib/private-launch/config';
import { basePathOf } from '@/lib/site/base-path';
import { SITE, SITE_ID } from '@/lib/site/registry';

export const dynamic = 'force-static';

export function GET(): Response {
  if (SITE_ID === 'kpop' || !readPrivateLaunch(SITE_ID, process.env).on) {
    return new Response('Not found', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
  return new Response(comingSoonHtml(basePathOf(SITE.url)), {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'x-robots-tag': 'noindex, nofollow',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
