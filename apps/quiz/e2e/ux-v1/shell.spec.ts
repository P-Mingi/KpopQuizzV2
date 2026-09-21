import { test, expect } from '@playwright/test';

// UX v1 Phase 1 visual checks (mission rule 6): the shell in light + dark at
// 1440 and 390 wide. Runs against the built app on :3021 started with
// NEXT_PUBLIC_UX_V1=1. When the flag is OFF (no shell in the DOM) every case
// skips, so this spec is inert on a flag-off build and never false-fails.
//
// Screenshots land under this file's snapshot dir; the reference is the
// prototype (docs/design/ux-dashboard-v1/shot-*.png) reviewed by the owner.

const WIDTHS = [
  { name: '1440', width: 1440, height: 900 },
  { name: '390', width: 390, height: 844 },
];
const THEMES = ['light', 'dark'] as const;

for (const vp of WIDTHS) {
  for (const theme of THEMES) {
    test(`shell @ ${vp.name} ${theme}`, async ({ page }) => {
      // Force the theme via the app's own class-based system before first paint.
      await page.addInitScript((t) => {
        try { localStorage.setItem('theme', t); } catch { /* storage blocked */ }
      }, theme);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      const shell = page.locator('.uxv1-app');
      if ((await shell.count()) === 0) {
        test.skip(true, 'UX v1 flag is OFF on this build - shell not rendered');
        return;
      }

      // Structure invariants per width.
      const sidebar = page.locator('.uxv1-sidebar');
      const mnav = page.locator('.uxv1-mnav');
      if (vp.width > 760) {
        await expect(sidebar).toBeVisible();
        await expect(mnav).toBeHidden();
      } else {
        await expect(sidebar).toBeHidden();
        await expect(mnav).toBeVisible();
      }

      // The page content still renders inside the shell (SSR preserved).
      await expect(page.locator('main.uxv1-content h1').first()).toBeVisible();

      await expect(page).toHaveScreenshot(`shell-${vp.name}-${theme}.png`, { fullPage: false, animations: 'disabled' });
    });
  }
}
