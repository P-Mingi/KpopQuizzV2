// C2 browser harness: anonymous Chromium on :3071, every page wrapped with the v11
// guardWrites helper (apps/quiz/e2e/ux-v1/helpers/guard.ts, imported as is), so no
// mutating request reaches the server. A short list of POST routes that only READ
// (proven by source in ROWS evidence) may be let through on purpose: they are
// registered after guardWrites, so Playwright asks them first, and they still
// record the payload. Every /api request (any method) is logged for the evidence.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import { guardWrites } from '../../../../../../../apps/quiz/e2e/ux-v1/helpers/guard.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
export const OUT = path.resolve(here, '..');
const require = createRequire(path.resolve(here, '../../../../../../../apps/quiz/package.json'));
const { chromium } = require('@playwright/test');

export const BASE = process.env.C2_BASE || 'http://localhost:3071';
const EXEC = process.env.UX11_CHROMIUM
  || `${process.env.HOME}/Library/Caches/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-mac-arm64/chrome-headless-shell`;

/** POST routes that only read. Let through, payload still recorded. */
export const READ_ONLY_POSTS = ['/api/blind-test/generate'];

export interface Logged { method: string; path: string; body: string | null; status?: number; through: 'stubbed' | 'passed' | 'get' }

export async function withPage<T>(width: number, fn: (page: any, log: Logged[], stubbed: any[]) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  try {
    const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 } });
    const page = await ctx.newPage();
    const log: Logged[] = [];
    const stubbed = await guardWrites(page);
    for (const p of READ_ONLY_POSTS) {
      await page.route((u: URL) => u.pathname === p, async (route: any) => {
        const r = route.request();
        if (r.method() !== 'POST') { await route.continue(); return; }
        log.push({ method: 'POST', path: p, body: r.postData(), through: 'passed' });
        await route.continue();
      });
    }
    page.on('request', (r: any) => {
      const u = new URL(r.url());
      if (!u.pathname.startsWith('/api/') || u.origin !== new URL(BASE).origin) return;
      if (r.method() === 'GET' || r.method() === 'HEAD') log.push({ method: r.method(), path: u.pathname + u.search, body: null, through: 'get' });
    });
    return await fn(page, log, stubbed);
  } finally {
    await browser.close();
  }
}

/** Short form of the stubbed (never sent) calls: method, path, body. */
export function stubLines(stubbed: Array<{ method: string; url: string; body: string | null }>): string[] {
  return stubbed.map((c) => `STUBBED ${c.method} ${new URL(c.url).pathname}${new URL(c.url).search} body=${c.body ?? ''}`);
}

export function logLines(log: Logged[]): string[] {
  return log.map((l) => `${l.through.toUpperCase()} ${l.method} ${l.path}${l.body ? ` body=${l.body}` : ''}`);
}

export function write(name: string, lines: string[]): void {
  fs.writeFileSync(path.join(OUT, name), lines.join('\n') + '\n');
}

/** GET a URL server side (no browser): status, final location, body text. */
export async function get(p: string, init: RequestInit = {}): Promise<{ status: number; location: string | null; text: string }> {
  const res = await fetch(BASE + p, { redirect: 'manual', ...init, method: init.method ?? 'GET' });
  return { status: res.status, location: res.headers.get('location'), text: await res.text() };
}

/** Every href of a served HTML page. */
export function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]!.replace(/&amp;/g, '&'));
}
