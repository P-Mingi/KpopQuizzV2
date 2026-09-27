import { test, expect } from '@playwright/test';

import { basicA11y, focusRing, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, widthOf } from './helpers/setup-page';

import type { Page } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';
import type { Theme } from './helpers/setup-page';

// P2: /quizzes, the one browse page (DESIGN-SPEC 7, 16.7, 17.3, 17.11; prototype
// state `quizzes`), flag on, at the project width (ux-1440 / ux-390), light and dark.
// Real published quizzes read from production (read only); every mutating request
// is answered by guardWrites and must never happen here (browsing writes nothing).
// Counts are read from the page's own menus, never hard-coded, so the spec follows
// the live catalogue. Skips on a flag-off build.

const env = loadTestEnv();

// A dev server renders /quizzes on demand (seconds cold, more on a loaded machine).
test.describe.configure({ timeout: 180_000 });
signedInTest.describe.configure({ timeout: 180_000 });

const LANDMARKS: Landmark[] = [
  { proto: '.nav', impl: '.ux-nav', state: 'quizzes', box: ['width', 'height'] },
  { proto: '.links a.on', impl: '.ux-links a[aria-current="page"]', state: 'quizzes', box: ['height'] },
  // Width only: a card's height follows its title's line count (real titles). With the same
  // line count the card has the reference height (pixel pass, reports/P2.md section 7).
  { proto: '.qcard', impl: '.p2-grid .ux-qcard', state: 'quizzes', box: ['width'] },
];

const INTRO = 'Browse every K-pop quiz on the site, filter by group or type, and sort by trending, newest, or most played.';
const FAQ_QS = ['Are the K-pop quizzes free?', 'How many K-pop quizzes are there?', 'Which K-pop groups can I take a quiz on?', 'Can I make my own K-pop quiz?'];
const PAGE = 48;

/** Open a /quizzes URL, wait for the islands; false when the flag is off. A render whose
 *  live reads lost the page's 5 s budget on this shared machine (counts off, or "Quizzes
 *  did not load") is re-requested, never skipped: the fail-soft states are real, but the
 *  assertions below need the data. */
async function openQuizzes(page: Page, url = '/quizzes'): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    const res = await page.goto(url);
    expect(res?.status(), `GET ${url}`).toBe(200);
    if (!(await hasShell(page)) || (await page.locator('.p2-page').count()) === 0) return false;
    const lost = (await page.locator('.p2-ctl[data-counts="off"]').count()) > 0
      || (await page.locator('.p2-empty b', { hasText: 'Quizzes did not load' }).count()) > 0;
    if (!lost || attempt >= 3) break;
  }
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.locator('.p2-ctl[data-ready]').waitFor({ timeout: 60_000 });
  await expect(page.locator('.p2-ctl[data-counts="live"]'), 'facet counts read').toHaveCount(1);
  return true;
}

async function setup(page: Page, theme: Theme = 'light'): Promise<StubbedCall[]> {
  await preparePage(page, theme);
  return guardWrites(page, env.supabaseUrl);
}

const cards = (page: Page) => page.locator('.p2-grid a.ux-qcard');
const menu = (page: Page, id: string) => page.locator(`.${id} + .ux-pop`);

/** Open a dropdown, return its items as { label, count, href }. */
async function menuItems(page: Page, id: string): Promise<{ label: string; count: number; href: string }[]> {
  await page.locator(`.${id}`).click();
  const m = menu(page, id);
  await expect(m).toBeVisible();
  const items = await m.locator('[role="menuitemradio"]').evaluateAll((els) => els.map((e) => ({
    label: (e.querySelector('span')?.textContent ?? '').trim(),
    count: Number((e.querySelector('small')?.textContent ?? '0').replace(/,/g, '')),
    href: e.getAttribute('href') ?? '',
  })));
  return items;
}

/** After a soft navigation: the URL matches, the islands of the new render are live, and
 *  the render has its counts (a render that lost its reads is re-requested, as in openQuizzes). */
async function settled(page: Page, url: RegExp): Promise<void> {
  await expect(page).toHaveURL(url, { timeout: 60_000 });
  await expect(page.locator('.p2-results[aria-busy="true"]')).toHaveCount(0, { timeout: 60_000 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const lost = (await page.locator('.p2-ctl[data-counts="off"]').count()) > 0
      || (await page.locator('.p2-empty b', { hasText: 'Quizzes did not load' }).count()) > 0;
    if (!lost) return;
    await page.reload();
    await page.locator('.p2-ctl[data-ready]').waitFor({ timeout: 60_000 });
  }
}

async function hrefs(page: Page, sel: string): Promise<string[]> {
  return page.locator(sel).evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
}

for (const theme of THEMES) {
  test.describe(`quizzes ${theme}`, () => {
    test('SEO lock, grid, sort + filters, landmarks, no horizontal scroll, a11y', async ({ page }, info) => {
      const writes = await setup(page, theme);
      test.skip(!(await openQuizzes(page)), 'UX v1 flag is OFF on this build');

      // SEO lock: the live metadata, H1, intro, breadcrumb, FAQ and JSON-LD.
      await expect(page).toHaveTitle(/^K-pop Quizzes: \d+\+ Free Fan-Made Tests, Every Group/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Browse \d+\+ free K-pop quizzes made by fans\./);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/quizzes$/);
      await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute('href', /\/pt\/quizzes$/);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('K-pop quizzes');
      await expect(page.locator('.p2-ph p')).toHaveText(INTRO);
      await expect(page.locator('.p2-crumb a[href="/"]')).toHaveText('Home');
      await expect(page.locator('.p2-crumb [aria-current="page"]')).toHaveText('Browse All Quizzes');
      await expect(page.locator('.p2-faq summary')).toHaveText(FAQ_QS);
      // The prototype's accordion: the first answer open, every answer in the server HTML.
      await expect(page.locator('.p2-acc[open]')).toHaveCount(1);
      await expect(page.locator('.p2-acc').first()).toHaveAttribute('open', '');
      await expect(page.locator('.p2-acc-a')).toHaveCount(FAQ_QS.length);
      const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as Record<string, unknown>);
      const byType = (t: string) => ld.find((j) => j['@type'] === t) as Record<string, unknown> | undefined;
      expect((byType('FAQPage')?.mainEntity as { name: string }[]).map((q) => q.name)).toEqual(FAQ_QS);
      expect((byType('BreadcrumbList')?.itemListElement as { name: string }[]).map((i) => i.name)).toEqual(['Home', 'Browse All Quizzes']);

      // The grid: 48 real quiz links, no quiz twice, the ItemList lists exactly them.
      await expect(cards(page)).toHaveCount(PAGE);
      const grid = await hrefs(page, '.p2-grid a.ux-qcard');
      expect(new Set(grid).size).toBe(PAGE);
      expect(grid.every((h) => /^\/q\/[a-z0-9-]+$/.test(h))).toBe(true);
      const items = (byType('ItemList')?.itemListElement as { url: string }[]).map((i) => new URL(i.url).pathname);
      expect(items).toEqual(grid);
      const first = cards(page).first();
      await expect(first.locator('.ux-qg')).not.toBeEmpty();
      await expect(first.locator('.ux-qlv')).toHaveText(/^(Easy|Medium|Hard)$/);
      await expect(first.locator('.ux-qpl')).toHaveText(/^([\d.,]+k? plays|New)$/);

      // Sort: four links, the live default (most played) is the current one and is /quizzes.
      await expect(page.locator('.p2-sort a')).toHaveText(['Trending', 'Newest', 'Most played', 'Top rated']);
      expect(await hrefs(page, '.p2-sort a')).toEqual(['/quizzes?sort=trending', '/quizzes?sort=newest', '/quizzes', '/quizzes?sort=top_rated']);
      await expect(page.locator('.p2-sort a[aria-current="page"]')).toHaveText('Most played');
      for (const id of ['p2-dd-type', 'p2-dd-level', 'p2-dd-group']) {
        await expect(page.locator(`.${id}`)).toHaveAttribute('aria-haspopup', 'menu');
        await expect(page.locator(`.${id}`)).toHaveAttribute('aria-expanded', 'false');
      }
      await expect(page.locator('.p2-dd')).toHaveText(['Type', 'Level', 'Group']);

      // Pagination is a real link; the live browse links are all kept (+ /search).
      await expect(page.locator('.p2-more a[rel="next"]')).toHaveAttribute('href', '/quizzes?page=2');
      await expect(page.locator('.p2-more a[rel="next"]')).toHaveText('Load more quizzes');
      expect(await hrefs(page, '.p2-mesh a')).toEqual([
        '/quizzes/popular-today', '/quizzes/popular-this-week', '/quizzes/popular-this-month', '/trending', '/new', '/most-liked', '/search',
      ]);

      // Phones: bordered rows + "Create a quiz" in the header; desktop: photo cards, no header Create.
      const phone = widthOf(page) < 760;
      await expect(page.locator('.p2-create')).toBeVisible({ visible: phone });
      if (phone) await expect(page.locator('.p2-create')).toHaveAttribute('href', '/create');
      expect(await first.evaluate((e) => getComputedStyle(e).flexDirection)).toBe(phone ? 'row' : 'column');

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, LANDMARKS);
      await info.attach('landmarks-quizzes.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);

      // An open menu passes axe too (role=menu of menuitemradio links).
      await page.locator('.p2-dd-type').click();
      await expect(menu(page, 'p2-dd-type')).toBeVisible();
      const axeMenu = await runAxe(page, { include: '.p2-ctl' });
      if (axeMenu) expect(axeMenu, 'axe on the open Type menu').toEqual([]);
      await page.keyboard.press('Escape');
      expect(writes, 'browsing writes nothing').toEqual([]);
    });

    test('Type + Level narrow the grid with real counts; chips remove a filter and return focus', async ({ page }) => {
      const writes = await setup(page, theme);
      test.skip(!(await openQuizzes(page)), 'UX v1 flag is OFF on this build');

      // Type menu: real counts; keyboard (first item focused, arrows, Escape returns focus).
      const types = await menuItems(page, 'p2-dd-type');
      expect(types.map((t) => t.label)).toEqual(expect.arrayContaining(['Classic', 'True/false']));
      expect(types.every((t) => t.count > 0)).toBe(true);
      const m = menu(page, 'p2-dd-type');
      await expect(m.locator('[role="menuitemradio"]').first()).toBeFocused();
      await page.keyboard.press('ArrowDown');
      await expect(m.locator('[role="menuitemradio"]').nth(1)).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(m).toBeHidden();
      await expect(page.locator('.p2-dd-type')).toBeFocused();

      // Pick True/false: the URL, the chip, the grid size and the live region agree with the count.
      const tf = types.find((t) => t.label === 'True/false');
      expect(tf, 'True/false offered').toBeTruthy();
      await page.locator('.p2-dd-type').click();
      await menu(page, 'p2-dd-type').getByRole('menuitemradio', { name: /True\/false/ }).click();
      await settled(page, /\/quizzes\?type=tf$/);
      await expect(page.locator('.p2-dd-type')).toBeFocused();
      await expect(page.locator('.p2-chip')).toHaveCount(1);
      await expect(page.locator('.p2-chip')).toHaveAttribute('aria-label', 'Remove True/false filter');
      await expect(cards(page)).toHaveCount(Math.min(tf!.count, PAGE));
      await expect(page.getByTestId('ux-live')).toHaveText(`${tf!.count} quizzes`);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/quizzes$/);
      await expect(page.locator('.p2-more a[rel="next"]')).toHaveCount(tf!.count > PAGE ? 1 : 0);

      // Level inside the type: counts are counted with the type applied.
      const levels = await menuItems(page, 'p2-dd-level');
      expect(levels.map((l) => l.label).every((l) => ['Easy', 'Medium', 'Hard'].includes(l))).toBe(true);
      expect(levels.reduce((s, l) => s + l.count, 0)).toBe(tf!.count);
      const pick = levels[levels.length - 1]!;
      await menu(page, 'p2-dd-level').getByRole('menuitemradio', { name: new RegExp(`^${pick.label}`) }).click();
      await settled(page, new RegExp(`type=tf&level=${pick.label.toLowerCase()}$`));
      await expect(page.locator('.p2-chip')).toHaveCount(2);
      await expect(cards(page)).toHaveCount(Math.min(pick.count, PAGE));
      await expect(cards(page).first().locator('.ux-qlv')).toHaveText(pick.label);
      await expect(page.getByTestId('ux-live')).toHaveText(`${pick.count} ${pick.count === 1 ? 'quiz' : 'quizzes'}`);

      // Remove the Type chip: back to the level alone, focus on the Type trigger.
      await page.locator('.p2-chip', { hasText: 'True/false' }).click();
      await settled(page, new RegExp(`/quizzes\\?level=${pick.label.toLowerCase()}$`));
      await expect(page.locator('.p2-dd-type')).toBeFocused();
      await expect(page.locator('.p2-chip')).toHaveCount(1);
      // Remove the last chip with the keyboard: Enter on a focused chip.
      await page.locator('.p2-chip').focus();
      await page.keyboard.press('Enter');
      await settled(page, /\/quizzes$/);
      await expect(page.locator('.p2-dd-level')).toBeFocused();
      await expect(page.locator('.p2-chip')).toHaveCount(0);
      await expect(cards(page)).toHaveCount(PAGE);
      expect(writes).toEqual([]);
    });

    test('sort links and the Group menu (under its trigger, inside the viewport)', async ({ page }) => {
      const writes = await setup(page, theme);
      test.skip(!(await openQuizzes(page)), 'UX v1 flag is OFF on this build');

      await page.locator('.p2-sort a', { hasText: 'Newest' }).click();
      await settled(page, /\/quizzes\?sort=newest$/);
      await expect(page.locator('.p2-sort a[aria-current="page"]')).toHaveText('Newest');
      await expect(page.locator('.p2-sort a', { hasText: 'Newest' })).toBeFocused();
      await expect(page.getByTestId('ux-live')).toHaveText(/^\d[\d,]* quizzes$/);
      // Keyboard: Tab moves along the sort links with the 2px pink ring (16.9).
      await page.keyboard.press('Tab');
      await expect(page.locator('.p2-sort a', { hasText: 'Most played' })).toBeFocused();
      const ring = await focusRing(page);
      expect(ring?.outline).toMatch(/^2px solid rgb\(232, 69, 122\)/);

      // Group menu: real counts, most first, the catch-all last; stays inside the viewport.
      const groups = await menuItems(page, 'p2-dd-group');
      expect(groups.length).toBeGreaterThan(10);
      const bands = groups.filter((g) => g.label !== 'General K-pop');
      expect(bands.map((g) => g.count)).toEqual([...bands.map((g) => g.count)].sort((a, b) => b - a));
      if (groups.some((g) => g.label === 'General K-pop')) expect(groups[groups.length - 1]!.label).toBe('General K-pop');
      // The prototype's placement: left edge = min(trigger left, window width - 216), 6px below.
      await page.waitForTimeout(250); // the menu's open transition (scale) settles
      const box = await menu(page, 'p2-dd-group').boundingBox();
      const trig = await page.locator('.p2-dd-group').boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(widthOf(page) - 15);
      expect(Math.abs(box!.x - Math.min(trig!.x, widthOf(page) - 216))).toBeLessThanOrEqual(2);
      expect(Math.abs(box!.y - (trig!.y + trig!.height + 6))).toBeLessThanOrEqual(2);
      const bts = groups.find((g) => g.label === 'BTS')!;
      expect(bts.href).toBe('/quizzes?group=bts&sort=newest');
      await menu(page, 'p2-dd-group').getByRole('menuitemradio', { name: /^BTS/ }).click();
      await settled(page, /\/quizzes\?group=bts&sort=newest$/);
      await expect(cards(page)).toHaveCount(Math.min(bts.count, PAGE));
      const eyebrows = await page.locator('.p2-grid .ux-qg').allTextContents();
      expect(new Set(eyebrows)).toEqual(new Set(['BTS']));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/quizzes$/);

      // Back to the default order: the current sort link is plain /quizzes?group=bts.
      await page.locator('.p2-sort a', { hasText: 'Most played' }).click();
      await settled(page, /\/quizzes\?group=bts$/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/bts-quiz$/);
      expect(writes).toEqual([]);
    });
  });
}

test.describe('quizzes: pagination, empty states, endpoint', () => {
  test('Load more appends page 2 in place, updates the address, focuses the first new card', async ({ page }) => {
    const writes = await setup(page);
    test.skip(!(await openQuizzes(page)), 'UX v1 flag is OFF on this build');
    await page.locator('.p2-results[data-ready]').waitFor({ timeout: 60_000 });
    const before = await hrefs(page, '.p2-grid a.ux-qcard');
    const api = page.waitForResponse((r) => r.url().includes('/api/ux-v1/p2/quizzes?page=2'));
    await page.locator('.p2-more a[rel="next"]').click();
    const res = await api;
    expect(res.status()).toBe(200);
    await expect(cards(page)).toHaveCount(2 * PAGE, { timeout: 30_000 });
    await expect(page).toHaveURL(/\/quizzes\?page=2$/);
    await expect(cards(page).nth(PAGE)).toBeFocused();
    await expect(page.getByTestId('ux-live')).toHaveText(`${PAGE} more quizzes loaded`);
    await expect(page.locator('.p2-more a[rel="next"]')).toHaveAttribute('href', '/quizzes?page=3');
    const after = await hrefs(page, '.p2-grid a.ux-qcard');
    expect(after.slice(0, PAGE)).toEqual(before);
    expect(new Set(after).size).toBe(2 * PAGE);

    // A reload of the new address renders the same list on the server.
    await page.reload();
    await page.locator('.p2-results[data-ready]').waitFor({ timeout: 60_000 });
    expect(await hrefs(page, '.p2-grid a.ux-qcard')).toEqual(after);
    expect(writes).toEqual([]);
  });

  test('?page=2 is pages 1 and 2; the ItemList lists page 2; Previous page and Page 2 of N', async ({ page }) => {
    await setup(page);
    test.skip(!(await openQuizzes(page, '/quizzes?page=2')), 'UX v1 flag is OFF on this build');
    await expect(cards(page)).toHaveCount(2 * PAGE);
    const grid = await hrefs(page, '.p2-grid a.ux-qcard');
    const ld = (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as Record<string, unknown>);
    const list = ld.find((j) => j['@type'] === 'ItemList')!.itemListElement as { url: string; position: number }[];
    expect(list.map((i) => new URL(i.url).pathname)).toEqual(grid.slice(PAGE));
    expect(list[0]!.position).toBe(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/quizzes\?page=2$/);
    await expect(page.locator('.p2-faq')).toHaveCount(0);
    await expect(page.locator('.p2-pager a[rel="prev"]')).toHaveAttribute('href', '/quizzes');
    await expect(page.locator('.p2-pager')).toContainText(/Page 2 of \d+/);
    await page.locator('.p2-pager a[rel="prev"]').click();
    await expect(page).toHaveURL(/\/quizzes$/);
    await expect(cards(page)).toHaveCount(PAGE, { timeout: 60_000 });
  });

  test('a page past the end shows the first page and says so', async ({ page }) => {
    await setup(page);
    test.skip(!(await openQuizzes(page, '/quizzes?page=999')), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.p2-notice')).toHaveText(/^There is no page 999: this list has \d+\. Here is the first one\.$/);
    await expect(cards(page)).toHaveCount(PAGE);
    await expect(page.locator('.p2-more a[rel="next"]')).toHaveAttribute('href', '/quizzes?page=2');
  });

  test('empty states: no match (Clear filters) and a group without quizzes (make the first one)', async ({ page }) => {
    const writes = await setup(page);
    test.skip(!(await openQuizzes(page, '/quizzes?group=bts&type=intruder')), 'UX v1 flag is OFF on this build');
    const empty = page.locator('.p2-empty');
    await expect(empty.locator('b')).toHaveText('No quizzes match these filters');
    await expect(empty).toContainText('Try another level or group.');
    await expect(page.locator('.p2-chip')).toHaveCount(2);
    const clear = empty.getByRole('link', { name: 'Clear filters' });
    await expect(clear).toHaveAttribute('href', '/quizzes');
    await clear.click();
    await settled(page, /\/quizzes$/);
    await expect(page.locator('.p2-dd-type')).toBeFocused();
    await expect(cards(page)).toHaveCount(PAGE);

    await page.goto('/quizzes?group=chungha');
    await page.locator('.p2-ctl[data-ready]').waitFor({ timeout: 60_000 });
    await expect(page.locator('.p2-empty b')).toHaveText(/^No .+ quizzes yet$/);
    await expect(page.locator('.p2-empty').getByRole('link', { name: 'Make the first quiz' })).toHaveAttribute('href', '/create');
    await expect(page.locator('.p2-empty').getByRole('link', { name: 'Clear filters' })).toHaveAttribute('href', '/quizzes');
    // A group facet URL keeps the live canonical rule (-> the group page).
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/chungha-quiz$/);
    expect(writes).toEqual([]);
  });

  test('the Level facet follows the facet rule: noindex, canonical /quizzes', async ({ page }) => {
    await setup(page);
    test.skip(!(await openQuizzes(page, '/quizzes?level=hard')), 'UX v1 flag is OFF on this build');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/quizzes$/);
    await expect(page.locator('.p2-chip')).toHaveText(['Hard']);
    const levels = await page.locator('.p2-grid .ux-qlv').allTextContents();
    expect(new Set(levels)).toEqual(new Set(['Hard']));
  });

  test('load-more endpoint: same page as the page itself, card fields only, read only', async ({ request, page }) => {
    await setup(page);
    test.skip(!(await openQuizzes(page, '/quizzes?page=2')), 'UX v1 flag is OFF on this build');
    const grid = await hrefs(page, '.p2-grid a.ux-qcard');
    const r = await request.get('/api/ux-v1/p2/quizzes?page=2');
    expect(r.status()).toBe(200);
    const body = await r.json() as { quizzes: Record<string, unknown>[]; page: number; hasMore: boolean };
    expect(body.page).toBe(2);
    expect(body.hasMore).toBe(true);
    expect(body.quizzes.map((q) => `/q/${String(q.slug)}`)).toEqual(grid.slice(PAGE));
    expect(Object.keys(body.quizzes[0]!).sort()).toEqual(['cover_image_url', 'difficulty', 'group_name', 'group_slug', 'id', 'play_count', 'quiz_type', 'slug', 'title']);
    const bad = await request.get('/api/ux-v1/p2/quizzes?type=nope&level=nope&page=abc');
    expect(bad.status()).toBe(200);
    expect(((await bad.json()) as { page: number }).page).toBe(1);
  });
});

signedInTest.describe('quizzes signed in (test user, read only)', () => {
  signedInTest('the same browse page, and nothing is written', async ({ page }) => {
    skipUnlessSignedIn();
    const writes = await setup(page);
    test.skip(!(await openQuizzes(page)), 'UX v1 flag is OFF on this build');
    // The account island shows a busy "Sign in" until /api/auth/me answers (A0's shell).
    await expect(page.locator('.ux-nav-signin')).toHaveCount(0, { timeout: 45_000 });
    await expect(cards(page)).toHaveCount(PAGE);
    await page.locator('.p2-dd-level').click();
    await menu(page, 'p2-dd-level').getByRole('menuitemradio', { name: /^Easy/ }).click();
    await settled(page, /\/quizzes\?level=easy$/);
    await expect(page.locator('.p2-chip')).toHaveText(['Easy']);
    expect(writes, 'a signed-in browse writes nothing').toEqual([]);
  });
});
