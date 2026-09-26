import { test, expect } from '@playwright/test';

import { basicA11y, focusRing, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { A0_LANDMARKS, compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

// UX v11.2 shell (A0): top nav with the pink pill + icons + Home, phone tab bar,
// footer, search overlay, sign-in sheet, keyboard and focus. Width = the project
// (ux-1440 / ux-390), both themes. Runs against a flag-ON build
// (PLAYWRIGHT_BASE_URL); on a flag-off build every case skips. No production
// write: every mutating request is stubbed (helpers/guard) and its payload asserted.

const env = loadTestEnv();
const PINK_RING = /^2px solid rgb\(232, 69, 122\)$/;
const LEGACY_FOOTER_LINKS = ['/quizzes', '/quizzes/popular-this-week', '/trivia', '/blindtest', '/leaderboard', '/stats', '/data/pulse', '/data/knowledge-report-2026', '/articles', '/news', '/create', '/about', '/faq', '/contact', '/terms', '/privacy', '/dmca'];

for (const theme of THEMES) {
  test.describe(`shell ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      await guardWrites(page, env.supabaseUrl);
    });

    test('frame, nav state, footer, no horizontal scroll, reference styles, axe', async ({ page }, info) => {
      const w = widthOf(page);
      await page.goto('/');
      test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');

      await expect(page.locator('head link[rel="stylesheet"][href^="/api/ux-v1/a0/styles"]'), 'the v11 stylesheet (flag-on only)').toHaveCount(1);
      await expect(page.locator('a.ux-skip')).toHaveAttribute('href', '#main');
      await expect(page.locator('main#main')).toHaveCount(1);
      await expect(page.locator('.ux-nav .ux-brand')).toHaveAttribute('href', '/');
      const links = page.locator('.ux-links a');
      await expect(links).toHaveCount(6);
      expect(await links.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['/', '/quizzes', '/groups', '/blindtest', '/community', '/leaderboard']);

      if (w > 760) {
        await expect(page.locator('.ux-links')).toBeVisible();
        await expect(page.locator('.ux-links a[aria-current="page"]')).toHaveText('Home');
        await expect(page.locator('.ux-tabbar')).toBeHidden();
        await expect(page.locator('.ux-nav-create')).toBeVisible();
      } else {
        await expect(page.locator('.ux-links')).toBeHidden();
        await expect(page.locator('.ux-tabbar')).toBeVisible();
        await expect(page.locator('.ux-tab[aria-current="page"]')).toContainText('Home');
        expect(await page.locator('.ux-tab').evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual(['/', '/quizzes', '/blindtest', '/community', '/profile']);
        const tb = await page.locator('.ux-tabbar-in').boundingBox();
        expect(Math.round(tb?.height ?? 0)).toBe(64);
        const sb = await page.locator('.ux-sbtn').boundingBox();
        expect(Math.round(sb?.height ?? 0), '44px touch target').toBe(44);
      }
      await expect(page.locator('.ux-sbtn')).toBeVisible();

      const hrefs = await page.locator('.ux-foot a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const h of LEGACY_FOOTER_LINKS) expect(hrefs, `footer keeps ${h}`).toContain(h);

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const nav = await page.locator('.ux-nav').boundingBox();
      expect(Math.round(nav?.height ?? 0)).toBe(65); // 64 + the 1px hairline (transparent until scroll), as the reference

      const lm = A0_LANDMARKS.filter((l) => l.proto === '.nav' || l.proto === '.links a.on');
      const cmp = await compareLandmarks(page, w, theme, lm);
      await info.attach('landmarks.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing, 'landmarks present').toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);

      expect(await basicA11y(page, '.ux-nav, .ux-tabbar, .ux-foot')).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-app', exclude: ['.ux-main'] });
      if (axe) expect(axe, 'axe serious / critical in the shell').toEqual([]);
      else info.annotations.push({ type: 'axe', description: 'axe-core not resolvable; basic checks only' });

      await info.attach(`shell-${w}-${theme}.png`, { body: await page.screenshot(), contentType: 'image/png' });
    });

    test('search overlay: button, "/" key, Escape, backdrop, focus return', async ({ page }) => {
      await page.goto('/');
      test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
      await waitHydrated(page);
      const trigger = page.locator('.ux-sbtn');
      await trigger.click();
      const dlg = page.getByRole('dialog', { name: 'Search' });
      await expect(dlg).toBeVisible();
      await expect(page.locator('#ux-sq')).toBeFocused();
      await page.locator('#ux-sq').fill('bts');
      await expect(dlg.locator('a.ux-srow')).toHaveAttribute('href', '/search?q=bts');
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(trigger).toBeFocused();

      await trigger.evaluate((el) => (el as HTMLElement).blur());
      await page.keyboard.press('/');
      await expect(dlg).toBeVisible();
      const vh = page.viewportSize()?.height ?? 800;
      await page.mouse.click(5, vh - 90);
      await expect(dlg).toBeHidden();
    });
  });
}

test.describe('keyboard + sign-in', () => {
  test.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });

  test('skip link, focus ring, nav / tab bar reachable by keyboard', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await page.keyboard.press('Tab');
    await expect(page.locator('a.ux-skip')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => document.activeElement?.id)).toBe('main');

    await page.goto('/');
    const desktop = widthOf(page) > 760;
    const target = desktop ? page.locator('.ux-links a[data-nav="quizzes"]') : page.locator('.ux-sbtn');
    let reached = false;
    for (let i = 0; i < 12 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await target.evaluate((el) => el === document.activeElement);
    }
    expect(reached, 'keyboard reaches the nav').toBe(true);
    expect((await focusRing(page))?.outline).toMatch(PINK_RING);

    if (!desktop) {
      // The tab bar is the last stop of the page: Shift+Tab from the top wraps to it.
      await page.goto('/');
      let onTab = false;
      for (let i = 0; i < 6 && !onTab; i++) {
        await page.keyboard.press('Shift+Tab');
        onTab = await page.evaluate(() => Boolean(document.activeElement?.classList.contains('ux-tab')));
      }
      expect(onTab, 'keyboard reaches the tab bar').toBe(true);
      expect((await focusRing(page))?.outline).toMatch(PINK_RING);
    }
  });

  test('sign-in sheet: focus trap, Escape / X / backdrop close, OAuth + magic link (stubbed)', async ({ page }) => {
    const calls = await guardWrites(page, env.supabaseUrl);
    const authorize: string[] = [];
    await page.route('**/auth/v1/authorize**', async (route) => { authorize.push(route.request().url()); await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>stub</p>' }); });
    await page.goto('/quizzes');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    const signIn = page.locator('.ux-nav-signin');
    await expect(signIn).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.ux-nav-signin:not([aria-busy])'));

    const dlg = page.getByRole('dialog', { name: 'Sign in to KpopQuiz' });
    await signIn.click();
    await expect(dlg).toBeVisible();
    await expect(dlg).toHaveAttribute('aria-modal', 'true');
    await expect(dlg.getByRole('button', { name: 'Continue with Google' })).toBeFocused();
    for (let i = 0; i < 9; i++) await page.keyboard.press('Tab');
    expect(await dlg.evaluate((d) => d.contains(document.activeElement)), 'Tab stays in the sheet').toBe(true);
    await dlg.getByRole('button', { name: 'Close' }).focus();
    await page.keyboard.press('Shift+Tab');
    expect(await dlg.evaluate((d) => d.contains(document.activeElement)), 'Shift+Tab stays in the sheet').toBe(true);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(signIn).toBeFocused();

    await signIn.click();
    await dlg.getByRole('button', { name: 'Close' }).click();
    await expect(dlg).toBeHidden();
    await expect(signIn).toBeFocused();

    await signIn.click();
    await page.getByTestId('ux-scrim').click({ position: { x: 5, y: 5 } });
    await expect(dlg).toBeHidden();

    // Magic link: the payload goes to Supabase /otp (stubbed, nothing is sent).
    await signIn.click();
    await dlg.getByPlaceholder('you@example.com').fill('fan@example.com');
    await dlg.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await expect(page.getByTestId('ux-toast')).toContainText('Link sent to fan@example.com');
    const otp = calls.find((c) => c.url.includes('/auth/v1/otp'));
    expect(otp, 'magic link request made').toBeTruthy();
    expect((JSON.parse(otp?.body ?? '{}') as { email?: string }).email).toBe('fan@example.com');

    // Google: the browser goes to Supabase authorize with our callback + returnTo.
    await signIn.click();
    await dlg.getByRole('button', { name: 'Continue with Google' }).click();
    await expect.poll(() => authorize.length).toBeGreaterThan(0);
    const u = new URL(authorize[0] ?? 'http://x');
    expect(u.searchParams.get('provider')).toBe('google');
    expect(u.searchParams.get('redirect_to') ?? '').toMatch(/\/auth\/callback\?returnTo=%2Fquizzes$/);
  });

  test('phone: guest "You" tab opens the sign-in bottom sheet', async ({ page }) => {
    test.skip(widthOf(page) > 760, 'phone only');
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/quizzes');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await page.waitForFunction(() => document.querySelector('.ux-nav-signin:not([aria-busy])'));
    await page.locator('.ux-tab', { hasText: 'You' }).click();
    const dlg = page.getByRole('dialog', { name: 'Sign in to KpopQuiz' });
    await expect(dlg).toBeVisible();
    const box = await dlg.boundingBox();
    const vh = page.viewportSize()?.height ?? 844;
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(vh); // docked to the bottom
    expect(Math.round(box?.width ?? 0)).toBe(page.viewportSize()?.width);
    await expect(page).toHaveURL(/\/quizzes$/);
  });
});

// P1 request 1 (DESIGN-SPEC 16.5 / 16.9): on a client navigation the new page's H1
// takes the focus (tabindex -1, no ring) and the title updates; never on a first
// load. /q/<slug> has a loading.tsx: its skeleton commits first, the H1 streams in.
test.describe('client navigation', () => {
  test('focus moves to the new page H1, no ring, title updates', async ({ page }) => {
    await preparePage(page, 'light');
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await waitHydrated(page);
    // A dev server's Next.js badge sits over the Home tab at 390 (no-op on a build).
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    expect(await page.evaluate(() => document.activeElement === document.body), 'first load: focus untouched').toBe(true);

    const desktop = widthOf(page) > 760;
    const h1 = page.locator('#main h1').first();
    const noRing = (): Promise<string> => h1.evaluate((el) => getComputedStyle(el).outlineStyle);
    const steps: [string, RegExp][] = desktop
      ? [['.ux-links a[data-nav="quizzes"]', /\/quizzes$/], ['.ux-links a[data-nav="groups"]', /\/groups$/], ['.ux-links a[data-nav="blindtest"]', /\/blindtest$/], ['.ux-links a[data-nav="home"]', /\/$/]]
      : [['.ux-tab[href="/quizzes"]', /\/quizzes$/], ['.ux-tab[href="/blindtest"]', /\/blindtest$/], ['.ux-tab[href="/"]', /\/$/]];
    for (const [link, url] of steps) {
      const before = await page.title();
      await page.locator(link).click();
      await expect(page).toHaveURL(url, { timeout: 60_000 });
      await expect(h1).toBeFocused({ timeout: 15_000 });
      expect(await noRing()).toBe('none');
      await expect.poll(() => page.title(), { timeout: 15_000 }).not.toBe(before);
    }

    // A route with a loading.tsx: open a quiz from the list.
    await page.locator('.ux-links a[data-nav="quizzes"], .ux-tab[href="/quizzes"]').filter({ visible: true }).first().click();
    await expect(page).toHaveURL(/\/quizzes$/, { timeout: 60_000 });
    await expect(h1).toBeFocused({ timeout: 15_000 });
    await page.locator('#main a[href^="/q/"]').first().click();
    await expect(page).toHaveURL(/\/q\/[^/]+$/, { timeout: 60_000 });
    // The URL changes with the skeleton; the H1 streams in later (up to 30 s is awaited).
    await expect(h1).toBeFocused({ timeout: 35_000 });
    expect(await noRing()).toBe('none');
  });

  test('keyboard: Enter on a nav link lands on the new H1', async ({ page }) => {
    test.skip(widthOf(page) <= 760, 'desktop nav');
    await preparePage(page, 'light');
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await waitHydrated(page);
    const target = page.locator('.ux-links a[data-nav="groups"]');
    let reached = false;
    for (let i = 0; i < 15 && !reached; i++) {
      await page.keyboard.press('Tab');
      reached = await target.evaluate((el) => el === document.activeElement);
    }
    expect(reached).toBe(true);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/groups$/, { timeout: 60_000 });
    const h1 = page.locator('#main h1').first();
    await expect(h1).toBeFocused({ timeout: 15_000 });
    expect(await h1.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none');
  });

  // A page that focuses its own control on mount keeps it: the H1 focus is only for
  // pages that did not place the focus themselves (kit fixture /ux-v1/kit/focus).
  test('a page that focuses its own field on mount keeps that focus', async ({ page }) => {
    await preparePage(page, 'light');
    await guardWrites(page, env.supabaseUrl);
    const res = await page.goto('/ux-v1/kit');
    test.skip(!res || res.status() === 404 || !(await hasShell(page)), 'kit not served here (flag off)');
    await waitHydrated(page);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await page.locator('[data-kit="route-focus-link"]').click();
    await expect(page).toHaveURL(/\/ux-v1\/kit\/focus$/, { timeout: 60_000 });
    const field = page.locator('[data-kit="autofocus-field"]');
    await expect(field).toBeFocused({ timeout: 15_000 });
    await page.waitForTimeout(1500); // the shell's H1 watch must not take it back
    await expect(field).toBeFocused();
    // Back to the kit through a link inside the page: the kit's H1 takes the focus.
    await page.locator('[data-kit="back-to-kit"]').click();
    await expect(page).toHaveURL(/\/ux-v1\/kit$/, { timeout: 60_000 });
    await expect(page.locator('#main h1').first()).toBeFocused({ timeout: 35_000 });
  });
});

test.describe('nav fits', () => {
  for (const w of [1440, 1280, 1100]) {
    test(`at ${w}px: one line, no overlap`, async ({ page }) => {
      test.skip(widthOf(page) <= 760, 'desktop widths');
      await preparePage(page, 'light');
      await page.setViewportSize({ width: w, height: 900 });
      await guardWrites(page, env.supabaseUrl);
      await page.goto('/');
      test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
      const geo = await page.evaluate(() => {
        const r = (s: string): DOMRect => (document.querySelector(s) as HTMLElement).getBoundingClientRect();
        const links = Array.from(document.querySelectorAll<HTMLElement>('.ux-links a')).filter((a) => a.offsetParent !== null).map((a) => a.getBoundingClientRect());
        const ico = document.querySelector<HTMLElement>('.ux-links a .ux-ico');
        return { inner: r('.ux-nav-in'), linksRight: Math.max(...links.map((l) => l.right)), tops: [...new Set(links.map((l) => Math.round(l.top)))], right: r('.ux-nav-r'), count: links.length, icons: ico ? getComputedStyle(ico).display !== 'none' : false };
      });
      expect(geo.tops.length, 'links on one line').toBe(1);
      expect(geo.linksRight, 'links end before the right cluster').toBeLessThan(geo.right.left);
      expect(geo.right.right).toBeLessThanOrEqual(geo.inner.right + 0.5);
      expect(geo.count).toBe(w <= 1100 ? 5 : 6); // Leaderboard hides at 1100 and under (16.5)
      expect(geo.icons).toBe(w >= 1280); // icons hide under 1280 (the pill nav needs the room)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
    });
  }
});

signedInTest.describe('signed in (test user, read only)', () => {
  signedInTest('nav islands read the real account', async ({ page }) => {
    skipUnlessSignedIn();
    await preparePage(page, 'light');
    const calls = await guardWrites(page, env.supabaseUrl);
    await page.goto('/quizzes');
    signedInTest.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    const me = await (await page.request.get('/api/auth/me')).json() as { profile: { username: string } | null };
    expect(me.profile, 'GET /api/auth/me with the storage state = the test user').not.toBeNull();
    const bell = page.locator('.ux-nav-r button[aria-label^="Notifications"]');
    await expect(bell).toBeVisible();
    await expect(page.locator('.ux-nav-signin')).toHaveCount(0);
    if (widthOf(page) > 760) {
      await page.locator('.ux-avabtn').click();
      const menu = page.getByRole('dialog', { name: 'Your account' });
      await expect(menu).toBeVisible();
      await expect(menu).toContainText(me.profile?.username ?? '__none__');
      await expect(menu.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(page.locator('.ux-avabtn')).toBeFocused();
    }
    await bell.click();
    await expect(page.getByRole('dialog', { name: 'Notifications' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See all notifications' })).toHaveAttribute('href', '/notifications');
    expect(calls, 'no write attempted').toEqual([]);
  });
});
