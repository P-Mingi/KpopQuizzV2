import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

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
      expect(new URL(page.url()).pathname, 'the plain click opened the overlay, not /search').toBe('/');
      await expect(page.locator('#ux-sq')).toBeFocused();
      await page.locator('#ux-sq').fill('bts');
      // The body is P11's SearchResults slot (its rows are covered by p11.spec): the host
      // renders it under the field and keeps the typed query.
      await expect(dlg.locator('[data-p11="search"]')).toBeVisible();
      await expect(page.locator('#ux-sq')).toHaveValue('bts');
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

// P1 request 3, P2 request 1, P7 request 1 (link-set rule, COMMON done-when 5): the
// nav search control is a real <a href="/search"> in the server HTML. Hydrated, a
// plain click opens the overlay; modified clicks keep the browser's behaviour; and
// without JavaScript the link reaches the search page.
test.describe('search link', () => {
  test('server HTML links to /search; only a plain click opens the overlay', async ({ page }) => {
    await preparePage(page, 'light');
    await guardWrites(page, env.supabaseUrl);
    const res = await page.goto('/');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    const html = (await res?.text()) ?? '';
    const tag = html.match(/<a\b[^>]*class="ux-sbtn"[^>]*>/)?.[0] ?? '';
    expect(tag, 'server HTML: the search control is a link').toContain('href="/search"');
    await waitHydrated(page);
    const trigger = page.locator('.ux-sbtn');
    await expect(trigger).toHaveAttribute('href', '/search');
    // Which clicks does the page take over? Read defaultPrevented at the window (after
    // React's listener), then cancel it there so the probe navigates nowhere.
    const prevented = await trigger.evaluate((a) => {
      const out: Record<string, boolean> = {};
      for (const [name, init] of [['ctrl', { ctrlKey: true }], ['meta', { metaKey: true }], ['shift', { shiftKey: true }], ['alt', { altKey: true }], ['middle', { button: 1 }]] as const) {
        let seen = true;
        const on = (e: Event): void => { seen = e.defaultPrevented; e.preventDefault(); };
        window.addEventListener('click', on);
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
        window.removeEventListener('click', on);
        out[name] = seen;
      }
      return out;
    });
    expect(prevented, 'modified clicks are left to the browser').toEqual({ ctrl: false, meta: false, shift: false, alt: false, middle: false });
    const dlg = page.getByRole('dialog', { name: 'Search' });
    await expect(dlg).toBeHidden();
    await trigger.click();
    await expect(dlg).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
  });
});

test.describe('search link without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the search link opens the search page', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/');
    const trigger = page.locator('.ux-sbtn');
    test.skip((await trigger.count()) === 0, 'UX v1 flag is OFF on this build');
    await trigger.click();
    await expect(page).toHaveURL(/\/search$/, { timeout: 60_000 });
  });
});

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

  // P10 request 3: "You" follows its href for every visitor (prototype `go('you')`); a
  // guest lands on P10's passport invitation (/profile -> /me signed out: no read, no
  // write). The phone sign-in sheet (nav "Sign in") stays a bottom sheet.
  test('phone: guest "You" tab opens the passport invitation; the sign-in sheet is a bottom sheet', async ({ page }) => {
    test.skip(widthOf(page) > 760, 'phone only');
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/quizzes');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await page.waitForFunction(() => document.querySelector('.ux-nav-signin:not([aria-busy])'));

    await page.locator('.ux-nav-signin').click();
    const dlg = page.getByRole('dialog', { name: 'Sign in to KpopQuiz' });
    await expect(dlg).toBeVisible();
    const box = await dlg.boundingBox();
    const vh = page.viewportSize()?.height ?? 844;
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(vh); // docked to the bottom
    expect(Math.round(box?.width ?? 0)).toBe(page.viewportSize()?.width);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();

    const you = page.locator('.ux-tab', { hasText: 'You' });
    await expect(you).toHaveAttribute('href', '/profile');
    await you.click();
    await expect(page).toHaveURL(/\/me$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: 'Your K-pop passport' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('dialog', { name: 'Sign in to KpopQuiz' })).toBeHidden();
    await expect(page.locator('.ux-tab', { hasText: 'You' })).toHaveAttribute('aria-current', 'page');
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

// Nav fit (16.5) + owner request 1 of 2026-09-27 (A0 fix 5): 8px between the pills,
// shrinking evenly when the right cluster needs the room (the bar is 1120 wide from
// 1248px up, so 1280 and 1440 have the same room). One line, the links end before the
// right cluster, the cluster inside the bar, no horizontal scroll: guest (Create + Sign
// in) and signed in (Create, bell, avatar, and a streak pill up to 4 digits), light
// and dark.
interface NavGeo { tops: number; linksRight: number; right: { left: number; right: number }; innerRight: number; count: number; icons: boolean; gaps: number[]; overflow: number; streak: string | null }
function navGeo(page: Page): Promise<NavGeo> {
  return page.evaluate(() => {
    const r = (s: string): DOMRect => (document.querySelector(s) as HTMLElement).getBoundingClientRect();
    const links = Array.from(document.querySelectorAll<HTMLElement>('.ux-links a')).filter((a) => a.offsetParent !== null).map((a) => a.getBoundingClientRect());
    const ico = document.querySelector<HTMLElement>('.ux-links a .ux-ico');
    const right = r('.ux-nav-r');
    return {
      tops: new Set(links.map((l) => Math.round(l.top))).size,
      linksRight: Math.max(...links.map((l) => l.right)),
      right: { left: right.left, right: right.right },
      innerRight: r('.ux-nav-in').right,
      count: links.length,
      icons: ico ? getComputedStyle(ico).display !== 'none' : false,
      gaps: links.slice(1).map((b, i) => Math.round((b.left - (links[i]?.right ?? 0)) * 100) / 100),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      streak: document.querySelector('.ux-streak')?.textContent?.trim() ?? null,
    };
  });
}
function expectFits(geo: NavGeo, label: string): void {
  expect(geo.tops, `${label}: links on one line`).toBe(1);
  expect(geo.linksRight, `${label}: links end before the right cluster`).toBeLessThan(geo.right.left);
  expect(geo.right.right, `${label}: right cluster inside the bar`).toBeLessThanOrEqual(geo.innerRight + 0.5);
  expect(geo.overflow, `${label}: no horizontal scroll`).toBeLessThanOrEqual(0);
}

test.describe('nav fits', () => {
  for (const theme of THEMES) {
    for (const w of [1440, 1280, 1100]) {
      test(`at ${w}px (${theme}): one line, no overlap, 8px between the pills`, async ({ page }) => {
        test.skip(widthOf(page) <= 760, 'desktop widths');
        await preparePage(page, theme);
        await page.setViewportSize({ width: w, height: 900 });
        await guardWrites(page, env.supabaseUrl);
        await page.goto('/');
        test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
        await waitHydrated(page);
        await page.evaluate(() => document.fonts.ready);
        const geo = await navGeo(page);
        expectFits(geo, `guest ${w} ${theme}`);
        expect(geo.count).toBe(w <= 1100 ? 5 : 6); // Leaderboard hides at 1100 and under (16.5)
        expect(geo.icons).toBe(w >= 1280); // icons hide under 1280 (the pill nav needs the room)
        // owner request 1: the pills keep their 10px padding and 38px height, 8px apart
        expect(geo.gaps, 'gaps between the pills').toEqual(Array(geo.count - 1).fill(8));
        const pill = await page.locator('.ux-links a[aria-current="page"]').evaluate((a) => { const cs = getComputedStyle(a); return [cs.paddingLeft, cs.paddingRight, cs.height, cs.backgroundColor]; });
        expect(pill).toEqual(['10px', '10px', '38px', 'rgb(209, 58, 110)']);
      });
    }
  }
});

signedInTest.describe('nav fits, signed in (test user, read only)', () => {
  for (const theme of THEMES) {
    for (const w of [1440, 1280]) {
      signedInTest(`at ${w}px (${theme}): Create, streak pill, bell, avatar on one line`, async ({ page }) => {
        skipUnlessSignedIn();
        signedInTest.skip(widthOf(page) <= 760, 'desktop widths');
        await preparePage(page, theme);
        await page.setViewportSize({ width: w, height: 900 });
        const calls = await guardWrites(page, env.supabaseUrl);
        // The streak pill shows only for a live streak: the test user's own read first,
        // then the same read with a streak of N days played today (a read stub: the real
        // response with daily_streak / last_daily_date replaced) to prove the widest
        // pills fit. Nothing is written.
        let streak: number | null = null;
        await page.route((u) => u.pathname === '/api/auth/me', async (route) => {
          const res = await route.fetch();
          const j = await res.json() as { profile: Record<string, unknown> | null };
          if (streak !== null && j.profile) { j.profile.daily_streak = streak; j.profile.last_daily_date = new Date().toISOString().slice(0, 10); }
          await route.fulfill({ response: res, json: j });
        });
        const seen: Record<string, NavGeo> = {};
        for (const n of [null, 7, 42, 365, 1000]) {
          streak = n;
          await page.goto('/quizzes');
          signedInTest.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
          await expect(page.locator('.ux-avabtn')).toBeVisible({ timeout: 30_000 });
          if (n !== null) await expect(page.locator('.ux-streak')).toHaveText(String(n));
          await page.evaluate(() => document.fonts.ready);
          const geo = await navGeo(page);
          seen[String(n)] = geo;
          expectFits(geo, `signed in ${w} ${theme} streak ${n}`);
          await expect(page.locator('.ux-nav-r .ux-nav-create, .ux-nav-r button[aria-label^="Notifications"], .ux-avabtn')).toHaveCount(3);
          expect(geo.count).toBe(6);
          expect(geo.icons).toBe(true);
          const [lo, hi] = [Math.min(...geo.gaps), Math.max(...geo.gaps)];
          expect(hi - lo, 'the gaps shrink evenly').toBeLessThanOrEqual(0.1);
          expect(lo).toBeGreaterThanOrEqual(0);
          expect(hi).toBeLessThanOrEqual(8);
          if (geo.streak === null) expect(geo.gaps, 'no streak pill: the full 8px').toEqual(Array(5).fill(8));
        }
        // a longer streak never widens the gaps (the largest gap that fits)
        const order = ['7', '42', '365', '1000'].map((k) => seen[k]?.gaps[0] ?? -1);
        for (let i = 1; i < order.length; i++) expect(order[i] ?? -1).toBeLessThanOrEqual(order[i - 1] ?? -1);
        await signedInTest.info().attach(`nav-signed-${w}-${theme}.json`, { body: JSON.stringify(seen, null, 1), contentType: 'application/json' });
        expect(calls, 'no write attempted').toEqual([]);
      });
    }
  }
});

// A0 fix 6 (A0.md 12.5): from 761 to about 900px the desktop bar was wider than the
// window (sideways scroll: guest 24px at 800 and 63px at 761, 147px with a 4-digit
// streak pill). Up to 900px the chrome is the phone chrome (top bar + tab bar); from
// 901 to 959px a streak pill turns Create into its round icon. Every width from 761 to
// 1279px in 1px steps (one page load per state, then the viewport only: the media
// queries re-apply on each resize): no horizontal scroll, the right cluster inside the
// gutter, and the chrome of that band (desktop: the links on one line and clear of the
// right cluster). ux-1440 sweeps with a mouse, ux-390 with touch (44px targets; tablets
// are touch). Guest, and signed in with the test user's own read then the widest streak
// pill (4 digits) through a read stub; light and dark. Nothing is written.
const SWEEP_FROM = 761;
const SWEEP_TO = 1279;
const PHONE_CHROME_MAX = 900;
const ICON_CREATE_MAX = 959;

interface SweepGeo {
  overflow: number; links: number; tops: number; linksRight: number;
  rightLeft: number; rightRight: number; contentRight: number;
  tabbar: boolean; create: number | null; createLabel: boolean; avatar: boolean; signin: boolean; streak: boolean;
}
function sweepGeo(page: Page): Promise<SweepGeo> {
  return page.evaluate(() => {
    const shown = (s: string): HTMLElement | null => {
      const el = document.querySelector<HTMLElement>(s);
      return el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0 ? el : null;
    };
    const inner = document.querySelector('.ux-nav-in') as HTMLElement;
    const right = (document.querySelector('.ux-nav-r') as HTMLElement).getBoundingClientRect();
    const links = Array.from(document.querySelectorAll<HTMLElement>('.ux-links a')).map((a) => a.getBoundingClientRect()).filter((r) => r.width > 0);
    const create = shown('.ux-nav-create');
    const label = create?.querySelector('.ux-nav-create-t');
    return {
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      links: links.length,
      tops: new Set(links.map((l) => Math.round(l.top))).size,
      linksRight: links.length ? Math.max(...links.map((l) => l.right)) : 0,
      rightLeft: right.left,
      rightRight: right.right,
      contentRight: inner.getBoundingClientRect().right - parseFloat(getComputedStyle(inner).paddingRight),
      tabbar: Boolean(shown('.ux-tabbar')),
      create: create ? Math.round(create.getBoundingClientRect().width * 10) / 10 : null,
      createLabel: Boolean(label && label.getBoundingClientRect().width > 1),
      avatar: Boolean(shown('.ux-avabtn')),
      signin: Boolean(shown('.ux-nav-signin')),
      streak: Boolean(shown('.ux-streak')),
    };
  });
}

/** Sweeps the viewport width; returns what is wrong at each width and the least spare room per band. */
async function sweepWidths(page: Page, signedIn: boolean): Promise<{ problems: string[]; spare: Record<string, number> }> {
  const problems: string[] = [];
  const spare: Record<string, number> = {};
  const note = (band: string, v: number): void => { spare[band] = Math.min(spare[band] ?? Infinity, Math.round(v * 10) / 10); };
  for (let w = SWEEP_FROM; w <= SWEEP_TO; w++) {
    await page.setViewportSize({ width: w, height: 900 });
    const g = await sweepGeo(page);
    const bad = (m: string): void => { problems.push(`${w}px: ${m}`); };
    if (g.overflow > 0) bad(`scrolls sideways by ${g.overflow}px`);
    if (g.rightRight > g.contentRight + 0.5) bad(`right cluster ends ${(g.rightRight - g.contentRight).toFixed(1)}px into the gutter`);
    if (signedIn ? g.signin : !g.signin) bad(signedIn ? 'Sign in shown while signed in' : 'no Sign in for a guest');
    if (w <= PHONE_CHROME_MAX) {
      note('phone chrome 761-900', g.contentRight - g.rightRight);
      if (!g.tabbar) bad('no tab bar');
      if (g.links !== 0) bad(`${g.links} links in the top bar`);
      if (g.create !== null) bad('Create in the top bar');
      if (g.avatar) bad('avatar in the top bar');
    } else {
      const band = w <= ICON_CREATE_MAX ? 'desktop 901-959' : w <= 1100 ? 'desktop 960-1100' : 'desktop 1101-1279';
      note(band, g.rightLeft - g.linksRight);
      if (g.tabbar) bad('tab bar shown');
      if (g.links !== (w <= 1100 ? 5 : 6)) bad(`${g.links} links`);
      if (g.tops !== 1) bad('links on more than one line');
      if (g.linksRight >= g.rightLeft) bad('links run into the right cluster');
      if (g.create === null) bad('no Create');
      const icon = g.streak && w <= ICON_CREATE_MAX;
      if (g.createLabel === icon) bad(icon ? 'Create keeps its label next to a streak pill' : 'Create shows as an icon');
      if (signedIn && !g.avatar) bad('no avatar');
    }
  }
  return { problems, spare };
}

for (const theme of THEMES) {
  test(`no horizontal scroll from ${SWEEP_FROM} to ${SWEEP_TO}px, 1px steps, guest (${theme})`, async ({ page }) => {
    test.setTimeout(240_000);
    await preparePage(page, theme);
    const calls = await guardWrites(page, env.supabaseUrl);
    await page.goto('/');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await waitHydrated(page);
    await page.evaluate(() => document.fonts.ready);
    const { problems, spare } = await sweepWidths(page, false);
    await test.info().attach(`sweep-guest-${theme}.json`, { body: JSON.stringify({ widths: SWEEP_TO - SWEEP_FROM + 1, spare, problems }, null, 1), contentType: 'application/json' });
    expect(problems.slice(0, 25), `${problems.length} width(s) with a problem`).toEqual([]);
    expect(calls, 'no write attempted').toEqual([]);
  });

  signedInTest(`no horizontal scroll from ${SWEEP_FROM} to ${SWEEP_TO}px, 1px steps, signed in, no streak and a 4-digit streak (${theme})`, async ({ page }) => {
    skipUnlessSignedIn();
    signedInTest.setTimeout(420_000);
    await preparePage(page, theme);
    const calls = await guardWrites(page, env.supabaseUrl);
    let streak: number | null = null;
    await page.route((u) => u.pathname === '/api/auth/me', async (route) => {
      const res = await route.fetch();
      const j = await res.json() as { profile: Record<string, unknown> | null };
      if (streak !== null && j.profile) { j.profile.daily_streak = streak; j.profile.last_daily_date = new Date().toISOString().slice(0, 10); }
      await route.fulfill({ response: res, json: j });
    });
    const report: Record<string, { spare: Record<string, number>; problems: string[] }> = {};
    for (const n of [null, 1000]) {
      streak = n;
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/quizzes');
      signedInTest.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('.ux-avabtn')).toBeVisible({ timeout: 30_000 });
      if (n === null) await expect(page.locator('.ux-streak'), 'the test user has no live streak').toHaveCount(0);
      else await expect(page.locator('.ux-streak')).toHaveText(String(n));
      await page.evaluate(() => document.fonts.ready);
      report[`streak ${n}`] = await sweepWidths(page, true);
    }
    await signedInTest.info().attach(`sweep-signed-${theme}.json`, { body: JSON.stringify({ widths: SWEEP_TO - SWEEP_FROM + 1, ...report }, null, 1), contentType: 'application/json' });
    for (const [k, r] of Object.entries(report)) expect(r.problems.slice(0, 25), `${k}: ${r.problems.length} width(s) with a problem`).toEqual([]);
    expect(calls, 'no write attempted').toEqual([]);
  });
}

// A0 fix 6: the phone chrome on a tablet keeps what it keeps on a phone: 64px under
// the page for the tab bar (none in focus and create, none on Verse, which keeps its
// legacy chrome; the legacy 72px body room stops at 767px), and toasts above the tab bar.
test('tablet (800px) phone chrome: room under the page and toasts above the tab bar; none of it from 901px', async ({ page }) => {
  await preparePage(page, 'light');
  await guardWrites(page, env.supabaseUrl);
  await page.setViewportSize({ width: 800, height: 900 });
  await page.goto('/quizzes');
  test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
  await waitHydrated(page);
  const chrome = (): Promise<{ tabbar: boolean; body: string; app: string; under: number; toast: string }> => page.evaluate(() => {
    const foot = document.querySelector('.ux-foot') as HTMLElement;
    const probe = document.createElement('div');
    probe.className = 'ux-toast';
    document.body.appendChild(probe);
    const toast = getComputedStyle(probe).bottom;
    probe.remove();
    return {
      tabbar: getComputedStyle(document.querySelector('.ux-tabbar') as HTMLElement).display !== 'none',
      body: getComputedStyle(document.body).paddingBottom,
      app: getComputedStyle(document.querySelector('.ux-app') as HTMLElement).paddingBottom,
      under: Math.round((document.body.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom) * 100) / 100,
      toast,
    };
  });
  expect(await chrome()).toEqual({ tabbar: true, body: '0px', app: '64px', under: 64, toast: '84px' });
  const tb = await page.locator('.ux-tabbar').boundingBox();
  expect(tb && Math.round(tb.y + tb.height), 'tab bar docked at the bottom').toBe(900);
  await page.setViewportSize({ width: 901, height: 900 });
  expect(await chrome()).toEqual({ tabbar: false, body: '0px', app: '0px', under: 0, toast: '32px' });

  await page.setViewportSize({ width: 800, height: 900 });
  const verse = await page.goto('/verse');
  test.skip(!verse || verse.status() !== 200 || (await page.locator('.ux-tabbar').count()) > 0, '/verse not served with the legacy chrome here');
  const v = await page.evaluate(() => ({
    body: getComputedStyle(document.body).paddingBottom,
    app: getComputedStyle(document.querySelector('.ux-app') as HTMLElement).paddingBottom,
  }));
  expect(v, 'Verse: no v11 tab bar, .ux-app adds no room').toEqual({ body: '0px', app: '0px' });
});

// A0 fix 7: the legacy toast stack (components/ui/toast-provider.tsx, fixed 24px up, z 50)
// sat under the v11 tab bar (z 60) wherever the tab bar shows. Under the flag it carries
// data-toast-stack and a0.css puts it on the .ux-toast line (84px up) up to 900px, where
// the tab bar shows; desktop and create mode (no tab bar) keep 24px. A real toast needs a
// saving action (cheer, settings), so a toast is drawn into the stack the way the provider
// draws one (same classes) and its box is measured. Nothing is written.
test('legacy toast stack: above the tab bar up to 900px, 24px up from 901px and in create mode', async ({ page }) => {
  await preparePage(page, 'light');
  const calls = await guardWrites(page, env.supabaseUrl);
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/quizzes');
  test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
  await waitHydrated(page);
  await expect(page.locator('[data-toast-stack]'), 'one legacy toast stack, flagged').toHaveCount(1);
  const place = (): Promise<{ bottom: string; toastBottom: number; tabTop: number | null }> => page.evaluate(() => {
    const stack = document.querySelector('[data-toast-stack]') as HTMLElement;
    let t = stack.querySelector<HTMLElement>('[data-probe]');
    if (!t) {
      t = document.createElement('div');
      t.dataset.probe = '';
      t.className = 'px-4 py-3 rounded-lg text-sm font-medium shadow-sm border pointer-events-auto -translate-x-1/2 whitespace-nowrap bg-correct-bg text-correct-text border-correct';
      t.textContent = 'Saved';
      stack.appendChild(t);
    }
    const tab = document.querySelector('.ux-tabbar') as HTMLElement;
    return {
      bottom: getComputedStyle(stack).bottom,
      toastBottom: t.getBoundingClientRect().bottom,
      tabTop: getComputedStyle(tab).display === 'none' ? null : tab.getBoundingClientRect().top,
    };
  });
  const seen: Record<number, unknown> = {};
  for (const w of [390, 761, 820, 900, 901, 1280, 1440]) {
    await page.setViewportSize({ width: w, height: 900 });
    const p = await place();
    seen[w] = p;
    if (w <= 900) {
      expect(p.bottom, `${w}px: on the .ux-toast line`).toBe('84px');
      expect(p.tabTop, `${w}px: tab bar shown`).not.toBeNull();
      expect(p.toastBottom, `${w}px: the toast ends 20px above the tab bar`).toBeLessThanOrEqual((p.tabTop ?? 0) - 16);
    } else {
      expect(p.bottom, `${w}px: 24px up, as before`).toBe('24px');
      expect(p.tabTop, `${w}px: no tab bar`).toBeNull();
      expect(Math.round(p.toastBottom), `${w}px: toast bottom`).toBe(900 - 24);
    }
  }
  // create mode hides the tab bar: the stack stays 24px up
  await page.setViewportSize({ width: 820, height: 900 });
  await page.goto('/create');
  await waitHydrated(page);
  const c = await place();
  expect(c.tabTop, 'create mode: no tab bar').toBeNull();
  expect(c.bottom, 'create mode: 24px up').toBe('24px');
  await test.info().attach('legacy-toast.json', { body: JSON.stringify({ seen, create: c }, null, 1), contentType: 'application/json' });
  expect(calls, 'no write attempted').toEqual([]);
});

// X2-001: under the phone footer the prototype keeps 64px (the tab bar's room) and
// nothing else. The legacy `body { padding-bottom: 72px }` (globals.css, up to 767px,
// for the legacy tab bar) no longer stacks on .ux-app's 64px where the v11 tab bar is
// in the page; Verse routes, which keep the legacy tab bar, keep the legacy 72px.
for (const theme of THEMES) {
  test(`room under the footer: 64px on phones, none on desktop, legacy 72px on Verse (${theme})`, async ({ page }) => {
    await preparePage(page, theme);
    await guardWrites(page, env.supabaseUrl);
    await page.goto('/quizzes');
    test.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await waitHydrated(page);
    const room = (): Promise<{ body: string; app: string; under: number }> => page.evaluate(() => {
      const foot = document.querySelector('.ux-foot') as HTMLElement | null;
      // the page's end is the body box's bottom edge (its padding included); the
      // document's scrollHeight is rounded to whole pixels, so it is not used here
      return {
        body: getComputedStyle(document.body).paddingBottom,
        app: getComputedStyle(document.querySelector('.ux-app') as HTMLElement).paddingBottom,
        under: foot ? Math.round((document.body.getBoundingClientRect().bottom - foot.getBoundingClientRect().bottom) * 100) / 100 : -1,
      };
    });
    const phone = widthOf(page) <= 760;
    expect(await room()).toEqual({ body: '0px', app: phone ? '64px' : '0px', under: phone ? 64 : 0 });

    if (!phone) return;
    const verse = await page.goto('/verse');
    test.skip(!verse || verse.status() !== 200 || (await page.locator('.ux-tabbar').count()) > 0, '/verse not served with the legacy tab bar here');
    const v = await page.evaluate(() => ({
      body: getComputedStyle(document.body).paddingBottom,
      app: getComputedStyle(document.querySelector('.ux-app') as HTMLElement).paddingBottom,
    }));
    expect(v, 'Verse keeps the legacy room, .ux-app adds none').toEqual({ body: '72px', app: '0px' });
  });
}

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

  // X1-003 (prototype #avapop: `go('you');ptab('quizzes')`, `<small>1 draft</small>`):
  // "My quizzes" opens the personal passport on its Quizzes tab, from another page and
  // in place on the passport, and counts the create draft kept on this device.
  // /me is never loaded (its GET grants badge tiers and writes a passport snapshot):
  // every request to /me is answered here with the test user's public passport
  // (/u/<username>, cookie-free reads, same P10 tabs): the navigation's RSC fetch with
  // the RSC of /u/<username> for the same router headers (a real soft navigation), a
  // document with its HTML; a prefetch is aborted. The real menu and the real P10 tabs
  // run on the real URL; /me's server code never runs. /profile (a prerendered redirect
  // to /me, no page code per request) goes through, so the Passport link's prefetch is
  // observed as it is.
  signedInTest('account menu: My quizzes opens the passport Quizzes tab (also in place) with the draft count', async ({ page }) => {
    skipUnlessSignedIn();
    signedInTest.skip(widthOf(page) <= 760, 'the account menu sits in the top bar above 900px (phones and tablets: the You tab)');
    await preparePage(page, 'light');
    const calls = await guardWrites(page, env.supabaseUrl);
    await page.request.get('/api/auth/me');
    const me = await (await page.request.get('/api/auth/me')).json() as { profile: { username: string } | null };
    signedInTest.skip(!me.profile, '/api/auth/me did not return the test user');
    const username = me.profile?.username ?? '';
    const passport = await page.request.get(`/u/${encodeURIComponent(username)}`);
    signedInTest.skip(passport.status() !== 200, 'the public passport did not load (busy database)');
    const passportHtml = await passport.text();
    const toMe: string[] = [];
    await page.route((u) => u.pathname === '/me', async (route) => {
      const r = route.request();
      toMe.push(`${r.resourceType()} ${new URL(r.url()).pathname}`);
      const h = r.headers();
      if (r.resourceType() === 'document') {
        await route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: passportHtml });
      } else if (h['rsc'] === '1' && !h['next-router-prefetch'] && !h['next-router-segment-prefetch']) {
        const u = new URL(r.url());
        u.pathname = `/u/${encodeURIComponent(username)}`;
        await route.fulfill({ response: await route.fetch({ url: u.toString() }) });
      } else {
        await route.abort();
      }
    });
    const draft = JSON.stringify({
      title: 'Stray Kids b-sides deep cut', group_slug: 'stray-kids', newGroup: null, difficulty: 'medium', language: 'en', quiz_type: 'multiple_choice',
      cover: null, coverRights: false, creatorNote: '', questions: [{ question: '', options: ['', '', '', ''], correct: null, fun_fact: '' }], updatedAt: Date.now(),
    });
    await page.addInitScript((v) => { try { localStorage.setItem('kq_create_draft_v1', v); } catch { /* blocked */ } }, draft);

    await page.goto('/quizzes');
    signedInTest.skip(!(await hasShell(page)), 'UX v1 flag is OFF on this build');
    await waitHydrated(page);
    const menu = page.getByRole('dialog', { name: 'Your account' });
    await page.locator('.ux-avabtn').click();
    const mine = menu.getByRole('link', { name: /^My quizzes/ });
    await expect(mine).toHaveAttribute('href', '/me#p10-panel-quizzes');
    await expect(mine.locator('small')).toHaveText('1 draft');
    await page.waitForTimeout(1500);
    expect(toMe, 'opening the menu requests nothing from /me (no prefetch, none through /profile)').toEqual([]);

    // From another page: a soft navigation, the passport opens the tab from the hash.
    await page.evaluate(() => { (window as unknown as { __a0Nav?: number }).__a0Nav = 1; });
    await mine.click();
    await expect(page).toHaveURL(/\/me#p10-panel-quizzes$/, { timeout: 30_000 });
    const quizzesTab = page.locator('#p10-tab-quizzes');
    await expect(quizzesTab).toHaveAttribute('aria-selected', 'true', { timeout: 60_000 });
    await expect(page.locator('#p10-panel-quizzes')).toBeVisible();
    expect(toMe, 'one RSC fetch, no document load').toEqual(['fetch /me']);
    expect(await page.evaluate(() => (window as unknown as { __a0Nav?: number }).__a0Nav), 'soft navigation (same document)').toBe(1);

    // On the passport (tab moved back to Overview, hash unchanged): the tab switches
    // in place, no reload, no request.
    await waitHydrated(page);
    await page.locator('#p10-tab-overview').click();
    await expect(page.locator('#p10-tab-overview')).toHaveAttribute('aria-selected', 'true');
    await page.evaluate(() => { (window as unknown as { __a0Marker?: number }).__a0Marker = 1; });
    const before = toMe.length;
    await page.locator('.ux-avabtn').click();
    await expect(menu.getByRole('link', { name: /^My quizzes/ }).locator('small')).toHaveText('1 draft');
    await menu.getByRole('link', { name: /^My quizzes/ }).click();
    await expect(quizzesTab).toHaveAttribute('aria-selected', 'true');
    await expect(quizzesTab).toBeFocused();
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/\/me#p10-panel-quizzes$/);
    expect(await page.evaluate(() => (window as unknown as { __a0Marker?: number }).__a0Marker), 'same document (no reload)').toBe(1);
    expect(toMe.length, 'no request for the in-place switch').toBe(before);
    expect(calls, 'no write attempted').toEqual([]);
  });
});
