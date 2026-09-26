#!/usr/bin/env node
// C3 performance probe (v11 briefs/C3.md step 4). Lighthouse is not installed and
// adding it is a new dependency, so this measures with the installed Playwright:
// a phone (390 x 844, DPR 3, touch, mobile UA), CPU throttled 4x through CDP, and
// two network profiles: "local" (no network throttle) and "slow4g" (Lighthouse's
// mobile values: 150 ms RTT, 1.6 Mbps down, 750 kbps up). Per page and profile:
// LCP (and its element), CLS (largest session window), JS transferred (and all
// bytes), and every photo from public/idols: natural width vs rendered width x DPR,
// `sizes` set or not. Median of RUNS loads, after one warm load. Read only (GET),
// every mutating request answered locally.
//
// Must run from apps/quiz (imports @playwright/test): copy it there temporarily.
//   UX11_CHROMIUM=... node perf.mjs --base http://localhost:3021 --label on --out <dir>

import fs from 'node:fs';
import path from 'node:path';

import { chromium, devices } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('--base', 'http://localhost:3021');
const LABEL = opt('--label', 'on');
const OUT = opt('--out', '.');
const RUNS = Number(opt('--runs', '3'));
const PAGES = (opt('--pages', '/,/q/ultimate-bts-era-quiz-only-real-armys-survive,/blackpink-quiz,/blindtest')).split(',');
const PROFILES = {
  local: null,
  slow4g: { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 },
};
const DPR = 3;

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function measure(p, profile, warm) {
  const ctx = await browser.newContext({ ...devices['Pixel 5'], viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.addInitScript(() => {
    window.__qa = { lcp: null, lcpEl: null, cls: 0, shifts: [] };
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__qa.lcp = e.startTime;
        const el = e.element;
        window.__qa.lcpEl = el ? `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''}${el.currentSrc ? ' ' + decodeURIComponent(el.currentSrc).replace(location.origin, '').slice(0, 90) : ''}` : null;
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    // CLS = the largest session window (gap < 1 s, window < 5 s), as web-vitals does
    let win = 0; let first = 0; let last = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        if (win && e.startTime - last < 1000 && e.startTime - first < 5000) { win += e.value; last = e.startTime; }
        else { win = e.value; first = last = e.startTime; }
        window.__qa.cls = Math.max(window.__qa.cls, win);
        if (window.__qa.shifts.length < 12) window.__qa.shifts.push({ t: Math.round(e.startTime), v: Number(e.value.toFixed(4)), src: (e.sources || []).slice(0, 2).map((s) => s.node ? `${s.node.nodeName?.toLowerCase()}.${String(s.node.className || '').split(' ')[0]}` : '?') });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: !warm });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: warm ? 1 : 4 });
  if (!warm && PROFILES[profile]) await cdp.send('Network.emulateNetworkConditions', PROFILES[profile]);
  const bytes = { js: 0, css: 0, img: 0, font: 0, doc: 0, other: 0, total: 0 };
  const types = new Map();
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => {
    const t = types.get(e.requestId);
    const k = t === 'Script' ? 'js' : t === 'Stylesheet' ? 'css' : t === 'Image' ? 'img' : t === 'Font' ? 'font' : t === 'Document' ? 'doc' : 'other';
    bytes[k] += e.encodedDataLength; bytes.total += e.encodedDataLength;
  });
  const t0 = Date.now();
  const res = await page.goto(BASE + p, { waitUntil: 'load', timeout: 180_000 });
  await page.waitForTimeout(warm ? 500 : 5000); // let LCP / late shifts settle (no input)
  const qa = await page.evaluate(() => window.__qa);
  const measured = { ...bytes }; // before the image probes below add their own bytes
  // when the LCP resource (an image) started loading, relative to navigation start
  const lcpStart = await page.evaluate(() => {
    const e = performance.getEntriesByType('largest-contentful-paint').at(-1);
    const url = e && e.url;
    if (!url) return null;
    const r = performance.getEntriesByType('resource').find((x) => x.name === url);
    return r ? Math.round(r.startTime) : null;
  });
  // naturalWidth of a srcset image is density-corrected: read the served file's own width
  // by loading currentSrc again in a plain Image (same URL, from the cache).
  const imgs = await page.evaluate(async (dpr) => Promise.all(Array.from(document.images)
    .filter((im) => /idols/.test(decodeURIComponent(im.currentSrc || im.src)))
    .map(async (im) => {
      const r = im.getBoundingClientRect();
      // a lazy image below the fold has no currentSrc yet: its `src` is Next's largest
      // fallback, which the browser never chose; it is listed but not judged
      const loaded = Boolean(im.currentSrc);
      const density = /\s\d(\.\d+)?x\s*(,|$)/.test(im.getAttribute('srcset') ?? '');
      const url = im.currentSrc || im.src;
      const w = new URL(url, location.href).searchParams.get('w');
      let intrinsic = null;
      if (loaded) { try { const probe = new Image(); probe.src = url; await probe.decode(); intrinsic = probe.naturalWidth; } catch { intrinsic = null; } }
      let source = null;
      try { const s = new URL(url, location.href).searchParams.get('url'); if (s) { const p2 = new Image(); p2.src = s; await p2.decode(); source = p2.naturalWidth; } } catch { source = null; }
      return {
        src: decodeURIComponent(url).replace(location.origin, '').replace(/^\/_next\/image\?url=/, '').slice(0, 80),
        loaded, natural: intrinsic, sourceWidth: source, rendered: Math.round(r.width), needed: Math.round(r.width * dpr), servedW: loaded && w ? Number(w) : null,
        sizes: im.getAttribute('sizes'), srcset: Boolean(im.getAttribute('srcset')), density, loading: im.getAttribute('loading'), inView: r.top < innerHeight && r.bottom > 0, complete: im.complete,
      };
    })), DPR);
  await ctx.close();
  return { status: res?.status(), wallMs: Date.now() - t0, lcp: qa.lcp === null ? null : Math.round(qa.lcp), lcpEl: qa.lcpEl, cls: Number(qa.cls.toFixed(4)), shifts: qa.shifts, bytes: measured, lcpStart, imgs };
}

const med = (xs) => { const s = xs.filter((x) => x !== null).sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : null; };
const out = { at: new Date().toISOString(), base: BASE, label: LABEL, dpr: DPR, cpuThrottle: 4, runs: RUNS, pages: {} };
for (const p of PAGES) {
  await measure(p, 'local', true); // warm the server (ISR, image optimiser) with one plain load
  out.pages[p] = {};
  for (const profile of Object.keys(PROFILES)) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push(await measure(p, profile, false));
    const imgs = runs.at(-1).imgs;
    out.pages[p][profile] = {
      lcpMs: med(runs.map((r) => r.lcp)), cls: med(runs.map((r) => r.cls)), jsKB: Math.round(med(runs.map((r) => r.bytes.js)) / 1024), totalKB: Math.round(med(runs.map((r) => r.bytes.total)) / 1024),
      lcpEl: runs.at(-1).lcpEl, shifts: runs.at(-1).shifts, runs: runs.map((r) => ({ status: r.status, lcp: r.lcp, cls: r.cls, lcpStartMs: r.lcpStart, kb: Object.fromEntries(Object.entries(r.bytes).map(([k, v]) => [k, Math.round(v / 1024)])) })),
      idolImages: imgs,
      // too big: more than 2x the pixels needed at DPR 3; too small: under 2/3 of it while the
      // source file had more to give; no `sizes` on a srcset image (the browser assumes 100vw)
      // (a density srcset, 1x / 2x of a fixed-size image, needs no `sizes`; an unloaded lazy image is not judged)
      idolImageProblems: imgs.filter((im) => (im.srcset && !im.density && !im.sizes) || (im.loaded && im.natural && im.natural > im.needed * 2) || (im.loaded && im.natural && im.sourceWidth && im.natural < im.needed * 0.66 && im.sourceWidth > im.natural)).map((im) => `${im.src}: served ${im.natural}px (source ${im.sourceWidth}px) for ${im.rendered}px x${DPR} = ${im.needed}px, sizes=${im.sizes ?? (im.density ? 'density srcset' : 'none')}`),
    };
    const r = out.pages[p][profile];
    process.stdout.write(`${LABEL} ${p} [${profile}] LCP ${r.lcpMs} ms  CLS ${r.cls}  JS ${r.jsKB} KB  total ${r.totalKB} KB  idol imgs ${imgs.length}  problems ${r.idolImageProblems.length}  lcpEl ${r.lcpEl}\n`);
  }
}
await browser.close();
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, `perf-${LABEL}.json`), JSON.stringify(out, null, 1));
