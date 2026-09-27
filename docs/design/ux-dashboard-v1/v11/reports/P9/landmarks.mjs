#!/usr/bin/env node
// P9 landmark boxes: the pinned prototype (`go('leaderboard')`, signed in) vs the implementation (guest, and
// signed in with a main fandom through a standing fixture), at 1440 x 900 and 390 x 844, light theme. Prints a
// markdown table: x, y, width, height of each landmark and the largest difference. Read only.
//
//   UX11_CHROMIUM=... node landmarks.mjs http://localhost:4393

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const APP = path.join(ROOT, 'apps/quiz');
const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('@playwright/test');
const PROTO = path.join(ROOT, 'docs/design/ux-dashboard-v1/prototype.html');
const AUTH = path.join(APP, 'e2e/.auth/test-user.json');
const base = process.argv[2] || 'http://localhost:4393';

const STANDING = {
  signedIn: true,
  me: { username: 'mingi', href: '/u/mingi', avatar: { src: null, bg: null, fg: null }, accent: 'pink', font: null, bias: 'Han' },
  war: { slug: 'stray-kids', href: '/stray-kids-quiz', fandom: 'STAY', group: 'Stray Kids', rank: 2, points: 1240 },
  player: { rank: 212, xp: 640, line: 'Lv 7 · STAY' },
  creator: { rank: 38, quizzes: 3, plays: 312 },
};

// [label, prototype selector, implementation selector]
const MARKS = [
  ['H1', '#leaderboard .ph h1', '.ux-ph h1'],
  ['intro', '#leaderboard .ph p', '.ux-ph p'],
  ['tabs', '#leaderboard .utabs', '.p9-tabs'],
  ['selected tab', '#leaderboard .utabs button.on', '.p9-tabs [aria-selected="true"]'],
  ['podium', '.pane.on .podium', '.p9-pane:not([hidden]) .p9-podium'],
  ['podium #1', '.pane.on .pod.first', '.p9-pane:not([hidden]) .p9-pod[data-rank="1"]'],
  ['podium #1 photo', '.pane.on .pod.first .pav', '.p9-pane:not([hidden]) .p9-pod[data-rank="1"] .p9-pav'],
  ['podium #2 photo', '.pane.on .pod:first-child .pav', '.p9-pane:not([hidden]) .p9-pod[data-rank="2"] .p9-pav'],
  ['podium #1 points', '.pane.on .pod.first .pts', '.p9-pane:not([hidden]) .p9-pod[data-rank="1"] .p9-pts'],
  ['rows', '.pane.on .rows', '.p9-pane:not([hidden]) .p9-rows-top'],
  ['row 4', '.pane.on .lrow:nth-child(1)', '.p9-pane:not([hidden]) .p9-rows-top > .p9-lrow:nth-child(1)'],
  ['row 10', '.pane.on .lrow:nth-child(7)', '.p9-pane:not([hidden]) .p9-rows-top > .p9-lrow:nth-child(7)'],
  ['pinned row', '.pane.on .pin[data-auth="in"]', '.p9-pane:not([hidden]) .ux-pin'],
  ['How points work', '#leaderboard section.sec', '.p9-how'],
  ['first rule', '#leaderboard section.sec details', '.p9-how details'],
];

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function boxes(page, sels) {
  return page.evaluate((ss) => ss.map((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return [b.x, b.y + scrollY, b.width, b.height].map((v) => Math.round(v * 10) / 10);
  }), sels);
}

async function proto(w, guest) {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500, colorScheme: 'light' });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(PROTO).href);
  await page.waitForTimeout(400);
  await page.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
  await page.evaluate((g) => { document.body.classList.remove('guest'); window.closeAll(); if (g) document.body.classList.add('guest'); window.go('leaderboard'); }, guest);
  await page.waitForTimeout(700);
  // the guest state shows the prototype's data-auth="out" pin
  const out = await boxes(page, MARKS.map((m) => (guest ? m[1].replace('.pin[data-auth="in"]', '.pin[data-auth="out"]') : m[1])));
  await ctx.close();
  return out;
}

async function impl(w, signedIn) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: w < 500 ? 844 : 900 }, isMobile: w < 500, hasTouch: w < 500, colorScheme: 'light',
    ...(signedIn && fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  });
  const page = await ctx.newPage();
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), (r) => (['GET', 'HEAD', 'OPTIONS'].includes(r.request().method()) ? r.continue() : r.fulfill({ status: 200, body: '{}' })));
  if (signedIn) await page.route((u) => u.pathname === '/api/ux-v1/p9/standing', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STANDING) }));
  await page.goto(`${base}/leaderboard`, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForSelector(signedIn ? '.p9-pane:not([hidden]) .ux-pin.is-you' : '.p9-pane:not([hidden]) .ux-pin', { timeout: 60000 });
  await page.waitForTimeout(500);
  const out = await boxes(page, MARKS.map((m) => m[2]));
  await ctx.close();
  return out;
}

const fmt = (b) => (b ? b.join(' / ') : 'n/a');
const delta = (a, b) => (a && b ? Math.max(...a.map((v, i) => Math.abs(v - b[i]))) : null);

for (const w of [1440, 390]) {
  const [p, pg, g, s] = [await proto(w, false), await proto(w, true), await impl(w, false), await impl(w, true)];
  console.log(`\n### ${w} x ${w < 500 ? 844 : 900}, light (x / y / width / height, px)\n`);
  console.log('| Landmark | Prototype, signed in | Implementation, signed in (fixture) | max diff | Prototype, guest | Implementation, guest | max diff |');
  console.log('|---|---|---|---:|---|---|---:|');
  MARKS.forEach(([label], i) => {
    const ds = delta(p[i], s[i]); const dg = delta(pg[i], g[i]);
    console.log(`| ${label} | ${fmt(p[i])} | ${fmt(s[i])} | ${ds === null ? '-' : ds.toFixed(1)} | ${fmt(pg[i])} | ${fmt(g[i])} | ${dg === null ? '-' : dg.toFixed(1)} |`);
  });
}
await browser.close();
