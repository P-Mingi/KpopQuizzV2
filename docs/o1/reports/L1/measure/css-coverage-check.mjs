import { createRequire } from 'node:module';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-measure/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const urls = ['/', '/q/are-you-a-real-coer', '/blindtest', '/quizzes', '/groups', '/leaderboard', '/daily', '/faq'];
const browser = await chromium.launch();
const per = {}; // sheet -> array of Uint8 usage
for (const path of urls) for (const w of [390, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, userAgent: 'Mozilla/5.0 (compatible; kpq-o1-measure-check)' });
  await ctx.route('**/_vercel/**', (r) => r.abort());
  const page = await ctx.newPage();
  await page.coverage.startCSSCoverage();
  await page.goto('https://kpopquiz.org' + path, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  await page.mouse.wheel(0, 3000); await page.waitForTimeout(500);
  const cov = await page.coverage.stopCSSCoverage();
  for (const e of cov) {
    const key = e.url.replace(/\?.*$/, '').replace('https://kpopquiz.org', '');
    if (!key.startsWith('/_next') && !key.startsWith('/api/ux-v1')) continue;
    const used = (per[key] ??= { total: e.text.length, mask: new Uint8Array(e.text.length), perPage: {} });
    const m = new Uint8Array(e.text.length);
    for (const r of e.ranges) { for (let i = r.start; i < r.end; i++) { used.mask[i] = 1; m[i] = 1; } }
    used.perPage[`${path}@${w}`] = m.reduce((a, b) => a + b, 0);
  }
  await ctx.close();
}
await browser.close();
let T = 0, U = 0;
for (const [k, v] of Object.entries(per)) {
  const u = v.mask.reduce((a, b) => a + b, 0); T += v.total; U += u;
  console.log(k.padEnd(48), 'bytes', String(v.total).padStart(7), 'used by any of 16 loads', String(u).padStart(7), (100 * u / v.total).toFixed(1) + '%', 'max single load', Math.max(...Object.values(v.perPage)));
}
console.log('TOTAL', T, 'used-by-any', U, (100 * U / T).toFixed(1) + '%');
