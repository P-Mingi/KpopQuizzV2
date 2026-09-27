#!/usr/bin/env node
// P8 report images: implementation | prototype, side by side, per state, width and theme.
// The implementation runs flag ON on a local server (BASE, default http://localhost:3038) as a
// guest (or STATE=<storage state file> for the signed-in look); every non-GET request is
// answered locally, so nothing is written. The prototype side is the pinned reference capture
// (v11/checks/reference/<w>-<theme>-<state>.png in the main checkout, REF_DIR to override).
// "Before" does not exist for P8: /community is a new URL (flag off = 301 to /).
//
//   UX11_CHROMIUM=... node docs/design/ux-dashboard-v1/v11/reports/P8/make-shots.mjs
//
// Writes <state>-<w>-<theme>.webp next to this file (both sides cut to the same height).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(ROOT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const sharp = require('sharp');

const BASE = process.env.BASE || 'http://localhost:3038';
const REF_DIR = process.env.REF_DIR || '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference';
const today = new Date().toISOString().slice(0, 10);
const OPEN_EDITOR = "(async()=>{document.querySelector('.p8-composer-in').click();await new Promise(r=>setTimeout(r,500));[...document.querySelectorAll('.p8-modes4 button')].find(b=>b.textContent==='Debate').click();await new Promise(r=>setTimeout(r,400));document.activeElement&&document.activeElement.blur();})()";
const STATES = [
  { state: 'community', path: '/community' },
  { state: 'post-blog', path: '/community/blog/2' },
  { state: 'post-debate', path: `/community/debate/${today}` },
  // No challenge post exists yet (pending store): the thread view stands in for the post template.
  { state: 'post-challenge', path: '/community/thread/1', label: 'thread' },
  { state: 'editor', path: '/community', js: OPEN_EDITOR, viewport: true },
];
const only = process.argv[2];

const browser = await chromium.launch(process.env.UX11_CHROMIUM ? { executablePath: process.env.UX11_CHROMIUM } : {});
for (const s of STATES) {
  if (only && s.state !== only) continue;
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    for (const theme of ['light', 'dark']) {
      const opts = { viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: 1, reducedMotion: 'reduce' };
      if (process.env.STATE && fs.existsSync(process.env.STATE)) opts.storageState = process.env.STATE;
      const ctx = await browser.newContext(opts);
      const page = await ctx.newPage();
      await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
      await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
        const m = route.request().method();
        if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue();
        return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      });
      await page.goto(BASE + s.path, { waitUntil: 'networkidle', timeout: 90_000 });
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await page.waitForTimeout(700);
      if (s.js) { await page.evaluate(s.js); await page.waitForTimeout(600); }
      const impl = await page.screenshot({ fullPage: !s.viewport });
      await ctx.close();
      const refFile = path.join(REF_DIR, `${w}-${theme}-${s.state}.png`);
      if (!fs.existsSync(refFile)) { console.warn('no reference', refFile); continue; }
      const ref = fs.readFileSync(refFile);
      const [mi, mr] = await Promise.all([sharp(impl).metadata(), sharp(ref).metadata()]);
      const cut = Math.min(mi.height, mr.height, w < 500 ? 3000 : 2400);
      const scale = w < 500 ? 0.75 : 0.5;
      const tw = Math.round(w * scale); const th = Math.round(cut * scale); const gap = 16;
      const [a, b] = await Promise.all([
        sharp(impl).extract({ left: 0, top: 0, width: w, height: cut }).resize(tw, th).png().toBuffer(),
        sharp(ref).extract({ left: 0, top: 0, width: w, height: cut }).resize(tw, th).png().toBuffer(),
      ]);
      const out = path.join(here, `${s.state}-${w}-${theme}.webp`);
      await sharp({ create: { width: tw * 2 + gap, height: th, channels: 3, background: theme === 'dark' ? '#000000' : '#d9d6d1' } })
        .composite([{ input: a, left: 0, top: 0 }, { input: b, left: tw + gap, top: 0 }])
        .webp({ quality: 72 }).toFile(out);
      console.log('wrote', path.basename(out), s.label ? `(implementation = ${s.label})` : '');
    }
  }
}
await browser.close();
