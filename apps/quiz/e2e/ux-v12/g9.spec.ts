import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from '../ux-v1/helpers/a11y';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from '../ux-v1/helpers/setup-page';

import type { Page } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';

// G9 Editorial seeding (SYSTEM.md 5.6), at the project width (ux-1440 / ux-390),
// light and dark. Signed out only. No write: every page is wrapped with guardWrites
// and each test asserts that nothing mutating was even attempted; the spec itself
// sends GET requests only.
//
// The two prototype states (`community-team-post`, `post-team`) need an editorial
// post, and none can exist: the editorial tables are a pending SQL file and no
// editorial account has been created (no agent creates one). So the spec measures
// the REAL markup in the REAL pages: the HTML of the feed card and of the post view
// for an editorial post, rendered by the app's own components in
// src/lib/editorial/team-render.test.ts and pinned there as files
// (src/lib/editorial/__fixtures__/), is placed in the live /community feed (second
// post, as in the prototype) and in a live post page, then compared with the pinned
// prototype reference (run/checks/reference/styles.json). Nothing is written and
// nothing is faked in the app: this is the page's own stylesheet on the components'
// own output. What it cannot prove (the database read of an editorial post) is
// listed in the report.
//
// Flag states (the server decides, the spec reads it): G9_EXPECT=v12 | v11 | off
// makes the state an assertion.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
const FIXTURES = path.resolve(here, '../../src/lib/editorial/__fixtures__');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;
const CARD_HTML = fs.readFileSync(path.join(FIXTURES, 'team-feed-card.html'), 'utf8');
const POST_HTML = fs.readFileSync(path.join(FIXTURES, 'team-post-view.html'), 'utf8');

const env = loadTestEnv();
const EXPECT = process.env.G9_EXPECT as 'v12' | 'v11' | 'off' | undefined;
const SHOTS = process.env.G9_SHOTS;

// The capture's property list (capture-v12.mjs PROPS).
const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;

interface Landmark { proto: string; impl: string; state: 'community-team-post' | 'post-team' }

const FEED_LANDMARKS: Landmark[] = [
  { proto: '.teamtag', impl: '[data-g9-fixture="card"] .ux-teamtag', state: 'community-team-post' },
  { proto: '.ava.team', impl: '[data-g9-fixture="card"] .ux-ava-team', state: 'community-team-post' },
];
const POST_LANDMARKS: Landmark[] = [
  { proto: '.teamtag', impl: 'article.p8-pv .ux-teamtag', state: 'post-team' },
  { proto: '.ava.team', impl: 'article.p8-pv .ux-ava-team', state: 'post-team' },
  { proto: '.teamnote', impl: 'article.p8-pv .ux-teamnote', state: 'post-team' },
  { proto: '.sec-h h2', impl: '.ux-sec-h h2', state: 'post-team' },
];

function refKey(width: number, theme: Theme, state: string): string {
  return `${width > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}-${state}`;
}

function expected(width: number, theme: Theme, l: Landmark): StyleMap | null {
  const raw = REFERENCE[refKey(width, theme, l.state)]?.[l.proto];
  if (!raw) return null;
  const out: StyleMap = { ...raw };
  // The v11 owner deviations (warm light ground, re-tuned surfaces), as in a1.spec.ts.
  for (const d of OWNER_DEVIATIONS) if (d.theme === theme && (d.proto === '*' || d.proto === l.proto) && out[d.prop] === d.from) out[d.prop] = d.to;
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

interface Compared { checked: string[]; missing: string[]; mismatches: { landmark: string; key: string; prop: string; expected: string; actual: string }[]; rows: unknown[] }

async function compare(page: Page, theme: Theme, landmarks: Landmark[]): Promise<Compared> {
  const w = widthOf(page);
  const got = await computed(page, landmarks.map((l) => l.impl));
  const out: Compared = { checked: [], missing: [], mismatches: [], rows: [] };
  for (const l of landmarks) {
    const key = refKey(w, theme, l.state);
    const exp = expected(w, theme, l);
    expect(exp, `reference has ${l.proto} in ${key}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    out.rows.push({ landmark: l.proto, state: key, impl: l.impl, expected: exp, actual: act });
    if (!act) { out.missing.push(`${l.impl} (${key})`); continue; }
    out.checked.push(`${l.proto} @ ${key}`);
    for (const p of PROPS) {
      const e = exp[p]; const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (!close(e, a)) out.mismatches.push({ landmark: l.proto, key, prop: p, expected: e, actual: a });
    }
  }
  return out;
}

type FlagState = 'v12' | 'v11' | 'off';

/** The flag state of the server, read from its own answers (GET only). */
async function flagState(page: Page): Promise<FlagState> {
  const team = await page.request.get('/api/ux-v1/p11/team');
  if (team.status() === 200) return 'v12';
  const res = await page.goto('/community');
  return res && res.status() === 200 && /\/community$/.test(new URL(page.url()).pathname) && (await hasShell(page)) ? 'v11' : 'off';
}

function shot(page: Page, theme: Theme, name: string): string | null {
  if (!SHOTS) return null;
  fs.mkdirSync(SHOTS, { recursive: true });
  return path.join(SHOTS, `${widthOf(page) > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}-${name}`);
}

test.describe('G9 routes and gating (GET only)', () => {
  let writes: StubbedCall[] = [];
  test.beforeEach(async ({ page }) => { writes = await guardWrites(page, env.supabaseUrl); });
  test.afterEach(() => { expect(writes, 'no mutating request was attempted').toEqual([]); });

  test('flag state is the expected one', async ({ page }) => {
    const state = await flagState(page);
    if (EXPECT) expect(state).toBe(EXPECT);
    test.info().annotations.push({ type: 'flag-state', description: state });
  });

  test('v12 on: the cron and the admin API refuse an anonymous caller, the team list is empty before the SQL', async ({ page }) => {
    test.skip((await flagState(page)) !== 'v12', 'v12 is off here');
    const cron = await page.request.get('/api/cron/editorial-publish');
    expect(cron.status(), 'cron without the secret').toBe(401);
    const wrong = await page.request.get('/api/cron/editorial-publish', { headers: { authorization: 'Bearer not-the-secret' } });
    expect(wrong.status(), 'cron with a wrong secret').toBe(401);
    const admin = await page.request.get('/api/admin/editorial');
    expect(admin.status(), 'admin API signed out').toBe(401);
    const team = await page.request.get('/api/ux-v1/p11/team');
    expect(team.status()).toBe(200);
    const body = await team.json() as { usernames?: unknown };
    expect(Array.isArray(body.usernames)).toBe(true);
    // An editorial post URL is a 404 until the store exists and holds it.
    for (const u of ['/community/thread/e999999999', '/community/blog/e999999999', '/community/debate/e1', '/community/thread/e0']) {
      expect((await page.request.get(u)).status(), u).toBe(404);
    }
  });

  test('v12 on: /admin/editorial is closed to a signed-out visitor and never in the sitemap', async ({ page }) => {
    test.skip((await flagState(page)) !== 'v12', 'v12 is off here');
    const res = await page.request.get('/admin/editorial', { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(res.status());
    expect(res.headers().location ?? '').toMatch(/\/login\?returnTo=%2Fadmin%2Feditorial$|^\/$|\/$/);
    const sitemap = await page.request.get('/sitemap.xml');
    expect(await sitemap.text()).not.toContain('/admin/editorial');
    const robots = await (await page.request.get('/robots.txt')).text();
    expect(robots).toMatch(/Disallow: \/admin/);
  });

  test('v12 off: the cron, the team list and editorial post URLs do not exist', async ({ page }) => {
    const state = await flagState(page);
    test.skip(state === 'v12', 'v12 is on here');
    expect((await page.request.get('/api/cron/editorial-publish')).status(), 'cron').toBe(404);
    expect((await page.request.get('/api/cron/editorial-publish', { headers: { authorization: 'Bearer anything' } })).status(), 'cron with a header').toBe(404);
    expect((await page.request.get('/api/ux-v1/p11/team')).status(), 'team list').toBe(404);
    expect((await page.request.get('/api/admin/editorial')).status(), 'admin API').toBe(404);
    if (state === 'v11') {
      for (const u of ['/community/thread/e1', '/community/blog/e1']) expect((await page.request.get(u)).status(), u).toBe(404);
    }
  });
});

for (const theme of THEMES) {
  test.describe(`G9 team post ${theme}`, () => {
    let writes: StubbedCall[] = [];
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
      writes = await guardWrites(page, env.supabaseUrl);
    });
    test.afterEach(() => { expect(writes, 'no mutating request was attempted').toEqual([]); });

    test('community-team-post: the editorial card in the feed matches the reference', async ({ page }, info) => {
      test.skip((await flagState(page)) !== 'v12', 'v12 is off here');
      await page.goto('/community');
      await waitHydrated(page);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      // Before the SQL: no surface changes. The live feed carries no Team pill.
      await expect(page.locator('.ux-teamtag')).toHaveCount(0);
      const feed = page.locator('.p8-feed');
      await expect(feed).toHaveCount(1);
      await feed.evaluate((el, html) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const card = tpl.content.firstElementChild as HTMLElement;
        card.setAttribute('data-g9-fixture', 'card');
        const posts = [...el.children].filter((c) => c.classList.contains('ux-post'));
        // Second post, as in the prototype (after the first card when there is one).
        if (posts[0]) posts[0].after(card); else el.prepend(card);
      }, CARD_HTML);
      const card = page.locator('[data-g9-fixture="card"]');
      await expect(card.locator('.ux-ph2 .ux-ava.ux-ava-team')).toHaveText('M');
      await expect(card.locator('.ux-ph2 .ux-who')).toHaveText('Mina');
      await expect(card.locator('.ux-ph2 .ux-teamtag')).toHaveText('Team');
      await expect(card.locator('.ux-ph2-lv')).toHaveText('· 2 hours ago');
      await expect(card.locator('.ux-bias')).toHaveCount(0);
      await expect(card.locator('.ux-teamnote')).toHaveCount(0);
      await expect(card.locator('.ux-ptype')).toHaveText('Thread · General K-pop');

      const r = await compare(page, theme, FEED_LANDMARKS);
      await info.attach('g9-community-team-post.json', { body: JSON.stringify(r, null, 1), contentType: 'application/json' });
      expect(r.missing).toEqual([]);
      expect(r.mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(r.checked.length).toBe(FEED_LANDMARKS.length);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      const axe = await runAxe(page, { include: '[data-g9-fixture="card"]' });
      if (axe) expect(axe, 'axe serious / critical in the team card').toEqual([]);

      const file = shot(page, theme, 'community-team-post');
      if (file) {
        await page.addStyleTag({ content: '.ux-nav, .ux-tabbar, nextjs-portal { visibility: hidden !important; }' });
        await card.scrollIntoViewIfNeeded();
        await card.screenshot({ path: `${file}.png` });
        fs.writeFileSync(`${file}.json`, `${JSON.stringify(r, null, 1)}\n`);
      }
    });

    test('post-team: the editorial post view matches the reference', async ({ page }, info) => {
      test.skip((await flagState(page)) !== 'v12', 'v12 is off here');
      // A live post page is the host (its shell, its 720 column, its "More from the community").
      await page.goto('/community');
      const host = await page.locator('.p8-feed a[href^="/community/"]').evaluateAll((as) => {
        const hrefs = as.map((a) => (a.getAttribute('href') ?? '').split('#')[0] ?? '');
        return hrefs.find((h) => /^\/community\/(thread|debate|blog|challenge)\/[^/]+$/.test(h)) ?? null;
      });
      test.skip(!host, 'the live feed has no post to host the view');
      await page.goto(host as string);
      await waitHydrated(page);
      await expect(page.locator('article.p8-pv')).toHaveCount(1);
      await expect(page.locator('.ux-teamtag')).toHaveCount(0);
      await page.evaluate((html) => {
        const tpl = document.createElement('template');
        tpl.innerHTML = html;
        const art = tpl.content.querySelector('article.p8-pv');
        const rep = tpl.content.querySelector('section#replies');
        const curArt = document.querySelector('article.p8-pv');
        const curRep = document.querySelector('section#replies');
        if (art && curArt) curArt.replaceWith(art);
        if (rep && curRep) curRep.replaceWith(rep);
      }, POST_HTML);
      const art = page.locator('article.p8-pv');
      await expect(art.locator('.p8-author .ux-ava.ux-ava-team')).toHaveText('M');
      await expect(art.locator('.p8-author .ux-who')).toHaveText('Mina');
      await expect(art.locator('.p8-author .ux-teamtag')).toHaveText('Team');
      await expect(art.locator('.p8-author .p8-lv')).toHaveText('· 2 hours ago');
      await expect(art.locator('.ux-teamnote')).toHaveText('Editorial account of the KpopQuiz team. Topics and blogs are written by the team and checked before they go live. Replies come from fans.');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Which b-side deserves a comeback stage?');
      await expect(art.locator('.ux-bias')).toHaveCount(0);
      // The line sits between the author row and the title (prototype openPost('team')).
      const order = await art.evaluate((el) => [...el.children].map((c) => c.className.split(' ')[0]));
      expect(order.indexOf('ux-teamnote')).toBe(order.indexOf('p8-author') + 1);
      expect(order.indexOf('p8-post-t')).toBe(order.indexOf('ux-teamnote') + 1);

      const r = await compare(page, theme, POST_LANDMARKS);
      await info.attach('g9-post-team.json', { body: JSON.stringify(r, null, 1), contentType: 'application/json' });
      expect(r.missing).toEqual([]);
      expect(r.mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);
      expect(r.checked.length).toBe(POST_LANDMARKS.length);
      expect(await horizontalOverflow(page), 'no sideways scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page, 'article.p8-pv')).toEqual([]);
      const axe = await runAxe(page, { include: 'article.p8-pv' });
      if (axe) expect(axe, 'axe serious / critical in the team post').toEqual([]);

      const file = shot(page, theme, 'post-team');
      if (file) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `${file}.png` });
        fs.writeFileSync(`${file}.json`, `${JSON.stringify(r, null, 1)}\n`);
      }
    });
  });
}
