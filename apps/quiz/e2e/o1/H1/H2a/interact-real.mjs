// Run O1, lot H2c: the interactions that need the real data, driven in Chromium against the local hub (scripts/o1-tools/dev-up.sh):
//   - the search button follows the Hot now filter (KpopQuiz on All and KpopQuiz, OtakuQuiz on OtakuQuiz);
//   - Surprise me draws from the pool of the page (a quiz of the pool, a link on its own site, never the same site twice in a row);
//   - the blind test card plays the real preview of the first song for ten seconds (audio events counted, no title or cover shown);
//   - the countdown aims at 00:05 UTC and prints the Paris time of the data module.
//   node apps/quiz/e2e/o1/H1/H2a/interact-real.mjs <hubUrl>
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('@playwright/test');

const [base] = process.argv.slice(2);
if (!base) { console.error('usage: interact-real.mjs <hubUrl>'); process.exit(2); }
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const results = [];
const check = (name, ok, detail = '') => { results.push(ok); console.log(ok ? 'ok  ' : 'FAIL', name, detail); };
await page.goto(base, { waitUntil: 'networkidle' });

// 1. search follows the filter
const searchHref = () => page.locator('.hub-h2-head a[aria-label="Search both sites"]').getAttribute('href');
const k0 = await searchHref();
check('search on All', /^https?:\/\/[^/]+\/search$/.test(k0 ?? ''), k0 ?? '');
const chip = (i) => page.locator('.hub-h2-seg .hub-h2-segbtn').nth(i);
await chip(2).click();
const a1 = await searchHref();
check('search on OtakuQuiz differs from KpopQuiz', a1 !== k0 && /\/search$/.test(a1 ?? ''), a1 ?? '');
await chip(1).click();
check('search back on KpopQuiz', (await searchHref()) === k0);
await chip(0).click();
check('search on All is KpopQuiz', (await searchHref()) === k0);

// 2. Surprise me
const sites = [];
for (let i = 0; i < 6; i++) {
  await page.locator('.hub-h2-surprise button, .hub-h2-pick-again').first().click();
  const href = await page.locator('.hub-h2-pick-play').getAttribute('href');
  sites.push(new URL(href).origin);
}
check('Surprise me gives a link on a site each time', sites.every((o) => o && o !== 'null'), sites.join(' '));
check('Surprise me never the same site twice in a row', sites.every((s, i) => i === 0 || s !== sites[i - 1]), sites.join(' '));

// 3. blind test preview
const bt = page.locator('.hub-h2-btbtn');
if (await bt.count()) {
  await page.evaluate(() => {
    window.__audio = [];
    const OrigAudio = window.Audio;
    window.Audio = function (src) {
      const a = new OrigAudio(src);
      window.__audio.push({ src, events: [], el: a });
      for (const ev of ['play', 'playing', 'pause', 'error', 'ended']) a.addEventListener(ev, () => window.__audio[window.__audio.length - 1].events.push(ev));
      return a;
    };
  });
  const before = await page.evaluate(() => window.__audio.length);
  await bt.click();
  await page.waitForTimeout(1500);
  const label1 = await page.locator('.hub-h2-btlabel').textContent();
  const info = await page.evaluate(() => window.__audio.map((a) => ({ src: a.src, events: a.events, t: a.el.currentTime })));
  check('no sound is made before the press', before === 0);
  check('one audio element with the real preview address', info.length === 1 && /^https:\/\//.test(info[0].src ?? ''), info.length ? new URL(info[0].src).host : 'none');
  check('the label counts', /0:0[1-3] \/ 0:10/.test(label1 ?? ''), label1 ?? '');
  console.log('     audio events after 1.5 s:', JSON.stringify(info[0]?.events), 'currentTime', info[0]?.t);
  await page.waitForTimeout(9500);
  const done = await page.locator('.hub-h2-btlabel').textContent();
  const end = await page.evaluate(() => window.__audio.map((a) => ({ events: a.events, paused: a.el.paused })));
  check('after ten seconds the clip is done and paused', /Song 1 done\. 9 to go on/.test(done ?? '') && end[0]?.paused === true, done ?? '');
} else {
  console.log('no blind test card on this page');
}

// 4. countdown
await page.waitForTimeout(500);
const sub = await page.locator('.hub-h2-today-sub').first().textContent();
check('countdown text', /^New picks in \d+ h \d+ min \(\d:05, Paris time\)$/.test(sub ?? ''), sub ?? '');
await browser.close();
process.exit(results.every(Boolean) ? 0 : 1);
