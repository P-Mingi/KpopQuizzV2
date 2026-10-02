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

// G6 (V12): Name them all (prototype states nta-intro, nta-play, nta-result; landmarks
// .nta / .nring / .ntagrid .slot / .ntares / .btn-primary of
// run/checks/reference/styles.json), at the project width, light and dark, on the
// Stray Kids page like the prototype.
//
// No write reaches the database: every page is wrapped with guardWrites, which
// answers POST /api/name-all/result locally and records the payload the spec then
// asserts. The roster is the real one (read only).
//
// Flag states (the server decides; the spec reads it from an empty POST, which the
// route refuses before any database call):
//   both on    /<group>-name-all-members is the page, /name-all/<group> the noindex twin.
//   v11 only   both URLs 301 to / (the middleware), the route answers 404.
//   both off   the same.
// G6_EXPECT=v12 | v11 | off makes the state an assertion instead of a discovery.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.G6_EXPECT as 'v12' | 'v11' | 'off' | undefined;
const PRETTY = '/stray-kids-name-all-members';
const INTERNAL = '/name-all/stray-kids';
const ROSTER = ['Bang Chan', 'Lee Know', 'Changbin', 'Hyunjin', 'Han', 'Felix', 'Seungmin', 'I.N'];

test.describe.configure({ timeout: 180_000 });

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;
type Prop = (typeof PROPS)[number];

type State = 'nta-intro' | 'nta-play' | 'nta-result';
interface Landmark { proto: string; impl: string; states: State[]; skip?: Partial<Record<State, Prop[]>> }
// `height` of the two containers is content: the prototype's intro has a "Members /
// Title tracks" picker and its result an invented community row and a "Try title
// tracks" button. G6 ships members only and prints a community line only when the
// number exists, so those two heights are shorter by construction (report G6,
// deviations 1 and 2). Everything else is compared, the play state included.
const LANDMARKS: Landmark[] = [
  { proto: '.nta', impl: '.ux-nta', states: ['nta-intro', 'nta-play', 'nta-result'], skip: { 'nta-intro': ['height'], 'nta-result': ['height'] } },
  { proto: '.nring', impl: '.ux-nta-ring', states: ['nta-intro', 'nta-play'] },
  { proto: '.ntagrid .slot', impl: '.ux-nta-grid .ux-nta-slot', states: ['nta-intro', 'nta-play', 'nta-result'] },
  { proto: '.ntares', impl: '.ux-nta-res', states: ['nta-result'], skip: { 'nta-result': ['height'] } },
  { proto: '.btn-primary', impl: '.ux-nta .ux-btn-primary', states: ['nta-intro', 'nta-play', 'nta-result'] },
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
interface Compared { checked: string[]; missing: string[]; mismatches: Mismatch[]; skipped: string[]; got: Record<string, StyleMap | null> }
async function compare(page: Page, theme: Theme, state: State): Promise<Compared> {
  const w = widthOf(page);
  const marks = LANDMARKS.filter((l) => l.states.includes(state));
  const got = await computed(page, marks.map((l) => l.impl));
  const out: Compared = { checked: [], missing: [], mismatches: [], skipped: [], got };
  for (const l of marks) {
    const key = refKey(w, theme, state);
    const exp = expected(w, theme, state, l.proto);
    expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    if (!act) { out.missing.push(`${l.impl} (${key})`); continue; }
    out.checked.push(`${l.proto} @ ${key}`);
    for (const p of PROPS) {
      const e = exp[p]; const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (l.skip?.[state]?.includes(p)) { out.skipped.push(`${l.proto} ${p} @ ${key}: reference ${e}, here ${a}`); continue; }
      if (!close(e, a)) out.mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return out;
}

// ---- helpers ------------------------------------------------------------------------

async function flagState(request: APIRequestContext): Promise<'v12' | 'not-v12'> {
  // An empty body with no browser id: the route answers 400 before reading anything
  // (lib/name-all/submit.ts), or 404 when v12 is off. Nothing can be written.
  const r = await request.post('/api/name-all/result', { data: {} });
  return r.status() === 404 ? 'not-v12' : 'v12';
}

const NTA_PATH = '/api/name-all/result';
const rounds = (calls: StubbedCall[]): StubbedCall[] => calls.filter((c) => new URL(c.url).pathname === NTA_PATH);
interface RoundBody { group: string; found: string[]; seconds: number; gaveUp: boolean }
const bodyOf = (c: StubbedCall | undefined): RoundBody => JSON.parse(c?.body ?? '{}') as RoundBody;

/** Opens the pretty URL. False = v12 is not served here. */
async function open(page: Page, request: APIRequestContext, url = PRETTY): Promise<boolean> {
  if ((await flagState(request)) !== 'v12') return false;
  const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  expect(res?.status(), `GET ${url}`).toBe(200);
  await expect(page.getByTestId('nta')).toBeVisible({ timeout: 60_000 });
  await waitHydrated(page);
  return true;
}

async function start(page: Page): Promise<void> {
  // the button is server rendered: click until the client has taken over
  await expect(async () => {
    await page.getByTestId('nta-start').click({ timeout: 2_000 });
    await expect(page.getByTestId('nta')).toHaveAttribute('data-state', 'play', { timeout: 2_000 });
  }).toPass({ timeout: 60_000 });
  await expect(page.locator('#nta-in')).toBeFocused();
}

async function type(page: Page, name: string): Promise<void> {
  await page.locator('#nta-in').fill(name);
  await page.locator('#nta-in').press('Enter');
}

async function shot(page: Page, theme: Theme, state: State): Promise<void> {
  const dir = process.env.G6_SHOTS;
  if (!dir) return;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(dir, `${refKey(widthOf(page), theme, state)}.png`) });
}

// ---- the three reference states ------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`G6 name them all ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });

    test('nta-intro, nta-play, nta-result: reference landmarks, payload, a11y, no sideways scroll', async ({ page, request }, info) => {
      const anonSeen: Array<string | undefined> = [];
      page.on('request', (r) => { if (new URL(r.url()).pathname === NTA_PATH) anonSeen.push(r.headers()['x-nta-anon']); });
      const served = await open(page, request);
      test.skip(!served, 'v12 not served here');
      if (!served) return;
      const nta = page.getByTestId('nta');

      // intro
      await expect(nta).toHaveAttribute('data-state', 'intro');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Name all 8 Stray Kids members');
      await expect(nta.locator('.ux-kicker')).toHaveText('Name them all');
      await expect(nta.locator('.ux-nta-head p')).toHaveText('60 seconds. Type a name and press Enter. Stage names, real names and Hangul all count, and one typo is fine.');
      await expect(nta.locator('.ux-nta-ring')).toHaveAttribute('aria-label', '60 seconds left');
      await expect(nta.locator('.ux-nta-slot')).toHaveCount(8);
      await expect(page.locator('.ux-crumb')).toHaveText('Groups/Stray Kids/Name them all');
      // the answers are not printed before the round
      for (const name of ROSTER) await expect(nta.getByText(name, { exact: true })).toHaveCount(0);
      const intro = await compare(page, theme, 'nta-intro');
      await info.attach(`g6-${refKey(widthOf(page), theme, 'nta-intro')}.json`, { body: JSON.stringify(intro, null, 1), contentType: 'application/json' });
      expect(intro.missing).toEqual([]);
      expect(intro.mismatches, 'nta-intro: boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.ux-nta')).toEqual([]);
      await shot(page, theme, 'nta-intro');

      // play: the prototype's two names
      await start(page);
      await type(page, 'hyunjin');
      await type(page, 'felix');
      await expect(nta).toHaveAttribute('data-state', 'play');
      await expect(page.getByTestId('nta-count')).toHaveText('2');
      await expect(nta.locator('.ux-nta-slot.is-found')).toHaveCount(2);
      await expect(nta.locator('.ux-nta-slot').nth(3)).toContainText('Hyunjin');
      await expect(nta.locator('.ux-nta-slot').nth(5)).toContainText('Felix');
      await expect(page.locator('#nta-in')).toHaveValue('');
      await expect(page.locator('#nta-in')).toBeFocused();
      await expect(page.locator('h1')).toHaveCount(1);
      const play = await compare(page, theme, 'nta-play');
      await info.attach(`g6-${refKey(widthOf(page), theme, 'nta-play')}.json`, { body: JSON.stringify(play, null, 1), contentType: 'application/json' });
      expect(play.missing).toEqual([]);
      expect(play.mismatches, 'nta-play: boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(play.skipped, 'nothing is skipped in the play state').toEqual([]);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.ux-nta')).toEqual([]);
      const axePlay = await runAxe(page, { include: '.ux-nta' });
      if (axePlay) expect(axePlay, 'axe serious / critical while playing').toEqual([]);
      await shot(page, theme, 'nta-play');
      expect(rounds(writes), 'nothing is sent before the round ends').toEqual([]);

      // result: give up reveals the rest
      await nta.getByRole('button', { name: 'Give up' }).click();
      await expect(nta).toHaveAttribute('data-state', 'end');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('2 of 8. Warm-up round.');
      await expect(page.locator('h1')).toBeFocused();
      await expect(page.getByTestId('nta-score')).toHaveText('2/8');
      await expect(page.getByTestId('nta-time')).toHaveText(/^in 0:\d\d · you gave up$/);
      await expect(nta.locator('.ux-nta-slot.is-found')).toHaveCount(2);
      await expect(nta.locator('.ux-nta-slot.is-missed')).toHaveCount(6);
      for (const name of ROSTER) await expect(nta.locator('.ux-nta-nm', { hasText: new RegExp(`^${name.replace('.', '\\.')}$`) })).toHaveCount(1);
      const result = await compare(page, theme, 'nta-result');
      await info.attach(`g6-${refKey(widthOf(page), theme, 'nta-result')}.json`, { body: JSON.stringify(result, null, 1), contentType: 'application/json' });
      expect(result.missing).toEqual([]);
      expect(result.mismatches, 'nta-result: boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, '.ux-nta')).toEqual([]);
      const axeEnd = await runAxe(page, { include: '.ux-nta' });
      if (axeEnd) expect(axeEnd, 'axe serious / critical on the result').toEqual([]);
      await shot(page, theme, 'nta-result');

      // the one write of the round, answered locally
      await expect.poll(() => rounds(writes).length).toBe(1);
      const sent = rounds(writes)[0];
      expect(sent?.method).toBe('POST');
      const body = bodyOf(sent);
      expect(Object.keys(body).sort()).toEqual(['found', 'gaveUp', 'group', 'seconds']);
      expect(body.group).toBe('stray-kids');
      expect(body.found, 'display names in the order typed').toEqual(['Hyunjin', 'Felix']);
      expect(body.gaveUp).toBe(true);
      expect(body.seconds).toBeGreaterThanOrEqual(1);
      expect(body.seconds).toBeLessThanOrEqual(60);
      expect(anonSeen).toHaveLength(1);
      expect(anonSeen[0] ?? '', 'the browser id travels in a header').toMatch(/^[0-9a-f-]{36}$/);

      // community lines: real numbers or nothing, and never a "least named" line
      const stats = page.getByTestId('nta-stats');
      if ((await stats.count()) > 0) {
        await expect(stats).toContainText(/\d+% of rounds named all 8|Named first most often: /);
        await expect(stats).not.toContainText(/forgot|least|missed|last/i);
      }
      await expect(nta).not.toContainText(/forgotten|least named|most missed/i);
    });
  });
}

// ---- behaviour -------------------------------------------------------------------------

test.describe('G6 name them all behaviour', () => {
  let writes: StubbedCall[] = [];
  test.beforeEach(async ({ page }) => {
    await preparePage(page, 'light');
    writes = await guardWrites(page, env.supabaseUrl);
  });

  test('flag state is the expected one', async ({ request }) => {
    const state = await flagState(request);
    if (EXPECT) expect(state).toBe(EXPECT === 'v12' ? 'v12' : 'not-v12');
    test.info().annotations.push({ type: 'flag-state', description: state });
  });

  test('flag off: both URLs answer as today (301 to /) and the route is a 404', async ({ request }) => {
    test.skip((await flagState(request)) === 'v12', 'v12 is served here');
    for (const url of [PRETTY, INTERNAL, '/bts-name-all-members', '/name-all/bts']) {
      const r = await request.get(url, { maxRedirects: 0 });
      expect(r.status(), `GET ${url}`).toBe(301);
      expect(new URL(r.headers().location ?? '', 'http://x').pathname, `GET ${url} location`).toBe('/');
    }
    expect((await request.post(NTA_PATH, { data: {} })).status()).toBe(404);
  });

  test('accepted spellings: Hangul, birth name, one typo; refused: unknown, short typo, twice', async ({ page, request }) => {
    const served = await open(page, request);
    test.skip(!served, 'v12 not served here');
    if (!served) return;
    const nta = page.getByTestId('nta');
    const msg = page.getByTestId('nta-msg');
    const count = page.getByTestId('nta-count');
    await start(page);

    await type(page, '방찬'); // Hangul stage name
    await expect(count).toHaveText('1');
    await expect(nta.locator('.ux-nta-slot').nth(0)).toContainText('Bang Chan');
    await type(page, 'yongbok'); // birth name
    await expect(count).toHaveText('2');
    await expect(nta.locator('.ux-nta-slot').nth(5)).toContainText('Felix');
    await type(page, 'Seungmn'); // one letter missing, 8 letters
    await expect(count).toHaveText('3');
    await type(page, 'i.n'); // punctuation and case do not matter
    await expect(count).toHaveText('4');
    await expect(msg).toHaveText('');

    await type(page, 'jungkook'); // not in this group
    await expect(msg).toHaveText('Not on the list');
    await expect(page.locator('#nta-in')).toHaveClass(/is-shake/);
    await expect(count).toHaveText('4');
    await type(page, 'hann'); // a typo on a 3-letter name is not accepted
    await expect(msg).toHaveText('Not on the list');
    await expect(count).toHaveText('4');
    await type(page, 'FELIX'); // already found, under another spelling
    await expect(msg).toHaveText('Felix is already in');
    await expect(count).toHaveText('4');
    await type(page, '   '); // nothing typed: nothing happens
    await expect(msg).toHaveText('Felix is already in');
    await expect(page.locator('#nta-in')).toBeFocused();
    expect(rounds(writes)).toEqual([]);
  });

  test('all eight found ends the round at once; Again starts a clean round; Share opens the sheet', async ({ page, request }) => {
    const served = await open(page, request);
    test.skip(!served, 'v12 not served here');
    if (!served) return;
    const nta = page.getByTestId('nta');
    await start(page);
    const typed = ['i.n', 'han', 'lee know', 'changbin', 'bangchan', 'seungmin', 'hyunjin', 'felix'];
    for (const t of typed) await type(page, t);
    await expect(nta).toHaveAttribute('data-state', 'end');
    await expect(page.locator('h1')).toHaveText('All 8. Nice.');
    await expect(page.getByTestId('nta-score')).toHaveText('8/8');
    await expect(page.getByTestId('nta-time')).toHaveText(/^in 0:\d\d$/);
    await expect(nta.locator('.ux-nta-slot.is-missed')).toHaveCount(0);
    await expect.poll(() => rounds(writes).length).toBe(1);
    const body = bodyOf(rounds(writes)[0]);
    expect(body.found).toEqual(['I.N', 'Han', 'Lee Know', 'Changbin', 'Bang Chan', 'Seungmin', 'Hyunjin', 'Felix']);
    expect(body.gaveUp).toBe(false);

    // share
    await nta.getByRole('button', { name: 'Share' }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet).toContainText('8/8 Stray Kids members');
    await expect(sheet).toContainText(/Named in 0:\d\d/);
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);

    // again
    await nta.getByRole('button', { name: 'Again' }).click();
    await expect(nta).toHaveAttribute('data-state', 'play');
    await expect(page.getByTestId('nta-count')).toHaveText('0');
    await expect(nta.locator('.ux-nta-slot.is-found')).toHaveCount(0);
    await expect(nta.locator('.ux-nta-ring')).toHaveAttribute('aria-label', /^(60|59) seconds left$/);
    expect(rounds(writes), 'a new round sends nothing until it ends').toHaveLength(1);
  });

  test('the clock: 60 seconds, then the result without a give up', async ({ page, request }) => {
    await page.clock.install();
    const served = await open(page, request);
    test.skip(!served, 'v12 not served here');
    if (!served) return;
    const nta = page.getByTestId('nta');
    await start(page);
    await type(page, 'felix');
    await page.clock.fastForward(52_000);
    await expect(nta.locator('.ux-nta-ring')).toHaveClass(/is-low/);
    await expect(nta).toHaveAttribute('data-state', 'play');
    await page.clock.fastForward(10_000);
    await expect(nta).toHaveAttribute('data-state', 'end');
    await expect(page.locator('h1')).toHaveText('1 of 8. Warm-up round.');
    await expect(page.getByTestId('nta-time')).toHaveText('in 1:00');
    await expect.poll(() => rounds(writes).length).toBe(1);
    const body = bodyOf(rounds(writes)[0]);
    expect(body).toEqual({ group: 'stray-kids', found: ['Felix'], seconds: 60, gaveUp: false });
  });

  test('SEO: the pretty URL is indexable, the internal route is its noindex twin', async ({ page, request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    const head = async (url: string): Promise<{ title: string; robots: string | null; canonical: string | null; description: string | null; h1: string[] }> => {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      expect(res?.status(), `GET ${url}`).toBe(200);
      return page.evaluate(() => ({
        title: document.title,
        robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') ?? null,
        canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
        description: document.querySelector('meta[name="description"]')?.getAttribute('content') ?? null,
        h1: [...document.querySelectorAll('h1')].map((h) => h.textContent ?? ''),
      }));
    };
    const pretty = await head(PRETTY);
    expect(pretty.title).toBe('Name all 8 Stray Kids members in 60 seconds | KpopQuiz');
    expect(pretty.robots).toBe('index, follow');
    expect(pretty.canonical).toBe('https://kpopquiz.org/stray-kids-name-all-members');
    expect(pretty.description).toContain('Can you name all 8 Stray Kids members');
    expect(pretty.h1).toEqual(['Name all 8 Stray Kids members']);
    const internal = await head(INTERNAL);
    expect(internal.robots).toBe('noindex, follow');
    expect(internal.canonical).toBe('https://kpopquiz.org/stray-kids-name-all-members');
    // server rendered: the heading and the breadcrumb are in the HTML a crawler gets
    const html = await (await request.get(PRETTY)).text();
    expect(html).toContain('Name all 8 Stray Kids members</h1>');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('href="/stray-kids-quiz"');
    // a group without a page is a 404, with the flag on too
    expect((await request.get('/nct-name-all-members', { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/name-all/nct', { maxRedirects: 0 })).status()).toBe(404);
    expect((await request.get('/name-all/does-not-exist', { maxRedirects: 0 })).status()).toBe(404);
  });

  test('the route refuses a request with no browser id or an unknown group', async ({ request }) => {
    test.skip((await flagState(request)) !== 'v12', 'v12 not served here');
    // Only requests that cannot name a real roster are sent to the server: no browser
    // id (refused first) and a group that has no page. The other refusals (unknown
    // member, time, duplicates) are unit tested in lib/name-all/name-all.test.ts.
    const anon = { 'x-nta-anon': '11111111-2222-4333-8444-555555555555' };
    expect((await request.post(NTA_PATH, { data: { group: 'stray-kids', found: [], seconds: 10, gaveUp: false } })).status(), 'no browser id').toBe(400);
    expect((await request.post(NTA_PATH, { headers: anon, data: { group: 'nope', found: [], seconds: 10 } })).status(), 'unknown group').toBe(404);
    expect((await request.get(NTA_PATH)).status(), 'no GET').toBe(405);
  });
});
