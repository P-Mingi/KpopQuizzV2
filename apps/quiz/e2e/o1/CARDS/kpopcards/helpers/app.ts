import type { Page } from '@playwright/test';
import { APP_BASE, APP_ROOT } from './env';
import { freeze } from './freeze';

/** Opens a KpopCards page of the app (dev server, fixture mode with the seeded mock of agent A), seeded and
 *  frozen exactly like the prototype. `sub` is the path under /kpopcards ('' = the lobby). */
export async function openApp(page: Page, sub = '', opts: { state?: string } = {}) {
  await freeze(page);
  // the mock's start state: 'example' mirrors the prototype's example player (default), 'guest', 'empty'
  const qs = `${sub.includes('?') ? '&' : '?'}kcstate=${encodeURIComponent(opts.state || 'example')}`;
  await page.goto(`${APP_BASE}${APP_ROOT}${sub}${qs}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // the wallet arrives after the first paint (the mock loads lazily in development): wait for it, except in the guest view
  if (opts.state !== 'guest') await page.waitForSelector('.wallet .pill', { timeout: 60_000 }).catch(() => {});
}

/** Next dev compiles a route on its first request: hit every route once, with a long timeout, before the specs measure anything. */
export async function warmUp(request: import('@playwright/test').APIRequestContext, subs = ['', '/collection', '/missions', '/ranking', '/help', '/open/all', '/odds']) {
  for (const sub of subs) await request.get(`${APP_BASE}${APP_ROOT}${sub}`, { timeout: 180_000, failOnStatusCode: false }).catch(() => {});
}
