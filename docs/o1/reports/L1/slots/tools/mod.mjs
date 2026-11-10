import { createRequire } from 'node:module';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-slots/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const [url, sel, prefix] = process.argv.slice(2);
const b = await chromium.launch();
for (const w of [1280, 375]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
  await ctx.route('**/*', (r) => (r.request().method() === 'GET' ? r.continue() : r.abort()));
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded();
  await el.screenshot({ path: `${prefix}-${w}.png`, animations: 'disabled' });
  const m = await el.evaluate((e) => { const r = e.getBoundingClientRect(); const cs = (s) => { const n = e.querySelector(s); if (!n) return null; const c = getComputedStyle(n); return { w: Math.round(n.getBoundingClientRect().width), h: Math.round(n.getBoundingClientRect().height), fs: c.fontSize, fw: c.fontWeight, color: c.color, bg: c.backgroundColor, br: c.borderRadius }; }; return { w: Math.round(r.width), h: Math.round(r.height), h2: cs('h2'), h3: cs('h3'), btn: cs('a[class*="go"]'), card: cs('[class*="card"]'), tiles: cs('[class*="tiles"]'), no: cs('[class*="-no"]'), line: cs('[class*="line"]') }; });
  console.log(w, JSON.stringify(m));
  await ctx.close();
}
await b.close();
