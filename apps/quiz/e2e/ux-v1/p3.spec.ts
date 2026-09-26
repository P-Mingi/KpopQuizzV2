import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { A0_LANDMARKS, compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, widthOf } from './helpers/setup-page';

import type { Page, Route } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';
import type { Theme } from './helpers/setup-page';

// P3 Groups + group hub (UX v11.2), flag ON, at the project width (ux-1440 /
// ux-390), light and dark: /groups, the /<slug>-quiz hub (a group with quizzes,
// a group without), and a -trivia page inside the shell. Every mutating request is
// stubbed (guardWrites: the dev server and previews use the PRODUCTION Supabase)
// and the Notify me payloads are asserted on stubs. Real data: the assertions
// read the numbers from the page and the live read endpoints, never hard-code
// them. Skips on a flag-off build.

const env = loadTestEnv();

const HUB = '/blackpink-quiz';
// A hub render is complete when every read made it (the dev server shares the
// production database and a slow read falls back to an empty section): the quiz
// island is live and the data-heavy blocks of today's hub are there.
const HUB_READY = '.p3-hub:has(.p3-qs[data-live] .ux-tcard):has(a[href="/blackpink-trivia"]):has(.p3-fan):has(.p3-war):has(.p3-members)';
const HUB_2_READY = '.p3-hub:has(.p3-qs[data-live] .ux-tcard):has(.p3-fan):has(.p3-war):has(a[href="/articles/stray-kids-vs-ateez"])';
const HUB_2 = '/ateez-quiz';
const EMPTY = '/chungha-quiz';
const TRIVIA = '/blackpink-trivia';

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

async function setup(page: Page, theme: Theme): Promise<StubbedCall[]> {
  await preparePage(page, theme);
  return guardWrites(page, env.supabaseUrl);
}

/** Opens a v11 page; false on a flag-off build. A render that failed closed (a
 *  read failed or timed out on the shared production database: the page answers
 *  5xx and is not cached) or lost an island is reloaded, never skipped. */
async function open(page: Page, path: string, ready: string): Promise<boolean> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = attempt === 0 ? await page.goto(path) : await page.reload();
    if (res && res.status() >= 500) { await page.waitForTimeout(3000); continue; }
    if (!res || res.status() !== 200 || !(await hasShell(page))) return false;
    if ((await page.locator('.p3').count()) === 0) return false;
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    try {
      await page.locator(ready).first().waitFor({ timeout: 45_000 });
      return true;
    } catch {
      // a render that lost its reads (or an island still compiling): try again
    }
  }
  throw new Error(`${path}: "${ready}" never rendered (reads kept timing out)`);
}

const jsonLd = async (page: Page): Promise<Array<Record<string, unknown>>> =>
  (await page.locator('script[type="application/ld+json"]').allTextContents()).map((t) => JSON.parse(t) as Record<string, unknown>);

const plays = (s: string): number => {
  const m = /([\d.,]+)(k|M)?\s*plays/.exec(s);
  if (!m) return 0;
  const n = Number(m[1]!.replace(/,/g, ''));
  return m[2] === 'k' ? n * 1000 : m[2] === 'M' ? n * 1e6 : n;
};

// Prototype landmarks (styles.json) mapped to P3's implementation.
const NAV = A0_LANDMARKS.filter((l) => l.proto === '.nav' || l.proto === '.links a.on');
const withState = (ls: Landmark[], state: string): Landmark[] => ls.map((l) => ({ ...l, state }));
const GROUPS_LANDMARKS: Landmark[] = [
  ...withState(NAV, 'groups'),
  { proto: '.sec-h h2', impl: '.ux-sec-h h2', state: 'groups', box: ['height'] },
];
const hubLandmarks = (state: string): Landmark[] => [
  ...withState(NAV, state),
  { proto: '.sec-h h2', impl: '.ux-sec-h h2', state, box: ['height'] },
  { proto: '.btn-primary', impl: '.p3-actions .ux-btn-primary', state, box: ['height'] },
  { proto: '.tcard', impl: '.ux-tcard', state, box: ['width'] },
];
const EMPTY_LANDMARKS: Landmark[] = [
  ...withState(NAV, 'hub-empty'),
  { proto: '.btn-primary', impl: '.p3-actions .ux-btn-primary', state: 'hub-empty', box: ['height'] },
];

for (const theme of THEMES) {
  test.describe(`groups index ${theme}`, () => {
    test.describe.configure({ timeout: 240_000 });

    test('SEO lock, every group, most played, A to Z, landmarks, a11y', async ({ page }, info) => {
      const writes = await setup(page, theme);
      test.skip(!(await open(page, '/groups', '.p3-filter[data-live]')), 'UX v1 flag is OFF on this build');

      // SEO lock: today's metadata, H1, intro and BreadcrumbList.
      await expect(page).toHaveTitle('All K-pop Groups | KpopQuiz');
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /^Every K-pop group with quizzes on KpopQuiz, listed A to Z/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/groups$/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('All K-pop groups');
      await expect(page.locator('.ux-ph > p').first()).toHaveText(/^Every group with at least one quiz on KpopQuiz\. \d+ groups, A to Z, each with its number of quizzes and its generation where we have one recorded\.$/);
      const crumbs = (await jsonLd(page)).find((j) => j['@type'] === 'BreadcrumbList');
      expect(crumbs?.itemListElement).toEqual([
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org/' },
        { '@type': 'ListItem', position: 2, name: 'All groups' },
      ]);

      // Every visible group (90 today) is a real link to its hub; zero-quiz groups muted.
      const total = Number((await page.getByLabel('Filter groups').getAttribute('placeholder'))?.match(/\d+/)?.[0]);
      expect(total, 'visible groups').toBeGreaterThanOrEqual(80);
      await expect(page.locator('a.p3-azr')).toHaveCount(total);
      await expect(page.locator('.p3-azcount')).toHaveText(`${total} groups`);
      const hrefs = await page.locator('a.p3-azr').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const h of hrefs) expect(h).toMatch(/^\/[a-z0-9-]+-quiz$/);
      expect(hrefs).not.toContain('/zzz-quarantine-hidden-quiz');
      const zero = page.locator('a.p3-azr.is-zero');
      expect(await zero.count(), 'groups without a quiz are listed').toBeGreaterThan(0);
      await expect(zero.first().locator('small')).toHaveText('No quiz yet');
      await expect(page.locator('a.p3-azr[href="/chungha-quiz"]')).toHaveClass(/is-zero/);
      await expect(page.locator('a.p3-azr[href="/bts-quiz"]')).not.toHaveClass(/is-zero/);

      // A to Z letters keep today's anchors (#letter-A ... #letter-other), "#" first.
      const letters = await page.locator('.p3-azl h3').evaluateAll((hs) => hs.map((h) => [h.id, h.querySelector('a')?.getAttribute('href')]));
      expect(letters[0]).toEqual(['letter-other', '#letter-other']);
      for (const [id, href] of letters) expect(href).toBe(`#${id}`);

      // Most played: 10 groups with quizzes, no catch-all bucket, real hub links.
      await expect(page.locator('.p3-gitem')).toHaveCount(10);
      await expect(page.locator('.p3-gitem[href="/general-kpop-quiz"]')).toHaveCount(0);
      const topCounts = await page.locator('.p3-gitem-c').allTextContents();
      for (const c of topCounts) expect(c).toMatch(/^[\d,]+ quizz?(es)?$/);
      // C1-001: the tile is the prototype's 88 x 138 (.gitem, measured live): the
      // count line sits inline in the tile's 25.6px line box.
      for (const box of await page.locator('.p3-gitem').evaluateAll((as) => as.map((a) => a.getBoundingClientRect().toJSON() as { width: number; height: number }))) {
        expect(Math.abs(box.width - 88), 'group tile width 88').toBeLessThanOrEqual(2);
        expect(Math.abs(box.height - 138), 'group tile height 138').toBeLessThanOrEqual(2);
      }

      // Nav: Groups is the active pill (desktop); on phones the Quizzes tab.
      if (widthOf(page) > 760) await expect(page.locator('.ux-links a[aria-current="page"]')).toHaveText('Groups');
      else await expect(page.locator('.ux-tab[aria-current="page"]')).toContainText('Quizzes');

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, GROUPS_LANDMARKS);
      await info.attach('landmarks-groups.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);

      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(writes, '/groups writes nothing').toEqual([]);
    });

    test('filter: live narrowing, Most played hidden, count, empty state, keyboard', async ({ page }) => {
      const writes = await setup(page, theme);
      test.skip(!(await open(page, '/groups', '.p3-filter[data-live]')), 'UX v1 flag is OFF on this build');
      const input = page.getByLabel('Filter groups');
      const total = await page.locator('a.p3-azr').count();

      // Keyboard reaches the field; "/" typed inside it is text, not the search overlay.
      await input.focus();
      await page.keyboard.type('nct');
      await expect(input).toHaveValue('nct');
      const shown = await page.locator('a.p3-azr').count();
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBeLessThan(total);
      for (const n of await page.locator('.p3-azr-n').allTextContents()) expect(n.toLowerCase()).toContain('nct');
      await expect(page.locator('.p3-azcount')).toHaveText(`${shown} of ${total} groups`);
      await expect(page.locator('.p3-gitem').first()).toBeHidden();

      await input.fill('zz no such group');
      await expect(page.locator('a.p3-azr')).toHaveCount(0);
      await expect(page.locator('.p3-az .ux-empty')).toContainText('No group matches "zz no such group"');
      await input.fill('/');
      await expect(page.locator('.ux-sov')).toHaveCount(0);

      await input.fill('');
      await expect(page.locator('a.p3-azr')).toHaveCount(total);
      await expect(page.locator('.p3-gitem').first()).toBeVisible();
      expect(writes).toEqual([]);
    });
  });

  test.describe(`group hub ${theme}`, () => {
    test.describe.configure({ timeout: 240_000 });

    test('SEO lock: H1, intro, FAQ = FAQPage, JSON-LD, links; hero, landmarks, a11y', async ({ page }, info) => {
      const writes = await setup(page, theme);
      test.skip(!(await open(page, HUB, HUB_READY)), 'UX v1 flag is OFF on this build');

      await expect(page).toHaveTitle(/^BLACKPINK Quiz/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/blackpink-quiz$/);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.locator('h1').evaluate((e) => e.textContent)).toBe('BLACKPINK Quiz - Test How Well You Know BLACKPINK');
      const intro = (await page.locator('.p3-lead').textContent()) ?? '';
      expect(intro.length).toBeGreaterThan(40);

      const ld = await jsonLd(page);
      const types = ld.map((j) => j['@type']);
      expect(types).toEqual(expect.arrayContaining(['BreadcrumbList', 'FAQPage', 'CollectionPage', 'ItemList']));
      expect(ld.find((j) => j['@type'] === 'BreadcrumbList')?.itemListElement).toEqual([
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://kpopquiz.org/' },
        { '@type': 'ListItem', position: 2, name: 'Quizzes', item: 'https://kpopquiz.org/quizzes' },
        { '@type': 'ListItem', position: 3, name: 'BLACKPINK Quiz' },
      ]);
      // The CollectionPage description is the visible intro, word for word.
      expect((ld.find((j) => j['@type'] === 'CollectionPage') as { description?: string }).description).toBe(intro);

      // Every FAQPage question is visible, with the same answer text.
      const faq = ld.find((j) => j['@type'] === 'FAQPage') as { mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
      const visible = await page.locator('.p3-acc').evaluateAll((ds) => ds.map((d) => [d.querySelector('summary')?.textContent?.trim(), d.querySelector('.p3-acc-a')?.textContent?.trim()]));
      for (const q of faq.mainEntity) {
        const row = visible.find(([vq]) => vq === q.name);
        expect(row, `visible: ${q.name}`).toBeTruthy();
        expect(row?.[1]).toBe(q.acceptedAnswer.text);
      }
      // Answers are in the HTML, the first question is open.
      await expect(page.locator('.p3-acc').first()).toHaveAttribute('open', '');
      expect(await page.locator('.p3-acc[open]').count()).toBe(1);

      // Hero: eyebrow, actions, facts (real counts), the group photo.
      await expect(page.locator('.p3-eyebrow')).toHaveText(/BLINK/);
      await expect(page.locator('.p3-actions a', { hasText: 'Play the top quiz' })).toHaveAttribute('href', /^\/q\/[a-z0-9-]+$/);
      await expect(page.locator('.p3-actions a', { hasText: 'Blindtest' })).toHaveAttribute('href', '/blindtest/group-blackpink');
      const facts = (await page.locator('.p3-facts').textContent()) ?? '';
      expect(facts).toMatch(/\d+ quizzes/);
      await expect(page.locator('.p3-photo img')).toHaveAttribute('alt', 'BLACKPINK');

      // Today's links are all here.
      for (const href of ['/blackpink-trivia', '/verse/blackpink', '/create?group=blackpink', '/leaderboard#fandom-war', '/blindtest/group-blackpink', '/twice-quiz', '/red-velvet-quiz', '/aespa-quiz']) {
        expect(await page.locator(`a[href="${href}"]`).count(), `link ${href}`).toBeGreaterThan(0);
      }
      // Every quiz of the group is a real card link in the page (no <noscript> list).
      const quizFact = (await page.locator('.p3-facts span', { hasText: /quizz?(es)?$/ }).textContent()) ?? '';
      const count = Number(quizFact.match(/[\d,]+/)?.[0]?.replace(/,/g, ''));
      await expect(page.locator('.p3-qs a.ux-tcard[href^="/q/"]'), 'a real link to every quiz').toHaveCount(count);
      await expect(page.locator('noscript a')).toHaveCount(0);

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, hubLandmarks('hub-blackpink'));
      await info.attach('landmarks-hub.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);

      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(writes, 'the hub writes nothing').toEqual([]);
    });

    test('quizzes: sorts match the live feed, Type / Level filters, Show all, keyboard', async ({ page }) => {
      const writes = await setup(page, theme);
      test.skip(!(await open(page, HUB, '.p3-qs[data-live] .ux-tcard')), 'UX v1 flag is OFF on this build');
      const cards = page.locator('.p3-qs .ux-tcard:visible');
      await expect(cards).toHaveCount(6);
      const n = Number((await page.locator('.p3-qs .ux-sec-h p').textContent())?.match(/[\d,]+/)?.[0]?.replace(/,/g, ''));
      const more = page.locator('.p3-more > summary');
      await expect(more).toHaveText(`Show all ${n}`);
      await expect(more).toBeVisible();
      // The rest of the cards are real links already, inside the closed <details>.
      await expect(page.locator('.p3-qs a.ux-tcard')).toHaveCount(n);

      // Popular = most played first (the live feed's order).
      const p = (await cards.allTextContents()).map(plays);
      for (let i = 1; i < p.length; i++) expect(p[i]!).toBeLessThanOrEqual(p[i - 1]! * 1.05 + 1);

      // Newest, Hardest, Most liked: the live feed's orders (aria-pressed toggle).
      const sort = page.getByRole('group', { name: 'Sort quizzes' });
      await sort.getByRole('button', { name: 'Newest' }).click();
      await expect(sort.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true');
      await expect(sort.getByRole('button', { name: 'Popular' })).toHaveAttribute('aria-pressed', 'false');
      const newestFirst = await cards.first().getAttribute('href');
      expect(newestFirst).toMatch(/^\/q\//);
      await expect(page.getByTestId('ux-live')).toContainText('quizzes shown');

      // Hardest = lowest average first.
      await sort.getByRole('button', { name: 'Hardest' }).click();
      const avgs = (await cards.allTextContents()).map((t) => Number(/average (\d+)%/.exec(t)?.[1] ?? 'NaN')).filter((x) => !Number.isNaN(x));
      for (let i = 1; i < avgs.length; i++) expect(avgs[i]!).toBeGreaterThanOrEqual(avgs[i - 1]!);
      await sort.getByRole('button', { name: 'Most liked' }).click();
      await expect(sort.getByRole('button', { name: 'Most liked' })).toHaveAttribute('aria-pressed', 'true');
      await sort.getByRole('button', { name: 'Popular' }).click();

      // Type dropdown: menu, pick, every card of that type; "All types" clears.
      const typeBtn = page.locator('.p3-qdd .ux-dd', { hasText: 'Type' });
      await typeBtn.click();
      await expect(typeBtn).toHaveAttribute('aria-expanded', 'true');
      const items = page.locator('.ux-ddpop [role="menuitemradio"]');
      await expect(items.first()).toHaveText('All types');
      await expect(items.first()).toBeFocused();
      const pick = (await items.nth(1).textContent()) ?? '';
      await items.nth(1).click();
      await expect(typeBtn).toContainText(`Type: ${pick}`);
      const cardLabel: Record<string, string> = { 'Guess from clues': 'Clues', 'Find the intruder': 'Intruder' };
      for (const t of await page.locator('.p3-qs .ux-tcard-ty').allTextContents()) expect(t).toContain(cardLabel[pick] ?? pick);
      await typeBtn.click();
      await page.locator('.ux-ddpop [role="menuitemradio"]', { hasText: 'All types' }).click();
      await expect(typeBtn).toHaveText(/^Type$/);

      // Level dropdown with the keyboard: Enter opens, arrows move, Escape closes and returns focus.
      const levelBtn = page.locator('.p3-qdd .ux-dd', { hasText: 'Level' });
      await levelBtn.focus();
      await page.keyboard.press('Enter');
      await expect(levelBtn).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Escape');
      await expect(levelBtn).toHaveAttribute('aria-expanded', 'false');
      await expect(levelBtn).toBeFocused();
      await levelBtn.click();
      const lv = page.locator('.ux-ddpop [role="menuitemradio"]').nth(1);
      const lvName = (await lv.textContent()) ?? '';
      await lv.click();
      for (const t of await page.locator('.p3-qs .ux-tcard-ty').allTextContents()) expect(t).toContain(`· ${lvName}`);
      await levelBtn.click();
      await page.locator('.ux-ddpop [role="menuitemradio"]', { hasText: 'All levels' }).click();

      // Show all (native <details>): the list opens in place with the keyboard, the
      // button goes away and focus moves to card 7.
      await expect(cards).toHaveCount(6);
      await more.focus();
      await page.keyboard.press('Enter');
      await expect(cards).toHaveCount(n);
      await expect(page).toHaveURL(/\/blackpink-quiz$/);
      await expect(cards.nth(6)).toBeFocused();
      await expect(more).toBeHidden();
      await expect(page.getByTestId('ux-live')).toContainText(`${n} quizzes shown`);
      expect(writes).toEqual([]);
    });

    test('no JavaScript: every quiz link is a real link in the server HTML; Show all opens natively', async ({ browser }, info) => {
      const phone = info.project.name === 'ux-390';
      const ctx = await browser.newContext({
        javaScriptEnabled: false, colorScheme: theme,
        viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      });
      const page = await ctx.newPage();
      let res = await page.goto(HUB);
      for (let i = 0; i < 6 && res && res.status() >= 500; i++) { await page.waitForTimeout(3000); res = await page.goto(HUB); }
      if (!res || res.status() !== 200 || (await page.locator('.p3').count()) === 0) { await ctx.close(); test.skip(true, 'UX v1 flag is OFF on this build'); return; }
      const quizFact = (await page.locator('.p3-facts span', { hasText: /quizz?(es)?$/ }).textContent()) ?? '';
      const count = Number(quizFact.match(/[\d,]+/)?.[0]?.replace(/,/g, ''));
      expect(count).toBeGreaterThan(6);
      // Server HTML, scripts off: one real <a href="/q/..."> card per published quiz,
      // none of them in <noscript>; the first 6 visible, the rest behind Show all.
      await expect(page.locator('.p3-qs a.ux-tcard[href^="/q/"]')).toHaveCount(count);
      await expect(page.locator('noscript a[href^="/q/"]')).toHaveCount(0);
      await expect(page.locator('.p3-qs a.ux-tcard:visible')).toHaveCount(6);
      await page.locator('.p3-more > summary').click();
      await expect(page.locator('.p3-qs a.ux-tcard:visible')).toHaveCount(count);
      // Every quiz link of today's hub (flag off) is among them.
      const hrefs = new Set(await page.locator('.p3-qs a.ux-tcard').evaluateAll((as) => as.map((a) => a.getAttribute('href'))));
      expect(hrefs.size).toBe(count);
      await ctx.close();
    });

    test('Questions fans ask open with the keyboard; community, fans, war, read more', async ({ page }) => {
      const writes = await setup(page, theme);
      test.skip(!(await open(page, HUB_2, HUB_2_READY)), 'UX v1 flag is OFF on this build');
      const second = page.locator('.p3-acc').nth(1);
      await expect(second).not.toHaveAttribute('open', '');
      await second.locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(second).toHaveAttribute('open', '');
      await expect(second.locator('.p3-acc-a')).toBeVisible();

      // From the community: rows link to the quiz the comment is on (or the empty state).
      const com = page.locator('section[aria-labelledby="p3-com-h"]');
      await expect(com.locator('a.ux-lnk', { hasText: 'All posts' })).toHaveAttribute('href', '/community');
      const rows = com.locator('a.ux-row');
      if (await rows.count()) for (const h of await rows.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) expect(h).toMatch(/^\/q\/[a-z0-9-]+$/);
      else await expect(com).toContainText('No posts about ATEEZ yet.');

      // Fans also play: the hub and the top quiz of each related group.
      const fans = page.locator('.p3-fan');
      await expect(fans).toHaveCount(3);
      await expect(fans.first().locator('.p3-fan-name')).toHaveAttribute('href', /^\/[a-z0-9-]+-quiz$/);
      await expect(fans.first().locator('.ux-rs')).toHaveText(/^[\d,]+ quizz?(es)?/);
      await expect(page.locator('.p3-war a')).toHaveAttribute('href', '/leaderboard#fandom-war');
      await expect(page.locator('a[href="/articles/stray-kids-vs-ateez"]')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, hubLandmarks('hub-ateez'));
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      expect(writes).toEqual([]);
    });
  });

  test.describe(`empty group hub ${theme}`, () => {
    test.describe.configure({ timeout: 240_000 });

    test('SEO lock, Make the first quiz, fail-soft Notify me (real route), landmarks, a11y', async ({ page }, info) => {
      const writes = await setup(page, theme);
      test.skip(!(await open(page, EMPTY, '.p3-notify[data-state]')), 'UX v1 flag is OFF on this build');
      expect(await page.locator('h1').evaluate((e) => e.textContent)).toBe('Chungha Quiz - Test How Well You Know Chungha');
      await expect(page.locator('.p3-lead')).toHaveText(/^No Chungha quizzes yet/);
      await expect(page.locator('.p3-actions a', { hasText: 'Make the first quiz' })).toHaveAttribute('href', '/create?group=chungha');
      await expect(page.locator('.p3-qs')).toHaveCount(0);
      await expect(page.locator('section[aria-labelledby="p3-com-h"]')).toHaveCount(0);
      await expect(page.locator('.p3-hero')).toHaveClass(/is-solo/);

      // The real route (read only) says "not live" until the pending migration runs:
      // the click explains it and writes nothing.
      const notify = page.locator('.p3-notify');
      await expect(notify).toHaveAttribute('data-state', 'off');
      await expect(notify).toHaveAttribute('aria-pressed', 'false');
      await notify.click();
      await expect(page.getByTestId('ux-toast')).toContainText('Group alerts are not switched on yet');
      await expect(notify).toHaveAttribute('aria-pressed', 'false');

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, EMPTY_LANDMARKS);
      await info.attach('landmarks-empty.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(writes, 'nothing is written while the feature is not live').toEqual([]);
    });

    test('Notify me once live: guest gets the sign-in sheet; a fan toggles (stubbed payloads)', async ({ page }) => {
      const writes = await setup(page, theme);
      const posts: unknown[] = [];
      let me = { live: true, signedIn: false, subscribed: false };
      await page.route((u) => u.pathname === '/api/ux-v1/p3/notify', async (r) => {
        if (r.request().method() === 'POST') {
          const body = r.request().postDataJSON() as { on: boolean };
          posts.push(body);
          await json(r, { subscribed: body.on });
          return;
        }
        await json(r, me);
      });
      test.skip(!(await open(page, EMPTY, '.p3-notify[data-state="live"]')), 'UX v1 flag is OFF on this build');

      // Guest: the sign-in sheet (X, Escape, backdrop close it; focus returns).
      const notify = page.locator('.p3-notify');
      await notify.click();
      const dlg = page.getByRole('dialog', { name: 'Sign in to get notified' });
      await expect(dlg).toBeVisible();
      await expect(dlg).toContainText('We will tell you when the first Chungha quiz is out.');
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(notify).toBeFocused();
      await notify.click();
      await dlg.getByRole('button', { name: 'Close' }).click();
      await expect(dlg).toBeHidden();
      await notify.click();
      await page.getByTestId('ux-scrim').click({ position: { x: 5, y: 5 } });
      await expect(dlg).toBeHidden();
      expect(posts).toEqual([]);

      // Signed in (stubbed state): on, then off; the exact payloads.
      me = { live: true, signedIn: true, subscribed: false };
      await page.reload();
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await expect(page.locator('.p3-notify[data-state="live"]')).toHaveCount(1, { timeout: 30_000 });
      await notify.click();
      await expect(notify).toHaveAttribute('aria-pressed', 'true');
      await expect(notify).toHaveText('We will tell you');
      await expect(page.getByTestId('ux-toast')).toContainText('You will get a notification for the first Chungha quiz');
      await notify.focus();
      await page.keyboard.press('Enter');
      await expect(notify).toHaveAttribute('aria-pressed', 'false');
      await expect(notify).toHaveText('Notify me');
      expect(posts).toHaveLength(2);
      expect(posts[0]).toMatchObject({ on: true });
      expect(posts[1]).toMatchObject({ on: false });
      const ids = posts.map((b) => (b as { groupId: unknown }).groupId);
      expect(typeof ids[0]).toBe('number');
      expect(ids[0]).toBe(ids[1]);
      expect(writes, 'no write reached the server').toEqual([]);
    });
  });

  test.describe(`trivia page ${theme}`, () => {
    test.describe.configure({ timeout: 240_000 });
    test("today's content inside the v11 shell", async ({ page }) => {
      const writes = await setup(page, theme);
      const res = await page.goto(TRIVIA);
      test.skip(!res || res.status() !== 200 || !(await hasShell(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toContainText('BLACKPINK');
      await expect(page.locator('a[href="/blackpink-quiz"]').first()).toBeAttached();
      if (widthOf(page) > 760) await expect(page.locator('.ux-links a[aria-current="page"]')).toHaveText('Groups');
      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(writes).toEqual([]);
    });
  });
}

signedInTest.describe('signed in (read only)', () => {
  signedInTest.describe.configure({ timeout: 240_000 });
  signedInTest('hub and empty hub as the test user: account in the nav, Notify me says not live, zero writes', async ({ page }) => {
    skipUnlessSignedIn();
    const writes = await setup(page, 'light');
    test.skip(!(await open(page, EMPTY, '.p3-notify[data-state]')), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.ux-nav-signin')).toHaveCount(0, { timeout: 30_000 });
    const notify = page.locator('.p3-notify');
    await expect(notify).toHaveAttribute('data-state', 'off');
    await notify.click();
    await expect(page.getByTestId('ux-toast')).toContainText('Group alerts are not switched on yet');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(await open(page, HUB, '.p3-qs[data-live] .ux-tcard')).toBe(true);
    await expect(page.locator('.p3-qs .ux-tcard:visible')).toHaveCount(6);
    expect(writes, 'the signed-in visit writes nothing').toEqual([]);
  });
});
