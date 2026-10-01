import fs from 'node:fs';
import path from 'node:path';

import { UX_V1 } from '@/lib/ux-v1';

// The v11 stylesheet, served ONLY to flag-on pages (the root layout links it when
// NEXT_PUBLIC_UX_V1 is on). Why a route and not a CSS import: Turbopack emits every
// imported CSS file as its own <link rel="stylesheet"> on every page that imports
// it, so an import (even @import from globals.css) adds a tag and ~42 KB to every
// FLAG-OFF page too. Served from here, flag off stays byte for byte today's site.
//
// It concatenates every file of src/styles/ux-v1/ (a0.css first, then the page
// agents' <id>.css in name order), so a page stylesheet dropped in that folder is
// live flag-on with no import. Built once (force-static) and cached per build.

export const dynamic = 'force-static';

const DIR = path.join(process.cwd(), 'src/styles/ux-v1');

function minify(css: string): string {
  // comments out, whitespace collapsed; never touches ':' or ' ' inside selectors
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .trim();
}

export function GET(): Response {
  if (!UX_V1) return new Response('/* UX v1 is off */', { status: 404, headers: { 'content-type': 'text/css; charset=utf-8' } });
  let files: string[] = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => f.endsWith('.css')).sort((a, b) => (a === 'a0.css' ? -1 : b === 'a0.css' ? 1 : a.localeCompare(b)));
  } catch {
    files = [];
  }
  const css = files.map((f) => `/* ${f} */\n${minify(fs.readFileSync(path.join(DIR, f), 'utf8'))}`).join('\n');
  return new Response(css, {
    headers: {
      'content-type': 'text/css; charset=utf-8',
      'cache-control': process.env.NODE_ENV === 'production' ? 'public, max-age=31536000, immutable' : 'no-store',
    },
  });
}
