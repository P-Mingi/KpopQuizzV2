// Otakudle in two steps (lane OTK-E, owner request of 2026-11-26): the screenshots of a served build against the local stand-in (e2e/o1/L1/otk2-stub.mjs), at 390 and 1440, light and dark:
// a play in step 1, the banner, step 2 with guesses and the result. English; one French pass at 1440 light.
//   BASE=http://localhost:3090 OUT=../../docs/o1/reports/L1/otk2 node e2e/o1/L1/otk2-capture.mjs
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:3090';
const OUT = path.resolve(process.env.OUT ?? '../../docs/o1/reports/L1/otk2');
mkdirSync(OUT, { recursive: true });
const HIDE = 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important }';
const VIEWPORTS = {
  '390': { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
  '1440': { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

async function guess(page, name) {
  await page.fill('#dle-guess', name);
  await page.waitForSelector('#dle-sugg [role=option]', { timeout: 15000 });
  await page.keyboard.press('Enter');
  await page.waitForFunction((n) => !document.querySelector('#dle-guess')?.value && document.body.innerText.includes(n), name.split(' ')[0], { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(500);
}

async function run(browser, vp, scheme, locale) {
  const context = await browser.newContext({ ...VIEWPORTS[vp], colorScheme: scheme, reducedMotion: 'reduce', locale: locale === 'fr' ? 'fr-FR' : 'en-US' });
  const page = await context.newPage();
  const tag = `${locale}-${vp}-${scheme}`;
  const shot = async (n, name) => { await page.waitForTimeout(400); await page.screenshot({ path: path.join(OUT, `${tag}-${n}-${name}.png`), fullPage: true }); console.log('saved', `${tag}-${n}-${name}`); };
  await page.goto(`${BASE}${locale === 'fr' ? '/fr' : ''}/otakudle`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE });
  await page.waitForSelector('#dle-guess:not([disabled])', { timeout: 30000 });
  await page.waitForTimeout(600);
  await shot(0, 'start');
  await guess(page, 'Ichigo');
  await guess(page, 'Loid');
  await shot(1, 'step1');
  await guess(page, 'Sasuke');
  await page.locator('[data-testid=dle-step-banner]').scrollIntoViewIfNeeded();
  await shot(2, 'banner');
  await guess(page, 'Gaara');
  await guess(page, 'Itachi');
  await shot(3, 'step2');
  await guess(page, 'Kakashi');
  await page.waitForSelector('#dle-win', { timeout: 15000 });
  await shot(4, 'result');
  const text = await page.locator('#dle-win').locator('xpath=ancestor::section').innerText();
  console.log(tag, JSON.stringify(text.split('\n').filter(Boolean).slice(0, 8)));
  await context.close();
}

const browser = await chromium.launch({ channel: 'chrome' });
for (const vp of ['390', '1440']) for (const scheme of ['light', 'dark']) await run(browser, vp, scheme, 'en');
await run(browser, '1440', 'light', 'fr');
await run(browser, '390', 'light', 'fr');
await browser.close();
