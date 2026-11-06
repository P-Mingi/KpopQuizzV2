// Private launch: the Coming soon page (app/sites/private-launch/route.ts), a small HTML document of its own: no site chrome, no
// navigation, no script, no analytics, nothing of the root layout (whose metadata and scripts are written for the open sites). The
// Bunnyverse logo is the hub's brand file (public/brand/hub/logo-primary.svg), the colours the hub's ink on cream (styles/sites/hub/
// tokens.css), so the page looks the same on the hub and at /anime. The words are the owner's (2026-11-06): no number, no date.

import { ENTER_PATH } from './config';

export const COMING_SOON_COPY = {
  title: 'Coming soon',
  line: 'Kpopdle, Otakudle and OtakuQuiz open soon on Bunnyverse.',
  kpopLabel: 'Play on kpopquiz.org',
  kpopHref: 'https://kpopquiz.org',
  signIn: 'Sign in',
  brand: 'Bunnyverse',
} as const;

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = [
  ':root{color-scheme:light dark}',
  'html,body{margin:0;padding:0}',
  "body{background:#FAF8F5;color:#1F1B17;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}",
  '.cs{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:32px 20px;box-sizing:border-box}',
  '.cs-card{max-width:520px;width:100%;text-align:center;display:flex;flex-direction:column;align-items:center;gap:20px}',
  '.cs-logo{width:240px;max-width:80%;height:auto}',
  '.cs-title{margin:0;font-size:40px;line-height:1.1;font-weight:800;letter-spacing:-.02em}',
  '.cs-line{margin:0;font-size:18px;line-height:1.5;color:#57514B}',
  '.cs-cta{display:inline-block;padding:12px 22px;border-radius:999px;background:#1F1B17;color:#FAF8F5;font-weight:700;text-decoration:none}',
  '.cs-cta:hover{background:#3A332C}',
  '.cs-signin{font-size:13px;color:#57514B}',
  '@media (prefers-color-scheme:dark){body{background:#141312;color:#F3F0EB}.cs-line,.cs-signin{color:#C9C2B8}.cs-cta{background:#F3F0EB;color:#141312}.cs-cta:hover{background:#D8D3CC}}',
].join('');

/** The document. `basePath` is the build's ('' on the hub, '/anime' on OtakuQuiz): every address of the page is one of this build. */
export function comingSoonHtml(basePath: string): string {
  const c = COMING_SOON_COPY;
  const at = (p: string): string => esc(`${basePath}${p}`);
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="robots" content="noindex, nofollow">',
    `<title>${esc(c.title)} | ${esc(c.brand)}</title>`,
    `<meta name="description" content="${esc(c.line)}">`,
    `<link rel="icon" href="${at('/brand/hub/favicon.svg')}" type="image/svg+xml">`,
    `<style>${CSS}</style>`,
    '</head>',
    '<body>',
    '<main class="cs"><div class="cs-card">',
    `<img class="cs-logo" src="${at('/brand/hub/logo-primary.svg')}" alt="${esc(c.brand)}">`,
    `<h1 class="cs-title">${esc(c.title)}</h1>`,
    `<p class="cs-line">${esc(c.line)}</p>`,
    `<a class="cs-cta" href="${esc(c.kpopHref)}">${esc(c.kpopLabel)}</a>`,
    `<a class="cs-signin" href="${at(ENTER_PATH)}" rel="nofollow">${esc(c.signIn)}</a>`,
    '</div></main>',
    '</body>',
    '</html>',
  ].join('\n');
}
