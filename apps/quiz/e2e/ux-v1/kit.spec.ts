import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { A0_LANDMARKS, compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

import type { Page } from '@playwright/test';

// /ux-v1/kit, the A0 gallery: every shared component in every state, light and
// dark, at the project width (ux-1440 / ux-390). Computed styles of the shared
// landmarks must equal the prototype reference (styles.json); sheets trap focus
// and close on X / Escape / backdrop with focus returning to the trigger.
// Skips on a flag-off build (the route 404s) and when the route is not reachable
// (it needs '/ux-v1/' in lib/route-allowlist.ts, requested from ORCH).

const env = loadTestEnv();
const SECTIONS = ['tokens', 'type', 'buttons', 'nav', 'section-headers', 'controls', 'quiz-cards', 'text-cards', 'posts', 'identity', 'badges', 'forms', 'sheets', 'feedback', 'viewer', 'icons'];

async function openKit(page: Page): Promise<boolean> {
  const res = await page.goto('/ux-v1/kit');
  if (!res || res.status() === 404 || !/\/ux-v1\/kit$/.test(new URL(page.url()).pathname)) return false;
  if (!(await hasShell(page))) return false;
  await waitHydrated(page);
  return true;
}

for (const theme of THEMES) {
  test.describe(`kit ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      await guardWrites(page, env.supabaseUrl);
    });

    test('renders every section, noindex, no horizontal scroll, reference styles, a11y', async ({ page }, info) => {
      test.skip(!(await openKit(page)), 'kit not served here (flag off, or /ux-v1/ not allowlisted yet)');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      for (const s of SECTIONS) await expect(page.locator(`[data-kit-section="${s}"]`), s).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);

      // Both theme panes render their own tokens whatever the page theme is.
      const panes = await page.evaluate(() => ['light', 'dark'].map((t) => getComputedStyle(document.querySelector(`[data-kit-pane="${t}"]`) as HTMLElement).backgroundColor));
      expect(panes).toEqual(['rgb(255, 255, 255)', 'rgb(20, 19, 18)']);

      const w = widthOf(page);
      const lm = A0_LANDMARKS.filter((l) => !['.nav', '.links a.on'].includes(l.proto));
      const cmp = await compareLandmarks(page, w, theme, lm);
      await info.attach('landmarks.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing, 'kit renders every A0 landmark').toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);

      // Badge medallions: 5 frames earned + locked, dashed ring when locked.
      expect(await page.locator('svg.ux-bmed.is-earned').count()).toBeGreaterThan(10);
      expect(await page.locator('svg.ux-bmed.is-locked').count()).toBeGreaterThan(5);
      expect(await page.locator('svg.ux-bmed.is-locked [stroke-dasharray]').count()).toBeGreaterThan(5);

      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical on the kit').toEqual([]);

      await info.attach(`kit-${w}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });
  });
}

test.describe('kit interactions', () => {
  test.beforeEach(async ({ page }) => {
    await preparePage(page, 'light');
    await guardWrites(page, env.supabaseUrl);
  });

  for (const [open, name, hasX] of [['share', 'Share your score', true], ['header', 'Header picture', true], ['confirm', 'Leave this quiz?', false], ['signin', 'Sign in to publish', true]] as const) {
    test(`${open} sheet: focus in, trap, Escape / X / backdrop close, focus returns`, async ({ page }) => {
      test.skip(!(await openKit(page)), 'kit not served here');
      const trigger = page.locator(`[data-kit-open="${open}"]`);
      const dlg = page.locator('.ux-layer [role="dialog"], .ux-layer [role="alertdialog"]').filter({ hasText: name });

      await trigger.click();
      await expect(dlg).toBeVisible();
      await expect(dlg).toHaveAttribute('aria-modal', 'true');
      expect(await dlg.evaluate((d) => d.contains(document.activeElement)), 'focus moved into the sheet').toBe(true);
      for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
      expect(await dlg.evaluate((d) => d.contains(document.activeElement)), 'focus trapped').toBe(true);
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await expect(dlg).toBeVisible();
      await page.getByTestId('ux-scrim').click({ position: { x: 4, y: 4 } });
      await expect(dlg).toBeHidden();

      await trigger.click();
      if (hasX) await dlg.getByRole('button', { name: 'Close' }).click();
      else await dlg.getByRole('button', { name: 'Keep playing' }).click();
      await expect(dlg).toBeHidden();
      await expect(trigger).toBeFocused();
    });
  }

  test('confirm sheet: the safe action is focused first', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    await page.locator('[data-kit-open="confirm"]').click();
    await expect(page.locator('.ux-layer').getByRole('button', { name: 'Keep playing' })).toBeFocused();
    await expect(page.locator('.ux-layer [role="alertdialog"]')).toBeVisible();
  });

  test('header picture sheet validates https before the server', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    await page.locator('[data-kit-open="header"]').click();
    const dlg = page.locator('.ux-layer [role="dialog"]');
    await dlg.getByLabel('Image link').fill('http://example.com/a.jpg');
    await dlg.getByRole('button', { name: 'Use', exact: true }).click();
    await expect(dlg.getByRole('alert')).toHaveText('Paste a link that starts with https://');
  });

  test('toast + live region', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    await page.locator('[data-kit-open="toast"]').click();
    await expect(page.getByTestId('ux-toast')).toHaveText('Link copied');
    await expect(page.getByTestId('ux-toast')).toHaveClass(/is-shown/);
    await page.locator('[data-kit-open="announce"]').click();
    await expect(page.getByTestId('ux-live')).toHaveText('Quiz finished. 8 out of 8.');
    await expect(page.getByTestId('ux-live')).toHaveAttribute('aria-live', 'polite');
  });

  test('tabs: arrow keys move the selection; segmented aria-pressed; dropdown + removable chip', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const kit = page.locator('[data-kit="controls"]');
    const tabs = kit.getByRole('tablist', { name: 'Feed' });
    await tabs.getByRole('tab', { name: 'For you' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.getByRole('tab', { name: 'Following' })).toHaveAttribute('aria-selected', 'true');
    await expect(tabs.getByRole('tab', { name: 'Following' })).toBeFocused();
    await page.keyboard.press('End');
    await expect(tabs.getByRole('tab', { name: 'Blogs' })).toHaveAttribute('aria-selected', 'true');

    const seg = kit.getByRole('group', { name: 'Sort' });
    await seg.getByRole('button', { name: 'Newest' }).click();
    await expect(seg.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true');
    await expect(seg.getByRole('button', { name: 'Trending' })).toHaveAttribute('aria-pressed', 'false');

    const level = kit.getByRole('button', { name: 'Level' });
    await expect(level).toHaveAttribute('aria-haspopup', 'menu');
    await level.click();
    await expect(level).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByRole('menuitemradio', { name: 'Easy' })).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(kit.getByRole('button', { name: 'Remove filter Medium' })).toBeVisible();
    await kit.getByRole('button', { name: 'Remove filter Medium' }).click();
    await expect(kit.getByRole('button', { name: 'Remove filter Medium' })).toHaveCount(0);
  });

  test('search overlay opens from the kit and closes on Escape', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const trigger = page.locator('[data-kit-open="search"]');
    await trigger.click();
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Search' })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  // P10 request 1: the selected tab keeps its pink-soft pill and pink ink while hovered.
  test('tabs: the selected tab keeps pink-soft-ink under the pointer', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const tabs = page.locator('[data-kit="controls"]').getByRole('tablist', { name: 'Feed' });
    const selected = tabs.getByRole('tab', { name: 'For you' });
    const other = tabs.getByRole('tab', { name: 'Following' });
    const color = (l: typeof selected): Promise<string> => l.evaluate((el) => getComputedStyle(el).color);
    const pinkSoftInk = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--ux-pink-soft-ink)';
      document.querySelector('.ux-page')?.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    const ink = await page.evaluate(() => getComputedStyle(document.querySelector('.ux-page') as HTMLElement).color);
    await selected.hover();
    await expect.poll(() => color(selected)).toBe(pinkSoftInk);
    await other.hover();
    await expect.poll(() => color(other)).toBe(ink); // an unselected tab still turns ink on hover
    await other.click();
    await expect(other).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => color(other)).toBe(pinkSoftInk); // pointer still on it right after the click
  });

  // P4 request 3: an island that renders useUxMe() on the server and hydrates AFTER
  // the shell islands filled the /api/auth/me cache must hydrate with the same markup.
  test('viewer state: a late island hydrates without a mismatch (guest)', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    test.skip(!(await openKit(page)), 'kit not served here');
    const probe = page.locator('[data-kit="auth-probe"]');
    await expect(probe).toHaveAttribute('data-state', 'out', { timeout: 15_000 });
    await expect(probe).toHaveText('Browsing as a guest');
    expect(errors.filter((e) => /hydrat|did not match|didn't match|server rendered/i.test(e)), 'no hydration mismatch').toEqual([]);
  });
});

signedInTest.describe('kit viewer state (test user, read only)', () => {
  signedInTest('a late island hydrates without a mismatch (signed in)', async ({ page }) => {
    skipUnlessSignedIn();
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    await preparePage(page, 'light');
    const calls = await guardWrites(page, env.supabaseUrl);
    // /api/auth/me answers "signed out" when Supabase auth takes over 2.5 s (a cold
    // dev compile can): warm it first (GET, read only) so the page gets the viewer.
    await page.request.get('/api/auth/me');
    signedInTest.skip(!(await openKit(page)), 'kit not served here');
    const probe = page.locator('[data-kit="auth-probe"]');
    await expect(probe).toHaveAttribute('data-state', 'in', { timeout: 15_000 });
    await expect(probe).toContainText('Signed in as ');
    expect(errors.filter((e) => /hydrat|did not match|didn't match|server rendered/i.test(e)), 'no hydration mismatch').toEqual([]);
    expect(calls, 'no write attempted').toEqual([]);
  });
});
