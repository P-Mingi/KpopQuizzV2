// Shared page setup for v11 specs. The width comes from the Playwright project
// (ux-1440 = 1440 x 900 desktop, ux-390 = 390 x 844 touch phone, the two
// reference widths); the theme is set through the site's own class-based system
// (localStorage['theme'] before first paint) + prefers-color-scheme.

import type { Page } from '@playwright/test';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export async function preparePage(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
  await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
}

/** The project width (1440 or 390). */
export function widthOf(page: Page): number {
  return page.viewportSize()?.width ?? 1440;
}

/** True when the page carries the v11 shell (flag ON). */
export async function hasShell(page: Page): Promise<boolean> {
  return (await page.locator('.ux-app').count()) > 0;
}

/** The shell's client islands are hydrated (the account island resolved to
 *  "Sign in" or the avatar), so click handlers are live. */
export async function waitHydrated(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(document.querySelector('.ux-nav-signin:not([aria-busy]), .ux-avabtn, .ux-nav-r button[aria-label^="Notifications"]')), undefined, { timeout: 20_000 });
}

/** Horizontal overflow of the document in px (0 = no horizontal scroll). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}
