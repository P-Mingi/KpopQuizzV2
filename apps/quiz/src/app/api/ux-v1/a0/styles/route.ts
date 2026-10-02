import { UX_V1 } from '@/lib/ux-v1';
import { buildUxStylesheet } from '@/lib/ux-v1/a0/stylesheet';
import { isUxV12 } from '@/lib/ux-v12';

// The v11 stylesheet, served ONLY to flag-on pages (the root layout links it when
// NEXT_PUBLIC_UX_V1 is on). Why a route and not a CSS import: Turbopack emits every
// imported CSS file as its own <link rel="stylesheet"> on every page that imports
// it, so an import (even @import from globals.css) adds a tag and ~42 KB to every
// FLAG-OFF page too. Served from here, flag off stays byte for byte today's site.
//
// It concatenates every file of src/styles/ux-v1/ (a0.css first, then the page
// agents' <id>.css in name order), so a page stylesheet dropped in that folder is
// live flag-on with no import. Built once (force-static) and cached per build.
//
// v12 (lib/ux-v1/a0/stylesheet.ts): with NEXT_PUBLIC_UX_V12 on too, the v12 block
// of a0.css is kept and every src/styles/ux-v12/<id>.css follows; with it off the
// block is cut, so a v11-only build serves the same bytes as before v12.

export const dynamic = 'force-static';

export function GET(): Response {
  if (!UX_V1) return new Response('/* UX v1 is off */', { status: 404, headers: { 'content-type': 'text/css; charset=utf-8' } });
  return new Response(buildUxStylesheet({ v12: isUxV12() }), {
    headers: {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': process.env.NODE_ENV === 'production' ? 'public, max-age=31536000, immutable' : 'no-store',
    },
  });
}
