import type { Page } from '@playwright/test';
import { openApp } from './app';
import { openProto } from './proto';
import { openControls } from './screens';

/** KC_TARGET=app (default) or proto: the journeys run on the app, and on the prototype to prove the spec itself. */
export const TARGET = (process.env.KC_TARGET || 'app') as 'app' | 'proto';

const HASH: Record<string, string> = { '': 'lobby', '/collection': 'collection', '/missions': 'missions', '/ranking': 'ranking', '/help': 'help' };

export async function go(page: Page, sub = '', opts: { state?: string } = {}) {
  if (TARGET === 'proto') {
    await openProto(page, HASH[sub] || 'lobby');
  } else {
    await openApp(page, sub, opts);
  }
}

/** The prototype's own "Prototype controls" (force golden, force Gold...). The app exposes the same ids in dev fixture mode. */
export async function control(page: Page, id: string) {
  await openControls(page);
  await page.click('#' + id);
  await page.evaluate(() => scrollTo(0, 0));
}

export async function packs(page: Page): Promise<number> {
  return Number((await page.locator('#w-packs').textContent())?.trim());
}
export async function shards(page: Page): Promise<number> {
  return Number((await page.locator('#w-shards').textContent())?.replace(/\D/g, ''));
}

/** From the lobby: tear the pack, Reveal all, wait for the summary. */
export async function finishOpening(page: Page) {
  await page.waitForSelector('#opk', { state: 'visible' });
  await page.click('#opk');
  await page.waitForSelector('#ov-skip:not([hidden])');
  await page.waitForTimeout(1200);
  await page.click('#ov-skip');
  await page.waitForSelector('#ov-add, #ov-in', { state: 'visible', timeout: 20_000 });
  await page.waitForTimeout(1500);
}
