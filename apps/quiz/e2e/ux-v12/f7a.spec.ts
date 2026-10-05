import { chromium, expect, firefox, test, webkit } from '@playwright/test';

import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';

import type { Browser, BrowserType, Page } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';

// F7a (owner's Firefox test, 2026-10-04), both flags on, run with --project=ux-1440 --no-deps:
//   1. a /blindtest page whose client chunk is gone (a page Firefox kept from an earlier
//      build) reloads once and plays, instead of "Something went wrong";
//   2. a cover that loads slowly or fails never paints its alt text: placeholder instead;
//   3. the sweep (F7A_SWEEP=1): every playlist of the hub menu and every /blindtest/<mode>
//      page the modes API lists starts a run, in Chromium and Firefox. The verdicts are
//      written to F7A_SWEEP_OUT (JSON) when set.
// No write: guardWrites answers every mutating request locally; generate (a POST that only
// reads) is let through to the server, and the clips are a local silent file.

const env = loadTestEnv();
const BASE = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3062';
const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };
// The project's launchOptions (UX11_CHROMIUM) reach every engine's launch: name each binary.
const launchOpts = (name: string): Parameters<BrowserType['launch']>[0] =>
  ({ executablePath: name === 'chromium' && process.env.UX11_CHROMIUM ? process.env.UX11_CHROMIUM : ENGINES[name]!.executablePath() });

function silentWav(seconds = 2): Buffer {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();

interface Opened { page: Page; writes: StubbedCall[]; errors: string[] }
/** A fresh page of `browser` behind guardWrites, generate let through, clips silent. */
async function openPage(browser: Browser): Promise<Opened> {
  const ctx = await browser.newContext({ baseURL: BASE, viewport: { width: 1440, height: 900 } });
  ctx.setDefaultTimeout(30_000);
  ctx.setDefaultNavigationTimeout(60_000);
  const page = await ctx.newPage();
  const writes = await guardWrites(page, env.supabaseUrl);
  await page.route((u) => u.pathname === '/api/blind-test/generate', (r) => r.continue());
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return { page, writes, errors };
}
const realWrites = (w: StubbedCall[]): StubbedCall[] => w.filter((c) => new URL(c.url).pathname !== '/api/blind-test/generate');

/** The error screen of app/error.tsx. */
const wentWrong = (page: Page): Promise<boolean> => page.getByText('Something went wrong').isVisible();

/** Text painted inside the reveal's cover box: none may show (Firefox paints alt text). */
async function coverShowsText(page: Page): Promise<boolean> {
  return page.locator('.p6-reveal .p6-cv').evaluate((el) => {
    if (el.tagName !== 'IMG') return false;
    const img = el as HTMLImageElement;
    const cs = getComputedStyle(img);
    const painted = cs.color !== 'rgba(0, 0, 0, 0)' && cs.color !== 'transparent' && parseFloat(cs.fontSize) > 0;
    return Boolean(img.alt) && painted && !(img.complete && img.naturalWidth > 0);
  });
}

/** After Play / Start: four live answers, one picked, the reveal. Throws with the step that failed. */
async function playOneRound(page: Page): Promise<void> {
  await expect(page.locator('.p6-ans:not([disabled])'), 'four answers').toHaveCount(4, { timeout: 45_000 });
  await page.locator('.p6-ans').first().click();
  await expect(page.locator('.p6-reveal'), 'the reveal').toBeVisible({ timeout: 15_000 });
  expect(await coverShowsText(page), 'no alt text painted in the cover').toBe(false);
}

const PLAY = '[data-g3="play"], .p6-mode-go button';

test.describe('F7a', () => {
  // eslint-disable-next-line no-empty-pattern -- Playwright reads the fixture list from the pattern
  test.beforeEach(({}, info) => { test.skip(info.project.name !== 'ux-1440', 'own browsers at 1440, once'); });

  for (const name of ['firefox', 'chromium', 'webkit']) {
    test(`${name}: a /blindtest page whose chunk is gone reloads once and plays`, async () => {
      // WebKit does not fetch the same chunk URL again after the reload (its memory cache
      // keeps the failure), so this simulation cannot model a stale page there: a real stale
      // page names a chunk URL the current build does not have, and the reload names the new one.
      test.skip(name === 'webkit', 'the same-URL simulation does not apply to WebKit');
      test.setTimeout(240_000);
      const browser = await ENGINES[name]!.launch(launchOpts(name));
      try {
        const { page, writes } = await openPage(browser);
        // The page's controller chunk cannot be fetched for the first page load (a 404 would be
        // kept by WebKit's memory cache for the same URL; a stale page names another URL), as
        // for a page kept from an earlier build (dev chunk names hold the file name).
        let killed = 0;
        let loads = 0;
        page.on('request', (q) => { if (q.isNavigationRequest() && q.frame() === page.mainFrame()) loads++; });
        await page.route(/mode-controller/, async (r) => {
          if (loads <= 1) { killed = 1; await r.abort('failed'); return; }
          await r.fallback();
        });
        await page.goto('/blindtest/kpop-demon-hunters');
        // The Play button is in the served HTML: wait for the reload, then for the page to play.
        await expect.poll(() => loads, { message: 'one reload', timeout: 60_000 }).toBeGreaterThanOrEqual(2);
        await page.waitForLoadState('load');
        await expect(page.locator(PLAY).first()).toBeVisible({ timeout: 60_000 });
        expect(killed, 'the chunk was refused once').toBe(1);
        expect(loads, 'a single reload').toBe(2);
        expect(await wentWrong(page)).toBe(false);
        await page.locator(PLAY).first().click();
        await playOneRound(page);
        expect(realWrites(writes)).toEqual([]);
      } finally { await browser.close(); }
    });

    test(`${name}: a cover that is slow or fails never shows its alt text`, async () => {
      test.setTimeout(240_000);
      const browser = await ENGINES[name]!.launch(launchOpts(name));
      try {
        for (const mode of ['slow', 'fail'] as const) {
          const { page, writes } = await openPage(browser);
          await page.route(/cdn-images\.dzcdn\.net/, async (r) => {
            if (mode === 'fail') { await r.fulfill({ status: 404, body: '' }); return; }
            await new Promise((d) => setTimeout(d, 20_000));
            await r.continue().catch(() => {});
          });
          await page.goto('/blindtest/4th-gen');
          await page.locator(PLAY).first().click();
          await playOneRound(page);
          const ph = page.locator('.p6-reveal [data-cover="placeholder"]');
          if (mode === 'fail') {
            await expect(ph).toBeVisible();
            await expect(ph).toHaveAttribute('role', 'img');
          } else {
            await expect(page.locator('.p6-reveal img.ux-cover.is-loading')).toBeVisible();
          }
          expect(realWrites(writes)).toEqual([]);
          await page.context().close();
        }
      } finally { await browser.close(); }
    });
  }

  for (const name of ['firefox', 'chromium']) {
    test(`${name}: every playlist and every /blindtest page starts a run (F7A_SWEEP=1)`, async ({ request }) => {
      test.skip(process.env.F7A_SWEEP !== '1', 'the long sweep runs when asked');
      test.setTimeout(3 * 3600_000);
      const res = await request.get(`${BASE}/api/blind-test/modes`);
      expect(res.status()).toBe(200);
      const modes = Object.values(((await res.json()) as { modes: Record<string, Array<{ id: string }>> }).modes).flat().map((m) => m.id);
      const browser = await ENGINES[name]!.launch(launchOpts(name));
      const results: Array<{ item: string; pass: boolean; why?: string }> = [];
      const record = (r: { item: string; pass: boolean; why?: string }): void => {
        results.push(r);
        // One line per item, so a long sweep can be followed while it runs.
        console.log(`F7A ${name} ${r.pass ? 'PASS' : 'FAIL'} ${r.item}${r.why ? ` :: ${r.why}` : ''}`);
      };
      const attempt = async (item: string, go: (page: Page) => Promise<void>): Promise<void> => {
        const { page, writes, errors } = await openPage(browser);
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const run = (async (): Promise<void> => {
            await go(page);
            await playOneRound(page);
            if (await wentWrong(page)) throw new Error('Something went wrong');
            const w = realWrites(writes);
            if (w.length) throw new Error(`write ${w.map((c) => c.method + ' ' + c.url).join(', ')}`);
          })();
          const cap = new Promise<never>((_, no) => { timer = setTimeout(() => no(new Error('item took over 150 s')), 150_000); });
          await Promise.race([run, cap]);
          record({ item, pass: true });
        } catch (e) {
          record({ item, pass: false, why: `${(e as Error).message.split('\n')[0]}${errors.length ? ` | pageerror: ${errors[0]}` : ''}` });
        } finally {
          if (timer) clearTimeout(timer);
          await page.context().close().catch(() => {});
        }
      };
      try {
        for (const id of modes) {
          await attempt(`/blindtest/${id}`, async (page) => {
            await page.goto(`/blindtest/${id}`);
            // A click before hydration starts nothing: wait for the client controller.
            await page.locator('.p6-mode[data-live]').first().waitFor({ timeout: 45_000 });
            await page.locator(PLAY).first().click({ timeout: 45_000 });
          });
        }
        // The hub's playlist menu: every item (All K-pop, groups, themes, mixes, generations).
        const probe = await openPage(browser);
        await probe.page.goto('/blindtest');
        await probe.page.locator('.p6-setup[data-live]').waitFor({ timeout: 45_000 });
        await probe.page.locator('.p6-pl').click();
        await probe.page.locator('.p6-plmenu .p6-mi[aria-pressed]').first().waitFor();
        const labels = await probe.page.locator('.p6-plmenu .p6-mi[aria-pressed]').evaluateAll((els) => els.map((e) => (e.textContent ?? '').trim()));
        await probe.page.context().close();
        expect(labels.length, 'the hub menu lists its playlists').toBeGreaterThan(10);
        for (let i = 0; i < labels.length; i++) {
          await attempt(`hub menu: ${labels[i]}`, async (page) => {
            await page.goto('/blindtest');
            await page.locator('.p6-setup[data-live]').waitFor({ timeout: 45_000 });
            await page.locator('.p6-pl').click();
            const gens = page.locator('.p6-plmenu .p6-mi[aria-expanded]');
            if (await gens.count()) { if ((await gens.getAttribute('aria-expanded')) !== 'true') await gens.click(); }
            await page.locator('.p6-plmenu .p6-mi[aria-pressed]').nth(i).click();
            await page.getByRole('button', { name: 'Start', exact: true }).click();
          });
        }
      } finally { await browser.close(); }
      if (process.env.F7A_SWEEP_OUT) {
        const fs = await import('node:fs');
        fs.writeFileSync(`${process.env.F7A_SWEEP_OUT}.${name}.json`, JSON.stringify(results, null, 1));
      }
      expect(results.filter((r) => !r.pass), `${results.filter((r) => r.pass).length}/${results.length} pass`).toEqual([]);
    });
  }
});
