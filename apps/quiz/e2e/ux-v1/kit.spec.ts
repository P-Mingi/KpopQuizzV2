import fs from 'node:fs';

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

      // Both theme panes render their own tokens whatever the page theme is (light = the
      // warm ground of the owner request of 2026-09-27, A0 fix 5).
      const panes = await page.evaluate(() => ['light', 'dark'].map((t) => getComputedStyle(document.querySelector(`[data-kit-pane="${t}"]`) as HTMLElement).backgroundColor));
      expect(panes).toEqual(['rgb(250, 248, 245)', 'rgb(20, 19, 18)']);

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

    // Owner request of 2026-09-27 (A0 fix 5, owner-approved deviation): light page
    // ground = the live site's warm #FAF8F5 with a warm nav glass; cards, panels,
    // sheets, inputs and the tab bar stay white; surface fills keep their step. Dark:
    // every value as before.
    test('owner request: warm light page ground, white cards and fields, dark unchanged', async ({ page }) => {
      test.skip(!(await openKit(page)), 'kit not served here (flag off, or /ux-v1/ not allowlisted yet)');
      const phone = widthOf(page) <= 760;
      const fills = await page.evaluate((isPhone) => {
        const bg = (s: string, pseudo?: string): string | null => { const el = document.querySelector<HTMLElement>(s); return el ? getComputedStyle(el, pseudo).backgroundColor : null; };
        return {
          body: bg('body'), app: bg('.ux-app'), nav: bg('.ux-nav'),
          tabbar: isPhone ? bg('.ux-tabbar.ux-chrome') : null, tabbarSample: bg('.ux-tabbar[aria-label="Tab bar sample"]'),
          qcard: bg('.ux-qcard'), tcard: bg('.ux-tcard'), post: bg('.ux-post'), panel: bg('.ux-panel'), box: bg('.ux-box'), stats3: bg('.ux-stats3'), sheet: bg('.ux-kit-static .ux-sheet'),
          inp: bg('.ux-inp'), kbd: bg('.ux-kbd'), knob: bg('.ux-switch', '::after'),
          seg: bg('.ux-seg'), chip: bg('.ux-chip:not(.ux-chip-filter):not([aria-pressed="true"])'), foot: bg('.ux-foot'),
        };
      }, phone);
      const white = 'rgb(255, 255, 255)';
      const expected = theme === 'light'
        ? { body: 'rgb(250, 248, 245)', app: 'rgb(250, 248, 245)', nav: 'rgba(250, 248, 245, 0.94)', tabbar: phone ? 'rgba(255, 255, 255, 0.94)' : null, tabbarSample: 'rgba(255, 255, 255, 0.94)',
          qcard: white, tcard: white, post: white, panel: white, box: white, stats3: white, sheet: white, inp: white, kbd: white, knob: white,
          seg: 'rgb(241, 239, 234)', chip: 'rgb(241, 239, 234)', foot: 'rgb(241, 239, 234)' }
        : { body: 'rgb(20, 19, 18)', app: 'rgb(20, 19, 18)', nav: 'rgba(20, 19, 18, 0.84)', tabbar: phone ? 'rgba(20, 19, 18, 0.84)' : null, tabbarSample: 'rgba(20, 19, 18, 0.84)',
          qcard: 'rgb(28, 27, 25)', tcard: 'rgba(0, 0, 0, 0)', post: 'rgb(28, 27, 25)', panel: 'rgb(28, 27, 25)', box: 'rgb(28, 27, 25)', stats3: 'rgb(28, 27, 25)', sheet: 'rgb(28, 27, 25)',
          inp: 'rgb(20, 19, 18)', kbd: 'rgb(20, 19, 18)', knob: 'rgb(20, 19, 18)', seg: 'rgb(28, 27, 25)', chip: 'rgb(28, 27, 25)', foot: 'rgb(28, 27, 25)' };
      expect(fills).toEqual(expected);
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
  // A0 fix 8: the grid (and the phone rail) stretches every card of a row to its
  // tallest card, as the prototype's .qgrid does (default align stretch; .qb flex 1 and
  // the footer's auto top margin take the extra). So a card's own height is its height
  // less that margin, and it is compared per card; its painted height is compared
  // with the tallest own height of its row.
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
      const cards = (await sec.locator(sel).evaluateAll((els) => {
        const grids = [...new Set(els.map((el) => el.parentElement))];
        return els.map((el) => {
          const t = el.querySelector('.ux-qt') as HTMLElement;
          const f = el.querySelector('.ux-qf') as HTMLElement;
          const box = el.getBoundingClientRect();
          const tb = t.getBoundingClientRect();
          const lh = parseFloat(getComputedStyle(t).lineHeight);
          // what the row stretch added: the footer's auto top margin (0 on the row's tallest card)
          const stretch = f.getBoundingClientRect().top - tb.bottom;
          return {
            w: box.width, h: box.height, own: box.height - stretch, stretch, lh, lines: Math.round(tb.height / lh), top: getComputedStyle(t).marginTop,
            row: `${grids.indexOf(el.parentElement)}@${Math.round(box.top + window.scrollY)}`,
          };
        });
      })).filter((c) => Math.abs(c.w - want.w) < 1);
      expect(cards.length, `${state}: kit cards at the reference width ${want.w}px`).toBeGreaterThan(0);
      if (state !== '390-light-quizzes') {
        for (const c of cards) {
          expect(c.stretch, `${state}: the footer margin never goes negative`).toBeGreaterThanOrEqual(-0.01);
          const expected = want.h - (2 - c.lines) * c.lh;
          expect(Math.abs(c.own - expected), `${state}: ${c.lines}-line card, own height ${c.own} vs ${expected}`).toBeLessThan(0.6);
        }
        const rows = new Map<string, typeof cards>();
        for (const c of cards) rows.set(c.row, [...(rows.get(c.row) ?? []), c]);
        for (const [row, list] of rows) {
          const tallest = Math.max(...list.map((c) => c.own));
          for (const c of list) expect(Math.abs(c.h - tallest), `${state}: row ${row}, card ${c.h} vs the row's tallest ${tallest}`).toBeLessThan(0.6);
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

  // P11 request 4: the at-risk streak popover states the real rule (only the daily
  // quiz and the daily blindtest move the streak), as P11's streak row does.
  test('streak popover: the real rule (daily quiz or daily blindtest)', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const risk = page.getByRole('dialog', { name: 'Streak at risk (static)' });
    await expect(risk.locator('p')).toHaveText(/^Today is not played yet\. Play the daily quiz or the daily blindtest in the next \d+h \d+m to keep it\.$/);
    await expect(risk.getByRole('link', { name: "Play today's quiz" })).toHaveAttribute('href', '/daily');
    await expect(page.locator('[data-kit-section="nav"]')).not.toContainText('any quiz or blindtest');
  });

  // C1-002: the header picture sheet opens with its drop zone AT REST (prototype
  // #hsheet .drop: dashed --edge border, no fill), although the sheet moves focus into
  // the zone's file input. Measured without blurring anything. Keyboard focus still
  // shows the 16.9 ring (2px pink) on the zone.
  test('header picture sheet: the drop zone opens at rest; keyboard focus rings it', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const edge = await page.evaluate(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--ux-edge)';
      document.querySelector('.ux-page')?.appendChild(probe);
      const c = getComputedStyle(probe).color;
      probe.remove();
      return c;
    });
    const trigger = page.locator('[data-kit-open="header"]');
    const drop = page.locator('.ux-layer .ux-sheet .ux-drop');
    const look = (): Promise<Record<string, string>> => drop.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { border: cs.borderTopColor, style: cs.borderTopStyle, bg: cs.backgroundColor, outline: cs.outlineStyle, focusInside: String(el.contains(document.activeElement)) };
    });
    // Pointer: click the trigger, let the sheet move focus into the zone, pointer away.
    await trigger.click();
    await expect(drop).toBeVisible();
    await expect.poll(async () => (await look()).focusInside).toBe('true');
    await page.mouse.move(1, 1);
    expect(await look()).toEqual({ border: edge, style: 'dashed', bg: 'rgba(0, 0, 0, 0)', outline: 'none', focusInside: 'true' });
    await page.keyboard.press('Escape');
    await expect(drop).toBeHidden();
    // Keyboard: Enter on the trigger; the focused zone gets the 2px pink ring, still no fill.
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect.poll(async () => (await look()).focusInside).toBe('true');
    await page.mouse.move(1, 1);
    const kb = await drop.evaluate((el) => { const cs = getComputedStyle(el); return { outline: cs.outlineStyle, width: cs.outlineWidth, bg: cs.backgroundColor }; });
    expect(kb).toEqual({ outline: 'solid', width: '2px', bg: 'rgba(0, 0, 0, 0)' });
    // Pointer hover still shows the hover look.
    await drop.hover();
    await expect.poll(async () => (await look()).bg).not.toBe('rgba(0, 0, 0, 0)');
    await page.keyboard.press('Escape');
  });

  // P5 request 2: the sheet title is 18px / 1.6 (28.8px), letter-spacing -0.015em, as
  // the prototype's `.sh-h h3` (it inherits body 16px/1.6; h1-h3 get -0.015em).
  test('sheet title: 18px, line height 28.8px, letter-spacing -0.27px', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    await page.locator('[data-kit-open="share"]').click();
    const h = page.locator('.ux-layer .ux-sheet .ux-sh-h h2');
    await expect(h).toBeVisible();
    expect(await h.evaluate((el) => { const cs = getComputedStyle(el); return [cs.fontSize, cs.lineHeight, cs.letterSpacing, cs.fontWeight]; })).toEqual(['18px', '28.8px', '-0.27px', '600']);
    expect(Math.round((await h.boundingBox())?.height ?? 0)).toBe(29);
  });

  // P11 request 5: the search field shows no outline ring and no native clear button
  // (prototype `.sov-in input{outline:0}`); focus shows as the row's line turning into
  // a 2px pink line (16.9: 2px pink), gone when focus moves on.
  test('search field: no ring, no native clear button, a 2px pink line while focused', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    await page.locator('[data-kit-open="search"]').click();
    const field = page.locator('#ux-sq');
    await expect(field).toBeFocused();
    await field.fill('bts');
    const look = await field.evaluate((el) => {
      const cs = getComputedStyle(el);
      const row = getComputedStyle(el.closest('.ux-sov-in') as Element);
      const probe = document.createElement('span');
      probe.style.color = 'var(--ux-pink)';
      document.body.appendChild(probe);
      const pink = getComputedStyle(probe).color;
      probe.remove();
      return {
        outline: cs.outlineStyle,
        border: row.borderBottomColor === pink && row.borderBottomWidth === '1px',
        inset: row.boxShadow.includes(pink) && row.boxShadow.includes('inset'),
      };
    });
    expect(look).toEqual({ outline: 'none', border: true, inset: true });
    // No native clear button: the focused, filled field paints exactly as the same
    // field as a plain text input (which has none); forcing the button back makes
    // the paint differ, so the comparison would see one.
    await page.mouse.move(0, 0);
    const shot = (): Promise<Buffer> => field.screenshot({ animations: 'disabled', caret: 'hide' });
    const asSearch = await shot();
    await field.evaluate((el) => { (el as HTMLInputElement).type = 'text'; });
    const asText = await shot();
    await field.evaluate((el) => { (el as HTMLInputElement).type = 'search'; });
    expect(asSearch.equals(asText), 'no clear button drawn').toBe(true);
    const back = await page.addStyleTag({ content: '#ux-sq::-webkit-search-cancel-button { display: block !important; -webkit-appearance: searchfield-cancel-button !important; appearance: auto !important; }' });
    expect((await shot()).equals(asText), 'control: a forced clear button is visible to the check').toBe(false);
    await back.evaluate((el) => (el as ChildNode).remove());
    // Focus leaves the field (Tab to the results): the line is the hairline again.
    await page.locator('#ux-sov .ux-srow').first().waitFor({ timeout: 30_000 });
    await page.keyboard.press('Tab');
    await expect(field).not.toBeFocused();
    expect(await page.locator('.ux-sov-in').evaluate((el) => getComputedStyle(el).boxShadow)).toBe('none');
    await page.keyboard.press('Escape');
  });

  // P5 request 3: UxQuizCard preview mode (a draft on create step 3): the same card,
  // no link, one named image for assistive tech, a data: cover as a plain <img>, no
  // hover lift; same box styles as a linked card.
  test('quiz card preview mode: no link, data: cover, same card styles', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const sec = page.locator('[data-kit-section="quiz-cards"]');
    const card = sec.locator('.ux-qcard.is-preview');
    test.skip((await card.count()) === 0, 'no quizzes to show (data unavailable)');
    expect(await card.evaluate((el) => el.tagName)).toBe('DIV');
    await expect(card).toHaveAttribute('role', 'img');
    await expect(card).toHaveAttribute('aria-label', /^Preview: .+, .+, (Easy|Medium|Hard)$/);
    await expect(card.locator('a')).toHaveCount(0);
    expect(await card.locator('img').getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    await expect(card.locator('.ux-qpl')).toHaveText('New');
    const linked = sec.locator('.ux-qgrid:not(.ux-qgrid-stack) > a.ux-qcard').first();
    const props = ['border-top-width', 'border-top-color', 'border-radius', 'background-color', 'padding-top', 'width'];
    const styleOf = (l: Locator): Promise<Record<string, string>> => l.evaluate((el, ps) => { const cs = getComputedStyle(el); return Object.fromEntries(ps.map((p) => [p, cs.getPropertyValue(p)])); }, props);
    await page.mouse.move(0, 0);
    expect(await styleOf(card)).toEqual(await styleOf(linked));
    const before = await styleOf(card);
    await card.hover();
    await page.waitForTimeout(300);
    expect(await styleOf(card), 'no hover state on a preview').toEqual(before);
    expect(await card.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
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

  // P2 request 4: `showValue={false}` keeps the trigger at its label once a value is
  // picked (prototype #quizzes: `ddPick` never renames the trigger there, the chip shows
  // the pick), so the three menus keep their width and stay on one line at 390. The
  // pick stays in the accessible name. The default (hub and group filters) is unchanged.
  test('dropdown showValue={false}: the trigger keeps its label and width; the chip shows the pick', async ({ page }) => {
    test.skip(!(await openKit(page)), 'kit not served here');
    const box = page.locator('[data-kit="keep-label"]');
    const triggers = box.locator('button.ux-dd');
    await expect(triggers).toHaveCount(3);
    const read = (): Promise<{ text: string; name: string | null; w: number; top: number }[]> => triggers.evaluateAll((els) => els.map((b) => {
      const r = b.getBoundingClientRect();
      return { text: (b as HTMLElement).innerText.trim(), name: b.getAttribute('aria-label'), w: r.width, top: r.top };
    }));

    const picked = await read();
    expect(picked.map((t) => t.text), 'visible text = the label only').toEqual(['Type', 'Level', 'Group']);
    await expect(box.getByRole('button', { name: 'Type: True/false' })).toHaveAttribute('aria-haspopup', 'menu');
    await expect(box.getByRole('button', { name: 'Level: Hard' })).toBeVisible();
    await expect(box.getByRole('button', { name: 'Group: Stray Kids' })).toBeVisible();
    expect(new Set(picked.map((t) => Math.round(t.top))).size, `one line at ${widthOf(page)}px`).toBe(1);
    // prototype.html #quizzes `.dd` Type / Level / Group, 1440 and 390, before and after
    // ddPick (measured in Chromium 1234): 91.58, 93.94, 100.09
    [91.58, 93.94, 100.09].forEach((w, i) => expect(Math.abs(picked[i]!.w - w), `${picked[i]!.text} width = prototype`).toBeLessThanOrEqual(0.5));
    const chips = box.getByRole('group', { name: 'Active filters (kept labels)' });
    for (const c of ['True/false', 'Hard', 'Stray Kids']) await expect(chips.getByRole('button', { name: `Remove filter ${c}` })).toBeVisible();

    // Removing the picks changes neither the text nor the width of the triggers.
    for (const c of ['True/false', 'Hard', 'Stray Kids']) await chips.getByRole('button', { name: `Remove filter ${c}` }).click();
    await expect(chips.getByRole('button')).toHaveCount(0);
    const clear = await read();
    expect(clear.map((t) => [t.text, t.name])).toEqual([['Type', null], ['Level', null], ['Group', null]]);
    clear.forEach((t, i) => expect(Math.abs(t.w - picked[i]!.w), `${t.text} width with and without a pick`).toBeLessThanOrEqual(0.01));

    // Picking from the menu: the item is checked, the chip appears, the trigger text stays.
    await box.getByRole('button', { name: 'Type' }).click();
    await page.getByRole('menuitemradio', { name: 'Image' }).click();
    await expect(chips.getByRole('button', { name: 'Remove filter Image' })).toBeVisible();
    const typeBtn = box.getByRole('button', { name: 'Type: Image' });
    await expect(typeBtn).toHaveText('Type');
    await expect(typeBtn).toBeFocused();
    await typeBtn.click();
    await expect(page.getByRole('menuitemradio', { name: 'Image' })).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Escape');

    // Default (showValue unset, the P3 hub's look): the pick is written into the trigger.
    const dflt = page.locator('[data-kit="controls"] > .ux-kit-row button.ux-dd').first();
    await expect(dflt).toHaveText('Type: True/false');
    await expect(dflt).not.toHaveAttribute('aria-label');
    await expect(dflt.locator('b')).toHaveText('True/false');
  });

  // X2-008: a sheet whose page passes no story of its own (quiz, challenge, post, passport
  // for a visitor) still has the prototype's four tiles; Story image draws a 1080 x 1920
  // PNG from the preview (photo, line 1, line 2) in the browser, shares it as a file where
  // the browser can, and downloads it otherwise; More apps attaches the same file. No
  // network write.
  test('share sheet default story image: four tiles, a 1080 x 1920 PNG, shared as a file or downloaded', async ({ page }) => {
    const writes: string[] = [];
    page.on('request', (r) => { if (r.method() !== 'GET' && r.method() !== 'HEAD') writes.push(`${r.method()} ${r.url()}`); });
    test.skip(!(await openKit(page)), 'kit not served here');
    const open = async (): Promise<Locator> => {
      await page.locator('[data-kit-open="share-default"]').click();
      const dlg = page.getByRole('dialog', { name: 'Share this quiz' });
      await expect(dlg).toBeVisible();
      return dlg;
    };

    // No file sharing here (desktop): a local download.
    await page.evaluate(() => { Object.defineProperty(navigator, 'canShare', { value: () => false, configurable: true }); });
    let dlg = await open();
    expect(await dlg.locator('.ux-shgrid .ux-shbtn').allInnerTexts()).toEqual(['Copy link', 'Story image', 'More apps', 'Discord']);
    const [download] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Story image' }).click()]);
    expect(download.suggestedFilename()).toBe('kpopquiz-story.png');
    const png = fs.readFileSync(await download.path());
    expect(png.subarray(1, 4).toString('latin1'), 'a PNG').toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)], '1080 x 1920').toEqual([1080, 1920]);
    await expect(page.getByTestId('ux-toast')).toHaveText('Story image saved');
    await page.keyboard.press('Escape');

    // File sharing supported (phones): the same card goes to navigator.share, no download.
    await page.evaluate(() => {
      const w = window as unknown as { __kitShares: unknown[] };
      w.__kitShares = [];
      Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: async (d: ShareData) => {
          const f = d.files?.[0];
          let photo = false;
          let size: number[] = [];
          if (f) {
            const bmp = await createImageBitmap(f);
            size = [bmp.width, bmp.height];
            const c = document.createElement('canvas');
            c.width = bmp.width; c.height = bmp.height;
            const x = c.getContext('2d')!;
            x.drawImage(bmp, 0, 0);
            // the plain ground is one colour across a row; the photo is not
            const row = Array.from({ length: 9 }, (_, i) => Array.from(x.getImageData(120 + i * 100, 700, 1, 1).data.slice(0, 3)).join(','));
            photo = new Set(row).size > 3;
          }
          w.__kitShares.push({ file: f ? [f.name, f.type, size] : null, photo, url: d.url ?? null, title: d.title ?? null });
        },
      });
    });
    let downloads = 0;
    page.on('download', () => { downloads++; });
    dlg = await open();
    await dlg.getByRole('button', { name: 'Story image' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __kitShares: unknown[] }).__kitShares.length)).toBe(1);
    await dlg.getByRole('button', { name: 'More apps' }).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { __kitShares: unknown[] }).__kitShares.length)).toBe(2);
    const shares = await page.evaluate(() => (window as unknown as { __kitShares: unknown[] }).__kitShares);
    expect(shares).toEqual([
      { file: ['kpopquiz-story.png', 'image/png', [1080, 1920]], photo: true, url: null, title: 'Share this quiz' },
      { file: ['kpopquiz-story.png', 'image/png', [1080, 1920]], photo: true, url: 'https://kpopquiz.org/q/ultimate-bts-era-quiz-only-real-armys-survive', title: 'Share this quiz' },
    ]);
    expect(downloads, 'no download when the file is shared').toBe(0);
    await page.keyboard.press('Escape');

    // A page with its own story keeps it (the result sheet's tile is the page's).
    await page.locator('[data-kit-open="share"]').click();
    await page.getByRole('dialog', { name: 'Share your score' }).getByRole('button', { name: 'Story image' }).click();
    await expect(page.getByTestId('ux-toast')).toHaveText('Saves a 1080 x 1920 story image');
    expect(writes, 'no network write').toEqual([]);
  });

  // X1-003: the account menu's "My quizzes" opens the personal passport's Quizzes tab
  // (P10's #p10-panel-quizzes deep link, prototype `go('you');ptab('quizzes')`) and,
  // like the prototype's `<small>1 draft</small>`, counts the create draft kept on
  // this device (the funnel's localStorage draft; no server read). A blank autosave
  // or an expired draft counts as none. The kit's static menu is the real AccountBody.
  test('account menu: My quizzes opens the passport Quizzes tab; draft count from this device', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(String(e)));
    test.skip(!(await openKit(page)), 'kit not served here');
    const link = (): Locator => page.getByRole('dialog', { name: 'Account (static)' }).getByRole('link', { name: /^My quizzes/ });
    await expect(link()).toHaveAttribute('href', '/me#p10-panel-quizzes');
    await expect(link().locator('small')).toHaveCount(0);

    const DAY = 86_400_000;
    const blankQ = { question: '', options: ['', '', '', ''], correct: null, fun_fact: '' };
    const draft = (over: Record<string, unknown>, ageDays: number): string => JSON.stringify({
      title: '', group_slug: 'stray-kids', newGroup: null, difficulty: 'medium', language: 'en', quiz_type: 'multiple_choice',
      cover: null, coverRights: false, creatorNote: '', questions: [blankQ], updatedAt: Date.now() - ageDays * DAY, ...over,
    });
    const cases: [string, string, string | null][] = [
      ['blank autosave of a /create visit (group preset by ?group=)', draft({}, 0), null],
      ['started: a title', draft({ title: 'Stray Kids b-sides deep cut' }, 2), '1 draft'],
      ['started: one answer typed', draft({ questions: [{ ...blankQ, options: ['', 'Han', '', ''] }] }, 1), '1 draft'],
      ['started but older than the funnel keeps (7 days)', draft({ title: 'Old draft' }, 8), null],
    ];
    for (const [name, value, count] of cases) {
      await page.evaluate((v) => localStorage.setItem('kq_create_draft_v1', v), value);
      expect(await openKit(page), name).toBe(true);
      if (count) {
        await expect(link().locator('small'), name).toHaveText(count);
        await expect(link(), name).toHaveAccessibleName(`My quizzes ${count}`);
      } else {
        await expect(link().locator('small'), name).toHaveCount(0);
        await expect(link(), name).toHaveAccessibleName('My quizzes');
      }
    }

    // The count sits at the right edge in the muted 13px of the prototype's `.mi small`.
    await page.evaluate((v) => localStorage.setItem('kq_create_draft_v1', v), cases[1]![1]);
    expect(await openKit(page)).toBe(true);
    await expect(link().locator('small')).toHaveText('1 draft');
    const m = await link().evaluate((a) => {
      const s = a.querySelector('small') as HTMLElement;
      const cs = getComputedStyle(s);
      const muted = getComputedStyle(document.documentElement).getPropertyValue('--ux-muted').trim();
      const probe = document.createElement('span');
      probe.style.color = muted;
      document.body.append(probe);
      const mutedRgb = getComputedStyle(probe).color;
      probe.remove();
      return { size: cs.fontSize, color: cs.color, mutedRgb, gap: a.getBoundingClientRect().right - parseFloat(getComputedStyle(a).paddingRight) - s.getBoundingClientRect().right };
    });
    expect(m.size).toBe('13px');
    expect(m.color).toBe(m.mutedRgb);
    expect(Math.abs(m.gap), 'right-aligned').toBeLessThanOrEqual(0.5);
    await page.evaluate(() => localStorage.removeItem('kq_create_draft_v1'));
    expect(errors.filter((e) => /hydrat|did not match|didn't match|server rendered/i.test(e)), 'no hydration mismatch').toEqual([]);
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
