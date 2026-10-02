import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from '../ux-v1/helpers/a11y';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { APIRequestContext, Page } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';

// G5 (V12): the personality engine pages. Which member are you (prototype states
// wma-question and wma-result) on /which-stray-kids-member-are-you, and the KPop
// Demon Hunters bridge quiz (kpdh-intro, kpdh-question, kpdh-result) on
// /kpop-demon-hunters-quiz, against run/checks/reference/styles.json, at the
// project width, light and dark.
//
// No write reaches the database: every page is wrapped with guardWrites, which
// answers the two POSTs of these pages locally (/api/personality/result, the
// saved answer sheet, and /api/auth/update-profile, the bias tag) and lets the
// spec assert what they carry. The pages themselves are read only.
//
// Flag states (read from the server, G5_EXPECT=v12 | v11 | off makes it an assertion):
//   v12        the pretty URLs answer 200.
//   v11 / off  every /which-* and /personality* URL answers its REFONTE 301 and
//              /kpop-demon-hunters-quiz answers the group hub route's 404, as today.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.G5_EXPECT as 'v12' | 'v11' | 'off' | undefined;
const SHOTS = process.env.G5_SHOTS;
const WMA_URL = '/which-stray-kids-member-are-you';
const KPDH_URL = '/kpop-demon-hunters-quiz';
const SKZ = ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'Han', 'Felix', 'Seungmin', 'I.N'];

test.describe.configure({ timeout: 180_000 });

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;

/** `skip`: properties the page cannot share with the prototype, each with its reason at the call site. */
interface Landmark { proto: string; impl: string; skip?: readonly string[] }

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

interface Mismatch { landmark: string; key: string; prop: string; expected: string; actual: string }
interface Compared { checked: string[]; missing: string[]; mismatches: Mismatch[]; got: Record<string, StyleMap | null> }

async function compare(page: Page, theme: Theme, state: string, landmarks: Landmark[]): Promise<Compared> {
  const w = widthOf(page);
  const got = await page.evaluate(({ sels, props }) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = document.querySelector<HTMLElement>(s);
      if (!el || el.offsetParent === null) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { sels: landmarks.map((l) => l.impl), props: [...PROPS] });
  const checked: string[] = [];
  const missing: string[] = [];
  const mismatches: Mismatch[] = [];
  const key = refKey(w, theme, state);
  for (const l of landmarks) {
    const exp = expected(w, theme, state, l.proto);
    expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    if (!act) { missing.push(`${l.impl} (${key})`); continue; }
    checked.push(`${l.proto} @ ${key}`);
    for (const p of PROPS) {
      if (l.skip?.includes(p)) continue;
      const e = exp[p]; const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (!close(e, a)) mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return { checked, missing, mismatches, got };
}

async function shot(page: Page, theme: Theme, state: string): Promise<void> {
  if (!SHOTS) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  if (widthOf(page) > 500) await page.mouse.move(2, 2); // no hover state in the picture
  await page.screenshot({ path: path.join(SHOTS, `${refKey(widthOf(page), theme, state)}.png`) });
}

async function flagState(request: APIRequestContext): Promise<'v12' | 'off'> {
  const r = await request.get(WMA_URL, { maxRedirects: 0 });
  return r.status() === 200 ? 'v12' : 'off';
}

const RESULT_PATH = '/api/personality/result';
const BIAS_PATH = '/api/auth/update-profile';
const callsTo = (calls: StubbedCall[], p: string): StubbedCall[] => calls.filter((c) => new URL(c.url).pathname === p);

async function open(page: Page, url: string): Promise<void> {
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(res?.status(), `GET ${url}`).toBe(200);
  await waitHydrated(page);
  await expect(page.getByTestId('pers-intro')).toBeVisible();
}

/** Answers the question on screen and waits for the next step. */
async function answer(page: Page, index: number, step: number, total: number): Promise<void> {
  const q = page.getByTestId('pers-question');
  await expect(q).toHaveAttribute('data-step', String(step));
  await q.locator('.ux-pers-opt').nth(index).click();
  if (step < total) await expect(q).toHaveAttribute('data-step', String(step + 1));
  else await expect(page.getByTestId('pers-result')).toBeVisible();
}

async function a11y(page: Page, label: string): Promise<void> {
  expect(await basicA11y(page), `${label}: one h1, named controls`).toEqual([]);
  const axe = await runAxe(page, { include: '.ux-pers' });
  if (axe) expect(axe, `${label}: axe serious / critical`).toEqual([]);
  expect(await horizontalOverflow(page), `${label}: no sideways scroll`).toBeLessThanOrEqual(0);
}

for (const theme of THEMES) {
  test.describe(`G5 personality ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });

    test('kpdh-intro, kpdh-question, kpdh-result: reference landmarks, text only, one saved sheet', async ({ page, request }, info) => {
      test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
      await open(page, KPDH_URL);

      // intro
      await expect(page.locator('h1')).toHaveText('Loved HUNTR/X? Find your real girl group');
      await expect(page.locator('.ux-pers-intro .ux-kicker')).toHaveText('KPop Demon Hunters');
      await expect(page.locator('.ux-pers-meta li')).toHaveText(['6 questions', 'About 1 minute', 'Text only']);
      await expect(page.locator('.ux-crumb')).toContainText('Find your girl group');
      // text only: no picture of any kind before the result (the result shows the real group's photo)
      expect(await page.locator('.ux-pers img, .ux-pers picture, .ux-pers video, .ux-pers [style*="background-image"]').count()).toBe(0);
      const intro = await compare(page, theme, 'kpdh-intro', [
        { proto: '.pintro', impl: '.ux-pers-intro' },
        { proto: '.btn-primary', impl: '.ux-pers-intro .ux-btn-primary' },
      ]);
      await info.attach(`g5-${refKey(widthOf(page), theme, 'kpdh-intro')}.json`, { body: JSON.stringify(intro, null, 1), contentType: 'application/json' });
      expect(intro.missing).toEqual([]);
      expect(intro.mismatches, 'kpdh-intro').toEqual([]);
      await a11y(page, 'kpdh-intro');
      await shot(page, theme, 'kpdh-intro');

      // question 1
      await page.getByRole('button', { name: 'Find my group' }).click();
      const q = page.getByTestId('pers-question');
      await expect(q).toBeVisible();
      await expect(q.locator('.ux-pers-top')).toContainText('Question 1 of 6');
      await expect(q.locator('.ux-pers-top button')).toHaveCount(0); // no Back on the first question
      await expect(q.locator('.ux-pers-qt')).toHaveText('Your favourite HUNTR/X member');
      await expect(q.locator('.ux-pers-qt')).toBeFocused();
      await expect(q.locator('.ux-pers-opt')).toHaveCount(4);
      expect(await page.locator('.ux-pers img').count()).toBe(0);
      await expect(page.locator('h1')).toHaveCount(1);
      const question = await compare(page, theme, 'kpdh-question', [
        { proto: '.pq', impl: '.ux-pers-q' },
        { proto: '.popt', impl: '.ux-pers-opt' },
      ]);
      await info.attach(`g5-${refKey(widthOf(page), theme, 'kpdh-question')}.json`, { body: JSON.stringify(question, null, 1), contentType: 'application/json' });
      expect(question.missing).toEqual([]);
      expect(question.mismatches, 'kpdh-question').toEqual([]);
      await a11y(page, 'kpdh-question');
      await shot(page, theme, 'kpdh-question');

      // the prototype's own answers (capture-v12.mjs): BLACKPINK
      const sheet = [0, 0, 3, 0, 0, 0];
      for (let i = 0; i < sheet.length; i++) await answer(page, sheet[i] as number, i + 1, sheet.length);
      const res = page.getByTestId('pers-result');
      await expect(res).toHaveAttribute('data-result', 'blackpink');
      await expect(res.locator('.ux-rescard-you')).toHaveText('Your group is');
      await expect(res.locator('.ux-rescard-name')).toHaveText('BLACKPINK');
      await expect(res.locator('.ux-rescard-role')).toHaveText('YG Entertainment · since 2016');
      await expect(res.locator('.ux-traits li')).toHaveText(['Fierce', 'Iconic', 'Stadium-sized']);
      await expect(res.locator('.ux-pers-songs li')).toHaveCount(3);
      await expect(res.locator('.ux-pers-songs .ux-rt')).toHaveText(['DDU-DU DDU-DU', 'How You Like That', 'Pink Venom']);
      await expect(res.locator('.ux-pers-songs .ux-rs').first()).toHaveText('BLACKPINK · 2018');
      await expect(res.getByRole('link', { name: 'Open the BLACKPINK page' })).toHaveAttribute('href', '/blackpink-quiz');
      await expect(res.getByRole('link', { name: 'Play the BLACKPINK blindtest' })).toHaveAttribute('href', '/blindtest/group-blackpink');
      await expect(res.getByTestId('pers-bias')).toHaveCount(0); // a group is not a bias
      // the only picture is the real group's photo from public/idols
      const imgs = await res.locator('img').evaluateAll((els) => els.map((e) => (e as HTMLImageElement).getAttribute('src') ?? ''));
      for (const src of imgs) expect(src.startsWith('/idols/'), `picture ${src}`).toBe(true);
      await expect(page.locator('h1')).toHaveCount(1);

      // Shares are real or absent: the "same result" line and the distribution come and go together.
      const hasDist = (await res.getByTestId('pers-dist').count()) > 0;
      expect((await res.locator('.ux-same').count()) > 0).toBe(hasDist);
      const result = await compare(page, theme, 'kpdh-result', [
        // height: the reference card has the sample "24% of players" line, shown here only with real results
        { proto: '.rescard', impl: '.ux-rescard', skip: hasDist ? [] : ['height'] },
        { proto: '.traits', impl: '.ux-traits' },
        { proto: '.btn-primary', impl: '.ux-rescard .ux-btn-primary' },
        { proto: '.sec-h h2', impl: '.ux-pers-sec .ux-sec-h h2' },
        ...(hasDist ? [{ proto: '.dist', impl: '.ux-dist' }] : []),
      ]);
      await info.attach(`g5-${refKey(widthOf(page), theme, 'kpdh-result')}.json`, { body: JSON.stringify(result, null, 1), contentType: 'application/json' });
      expect(result.missing).toEqual([]);
      expect(result.mismatches, 'kpdh-result').toEqual([]);
      await a11y(page, 'kpdh-result');
      await shot(page, theme, 'kpdh-result');

      // one saved sheet: the answers, never the result
      await expect.poll(() => callsTo(writes, RESULT_PATH).length).toBe(1);
      const saved = callsTo(writes, RESULT_PATH)[0];
      expect(saved?.method).toBe('POST');
      expect(JSON.parse(saved?.body ?? '{}')).toEqual({ quiz: 'kpdh', picks: sheet });

      // retake goes back to the intro, and a second run the same day is not sent again
      await res.getByRole('button', { name: 'Retake' }).click();
      await expect(page.getByTestId('pers-intro')).toBeVisible();
      await page.getByRole('button', { name: 'Find my group' }).click();
      const other = [1, 3, 1, 2, 3, 3]; // Mira, Your Idol, lore, visuals, Dreamy, experimental
      for (let i = 0; i < other.length; i++) await answer(page, other[i] as number, i + 1, other.length);
      await expect(page.getByTestId('pers-result')).toHaveAttribute('data-result', 'aespa');
      await page.waitForTimeout(400);
      expect(callsTo(writes, RESULT_PATH)).toHaveLength(1);
    });

    test('wma-question, wma-result: reference landmarks, public role, real shares, bias offer', async ({ page, request }, info) => {
      test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
      await open(page, WMA_URL);
      await expect(page.locator('h1')).toHaveText('Which Stray Kids member are you?');
      await expect(page.locator('.ux-pers-meta li')).toHaveText(['8 questions', 'About 2 minutes', 'No pictures needed']);
      expect(await page.locator('.ux-pers img').count()).toBe(0);
      await a11y(page, 'wma-intro');
      await shot(page, theme, 'wma-intro');

      await page.getByRole('button', { name: 'Start' }).click();
      await answer(page, 2, 1, 8);
      const q = page.getByTestId('pers-question');
      await expect(q.locator('.ux-pers-top')).toContainText('Question 2 of 8');
      await expect(q.locator('.ux-pers-qt')).toBeFocused();
      await expect(q.locator('.ux-pers-opt')).toHaveCount(4);
      expect(await page.locator('.ux-pers img').count(), 'picture-free questions').toBe(0);
      const question = await compare(page, theme, 'wma-question', [
        // height: the stored question and answers are not the prototype's sample copy, so lines wrap differently
        { proto: '.pq', impl: '.ux-pers-q', skip: ['height'] },
        { proto: '.popt', impl: '.ux-pers-opt', skip: ['height'] },
      ]);
      await info.attach(`g5-${refKey(widthOf(page), theme, 'wma-question')}.json`, { body: JSON.stringify(question, null, 1), contentType: 'application/json' });
      expect(question.missing).toEqual([]);
      expect(question.mismatches, 'wma-question').toEqual([]);
      // an answer card is never shorter than the reference card
      const optH = parseFloat(question.got['.ux-pers-opt']?.height ?? '0');
      expect(optH).toBeGreaterThanOrEqual(76);
      await a11y(page, 'wma-question');
      await shot(page, theme, 'wma-question');

      // Back returns to question 1 and forgets its answer
      await q.getByRole('button', { name: 'Back' }).click();
      await expect(q).toHaveAttribute('data-step', '1');
      await answer(page, 2, 1, 8);
      for (let step = 2; step <= 8; step++) await answer(page, 0, step, 8);

      const res = page.getByTestId('pers-result');
      await expect(res.locator('.ux-rescard-you')).toHaveText('You are');
      const name = (await res.locator('.ux-rescard-name').innerText()).trim();
      expect(SKZ, 'the result is a Stray Kids member').toContain(name);
      const role = (await res.locator('.ux-rescard-role').innerText()).trim();
      expect(role.length).toBeGreaterThan(3);
      await expect(res.locator('.ux-traits li')).toHaveCount(3);
      // the description is about the player
      await expect(res.locator('.ux-rescard-desc')).toContainText(/^You /);
      // a member result has an initial, never a picture
      expect(await res.locator('img').count()).toBe(0);
      await expect(page.locator('h1')).toHaveCount(1);

      const hasDist = (await res.getByTestId('pers-dist').count()) > 0;
      expect((await res.locator('.ux-same').count()) > 0).toBe(hasDist);
      if (hasDist) {
        // the share in the card is the share printed in the highlighted row, and the rows are all 8 members
        const mine = (await res.locator('.ux-dist li.is-me .ux-dist-pct').innerText()).trim();
        await expect(res.locator('.ux-same b')).toHaveText(mine);
        await expect(res.locator('.ux-same')).toContainText(`got ${name}`);
        await expect(res.locator('.ux-dist li')).toHaveCount(8);
        const pcts = await res.locator('.ux-dist-pct').allInnerTexts();
        const sum = pcts.reduce((s, t) => s + Number(t.replace('%', '')), 0);
        expect(sum, 'the printed shares add up to about 100').toBeGreaterThanOrEqual(96);
        expect(sum).toBeLessThanOrEqual(104);
        await expect(res.getByTestId('pers-dist').locator('.ux-sec-h p')).toHaveText(/^[\d,]+ results$/);
      }
      const result = await compare(page, theme, 'wma-result', [
        // height: two sentences built from the stored axes, not the prototype's sample paragraph
        { proto: '.rescard', impl: '.ux-rescard', skip: ['height'] },
        { proto: '.traits', impl: '.ux-traits' },
        { proto: '.biasoffer', impl: '.ux-pers-bias', skip: ['height'] },
        { proto: '.btn-primary', impl: '.ux-rescard .ux-btn-primary' },
        ...(hasDist ? [{ proto: '.dist', impl: '.ux-dist' }, { proto: '.sec-h h2', impl: '.ux-pers-sec .ux-sec-h h2' }] : []),
      ]);
      await info.attach(`g5-${refKey(widthOf(page), theme, 'wma-result')}.json`, { body: JSON.stringify(result, null, 1), contentType: 'application/json' });
      expect(result.missing).toEqual([]);
      expect(result.mismatches, 'wma-result').toEqual([]);
      await a11y(page, 'wma-result');
      await shot(page, theme, 'wma-result');

      // the saved sheet: quiz, group and the eight picks
      await expect.poll(() => callsTo(writes, RESULT_PATH).length).toBe(1);
      expect(JSON.parse(callsTo(writes, RESULT_PATH)[0]?.body ?? '{}')).toEqual({ quiz: 'wma', group: 'stray-kids', picks: [2, 0, 0, 0, 0, 0, 0, 0] });

      // signed out: Set bias opens the sign-in sheet and writes nothing
      const bias = res.getByTestId('pers-bias');
      await expect(bias).toContainText(`Make ${name} your bias tag?`);
      await bias.getByRole('button', { name: 'Set bias' }).click();
      await expect(page.getByRole('dialog')).toContainText(`Sign in to set ${name} as your bias tag`);
      expect(callsTo(writes, BIAS_PATH)).toEqual([]);
    });
  });
}

test.describe('G5 personality behaviour', () => {
  let writes: StubbedCall[] = [];
  test.beforeEach(async ({ page }) => {
    await preparePage(page, 'light');
    writes = await guardWrites(page, env.supabaseUrl);
  });

  test('flag state is the expected one', async ({ request }) => {
    const state = await flagState(request);
    if (EXPECT) expect(state).toBe(EXPECT === 'v12' ? 'v12' : 'off');
    test.info().annotations.push({ type: 'flag-state', description: state });
  });

  test('flag off: every /which-*, /personality* and the bridge URL answer as today', async ({ request }) => {
    test.skip((await flagState(request)) === 'v12', 'v12 is served here');
    const cases: Array<[string, number, string | null]> = [
      ['/which-bts-member-are-you', 308, '/bts-quiz'],
      ['/which-stray-kids-member-are-you', 308, '/stray-kids-quiz'],
      ['/which-nope-member-are-you', 308, '/nope-quiz'],
      ['/which-bts-member-are-you/r/jimin', 308, '/bts-quiz'],
      ['/personality', 308, '/quizzes'],
      ['/personality/bts', 308, '/bts-quiz'],
      ['/personality/bts/r/jimin', 308, '/bts-quiz'],
      [KPDH_URL, 404, null],
    ];
    for (const [url, status, location] of cases) {
      const r = await request.get(url, { maxRedirects: 0 });
      expect(r.status(), url).toBe(status);
      if (location) expect(r.headers()['location'], url).toBe(location);
    }
    // the bridge URL is the group hub route's own 404: same document as any unknown "<slug>-quiz"
    const [bridge, unknown] = await Promise.all([request.get(KPDH_URL), request.get('/no-such-group-quiz')]);
    const title = (h: string): string => (/<title>([^<]*)<\/title>/.exec(h) ?? [])[1] ?? '';
    expect(title(await bridge.text())).toBe(title(await unknown.text()));
    expect(await bridge.text()).not.toContain('HUNTR/X');
    // the result route does not exist with the flag off (the request never reaches a database call)
    const api = await request.post(RESULT_PATH, { data: { quiz: 'nope' } });
    expect(api.status()).toBe(404);
  });

  test('routing with the flag on: pretty URL 200, internal route and other groups keep their 301', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    const cases: Array<[string, number, string | null]> = [
      [WMA_URL, 200, null],
      ['/which-g-i-dle-member-are-you', 200, null],
      [KPDH_URL, 200, null],
      ['/which-nope-member-are-you', 308, '/nope-quiz'],
      ['/which-bts-member-are-you/r/jimin', 308, '/bts-quiz'],
      ['/personality', 308, '/quizzes'],
      ['/personality/stray-kids', 308, '/stray-kids-quiz'],
    ];
    for (const [url, status, location] of cases) {
      const r = await request.get(url, { maxRedirects: 0 });
      expect(r.status(), url).toBe(status);
      if (location) expect(r.headers()['location'], url).toBe(location);
    }
    // a malformed sheet is refused before anything is read or written
    const bad = await request.post(RESULT_PATH, { data: { quiz: 'nope' } });
    expect(bad.status()).toBe(400);
  });

  test('SEO: title, description, canonical, indexable, one H1, breadcrumb JSON-LD, server rendered', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    const pages: Array<{ url: string; title: string; h1: string; crumbs: string[] }> = [
      { url: WMA_URL, title: 'Which Stray Kids member are you? Personality quiz | KpopQuiz', h1: 'Which Stray Kids member are you?', crumbs: ['Groups', 'Stray Kids', 'Which member are you'] },
      { url: KPDH_URL, title: 'Loved HUNTR/X? Find your real K-pop girl group | KpopQuiz', h1: 'Loved HUNTR/X? Find your real girl group', crumbs: ['Blindtest', 'KPop Demon Hunters songs', 'Find your girl group'] },
    ];
    for (const p of pages) {
      const html = await (await request.get(p.url)).text();
      const pick = (re: RegExp): string => (re.exec(html) ?? [])[1] ?? '';
      expect(pick(/<title>([^<]*)<\/title>/), p.url).toBe(p.title);
      expect(pick(/<link rel="canonical" href="([^"]*)"/), p.url).toBe(`https://kpopquiz.org${p.url}`);
      expect(pick(/<meta name="description" content="([^"]*)"/).length, `${p.url} description`).toBeGreaterThan(60);
      expect(/<meta name="robots" content="[^"]*noindex/.test(html), `${p.url} indexable`).toBe(false);
      const h1s = html.match(/<h1[^>]*>[\s\S]*?<\/h1>/g) ?? [];
      expect(h1s, `${p.url} one h1 in the served HTML`).toHaveLength(1);
      expect((h1s[0] ?? '').replace(/<[^>]+>/g, '')).toBe(p.h1);
      // the layout has its own Organization block: the page adds exactly one BreadcrumbList
      const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map((m) => JSON.parse(m[1] ?? '{}') as { '@type'?: string; itemListElement?: Array<{ name: string }> });
      const crumbs = blocks.filter((b) => b['@type'] === 'BreadcrumbList');
      expect(crumbs, `${p.url} one BreadcrumbList`).toHaveLength(1);
      expect(crumbs[0]?.itemListElement?.map((i) => i.name)).toEqual(p.crumbs);
      expect(/[\u2013\u2014]/.test(html), `${p.url} no em or en dash in the page copy`).toBe(false);
    }
  });

  test('story and square share images are real PNG files of the right size', async ({ page, request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    await open(page, KPDH_URL);
    await page.getByRole('button', { name: 'Find my group' }).click();
    for (let i = 1; i <= 6; i++) await answer(page, 0, i, 6);
    const res = page.getByTestId('pers-result');
    const sizes: Array<['Story' | 'Square', string, number, number]> = [['Story', 'kpopquiz-story.png', 1080, 1920], ['Square', 'kpopquiz-square.png', 1080, 1080]];
    for (const [label, file, w, h] of sizes) {
      const [dl] = await Promise.all([page.waitForEvent('download'), res.locator('.ux-pers-imgs').getByRole('button', { name: label }).click()]);
      expect(dl.suggestedFilename()).toBe(file);
      const buf = fs.readFileSync(await dl.path());
      expect(buf.subarray(1, 4).toString('latin1')).toBe('PNG');
      expect([buf.readUInt32BE(16), buf.readUInt32BE(20)]).toEqual([w, h]);
      if (SHOTS) fs.writeFileSync(path.join(SHOTS, `share-${label.toLowerCase()}-${w}x${h}.png`), buf);
    }
    // the share sheet opens on Share my result with the canonical URL
    await res.getByRole('button', { name: 'Share my result' }).click();
    await expect(page.getByRole('dialog')).toContainText('Share your result');
    expect(callsTo(writes, BIAS_PATH), 'sharing does not touch the profile').toEqual([]);
    expect(callsTo(writes, RESULT_PATH).length, 'sharing saves nothing more').toBeLessThanOrEqual(1);
  });

  test('Set bias, signed in: one POST to update-profile with the member name (answered by the spec)', async ({ page, request, context }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    // A signed-in fan as the page sees one: the shell asks /api/auth/me only when an auth
    // cookie exists, so the spec sets an empty one with a name no server client reads and
    // answers the call itself. No session, no account, nothing reaches the database.
    await context.addCookies([{ name: 'sb-g5spec-auth-token', value: 'spec', url: new URL(process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3021').origin }]);
    await page.route((url) => url.pathname === '/api/auth/me', async (route) => {
      await route.fulfill({ json: { profile: { username: 'g5_spec_fan', display_name: null, avatar_url: null, avatar_bg: '#F1EFEA', avatar_text: '#1F1B17', xp: 0, level: 1, progress: 0, daily_streak: 0, last_daily_date: null, ult_groups: [] } } });
    });
    await open(page, WMA_URL);
    await page.getByRole('button', { name: 'Start' }).click();
    for (let step = 1; step <= 8; step++) await answer(page, 1, step, 8);
    const res = page.getByTestId('pers-result');
    const name = (await res.locator('.ux-rescard-name').innerText()).trim();
    expect(SKZ).toContain(name);
    await res.getByTestId('pers-bias').getByRole('button', { name: 'Set bias' }).click();
    await expect.poll(() => callsTo(writes, BIAS_PATH).length).toBe(1);
    const call = callsTo(writes, BIAS_PATH)[0];
    expect(call?.method).toBe('POST');
    expect(JSON.parse(call?.body ?? '{}')).toEqual({ bias: name });
    await expect(res.getByTestId('pers-bias')).toContainText(`${name} is your bias tag.`);
    await expect(res.getByTestId('pers-bias').getByRole('button')).toHaveCount(0);
    expect(callsTo(writes, BIAS_PATH)).toHaveLength(1);
  });

  test('a group without a profile set has no page, and every listed group has one', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    // the groups named in next.config.ts (run/requests/G5.md): each answers 200 with its own H1
    const groups = ['aespa', 'ateez', 'blackpink', 'bts', 'enhypen', 'g-i-dle', 'itzy', 'ive', 'le-sserafim', 'newjeans', 'nmixx', 'seventeen', 'stray-kids', 'twice', 'txt'];
    for (const g of groups) {
      const r = await request.get(`/which-${g}-member-are-you`, { maxRedirects: 0 });
      expect(r.status(), g).toBe(200);
      expect(await r.text(), g).toMatch(/<h1[^>]*>Which <em>[^<]+<\/em> member are you\?<\/h1>/);
    }
    // a real group with no profile set keeps today's 301 to its hub
    const none = await request.get('/which-illit-member-are-you', { maxRedirects: 0 });
    expect(none.status()).toBe(308);
    expect(none.headers()['location']).toBe('/illit-quiz');
  });
});
