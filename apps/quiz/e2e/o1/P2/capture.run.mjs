// Run O1, lot P2 (CR-024): the screenshots of /otakudle, /otakudle/one-piece and /otakudle/dragon-ball, English and French, desktop and mobile, in progress and on the result screen.
// It plays the real pages against the local stand-in of serve-preview.run.ts: it types real guesses, opens the hint at 5 errors, then types the answer of the day (given by the stand-in
// only, GET /__target) to reach the result. Reduced motion is on, so the cells do not flip and no confetti is in the picture.
//   cd apps/quiz && BASE=http://localhost:3040 API=http://127.0.0.1:54399 OUT=../../docs/proofs/series-games-pages node e2e/o1/P2/capture.run.mjs
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { chromium } from '@playwright/test';

const BASE = process.env.BASE ?? 'http://localhost:3040';
const API = process.env.API ?? 'http://127.0.0.1:54399';
const OUT = path.resolve(process.env.OUT ?? '../../docs/proofs/series-games-pages');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true },
};
const PATHS = { otakudle: '/otakudle', 'one-piece': '/otakudle/one-piece', 'dragon-ball': '/otakudle/dragon-ball' };
const GAME_ID = { otakudle: 'otakudle', 'one-piece': 'otakudle-one-piece', 'dragon-ball': 'otakudle-dragon-ball' };
// Well-known characters first: they are what a player types.
const WRONG = {
  otakudle: ['Naruto Uzumaki', 'Eren Yeager', 'Tanjiro Kamado'],
  'one-piece': ['Monkey D. Luffy', 'Roronoa Zoro', 'Nami', 'Sanji', 'Usopp', 'Shanks', 'Buggy', 'Smoker'],
  'dragon-ball': ['Son Goku', 'Vegeta', 'Piccolo', 'Krillin', 'Bulma', 'Frieza', 'Cell', 'Beerus'],
};

const rpc = async (fn, body) => (await fetch(`${API}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
const target = async (slug) => (await fetch(`${API}/__target?game=${GAME_ID[slug]}`)).json();
const poolNames = async (slug) => new Set((await rpc('dle_pool', { p_game: GAME_ID[slug] })).entities.map((e) => e.name));

async function open(context, slug, locale) {
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}${locale === 'fr' ? '/fr' : ''}${PATHS[slug]}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: 'nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important }' });
  await page.waitForSelector('#dle-guess:not([disabled])');
  await page.waitForTimeout(1200);
  return page;
}

async function guess(page, name, count) {
  await page.fill('#dle-guess', name);
  await page.waitForSelector('#dle-sugg [role=option]');
  await page.keyboard.press('Enter');
  await page.waitForFunction((n) => document.querySelectorAll('table.hub-dle-grid tbody tr').length === n, count, { timeout: 20000 });
  await page.waitForTimeout(250);
}

async function shot(page, file) {
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(OUT, file), fullPage: true });
  console.log('saved', file);
}

/** Six wrong guesses (the hint of 5 errors opens), the hint shown, then a picture. */
async function inProgress(page, slug, tag) {
  const names = await poolNames(slug);
  const t = (await target(slug)).name;
  const picks = WRONG[slug].filter((n) => names.has(n) && n !== t).slice(0, 6);
  for (let i = 0; i < picks.length; i += 1) await guess(page, picks[i], i + 1);
  const btn = page.locator('.hub-dle-hint-btn').first();
  if (await btn.count()) await btn.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, `${tag}-progress.png`);
  return picks.length;
}

async function result(page, slug, tag, already) {
  const t = (await target(slug)).name;
  await guess(page, t, already + 1);
  await page.waitForSelector('#dle-win');
  await page.waitForTimeout(800);
  await shot(page, `${tag}-result.png`);
}

const browser = await chromium.launch(process.env.O1_CHROMIUM ? { executablePath: process.env.O1_CHROMIUM } : {});
try {
  for (const [vp, opts] of Object.entries(VIEWPORTS)) {
    for (const locale of ['en', 'fr']) {
      // One context per viewport and language: a fresh device, so a fresh token and an empty history.
      for (const slug of ['one-piece', 'dragon-ball']) {
        const context = await browser.newContext({ ...opts, locale: locale === 'fr' ? 'fr-FR' : 'en-US' });
        const page = await open(context, slug, locale);
        const tag = `${slug}-${locale}-${vp}`;
        await shot(page, `${tag}-start.png`);
        const n = await inProgress(page, slug, tag);
        await result(page, slug, tag, n);
        await context.close();
      }
    }
    // The page of Otakudle with the two tiles to the series games.
    for (const locale of ['en', 'fr']) {
      const context = await browser.newContext({ ...opts, locale: locale === 'fr' ? 'fr-FR' : 'en-US' });
      const page = await open(context, 'otakudle', locale);
      await shot(page, `otakudle-${locale}-${vp}-tiles.png`);
      await context.close();
    }
  }
  // The chain, one device: Otakudle won, then One Piece won (its result offers Dragon Ball), then Dragon Ball won: "All done today".
  for (const [vp, locale] of [['desktop', 'en'], ['mobile', 'fr']]) {
    const context = await browser.newContext({ ...VIEWPORTS[vp], locale: locale === 'fr' ? 'fr-FR' : 'en-US' });
    for (const slug of ['otakudle', 'one-piece', 'dragon-ball']) {
      const page = await open(context, slug, locale);
      const t = (await target(slug)).name;
      const wrong = (await poolNames(slug));
      const first = WRONG[slug].find((n) => wrong.has(n) && n !== t) ?? [...wrong].find((n) => n !== t);
      await guess(page, first, 1);
      await guess(page, t, 2);
      await page.waitForSelector('#dle-win');
      await page.waitForTimeout(800);
      await shot(page, `chain-${locale}-${vp}-${slug}-result.png`);
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
