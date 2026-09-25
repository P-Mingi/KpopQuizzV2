import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';
import sharp from 'sharp';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

import type { Page, Request } from '@playwright/test';
import type { Landmark } from './helpers/landmarks';
import type { StubbedCall } from './helpers/guard';

// P10 passport + settings (UX v11.2, DESIGN-SPEC 16.7 / 17.8 / 17.10 / 17.11).
//
// Production-write rules (ORCH, until the owner answers): every page is wrapped in
// guardWrites() (each mutating request is answered locally and recorded), and the
// specs assert the recorded payloads instead of saving. /me and /profile are NEVER
// loaded signed in (they grant badge tiers and write passport snapshots for the
// viewer): the passport is checked on the public /u/<test user> (its GET writes
// nothing: cookie-free reads + GET /api/auth/me + GET /api/follow), as a guest and
// as the owner; the /me props are covered by src/lib/ux-v1/p10/passport-render.test.ts.
// /settings is visited signed in: its GET path only reads (profiles, groups,
// user_badges, GET /api/notifications/prefs, idols roster).
// The two header routes are called for real only with requests that cannot write
// in any state of the storage bucket (see "the real header routes fail soft").

const env = loadTestEnv();
const USER = process.env.UX_V1_TEST_USERNAME || 'testtest';
const here = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Prototype references: v11/checks/reference/styles.json (A0 format) and P10's
// extra capture v11/reports/P10/proto-styles.json (capture-proto-styles.mjs).
// ---------------------------------------------------------------------------

const STYLES_REF: Landmark[] = [
  { proto: '.pband', impl: '.p10-band', state: 'passport', box: ['width', 'height'] },
  { proto: '.utabs button.on', impl: '.p10-tabs [aria-selected="true"]', state: 'passport', box: ['height'] },
  { proto: '.sec-h h2', impl: '#p10-panel-overview .ux-sec-h h2', state: 'passport', box: ['height'] },
  { proto: '.medal2', impl: '#p10-panel-overview .ux-medal2', state: 'passport', box: ['width'] },
];
const STYLES_REF_BADGES: Landmark[] = [
  { proto: '.pband', impl: '.p10-band', state: 'passport-badges', box: ['width', 'height'] },
  { proto: '.utabs button.on', impl: '.p10-tabs [aria-selected="true"]', state: 'passport-badges', box: ['height'] },
];
const STYLES_REF_SETTINGS: Landmark[] = [
  { proto: '.personprev', impl: '.p10-personprev', state: 'settings', box: ['width'], skip: ['margin-top'] },
];

type State = 'passport' | 'passport-badges' | 'settings' | 'header-sheet';
interface P10Landmark { proto: string; impl: string; state: State; skip?: string[] }
const TEXT = ['width'];
const PHOTO = ['background-image', 'background-color', 'color', 'font-size', 'font-weight', 'line-height'];

const P10_LANDMARKS: P10Landmark[] = [
  { proto: '.pband', impl: '.p10-band', state: 'passport' },
  { proto: '.pband .hbtn', impl: '.p10-hbtn', state: 'passport' },
  { proto: '.phead', impl: '.p10-head', state: 'passport' },
  { proto: '.pav', impl: '.p10-pav', state: 'passport', skip: PHOTO },
  { proto: '.phead .btn-ghost', impl: '.p10-acts .ux-btn-ghost', state: 'passport' },
  { proto: '.phead .ib', impl: '.p10-acts .ux-ib', state: 'passport' },
  { proto: '.pid', impl: '.p10-id', state: 'passport', skip: ['height'] },
  { proto: '.pidrow', impl: '.p10-idrow', state: 'passport' },
  // the prototype focuses the page H1 on navigation (:focus-visible radius 8): not a resting style
  { proto: '#p-name', impl: '.p10-pname', state: 'passport', skip: [...TEXT, 'color', 'border-top-color', 'border-radius'] },
  { proto: '#p-bias', impl: '.p10-idrow .ux-bias', state: 'passport', skip: [...TEXT, 'color', 'border-top-color'] },
  { proto: '#p-pinb', impl: '.p10-pinb', state: 'passport' },
  { proto: '.pidrow .lvl', impl: '.p10-lvl', state: 'passport', skip: TEXT },
  { proto: '.pmeta', impl: '.p10-meta', state: 'passport', skip: [...TEXT, 'height'] },
  { proto: '.xpw', impl: '.p10-xpw', state: 'passport' },
  { proto: '.xpw .bar', impl: '.p10-bar', state: 'passport', skip: TEXT },
  { proto: '#xpbar', impl: '.p10-bar > i', state: 'passport', skip: TEXT },
  { proto: '.xpw small', impl: '.p10-xpw small', state: 'passport', skip: TEXT },
  { proto: '.statsin', impl: '.p10-stats', state: 'passport' },
  { proto: '.statsin > div', impl: '.p10-stats > div', state: 'passport', skip: TEXT },
  { proto: '.statsin b', impl: '.p10-stats b', state: 'passport', skip: TEXT },
  { proto: '.statsin span', impl: '.p10-stats span', state: 'passport', skip: [...TEXT, 'height'] },
  { proto: '#ptabs', impl: '.p10-tabs', state: 'passport' },
  { proto: '#ptabs button.on', impl: '.p10-tabs [aria-selected="true"]', state: 'passport', skip: TEXT },
  { proto: '#ptabs button:not(.on)', impl: '.p10-tabs [aria-selected="false"]', state: 'passport', skip: TEXT },
  { proto: '.warstrip', impl: '.p10-war', state: 'passport', skip: ['height'] },
  { proto: '.warstrip .grow', impl: '.p10-war-t', state: 'passport', skip: [...TEXT, 'height'] },
  { proto: '.warstrip .lnk', impl: '.p10-war-l', state: 'passport' },
  { proto: '#pp-overview .sec', impl: '#p10-panel-overview .p10-sec', state: 'passport', skip: ['height'] },
  { proto: '#pp-overview .sec-h h2', impl: '#p10-panel-overview .ux-sec-h h2', state: 'passport', skip: TEXT },
  { proto: '#pp-overview .sec-h h2 .si', impl: '#p10-panel-overview .ux-sec-h h2 .ux-si', state: 'passport' },
  { proto: '.b-all', impl: '#p10-panel-overview .ux-sec-h .ux-lnk', state: 'passport', skip: TEXT },
  { proto: '#pinmed', impl: '#p10-panel-overview .ux-medals', state: 'passport', skip: ['height'] },
  { proto: '.medal2 b', impl: '#p10-panel-overview .ux-medal2 b', state: 'passport' },
  { proto: '.medal2 .rar', impl: '#p10-panel-overview .ux-medal2-rar', state: 'passport', skip: ['color', 'border-top-color'] },
  { proto: '.medal2 small', impl: '#p10-panel-overview .ux-medal2 small', state: 'passport', skip: [...TEXT, 'height'] },
  { proto: '#pp-overview .sec.two', impl: '.p10-two', state: 'passport', skip: ['height'] },
  { proto: '#pp-overview .two .row', impl: '.p10-two .ux-row', state: 'passport', skip: TEXT },
  { proto: '#pp-overview .two .gav', impl: '.p10-two .ux-gav', state: 'passport', skip: PHOTO },
  { proto: '#pp-overview .two .rt', impl: '.p10-two .ux-rt', state: 'passport', skip: TEXT },
  { proto: '#pp-overview .two .bar', impl: '.p10-mbar', state: 'passport', skip: TEXT },
  { proto: '#pp-overview .two .bar i', impl: '.p10-mbar > i', state: 'passport', skip: TEXT },
  { proto: '#pp-overview .two .end', impl: '.p10-two .ux-row-end', state: 'passport', skip: TEXT },
  { proto: '#pp-badges .sec', impl: '#p10-panel-badges > section', state: 'passport-badges', skip: ['height'] },
  { proto: '#pp-badges .sec-h h2', impl: '#p10-panel-badges .ux-sec-h h2', state: 'passport-badges', skip: TEXT },
  { proto: '.b-earned', impl: '#p10-panel-badges .ux-sec-h p', state: 'passport-badges', skip: TEXT },
  { proto: '.rarkey', impl: '#p10-panel-badges .ux-rarkey', state: 'passport-badges' },
  // the prototype puts a 20px spacer <div> between the rarity key and the grid; the
  // implementation uses margin-top 20 (same position, checked by the gap test below)
  { proto: '#allmed', impl: '.p10-allmed', state: 'passport-badges', skip: ['height', 'margin-top'] },
  { proto: '#pp-badges .medal2:not(.on) b', impl: '.p10-allmed .ux-medal2.is-locked b', state: 'passport-badges', skip: TEXT },
  { proto: '#settings .ph h1', impl: '.p10-settings .ux-ph h1', state: 'settings', skip: ['border-radius'] },
  { proto: '#settings .ph p', impl: '.p10-settings .ux-ph p', state: 'settings' },
  { proto: '#settings .sec .h2', impl: '.p10-settings .ux-h2', state: 'settings', skip: TEXT },
  { proto: '#settings .sec > div:nth-child(2)', impl: '.p10-photo', state: 'settings' },
  { proto: '#settings .btn-ghost.sm', impl: '.p10-photo .ux-btn', state: 'settings' },
  { proto: '#settings .field', impl: '.p10-settings .ux-field', state: 'settings' },
  { proto: '#settings .field > label', impl: '.p10-settings .ux-field > label', state: 'settings' },
  { proto: '#settings .inp', impl: '#p10-s-name', state: 'settings' },
  { proto: '#settings textarea.inp', impl: '#p10-s-bio', state: 'settings', skip: ['height'] },
  { proto: '#settings .help', impl: '#p10-s-user-h', state: 'settings', skip: TEXT },
  { proto: '#settings #look .help', impl: '#look .p10-lead', state: 'settings', skip: ['height'] },
  // the sub line carries the real level title ("Lv 2 New Fan" is longer than "Lv 7 Stan"): may wrap on phones
  { proto: '#settings .personprev', impl: '.p10-personprev', state: 'settings', skip: ['height'] },
  { proto: '#pp-name', impl: '.p10-personprev .ux-who', state: 'settings', skip: [...TEXT, 'height', 'color', 'border-top-color'] },
  { proto: '#settings .personprev .muted', impl: '.p10-prev-sub', state: 'settings', skip: [...TEXT, 'height'] },
  { proto: '#settings .flabel', impl: '#look .ux-flabel', state: 'settings' },
  { proto: '#settings .flair-row', impl: '#look .p10-flair-row', state: 'settings', skip: ['height'] },
  { proto: '#f-accent .fopt', impl: '#look .p10-fopt[aria-checked="false"]', state: 'settings', skip: TEXT },
  { proto: '#f-accent .fopt.on', impl: '#look .p10-fopt[aria-checked="true"]', state: 'settings', skip: TEXT },
  { proto: '#f-accent .fopt i', impl: '#look .p10-fopt .p10-dot', state: 'settings', skip: ['background-color', 'color', 'border-top-color'] },
  { proto: '#settings .urlrow', impl: '#look .ux-urlrow', state: 'settings' },
  { proto: '#f-bias-c', impl: '#p10-s-bias', state: 'settings', skip: TEXT },
  { proto: '#settings .urlrow .btn', impl: '#look .ux-urlrow .ux-btn', state: 'settings' },
  { proto: '#f-theme', impl: '.p10-swatches', state: 'settings' },
  { proto: '#f-theme .sw', impl: '.p10-swatches .p10-sw', state: 'settings', skip: ['background-color'] },
  { proto: '#look .flair-row .btn-ghost', impl: '#look .p10-flair-row .ux-btn-ghost', state: 'settings', skip: TEXT },
  { proto: '#look .flair-row .btn-quiet', impl: '#look .p10-flair-row .ux-btn-quiet', state: 'settings', skip: TEXT },
  { proto: '#settings .rows', impl: '.p10-srows', state: 'settings', skip: ['height'] },
  { proto: '#settings .srow2', impl: '.p10-srows .p10-srow', state: 'settings', skip: ['height'] },
  { proto: '#settings .srow2 b', impl: '.p10-srow-g b', state: 'settings', skip: TEXT },
  { proto: '#settings .srow2 small', impl: '.p10-srow-g small', state: 'settings', skip: [...TEXT, 'height'] },
  { proto: '#settings .tgl', impl: '.p10-srow .ux-switch[aria-checked="true"]', state: 'settings' },
  { proto: '#apseg', impl: '.p10-apseg', state: 'settings', skip: TEXT },
  { proto: '#apseg button.on', impl: '.p10-apseg [aria-pressed="true"]', state: 'settings', skip: TEXT },
  { proto: '#apseg button:not(.on)', impl: '.p10-apseg [aria-pressed="false"]', state: 'settings', skip: TEXT },
  { proto: '#settings .srow2 .btn', impl: '.p10-srow .ux-btn-sm', state: 'settings', skip: TEXT },
  { proto: '#settings .chips .chip', impl: '.p10-fandom .ux-chip', state: 'settings', skip: TEXT },
  { proto: '#hsheet', impl: '.ux-layer .ux-sheet', state: 'header-sheet', skip: ['height'] },
  { proto: '#hsheet .drop', impl: '.ux-layer .ux-drop', state: 'header-sheet' },
  { proto: '#hsheet .urlrow', impl: '.ux-layer .ux-urlrow', state: 'header-sheet' },
  { proto: '#hsheet .inp', impl: '.ux-layer .ux-urlrow .ux-inp', state: 'header-sheet' },
  { proto: '#hsheet .btn-quiet', impl: '.ux-layer .ux-btn-quiet', state: 'header-sheet' },
];
const P10_PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-style', 'border-top-color',
  'border-radius', 'background-color', 'background-image', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap', 'opacity', 'filter'];
const PROTO_STYLES = path.resolve(here, '../../../../docs/design/ux-dashboard-v1/v11/reports/P10/proto-styles.json');
const protoStyles = JSON.parse(fs.readFileSync(PROTO_STYLES, 'utf8')) as Record<string, Record<string, Record<string, string>>>;

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string, prop: string): boolean {
  if (norm(a) === norm(b)) return true;
  if (prop === 'background-image' && /url\(/.test(a) && /url\(/.test(b)) return true;
  const px = /^-?[\d.]+px$/;
  return px.test(a.trim()) && px.test(b.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) <= 2; // C1: within 2px
}
interface Mismatch { proto: string; impl: string; prop: string; expected: string; actual: string }

/** Computed styles of every mapped landmark visible on the page vs the P10 prototype capture. */
async function compareP10(page: Page, theme: 'light' | 'dark', state: State): Promise<{ checked: string[]; absent: string[]; mismatches: Mismatch[] }> {
  const ref = protoStyles[`${widthOf(page)}-${theme}-${state}`] ?? {};
  const lms = P10_LANDMARKS.filter((l) => l.state === state);
  const got = await page.evaluate(({ sels, props }) => {
    const o: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = Array.from(document.querySelectorAll<HTMLElement>(s)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      o[s] = el ? Object.fromEntries(props.map((p) => [p, getComputedStyle(el).getPropertyValue(p)])) : null;
    }
    return o;
  }, { sels: lms.map((l) => l.impl), props: P10_PROPS });
  const checked: string[] = []; const absent: string[] = []; const mismatches: Mismatch[] = [];
  for (const l of lms) {
    const e = ref[l.proto]; const a = got[l.impl];
    if (!e) continue;
    if (!a) { absent.push(l.proto); continue; }
    checked.push(l.proto);
    // No border drawn on either side: its style and colour are not visible (the
    // legacy global preflight sets border-style: solid on every element).
    const noBorder = parseFloat(e['border-top-width'] ?? '0') === 0 && parseFloat(a['border-top-width'] ?? '0') === 0;
    for (const p of P10_PROPS) {
      if (l.skip?.includes(p) || e[p] === undefined || a[p] === undefined) continue;
      if (noBorder && (p === 'border-top-style' || p === 'border-top-color')) continue;
      if (!close(e[p]!, a[p]!, p)) mismatches.push({ proto: l.proto, impl: l.impl, prop: p, expected: e[p]!, actual: a[p]! });
    }
  }
  return { checked, absent, mismatches };
}

// Landmarks that need data the test user does not have (bias, pinned badge, main
// group for the war strip, played groups, recent plays) or a view that is not the
// one under test. They are rendered by the same CSS (checked in the render test
// and locally on a richer public passport, see the P10 report).
const DATA_DEPENDENT = ['#p-bias', '#p-pinb', '.warstrip', '.warstrip .grow', '.warstrip .lnk', '#pp-overview .sec', '#pp-overview .sec-h h2', '#pp-overview .sec-h h2 .si', '.b-all', '#pinmed', '.medal2 b', '.medal2 .rar', '.medal2 small',
  '#pp-overview .sec.two', '#pp-overview .two .row', '#pp-overview .two .gav', '#pp-overview .two .rt', '#pp-overview .two .bar', '#pp-overview .two .bar i', '#pp-overview .two .end',
  '#settings .chips .chip'];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function openPassport(page: Page): Promise<boolean> {
  const res = await page.goto(`/u/${USER}`);
  if (!res || res.status() !== 200) return false;
  if (!(await hasShell(page)) || (await page.locator('.p10-passport').count()) === 0) return false;
  // /u/[username] has a loading.tsx: the streamed page sits in a hidden node until it is swapped in
  await expect(page.locator('.p10-passport')).toBeVisible({ timeout: 30_000 });
  await waitHydrated(page);
  return true;
}

async function ownerReady(page: Page): Promise<void> {
  await expect(page.locator('.p10-hbtn'), 'owner resolved on the client').toBeVisible({ timeout: 20_000 });
}

function mutating(page: Page): Request[] {
  const seen: Request[] = [];
  page.on('request', (r) => { if (!['GET', 'HEAD', 'OPTIONS'].includes(r.method())) seen.push(r); });
  return seen;
}

const pathOf = (u: string): string => new URL(u).pathname;
const bodyOf = (c: StubbedCall): unknown => { try { return JSON.parse(c.body ?? 'null'); } catch { return c.body; } };

async function tinyPng(): Promise<Buffer> {
  return sharp({ create: { width: 30, height: 10, channels: 3, background: '#E8457A' } }).png().toBuffer();
}

async function sheetClosesThreeWays(page: Page, trigger: ReturnType<Page['locator']>, name: string | RegExp): Promise<void> {
  const dlg = page.locator('.ux-layer [role="dialog"]').filter({ hasText: name });
  await trigger.click();
  await expect(dlg).toBeVisible();
  await expect(dlg).toHaveAttribute('aria-modal', 'true');
  await expect.poll(() => dlg.evaluate((d) => d.contains(document.activeElement)), { message: 'focus moved into the sheet' }).toBe(true);
  for (let i = 0; i < 10; i++) await page.keyboard.press('Tab');
  expect(await dlg.evaluate((d) => d.contains(document.activeElement)), 'focus trapped').toBe(true);
  await page.keyboard.press('Escape');
  await expect(dlg).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(dlg).toBeVisible();
  await page.getByTestId('ux-scrim').click({ position: { x: 4, y: 4 } });
  await expect(dlg).toBeHidden();
  await trigger.click();
  await dlg.getByRole('button', { name: 'Close' }).click();
  await expect(dlg).toBeHidden();
  await expect(trigger).toBeFocused();
}

// ---------------------------------------------------------------------------
// public passport, guest
// ---------------------------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`passport, guest, ${theme}`, () => {
    test.describe.configure({ timeout: 90_000 }); // a dev server compiles routes on first hit
    let calls: StubbedCall[] = [];
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      calls = await guardWrites(page, env.supabaseUrl);
    });

    test('renders the public passport with its SEO head, no write', async ({ page }, info) => {
      test.skip(!(await openPassport(page)), 'flag off or the test user page is not served here');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1.p10-pname')).toBeVisible();
      await expect(page).toHaveTitle(/K-pop Quizzes/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', new RegExp(`/u/${USER}$`));
      expect(await page.locator('script[type="application/ld+json"]').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('"BreadcrumbList"')]));
      await expect(page.locator('.p10-band')).toHaveAttribute('data-band', /^(image|group|flat)$/);
      await expect(page.locator('.p10-lvl')).toHaveText(/^Lv \d+ · .+/);
      await expect(page.locator('.p10-meta')).toContainText(/joined \w+ \d{4} · \d[\d,]* followers?/);
      await expect(page.locator('.p10-xpw small')).toHaveText(/^[\d,]+ \/ [\d,]+ XP to Lv \d+$/);
      await expect(page.locator('.p10-stats span')).toHaveText(['streak', 'groups mastered', 'quizzes made', 'plays received']);
      await expect(page.getByRole('tablist', { name: 'Passport' }).getByRole('tab')).toHaveText(['Overview', 'Quizzes', 'Badges']);
      await expect(page.locator('#p10-panel-history')).toHaveCount(0);
      await expect(page.getByText('Recent activity')).toHaveCount(0);
      await expect(page.locator('.p10-hbtn')).toHaveCount(0);
      await expect(page.getByRole('link', { name: 'Edit passport' })).toHaveCount(0);
      // every panel is in the served HTML (crawlable), only Overview is shown
      const html = await (await page.request.get(`/u/${USER}`)).text();
      for (const id of ['overview', 'quizzes', 'badges']) expect(html).toContain(`id="p10-panel-${id}"`);
      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(calls, 'no write on a guest visit').toEqual([]);
      await info.attach(`passport-guest-${widthOf(page)}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });

    test('matches the prototype: styles.json + P10 reference', async ({ page }, info) => {
      test.skip(!(await openPassport(page)), 'flag off or not served here');
      const w = widthOf(page);
      const a = await compareLandmarks(page, w, theme, STYLES_REF);
      const b = await compareP10(page, theme, 'passport');
      await info.attach('landmarks.json', { body: JSON.stringify({ stylesJson: a, p10: b }, null, 1), contentType: 'application/json' });
      expect(a.mismatches, 'styles.json landmarks').toEqual([]);
      expect(b.mismatches, 'P10 prototype landmarks').toEqual([]);
      // owner-only controls are absent for a guest; the rest depends on the fan's data
      expect(b.absent.filter((s) => !['.pband .hbtn', '.phead .btn-ghost', ...DATA_DEPENDENT].includes(s))).toEqual([]);
      expect(b.checked.length).toBeGreaterThan(15);
    });

    test('tabs: click, arrow keys, the "All N badges" link, badges tab styles', async ({ page }, info) => {
      test.skip(!(await openPassport(page)), 'flag off or not served here');
      const tabs = page.getByRole('tablist', { name: 'Passport' });
      await tabs.getByRole('tab', { name: 'Badges' }).click();
      await expect(tabs.getByRole('tab', { name: 'Badges' })).toHaveAttribute('aria-selected', 'true');
      const panel = page.locator('#p10-panel-badges');
      await expect(panel).toBeVisible();
      await expect(page.locator('#p10-panel-overview')).toBeHidden();
      const line = await panel.locator('.ux-sec-h p').innerText();
      const m = /^(\d+) of (\d+) earned · colour and shape show rarity$/.exec(line);
      expect(m, line).not.toBeNull();
      await expect(panel.locator('.ux-medal2')).toHaveCount(Number(m![2]));
      await expect(panel.locator('.ux-medal2.is-earned')).toHaveCount(Number(m![1]));
      await expect(panel.locator('.ux-rarkey > span')).toHaveText(['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary']);
      await expect(panel.locator('svg.ux-bmed.is-locked [stroke-dasharray]').first()).toBeAttached();

      // A0's .ux-utabs button:hover (ink) outranks the selected colour while the mouse
      // rests on the tab just clicked (request filed in v11/requests/P10.md): measure at rest.
      await page.mouse.move(1, 1);
      const a = await compareLandmarks(page, widthOf(page), theme, STYLES_REF_BADGES);
      const b = await compareP10(page, theme, 'passport-badges');
      await info.attach('landmarks-badges.json', { body: JSON.stringify({ a, b }, null, 1), contentType: 'application/json' });
      expect(a.mismatches).toEqual([]);
      expect(b.mismatches).toEqual([]);
      expect(b.absent).toEqual([]);
      const gap = await page.evaluate(() => {
        const k = document.querySelector('#p10-panel-badges .ux-rarkey')!.getBoundingClientRect();
        const g = document.querySelector('#p10-panel-badges .p10-allmed')!.getBoundingClientRect();
        return Math.round(g.top - k.bottom);
      });
      expect(gap, 'rarity key to grid: 20px as in the prototype').toBe(20);

      await tabs.getByRole('tab', { name: 'Badges' }).focus();
      await page.keyboard.press('ArrowLeft');
      await expect(tabs.getByRole('tab', { name: 'Quizzes' })).toHaveAttribute('aria-selected', 'true');
      await expect(tabs.getByRole('tab', { name: 'Quizzes' })).toBeFocused();
      await expect(page.locator('#p10-panel-quizzes')).toBeVisible();
      await page.keyboard.press('Home');
      await expect(tabs.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('End');
      await expect(tabs.getByRole('tab', { name: 'Badges' })).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('Home');

      const all = page.locator('#p10-panel-overview a[data-p10-tab="badges"]');
      if (await all.count()) {
        await expect(all).toHaveText(new RegExp(`^All ${m![2]} badges$`));
        await all.click();
        await expect(tabs.getByRole('tab', { name: 'Badges' })).toHaveAttribute('aria-selected', 'true');
        expect(new URL(page.url()).hash).toBe('#p10-panel-badges');
      }
      expect(calls).toEqual([]);
    });

    test('quizzes tab: real rows or the empty state', async ({ page }) => {
      test.skip(!(await openPassport(page)), 'flag off or not served here');
      await page.getByRole('tab', { name: 'Quizzes' }).click();
      const panel = page.locator('#p10-panel-quizzes');
      const rows = panel.locator('a.ux-row');
      if (await rows.count()) {
        for (const href of await rows.evaluateAll((as) => as.map((a) => a.getAttribute('href')))) expect(href).toMatch(/^\/q\/[a-z0-9-]+$/);
        await expect(rows.first().locator('.ux-rs')).toHaveText(/^Published · [\d.k]+ plays?/);
      } else {
        await expect(panel.locator('.ux-empty b')).toHaveText('No quizzes yet');
      }
      expect(calls).toEqual([]);
    });

    test('share sheet: focus in, trap, Escape / backdrop / X close, focus returns; copy writes nothing', async ({ page }) => {
      test.skip(!(await openPassport(page)), 'flag off or not served here');
      const trigger = page.getByRole('button', { name: 'Share passport' });
      await sheetClosesThreeWays(page, trigger, /passport/);
      await trigger.click();
      const dlg = page.locator('.ux-layer [role="dialog"]');
      await expect(dlg.locator('.ux-minicard b')).toHaveText(await page.locator('h1').innerText());
      await expect(dlg.getByRole('button', { name: 'Story image' })).toHaveCount(0); // owner only
      await dlg.getByRole('button', { name: 'Copy link' }).click();
      await expect(page.getByTestId('ux-toast')).toHaveText(/Link copied|Copy failed/);
      await page.keyboard.press('Escape');
      expect(calls).toEqual([]);
    });

    test('Follow as a guest opens the sign-in sheet (no write)', async ({ page }) => {
      test.skip(!(await openPassport(page)), 'flag off or not served here');
      const follow = page.locator('.p10-acts').getByRole('button', { name: 'Follow' });
      await expect(follow).toBeVisible({ timeout: 15_000 });
      await expect(follow).toHaveAttribute('aria-pressed', 'false');
      await follow.click();
      const dlg = page.locator('.ux-layer [role="dialog"]').filter({ hasText: `Sign in to follow ${await page.locator('h1').innerText()}` });
      await expect(dlg).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(follow).toBeFocused();
      expect(calls).toEqual([]);
    });

    test('accessibility: axe 0 serious / critical, named controls, keyboard reaches every control', async ({ page }) => {
      test.skip(!(await openPassport(page)), 'flag off or not served here');
      expect(await basicA11y(page, '.ux-page')).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe).toEqual([]);
      await page.getByRole('tab', { name: 'Badges' }).click();
      const axe2 = await runAxe(page, { include: '.ux-page' });
      if (axe2) expect(axe2).toEqual([]);
      await page.getByRole('tab', { name: 'Overview' }).click();
      // Tab order: share, then the tab list (roving tabindex: one stop), then the panel.
      const order: string[] = [];
      await page.locator('.p10-band').click({ position: { x: 8, y: 8 } });
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press('Tab');
        order.push(await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el ? `${el.getAttribute('role') ?? el.tagName.toLowerCase()}:${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 24)}` : '';
        }));
      }
      expect(order.some((o) => o.startsWith('button:Share passport'))).toBe(true);
      expect(order.some((o) => o.startsWith('tab:Overview'))).toBe(true);
    });
  });
}

// ---------------------------------------------------------------------------
// the owner on the public passport (signed in as the test user, read only)
// ---------------------------------------------------------------------------

for (const theme of THEMES) {
  signedInTest.describe(`passport, owner, ${theme}`, () => {
    signedInTest.describe.configure({ timeout: 90_000 });
    let calls: StubbedCall[] = [];
    signedInTest.beforeEach(async ({ page }) => {
      skipUnlessSignedIn();
      await preparePage(page, theme);
      calls = await guardWrites(page, env.supabaseUrl);
    });

    signedInTest('owner controls: Change header, Edit passport, no Follow, prototype styles, no write', async ({ page }, info) => {
      signedInTest.skip(!(await openPassport(page)), 'flag off or not served here');
      await ownerReady(page);
      await expect(page.getByRole('link', { name: 'Edit passport' })).toHaveAttribute('href', '/settings');
      await expect(page.locator('.p10-acts').getByRole('button', { name: /^Follow/ })).toHaveCount(0);
      const b = await compareP10(page, theme, 'passport');
      await info.attach('landmarks-owner.json', { body: JSON.stringify(b, null, 1), contentType: 'application/json' });
      expect(b.mismatches).toEqual([]);
      expect(b.checked).toEqual(expect.arrayContaining(['.pband .hbtn', '.phead .btn-ghost', '.phead .ib']));
      expect(calls).toEqual([]);
      await info.attach(`passport-owner-${widthOf(page)}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });

    signedInTest('header sheet: prototype styles, focus trap, Escape / backdrop / X close, focus returns', async ({ page }, info) => {
      signedInTest.skip(!(await openPassport(page)), 'flag off or not served here');
      await ownerReady(page);
      const trigger = page.locator('.p10-hbtn');
      await trigger.click();
      const dlg = page.locator('.ux-layer [role="dialog"]').filter({ hasText: 'Header picture' });
      await expect(dlg).toBeVisible();
      await expect(dlg.getByText('Upload from your computer')).toBeVisible();
      await expect(dlg.getByText('JPG, PNG or WebP up to 5 MB · 1500 x 300 works best')).toBeVisible();
      // The reference is the sheet at rest; A0's sheet moves focus to the file input,
      // which lights the drop zone (:focus-within, good for keyboard users). Measure at rest.
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.mouse.move(1, 1);
      const b = await compareP10(page, theme, 'header-sheet');
      await info.attach('landmarks-header-sheet.json', { body: JSON.stringify(b, null, 1), contentType: 'application/json' });
      expect(b.mismatches).toEqual([]);
      expect(b.absent).toEqual([]);
      await info.attach(`header-sheet-${widthOf(page)}-${theme}.png`, { body: await page.screenshot(), contentType: 'image/png' });
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await sheetClosesThreeWays(page, trigger, 'Header picture');
      expect(calls).toEqual([]);
    });

    signedInTest('upload: multipart to the P10 route, band switches to the new image', async ({ page }) => {
      signedInTest.skip(!(await openPassport(page)), 'flag off or not served here');
      await ownerReady(page);
      const sent: Request[] = [];
      await page.route('**/api/profile/header/upload', async (route) => {
        sent.push(route.request());
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url: 'https://example.invalid/profile-headers/u/h.webp', width: 1500, height: 300 }) });
      });
      await page.locator('.p10-hbtn').click();
      const dlg = page.locator('.ux-layer [role="dialog"]');
      await dlg.locator('input[type="file"]').setInputFiles({ name: 'header.png', mimeType: 'image/png', buffer: await tinyPng() });
      await expect.poll(() => sent.length).toBe(1);
      const req = sent[0]!;
      expect(req.method()).toBe('POST');
      expect(req.headers()['content-type']).toMatch(/^multipart\/form-data; boundary=/);
      const body = req.postDataBuffer()?.toString('latin1') ?? '';
      expect(body).toContain('name="file"; filename="header.png"');
      expect(body).toContain('Content-Type: image/png');
      await expect(dlg).toBeHidden();
      await expect(page.locator('.p10-band')).toHaveAttribute('data-band', 'image');
      await expect(page.locator('.p10-bandimg')).toHaveAttribute('style', /example\.invalid/);
      await expect(page.getByTestId('ux-toast')).toHaveText('Header updated');
      expect(calls.filter((c) => pathOf(c.url) !== '/api/profile/header/upload'), 'nothing else written').toEqual([]);
    });

    signedInTest('paste a link: JSON to the P10 link route; theme colour clears header_url through update-profile', async ({ page }) => {
      signedInTest.skip(!(await openPassport(page)), 'flag off or not served here');
      await ownerReady(page);
      const sent: Request[] = [];
      await page.route('**/api/profile/header/link', async (route) => {
        sent.push(route.request());
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, url: 'https://example.invalid/profile-headers/u/l.webp' }) });
      });
      await page.locator('.p10-hbtn').click();
      const dlg = page.locator('.ux-layer [role="dialog"]');
      await dlg.getByLabel('Image link').fill('https://images.example.com/banner.jpg');
      await dlg.getByRole('button', { name: 'Use', exact: true }).click();
      await expect.poll(() => sent.length).toBe(1);
      expect(sent[0]!.postDataJSON()).toEqual({ url: 'https://images.example.com/banner.jpg' });
      await expect(page.locator('.p10-band')).toHaveAttribute('data-band', 'image');

      await page.locator('.p10-hbtn').click();
      await dlg.getByRole('button', { name: 'Use the theme colour instead' }).click();
      await expect(dlg).toBeHidden();
      await expect(page.getByTestId('ux-toast')).toHaveText('Header uses your theme colour');
      const upd = calls.filter((c) => pathOf(c.url) === '/api/auth/update-profile');
      expect(upd).toHaveLength(1);
      expect(bodyOf(upd[0]!)).toEqual({ header_url: null });
      await expect(page.locator('.p10-band')).toHaveAttribute('data-band', /^(group|flat)$/);
    });

    signedInTest('the sheet refuses a GIF, a big file and an http link before any request', async ({ page }) => {
      signedInTest.skip(!(await openPassport(page)), 'flag off or not served here');
      await ownerReady(page);
      const writes = mutating(page);
      await page.locator('.p10-hbtn').click();
      const dlg = page.locator('.ux-layer [role="dialog"]');
      await dlg.locator('input[type="file"]').setInputFiles({ name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });
      await expect(dlg.getByRole('alert')).toHaveText('Use a JPG, PNG or WebP image.');
      await dlg.locator('input[type="file"]').setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) });
      await expect(dlg.getByRole('alert')).toHaveText('That image is over 5 MB.');
      await dlg.getByLabel('Image link').fill('http://example.com/a.jpg');
      await dlg.getByRole('button', { name: 'Use', exact: true }).click();
      await expect(dlg.getByRole('alert')).toHaveText('Paste a link that starts with https://');
      expect(writes).toEqual([]);
    });

    signedInTest('the real header routes fail soft and can never write from this test', async ({ page, playwright, baseURL }) => {
      signedInTest.skip(!(await openPassport(page)), 'flag off or not served here');
      // (1) a private address is refused by the static check, before auth or storage
      const priv = await page.request.post('/api/profile/header/link', { data: { url: 'https://169.254.169.254/latest/meta-data/' } });
      expect(priv.status()).toBe(400);
      expect(await priv.json()).toMatchObject({ code: 'private_address' });
      // (2) an upload whose file is refused anyway: 503 while the bucket is missing,
      //     415 once it exists (the file check runs after the bucket check); no write in either case
      const up = await page.request.post('/api/profile/header/upload', { multipart: { file: { name: 'a.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') } } });
      expect([503, 415]).toContain(up.status());
      if (up.status() === 503) expect(await up.json()).toMatchObject({ code: 'bucket_missing', error: expect.stringContaining('not switched on yet') });
      // (3) a public link that is not an image: 503 while the bucket is missing, 415 after
      const link = await page.request.post('/api/profile/header/link', { data: { url: 'https://kpopquiz.org/robots.txt' } });
      expect([503, 415]).toContain(link.status());
      // (4) signed out: 401
      const guest = await playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
      const anon = await guest.post('/api/profile/header/link', { data: { url: 'https://kpopquiz.org/robots.txt' } });
      expect(anon.status()).toBe(401);
      await guest.dispose();
    });
  });
}

// ---------------------------------------------------------------------------
// settings (signed in as the test user; the GET path only reads)
// ---------------------------------------------------------------------------

async function openSettings(page: Page): Promise<boolean> {
  const res = await page.goto('/settings');
  if (!res || res.status() !== 200 || !(await hasShell(page))) return false;
  await expect(page.locator('.p10-settings')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.p10-personprev')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('.p10-srows .ux-switch').first()).toBeEnabled({ timeout: 20_000 });
  return true;
}

async function checkedLabel(page: Page, group: string): Promise<string> {
  return (await page.getByRole('radiogroup', { name: group }).locator('[aria-checked="true"]').innerText()).trim();
}

for (const theme of THEMES) {
  signedInTest.describe(`settings, ${theme}`, () => {
    signedInTest.describe.configure({ timeout: 120_000 });
    let calls: StubbedCall[] = [];
    signedInTest.beforeEach(async ({ page }) => {
      skipUnlessSignedIn();
      await preparePage(page, theme);
      calls = await guardWrites(page, env.supabaseUrl);
    });

    signedInTest('renders every section with prototype styles, reads only, no save bar', async ({ page }, info) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      await expect(page.locator('h1')).toHaveText('Settings');
      await expect(page.locator('.p10-settings h2.ux-h2')).toHaveText(['Profile', 'Fandom', 'Your look', 'Notifications', 'Appearance', 'Account']);
      await expect(page.locator('.p10-savebar')).toHaveCount(0);
      await expect(page.locator('.p10-srows').first().getByRole('switch')).toHaveCount(7);
      for (const name of ['Streak reminder by email', 'Weekly recap by email']) await expect(page.getByRole('switch', { name })).toBeDisabled();
      const a = await compareLandmarks(page, widthOf(page), theme, STYLES_REF_SETTINGS);
      const b = await compareP10(page, theme, 'settings');
      await info.attach('landmarks-settings.json', { body: JSON.stringify({ a, b }, null, 1), contentType: 'application/json' });
      expect(a.mismatches).toEqual([]);
      expect(b.mismatches).toEqual([]);
      expect(b.absent.filter((s) => !DATA_DEPENDENT.includes(s))).toEqual([]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(calls, 'opening settings writes nothing').toEqual([]);
      await info.attach(`settings-${widthOf(page)}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });

    signedInTest('Your look: live preview, save posts ONLY the changed fields to update-profile (legacy shapes)', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      const accent0 = await checkedLabel(page, 'Name colour');
      const font0 = await checkedLabel(page, 'Name font');
      const theme0 = await page.getByRole('radiogroup', { name: 'Passport theme' }).locator('[aria-checked="true"]').getAttribute('aria-label');
      const accent = accent0 === 'Purple' ? 'Teal' : 'Purple';
      const font = /Serif$/.test(font0) ? 'Mono' : 'Serif';
      const swatch = theme0 === 'Teal' ? 'Amber' : 'Teal';

      await page.getByRole('radiogroup', { name: 'Name colour' }).getByRole('radio', { name: accent }).click();
      await page.getByRole('radiogroup', { name: 'Name font' }).getByRole('radio', { name: new RegExp(`· ${font}$`) }).click();
      await page.getByLabel('Custom bias tag').fill('3RACHA');
      await page.locator('#look .ux-urlrow').getByRole('button', { name: 'Use' }).click();
      await page.getByRole('radiogroup', { name: 'Passport theme' }).getByRole('radio', { name: swatch }).click();

      const prev = page.locator('.p10-personprev');
      await expect(prev.locator('.ux-who')).toHaveClass(new RegExp(`ux-acc-${accent.toLowerCase()}`));
      await expect(prev.locator('.ux-who')).toHaveCSS('font-family', font === 'Serif' ? /Georgia/ : /monospace|Menlo|SF Mono/);
      await expect(prev.locator('.ux-bias')).toHaveText('3RACHA');
      await expect(page.getByRole('radiogroup', { name: 'Bias tag' }).getByRole('radio', { name: '3RACHA' })).toHaveAttribute('aria-checked', 'true');

      const bar = page.getByRole('region', { name: 'Unsaved changes' });
      await expect(bar).toContainText('You have unsaved changes');
      expect(calls, 'nothing is sent before Save').toEqual([]);
      await bar.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByTestId('ux-toast')).toHaveText('Settings saved');
      await expect(bar).toHaveCount(0);

      const upd = calls.filter((c) => pathOf(c.url) === '/api/auth/update-profile');
      expect(upd).toHaveLength(1);
      expect(bodyOf(upd[0]!)).toEqual({
        name_accent: accent.toLowerCase(),
        name_font: font.toLowerCase(),
        bias: '3RACHA',
        profile_theme: swatch.toLowerCase(),
      });
      expect(calls.filter((c) => pathOf(c.url) !== '/api/auth/update-profile'), 'no other write').toEqual([]);
    });

    signedInTest('round trip with no change sends nothing; Discard restores and sends nothing', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      const accent0 = await checkedLabel(page, 'Name colour');
      const other = accent0 === 'Coral' ? 'Blue' : 'Coral';
      const group = page.getByRole('radiogroup', { name: 'Name colour' });
      await group.getByRole('radio', { name: other }).click();
      await expect(page.locator('.p10-savebar')).toBeVisible();
      await group.getByRole('radio', { name: accent0 }).click();
      await expect(page.locator('.p10-savebar'), 'back to the stored value = nothing to save').toHaveCount(0);

      await page.getByLabel('Bio').fill('changed for the test');
      await expect(page.locator('.p10-savebar')).toBeVisible();
      await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Discard' }).click();
      await expect(page.locator('.p10-savebar')).toHaveCount(0);
      await expect(page.getByLabel('Bio')).not.toHaveValue('changed for the test');
      expect(calls).toEqual([]);
    });

    signedInTest('radio groups work with arrow keys; pinned badge and bias chips are real choices', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      const group = page.getByRole('radiogroup', { name: 'Name colour' });
      await group.locator('[aria-checked="true"]').focus();
      const before = await checkedLabel(page, 'Name colour');
      await page.keyboard.press('ArrowRight');
      const after = await checkedLabel(page, 'Name colour');
      expect(after).not.toBe(before);
      await expect(group.locator('[aria-checked="true"]')).toBeFocused();
      await page.keyboard.press('ArrowLeft');
      expect(await checkedLabel(page, 'Name colour')).toBe(before);
      await expect(page.locator('.p10-savebar')).toHaveCount(0);

      const pin = page.getByRole('radiogroup', { name: 'Pinned badge' });
      if (await pin.count()) {
        const radios = pin.getByRole('radio');
        expect(await radios.count()).toBeGreaterThan(1);
        await expect(pin.getByRole('radio', { name: 'No pinned badge' })).toBeVisible();
        const first = radios.first();
        const was = await first.getAttribute('aria-checked');
        await first.click();
        if (was === 'false') {
          await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save changes' }).click();
          const upd = calls.filter((c) => pathOf(c.url) === '/api/auth/update-profile');
          expect(upd).toHaveLength(1);
          expect(Object.keys(bodyOf(upd[0]!) as object)).toEqual(['pinned_badge_id']);
          expect((bodyOf(upd[0]!) as { pinned_badge_id: string }).pinned_badge_id).toMatch(/^[a-z0-9_]+$/);
        }
      }
    });

    signedInTest('notifications: switches save through /api/notifications/prefs, changed keys only', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      const sw = page.getByRole('switch', { name: 'Social' });
      const was = (await sw.getAttribute('aria-checked')) === 'true';
      await sw.click();
      await expect(sw).toHaveAttribute('aria-checked', String(!was));
      await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByTestId('ux-toast')).toHaveText('Settings saved');
      const prefs = calls.filter((c) => pathOf(c.url) === '/api/notifications/prefs');
      expect(prefs).toHaveLength(1);
      expect(bodyOf(prefs[0]!)).toEqual({ categories: { social: !was } });
      expect(calls.filter((c) => pathOf(c.url) === '/api/auth/update-profile')).toEqual([]);
    });

    signedInTest('profile fields: username check, photo link, groups; appearance and sounds stay on the device', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      const user = page.getByLabel(/^Username/);
      const u0 = await user.inputValue();
      await user.fill('ab');
      await expect(page.locator('#p10-s-user-h')).toHaveText('At least 3 characters');
      await expect(page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save changes' })).toBeDisabled();
      await user.fill(u0);
      await expect(page.locator('.p10-savebar')).toHaveCount(0);

      // photo sheet: paste a link
      const photoBtn = page.getByRole('button', { name: 'Change photo' });
      await photoBtn.click();
      const dlg = page.locator('.ux-layer [role="dialog"]').filter({ hasText: 'Profile photo' });
      await dlg.getByLabel('Photo link').fill('http://nope.example/a.png');
      await dlg.getByRole('button', { name: 'Use', exact: true }).click();
      await expect(dlg.getByRole('alert')).toHaveText('Paste a link that starts with https://');
      await dlg.getByLabel('Photo link').fill('https://images.example.com/me.png');
      await dlg.getByRole('button', { name: 'Use', exact: true }).click();
      await expect(dlg).toBeHidden();
      await expect(photoBtn).toBeFocused();

      // groups: add one (search), it becomes main when first
      const groupsBefore = await page.locator('.p10-gchip').count();
      const add = page.getByRole('button', { name: 'Add a group' });
      if (groupsBefore < 3) {
        await add.click();
        const gs = page.locator('.ux-layer [role="dialog"]').filter({ hasText: 'Add a group' });
        await gs.getByLabel('Search groups').fill('twice');
        await gs.getByRole('button', { name: 'TWICE', exact: true }).click();
        await expect(page.locator('.p10-gchip').filter({ hasText: 'TWICE' })).toBeVisible();
      }
      await page.getByRole('region', { name: 'Unsaved changes' }).getByRole('button', { name: 'Save changes' }).click();
      const upd = calls.filter((c) => pathOf(c.url) === '/api/auth/update-profile');
      expect(upd).toHaveLength(1);
      const body = bodyOf(upd[0]!) as Record<string, unknown>;
      expect(body.avatar_url).toBe('https://images.example.com/me.png');
      if (groupsBefore < 3) expect((body.ult_groups as string[]).at(-1)).toBe('twice');
      expect(Object.keys(body).sort()).toEqual(groupsBefore < 3 ? ['avatar_url', 'ult_groups'] : ['avatar_url']);

      // appearance + sounds: device settings, no request
      const before = calls.length;
      const seg = page.getByRole('group', { name: 'Appearance' });
      await seg.getByRole('button', { name: 'Dark' }).click();
      await expect(page.locator('html')).toHaveClass(/\bdark\b/);
      await seg.getByRole('button', { name: 'Light' }).click();
      await expect(page.locator('html')).not.toHaveClass(/\bdark\b/);
      await seg.getByRole('button', { name: theme === 'dark' ? 'Dark' : 'Light' }).click();
      const snd = page.getByRole('switch', { name: 'Sounds in games' });
      const s0 = await snd.getAttribute('aria-checked');
      await snd.click();
      await expect(snd).not.toHaveAttribute('aria-checked', s0 ?? '');
      await snd.click();
      expect(calls.length, 'appearance and sounds write nothing to the server').toBe(before);
    });

    signedInTest('account: download is a read, sign out and delete never write for real', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      await expect(page.getByText(/no password needed/)).toBeVisible();
      const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90_000 }), page.getByRole('button', { name: 'Download' }).click()]);
      expect(dl.suggestedFilename()).toMatch(/^kpopquiz-[a-z0-9_]+\.json$/);
      const data = JSON.parse(fs.readFileSync((await dl.path())!, 'utf8')) as { profile: { username: string }; quiz_plays: unknown[] };
      expect(data.profile.username).toBe(USER);
      expect(Array.isArray(data.quiz_plays)).toBe(true);

      const del = page.getByRole('button', { name: 'Delete' });
      await del.click();
      const confirm = page.locator('.ux-layer [role="alertdialog"]').filter({ hasText: 'Delete your account?' });
      await expect(confirm).toBeVisible();
      await expect(confirm.getByRole('button', { name: 'Keep my account' })).toBeFocused();
      await confirm.getByRole('button', { name: 'Keep my account' }).click();
      await expect(confirm).toBeHidden();
      await expect(del).toBeFocused();
      await del.click();
      await confirm.getByRole('button', { name: 'Go to the contact page' }).click();
      await expect(page).toHaveURL(/\/contact$/, { timeout: 60_000 });
      expect(calls, 'delete only navigates').toEqual([]);

      await openSettings(page);
      await page.getByRole('button', { name: 'Sign out' }).click();
      await expect(page).toHaveURL(/\/$/, { timeout: 60_000 });
      const out = calls.filter((c) => /\/auth\/v1\/logout/.test(c.url));
      expect(out.length, 'the sign-out call was made (stubbed: the real session is untouched)').toBeGreaterThanOrEqual(1);
      expect(calls.filter((c) => !/\/auth\/v1\/logout/.test(c.url))).toEqual([]);
    });

    signedInTest('accessibility: axe 0 serious / critical, named controls', async ({ page }) => {
      signedInTest.skip(!(await openSettings(page)), 'flag off or not served here');
      expect(await basicA11y(page, '.ux-page')).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe).toEqual([]);
      await page.getByLabel('Bio').fill('x');
      const axe2 = await runAxe(page, { include: '.p10-savebar' });
      if (axe2) expect(axe2).toEqual([]);
    });
  });
}
