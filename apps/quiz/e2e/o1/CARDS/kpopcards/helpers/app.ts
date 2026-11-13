import type { Page } from '@playwright/test';
import { APP_BASE, APP_ROOT } from './env';
import { freeze } from './freeze';

/** Opens a KpopCards page of the app (dev server, fixture mode with the seeded mock of agent A), seeded and
 *  frozen exactly like the prototype. `sub` is the path under /kpopcards ('' = the lobby). */
export async function openApp(page: Page, sub = '', opts: { state?: string } = {}) {
  await freeze(page);
  const qs = opts.state ? `${sub.includes('?') ? '&' : '?'}kcstate=${encodeURIComponent(opts.state)}` : '';
  await page.goto(`${APP_BASE}${APP_ROOT}${sub}${qs}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
}
