import fs from 'node:fs';
import path from 'node:path';

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
}

export function buildUxStylesheet({ v12, stylesDir = path.join(process.cwd(), 'src/styles') }: UxStylesheetOptions): string {
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
  return parts.join('\n');
}
