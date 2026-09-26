import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

import type { APIRequestContext, Page, Route } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';
import type { Theme } from './helpers/setup-page';

// P8 Community (UX v11.2; DESIGN-SPEC 17.7, 17.8, 16.7 community, 13.x): the /community
// feed, the rail, the post views and the New post editor, flag ON, at the project
// width (ux-1440 / ux-390), light and dark, as a guest and (read only) as the parity
// test user. Production-write rule (ORCH): every mutating request is stubbed by
// guardWrites() and its payload asserted; the few writes a test triggers on purpose
// are answered by fixtures below with realistic bodies (never sent to the server).
// The GET paths of these pages write nothing (cookie-free server reads; client reads
// /api/auth/me, /api/ux-v1/p8/viewer, /api/debate/me, /api/verse/membership). Real
// data changes (posts, votes), so counts are checked for shape, not for value.
// Verse gates (privacy fail-closed): threads and blogs are Verse content and follow the
// /verse gates (VERSE_PUBLIC, LIVE_SPACES). The server's mode is read from the server
// itself (verseMode); tests that read Verse content skip while it is hidden, and the
// "Verse gates" block has one case per mode (run the server twice, see reports/P8.md).

const env = loadTestEnv();
const TODAY = new Date().toISOString().slice(0, 10);
const here = path.dirname(fileURLToPath(import.meta.url));
const P8_STYLES = path.resolve(here, '../../../../docs/design/ux-dashboard-v1/v11/reports/P8/proto-styles.json');

// ---- prototype references ------------------------------------------------------------

const FEED_REF: Landmark[] = [
  { proto: '.post', impl: '.p8-feed .ux-post', state: 'community', box: ['width'] },
  { proto: '.rail>section', impl: '.p8-rail > .ux-panel', state: 'community', box: ['width'] },
  { proto: '.utabs button.on', impl: '.p8-fctl [aria-selected="true"]', state: 'community', box: ['height'] },
];
const EDITOR_REF: Landmark[] = FEED_REF.map((l) => ({ ...l, state: 'editor' }));
const postRef = (state: string): Landmark[] => [{ proto: '.sec-h h2', impl: '.p8-post-page .ux-sec-h h2', state, box: ['height'] }];

// P8's own capture of the prototype (v11/reports/P8/capture-proto-styles.mjs). Props that
// differ for a documented, non-visual reason are skipped per pair.
type Pair = [proto: string, impl: string, box: ('width' | 'height')[], skip?: string[]];
const COMMUNITY: Pair[] = [
  ['#community .ph h1', '.p8-page .ux-ph h1', ['height'], ['border-radius']], // prototype radius = its H1 focus style
  ['#community .ph p', '.p8-page .ux-ph p', []], ['.composer', '.p8-composer', ['height']], ['.composer .inp', '.p8-composer-in', ['height']],
  ['.composer .btn', '.p8-composer .ux-btn', ['width', 'height']], ['.fctl .dd', '.p8-fctl .ux-dd', ['height']],
  ['#feed .post', '.p8-feed .ux-post', ['width']], ['.post .ph2', '.p8-feed .ux-ph2', [], ['gap']], ['.post .ph2 .ava', '.p8-feed .ux-ph2 .ux-ava', ['width', 'height'], ['line-height', 'font-size']],
  ['.post .ph2 .lv', '.p8-feed .ux-ph2-lv', []], ['.post .ptype', '.p8-feed .ux-ptype', ['height']], ['.post .ptt', '.p8-feed .ux-ptt', []], ['.post .pbd', '.p8-feed .ux-pbd', []],
  ['.post .pacts', '.p8-feed .ux-pacts', ['height']], ['.post .pa2', '.p8-feed .ux-pa2', ['height']], ['.dopts', '.p8-feed .p8-dopts', []], ['.dopt', '.p8-feed .p8-dopt', ['height']],
  ['.dopt.win', '.p8-feed .p8-dopt.is-win', ['height']], ['.dopt.win i', '.p8-feed .p8-dopt.is-win i', []], ['.dopt:not(.win) i', '.p8-feed .p8-dopt:not(.is-win) i', []], ['.post .help', '.p8-feed .p8-help', []],
  ['.bcov', '.p8-feed .p8-bcov', ['width', 'height'], ['margin-top']], // the card grid carries the 16px gap the prototype puts on .bwrap
  ['.rail', '.p8-rail', ['width']], ['.rail>section', '.p8-rail > .ux-panel', ['width']], ['.rail h3', '.p8-rail .p8-panel-h', []], ['.rail h3 small', '.p8-rail .p8-panel-h small', []],
  ['.rail .dq', '.p8-rail .p8-dq', []], ['.rail .vote', '.p8-rail .p8-vote', []], ['.rail .vote button', '.p8-rail .p8-vote button', ['width', 'height']], ['.rail .pl3', '.p8-rail .p8-pl3', []],
  ['.rail .pl3 b', '.p8-rail .p8-pl3 b', []], ['.rail .hn', '.p8-rail .p8-hn', ['width']], ['.rail .hn .ava', '.p8-rail .p8-hn .ux-ava', ['width', 'height'], ['line-height', 'font-size']], ['.rail .hn .tm', '.p8-rail .p8-tm', []],
  ['.warstrip', '.p8-warstrip', ['height']], ['.warstrip .grow', '.p8-warstrip .p8-grow', []], ['.mdebate .mine', '.p8-mine', [], ['gap']], // the prototype box is display:block there (gap inert) ['.mine .plabel', '.p8-plabel', []], ['.mine .dq', '.p8-mine .p8-dq', []],
  ['.mine .vote button', '.p8-mine .p8-vote button', ['height']], ['.mrail', '.p8-mrail', ['width']], ['.mrail h3', '.p8-mrail .p8-panel-h', []], ['.mrail .hn', '.p8-mrail .p8-hn', []],
];
const POST: Pair[] = [
  ['#pv .crumb', '.p8-pv .ux-crumb', []], ['#pv .crumb a', '.p8-pv .ux-crumb a', []], ['#pv .ph2 .lv', '.p8-author .p8-lv', []], ['.post-t', '.p8-post-t', [], ['border-radius']], // prototype radius = its H1 focus style
  ['.post-b', '.p8-post-b', []], ['.post-b p', '.p8-post-b p', []], ['#pv .pacts', '.p8-pacts', ['height']], ['#pv .pa2', '.p8-pacts .ux-pa2', ['height']],
  ['#postview .sec > .h2', '#replies > .ux-h2', []], ['.cform', '.p8-cform', []], ['.cform textarea', '.p8-cform textarea', ['height']], ['.cform .ava', '.p8-cform .ux-ava', ['width', 'height'], ['line-height', 'font-size']],
  ['.cmt', '.p8-cmt', []], ['.cmt .h', '.p8-cmt-h', []], ['.cmt p', '.p8-cmt p', []], ['.cmt .ca', '.p8-ca', []], ['.cmt .lk', '.p8-lk', []], ['.cmt.nest', '.p8-cmt-nest', []],
  ['#postview .sec-h h2', '.p8-post-page .ux-sec-h h2', ['height']], ['#postview .sec-h .lnk', '.p8-post-page .ux-sec-h .ux-lnk', []], ['#postview .row', '.p8-post-page .ux-row', []],
  ['#postview .row .rt', '.p8-post-page .ux-row .ux-rt', []], ['#postview .row .rs', '.p8-post-page .ux-row .ux-rs', []],
  ['.post-cover', '.p8-post-cover', ['width', 'height']], ['#pv .vote button', '.p8-pv .p8-vote button', ['height']], ['#pv .help', '.p8-pv .p8-help', []],
];
const EDITOR: Pair[] = [
  ['#editor', '.p8-ed', ['width']], ['#editor .sh-h', '.p8-ed .ux-sh-h', ['height']], ['#editor .sh-h h3', '.p8-ed .ux-sh-h h2', [], ['line-height']], // A0's shared sheet title line box
  ['#editor .sh-b', '.p8-ed .ux-sh-b', []], ['#edmodes', '.p8-modes4', ['width', 'height']], ['#edmodes button.on', '.p8-modes4 [aria-pressed="true"]', ['width', 'height']],
  ['#edmodes button:not(.on)', '.p8-modes4 [aria-pressed="false"]', ['height']], ['#ed-help', '.p8-ed .ux-sh-b > .p8-help', []], ['#editor .field', '.p8-ed .ux-field', []],
  ['#editor .field > label', '.p8-ed .ux-field > label', []], ['#editor .flabel', '.p8-ed .ux-flabel', []], ['#editor .flabel small', '.p8-ed .ux-flabel small', []],
  ['#editor .field > .inp', '.p8-gbox', ['height']], ['#ed-q', '.p8-ed input.ux-inp', ['height']], ['#editor [data-mode="debate"] input.inp[placeholder="Option 1"]', '.p8-opts-in input', ['height']],
  ['#editor .lnk', '.p8-addopt', []], ['#editor [data-mode="debate"] .seg', '.p8-ed .ux-field .ux-seg', ['width', 'height']],
  ['#editor [data-mode="debate"] .seg button.on', '.p8-ed .ux-field .ux-seg [aria-pressed="true"]', ['width', 'height']], ['#editor .btn-ghost', '.p8-ed-foot .ux-btn-ghost', ['width', 'height']],
];
const PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-style', 'border-top-color', 'border-radius',
  'background-color', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap', 'opacity'];

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  return /^-?[\d.]+px$/.test(norm(a)) && /^-?[\d.]+px$/.test(norm(b)) && Math.abs(parseFloat(a) - parseFloat(b)) <= 2;
}

/** Computed styles of the first visible match of each impl selector vs the P8 capture. */
async function compareP8(page: Page, theme: Theme, state: string, pairs: Pair[]): Promise<{ checked: number; mismatches: string[] }> {
  const ref = (JSON.parse(fs.readFileSync(P8_STYLES, 'utf8')) as Record<string, Record<string, Record<string, string>>>)[`${widthOf(page)}-${theme}-${state}`] ?? {};
  const got = await page.evaluate(({ pairs, P }) => {
    const o: Record<string, Record<string, string>> = {};
    for (const [, impl, box] of pairs) {
      const el = Array.from(document.querySelectorAll<HTMLElement>(impl)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      if (!el) continue;
      const cs = getComputedStyle(el);
      o[impl] = Object.fromEntries([...P, ...box].map((p) => [p, cs.getPropertyValue(p)]));
    }
    return o;
  }, { pairs: pairs.map(([a, b, c]) => [a, b, c] as [string, string, string[]]), P: PROPS });
  const mismatches: string[] = [];
  let checked = 0;
  for (const [proto, impl, box, skip = []] of pairs) {
    const e = ref[proto]; const a = got[impl];
    if (!e || !a) continue; // not in that state / not rendered with today's data
    checked++;
    for (const p of [...PROPS, ...box]) {
      if (skip.includes(p) || e[p] === undefined || a[p] === undefined) continue;
      // The legacy preflight sets border-style solid at width 0 (invisible); gap on a
      // box that is not flex / grid in the prototype has no effect.
      if (p === 'border-top-style' && parseFloat(e['border-top-width'] ?? '0') === 0 && parseFloat(a['border-top-width'] ?? '0') === 0) continue;
      if (p === 'gap' && e[p] === 'normal') continue;
      if (!close(e[p]!, a[p]!)) mismatches.push(`${impl} ${p}: prototype ${e[p]}, implementation ${a[p]}`);
    }
  }
  return { checked, mismatches };
}

// ---- harness -----------------------------------------------------------------------------

interface Harness { writes: StubbedCall[] }

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** guardWrites first, then per-endpoint answers for the writes a test triggers on
 *  purpose (recorded in the same list; later routes win in Playwright). */
async function harness(page: Page, theme: Theme, answers: Record<string, unknown> = {}): Promise<Harness> {
  await preparePage(page, theme);
  const writes = await guardWrites(page, env.supabaseUrl);
  for (const [key, body] of Object.entries(answers)) {
    const [method, p] = key.split(' ') as [string, string];
    await page.route((u) => u.pathname === p, async (route) => {
      if (route.request().method() !== method) { await route.fallback(); return; }
      writes.push({ method, url: route.request().url(), body: route.request().postData() });
      await json(route, body);
    });
  }
  return { writes };
}

async function open(page: Page, p: string): Promise<boolean> {
  const res = await page.goto(p);
  if (!res || res.status() !== 200 || !(await hasShell(page))) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await waitHydrated(page); // the account island resolved: guest or signed in is known
  return true;
}

const isPhone = (page: Page): boolean => widthOf(page) < 500;
const bodyOf = (w: StubbedCall): Record<string, unknown> => JSON.parse(w.body ?? '{}') as Record<string, unknown>;
const pathOf = (w: StubbedCall): string => new URL(w.url).pathname;

// ---- Verse gates: the server's VERSE_PUBLIC, read from the server itself -----------------
let verseModeP: Promise<'open' | 'hidden'> | null = null;
/** 'hidden' when the server runs with VERSE_PUBLIC not exactly 'true': a gated Verse path
 *  then redirects to the /verse teaser (the middleware for a guest, the space layout for a
 *  signed-in non-admin). One probe per worker. */
function verseMode(request: APIRequestContext): Promise<'open' | 'hidden'> {
  verseModeP ??= request.get('/verse/bts', { maxRedirects: 0, timeout: 150_000 })
    .then((r) => (r.status() >= 300 && r.status() < 400 && /\/verse\/?$/.test(r.headers().location ?? '') ? 'hidden' : 'open'));
  return verseModeP;
}
const VERSE_OPEN_ONLY = 'reads Verse content: this server runs with VERSE_PUBLIC off (the "Verse gates" block covers it)';
/** lib/verse/visibility LIVE_SPACES (today 'bts' only), by display name. */
const LIVE_SPACE_NAMES = ['BTS'];

// ---- specs ---------------------------------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`community feed ${theme}`, () => {
    test.describe.configure({ timeout: 120_000 });

    test('guest: noindex new URL, one H1, real post links, landmarks + styles, no scroll, a11y, no write', async ({ page, request }, info) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      await expect(page).toHaveTitle(/Community/);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/community$/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Community');
      await expect(page.locator('.ux-ph p')).toHaveText('Threads, blogs, debates and score challenges from every fandom.');
      await expect(page.locator('a[href="/community"][aria-current="page"]').first()).toBeAttached(); // nav pink pill (A0)

      const cards = page.locator('.p8-feed article.ux-post');
      const n = await cards.count();
      expect(n, 'real posts in the feed').toBeGreaterThan(0);
      expect(n).toBeLessThanOrEqual(10);
      const hrefs = await page.locator('.p8-feed .ux-ptt a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      for (const href of hrefs) expect(href).toMatch(/^\/community\/(thread|blog|debate|challenge)\/[\w-]+$/);
      // every card: an author row, the pink-soft type chip, a replies link to the post
      await expect(cards.first().locator('.ux-ph2')).toBeVisible();
      await expect(cards.first().locator('.ux-ptype')).toContainText(/^(Thread|Blog|Debate|Challenge)/);
      await expect(cards.first().locator('a.ux-pa2[href$="#replies"]')).toHaveCount(1);

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, FEED_REF);
      await info.attach('landmarks-feed.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      const own = await compareP8(page, theme, 'community', COMMUNITY);
      await info.attach('p8-styles-feed.json', { body: JSON.stringify(own, null, 1), contentType: 'application/json' });
      expect(own.checked).toBeGreaterThan(20);
      expect(own.mismatches, 'computed styles equal to the P8 prototype capture').toEqual([]);

      if (isPhone(page)) {
        await expect(page.locator('.p8-rail')).toBeHidden();
        await expect(page.locator('.p8-warstrip')).toHaveAttribute('href', '/leaderboard');
        await expect(page.locator('.p8-composer .ux-btn')).toBeHidden();
      } else {
        await expect(page.locator('.p8-rail')).toBeVisible();
        await expect(page.locator('.p8-mtop').first()).toBeHidden();
      }

      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(h.writes, 'the feed writes nothing').toEqual([]);
    });

    test('tabs (click + arrow keys), the group menu, Following asks a guest to sign in', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      const tabs = page.locator('.p8-fctl [role="tab"]');
      await expect(tabs).toHaveText(['For you', 'Following', 'Blogs']);
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
      const all = await page.locator('.p8-feed article.ux-post').count();

      await tabs.nth(2).click();
      await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#p8-feed-panel-blogs')).toBeVisible();
      const blogs = page.locator('.p8-feed article.ux-post');
      const nb = await blogs.count();
      for (let i = 0; i < nb; i++) await expect(blogs.nth(i).locator('.ux-ptype')).toContainText(/^Blog/);
      if (!nb) await expect(page.locator('.p8-empty')).toContainText('No blogs');

      await tabs.nth(2).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(tabs.nth(1)).toBeFocused();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.p8-empty')).toContainText('Follow fans to fill this tab');
      await page.locator('.p8-empty').getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByRole('dialog', { name: 'Sign in to follow fans' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await tabs.nth(1).focus();
      await page.keyboard.press('Home');
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
      await expect(tabs.nth(0)).toBeFocused();
      await expect(page.locator('.p8-feed article.ux-post')).toHaveCount(all);

      if (!isPhone(page)) {
        const dd = page.locator('.p8-fctl .ux-dd');
        await expect(dd).toHaveText('All groups');
        await dd.click();
        await expect(dd).toHaveAttribute('aria-expanded', 'true');
        const items = page.getByRole('menuitemradio');
        await expect(items.first()).toHaveText('All groups');
        await expect(items.first()).toHaveAttribute('aria-checked', 'true');
        const pick = items.nth(1);
        const name = (await pick.textContent())!.trim();
        await pick.click();
        await expect(dd).toHaveText(name);
        await expect(dd).toBeFocused();
        const chips = await page.locator('.p8-feed .ux-ptype').allTextContents();
        expect(chips.length).toBeGreaterThan(0);
        for (const c of chips) expect(c).toContain(name);
        await dd.click();
        await page.getByRole('menuitemradio', { name: 'All groups' }).click();
        await expect(page.locator('.p8-feed article.ux-post')).toHaveCount(all);
        await dd.click();
        await page.keyboard.press('Escape');
        await expect(dd).toHaveAttribute('aria-expanded', 'false');
      } else {
        await expect(page.locator('.p8-fctl .ux-dd')).toBeHidden(); // phones: no group menu (prototype)
      }
      const more = page.locator('.p8-more .ux-btn');
      if (await more.count()) {
        const before = await page.locator('.p8-feed article.ux-post').count();
        await more.click();
        expect(await page.locator('.p8-feed article.ux-post').count()).toBeGreaterThan(before);
      }
      expect(h.writes).toEqual([]);
    });

    test('editor: four modes, fields, validation, closes by X / Escape / backdrop with focus back, guest Post asks to sign in', async ({ page, request }, info) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      const prompt = page.locator('.p8-composer-in');
      await expect(prompt).toHaveText('Start a thread, a blog, a debate or a challenge');
      await prompt.click();
      await expect(page.getByRole('dialog', { name: 'New thread' })).toBeVisible();
      const sheet = page.locator('.p8-ed');
      const modes = sheet.locator('.p8-modes4 button');
      await expect(modes).toHaveText(['Thread', 'Blog', 'Debate', 'Challenge']);
      await expect(modes.nth(0)).toHaveAttribute('aria-pressed', 'true');
      await expect(sheet.getByLabel('Title')).toBeVisible();

      // Validation, no request: empty title and no group.
      await sheet.getByRole('button', { name: 'Post' }).click();
      await expect(sheet.getByText('Pick a group.')).toBeVisible();
      await expect(sheet.getByText('Add a title first.')).toBeVisible();
      await expect(sheet.getByLabel('Title')).toHaveAttribute('aria-invalid', 'true');

      // Group picker: a listbox, arrow + Enter picks, the chip removes. Thread and Blog
      // post to the Verse: the list has the live spaces only (Verse gates).
      const g = sheet.getByRole('combobox', { name: 'Group' });
      await g.fill('stray');
      await expect(sheet.getByRole('listbox', { name: 'Groups' })).toContainText('No open fandom space matches.');
      await g.fill('bts');
      await g.press('Enter');
      await expect(sheet.locator('.p8-gchip')).toContainText('BTS');
      await sheet.getByRole('button', { name: 'Remove BTS' }).click();
      await expect(sheet.locator('.p8-gchip')).toHaveCount(0);
      await g.fill('bts');
      await g.press('Enter');
      await expect(sheet.locator('.p8-gchip')).toContainText('BTS');

      // Blog, Debate (the reference state), Challenge.
      await modes.nth(1).click();
      await expect(page.getByRole('dialog', { name: 'New blog' })).toBeVisible();
      await expect(sheet.getByLabel('Text')).toBeVisible();
      await modes.nth(2).click();
      const debate = page.getByRole('dialog', { name: 'New debate' });
      await expect(debate).toBeVisible();
      await expect(debate.getByLabel('Question')).toHaveAttribute('placeholder', 'Best 4th gen title track of 2024?');
      await expect(debate.getByLabel(/^Option \d$/)).toHaveCount(2);
      await expect(debate.getByRole('group', { name: 'Closes in' }).locator('[aria-pressed="true"]')).toHaveText('3 days');

      const cmp = await compareLandmarks(page, widthOf(page), theme, EDITOR_REF);
      expect(cmp.mismatches, 'feed landmarks behind the sheet').toEqual([]);
      const own = await compareP8(page, theme, 'editor', EDITOR);
      await info.attach('p8-styles-editor.json', { body: JSON.stringify(own, null, 1), contentType: 'application/json' });
      expect(own.checked).toBeGreaterThan(12);
      expect(own.mismatches, 'computed styles equal to the P8 prototype capture').toEqual([]);

      await debate.getByRole('button', { name: 'Add an option' }).click();
      await debate.getByRole('button', { name: 'Add an option' }).click();
      await expect(debate.getByLabel(/^Option \d$/)).toHaveCount(4);
      await expect(debate.getByRole('button', { name: 'Add an option' })).toHaveCount(0); // 4 max
      await debate.getByRole('group', { name: 'Closes in' }).getByRole('button', { name: '7 days' }).click();
      await expect(debate.getByRole('group', { name: 'Closes in' }).getByRole('button', { name: '7 days' })).toHaveAttribute('aria-pressed', 'true');
      const post = debate.getByRole('button', { name: 'Post' });
      if (await post.isDisabled()) await expect(debate.locator('.p8-ed-note')).toHaveText('Fan debates open soon. Vote on the daily debate meanwhile.');
      await modes.nth(3).click();
      await expect(page.getByRole('dialog', { name: 'New challenge' })).toBeVisible();
      await expect(page.getByText('Sign in to pick one of your recent scores.')).toBeVisible();

      // Closes three ways, focus returns to the trigger (17.10).
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(prompt).toBeFocused();
      await prompt.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(prompt).toBeFocused();
      await prompt.click();
      await page.getByTestId('ux-scrim').click({ position: { x: 5, y: 5 } });
      await expect(page.getByRole('dialog')).toHaveCount(0);

      // A guest's valid thread: the sign-in sheet (draft kept), nothing posted.
      if (!isPhone(page)) await page.locator('.p8-composer .ux-btn').click();
      else await prompt.click();
      const s2 = page.getByRole('dialog', { name: 'New thread' });
      await s2.getByRole('combobox', { name: 'Group' }).fill('bts');
      await s2.getByRole('combobox', { name: 'Group' }).press('Enter');
      await s2.getByLabel('Title').fill('Which era got you in?');
      await s2.getByRole('button', { name: 'Post' }).click();
      // The sign-in sheet in context (16.6); A0's sheet stores the draft as the pending
      // action when a sign-in method is chosen, and the editor resumes it (p8-post).
      const si = page.getByRole('dialog', { name: 'Sign in to post' });
      await expect(si).toBeVisible();
      await expect(si).toContainText('Your draft is kept.');
      await page.keyboard.press('Escape');
      expect(h.writes, 'a guest posts nothing').toEqual([]);
    });

    test('compose URL (P5 create done link): opens the sheet in challenge mode, drops the params, guest asked to sign in', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      const results: string[] = [];
      await page.route((u) => u.pathname === '/api/ux-v1/p8/my-results', async (route) => { results.push(route.request().url()); await route.fallback(); });
      test.skip(!(await open(page, '/community?compose=challenge&quiz=fixture-quiz')), 'UX v1 flag is OFF on this build');
      const sheet = page.getByRole('dialog', { name: 'New challenge' });
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('.p8-modes4 button').nth(3)).toHaveAttribute('aria-pressed', 'true');
      await expect(sheet.getByText('Sign in to pick one of your recent scores.')).toBeVisible();
      expect(new URL(page.url()).search).toBe('');
      await page.keyboard.press('Escape');
      await expect(sheet).toBeHidden();
      // An unknown mode opens nothing.
      await open(page, '/community?compose=poll');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(results).toEqual([]); // a guest never asks for runs
      expect(h.writes).toEqual([]);
    });

    test('rail as a guest: vote, cheer and heart ask to sign in, share opens the share sheet', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      const scope = isPhone(page) ? page.locator('.p8-mine') : page.locator('.p8-rail');
      const vote = scope.locator('.p8-vote button');
      if (await vote.count()) {
        await expect(vote).toHaveCount(2);
        await vote.first().click();
        await expect(page.getByRole('dialog', { name: 'Sign in to vote' })).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(vote.first()).toBeFocused();
      }
      const cheer = page.locator(isPhone(page) ? '.p8-mrail .p8-cheer' : '.p8-rail .p8-cheer').first();
      if (await cheer.count()) {
        await cheer.click();
        await expect(page.getByRole('dialog', { name: 'Sign in to cheer' })).toBeVisible();
        await page.keyboard.press('Escape');
      }
      const heart = page.locator('.p8-card-blog .ux-pacts button[aria-pressed]').first();
      if (await heart.count()) {
        await heart.click();
        await expect(page.getByRole('dialog', { name: 'Sign in to like' })).toBeVisible();
        await page.keyboard.press('Escape');
      }
      const card = page.locator('.p8-feed article.ux-post').first();
      const cardTitle = (await card.locator('.ux-ptt').textContent())!.trim();
      const share = card.locator('.ux-pacts button[aria-label="Share"]');
      await share.click();
      const ss = page.getByRole('dialog', { name: 'Share this post' });
      await expect(ss).toBeVisible();
      await expect(ss.locator('.ux-minicard b')).toHaveText(cardTitle);
      await expect(ss.getByRole('button', { name: 'Copy link' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(share).toBeFocused();
      expect(h.writes).toEqual([]);
    });
  });

  test.describe(`community posts ${theme}`, () => {
    test.describe.configure({ timeout: 120_000 });

    test('blog post: crumb, one H1, noindex, cover, heart, replies box grows, More from the community, styles', async ({ page, request }, info) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      const blog = page.locator('.p8-card-blog .ux-ptt a').first();
      test.skip((await blog.count()) === 0, 'no public blog today');
      const href = (await blog.getAttribute('href'))!;
      const title = (await blog.textContent())!.trim();
      await open(page, href);
      await expect(page).toHaveTitle(new RegExp(title.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`${href}$`));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(title);
      const crumb = page.getByRole('navigation', { name: 'Breadcrumb' });
      await expect(crumb.getByRole('link', { name: 'Community' })).toHaveAttribute('href', '/community');
      await expect(crumb.locator('a').nth(1)).toHaveAttribute('href', /^\/[a-z0-9-]+-quiz$/);
      await expect(crumb.locator('[aria-current="page"]')).toHaveText('Blog');
      await expect(page.locator('.p8-post-b')).not.toBeEmpty();
      await expect(page.locator('.p8-pacts button[aria-pressed]')).toHaveCount(1); // blog heart (verse_essay_reactions)
      await expect(page.locator('#replies > .ux-h2')).toHaveText(/^\d[\d,]* repl(y|ies)$/);
      const own = await compareP8(page, theme, 'post-blog', POST);
      await info.attach('p8-styles-post-blog.json', { body: JSON.stringify(own, null, 1), contentType: 'application/json' });
      expect(own.checked).toBeGreaterThan(12);
      expect(own.mismatches, 'computed styles equal to the P8 prototype capture').toEqual([]);

      const box = page.locator('.p8-cform textarea');
      await expect(box).toHaveAttribute('placeholder', 'Write a reply');
      await box.click();
      await expect(page.locator('.p8-cform')).toHaveClass(/is-open/);
      await page.locator('.p8-cform').getByRole('button', { name: 'Reply' }).click();
      await expect(page.getByText('Write something first.')).toBeVisible();
      await box.fill('Great read.');
      await page.locator('.p8-cform').getByRole('button', { name: 'Reply' }).click();
      await expect(page.getByRole('dialog', { name: 'Sign in to reply' })).toBeVisible();
      await page.keyboard.press('Escape');

      await expect(page.locator('.p8-post-page .ux-sec-h h2')).toHaveText('More from the community');
      await expect(page.locator('.p8-post-page .ux-sec-h a')).toHaveAttribute('href', '/community');
      const rows = await page.locator('.p8-post-page a.ux-row').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) { expect(r).toMatch(/^\/community\//); expect(r).not.toBe(href); }

      const cmp = await compareLandmarks(page, widthOf(page), theme, postRef('post-blog'));
      expect(cmp.mismatches).toEqual([]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe).toEqual([]);
      expect(h.writes).toEqual([]);
    });

    test('thread post: report asks to sign in, replies point at the thread', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      const thread = page.locator('.p8-feed article.ux-post').filter({ has: page.locator('.ux-ptype', { hasText: /^Thread/ }) }).locator('.ux-ptt a').first();
      test.skip((await thread.count()) === 0, 'no thread today');
      const href = (await thread.getAttribute('href'))!;
      await open(page, href);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText('Thread');
      const report = page.getByRole('button', { name: 'Report' });
      await expect(report).toHaveCount(1);
      await report.click();
      await expect(page.getByRole('dialog', { name: 'Sign in to report' })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(report).toBeFocused();
      const share = page.locator('.p8-pacts button[aria-label="Share"]');
      await share.click();
      await expect(page.getByRole('dialog', { name: 'Share this post' }).locator('.ux-minicard b')).toHaveText((await page.locator('h1').textContent())!.trim());
      await page.keyboard.press('Escape');
      await expect(share).toBeFocused();
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe).toEqual([]);
      expect(h.writes).toEqual([]);
    });

    test("today's debate: vote first, results after, reply rides with the vote; a closed debate shows results only", async ({ page }, info) => {
      const h = await harness(page, theme);
      const res = await page.goto(`/community/debate/${TODAY}`);
      test.skip(!res || res.status() !== 200 || !(await hasShell(page)), 'flag off or no debate today');
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('a').nth(1)).toHaveText('General K-pop');
      const buttons = page.locator('.p8-pv .p8-vote button');
      await expect(buttons).toHaveCount(2);
      await expect(page.locator('.p8-pv .p8-help')).toContainText('results show after you vote');
      await expect(page.locator('.p8-pv .p8-dopts')).toHaveCount(0); // no results before voting
      const own = await compareP8(page, theme, 'post-debate', POST);
      await info.attach('p8-styles-post-debate.json', { body: JSON.stringify(own, null, 1), contentType: 'application/json' });
      expect(own.mismatches).toEqual([]);
      await page.getByLabel(/Add a reply to your vote/).fill('Remixes can win.');
      await buttons.nth(1).click();
      await expect(page.getByRole('dialog', { name: 'Sign in to vote' })).toBeVisible();
      await expect(page.getByRole('dialog', { name: 'Sign in to vote' })).toContainText('with an optional reply');
      await page.keyboard.press('Escape');
      await expect(buttons.nth(1)).toBeFocused();

      // A closed debate from the feed: bars, "closed", no vote, no reply box.
      await page.goto('/community');
      const closed = page.locator('.p8-feed .ux-ptt a[href^="/community/debate/"]').first();
      if (await closed.count()) {
        await page.goto((await closed.getAttribute('href'))!);
        await expect(page.locator('.p8-pv .p8-dopts')).toBeVisible();
        await expect(page.locator('.p8-pv .p8-help')).toContainText('closed');
        await expect(page.locator('.p8-pv .p8-vote')).toHaveCount(0);
        await expect(page.locator('.p8-cform')).toHaveCount(0);
      }
      expect(h.writes).toEqual([]);
    });

    test('unknown kind, unknown id and the pending challenge store answer 404; pending write routes answer before any write', async ({ page, request }) => {
      await harness(page, theme);
      const probe = await page.goto('/community');
      test.skip(!probe || probe.status() !== 200, 'UX v1 flag is OFF on this build');
      for (const p of ['/community/poll/1', '/community/thread/999999999', '/community/blog/abc', '/community/challenge/1', '/community/debate/2099-01-01']) {
        const r = await page.goto(p);
        expect(r?.status(), p).toBe(404);
      }
      // Guest requests: the route answers not_live (store pending) or sign_in_required
      // (store live) BEFORE any write, and never 2xx.
      const pending: [string, unknown][] = [
        ['/api/ux-v1/p8/like', { target_type: 'thread', target_id: '1' }],
        ['/api/ux-v1/p8/debates', { question: 'Best title track?', options: ['A', 'B'], days: 3 }],
        ['/api/ux-v1/p8/debate-vote', { debate_id: 1, option_index: 0 }],
        ['/api/ux-v1/p8/challenges', { play_id: '00000000-0000-4000-8000-000000000000' }],
        ['/api/ux-v1/p8/replies', { target_type: 'debate', target_id: 1, body: 'hi' }],
      ];
      for (const [url, body] of pending) {
        const r = await request.post(url, { data: body });
        expect([401, 503], url).toContain(r.status());
      }
      const bad = await request.post('/api/ux-v1/p8/like', { data: { target_type: 'nope', target_id: '1' } });
      expect(bad.status()).toBe(400);
      const viewer = await request.get('/api/ux-v1/p8/viewer');
      expect(await viewer.json()).toEqual({ signedIn: false, following: [], liked: [] });
    });
  });

  // ---- signed in (the parity test user, read only: every write is answered by a fixture) ----
  signedInTest.describe(`community signed in ${theme}`, () => {
    signedInTest.describe.configure({ timeout: 120_000 });
    signedInTest.beforeEach(() => { skipUnlessSignedIn(); });
    const signedIn = async (page: Page): Promise<void> => { await expect(page.locator('.ux-avabtn').first()).toBeAttached({ timeout: 20_000 }); };

    signedInTest('composer avatar, Following tab, thread post payload, blog heart payload', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme, {
        'POST /api/verse/threads': { ok: true, id: 1, slug: 'fixture' },
        'POST /api/verse/essays/reactions': { ok: true, count: 1, mine: true },
      });
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      await signedIn(page);
      if (!isPhone(page)) await expect(page.locator('.p8-composer .ux-ava')).toBeVisible({ timeout: 15_000 });
      await page.locator('.p8-fctl [role="tab"]').nth(1).click();
      await expect(page.locator('.p8-empty, .p8-feed article.ux-post').first()).toBeVisible();
      await expect(page.locator('.p8-empty')).not.toContainText('Sign in');
      await page.locator('.p8-fctl [role="tab"]').nth(0).click();

      const heart = page.locator('.p8-card-blog .ux-pacts button[aria-pressed]').first();
      if (await heart.count()) {
        const was = await heart.getAttribute('aria-pressed');
        await heart.click();
        await expect(heart).toHaveAttribute('aria-pressed', 'true');
        const call = h.writes.find((w) => pathOf(w) === '/api/verse/essays/reactions');
        expect(call && bodyOf(call)).toMatchObject({ essay_id: expect.any(Number) });
        expect(was).not.toBeNull();
      }

      await page.locator('.p8-composer-in').click();
      const sheet = page.getByRole('dialog', { name: 'New thread' });
      const g = sheet.getByRole('combobox', { name: 'Group' });
      if ((await sheet.locator('.p8-gchip').count()) === 0) { await g.fill('bts'); await g.press('Enter'); }
      const groupName = (await sheet.locator('.p8-gchip').textContent())!.trim();
      await sheet.getByLabel('Title').fill('Which era got you in?');
      await sheet.getByLabel('Text').fill('Mine was Wings.');
      await sheet.getByRole('button', { name: 'Post' }).click();
      await page.waitForURL(/\/community\/thread\/1$/);
      const post = h.writes.find((w) => pathOf(w) === '/api/verse/threads');
      expect(post && bodyOf(post)).toEqual({ group_id: expect.any(Number), title: 'Which era got you in?', body: 'Mine was Wings.' });
      expect(groupName.length).toBeGreaterThan(0);
      expect(h.writes.filter((w) => !['/api/verse/threads', '/api/verse/essays/reactions'].includes(pathOf(w)))).toEqual([]);
    });

    signedInTest('rail vote + cheer payloads (or the saved vote)', async ({ page }) => {
      const h = await harness(page, theme, {
        'POST /api/debate/vote': { a: 3, b: 1 },
        'POST /api/cheer': { count: 1 },
      });
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      await signedIn(page);
      const scope = isPhone(page) ? page.locator('.p8-mine') : page.locator('.p8-rail');
      const vote = scope.locator('.p8-vote button');
      if (await vote.count()) {
        await page.waitForLoadState('networkidle');
        const voted = await scope.locator('.p8-vote.is-done').count();
        if (!voted) {
          await vote.first().click();
          await expect(scope.locator('.p8-vote.is-done')).toBeVisible();
          await expect(vote.first()).toHaveAttribute('aria-pressed', 'true');
          await expect(vote.first().locator('b')).toHaveText('75%');
          const call = h.writes.find((w) => pathOf(w) === '/api/debate/vote');
          expect(call && bodyOf(call)).toEqual({ side: 'a' });
        } else {
          await expect(scope.locator('.p8-vote-note')).toContainText('You voted.');
        }
      }
      const cheer = page.locator(isPhone(page) ? '.p8-mrail .p8-cheer' : '.p8-rail .p8-cheer').first();
      if (await cheer.count()) {
        await cheer.click();
        await expect(cheer).toHaveAttribute('aria-pressed', 'true');
        const call = h.writes.find((w) => pathOf(w) === '/api/cheer');
        expect(call && bodyOf(call)).toEqual({ event_id: expect.any(Number) });
      }
      expect(h.writes.filter((w) => !['/api/debate/vote', '/api/cheer'].includes(pathOf(w)))).toEqual([]);
    });

    signedInTest('blog reply payload', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme, { 'POST /api/verse/discussions': { ok: true, id: 987654 } });
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      const blog = page.locator('.p8-card-blog .ux-ptt a').first();
      if (await blog.count()) {
        const href = (await blog.getAttribute('href'))!;
        await open(page, href);
        await signedIn(page);
        const before = await page.locator('#replies > .ux-h2').textContent();
        await page.locator('.p8-cform textarea').fill('Great read.');
        await page.locator('.p8-cform').getByRole('button', { name: 'Reply' }).click();
        await expect(page.locator('.p8-cmt.is-new')).toContainText('Great read.');
        await expect(page.locator('#replies > .ux-h2')).not.toHaveText(before ?? '');
        const call = h.writes.find((w) => pathOf(w) === '/api/verse/discussions');
        expect(call && bodyOf(call)).toEqual({ entity_type: 'essay', entity_id: href.split('/').pop(), body: 'Great read.' });
      }
      expect(h.writes.filter((w) => pathOf(w) !== '/api/verse/discussions')).toEqual([]);
    });

    signedInTest('thread report payload, thread reply payload', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme, {
        'POST /api/verse/discussions': { ok: true, id: 987654 },
        'POST /api/verse/flags': { ok: true },
      });
      test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
      await signedIn(page);
      const thread = page.locator('.p8-feed article.ux-post').filter({ has: page.locator('.ux-ptype', { hasText: /^Thread/ }) }).locator('.ux-ptt a').first();
      if (await thread.count()) {
        const href = (await thread.getAttribute('href'))!;
        await open(page, href);
        await signedIn(page);
        await page.getByRole('button', { name: 'Report' }).click();
        await expect(page.getByRole('button', { name: 'Reported' })).toBeDisabled();
        const call = h.writes.find((w) => pathOf(w) === '/api/verse/flags');
        expect(call && bodyOf(call)).toEqual({ target_type: 'comment', target_id: expect.any(Number), reason: 'Reported from the community' });
        await page.locator('.p8-cform textarea').fill('Wings, no question.');
        await page.locator('.p8-cform').getByRole('button', { name: 'Reply' }).click();
        const reply = h.writes.filter((w) => pathOf(w) === '/api/verse/discussions').pop();
        expect(reply && bodyOf(reply)).toEqual({ thread_id: Number(href.split('/').pop()), body: 'Wings, no question.' });
      }
      const known = ['/api/verse/discussions', '/api/verse/flags'];
      expect(h.writes.filter((w) => !known.includes(pathOf(w)))).toEqual([]);
    });

    signedInTest('compose URL (P5 create done link): challenge mode lists the runs of that quiz, latest preselected; all scores on request', async ({ page, request }) => {
      test.skip((await verseMode(request)) === 'hidden', VERSE_OPEN_ONLY);
      const h = await harness(page, theme);
      const asked: string[] = [];
      const run = (id: string, label: string): Record<string, unknown> => ({ id, label, sub: '2h ago', thumb: null });
      await page.route((u) => u.pathname === '/api/ux-v1/p8/my-results', async (route) => {
        const u = new URL(route.request().url());
        asked.push(u.search);
        await json(route, u.searchParams.get('quiz')
          ? { results: [run('p-2', '8/10 · Fixture quiz'), run('p-1', '6/10 · Fixture quiz')], quiz: { slug: 'fixture-quiz', title: 'Fixture quiz' } }
          : { results: [run('p-3', '5/5 · Another quiz')] });
      });
      test.skip(!(await open(page, '/community?compose=challenge&quiz=fixture-quiz')), 'UX v1 flag is OFF on this build');
      await signedIn(page);
      const sheet = page.getByRole('dialog', { name: 'New challenge' });
      await expect(sheet).toBeVisible();
      const radios = sheet.getByRole('radio');
      await expect(radios).toHaveCount(2);
      await expect(radios.nth(0)).toBeChecked();
      expect(asked[0]).toBe('?quiz=fixture-quiz');
      await sheet.getByRole('button', { name: 'Show all my recent scores' }).click();
      await expect(radios).toHaveCount(1);
      await expect(radios.nth(0)).not.toBeChecked();
      expect(asked.at(-1)).toBe('');
      await expect(sheet.getByRole('button', { name: 'Show all my recent scores' })).toHaveCount(0);
      expect(h.writes).toEqual([]);
    });
  });
}

// ---- Verse gates (privacy fail-closed): one case per server mode --------------------------
// Run the server once with VERSE_PUBLIC=true (the local default) and once with
// VERSE_PUBLIC=false; each case skips on the other mode (see reports/P8.md, section 5).
test.describe('Verse gates', () => {
  test.describe.configure({ timeout: 240_000 });

  test('VERSE_PUBLIC=true: threads and blogs of live spaces only; Thread and Blog list live spaces only; debates list every group', async ({ page, request }) => {
    test.skip((await verseMode(request)) === 'hidden', 'this server runs with VERSE_PUBLIC off: the next case');
    const h = await harness(page, 'light');
    test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
    const types = (await page.locator('.p8-feed article.ux-post .ux-ptype').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
    const verse = types.filter((t) => /^(Thread|Blog)\b/.test(t));
    expect(verse.length, 'live-space threads and blogs are shown').toBeGreaterThan(0);
    const live = new RegExp(`· (${LIVE_SPACE_NAMES.join('|')})( ·|$)`);
    for (const t of verse) expect(t, 'every thread and blog is in a live space').toMatch(live);
    await expect(page.getByRole('tab', { name: 'Blogs' })).toBeVisible();

    await page.locator('.p8-composer-in').click();
    const sheet = page.getByRole('dialog', { name: 'New thread' });
    await expect(sheet.locator('.p8-modes4 button')).toHaveText(['Thread', 'Blog', 'Debate', 'Challenge']);
    const g = sheet.getByRole('combobox', { name: 'Group' });
    await g.fill('stray');
    await expect(sheet.getByRole('listbox', { name: 'Groups' })).toContainText('No open fandom space matches.');
    await sheet.locator('.p8-modes4').getByRole('button', { name: 'Debate' }).click();
    const debate = page.getByRole('dialog', { name: 'New debate' });
    await debate.getByRole('combobox', { name: 'Group' }).fill('stray');
    await expect(debate.getByRole('option', { name: 'Stray Kids' })).toBeVisible();
    expect(h.writes).toEqual([]);
  });

  test('VERSE_PUBLIC=false: no thread or blog anywhere, their URLs 404, no Blogs tab, no Thread or Blog mode', async ({ page, request }) => {
    test.skip((await verseMode(request)) === 'open', 'this server runs with VERSE_PUBLIC=true: the case above');
    const h = await harness(page, 'light');
    test.skip(!(await open(page, '/community')), 'UX v1 flag is OFF on this build');
    const types = (await page.locator('.p8-feed article.ux-post .ux-ptype').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
    expect(types.filter((t) => /^(Thread|Blog)\b/.test(t)), 'no Verse post in the feed').toEqual([]);
    expect(await page.locator('a[href^="/community/thread/"], a[href^="/community/blog/"]').count(), 'no link to a Verse post').toBe(0);
    await expect(page.locator('[role="tab"]').first()).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Blogs' })).toHaveCount(0);
    if (await page.locator('.p8-composer').count()) {
      await expect(page.locator('.p8-composer-in')).toHaveText('Start a debate or a challenge');
      await page.locator('.p8-composer-in').click();
      await expect(page.getByRole('dialog').locator('.p8-modes4 button')).toHaveText(['Debate', 'Challenge']);
      await page.keyboard.press('Escape');
    }
    // Real live-space rows (thread 1 and blog 2 are BTS): 404 like the Verse, noindex.
    for (const p of ['/community/thread/1', '/community/blog/2']) expect((await request.get(p, { timeout: 120_000 })).status(), p).toBe(404);
    // A compose URL for a Verse mode opens nothing.
    await open(page, '/community?compose=thread');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect(h.writes).toEqual([]);
  });
});
