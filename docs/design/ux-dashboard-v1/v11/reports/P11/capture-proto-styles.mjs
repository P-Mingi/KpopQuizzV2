#!/usr/bin/env node
// P11 extra reference: computed styles AND boxes of the notifications page, the
// bell panel and the search overlay of the pinned prototype
// (docs/design/ux-dashboard-v1/prototype.html). v11/checks/reference/styles.json
// only captures `.nav` (and the home landmarks under the overlays) for these
// states, so the P11 spec compares against this file. Read only.
//
//   UX11_CHROMIUM=... node docs/design/ux-dashboard-v1/v11/reports/P11/capture-proto-styles.mjs
//
// Writes proto-styles.json next to this file:
//   { "<w>-<theme>-<state>": { "<selector>": { prop: value, ..., "_box": [x, y, w, h] } } }
// States: the three reference states of v11/capture-prototype.mjs (notifications
// in the "streak saved" variant, as the reference PNG shows it, because the
// capture plays a quiz before), plus the variants the reference does not show:
// notifications with the streak at risk, the search overlay with a query that
// matches every section, and with a query that matches nothing.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(ROOT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const PROTO = path.join(ROOT, 'docs/design/ux-dashboard-v1/prototype.html');

// The quiz run of capture-prototype.mjs "end": it calls streakSaved().
const PLAY_A_QUIZ = "startQuiz();for(let i=0;i<8;i++){G_.ans=null;answer(QZ[G_.i].c);if(G_.i<7){G_.i++;renderQ();}}endQuiz()";
const STATES = {
  'notifications-risk': "go('notifs')",
  notifications: `${PLAY_A_QUIZ};go('notifs')`,
  bell: "go('home');pop('bellpop')",
  search: "go('home');openSearch()",
  'search-bts': "go('home');openSearch();$('sq').value='bts';searchFilter('bts')",
  'search-none': "go('home');openSearch();$('sq').value='zzzz';searchFilter('zzzz')",
};
const NOTIFS = [
  '#notifs .col', '#notifs .ph', '#notifs .ph h1', '#n-sub', '#notifs .ph .lnk', '#notifs .seg', '#notifs .seg button.on', '#notifs .seg button:not(.on)',
  '#notifs .streakrow', '#notifs .streakrow > .ico', '#notifs .streakrow .grow', '#notifs .streakrow b', '#notifs .streakrow .grow .muted', '#notifs .streakrow .btn',
  '#nlist', '.ngroup', '.nrow.u', '.nrow:not(.u)', '.nrow.u .ud', '.nrow:not(.u) .ud', '.nrow .ni', '.nrow .ni .ico', '.nrow .grow',
  '.nrow.u .t', '.nrow:not(.u) .t', '.nrow .b', '.nrow .tm', '#notifs .help', '#notifs .help .lnk',
];
const SELECTORS = {
  'notifications-risk': NOTIFS,
  notifications: NOTIFS,
  bell: [
    '#bellpop', '#bellpop .pop-h', '#bellpop .pop-h b', '#bellpop .pop-h .lnk', '#bellrows', '.brow', '.brow .u:not(.r)', '.brow .u.r',
    '.brow > span:last-child', '.brow .t', '.brow .t b', '.brow .tm', '#bellpop .msep', '#bellpop .mi', '#bellpop .mi .ico',
  ],
  search: ['#sov', '.sov-in', '.sov-in > .ico', '#sq', '.sov-in kbd', '#sres', '.sov-l', '.srow.act', '.srow:not(.act)', '.srow .th', '.srow .th.sq', '.srow > span:not(.th)', '.srow small'],
  'search-bts': ['#sres', '.sov-l', '.srow.act', '.srow:not(.act)', '.srow .th', '.srow .th.sq', '.srow .th.sq[style]', '.srow .th.sq[style] .ico', '.srow > span:not(.th)', '.srow small'],
  'search-none': ['#sres', '#sres .empty', '#sres .empty b'],
};
const PROPS = ['display', 'width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-bottom-width', 'border-bottom-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap',
  'text-align', 'opacity', 'white-space', 'align-items', 'justify-content'];

const browser = await chromium.launch(process.env.UX11_CHROMIUM ? { executablePath: process.env.UX11_CHROMIUM } : {});
const out = {};
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const theme of ['light', 'dark']) {
    for (const [id, js] of Object.entries(STATES)) {
      // A fresh page per state: streakSaved() is one-way (window._ss).
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto('file://' + PROTO);
      await page.waitForTimeout(400);
      await page.addStyleTag({ content: '.notes-t,.guestbar,.notes{display:none!important}' });
      await page.evaluate((code) => { document.body.classList.remove('guest'); closeAll(); eval(code); }, js);
      await page.waitForTimeout(700);
      out[`${w}-${theme}-${id}`] = await page.evaluate(({ sels, P }) => {
        const o = {};
        for (const s of sels) {
          const el = [...document.querySelectorAll('.view.on ' + s), ...document.querySelectorAll(s)]
            .find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
          if (!el) continue;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          o[s] = Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p).replace(/url\("data:[^)]*"\)/g, 'url(data)')]));
          o[s]._box = [r.x, r.y + window.scrollY, r.width, r.height].map((v) => Math.round(v * 10) / 10);
          o[s]._text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
        }
        return o;
      }, { sels: SELECTORS[id], P: PROPS });
      await ctx.close();
    }
  }
}
await browser.close();
fs.writeFileSync(path.join(here, 'proto-styles.json'), JSON.stringify(out, null, 1) + '\n');
console.log('wrote', Object.keys(out).length, 'states');
