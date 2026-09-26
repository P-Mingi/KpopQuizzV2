#!/usr/bin/env node
// P5 report screenshots: before (flag-off /create) | after (flag-on /create) |
// prototype (v11/checks/reference PNG), one WebP per state x width x theme.
//
//   UX11_CHROMIUM=... node docs/design/ux-dashboard-v1/v11/reports/P5/make-shots.mjs \
//     --after http://localhost:3035 [--before http://localhost:3045] [--out <dir>] [--only create-1,signin]
//
// The page gets the prototype's sample as a localStorage draft (sample-draft.mjs);
// every mutating request is answered locally (nothing is saved anywhere). Guest.
// References are read from the MAIN checkout (the PNGs are local only, see RUN-STATE).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { draftInit } from './sample-draft.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(ROOT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
const REF = '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const AFTER = opt('--after', 'http://localhost:3035');
const BEFORE = opt('--before', null);
const OUT = opt('--out', here);
const ONLY = opt('--only', null)?.split(',') ?? null;
const RAW = opt('--raw', null); // also keep the raw implementation PNGs here

const STATES = ['create-1', 'create-2', 'create-3', 'signin'];
const STEP = { 'create-1': 1, 'create-2': 2, 'create-3': 3, signin: 3 };

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function shoot(base, state, width, theme, v11) {
  const phone = width < 500;
  const ctx = await browser.newContext({ viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const init = draftInit(STEP[state]);
  await ctx.addInitScript(({ t, d, s }) => {
    try { localStorage.setItem('theme', t); localStorage.setItem('kq_create_draft_v1', d); localStorage.setItem('kq_create_step_v1', s); } catch { /* blocked */ }
  }, { t: theme, d: init.draft, s: init.step });
  const page = await ctx.newPage();
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    const m = route.request().method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto(`${base}/create`, { waitUntil: 'networkidle', timeout: 120_000 });
  if (v11) {
    await page.waitForSelector(`.p5-pane[data-step="${STEP[state]}"]`, { timeout: 60_000 });
    if (state === 'create-2') { await page.click('#p5-qt-1'); }
    if (state === 'signin') { await page.click('.p5-next'); await page.waitForSelector('.ux-sheet', { timeout: 20_000 }); }
  }
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.mouse.move(0, 0);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  const buf = await page.screenshot({ fullPage: state !== 'signin', animations: 'disabled' });
  await ctx.close();
  return buf;
}

async function label(buf, text) {
  const img = sharp(buf);
  const { width } = await img.metadata();
  const bar = Buffer.from(`<svg width="${width}" height="36"><rect width="100%" height="100%" fill="#1F1B17"/><text x="12" y="24" font-family="Helvetica" font-size="16" fill="#fff">${text}</text></svg>`);
  const meta = await img.metadata();
  return sharp({ create: { width, height: meta.height + 36, channels: 3, background: '#fff' } })
    .composite([{ input: bar, top: 0, left: 0 }, { input: buf, top: 36, left: 0 }]).png().toBuffer();
}

async function sideBySide(parts, file) {
  const metas = await Promise.all(parts.map((b) => sharp(b).metadata()));
  const gap = 24;
  const W = metas.reduce((s, m) => s + m.width, 0) + gap * (parts.length - 1);
  const H = Math.max(...metas.map((m) => m.height));
  let x = 0;
  const comps = parts.map((b, i) => { const c = { input: b, top: 0, left: x }; x += metas[i].width + gap; return c; });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#9A948B' } }).composite(comps).webp({ quality: 80 }).toFile(file);
}

fs.mkdirSync(OUT, { recursive: true });
for (const state of STATES) {
  if (ONLY && !ONLY.includes(state)) continue;
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      const parts = [];
      if (BEFORE) parts.push(await label(await shoot(BEFORE, state, width, theme, false), `before (flag off) ${width} ${theme}`));
      const after = await shoot(AFTER, state, width, theme, true);
      if (RAW) { fs.mkdirSync(RAW, { recursive: true }); fs.writeFileSync(path.join(RAW, `${width}-${theme}-${state}.png`), after); }
      parts.push(await label(after, `after (flag on) ${state} ${width} ${theme}`));
      const ref = path.join(REF, `${width}-${theme}-${state}.png`);
      if (fs.existsSync(ref)) parts.push(await label(fs.readFileSync(ref), `prototype ${state}`));
      const file = path.join(OUT, `${BEFORE ? 'before-after-prototype' : 'after-prototype'}-${state}-${width}-${theme}.webp`);
      await sideBySide(parts, file);
      console.log('wrote', path.relative(ROOT, file));
    }
  }
}
await browser.close();
