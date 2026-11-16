import type { Page } from '@playwright/test';
import { APP_BASE, APP_ROOT } from './env';
import { freeze } from './freeze';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const protoPack = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'proto-first-pack.json'), 'utf8')) as { cards: { rarity: string; isNew: boolean }[] };

/** ?kcpack=R:n,C:c,... the mock's forcePack pattern (n new, c copy) of the prototype's first pack under the harness seed. */
export const KC_PACK = protoPack.cards.map((c) => `${c.rarity}:${c.isNew ? 'n' : 'c'}`).join(',');

/** Opens a KpopCards page of the app (dev server, fixture mode with the seeded mock of agent A), seeded and
 *  frozen exactly like the prototype. `sub` is the path under /kpopcards ('' = the lobby). */
export async function openApp(page: Page, sub = '', opts: { state?: string; noPack?: boolean } = {}) {
  await freeze(page);
  // the mock's start state: 'example' mirrors the prototype's example player (default), 'guest', 'empty'
  const pack = sub.startsWith('/open') && !opts.noPack ? `&kcpack=${encodeURIComponent(KC_PACK)}` : '';
  const qs = `${sub.includes('?') ? '&' : '?'}kcstate=${encodeURIComponent(opts.state || 'example')}${pack}`;
  await page.goto(`${APP_BASE}${APP_ROOT}${sub}${qs}`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  // the wallet arrives after the first paint (the mock loads lazily in development): wait for it, except in the guest view
  if (opts.state !== 'guest') await page.waitForSelector('.wallet .pill', { timeout: 60_000 }).catch(() => {});
}

/** Next dev compiles a route on its first request: hit every route once, with a long timeout, before the specs measure anything. */
export async function warmUp(request: import('@playwright/test').APIRequestContext, subs = ['', '/collection', '/missions', '/ranking', '/help', '/open/all', '/odds']) {
  for (const sub of subs) await request.get(`${APP_BASE}${APP_ROOT}${sub}`, { timeout: 180_000, failOnStatusCode: false }).catch(() => {});
}
