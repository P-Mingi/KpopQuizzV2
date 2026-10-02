// capture-v12.mjs: reference screenshots of the v12 growth prototype.
// Usage (from apps/quiz, where @playwright/test is installed):
//   node ../../docs/design/growth-v12/capture-v12.mjs [outDir] [filter]
// Default outDir: docs/design/growth-v12/checks/reference (PNGs are not committed, regenerate them).
// W3 states are marked w3:true. The rest are W4 states (Name them all, Which member, This or that,
// Fans create, live mode) kept here so W4 uses the same script.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Resolve Playwright from the current directory (apps/quiz), not from this file's folder.
const { chromium } = createRequire(pathToFileURL(process.cwd() + '/').href)('@playwright/test');
const here = dirname(fileURLToPath(import.meta.url));
const proto = pathToFileURL(resolve(here, 'prototype.html')).href;
const out = resolve(process.argv[2] || resolve(here, 'checks/reference'));
const only = process.argv[3] || '';
mkdirSync(out, { recursive: true });

// [name, js to run, element to scroll to (optional), wait ms (optional), w3]
export const STATES = [
  ['bthub-playlists', "go('blindtest')", '#bt-th', 350, true],
  ['bthub-live-band', "go('blindtest')", '.liveband', 350, false],
  ['land-en', "LANDL='en';go('btland');setLand('en')", null, 350, true],
  ['land-en-steps', "setLand('en')", '#ld-steps', 350, true],
  ['land-en-faq', "setLand('en')", '#ld-faq', 350, true],
  ['land-fr', "setLand('fr')", null, 350, true],
  ['land-es', "setLand('es')", null, 350, true],
  ['land-id', "setLand('id')", null, 350, true],
  ['theme-hits26', "openTheme('hits26')", null, 350, true],
  ['theme-hits25', "openTheme('hits25')", null, 350, true],
  ['theme-gen5', "openTheme('gen5')", null, 350, true],
  ['theme-viral', "openTheme('viral')", null, 350, true],
  ['theme-kpdh', "openTheme('kpdh')", null, 350, true],
  ['theme-kpdh-tracks', "openTheme('kpdh')", '#tp-tracks', 350, true],
  ['kpdh-intro', "openPers('kpdh')", null, 350, true],
  ['kpdh-question', "persNext()", null, 350, true],
  ['kpdh-result', "persPick(0);persPick(0);persPick(3);persPick(0);persPick(0);persPick(0)", null, 1300, true],
  ['wma-question', "openPers('wma');persNext();persPick(2)", null, 400, false],
  ['wma-result', "for(let i=0;i<7;i++){persPick(0)}", null, 1500, false],
  ['nta-intro', "openNta('Stray Kids')", null, 350, false],
  ['nta-play', "ntStart();$('nt-in').value='hyunjin';ntSubmit();$('nt-in').value='felix';ntSubmit()", null, 1200, false],
  ['nta-result', "ntEnd(true)", null, 350, false],
  ['quiz-bonus', "startQuiz();for(let i=G_.i;i<8;i++){G_.ans=null;answer(QZ[G_.i].c);if(G_.i<7){G_.i++;renderQ();}} endQuiz()", '#e-tot', 500, false],
  ['quiz-bonus-voted', "totVote(0)", '#e-tot', 800, false],
  ['hub-ways-to-play', "openG('Stray Kids')", '#hb-modes', 350, false],
  ['hub-fans-picked', "openG('Stray Kids')", '#hb-fp', 350, false],
  ['hub-empty-riize', "openG('RIIZE')", '#hb-first', 350, false],
  ['hub-thin-katseye', "openG('KATSEYE')", '#hb-first', 350, false],
  ['share-kit', "closeAll();openKit()", null, 500, false],
  ['creators', "closeAll();go('creators')", null, 350, false],
  ['live-setup', "go('livegame');lvSet('setup')", null, 350, false],
  ['live-lobby', "lvOpen()", null, 3000, false],
  ['live-join', "lvJoin()", null, 350, false],
  ['live-round', "lvStart()", null, 2500, false],
  ['live-answer', "lvAnswer(LV.kind==='bt'?BTQ[0].c:0)", null, 300, false],
  ['live-reveal', "lvReveal()", null, 350, false],
  ['live-board', "lvSet('board')", null, 350, false],
  ['live-end', "LV.r=LV.rounds-1;lvSet('end')", null, 350, false],
  ['community-team-post', "closeAll();go('community')", '#feed .post:nth-child(2)', 350, false],
  ['post-team', "openPost('team')", null, 350, false],
];

// Landmarks whose computed style the pixel checker compares with the implementation (map them to data-ux ids).
export const LANDMARKS = ['.landhero', '.landhero h1', '.langsw', '.thrail .thm', '.steps3', '.plhero', '.tracks .tr',
  '.bridge', '.pintro', '.pq', '.popt', '.rescard', '.traits', '.dist', '.biasoffer', '.nta', '.nring', '.ntagrid .slot',
  '.ntares', '.tot', '.toto', '.totf', '.fp .fr', '.fcreate', '.tpl', '.nudge', '.gtile', '.kit .story', '.kitsec',
  '.cbgrid', '.rising', '.tiers3', '.liveband', '.screen', '.lobby', '.qrbox', '.players', '.ltiles .lt', '.reveal2',
  '.board', '.podium2', '.phone', '.pbtns .pb', '.teamtag', '.ava.team', '.teamnote', '.btn-primary', '.sec-h h2'];
const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'];

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const styles = {};
for (const [w, h, tag] of [[1440, 900, 'd'], [390, 844, 'm']]) {
  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: theme, isMobile: w < 500, hasTouch: w < 500 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(proto);
    await page.waitForTimeout(500);
    const v = await page.evaluate(() => window.UX_VERSION);
    if (!String(v).startsWith('v12.2')) throw new Error(`prototype.html is ${v}, expected v12.2`);
    await page.addStyleTag({ content: '.notes-t,.tour-t,.guestbar,.notes,.dnote{display:none!important}' });
    const t = tag + (theme === 'dark' ? 'k' : '');
    for (const [name, js, sel, wait] of STATES) {
      if (only && !name.includes(only)) continue;
      await page.evaluate(js);
      await page.waitForTimeout(wait || 350);
      await page.evaluate((s) => {
        const e = s && document.querySelector(s);
        if (e) { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); } else window.scrollTo(0, 0);
      }, sel);
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${out}/${t}-${name}.png` });
      styles[`${t}-${name}`] = await page.evaluate(({ L, P }) => {
        const o = {};
        for (const sel of L) {
          const el = document.querySelector('.view.on ' + sel) || document.querySelector('.sheet.on ' + sel) || document.querySelector(sel);
          if (!el || !el.offsetParent) continue;
          const cs = getComputedStyle(el);
          o[sel] = Object.fromEntries(P.map((p) => [p, cs.getPropertyValue(p)]));
        }
        return o;
      }, { L: LANDMARKS, P: PROPS });
    }
    if (errors.length) console.error(t, errors);
    await ctx.close();
  }
}
await browser.close();
if (!only) writeFileSync(`${out}/styles.json`, JSON.stringify(styles, null, 1));
console.log('done', out);
