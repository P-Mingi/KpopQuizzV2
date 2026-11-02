// Run O1, lot P5 (CR-025): the screenshots of the links between the sites and the daily games, with every flag on, against the local stand-in (e2e/o1/P2/run-preview.sh p5).
// SITE=hub: the result of Kpopdle with the quiz and the blind test of the group, EN and FR. SITE=kpop: the home module (link 1), the Kpopdle card of a group page (3) and the end of a K-pop quiz (2).
// SITE=anime: the home module (10), the cards of the One Piece and Dragon Ball series pages (11, 12) and the end of an anime quiz (13). Desktop and mobile. kpopquiz.org and OtakuQuiz are in English only.
//   cd apps/quiz && SITE=kpop BASE=http://localhost:3041 API=http://127.0.0.1:54399 OUT=../../docs/proofs/passerelles node e2e/o1/P5/capture.run.mjs
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const SITE = process.env.SITE ?? 'hub';
const BASE = process.env.BASE ?? 'http://localhost:3040';
const API = process.env.API ?? 'http://127.0.0.1:54399';
const OUT = path.resolve(process.env.OUT ?? '../../docs/proofs/passerelles');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const HIDE = 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important }';

const target = async (game) => (await fetch(`${API}/__target?game=${game}`)).json();
const poolNames = async (game) => new Set((await (await fetch(`${API}/rest/v1/rpc/dle_pool`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ p_game: game }) })).json()).entities.map((e) => e.name));

async function open(context, url, wait) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE });
  if (wait) await page.waitForSelector(wait, { timeout: 30000 });
  await page.waitForTimeout(800);
  return page;
}

async function shot(page, file, opts = {}) {
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(OUT, file), fullPage: !opts.clip, ...(opts.clip ? { clip: opts.clip } : {}) });
  console.log('saved', file);
}

/** A picture of one element with some air around it, at the scroll position of the page. */
async function shotEl(page, selector, file, pad = 24) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const box = await el.boundingBox();
  const vp = page.viewportSize();
  const x = Math.max(0, box.x - pad);
  const y = Math.max(0, box.y - pad);
  await page.screenshot({ path: path.join(OUT, file), clip: { x, y, width: Math.min(vp.width - x, box.width + 2 * pad), height: box.height + 2 * pad } });
  console.log('saved', file);
}

/** The links of a page that go to another site of the network, for the log of the run (the proof that the links are in the served page). */
async function netLinks(page) {
  return page.$$eval('a[href^="https://bunnyverse.org/"], a[href^="https://kpopquiz.org/"]', (as) => as.map((a) => a.getAttribute('href')));
}

async function guess(page, name, count) {
  await page.fill('#dle-guess', name);
  await page.waitForSelector('#dle-sugg [role=option]');
  await page.keyboard.press('Enter');
  await page.waitForFunction((n) => document.querySelectorAll('table.hub-dle-grid tbody tr').length === n, count, { timeout: 20000 });
  await page.waitForTimeout(250);
}

async function playQuiz(page) {
  page.on('response', (r) => { if (r.url().includes('/api/quiz/')) console.log('api', r.status(), r.url().replace(/^https?:\/\/[^/]+/, '')); });
  await page.getByRole('button', { name: /Start quiz/ }).first().click();
  await page.waitForTimeout(3000);
  if (process.env.P5_DEBUG) { await page.screenshot({ path: '/tmp/p5-debug.png' }); console.log((await page.locator('body').innerText()).slice(0, 600)); }
  for (let i = 0; i < 5; i += 1) {
    await page.waitForSelector('.p4-ans:not([disabled])', { timeout: 20000 });
    await page.locator('.p4-ans').first().click();
    await page.waitForTimeout(900);
    const next = page.getByRole('button', { name: /Next question|See your result/ });
    if (await next.count()) await next.first().click().catch(() => {});
    await page.waitForTimeout(400);
  }
  await page.waitForSelector('.p4-keep', { timeout: 45000 });
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch(process.env.O1_CHROMIUM ? { executablePath: process.env.O1_CHROMIUM } : {});
try {
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    if (SITE === 'hub') {
      for (const locale of ['en', 'fr']) {
        const context = await browser.newContext({ ...opts, locale: locale === 'fr' ? 'fr-FR' : 'en-US' });
        const page = await open(context, `${BASE}${locale === 'fr' ? '/fr' : ''}/kpopdle`, '#dle-guess:not([disabled])');
        const t = (await target('kpopdle-idol')).name;
        const names = await poolNames('kpopdle-idol');
        const wrong = [...names].find((n) => n !== t);
        await guess(page, wrong, 1);
        await guess(page, t, 2);
        await page.waitForSelector('#dle-win');
        await page.waitForTimeout(800);
        console.log(`hub ${locale} ${vp} result links:`, JSON.stringify(await netLinks(page)));
        await shot(page, `hub-${locale}-${vp}-kpopdle-result.png`);
        await shotEl(page, '.hub-dle-after', `hub-${locale}-${vp}-kpopdle-result-links.png`);
        await context.close();
      }
    }
    if (SITE === 'kpop') {
      const context = await browser.newContext({ ...opts, locale: 'en-US' });
      const home = await open(context, `${BASE}/`, '#p1-kd-h');
      console.log(`kpop ${vp} home links:`, JSON.stringify(await netLinks(home)));
      await shotEl(home, '#p1-kd-h >> xpath=ancestor::section', `kpop-en-${vp}-home-module.png`);
      await home.close();
      const group = await open(context, `${BASE}/twice-quiz`, '#p5-kg-h');
      console.log(`kpop ${vp} group links:`, JSON.stringify(await netLinks(group)));
      await shot(group, `kpop-en-${vp}-group-page.png`);
      await shotEl(group, '#p5-kg-h >> xpath=ancestor::section', `kpop-en-${vp}-group-card.png`);
      await group.close();
      const quiz = await open(context, `${BASE}/q/twice-quiz-1`, null);
      await playQuiz(quiz);
      console.log(`kpop ${vp} quiz end links:`, JSON.stringify(await netLinks(quiz)));
      await shot(quiz, `kpop-en-${vp}-quiz-end.png`);
      await shotEl(quiz, '.p4-keep', `kpop-en-${vp}-quiz-end-keep-playing.png`);
      await context.close();
    }
    if (SITE === 'anime') {
      const context = await browser.newContext({ ...opts, locale: 'en-US' });
      const home = await open(context, `${BASE}`, '#p5-ad-h');
      console.log(`anime ${vp} home links:`, JSON.stringify(await netLinks(home)));
      await shot(home, `anime-en-${vp}-home.png`);
      await shotEl(home, '#p5-ad-h >> xpath=ancestor::section', `anime-en-${vp}-home-module.png`);
      await home.close();
      for (const series of ['one-piece', 'dragon-ball']) {
        const page = await open(context, `${BASE}/${series}-quiz`, '.p5-sd');
        console.log(`anime ${vp} ${series} links:`, JSON.stringify(await netLinks(page)));
        await shot(page, `anime-en-${vp}-${series}-series-page.png`);
        await shotEl(page, '.p5-sd', `anime-en-${vp}-${series}-series-card.png`);
        await page.close();
      }
      const quiz = await open(context, `${BASE}/q/one-piece-quiz-1`, null);
      await playQuiz(quiz);
      console.log(`anime ${vp} quiz end links:`, JSON.stringify(await netLinks(quiz)));
      await shot(quiz, `anime-en-${vp}-quiz-end.png`);
      await shotEl(quiz, '.p4-keep', `anime-en-${vp}-quiz-end-keep-playing.png`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
