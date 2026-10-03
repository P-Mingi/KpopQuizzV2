import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y } from '../ux-v1/helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from '../ux-v1/helpers/auth';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';
import { SAMPLE_DRAFT } from '../../../../docs/design/ux-dashboard-v1/v11/reports/P5/sample-draft.mjs';

import type { APIRequestContext, Page, Route } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';

// G8 (V12): the group hub additions, the share kit and /creators (prototype states
// hub-ways-to-play, hub-fans-picked, hub-empty-riize, hub-thin-katseye, share-kit,
// creators; landmarks of run/checks/reference/styles.json), at the project width,
// light and dark.
//
// No write reaches the database: every page is wrapped with guardWrites, which
// answers every POST/PUT/PATCH/DELETE locally and records it. The create done state
// is reached like the v11 P5 spec does it (the publish call answered by a local fake,
// signed in as the parity test user); the share kit's own read of the quiz
// (GET /api/creators/kit) is answered by a fixture because the fake quiz does not
// exist. The hubs and /creators are the real, read-only pages.
//
// Flag states (the server decides; the spec reads it from GET /creators, which the
// middleware sends to / unless v12 is on):
//   both on    the additions render, /creators is a page (noindex).
//   v11 only   the hubs, /leaderboard and create done are the v11 ones; /creators and
//              the two /api/creators routes are not served.
//   both off   the same.
// G8_EXPECT=v12 | v11 | off makes the state an assertion instead of a discovery.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.G8_EXPECT as 'v12' | 'v11' | 'off' | undefined;

test.describe.configure({ timeout: 180_000 });
signedInTest.describe.configure({ timeout: 180_000 });

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;
type Prop = (typeof PROPS)[number];

type State = 'hub-ways-to-play' | 'hub-fans-picked' | 'hub-empty-riize' | 'hub-thin-katseye' | 'share-kit' | 'creators';
interface Landmark { proto: string; impl: string; skip?: Prop[]; why?: string }

function refKey(width: number, theme: Theme, state: string): string {
  return `${width > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}-${state}`;
}

function expected(width: number, theme: Theme, state: string, proto: string): StyleMap | null {
  const raw = REFERENCE[refKey(width, theme, state)]?.[proto];
  if (!raw) return null;
  const out: StyleMap = { ...raw };
  for (const d of OWNER_DEVIATIONS) if (d.theme === theme && (d.proto === '*' || d.proto === proto) && out[d.prop] === d.from) out[d.prop] = d.to;
  return out;
}

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  return /^-?[\d.]+px$/.test(a.trim()) && /^-?[\d.]+px$/.test(b.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) <= 2;
}

async function computed(page: Page, selectors: string[]): Promise<Record<string, StyleMap | null>> {
  return page.evaluate(({ sels, props }) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = document.querySelector<HTMLElement>(s);
      if (!el || el.offsetParent === null) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { sels: selectors, props: [...PROPS] });
}

interface Mismatch { landmark: string; key: string; prop: string; expected: string; actual: string }
interface Compared { checked: string[]; missing: string[]; mismatches: Mismatch[]; skipped: string[] }
async function compare(page: Page, theme: Theme, state: State, marks: Landmark[]): Promise<Compared> {
  const key = refKey(widthOf(page), theme, state);
  const got = await computed(page, marks.map((l) => l.impl));
  const out: Compared = { checked: [], missing: [], mismatches: [], skipped: [] };
  for (const l of marks) {
    const exp = expected(widthOf(page), theme, state, l.proto);
    expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    if (!act) { out.missing.push(`${l.impl} (${key})`); continue; }
    out.checked.push(`${l.proto} @ ${key}`);
    for (const p of PROPS) {
      const e = exp[p]; const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (l.skip?.includes(p)) { out.skipped.push(`${l.proto} ${p} @ ${key}: reference ${e}, here ${a} (${l.why ?? 'content'})`); continue; }
      if (!close(e, a)) out.mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return out;
}

async function proof(page: Page, theme: Theme, state: State, marks: Landmark[]): Promise<Compared> {
  await page.mouse.move(1, 1);
  await page.evaluate(() => document.fonts.ready);
  const c = await compare(page, theme, state, marks);
  await test.info().attach(`g8-${refKey(widthOf(page), theme, state)}.json`, { body: JSON.stringify(c, null, 1), contentType: 'application/json' });
  return c;
}

// ---- helpers ------------------------------------------------------------------------

/** GET /creators: 200 only when v12 is on (the middleware sends it to / otherwise). Read only. */
async function flagState(request: APIRequestContext): Promise<'v12' | 'not-v12'> {
  const r = await request.get('/creators', { maxRedirects: 0 });
  return r.status() === 200 ? 'v12' : 'not-v12';
}

async function shot(page: Page, theme: Theme, state: State, target?: string): Promise<void> {
  const dir = process.env.G8_SHOTS;
  if (!dir) return;
  if (target) await page.locator(target).first().scrollIntoViewIfNeeded();
  else await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(dir, `${refKey(widthOf(page), theme, state)}.png`) });
}

async function openPage(page: Page, url: string): Promise<void> {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(res?.status(), `GET ${url}`).toBe(200);
  await waitHydrated(page);
}

/** The group's Fans picked status, from G7's read-only API. */
async function ranked(request: APIRequestContext, slug: string): Promise<boolean> {
  const r = await request.get(`/api/duel/fans-picked?group=${slug}`);
  if (!r.ok()) return false;
  return ((await r.json()) as { ranked?: boolean }).ranked === true;
}

const HUB_PRIMARY = '#ghub-play .ux-btn-primary';
// The prototype's first .btn-primary on a hub is the hero action of the v11 hub
// ("Play the top quiz"); its width is its label, which is the live one here.
const WAYS: Landmark[] = [
  { proto: '.gtile', impl: '.g8-ways .ux-gtile', skip: ['width', 'height'], why: 'the tile count and the copy are the group\'s real ones' },
  { proto: '.sec-h h2', impl: '.g8-ways .ux-sec-h h2', skip: ['width'], why: 'title text width' },
  { proto: '.btn-primary', impl: HUB_PRIMARY, skip: ['width'], why: 'label width' },
];
const FANS_PICKED: Landmark = { proto: '.fp .fr', impl: '.g8-fp .g8-fr', skip: ['width'], why: 'song title width' };
const EMPTY: Landmark[] = [
  { proto: '.fcreate', impl: '.g8-fcreate', skip: ['height'], why: 'the signals are the real ones, so the line count is the group\'s' },
  { proto: '.tpl', impl: '.g8-tpl' },
  { proto: '.btn-primary', impl: '.g8-fcreate .ux-btn-primary', skip: ['width'], why: 'label width' },
];
const THIN: Landmark[] = [
  { proto: '.nudge', impl: '.g8-nudge', skip: ['height'], why: 'the body line is the real play count or none' },
  ...WAYS,
];
const KIT: Landmark[] = [
  { proto: '.kit .story', impl: '.g8-kit-story .ux-story' },
  { proto: '.kitsec', impl: '.g8-kitsec', skip: ['height'], why: 'the link is the local one' },
];
const CREATORS: Landmark[] = [
  { proto: '.cbgrid', impl: '.g8-cbgrid', skip: ['height'], why: 'the board rows are the real ones' },
  { proto: '.tiers3', impl: '.g8-tiers' },
  { proto: '.btn-primary', impl: '.g8-cb-cta' },
];
const RISING: Landmark[] = [
  { proto: '.rising', impl: '.g8-rising', skip: ['height'], why: 'one row per real fandom' },
  { proto: '.sec-h h2', impl: '.g8-rising-sec .ux-sec-h h2', skip: ['width'], why: 'title text width' },
];

function assertClean(c: Compared, state: State): void {
  expect(c.missing, `${state}: every landmark is on the page`).toEqual([]);
  expect(c.mismatches, `${state}: boxes within 2px, styles equal to styles.json`).toEqual([]);
}

// ---- the hub reference states ---------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`G8 group hub ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page, request }) => {
      test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });
    test.afterEach(() => { expect(writes, 'a hub visit writes nothing').toEqual([]); });

    test('hub-ways-to-play and hub-fans-picked (Stray Kids): tiles that exist, the quizzes anchor, Fans picked only when ranked', async ({ page, request }) => {
      await openPage(page, '/stray-kids-quiz');
      await expect(page.locator('h1')).toHaveCount(1);
      const ways = page.getByTestId('hub-ways');
      await expect(ways).toBeVisible();
      await expect(ways.locator('h2')).toHaveText('Ways to play');
      const tiles = ways.locator('a.ux-gtile');
      const n = await tiles.count();
      expect(n, 'two to four tiles').toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(4);
      await expect(tiles.first()).toHaveAttribute('href', '#hub-quizzes');
      await expect(page.locator('#hub-quizzes')).toHaveCount(1);
      const hrefs = await tiles.evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      // only ways that exist for the group, in the prototype's order
      const order = ['#hub-quizzes', '/blindtest/group-stray-kids', '/stray-kids-name-all-members', '/which-stray-kids-member-are-you', '#fans-picked'];
      const known = hrefs.filter((h) => order.includes(h ?? '') || (h ?? '').startsWith('/live?'));
      expect(known, 'every tile is a known way to play').toEqual(hrefs);
      const idx = hrefs.filter((h) => order.includes(h ?? '')).map((h) => order.indexOf(h ?? ''));
      expect([...idx].sort((a, b) => a - b), 'prototype order').toEqual(idx);
      for (const h of hrefs.filter((x): x is string => Boolean(x) && !x!.startsWith('#'))) {
        expect((await request.get(h, { maxRedirects: 0 })).status(), `tile ${h}`).toBe(200);
      }
      const c = await proof(page, theme, 'hub-ways-to-play', WAYS);
      assertClean(c, 'hub-ways-to-play');
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.g8-ways')).toEqual([]);
      await shot(page, theme, 'hub-ways-to-play', '.g8-ways');

      // Fans picked: real data or nothing (G7 API decides)
      const isRanked = await ranked(request, 'stray-kids');
      const fp = page.getByTestId('hub-fans-picked');
      if (!isRanked) {
        await expect(fp, 'no ranking: the section is not rendered').toHaveCount(0);
        await expect(page.locator('a.ux-gtile[href="#fans-picked"]'), 'no This or that tile without a ranking').toHaveCount(0);
        test.info().annotations.push({ type: 'not-verified', description: 'hub-fans-picked: Stray Kids is not ranked yet (G7 data under its floor), the section is hidden as specified' });
        return;
      }
      await expect(fp).toHaveAttribute('id', 'fans-picked');
      await expect(fp.locator('h2')).toHaveText(/ picked$/);
      const fc = await proof(page, theme, 'hub-fans-picked', [FANS_PICKED, ...WAYS]);
      assertClean(fc, 'hub-fans-picked');
      expect(await basicA11y(page, '.g8-fp')).toEqual([]);
      await shot(page, theme, 'hub-fans-picked', '.g8-fp');
    });

    test('hub-thin-katseye: the nudge with the real count, ways to play below it', async ({ page }) => {
      await openPage(page, '/katseye-quiz');
      const nudge = page.getByTestId('hub-nudge');
      test.skip((await nudge.count()) === 0, 'KATSEYE is not a thin hub any more (real data)');
      await expect(nudge.locator('b')).toHaveText(/^Only [12] KATSEYE quiz(zes)? so far\.$/);
      await expect(nudge.locator('p')).toHaveText(/^(Fans played (it|them) [\d,]+ times in the last 60 days\. )?Make the next one and it shows here for every EYEKON\.$/);
      await expect(nudge.getByRole('link', { name: 'Create a quiz' })).toHaveAttribute('href', '/create?group=katseye');
      await expect(page.getByTestId('hub-first')).toHaveCount(0);
      const c = await proof(page, theme, 'hub-thin-katseye', THIN);
      assertClean(c, 'hub-thin-katseye');
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.g8-nudge')).toEqual([]);
      await shot(page, theme, 'hub-thin-katseye', '.g8-nudge');
    });

    test('hub-empty-riize: Be the first with real signals and three templates, no ways to play', async ({ page }) => {
      await openPage(page, '/riize-quiz');
      const first = page.getByTestId('hub-first');
      test.skip((await first.count()) === 0, 'RIIZE has a quiz now (real data)');
      await expect(first.locator('h2')).toHaveText('No RIIZE quiz yet. Be the first.');
      await expect(first.locator('li').last()).toHaveText('You get the Quiz maker badge and an alert at 10, 100 and 1,000 plays.');
      await expect(first.locator('li').filter({ hasText: /RIIZE songs are already in the blindtest|Fans played the RIIZE blindtest/ }).first()).toHaveText(/^[\d,]+ RIIZE songs|^Fans played the RIIZE blindtest [\d,]+ times\.$/);
      await expect(first.getByRole('link', { name: 'Create the first RIIZE quiz' })).toHaveAttribute('href', '/create?group=riize');
      const tpl = first.locator('a.g8-tpl');
      await expect(tpl).toHaveCount(3);
      expect(await tpl.evaluateAll((as) => as.map((a) => a.getAttribute('href')))).toEqual([
        '/create?group=riize&type=multiple_choice', '/create?group=riize&type=true_false', '/create?group=riize&type=guess_from_clues']);
      await expect(page.getByTestId('hub-ways')).toHaveCount(0);
      await expect(page.getByTestId('hub-nudge')).toHaveCount(0);
      const c = await proof(page, theme, 'hub-empty-riize', EMPTY);
      assertClean(c, 'hub-empty-riize');
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.g8-fcreate')).toEqual([]);
      await shot(page, theme, 'hub-empty-riize', '.g8-fcreate');
    });
  });
}

// ---- create done and the share kit (signed in, publish answered locally) ----------------

const FAKE_QUIZ = { id: '0e8e2c4a-6b1f-4c1e-9a43-0c6f0b9d8a11', slug: 'g8-e2e-slug', creator_stats: { quizzes_created: 2, plays_received: 5 } };
const KIT_FIXTURE = (linkPlays: number | null): unknown => ({
  quiz: { id: FAKE_QUIZ.id, slug: FAKE_QUIZ.slug, title: SAMPLE_DRAFT.title, questions: 3 },
  group: { name: 'BTS', slug: 'bts', fandom: 'ARMY' },
  linkPlays,
});

interface Done { calls: StubbedCall[]; posts: string[]; kitReads: string[] }

/** /create with the P5 sample draft at step 3 and ?resume=publish: the publish call is
 *  answered by a local fake, every other write by guardWrites. Lands on create done. */
async function toCreateDone(page: Page, theme: Theme, linkPlays: number | null): Promise<Done> {
  await preparePage(page, theme);
  const calls = await guardWrites(page, env.supabaseUrl);
  const posts: string[] = [];
  const kitReads: string[] = [];
  await page.route('**/api/quiz/create', async (route: Route) => {
    if (route.request().method() === 'GET') { await route.continue(); return; }
    posts.push(new URL(route.request().url()).pathname);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(FAKE_QUIZ) });
  });
  await page.route('**/api/quiz/title-check**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ exists: false }) }));
  await page.route('**/api/creators/kit**', async (route: Route) => {
    kitReads.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(KIT_FIXTURE(linkPlays)) });
  });
  const seed = JSON.stringify({ ...SAMPLE_DRAFT, updatedAt: Date.now() });
  await page.addInitScript(({ d }) => {
    try {
      if (sessionStorage.getItem('g8-seeded')) return;
      sessionStorage.setItem('g8-seeded', '1');
      localStorage.removeItem('ux:pending-action');
      localStorage.setItem('kq_create_draft_v1', d);
      localStorage.setItem('kq_create_step_v1', '3');
    } catch { /* blocked */ }
  }, { d: seed });
  await page.goto('/create?resume=publish', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await waitHydrated(page);
  return { calls, posts, kitReads };
}

for (const theme of THEMES) {
  signedInTest.describe(`G8 share kit ${theme}`, () => {
    signedInTest('share-kit: create done opens the kit; link, QR, captions with the fandom, challenge door, plays only when real', async ({ page, request, context }) => {
      skipUnlessSignedIn();
      test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      const plays = theme === 'dark' ? 12 : null;
      const { calls, posts, kitReads } = await toCreateDone(page, theme, plays);
      await expect(page.locator('.p5-done')).toBeVisible({ timeout: 60_000 });
      expect(posts).toEqual(['/api/quiz/create']);
      await expect(page.getByRole('link', { name: 'Post a challenge' }), 'the challenge door moved into the kit').toHaveCount(0);
      const open = page.getByTestId('open-share-kit');
      await expect(open).toHaveText('Open the share kit');
      await open.click();
      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible();
      await expect(sheet.getByRole('heading', { name: 'Share kit' })).toBeVisible();
      const kit = sheet.getByTestId('share-kit');
      await expect.poll(() => kitReads.length).toBeGreaterThanOrEqual(1);
      expect(new URL(kitReads[0]!).searchParams.get('quiz')).toBe(FAKE_QUIZ.id);
      // the tracked link: POST /api/share/generate answered {} locally, so the quiz URL stays
      await expect.poll(() => calls.filter((c) => c.url.includes('/api/share/generate')).length).toBe(1);
      expect(JSON.parse(calls.find((c) => c.url.includes('/api/share/generate'))!.body ?? '{}')).toEqual({ quizId: FAKE_QUIZ.id, platform: 'link' });
      await expect(kit.getByTestId('kit-url')).toHaveText(/^localhost:\d+\/q\/g8-e2e-slug$/);
      await expect(kit.getByRole('img', { name: 'QR code of your quiz link' })).toHaveAttribute('src', /^data:image\//);
      await expect(kit.locator('.g8-cap')).toHaveCount(2);
      await expect(kit.locator('.g8-cap').first()).toContainText('Calling all ARMYs: try my new BTS quiz.');
      await expect(kit.locator('.g8-cap').first()).toContainText('#BTS #ARMY');
      await expect(kit.locator('.g8-cap').nth(1)).toContainText('I made a BTS quiz: ');
      await expect(kit.locator('.g8-cap').nth(1)).toContainText('3 questions. Link in bio.');
      await expect(kit.getByRole('link', { name: 'Post a challenge' })).toHaveAttribute('href', '/community?compose=challenge&quiz=g8-e2e-slug');
      if (plays === null) await expect(kit.getByTestId('kit-plays'), 'no number without a real count').toHaveCount(0);
      else await expect(kit.getByTestId('kit-plays')).toContainText('12 plays from your link');
      await expect(kit).not.toContainText(/\u2014|\u2013/);
      await kit.getByRole('button', { name: 'Copy the X (Twitter) caption' }).click();
      await expect(page.getByTestId('ux-toast')).toHaveText('Caption copied');

      const c = await proof(page, theme, 'share-kit', KIT);
      assertClean(c, 'share-kit');
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.g8-kit')).toEqual([]);
      await shot(page, theme, 'share-kit');
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      // writes: the tracked link only, answered locally (the publish had its own fake)
      expect(calls.map((c2) => new URL(c2.url).pathname)).toEqual(['/api/share/generate']);
    });
  });
}

signedInTest.describe('G8 create done, flag off', () => {
  signedInTest('v11 only: create done keeps "Post a challenge" and has no share kit', async ({ page, request }) => {
    skipUnlessSignedIn();
    test.skip((await flagState(request)) === 'v12', 'v12 is served here');
    const { calls, kitReads } = await toCreateDone(page, 'light', null);
    test.skip((await page.locator('.ux-shell, [data-ux-shell]').count()) === 0 && (await page.locator('.p5-col').count()) === 0, 'v11 shell off: legacy create');
    await expect(page.locator('.p5-done')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('link', { name: 'Post a challenge' })).toHaveAttribute('href', '/community?compose=challenge&quiz=g8-e2e-slug');
    await expect(page.getByTestId('open-share-kit')).toHaveCount(0);
    expect(kitReads).toEqual([]);
    expect(calls).toEqual([]);
  });
});

// ---- /creators ----------------------------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`G8 creators ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page, request }) => {
      test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });
    test.afterEach(() => { expect(writes, '/creators writes nothing').toEqual([]); });

    test('creators: two periods, rules, tiers, noindex; editorial and own plays out (server rule); landmarks', async ({ page }) => {
      await openPage(page, '/creators');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Top quiz creators');
      expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex, follow');
      await expect(page.getByRole('tab')).toHaveText(['This month', 'All time']);
      const month = page.locator('[data-period="month"]');
      const all = page.locator('[data-period="all"]');
      await expect(month).toBeVisible();
      await expect(all).toBeHidden();
      await page.getByRole('tab', { name: 'All time' }).click();
      await expect(all).toBeVisible();
      await expect(month).toBeHidden();
      await page.getByRole('tab', { name: 'This month' }).click();
      // every row is a real creator with a real play count, or the board says it is empty
      for (const board of [month, all]) {
        const rows = board.locator('.p9-pod, .ux-row');
        if ((await rows.count()) === 0) await expect(board.locator('.g8-cr-empty')).toHaveCount(1);
      }
      await expect(page.locator('.g8-rules').first().locator('li')).toHaveCount(3);
      await expect(page.locator('.g8-rules').first()).toContainText('Your own plays never count.');
      await expect(page.locator('.g8-tiers li')).toHaveCount(3);
      await expect(page.locator('.g8-cb-cta')).toHaveAttribute('href', '/create');
      await expect(page.getByRole('link', { name: 'Back to the leaderboard' })).toHaveAttribute('href', '/leaderboard#creators');
      const rising = (await page.locator('.g8-rising').count()) > 0;
      if (!rising) test.info().annotations.push({ type: 'not-verified', description: 'creators .rising: no fandom has a first quiz with plays this month (real data), the section is hidden' });
      const c = await proof(page, theme, 'creators', rising ? [...CREATORS, ...RISING] : CREATORS);
      assertClean(c, 'creators');
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.g8-cr')).toEqual([]);
      await shot(page, theme, 'creators');
    });
  });
}

// ---- behaviour, links, flag states ----------------------------------------------------------

test.describe('G8 behaviour', () => {
  let writes: StubbedCall[] = [];
  test.beforeEach(async ({ page }) => {
    await preparePage(page, 'light');
    writes = await guardWrites(page, env.supabaseUrl);
  });
  test.afterEach(() => { expect(writes).toEqual([]); });

  test('flag state is the expected one', async ({ request }) => {
    const state = await flagState(request);
    if (EXPECT) expect(state).toBe(EXPECT === 'v12' ? 'v12' : 'not-v12');
    test.info().annotations.push({ type: 'flag-state', description: state });
  });

  test('the creators APIs are read only and refuse what they cannot read', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    expect((await request.get('/api/creators/kit?quiz=not-a-uuid')).status()).toBe(400);
    expect((await request.get(`/api/creators/kit?quiz=${FAKE_QUIZ.id}`)).status(), 'unknown quiz').toBe(404);
    const standing = await request.get('/api/creators/standing');
    expect(standing.status()).toBe(200);
    expect(await standing.json()).toEqual({ signedIn: false, me: null, standing: null });
  });

  test('leaderboard links the creators board (flag on) and keeps every v11 link', async ({ page, request }) => {
    const v12 = (await flagState(request)) === 'v12';
    const html = await (await request.get('/leaderboard')).text();
    expect(html.includes('href="/creators"'), 'the link is in the server HTML only with v12').toBe(v12);
    await openPage(page, '/leaderboard');
    await expect(page.locator('h1')).toHaveCount(1);
    if (v12) await expect(page.locator('.g8-lb-creators a')).toHaveAttribute('href', '/creators');
    else await expect(page.locator('.g8-lb-creators')).toHaveCount(0);
  });

  test('flag off: no addition on the hubs, /creators and its APIs are not served', async ({ page, request }) => {
    test.skip((await flagState(request)) === 'v12', 'v12 is served here');
    const r = await request.get('/creators', { maxRedirects: 0 });
    expect([301, 307, 308, 404], `GET /creators ${r.status()}`).toContain(r.status());
    expect((await request.get(`/api/creators/kit?quiz=${FAKE_QUIZ.id}`)).status()).toBe(404);
    expect((await request.get('/api/creators/standing')).status()).toBe(404);
    for (const url of ['/stray-kids-quiz', '/katseye-quiz', '/riize-quiz']) {
      await openPage(page, url);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('[data-testid^="hub-"], .g8-ways, .g8-nudge, .g8-fcreate, .g8-fp, #hub-quizzes'), `${url}: no v12 block`).toHaveCount(0);
    }
  });
});
