// Lab measure of 5 quiz pages (mobile, 4x CPU, slow 4G): LCP, CLS, long-task blocking time,
// JS bytes, HTML bytes. 3 runs per page, median. Usage: node cwv.mjs <label> <baseUrl> <slugs...>
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(new URL('../../../../apps/quiz/package.json', import.meta.url));
const { chromium } = require('playwright');
const [label, base, ...slugs] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Mobile Safari/537.36';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const out = [];
for (const slug of slugs) {
  const runs = [];
  for (let r = 0; r < 3; r++) {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true, userAgent: UA });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let js = 0, html = 0, scripts = 0;
    cdp.on('Network.loadingFinished', () => {});
    const types = new Map();
    cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
    cdp.on('Network.loadingFinished', (e) => { const t = types.get(e.requestId); if (t === 'Script') { js += e.encodedDataLength; scripts++; } if (t === 'Document') html += e.encodedDataLength; });
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0; window.__tbt = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    });
    const resp = await page.goto(`${base}/q/${slug}`, { waitUntil: 'load', timeout: 120000 });
    await page.waitForTimeout(3000);
    const m = await page.evaluate(() => ({ lcp: window.__lcp, cls: window.__cls, tbt: window.__tbt }));
    runs.push({ status: resp.status(), ...m, js, html, scripts });
    await ctx.close();
  }
  const row = { slug, status: runs[0].status, lcp_ms: Math.round(med(runs.map((x) => x.lcp))), cls: +med(runs.map((x) => x.cls)).toFixed(3), tbt_ms: Math.round(med(runs.map((x) => x.tbt))), js_kb: Math.round(med(runs.map((x) => x.js)) / 1024), scripts: med(runs.map((x) => x.scripts)), html_kb: Math.round(med(runs.map((x) => x.html)) / 1024) };
  out.push(row); console.log(JSON.stringify(row));
}
await browser.close();
writeFileSync(new URL(`./${label}.json`, import.meta.url), JSON.stringify({ label, base, at: new Date().toISOString(), rows: out }, null, 2));
