import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from '../ux-v1/helpers/a11y';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { APIRequestContext, Page } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';

// G7 (V12): the This or that bonus card on the quiz results (prototype states
// quiz-bonus and quiz-bonus-voted, landmarks .tot / .toto / .totf of
// run/checks/reference/styles.json), at the project width, light and dark.
//
// No write reaches the database: every page is wrapped with guardWrites, and the
// two duel calls are answered by the spec itself (the pairs the card shows, the
// split a vote returns), which also lets it assert what the card sends. The quiz
// is a real published quiz, read only. Run with NEXT_PUBLIC_BT_TRACKING unset.
//
// Flag states (the server decides, the spec reads it from /api/duel/pairs):
//   both on    the card renders when the server hands out pairs.
//   v11 only   /api/duel/* answers 404 and the results page never asks for pairs.
// G7_EXPECT=v12 | v11 makes the state an assertion instead of a discovery.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.G7_EXPECT as 'v12' | 'v11' | undefined;
const QUIZ = 'ultimate-bts-era-quiz-only-real-armys-survive';

test.describe.configure({ timeout: 180_000 });

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;

interface Landmark { proto: string; impl: string }
const LANDMARKS: Landmark[] = [
  { proto: '.tot', impl: '.ux-tot' },
  { proto: '.toto', impl: '.ux-toto' },
  { proto: '.totf', impl: '.ux-tot-f' },
];

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
async function compare(page: Page, theme: Theme, state: string): Promise<{ checked: string[]; missing: string[]; mismatches: Mismatch[]; got: Record<string, StyleMap | null> }> {
  const w = widthOf(page);
  const got = await computed(page, LANDMARKS.map((l) => l.impl));
  const checked: string[] = [];
  const missing: string[] = [];
  const mismatches: Mismatch[] = [];
  for (const l of LANDMARKS) {
    const key = refKey(w, theme, state);
    const exp = expected(w, theme, state, l.proto);
    expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    if (!act) { missing.push(`${l.impl} (${key})`); continue; }
    checked.push(`${l.proto} @ ${key}`);
    for (const p of PROPS) {
      const e = exp[p]; const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (!close(e, a)) mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return { checked, missing, mismatches, got };
}

// ---- the duel calls, answered here ------------------------------------------------

const sid = (n: number): string => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
// The prototype's own five BTS pairs (titles and years), so the boxes are comparable.
const PROTO_PAIRS: Array<[string, number | null, string, number | null]> = [
  ['Dynamite', 2020, 'Butter', 2021],
  ['Spring Day', 2017, 'Blood Sweat & Tears', 2016],
  ['Fake Love', 2018, 'IDOL', 2018],
  ['Life Goes On', 2020, 'Permission to Dance', 2021],
  ['DNA', 2017, 'Boy With Luv', null],
];

interface DuelMock { votes: Array<{ token: unknown; winner: unknown; anon: string | null }>; pairsRequests: number }
interface MockOptions {
  pairs?: number;
  ranked?: boolean;
  fandom?: string | null;
  /** answer of the vote call: a split, null (too few votes), or an HTTP error */
  vote?: { a: number; b: number; total: number } | null | { status: number };
  cover?: string | null;
}

async function mockDuel(page: Page, opts: MockOptions = {}): Promise<DuelMock> {
  const mock: DuelMock = { votes: [], pairsRequests: 0 };
  const n = opts.pairs ?? 5;
  const fandom = opts.fandom === undefined ? 'ARMY' : opts.fandom;
  const vote = opts.vote === undefined ? { a: 54, b: 46, total: 100 } : opts.vote;
  await page.route((url) => url.pathname === '/api/duel/pairs', async (route) => {
    mock.pairsRequests += 1;
    expect(new URL(route.request().url()).searchParams.get('group')).toBe('bts');
    expect(route.request().headers()['x-duel-anon'] ?? '', 'the browser id travels in a header').toMatch(/^[0-9a-f-]{36}$/);
    await route.fulfill({ json: {
      pairs: PROTO_PAIRS.slice(0, n).map(([ta, ya, tb, yb], i) => ({
        token: `spec-token-${i + 1}`,
        a: { id: sid(i * 2 + 1), title: ta, year: ya, cover: opts.cover ?? null },
        b: { id: sid(i * 2 + 2), title: tb, year: yb, cover: null },
      })),
      group: { slug: 'bts', name: 'BTS', fandom },
      ranked: opts.ranked ?? true,
    } });
  });
  await page.route((url) => url.pathname === '/api/duel/vote', async (route) => {
    const req = route.request();
    expect(req.method()).toBe('POST');
    const body = JSON.parse(req.postData() ?? '{}') as { token?: unknown; winner?: unknown };
    mock.votes.push({ token: body.token, winner: body.winner, anon: req.headers()['x-duel-anon'] ?? null });
    expect(Object.keys(body).sort(), 'the vote carries the token and the side, nothing else').toEqual(['token', 'winner']);
    if (vote && 'status' in vote) { await route.fulfill({ status: vote.status, json: { error: 'not_live' } }); return; }
    await route.fulfill({ json: { status: 'ok', split: vote } });
  });
  return mock;
}

// ---- reaching the results (same steps as e2e/ux-v1/p4.spec.ts) ---------------------

interface Q { options?: unknown[]; correct: number | boolean }

async function recordQuestions(page: Page): Promise<{ get: () => Q[] }> {
  let qs: Q[] = [];
  await page.route(/\/api\/quiz\/[^/]+\/questions$/, async (route) => {
    const res = await route.fetch();
    const json = (await res.json()) as { questions: Q[] };
    qs = json.questions;
    await route.fulfill({ response: res, json });
  });
  return { get: () => qs };
}

async function openQuiz(page: Page): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    const res = await page.goto(`/q/${QUIZ}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    expect(res?.status(), `GET /q/${QUIZ}`).toBe(200);
    if (!(await hasShell(page))) return false;
    if ((await page.locator('.p4-page').count()) > 0) break;
    expect(attempt, 'the quiz page rendered').toBeLessThan(3);
  }
  await waitHydrated(page);
  await page.locator('.p4-act[data-ready], .p4-qq').first().waitFor({ state: 'attached', timeout: 90_000 });
  return true;
}

async function playToResults(page: Page, qs: () => Q[]): Promise<void> {
  const question = page.locator('.p4-qq');
  const failed = page.locator('.ux-toast.is-shown', { hasText: "Couldn't load the questions" });
  for (let attempt = 1; ; attempt++) {
    await page.locator('.p4-act .ux-btn-primary').click();
    await expect(question.or(failed)).toBeVisible({ timeout: 90_000 });
    if (await question.isVisible()) break;
    expect(attempt, 'the questions read failed three times').toBeLessThan(3);
    await expect(failed).toHaveCount(0, { timeout: 15_000 });
  }
  const answers = page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');
  for (let guard = 0; guard < 40; guard++) {
    const idx = Number(await page.locator('.p4-segs').getAttribute('aria-valuenow')) - 1;
    const q = qs()[idx];
    const right = q && typeof q.correct === 'number' ? q.correct : 0;
    await answers.nth(right).click();
    const next = page.locator('.p4-nextrow .ux-btn-primary');
    await expect(next).toBeVisible();
    const label = await next.innerText();
    await next.click();
    if (/result/i.test(label)) break;
    await expect(answers.first()).toBeEnabled();
  }
  await expect(page.locator('.p4-pcard')).toBeVisible({ timeout: 20_000 });
}

async function flagState(request: APIRequestContext): Promise<'v12' | 'v11'> {
  const r = await request.get('/api/duel/pairs?group=bts');
  return r.status() === 404 ? 'v11' : 'v12';
}

/** Results of the BTS quiz with the duel calls answered by the spec. Null = v12 not served here. */
async function results(page: Page, request: APIRequestContext, opts?: MockOptions): Promise<DuelMock | null> {
  if ((await flagState(request)) !== 'v12') return null;
  const mock = await mockDuel(page, opts);
  const qs = await recordQuestions(page);
  if (!(await openQuiz(page))) return null;
  await playToResults(page, qs.get);
  return mock;
}

const DUEL_PATH = /^\/api\/duel\//;
const duelWrites = (calls: StubbedCall[]): StubbedCall[] => calls.filter((c) => DUEL_PATH.test(new URL(c.url).pathname));

for (const theme of THEMES) {
  test.describe(`G7 bonus card ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });
    test.afterEach(() => {
      // the spec answers the duel calls before guardWrites sees them: none may fall through
      expect(duelWrites(writes), 'no duel write fell through to the server').toEqual([]);
    });

    test('quiz-bonus then quiz-bonus-voted: reference landmarks, payload, a11y, no sideways scroll', async ({ page, request }, info) => {
      const mock = await results(page, request);
      test.skip(!mock, 'v12 not served here');
      if (!mock) return;
      const card = page.getByTestId('tot');
      await expect(card).toBeVisible({ timeout: 30_000 });
      await card.scrollIntoViewIfNeeded();

      // open state
      await expect(card).toHaveAttribute('data-state', 'open');
      await expect(card.locator('h2')).toHaveText('Which one do you replay more?');
      await expect(card.locator('.ux-kicker')).toHaveText('Bonus · This or that');
      await expect(card.locator('.ux-toto')).toHaveCount(2);
      await expect(card.locator('.ux-toto').nth(0)).toContainText('Dynamite');
      await expect(card.locator('.ux-toto').nth(0).locator('small')).toHaveText('BTS · 2020');
      await expect(card.locator('.ux-toto').nth(1).locator('small')).toHaveText('BTS · 2021');
      await expect(card.locator('.ux-tot-dots')).toHaveAttribute('aria-label', 'Pair 1 of 5');
      await expect(card.locator('.ux-tot-dots i.is-on')).toHaveCount(1);
      await expect(card.getByTestId('tot-msg')).toHaveText('Tap the one you replay more.');
      await expect(card.locator('.ux-toto-pc')).toHaveCount(0); // no split before a vote
      await expect(page.locator('h1')).toHaveCount(1);
      // it sits between the result actions and Keep playing (prototype #e-tot)
      const order = await page.evaluate(() => {
        const y = (s: string): number => document.querySelector(s)?.getBoundingClientRect().top ?? -1;
        return [y('.p4-resact'), y('.ux-tot'), y('.p4-keep')];
      });
      expect(order[0]).toBeLessThan(order[1] as number);
      expect(order[1]).toBeLessThan(order[2] as number);

      const open = await compare(page, theme, 'quiz-bonus');
      await info.attach(`g7-${refKey(widthOf(page), theme, 'quiz-bonus')}.json`, { body: JSON.stringify(open, null, 1), contentType: 'application/json' });
      expect(open.missing).toEqual([]);
      expect(open.mismatches, 'quiz-bonus: boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(open.checked).toHaveLength(LANDMARKS.length);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      if (process.env.G7_SHOTS) await card.evaluate((e) => { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); });
      if (process.env.G7_SHOTS) await page.screenshot({ path: path.join(process.env.G7_SHOTS, `${refKey(widthOf(page), theme, 'quiz-bonus')}.png`) });

      // vote for the first song
      await card.locator('.ux-toto').nth(0).click();
      await expect(card).toHaveAttribute('data-state', 'voted');
      expect(mock.votes).toHaveLength(1);
      expect(mock.votes[0]).toMatchObject({ token: 'spec-token-1', winner: 'a' });
      expect(mock.votes[0]?.anon).toMatch(/^[0-9a-f-]{36}$/);
      await expect(card.locator('.ux-toto').nth(0)).toHaveClass(/is-picked/);
      await expect(card.locator('.ux-toto').nth(1)).not.toHaveClass(/is-picked/);
      await expect(card.locator('.ux-toto-pc').nth(0)).toHaveText('54%');
      await expect(card.locator('.ux-toto-pc').nth(1)).toHaveText('46%');
      await expect(card.getByTestId('tot-msg')).toHaveText('You agree with 54% of ARMY');
      const next = card.getByRole('button', { name: 'Next pair' });
      await expect(next).toBeFocused();
      // a second tap on a song does nothing
      await card.locator('.ux-toto').nth(1).click({ force: true });
      expect(mock.votes).toHaveLength(1);

      const voted = await compare(page, theme, 'quiz-bonus-voted');
      await info.attach(`g7-${refKey(widthOf(page), theme, 'quiz-bonus-voted')}.json`, { body: JSON.stringify(voted, null, 1), contentType: 'application/json' });
      expect(voted.missing).toEqual([]);
      expect(voted.mismatches, 'quiz-bonus-voted: boxes within 2px, styles equal to styles.json').toEqual([]);
      if (process.env.G7_SHOTS) await card.evaluate((e) => { e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); });
      if (process.env.G7_SHOTS) await page.screenshot({ path: path.join(process.env.G7_SHOTS, `${refKey(widthOf(page), theme, 'quiz-bonus-voted')}.png`) });

      expect(await basicA11y(page, '.ux-tot')).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-tot' });
      if (axe) expect(axe, 'axe serious / critical in the card').toEqual([]);
    });
  });
}

test.describe('G7 bonus card behaviour', () => {
  let writes: StubbedCall[] = [];
  test.beforeEach(async ({ page }) => {
    await preparePage(page, 'light');
    writes = await guardWrites(page, env.supabaseUrl);
  });
  test.afterEach(() => {
    expect(duelWrites(writes), 'no duel write fell through to the server').toEqual([]);
  });

  test('flag state is the expected one', async ({ request }) => {
    const state = await flagState(request);
    if (EXPECT) expect(state).toBe(EXPECT);
    test.info().annotations.push({ type: 'flag-state', description: state });
  });

  test('five pairs in a row, then the thanks with the real count and the link to the ranking', async ({ page, request }) => {
    const mock = await results(page, request);
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    for (let i = 0; i < 5; i++) {
      await expect(card.locator('.ux-tot-dots')).toHaveAttribute('aria-label', `Pair ${i + 1} of 5`);
      await expect(card.locator('.ux-tot-dots i.is-on')).toHaveCount(i + 1);
      await card.locator('.ux-toto').nth(i % 2).click();
      await expect(card).toHaveAttribute('data-state', 'voted');
      await card.getByRole('button', { name: i < 4 ? 'Next pair' : 'Finish' }).click();
    }
    expect(mock.votes.map((v) => [v.token, v.winner])).toEqual([
      ['spec-token-1', 'a'], ['spec-token-2', 'b'], ['spec-token-3', 'a'], ['spec-token-4', 'b'], ['spec-token-5', 'a'],
    ]);
    await expect(card).toHaveAttribute('data-state', 'done');
    await expect(card.locator('h2')).toHaveText("Thanks. Your votes are in ARMY's top 10.");
    await expect(card.locator('.ux-tot-f span').first()).toHaveText('5 of 5 pairs');
    const link = card.getByRole('link', { name: 'See what ARMY picked' });
    await expect(link).toHaveAttribute('href', '/bts-quiz#fans-picked');
    // one read per results screen (a dev server mounts every effect twice: React StrictMode)
    expect(mock.pairsRequests).toBeGreaterThanOrEqual(1);
    expect(mock.pairsRequests).toBeLessThanOrEqual(2);
  });

  test('a year the catalogue does not have is not shown', async ({ page, request }) => {
    const mock = await results(page, request);
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    for (let i = 0; i < 4; i++) {
      await card.locator('.ux-toto').nth(0).click();
      await card.getByRole('button', { name: 'Next pair' }).click();
    }
    await expect(card.locator('.ux-toto').nth(0).locator('small')).toHaveText('BTS · 2017');
    await expect(card.locator('.ux-toto').nth(1)).toContainText('Boy With Luv');
    await expect(card.locator('.ux-toto').nth(1).locator('small')).toHaveText('BTS');
  });

  test('Skip after two votes: the count is the real one, no fandom and no ranking are not invented', async ({ page, request }) => {
    const mock = await results(page, request, { ranked: false, fandom: null });
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.locator('.ux-toto').nth(1).click();
    await expect(card.getByTestId('tot-msg')).toHaveText('You agree with 46% of fans');
    await card.getByRole('button', { name: 'Next pair' }).click();
    await card.locator('.ux-toto').nth(0).click();
    await card.getByRole('button', { name: 'Next pair' }).click();
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(card).toHaveAttribute('data-state', 'done');
    await expect(card.locator('.ux-tot-f span').first()).toHaveText('2 of 5 pairs');
    // no ranking for the group yet: no promise about a top 10 page, no link to it
    await expect(card.locator('h2')).toHaveText('Thanks. Your votes count toward the fans top 10.');
    await expect(card.getByRole('link')).toHaveCount(0);
    expect(mock.votes).toHaveLength(2);

  });

  test('Skip before any vote removes the card and sends nothing', async ({ page, request }) => {
    const mock = await results(page, request);
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('tot')).toHaveCount(0);
    expect(mock.votes).toEqual([]);
    await expect(page.locator('.p4-keep')).toBeVisible();
  });

  test('a pair with too few votes shows no split, only that the vote counted', async ({ page, request }) => {
    const mock = await results(page, request, { vote: null });
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.locator('.ux-toto').nth(0).click();
    await expect(card).toHaveAttribute('data-state', 'voted');
    await expect(card.locator('.ux-toto-pc')).toHaveCount(0);
    await expect(card.getByTestId('tot-msg')).toHaveText('Vote counted. This pair needs more votes before it shows a split.');
    await expect(card.locator('.ux-toto').nth(0)).toHaveClass(/is-picked/);
    await expect(card).not.toContainText('%');
  });

  test('a refused vote is said, never shown as counted, and can be retried', async ({ page, request }) => {
    const mock = await results(page, request, { vote: { status: 503 } });
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.locator('.ux-toto').nth(0).click();
    await expect(card.getByTestId('tot-msg')).toHaveText('Your vote was not saved. Tap again.');
    await expect(card).toHaveAttribute('data-state', 'open');
    await expect(card.locator('.ux-toto.is-picked')).toHaveCount(0);
    await expect(card.locator('.ux-toto-pc')).toHaveCount(0);
    await card.locator('.ux-toto').nth(0).click();
    expect(mock.votes).toHaveLength(2);
    await card.getByRole('button', { name: 'Skip' }).click();
    await expect(page.getByTestId('tot')).toHaveCount(0); // nothing was counted
  });

  test('a Deezer cover is asked in a small size and is decorative', async ({ page, request }) => {
    await page.route((url) => url.host === 'cdn-images.dzcdn.net', (route) => route.abort());
    const mock = await results(page, request, { cover: 'https://cdn-images.dzcdn.net/images/cover/89073b58a3ce20e32384f246b92f1c76/1000x1000-000000-80-0-0.jpg' });
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    const card = page.getByTestId('tot');
    await expect(card).toBeVisible({ timeout: 30_000 });
    const img = card.locator('.ux-toto').nth(0).locator('.ux-toto-cov img');
    await expect(img).toHaveAttribute('src', 'https://cdn-images.dzcdn.net/images/cover/89073b58a3ce20e32384f246b92f1c76/264x264-000000-80-0-0.jpg');
    await expect(img).toHaveAttribute('alt', '');
    await expect(card.locator('.ux-toto').nth(1).locator('.ux-toto-cov img')).toHaveCount(0);
  });

  test('no pair from the server: no card, the results are the v11 results', async ({ page, request }) => {
    const mock = await results(page, request, { pairs: 0 });
    test.skip(!mock, 'v12 not served here');
    if (!mock) return;
    await expect(page.locator('.p4-keep')).toBeVisible();
    await expect.poll(() => mock.pairsRequests).toBeGreaterThanOrEqual(1);
    await page.waitForTimeout(800);
    await expect(page.getByTestId('tot')).toHaveCount(0);
    expect(mock.votes).toEqual([]);
  });

  test('v11 only: the results never ask for pairs and show no card', async ({ page, request }) => {
    test.skip((await flagState(request)) !== 'v11', 'v12 is on here');
    let asked = 0;
    await page.route((url) => DUEL_PATH.test(url.pathname), async (route) => { asked += 1; await route.continue(); });
    const qs = await recordQuestions(page);
    test.skip(!(await openQuiz(page)), 'flag off or quiz not reachable');
    await playToResults(page, qs.get);
    await expect(page.locator('.p4-keep')).toBeVisible();
    await page.waitForTimeout(1500);
    expect(asked).toBe(0);
    await expect(page.getByTestId('tot')).toHaveCount(0);
    await expect(page.locator('.ux-tot')).toHaveCount(0);
  });
});

test.describe('G7 API (read only, and refusals that never reach the database)', () => {
  const ANON = '11111111-2222-4333-8444-555555555555';

  test('v12 on: pairs and fans-picked answer the documented shape and fail soft', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    const pairs = await request.get('/api/duel/pairs?group=bts', { headers: { 'x-duel-anon': ANON } });
    expect(pairs.status()).toBe(200);
    expect(pairs.headers()['cache-control']).toContain('no-store');
    const p = (await pairs.json()) as { pairs: unknown[]; group: unknown; ranked: unknown };
    expect(Array.isArray(p.pairs)).toBe(true);
    expect(p.pairs.length).toBeLessThanOrEqual(5);
    expect(typeof p.ranked).toBe('boolean');
    for (const pair of p.pairs as Array<{ token: string; a: { id: string; title: string; year: number | null; cover: string | null }; b: { id: string; title: string } }>) {
      expect(typeof pair.token).toBe('string');
      expect(pair.a.id).not.toBe(pair.b.id);
      expect(pair.a.title.length).toBeGreaterThan(0);
      if (pair.a.cover !== null) expect(pair.a.cover).toMatch(/^https:\/\/cdn-images\.dzcdn\.net\//);
      if (pair.a.year !== null) expect(Number.isInteger(pair.a.year)).toBe(true);
    }

    // no browser id, an unknown group, a bad slug: an empty card, never an error
    for (const [url, headers] of [['/api/duel/pairs?group=bts', {}], ['/api/duel/pairs?group=no-such-group', { 'x-duel-anon': ANON }], ['/api/duel/pairs?group=../x', { 'x-duel-anon': ANON }], ['/api/duel/pairs', { 'x-duel-anon': ANON }]] as Array<[string, Record<string, string>]>) {
      const r = await request.get(url, { headers });
      expect(r.status(), url).toBe(200);
      expect(((await r.json()) as { pairs: unknown[] }).pairs, url).toEqual([]);
    }

    const fp = await request.get('/api/duel/fans-picked?group=bts');
    expect(fp.status()).toBe(200);
    const f = (await fp.json()) as { ranked: boolean; songs: Array<{ rank: number; title: string; votes: number; movement: number | null; isNew: boolean }>; votes: number | null; minVotes: number; hasMovement: boolean; updatedAt: string | null };
    expect(Object.keys(f).sort()).toEqual(['group', 'hasMovement', 'minVotes', 'ranked', 'songs', 'updatedAt', 'votes']);
    expect(f.minVotes).toBeGreaterThanOrEqual(100);
    expect(f.songs.length).toBeLessThanOrEqual(10);
    if (!f.ranked) expect(f.songs).toEqual([]);
    for (const [i, s] of f.songs.entries()) {
      expect(s.rank).toBeGreaterThanOrEqual(1);
      if (i > 0) expect(s.rank).toBeGreaterThanOrEqual((f.songs[i - 1] as { rank: number }).rank);
      expect(s.votes).toBeGreaterThanOrEqual(5);
    }
    expect((await request.get('/api/duel/fans-picked?group=no-such-group')).status()).toBe(200);
    expect((await request.get('/api/duel/fans-picked')).status()).toBe(400);
  });

  test('v12 on: a vote without a pair issued by the server is refused; the cron needs its secret', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    // every one of these is refused before any database call (lib/duel/service.ts, steps 1 and 2)
    const forged = `${Buffer.from(JSON.stringify(['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', 'f'.repeat(32), Date.now() + 60_000])).toString('base64url')}.${'A'.repeat(43)}`;
    const cases: Array<[unknown, Record<string, string>, number, string]> = [
      [{ token: forged, winner: 'a' }, { 'x-duel-anon': ANON }, 403, 'bad_token'],
      [{ token: 'nope', winner: 'a' }, { 'x-duel-anon': ANON }, 403, 'bad_token'],
      [{ token: forged, winner: 'c' }, { 'x-duel-anon': ANON }, 400, 'bad_request'],
      [{ token: forged, winner: 'a' }, {}, 400, 'no_voter'],
      [{ token: forged, winner: 'a' }, { 'x-duel-anon': 'not-a-uuid' }, 400, 'no_voter'],
    ];
    for (const [data, headers, status, error] of cases) {
      const r = await request.post('/api/duel/vote', { data, headers });
      expect(r.status(), error).toBe(status);
      expect(((await r.json()) as { error: string }).error).toBe(error);
    }
    const junk = await request.post('/api/duel/vote', { data: 'not json', headers: { 'content-type': 'text/plain', 'x-duel-anon': ANON } });
    expect(junk.status()).toBe(400);
    expect((await request.get('/api/duel/vote')).status()).toBe(405);

    for (const headers of [{}, { authorization: 'Bearer wrong' }] as Array<Record<string, string>>) {
      const cron = await request.get('/api/cron/fans-picked', { headers });
      expect(cron.status()).toBe(401);
    }
  });

  test('v11 only: every G7 route answers 404', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v11', 'v12 is on here');
    expect((await request.get('/api/duel/pairs?group=bts', { headers: { 'x-duel-anon': ANON } })).status()).toBe(404);
    expect((await request.get('/api/duel/fans-picked?group=bts')).status()).toBe(404);
    expect((await request.post('/api/duel/vote', { data: { token: 'x', winner: 'a' }, headers: { 'x-duel-anon': ANON } })).status()).toBe(404);
    expect((await request.get('/api/cron/fans-picked')).status()).toBe(404);
  });
});
