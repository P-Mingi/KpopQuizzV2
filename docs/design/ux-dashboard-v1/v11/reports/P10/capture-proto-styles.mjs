#!/usr/bin/env node
// P10 extra reference: computed styles of the passport and settings elements of
// the pinned prototype (docs/design/ux-dashboard-v1/prototype.html), for the
// landmarks that v11/checks/reference/styles.json does not capture (it only has
// .pband, .medal2, .utabs button.on, .sec-h h2 and .personprev for these views).
// Same states and widths as v11/capture-prototype.mjs. Read only.
//
//   UX11_CHROMIUM=... node docs/design/ux-dashboard-v1/v11/reports/P10/capture-proto-styles.mjs
//
// Writes proto-styles.json next to this file: { "<w>-<theme>-<state>": { "<selector>": { prop: value } } }.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(ROOT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const PROTO = path.join(ROOT, 'docs/design/ux-dashboard-v1/prototype.html');

const STATES = {
  passport: "go('you')",
  'passport-badges': "go('you');ptab('badges')",
  settings: "go('settings')",
  'header-sheet': "go('you');openHeader()",
};
export const SELECTORS = {
  passport: [
    '.pband', '.pband .hbtn', '.phead', '.pav', '.phead .btn-ghost', '.phead .ib', '.pid', '.pidrow', '#p-name', '#p-bias', '#p-pinb',
    '.pidrow .lvl', '.pmeta', '.xpw', '.xpw .bar', '#xpbar', '.xpw small', '.statsin', '.statsin > div', '.statsin b', '.statsin span',
    '#ptabs', '#ptabs button.on', '#ptabs button:not(.on)', '.warstrip', '.warstrip .grow', '.warstrip .lnk',
    '#pp-overview .sec', '#pp-overview .sec-h h2', '#pp-overview .sec-h h2 .si', '.b-all', '#pinmed', '.medal2', '.medal2 b', '.medal2 .rar', '.medal2 small',
    '#pp-overview .sec.two', '#pp-overview .two .row', '#pp-overview .two .gav', '#pp-overview .two .rt', '#pp-overview .two .bar', '#pp-overview .two .bar i',
    '#pp-overview .two .end', '#pp-overview .two .thumb', '#pp-overview .two .rs',
  ],
  'passport-badges': ['#pp-badges .sec', '#pp-badges .sec-h h2', '.b-earned', '.rarkey', '.rarkey span', '.rarkey i', '#allmed', '#pp-badges .medal2:not(.on) b'],
  settings: [
    '#settings .ph h1', '#settings .ph p', '#settings .sec', '#settings .sec .h2', '#settings .sec > div:nth-child(2)', '#settings .btn-ghost.sm',
    '#settings .field', '#settings .field > label', '#settings .field > label small', '#settings .inp', '#settings textarea.inp', '#settings .help',
    '#settings #look .help', '#settings .personprev', '#pp-name', '#pp-bias', '#settings .personprev .muted', '#settings .flabel', '#settings .flabel small',
    '#settings .flair-row', '#f-accent .fopt', '#f-accent .fopt.on', '#f-accent .fopt i', '#settings .urlrow', '#f-bias-c', '#settings .urlrow .btn',
    '#f-theme', '#f-theme .sw', '#look .flair-row .btn-ghost', '#look .flair-row .btn-quiet', '#f-pin .fopt', '#f-pin .fopt .bmed',
    '#settings .rows', '#settings .srow2', '#settings .srow2 b', '#settings .srow2 small', '#settings .tgl', '#settings .tgl.off',
    '#apseg', '#apseg button.on', '#apseg button:not(.on)', '#settings .srow2 .btn', '#settings .gchip', '#settings .gchip .gav', '#settings .chips .chip',
  ],
  'header-sheet': ['#hsheet', '#hsheet .sh-b', '#hsheet .drop', '#hsheet .or', '#hsheet .urlrow', '#hsheet .inp', '#hsheet .urlrow .btn', '#hsheet .help', '#hsheet .btn-quiet'],
};
const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap', 'opacity', 'filter'];

const browser = await chromium.launch(process.env.UX11_CHROMIUM ? { executablePath: process.env.UX11_CHROMIUM } : {});
const out = {};
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500 });
    const page = await ctx.newPage();
    await page.goto('file://' + PROTO);
    await page.waitForTimeout(400);
    await page.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
    for (const [id, js] of Object.entries(STATES)) {
      await page.evaluate((code) => { document.body.classList.remove('guest'); closeAll(); eval(code); }, js);
      await page.waitForTimeout(600);
      out[`${w}-${theme}-${id}`] = await page.evaluate(({ sels, P }) => {
        const o = {};
        for (const s of sels) {
          const el = [...document.querySelectorAll('.view.on ' + s), ...document.querySelectorAll(s)].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
          if (!el) continue;
          const cs = getComputedStyle(el);
          o[s] = Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p).replace(/url\("data:[^)]*"\)/g, 'url(data)')]));
        }
        return o;
      }, { sels: SELECTORS[id], P: PROPS });
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(here, 'proto-styles.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote', Object.keys(out).length, 'states');
