import { generationData } from '@/lib/generations/generations';
import { buildGenerationsTimelineSvg } from '@/lib/generations/timeline-svg';
import { SITE_ID } from '@/lib/site/registry';

// SEO Mission 2, part C point 4: the K-pop generations timeline as a downloadable SVG, drawn
// from the same file as the hub's table (lib/generations/group-generations.json), with the
// credit "kpopquiz.org" and the licence "CC BY 4.0" inside the image. Built once at build
// time (force-static): the data is a versioned file, so a new review ships with a deploy.
//
// Not in the sitemap: it is an image, not a page. The hub (/articles/kpop-generations-explained)
// shows it and links it for download. Under /data, so the middleware lets it through.

export const dynamic = 'force-static';

export function GET(): Response {
  // Run O1 (lib/site/routing.ts KPOP_ONLY_DOTTED_ROUTES): Next serves a dotted route before the site rewrites, so off kpop it refuses.
  if (SITE_ID !== 'kpop') return new Response(null, { status: 404 });
  return new Response(buildGenerationsTimelineSvg(generationData()), {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': 'inline; filename="kpopquiz-kpop-generations-timeline.svg"',
    },
  });
}
