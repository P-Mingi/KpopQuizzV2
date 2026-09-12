import { test, expect } from '@playwright/test';

// Harness proof: Chrome launches and assertions work, with no server. Feature
// specs (server-backed) live alongside and run against the built app on :3021.
test('playwright + system Chrome runs', async ({ page }) => {
  await page.setContent('<main><h1 id="t">Tier Lists</h1></main>');
  await expect(page.locator('#t')).toHaveText('Tier Lists');
});
