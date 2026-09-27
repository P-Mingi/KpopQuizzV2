#!/usr/bin/env node
// P5 extra reference: boxes and computed styles of the create funnel elements of the
// pinned prototype (docs/design/ux-dashboard-v1/prototype.html), for the landmarks
// that v11/checks/reference/styles.json does not capture (it only has .nav and
// .qcard for create-1/2/3 and signin). Same states, widths and themes as
// v11/capture-prototype.mjs. Read only.
//
//   UX11_CHROMIUM=... node docs/design/ux-dashboard-v1/v11/reports/P5/capture-proto-create.mjs
//
// Writes proto-create.json next to this file:
//   { "<w>-<theme>-<state>": { "<selector>": { box: [x, y, w, h], ...props } } }
// (x / y are document coordinates, so a page's layout can be compared edge by edge).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(ROOT, 'apps/quiz/package.json'));
const { chromium } = require('@playwright/test');
const PROTO = path.join(ROOT, 'docs/design/ux-dashboard-v1/prototype.html');

export const STATES = {
  'create-1': "go('create');setStep(1)",
  'create-2': "go('create');setStep(2)",
  'create-3': "go('create');setStep(3)",
  signin: "go('create');setStep(3);document.body.classList.add('guest');nextStep()",
};
const HEAD = ['#create .ph', '#create .ph h1', '#create .ph p', '#cstep', '#cstep .st', '#cstep .st .c', '#cstep .st.on', '#cstep .st.on .c', '#cstep .st.done .c', '#cstep .stl',
  '#cbar', '#cbar .cbar-in', '#cstt', '#cstt b', '#cstt .dotok', '#cback', '#cnext'];
export const SELECTORS = {
  'create-1': [...HEAD, '#cp-1 .field', '#cp-1 .field > label', '#cp-1 .field > label small', '#c-title', '#c-about', '#cp-1 .help',
    '#cp-1 .flabel', '#types', '#types .opt', '#types .opt.on', '#types .opt:not(.on)', '#types .opt .rd', '#types .opt.on .rd', '#types .opt .ico', '#types .opt b', '#types .opt small', '#types .opt .ex',
    '#cp-1 .inp.focus', '#cp-1 .gchip', '#cp-1 .gchip .gav', '#cp-1 .inp.focus .muted', '#cp-1 .seg', '#cp-1 .seg button.on', '#cp-1 .seg button:not(.on)',
    '#cp-1 .field:nth-child(6)', '#cp-1 .field:nth-child(6) .inp', '#cp-1 .field:nth-child(7)', '.covgrid', '.covgrid .qcov', '.covgrid .drop', '.covgrid .check', '.covgrid .check i'],
  'create-2': [...HEAD, '#cp-2 .field', '#cp-2 .flabel', '#cp-2 .flabel small', '#qlist', '#qlist .qitem', '#qlist .qitem.open', '#qlist .qitem:nth-child(4)', '.qhead', '.qhead .n', '.qhead .q', '.qhead .q.w', '.qhead .st2.ok', '.qhead .st2.w', '.qhead .acts',
    '.qbody', '.qbody .field', '.qbody .field > label', '.qbody .flabel', '.qbody .flabel small', '.qbody .inp', '.arow', '.arow .rd', '.arow.on .rd', '.arow.on .inp', '.arow:not(.on) .inp', '.qbody .lnk',
    '#cp-2 .btn-ghost', '#cp-2 .btn-quiet'],
  'create-3': [...HEAD, '#cp-3 .field', '#cp-3 .flabel', '.pubgrid', '#pubcard', '#pubcard .qcard', '#pubcard .qcov', '#pubcard .qb', '#pubcard .qg', '#pubcard .qt', '#pubcard .qf',
    '.pubgrid .rows', '.pubgrid .row', '.pubgrid .row .ico', '.pubgrid .row .grow', '.pubgrid .row .end', '#cp-3 .help'],
  signin: ['#signin', '#signin .sh-h', '#signin .sh-h h3', '#signin .sh-h .ib', '#signin .sh-b', '#si-p', '#signin .authb', '#signin .authb .lg', '#signin .or', '#si-e', '#signin form .btn', '#signin .help', '#scrim'],
};
const PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap', 'opacity', 'position', 'bottom'];

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
      await page.waitForTimeout(700);
      out[`${w}-${theme}-${id}`] = await page.evaluate(({ sels, P }) => {
        const o = {};
        for (const s of sels) {
          const el = [...document.querySelectorAll('.view.on ' + s), ...document.querySelectorAll(s)].find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
          if (!el) continue;
          const cs = getComputedStyle(el);
          const r = el.getBoundingClientRect();
          o[s] = { box: [r.x + scrollX, r.y + scrollY, r.width, r.height].map((v) => Math.round(v * 100) / 100), ...Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p).replace(/url\("data:[^)]*"\)/g, 'url(data)')])) };
        }
        o.__doc = { scrollHeight: document.documentElement.scrollHeight };
        return o;
      }, { sels: SELECTORS[id], P: PROPS });
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(here, 'proto-create.json'), JSON.stringify(out, null, 1) + '\n');
console.log('captured', Object.keys(out).length, 'state x width x theme sets');
