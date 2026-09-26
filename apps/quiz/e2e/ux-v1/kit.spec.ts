import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { A0_LANDMARKS, compareLandmarks, loadReference } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

import type { Locator, Page } from '@playwright/test';

// /ux-v1/kit, the A0 gallery: every shared component in every state, light and
// dark, at the project width (ux-1440 / ux-390). Computed styles of the shared
// landmarks must equal the prototype reference (styles.json); sheets trap focus
// and close on X / Escape / backdrop with focus returning to the trigger.
// Skips on a flag-off build (the route 404s) and when the route is not reachable
// (it needs '/ux-v1/' in lib/route-allowlist.ts, requested from ORCH).

const env = loadTestEnv();
const SECTIONS = ['tokens', 'type', 'buttons', 'nav', 'section-headers', 'controls', 'quiz-cards', 'text-cards', 'posts', 'identity', 'badges', 'forms', 'sheets', 'feedback', 'viewer', 'route-focus', 'icons'];

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

  // P2 request 3: Segmented and UxDropdown with link options. Segmented is a <nav> of
  // real links in the server HTML (aria-current on the pick, same pill as the button
  // mode); once hydrated a plain click navigates softly, modified clicks stay the
  // browser's. Dropdown link items are <a role="menuitemradio" aria-checked> with a
  // count; Space picks; onNavigate hands the href to the page's router.
  test('link options: Segmented nav of links, UxDropdown link items, soft navigation', async ({ page }) => {
    const html = await (await page.request.get('/ux-v1/kit')).text();
    test.skip(!(await openKit(page)), 'kit not served here');
    const nav = html.match(/<nav[^>]*aria-label="Sort \(links\)"[^>]*>([\s\S]*?)<\/nav>/)?.[1] ?? '';
    expect(nav.match(/<a\b/g)?.length ?? 0, 'server HTML: 4 real links').toBe(4);
    expect(nav).toContain('href="/ux-v1/kit?kitsort=newest"');
    expect(nav.match(/aria-current="page"/g)?.length ?? 0).toBe(1);
    expect(nav).toMatch(/<a[^>]*href="\/ux-v1\/kit"[^>]*aria-current="page"|<a[^>]*aria-current="page"[^>]*href="\/ux-v1\/kit"/);

    const links = page.locator('[data-kit="link-controls"]').getByRole('navigation', { name: 'Sort (links)' });
    const buttons = page.locator('[data-kit="controls"]').getByRole('group', { name: 'Sort' });
    const props = ['background-color', 'color', 'font-size', 'font-weight', 'box-shadow', 'border-radius', 'padding-left', 'padding-right', 'height'];
    const styleOf = (l: Locator): Promise<Record<string, string>> => l.evaluate((el, ps) => {
      const cs = getComputedStyle(el);
      return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)]));
    }, props);
    await page.mouse.move(0, 0);
    expect(await styleOf(links.locator('a[aria-current="page"]')), 'picked link = pressed button').toEqual(await styleOf(buttons.locator('button[aria-pressed="true"]')));
    expect(await styleOf(links.locator('a:not([aria-current])').first()), 'other link = other button').toEqual(await styleOf(buttons.locator('button[aria-pressed="false"]').first()));

    const prevented = await links.getByRole('link', { name: 'Top rated' }).evaluate((a) => {
      const out: Record<string, boolean> = {};
      for (const [name, init] of [['ctrl', { ctrlKey: true }], ['meta', { metaKey: true }], ['shift', { shiftKey: true }]] as const) {
        let seen = true;
        const on = (e: Event): void => { seen = e.defaultPrevented; e.preventDefault(); };
        window.addEventListener('click', on);
        a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));
        window.removeEventListener('click', on);
        out[name] = seen;
      }
      return out;
    });
    expect(prevented, 'modified clicks are left to the browser').toEqual({ ctrl: false, meta: false, shift: false });

    await page.evaluate(() => { (window as unknown as { __kitMarker?: number }).__kitMarker = 1; });
    await links.getByRole('link', { name: 'Newest' }).click();
    await expect(page).toHaveURL(/\/ux-v1\/kit\?kitsort=newest$/);
    await expect(links.getByRole('link', { name: 'Newest' })).toHaveAttribute('aria-current', 'page');
    await expect(links.getByRole('link', { name: 'Trending' })).not.toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => (window as unknown as { __kitMarker?: number }).__kitMarker), 'soft navigation (no reload)').toBe(1);

    const trigger = page.locator('[data-kit="link-controls"]').getByRole('button', { name: 'Type (links)' });
    await trigger.click();
    const items = page.getByRole('menu', { name: 'Type (links)' }).getByRole('menuitemradio');
    await expect(items).toHaveCount(3);
    await expect(items.first()).toBeFocused();
    expect(await items.evaluateAll((els) => els.map((e) => [e.tagName, e.getAttribute('href'), e.querySelector('small')?.textContent ?? '']))).toEqual([
      ['A', '/ux-v1/kit?kitsort=newest&kittype=classic', '1,204'],
      ['A', '/ux-v1/kit?kitsort=newest&kittype=tf', '312'],
      ['A', '/ux-v1/kit?kitsort=newest&kittype=image', '88'],
    ]);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press(' ');
    await expect(page).toHaveURL(/kitsort=newest&kittype=tf$/);
    expect(await page.evaluate(() => (window as unknown as { __kitLastNav?: string }).__kitLastNav), 'onNavigate got the href').toBe('/ux-v1/kit?kitsort=newest&kittype=tf');
    await expect(page.getByRole('menu', { name: 'Type (links)' })).toBeHidden();
    await expect(page.locator('[data-kit="link-controls"]').getByRole('button', { name: /Type \(links\): True\/false/ })).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __kitMarker?: number }).__kitMarker)).toBe(1);
  });

  // P2 request 2: the card body inherits the prototype's 1.6 line height (eyebrow and
  // footer 20.8px at 13px) and stacked phone cards drop the title's top margin
  // (prototype `.qgrid.stack h3{margin-top:0}`). Against styles.json, whose cards have
  // two-line titles: a grid or rail card at the reference width has the reference
  // height, less one title line when its (real) title fits on one line; a two-line
  // stacked row (the kit stacks its longest real title first) has the reference height.
  test('quiz cards: body line heights and card heights as the prototype', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const sec = page.locator('[data-kit-section="quiz-cards"]');
    test.skip((await sec.locator('.ux-qcard').count()) === 0, 'no quizzes to show (data unavailable)');
    const lh = await sec.locator('.ux-qcard').first().evaluate((card) => ({
      qg: getComputedStyle(card.querySelector('.ux-qg') as Element).lineHeight,
      qf: getComputedStyle(card.querySelector('.ux-qf') as Element).lineHeight,
    }));
    expect(lh).toEqual({ qg: '20.8px', qf: '20.8px' });

    const ref = loadReference();
    const phone = widthOf(page) <= 760;
    const sets: [string, string][] = phone
      ? [['.ux-qgrid:not(.ux-qgrid-stack) > .ux-qcard', '390-light-home'], ['.ux-qgrid.ux-qgrid-stack > .ux-qcard', '390-light-quizzes']]
      : [['.ux-qgrid:not(.ux-qgrid-stack) > .ux-qcard', '1440-light-home']];
    for (const [sel, state] of sets) {
      const r = ref[state]?.['.qcard'];
      expect(r, `styles.json ${state} .qcard`).toBeTruthy();
      const want = { w: parseFloat(r?.width ?? '0'), h: parseFloat(r?.height ?? '0') };
      const cards = (await sec.locator(sel).evaluateAll((els) => els.map((el) => {
        const t = el.querySelector('.ux-qt') as HTMLElement;
        const box = el.getBoundingClientRect();
        const lh = parseFloat(getComputedStyle(t).lineHeight);
        return { w: box.width, h: box.height, lh, lines: Math.round(t.getBoundingClientRect().height / lh), top: getComputedStyle(t).marginTop };
      }))).filter((c) => Math.abs(c.w - want.w) < 1);
      expect(cards.length, `${state}: kit cards at the reference width ${want.w}px`).toBeGreaterThan(0);
      if (state !== '390-light-quizzes') {
        for (const c of cards) {
          const expected = want.h - (2 - c.lines) * c.lh;
          expect(Math.abs(c.h - expected), `${state}: ${c.lines}-line card ${c.h} vs ${expected}`).toBeLessThan(0.6);
        }
        continue;
      }
      for (const c of cards) expect(c.top).toBe('0px');
      const twoLine = cards.filter((c) => c.lines === 2);
      if (!twoLine.length) {
        test.info().annotations.push({ type: 'note', description: 'no two-line stacked title in the real data today: stack height not compared' });
        continue;
      }
      for (const c of twoLine) expect(Math.abs(c.h - want.h), `${state}: stacked card ${c.h} vs ${want.h}`).toBeLessThan(0.6);
    }
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

  // P4 request 5: share sheet opens on "Copy link"; on phones the challenge label wraps.
  test('share sheet: Copy link has the focus; phone label wraps under the title', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    await page.locator('[data-kit-open="share"]').click();
    const dlg = page.locator('.ux-layer [role="dialog"]').filter({ hasText: 'Share your score' });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('button', { name: 'Copy link' })).toBeFocused();
    const geo = await dlg.locator('.ux-flabel').evaluate((el) => {
      const small = el.querySelector('small') as HTMLElement;
      const a = el.getBoundingClientRect(); const s = small.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return { wrap: cs.flexWrap, rowGap: cs.rowGap, labelWidth: a.width, smallTop: s.top, labelTop: a.top, smallWidth: s.width };
    });
    if (widthOf(page) <= 760) {
      expect(geo.wrap).toBe('wrap');
      expect(geo.rowGap).toBe('2px');
      expect(geo.smallTop, 'the note drops under the label').toBeGreaterThan(geo.labelTop + 10);
    } else {
      expect(geo.wrap).toBe('nowrap');
    }
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
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
