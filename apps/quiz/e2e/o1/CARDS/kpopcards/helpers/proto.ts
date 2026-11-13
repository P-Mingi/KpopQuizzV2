import fs from 'node:fs';
import type { Page } from '@playwright/test';
import { PROTO_FILE, PROTO_ORIGIN } from './env';
import { freeze } from './freeze';

let cached: string | null = null;
function html(): string {
  if (!cached) cached = fs.readFileSync(PROTO_FILE, 'utf8');
  return cached;
}

/** Opens the v6 prototype from a fake origin (so localStorage works in all three engines),
 *  clean state (the example binder), seeded and frozen. */
export async function openProto(page: Page, hash = 'lobby') {
  await page.route(`${PROTO_ORIGIN}/**`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: html() }),
  );
  await freeze(page);
  await page.goto(`${PROTO_ORIGIN}/proto.html#${hash}`);
  // a clean example binder every time (the origin keeps localStorage between pages of one context)
  await page.evaluate(() => localStorage.clear());
  await page.goto('about:blank');
  await page.goto(`${PROTO_ORIGIN}/proto.html#${hash}`);
  await page.waitForSelector('#v-' + hash + ':not([hidden])');
  await page.evaluate(() => document.fonts && document.fonts.ready);
}
