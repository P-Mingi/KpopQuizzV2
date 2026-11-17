// Lot 7 screenshots (UI lane): the panorama screens on the fixture dev server (CARDS_UI_FIXTURE=1 CARDS_UI_FIXTURE_PANO=1, see README.md).
// Run from apps/quiz: node e2e/o1/CARDS/kpopcards/lot7-shots.mjs [only]   (KC_BASE_URL, default http://localhost:3136/kpopcards)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.KC_BASE_URL ?? 'http://localhost:3136/kpopcards';
const OUT = new URL('../../../../../../docs/o1/evidence/cards/lot7/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const only = process.argv[2] ?? '';
const VPS = { desktop: { width: 1440, height: 860 }, mobile: { width: 390, height: 844 } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
// Next's dev overlay badge counts the dev server's own 404 of a preloaded chunk (_next/static/chunks/_claude_worktrees_..._src_0g1lxzu._.js, on every
// page of the app, the hub root included): it is not ours, so the shots hide the overlay. Our console errors (duplicate keys) are fixed.
const hideDevBadge = (page) => page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
async function shot(name, url, vp, fn) {
  if (only && !name.includes(only)) return;
  const ctx = await browser.newContext({ viewport: VPS[vp], deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', name, e.message));
  await page.goto(`${BASE}${url}`, { waitUntil: 'load', timeout: 120000 });
  await wait(2500);
  if (fn) await fn(page);
  await hideDevBadge(page);
  const clip = page._clip;
  if (clip) await page.locator(clip).first().screenshot({ path: `${OUT}${name}-${vp}.png` });
  else await page.screenshot({ path: `${OUT}${name}-${vp}.png`, fullPage: false });
  console.log('shot', `${name}-${vp}`);
  await ctx.close();
}
const BTS3 = 'kcset=BTS:R:all,BTS:C:1'; // BTS Rare photo is in 3 cards
const common = 'kcstate=example';

async function toPano(page, sel) {
  for (let k = 0; k < 12; k++) {
    if (await page.locator(sel).count()) break;
    const next = page.locator('#pg-next');
    if (await next.isDisabled()) break;
    await next.click();
    await wait(900);
  }
  await page.locator(sel).first().scrollIntoViewIfNeeded();
  await wait(500);
}
for (const vp of ['desktop', 'mobile']) {
  // the binder page of BTS: the photo in 3 (all parts held, panorama owned) and, on a page of its own, a pair with one part held (panorama missing)
  await shot('binder-group-pano-3-owned', `/collection/bts?kcset=BTS:R:all&kcpano=BTS:R`, vp, async (page) => { await toPano(page, '.pano-pw.w3'); page._clip = '.b-body'; });
  await shot('binder-group-pano-2-missing', `/collection/blackpink?kcset=BLACKPINK:C:1`, vp, async (page) => { await toPano(page, '.pano-pw.w2'); page._clip = '.b-body'; });
  await shot('binder-panoramas-section', `/collection/panoramas?kcset=BTS:R:all,BTS:C:all,BLACKPINK:C:1&kcpano=BTS:R,BTS:C`, vp, async (page) => { page._clip = '.b-body'; });
}

const PACK_URL = `/open/all?kcrar=R:BTS/3&kcpack=R:n,C:c,U:c,C:c,C:c`;
async function openUntilPano(page, shotMid) {
  await page.locator('#opk').click();
  await page.locator('#pile').waitFor({ timeout: 15000 });
  await wait(1200);
  await page.locator('#pile').click(); // reveal the Rare card (part 3 of the BTS photo)
  await wait(2200);
  await page.locator('#pile').click(); // send it down: the panorama follows
  if (shotMid) await wait(shotMid);
}
for (const vp of ['desktop', 'mobile']) {
  await shot('binder-pano-large-view', `/collection/bts?kcset=BTS:R:all&kcpano=BTS:R`, vp, async (page) => {
    await toPano(page, '.pano-pw.w3 button.pano-pocket');
    await page.locator('.pano-pw.w3 button.pano-pocket').first().click();
    await wait(900);
  });
  await shot('opening-pano-reveal-joining', PACK_URL, vp, async (page) => { await openUntilPano(page, 330); });
  await shot('opening-pano-reveal', PACK_URL, vp, async (page) => { await openUntilPano(page, 3500); });
  await shot('opening-pano-reveal-reduced-motion', PACK_URL, vp, async (page) => { await page.emulateMedia({ reducedMotion: 'reduce' }); await openUntilPano(page, 1800); });
  await shot('opening-summary-with-panorama', PACK_URL, vp, async (page) => {
    await openUntilPano(page, 3500);
    await page.locator('.pano-ov').click(); await wait(900); // leave the reveal: the next card
    await page.locator('#ov-skip').click(); await wait(2500); // Reveal all: the summary lists the panorama
  });
  await shot('opening-summary-with-panorama-scrolled', PACK_URL, vp, async (page) => {
    await openUntilPano(page, 3500);
    await page.locator('.pano-ov').click(); await wait(900);
    await page.locator('#ov-skip').click(); await wait(2500);
    await page.evaluate(() => document.querySelector('#ov-mid')?.scrollTo(0, 9999)); await wait(400);
  });
  await shot('craft-pano-reveal', `/collection/blackpink?kcset=BLACKPINK:C:1&kcshards=900&view=grid&sort=number`, vp, async (page) => {
    await page.locator('a.pocket[aria-label^="BLACKPINK"][aria-label*="Standard, missing"]').first().click();
    await page.locator('#d-craft').waitFor();
    await wait(700);
    await page.locator('#d-craft').click();
    await wait(2800);
  });
}

// The admin panel needs a signed-in admin and the service role, so it cannot run in the fixture: its component is rendered on a throwaway page
// (kpopcards/lot7-admin-preview, not committed) with the admin route answered by Playwright (rows below), so the panel and its previews are the real ones.
const SVG = (w, h, heads) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g"><stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#E8457A"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/>${Array.from({ length: heads }, (_, i) => `<circle cx="${(w / (heads + 1)) * (i + 1)}" cy="${h * 0.36}" r="${h * 0.09}" fill="#fff" opacity=".75"/><path d="M${(w / (heads + 1)) * (i + 1) - h * 0.15} ${h} q ${h * 0.15} -${h * 0.5} ${h * 0.3} 0z" fill="#fff" opacity=".55"/>`).join('')}</svg>`;
const ROWS = [
  { id: 11, entity_id: 'group:fixture-aurora', slot: 1, file_url: 'https://img.example.test/a.svg', storage_path: null, author: 'Photographer 1', licence: 'CC BY 4.0', status: 'approved', focal_x: 50, focal_y: 50, cards_entities: { name: 'Aurora Nine', kind: 'group' }, source_width: 1650, source_height: 850, parts: 3, heads_box: { x0: 6, x1: 94, y0: 20, y1: 85, hw: 7 }, parts_note: '3 cartes : la fenêtre 11 x 8,5 couperait quelqu\'un aux deux bords.', file_parts: 2, file_pano: true, partsWarning: null, halves: [] },
  { id: 12, entity_id: 'group:fixture-blue', slot: 2, file_url: 'https://img.example.test/b.svg', storage_path: 'g/blue', author: 'Photographer 2', licence: 'CC BY-SA 4.0', status: 'approved', focal_x: 50, focal_y: 50, cards_entities: { name: 'Blue Lantern', kind: 'group' }, source_width: 1200, source_height: 675, parts: 2, heads_box: { x0: 6, x1: 94, y0: 20, y1: 85, hw: 7 }, parts_note: null, file_parts: 2, file_pano: false, partsWarning: 'La fenêtre de 2 cartes couperait quelqu\'un au point focal 50/50. Déplace le point focal ou donne 3 cartes à cette photo.', halves: [] },
];
for (const vp of ['desktop', 'mobile']) {
  const run = async (name, fn) => {
    if (only && !name.includes(only)) return;
    const ctx = await browser.newContext({ viewport: VPS[vp], deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log('PAGEERROR', name, e.message));
    await page.route('https://img.example.test/**', (r) => r.fulfill({ contentType: 'image/svg+xml', body: r.request().url().endsWith('a.svg') ? SVG(1650, 850, 6) : SVG(1200, 675, 4) }));
    let refuse = false;
    await page.route('**/api/admin/cards/photos', async (r) => {
      const b = JSON.parse(r.request().postData() ?? '{}');
      const json = (o, status = 200) => r.fulfill({ status, contentType: 'application/json', body: JSON.stringify(o) });
      if (b.action === 'list') return json({ ok: true, rows: ROWS, next: null });
      if (b.action === 'catalog_state') return json({ ok: true, frozen: false });
      if (b.action === 'parts') return refuse ? json({ ok: false, error: 'locked', message: 'cards: a pack was opened and this photo is on a catalog card, its number of cards can no longer change' }, 409) : json({ ok: true, photo: { id: b.photo, parts: b.parts } });
      return json({ ok: true, rows: [] });
    });
    await page.goto(`${BASE}/lot7-admin-preview`, { waitUntil: 'load', timeout: 120000 });
    await wait(3000);
    await fn(page, (v) => { refuse = v; });
    await hideDevBadge(page);
    await page.screenshot({ path: `${OUT}${name}-${vp}.png`, fullPage: true });
    console.log('shot', `${name}-${vp}`);
    await ctx.close();
  };
  await run('admin-photos-3-cards-previews', async () => {});
  await run('admin-photos-2-cards-warning', async (page) => { await page.getByRole('button', { name: 'Blue Lantern' }).or(page.locator('button', { hasText: 'group:fixture-blue' })).first().click(); await wait(800); });
  await run('admin-photos-choice-refused', async (page, setRefuse) => {
    await page.locator('button', { hasText: 'group:fixture-blue' }).first().click(); await wait(600);
    setRefuse(true);
    await page.getByRole('button', { name: /3 cartes/ }).click(); await wait(900);
  });
  await run('admin-photos-choice-3-saved', async (page) => {
    await page.locator('button', { hasText: 'group:fixture-blue' }).first().click(); await wait(600);
    await page.getByRole('button', { name: /3 cartes/ }).click(); await wait(900);
  });
}
await browser.close();
