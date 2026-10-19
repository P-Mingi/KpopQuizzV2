import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Relative, not '@/': next.config.ts imports this module without the alias (same as lib/site/registry).
import { SITE_ID } from '../../site/registry';

import type { SiteId } from '../../site/types';

// The flag-on stylesheet, built for app/api/ux-v1/a0/styles (server only).
//
// v11 (unchanged): every file of src/styles/ux-v1/, a0.css first, then the page
// sheets in name order, comments out and whitespace collapsed.
//
// v12 (A1): a0.css ends with ONE block between the two markers below (the shared
// v12 pieces: tokens, Team badge, theme card, ways-to-play tile, steps, language
// switch, answer tiles, result card, story preview). With the v12 flag off the
// block is cut before minifying, so a v11-only build serves the same bytes as
// before the block existed. With the flag on the block stays and every
// src/styles/ux-v12/<id>.css (the G agents' page sheets) follows in name order.
// Like the v11 sheets, none of these files is ever imported.
//
// O1 (docs/o1/contracts/tokens.md 3.1): on a build whose site is `anime` or `hub`, the files of
// src/styles/sites/<site>/ follow every sheet above, `tokens.css` first, the others by file name. The
// kpop build reads nothing from src/styles/sites/: its bytes and its ?v= hash are today's.

export const V12_BEGIN = '/* @ux-v12:begin */';
export const V12_END = '/* @ux-v12:end */';

/** Comments out, whitespace collapsed; never touches ':' or ' ' inside selectors. */
export function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{};])\s*/g, '$1')
    .trim();
}

/** The sheet without its v12 block (the markers and everything between them). */
export function stripV12(css: string): string {
  const a = css.indexOf(V12_BEGIN);
  if (a < 0) return css;
  const b = css.indexOf(V12_END, a);
  return css.slice(0, a) + (b < 0 ? '' : css.slice(b + V12_END.length));
}

function cssFiles(dir: string): string[] {
  try {
    return fs.readdirSync(dir).filter((f) => f.endsWith('.css'));
  } catch {
    return [];
  }
}

export interface UxStylesheetOptions {
  /** isUxV12() of the build. */
  v12: boolean;
  /** src/styles (holds ux-v1/ and ux-v12/). Default: the app's own folder. */
  stylesDir?: string;
  /** The site of the build. Default: SITE_ID of lib/site. kpop adds no site sheet. */
  site?: SiteId;
}

/** The ?v= of the stylesheet link: 12 hex characters of the sha256 of the served bytes, so the
 *  address changes whenever the CSS does, however the build was deployed. next.config.ts computes
 *  it at build time (UX_CSS_VERSION). Before, the link read VERCEL_GIT_COMMIT_SHA ?? ..., which a
 *  command-line deploy sets to '' (so `??` kept it): every such deploy linked `?v=`, one immutable
 *  address cached for a year with the first deploy's CSS (owner, 2026-10-06). */
export function uxStylesheetVersion(css: string): string {
  return createHash('sha256').update(css).digest('hex').slice(0, 12);
}

/** The sheets of one site under `styles/sites/<site>/`: tokens.css first, then the others by file name. */
export function siteSheetFiles(files: readonly string[]): string[] {
  return [...files].sort((a, b) => (a === 'tokens.css' ? -1 : b === 'tokens.css' ? 1 : a.localeCompare(b)));
}

export function buildUxStylesheet({ v12, stylesDir = path.join(process.cwd(), 'src/styles'), site = SITE_ID }: UxStylesheetOptions): string {
  const v11Dir = path.join(stylesDir, 'ux-v1');
  const v12Dir = path.join(stylesDir, 'ux-v12');
  const parts: string[] = [];
  const v11 = cssFiles(v11Dir).sort((a, b) => (a === 'a0.css' ? -1 : b === 'a0.css' ? 1 : a.localeCompare(b)));
  for (const f of v11) {
    const src = fs.readFileSync(path.join(v11Dir, f), 'utf8');
    parts.push(`/* ${f} */\n${minifyCss(v12 ? src : stripV12(src))}`);
  }
  if (v12) {
    for (const f of cssFiles(v12Dir).sort((a, b) => a.localeCompare(b))) {
      parts.push(`/* ux-v12/${f} */\n${minifyCss(fs.readFileSync(path.join(v12Dir, f), 'utf8'))}`);
    }
  }
  if (site !== 'kpop') {
    const siteDir = path.join(stylesDir, 'sites', site);
    for (const f of siteSheetFiles(cssFiles(siteDir))) {
      parts.push(`/* sites/${site}/${f} */\n${minifyCss(fs.readFileSync(path.join(siteDir, f), 'utf8'))}`);
    }
  }
  return parts.join('\n');
}
