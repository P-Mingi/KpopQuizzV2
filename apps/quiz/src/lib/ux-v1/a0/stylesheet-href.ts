// The link of the flag-on stylesheet (app/api/ux-v1/a0/styles, cached immutable for a year).
// Its ?v= is the build's content hash (UX_CSS_VERSION, set by next.config.ts from
// uxStylesheetVersion in ./stylesheet.ts). No fs here: the root layout imports it.

export const UX_STYLESHEET_PATH = '/api/ux-v1/a0/styles';

/** Never an empty `v=`: a missing or blank version (a dev server or a test that did not go
 *  through next.config.ts) reads 'dev'. */
export function uxStylesheetHref(version: string | null | undefined): string {
  const v = (version ?? '').trim();
  return `${UX_STYLESHEET_PATH}?v=${v || 'dev'}`;
}
