#!/usr/bin/env node
// P8 extra reference: computed styles of the community elements of the pinned
// prototype (docs/design/ux-dashboard-v1/prototype.html), for the landmarks that
// v11/checks/reference/styles.json does not capture (it only has .post,
// .rail>section, .utabs button.on and .sec-h h2 for these views). Same states and
// widths as v11/capture-prototype.mjs. Read only.
//
//   UX11_CHROMIUM=... node docs/design/ux-dashboard-v1/v11/reports/P8/capture-proto-styles.mjs
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
  community: "go('community')",
  'post-challenge': "openPost('challenge')",
  'post-blog': "openPost('blog')",
  'post-debate': "openPost('debate')",
  editor: "go('community');openEditor('debate')",
};
const POST = ['#pv .crumb', '#pv .crumb a', '#pv .ph2', '#pv .ph2 .lv', '#pv .ph2 .btn-ghost', '.post-t', '.post-b', '.post-b p', '#pv .pacts', '#pv .pa2',
  '#postview .sec > .h2', '.cform', '.cform textarea', '.cform .ava', '.cmt', '.cmt .h', '.cmt .h > span:not(.bias)', '.cmt p', '.cmt .ca', '.cmt .lk',
  '.cmt.nest', '#postview .btn-quiet', '#postview .sec-h h2', '#postview .sec-h .lnk', '#postview .row', '#postview .row .rt', '#postview .row .rs', '#postview .row .gav'];
export const SELECTORS = {
  community: [
    '#community .ph h1', '#community .ph p', '.composer', '.composer .inp', '.composer .btn', '.composer .ava', '.fctl', '.fctl .dd',
    '#feed .post', '.post .ph2', '.post .ph2 .ava', '.post .ph2 .lv', '.post .ptype', '.post .ptt', '.post .pbd', '.post .pacts', '.post .pa2',
    '.post .chsc', '.post .reps span', '.dopts', '.dopt', '.dopt.win', '.dopt.win i', '.dopt:not(.win) i', '.post .help', '.bwrap', '.bcov',
    '.rail', '.rail>section', '.rail h3', '.rail h3 small', '.rail .dq', '.rail .vote', '.rail .vote button', '.rail .pl3', '.rail .pl3 b', '.rail .hn', '.rail .hn .ava',
    '.rail .hn .tm', '.rail .hn .medal', '#community .btn-ghost:not(.composer .btn)',
    '.warstrip', '.warstrip .grow', '.mdebate .mine', '.mine .plabel', '.mine .dq', '.mine .vote button', '.mrail', '.mrail h3', '.mrail .hn', '.mrail .cheer',
  ],
  'post-challenge': [...POST, '.nextq', '.nextq .thumb', '.nextq .rt', '.nextq .rs', '.nextq .go'],
  'post-blog': [...POST, '.post-cover'],
  'post-debate': [...POST, '#pv .vote', '#pv .vote button', '#pv .help'],
  editor: ['#editor', '#editor .sh-h', '#editor .sh-h h3', '#editor .sh-b', '#edmodes', '#edmodes button.on', '#edmodes button:not(.on)', '#ed-help',
    '#editor .field', '#editor .field > label', '#editor .flabel', '#editor .flabel small', '#editor .field > .inp', '#editor .gchip', '#editor .gchip .gav',
    '#ed-q', '#editor [data-mode="debate"] input.inp[placeholder="Option 1"]', '#editor .lnk', '#editor [data-mode="debate"] .seg', '#editor [data-mode="debate"] .seg button.on',
    '#editor > div:last-child', '#editor .btn-ghost', '#editor .btn-primary'],
};
const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap', 'opacity'];

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
          let found = [];
          try { found = [...document.querySelectorAll('.view.on ' + s), ...document.querySelectorAll(s)]; } catch { found = []; }
          const el = found.find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
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
