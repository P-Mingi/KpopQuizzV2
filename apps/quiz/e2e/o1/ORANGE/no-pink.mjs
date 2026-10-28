// Run O1, owner order of 2026-10-26: no pink is visible on fandomverse.org/anime. This opens the pages of a running anime build in a real browser, light and
// dark, and reads the COMPUTED colour of every rendered element (text, background, borders, outline, shadows, gradients, svg fill and stroke, and the
// ::before and ::after of each), then fails when one of them is a kpop pink.
//   node e2e/o1/ORANGE/no-pink.mjs [--base http://127.0.0.1:3011] [--paths /,/series,...] [--cookie name=value] [--out file]
// Pink is a hue between 325 and 347 degrees with a saturation of at least 0.35 and a lightness between 0.38 and 0.97, or one of the five dark rose
// grounds of the kpop accent family (the dark pink-soft and pink-line values). Playwright comes from @playwright/test (PW=<path> to point at it).
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a), []));
const base = args.base || 'http://127.0.0.1:3011';
const PAGES = (args.paths || '/,/series,/death-note-quiz,/q/fx-death-note-basics-rules-and-creators,/quizzes,/trivia,/community,/leaderboard,/login,/me,/about,/create,/search').split(',');
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || '@playwright/test');

const DARK_ROSES = ['#3A2129', '#4A2A37', '#3D1A26', '#33202A', '#5A2A40'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));

const browserSide = (DARK) => {
  const hsl = (r, g, b) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; const d = mx - mn; if (d) { s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s, l]; };
  const isPink = (r, g, b, a) => {
    if (a !== undefined && a < 0.04) return false;
    if (DARK.some((c) => Math.abs(c[0] - r) + Math.abs(c[1] - g) + Math.abs(c[2] - b) <= 3)) return true;
    const [h, s, l] = hsl(r, g, b);
    return h >= 325 && h <= 347 && s >= 0.35 && l >= 0.38 && l <= 0.97;
  };
  const colours = (v) => {
    const out = [];
    for (const m of v.matchAll(/rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)/g)) out.push([+m[1], +m[2], +m[3], m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4])]);
    for (const m of v.matchAll(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/g)) out.push([Math.round(+m[1] * 255), Math.round(+m[2] * 255), Math.round(+m[3] * 255), m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : +m[4])]);
    return out;
  };
  const PROPS = ['color', 'backgroundColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'textDecorationColor', 'columnRuleColor', 'caretColor', 'fill', 'stroke', 'boxShadow', 'textShadow', 'backgroundImage', 'borderImageSource'];
  const found = [];
  const check = (el, pseudo) => {
    const cs = getComputedStyle(el, pseudo);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    if (pseudo && (cs.content === 'none' || cs.content === 'normal')) return;
    for (const p of PROPS) {
      const v = cs[p];
      if (!v || v === 'none') continue;
      if ((p.startsWith('border') && p !== 'borderImageSource') && cs[p.replace('Color', 'Style')] === 'none') continue;
      if (p === 'textDecorationColor' && cs.textDecorationLine === 'none') continue;
      if (p === 'columnRuleColor') continue;
      for (const c of colours(v)) if (isPink(c[0], c[1], c[2], c[3])) { found.push({ el: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '') + (pseudo || ''), prop: p, value: v.slice(0, 110) }); break; }
    }
    if (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') for (const c of colours(cs.outlineColor)) if (isPink(c[0], c[1], c[2], c[3])) found.push({ el: el.tagName.toLowerCase(), prop: 'outlineColor', value: cs.outlineColor });
  };
  for (const el of document.querySelectorAll('body, body *')) { if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE'].includes(el.tagName)) continue; check(el); check(el, '::before'); check(el, '::after'); }
  return found;
};

const browser = await chromium.launch();
const lines = [];
let bad = 0;
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme });
  if (args.cookie) { const [n, ...v] = args.cookie.split('='); await ctx.addCookies([{ name: n, value: v.join('='), url: base }]); }
  const page = await ctx.newPage();
  // --inject a.css,b.css: add these sheets to every page (to try a sheet before the build that serves it).
  const inject = (args.inject || '').split(',').filter(Boolean).map((f) => readFileSync(f, 'utf8')).join('\n');
  for (const path of PAGES) {
    const res = await page.goto(base + path, { waitUntil: 'load' });
    if (inject) await page.addStyleTag({ content: inject });
    await page.waitForTimeout(1800);
    const found = await page.evaluate(browserSide, DARK_ROSES);
    const uniq = [...new Map(found.map((f) => [`${f.el}|${f.prop}|${f.value}`, f])).values()];
    lines.push(`${scheme} ${path} (${res ? res.status() : '?'} -> ${new URL(page.url()).pathname}): ${uniq.length === 0 ? 'no pink' : uniq.length + ' pink value(s)'}`);
    for (const f of uniq.slice(0, 25)) lines.push(`    ${f.el} ${f.prop}: ${f.value}`);
    bad += uniq.length;
  }
  await ctx.close();
}
await browser.close();
lines.push(bad === 0 ? 'RESULT: no rendered page computes a kpop pink' : `RESULT: ${bad} pink value(s) computed`);
console.log(lines.join('\n'));
if (args.out) writeFileSync(args.out, lines.join('\n') + '\n');
process.exit(bad === 0 ? 0 : 1);
