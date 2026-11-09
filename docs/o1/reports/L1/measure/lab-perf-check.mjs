import { createRequire } from 'node:module';
const require = createRequire('/Users/louis/IT/Dev/projects/KpopQuizzV2/.claude/worktrees/o1-measure/apps/quiz/package.json');
const { chromium } = require('@playwright/test');
const variant = process.argv[2] || 'base';
const N = Number(process.argv[3] || 5);
const urls = ['/', '/q/are-you-a-real-coer', '/blindtest'];
const INTER = '/_next/static/media/Inter_latin-s.0q-301v4kxxnr.woff2?dpl=dpl_AjApYFF7iF8UL8F2jNPv9z6FAuUU';
const med = (a) => a.slice().sort((x, y) => x - y)[Math.floor(a.length / 2)];
const browser = await chromium.launch();
const out = [];
for (const path of urls) for (const [w, h, mobile] of [[390, 844, true]]) {
  const rows = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: 'Mozilla/5.0 (compatible; kpq-o1-measure-check)', deviceScaleFactor: 2 });
    await ctx.route('**/_vercel/**', (r) => r.abort());
    if (variant === 'inter') {
      await ctx.route('https://kpopquiz.org' + path, async (r) => {
        const resp = await r.fetch(); let body = await resp.text();
        body = body.replace('<head>', `<head><link rel="preload" href="${INTER}" as="font" type="font/woff2" crossorigin="anonymous"/>`);
        r.fulfill({ response: resp, body });
      });
    }
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__m = { lcp: 0, cls: 0, fcp: 0 };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
    });
    await page.goto('https://kpopquiz.org' + path, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    const m = await page.evaluate(() => window.__m);
    rows.push(m);
    await ctx.close();
  }
  out.push({ variant, path, n: N, fcp: Math.round(med(rows.map((r) => r.fcp))), lcp: Math.round(med(rows.map((r) => r.lcp))), cls: +med(rows.map((r) => r.cls)).toFixed(4), lcpAll: rows.map((r) => Math.round(r.lcp)) });
}
await browser.close();
for (const o of out) console.log(JSON.stringify(o));
