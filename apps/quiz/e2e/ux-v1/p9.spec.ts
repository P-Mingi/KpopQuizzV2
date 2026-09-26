import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';
import { sampleCard, sampleLadder } from '../../src/lib/ranked/test-fixtures';

import type { Page } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';
import type { Theme } from './helpers/setup-page';
import type { P9Standing } from '../../src/lib/ux-v1/p9/standing';

// P9 Leaderboard (UX v11.2): /leaderboard, flag ON, at the project width (ux-1440 /
// ux-390), light and dark. Real data everywhere it exists (read only): the boards,
// the community panels, the ranked API (503 not_live today), the signed-in pins of
// the parity test user. Two states the live data cannot show are fed through the
// page's own GETs: a live ranked season (P7's ENGINE OUTPUTS, lib/ranked/
// test-fixtures) and a fan with a main fandom (a standing fixture). guardWrites
// stubs and records every mutating request: nothing here writes. Skips on a
// flag-off build.

const env = loadTestEnv();

// The live page's SEO (flag off, measured; COMMON rule 6: unchanged).
const SEO = {
  title: 'K-pop Fandom Leaderboard: Who Wins This Week | KpopQuiz',
  description: 'See which K-pop fandom is winning the week on the fandom war map, watch what fans are playing right now, and follow the top quiz creators.',
  h1: 'Community',
  intro: 'Discover fans, creators, and rising stars.',
};

// Prototype landmarks (styles.json, state `leaderboard`, signed in) mapped to P9.
const TAB_LANDMARKS: Landmark[] = [
  { proto: '.utabs button.on', impl: '.p9-tabs [aria-selected="true"]', state: 'leaderboard', box: ['width', 'height'] },
  { proto: '.lrow', impl: '.p9-pane:not([hidden]) .p9-rows-top > .p9-lrow', state: 'leaderboard', box: ['width', 'height'] },
  { proto: '.nav', impl: '.ux-nav', state: 'leaderboard', box: ['width', 'height'] },
];
const PIN_LANDMARKS: Landmark[] = [
  { proto: '.pin', impl: '.p9-pane:not([hidden]) .ux-pin.is-you', state: 'leaderboard', box: ['width', 'height'] },
];

interface Opened { writes: StubbedCall[]; api: string[] }

/** guardWrites first, then the fixtures of `stubs` (later routes win in Playwright), then the page. */
async function open(page: Page, theme: Theme, stubs?: (p: Page) => Promise<void>, path = '/leaderboard'): Promise<Opened | null> {
  await preparePage(page, theme);
  const writes = await guardWrites(page, env.supabaseUrl);
  if (stubs) await stubs(page);
  const api: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.pathname.startsWith('/api/')) api.push(`${r.method()} ${u.pathname}${u.search}`);
  });
  const res = await page.goto(path);
  if (!res || res.status() !== 200 || !(await hasShell(page))) return null;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await waitHydrated(page);
  // the pins island answered (guest pin, a signed-in pin, or nothing): the page is interactive
  await page.waitForFunction(() => !document.querySelector('.p9-pane:not([hidden]) .p9-pin-wait'), undefined, { timeout: 30_000 });
  return { writes, api };
}

function tab(page: Page, name: string): ReturnType<Page['getByRole']> {
  return page.getByRole('tab', { name });
}

async function rest<T>(query: string, count = false): Promise<{ rows: T; count: number | null }> {
  // GET only (anon key, public rows), retried on a network error.
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`${env.supabaseUrl}/rest/v1/${query}`, {
        headers: { apikey: env.anonKey as string, Authorization: `Bearer ${env.anonKey}`, ...(count ? { Prefer: 'count=exact', Range: '0-0' } : {}) },
      });
      const range = r.headers.get('content-range');
      return { rows: (await r.json()) as T, count: range ? Number(range.split('/')[1]) : null };
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
}

for (const theme of THEMES) {
  test.describe(`leaderboard ${theme}`, () => {
    test.describe.configure({ timeout: 120_000 });

    test('guest, Fandom war (real data): SEO lock, podium, 30 hub links, fold, weekly change, guest pin, a11y, landmarks', async ({ page }, info) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');

      // SEO lock: title, meta, canonical, hreflang, one H1 and the intro are the live page's.
      await expect(page).toHaveTitle(SEO.title);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', SEO.description);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kpopquiz.org/leaderboard');
      await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute('href', 'https://kpopquiz.org/pt/leaderboard');
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(SEO.h1);
      await expect(page.locator('.ux-ph p')).toHaveText(SEO.intro);

      // Tabs: four, Fandom war selected, every pane in the HTML, the others hidden.
      await expect(page.getByRole('tab')).toHaveText(['Fandom war', 'Players', 'Ranked', 'Creators']);
      await expect(tab(page, 'Fandom war')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.p9-pane')).toHaveCount(4);
      await expect(page.locator('.p9-pane[hidden]')).toHaveCount(3);

      // Podium: #1 in the centre, #2 left, #3 right (DOM order stays #1, #2, #3).
      const pods = page.locator('#lb-panel-war .p9-pod');
      await expect(pods).toHaveCount(3);
      await expect(pods.locator('.p9-prk')).toHaveText(['#1', '#2', '#3']);
      const [b1, b2, b3] = await Promise.all([1, 2, 3].map((r) => page.locator(`#lb-panel-war .p9-pod[data-rank="${r}"]`).boundingBox()));
      expect(b2!.x).toBeLessThan(b1!.x);
      expect(b1!.x).toBeLessThan(b3!.x);
      expect(b1!.y, '#1 raised by 24px').toBeLessThan(b2!.y);

      // The real board: every row links its group hub; the board is the live war map's size.
      const hubs = await page.locator('#lb-panel-war a.p9-link').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
      const { rows: war } = await rest<Array<{ slug: string }>>('rpc/get_fandom_war_map?p_limit=31');
      const expected = war.filter((g) => g.slug !== 'general-kpop').slice(0, 30).map((g) => `/${g.slug}-quiz`);
      expect(hubs.length).toBe(expected.length);
      // the page is cached (ISR / 1 h data): compare as sets, most of the board must match the live read
      const same = hubs.filter((h) => expected.includes(h ?? '')).length;
      expect(same, 'hub links = the live war map').toBeGreaterThanOrEqual(expected.length - 3);
      expect(hubs.every((h) => /^\/[a-z0-9-]+-quiz$/.test(h ?? ''))).toBe(true);

      // Rows 4 to 10 in view, their ranks 4 to 6 pink-ink; 11 to 30 inside a native fold.
      const top = page.locator('#lb-panel-war .p9-rows-top > .p9-lrow');
      await expect(top).toHaveCount(Math.min(7, Math.max(0, hubs.length - 3)));
      await expect(top.locator('.p9-rk')).toHaveText(['4', '5', '6', '7', '8', '9', '10']);
      const more = page.locator('#lb-panel-war details.p9-more');
      if (hubs.length > 10) {
        await expect(more.locator('.p9-lrow')).toHaveCount(hubs.length - 10);
        await expect(more.locator('.p9-lrow').first()).toBeHidden();
        await more.locator('summary').click();
        await expect(more.locator('.p9-lrow').first()).toBeVisible();
        await expect(more.locator('summary')).toContainText('Show fewer');
        await more.locator('summary').focus();
        await page.keyboard.press('Enter');
        await expect(more.locator('.p9-lrow').first()).toBeHidden();
        await expect(more.locator('summary')).toContainText(`Show all ${hubs.length} fandoms`);
      }
      // Weekly change: a sign or "new" and words for screen readers on every row.
      const deltas = await page.locator('#lb-panel-war .p9-dl > span[aria-hidden="true"]').allTextContents();
      expect(deltas.length).toBe(hubs.length - 3);
      for (const d of deltas) expect(d).toMatch(/^([+-][\d,]+%|0%|new)$/);
      await expect(page.locator('#lb-panel-war .p9-dl .ux-sr').first()).toHaveText(/since last week|new on the board/);

      // Guest pin: sign in (sheet named from context; Escape closes and returns focus).
      const pin = page.locator('#lb-panel-war .ux-pin');
      await expect(pin).toHaveCount(1);
      await expect(pin).not.toHaveClass(/is-you/);
      await expect(pin).toContainText('Sign in and pick your group: every quiz you play for it adds to its fandom.');
      const signIn = pin.getByRole('button', { name: 'Sign in' });
      await signIn.click();
      const dlg = page.getByRole('dialog', { name: 'Join the fandom war' });
      await expect(dlg).toBeVisible();
      await expect(dlg).toContainText('Pick your group and every quiz you play for it adds points to its fandom.');
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(signIn).toBeFocused();
      await signIn.click();
      await dlg.getByRole('button', { name: 'Close' }).click();
      await expect(dlg).toBeHidden();
      await expect(signIn).toBeFocused();

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, TAB_LANDMARKS);
      await info.attach('landmarks-war.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(o!.writes, 'the page writes nothing').toEqual([]);
      // a guest never calls the standing endpoint, and the ranked API waits for its tab
      expect(o!.api.filter((a) => a.includes('/api/ux-v1/p9/') || a.includes('/api/ranked/'))).toEqual([]);
    });

    test('tabs: arrow keys, Home / End, hash deep links, URL follows the tab', async ({ page }) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');
      await tab(page, 'Fandom war').focus();
      await page.keyboard.press('ArrowRight');
      await expect(tab(page, 'Players')).toHaveAttribute('aria-selected', 'true');
      await expect(tab(page, 'Players')).toBeFocused();
      await expect(page.locator('#lb-panel-players')).toBeVisible();
      await expect(page.locator('#lb-panel-war')).toBeHidden();
      expect(new URL(page.url()).hash).toBe('#players');
      await page.keyboard.press('End');
      await expect(tab(page, 'Creators')).toHaveAttribute('aria-selected', 'true');
      expect(new URL(page.url()).hash).toBe('#creators');
      await page.keyboard.press('ArrowRight');
      await expect(tab(page, 'Fandom war')).toHaveAttribute('aria-selected', 'true');
      expect(new URL(page.url()).hash).toBe('');
      await page.keyboard.press('ArrowLeft');
      await expect(tab(page, 'Creators')).toHaveAttribute('aria-selected', 'true');
      await page.keyboard.press('Home');
      await expect(tab(page, 'Fandom war')).toHaveAttribute('aria-selected', 'true');
      await tab(page, 'Ranked').click();
      await expect(tab(page, 'Ranked')).toHaveAttribute('aria-selected', 'true');
      expect(new URL(page.url()).hash).toBe('#ranked');

      // A shared link opens its tab; the group hubs' #fandom-war lands on the war board.
      const p2 = await page.context().newPage();
      await preparePage(p2, theme);
      await guardWrites(p2, env.supabaseUrl);
      await p2.goto('/leaderboard#players');
      await expect(p2.getByRole('tab', { name: 'Players' })).toHaveAttribute('aria-selected', 'true');
      await expect(p2.locator('#lb-panel-players')).toBeVisible();
      await p2.goto('/leaderboard#fandom-war');
      await expect(p2.getByRole('tab', { name: 'Fandom war' })).toHaveAttribute('aria-selected', 'true');
      await expect(p2.locator('#fandom-war')).toBeVisible();
      await p2.close();
      expect(o!.writes).toEqual([]);
    });

    test('Players (real data): all-time XP board, passport links, flair, no guest pin', async ({ page }) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');
      await tab(page, 'Players').click();
      const pane = page.locator('#lb-panel-players');
      await expect(pane).toBeVisible();
      const { rows: top } = await rest<Array<{ username: string; xp: number }>>('profiles?select=username,xp&xp=gt.0&order=xp.desc&limit=10');
      await expect(pane.locator('.p9-pod')).toHaveCount(3);
      const names = await pane.locator('a.ux-who').evaluateAll((as) => as.map((a) => a.textContent));
      // the board is cached for 5 minutes: the live read and the page agree on the top of the board
      expect(names.slice(0, 3)).toEqual(top.slice(0, 3).map((p) => p.username));
      expect(names.length).toBe(top.length);
      await expect(pane.locator('a.ux-who').first()).toHaveAttribute('href', `/u/${top[0]!.username}`);
      await expect(pane.locator('.p9-pod[data-rank="1"] .p9-pts')).toHaveText(`${top[0]!.xp.toLocaleString('en-US')} XP`);
      for (const sub of await pane.locator('.p9-psub, .p9-sub').allTextContents()) expect(sub).toMatch(/^Lv \d+ · \S/);
      await expect(pane.locator('.p9-rows-top > .p9-lrow')).toHaveCount(top.length - 3);
      await expect(pane.locator('.ux-pin')).toHaveCount(0); // guests: no pin (prototype)
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const axe = await runAxe(page, { include: '#lb-panel-players' });
      if (axe) expect(axe).toEqual([]);
      expect(o!.writes).toEqual([]);
    });

    test('Creators (real data): plays received board, the switch only with 2+ boards', async ({ page }) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');
      await tab(page, 'Creators').click();
      const pane = page.locator('#lb-panel-creators');
      await expect(pane).toBeVisible();
      const { rows: top } = await rest<Array<{ username: string; total_plays_received: number; total_quizzes_created: number }>>(
        'profiles?select=username,total_plays_received,total_quizzes_created&total_quizzes_created=gt.0&order=total_plays_received.desc&limit=10',
      );
      const all = pane.locator('.p9-cview[data-view="all"]');
      await expect(all.locator('.p9-pod')).toHaveCount(3);
      const names = await all.locator('a.ux-who').evaluateAll((as) => as.map((a) => a.textContent));
      expect(names.slice(0, 3)).toEqual(top.slice(0, 3).map((p) => p.username));
      await expect(all.locator('.p9-pod[data-rank="1"] .p9-psub')).toHaveText(`${top[0]!.total_quizzes_created} ${top[0]!.total_quizzes_created === 1 ? 'quiz' : 'quizzes'}`);
      await expect(all.locator('.p9-pod[data-rank="1"] .p9-pts')).toContainText('plays');
      const views = await pane.locator('.p9-cview').count();
      const seg = pane.locator('.ux-seg');
      if (views > 1) {
        await expect(seg.getByRole('button')).toHaveCount(views);
        const second = seg.getByRole('button').nth(1);
        await second.click();
        await expect(second).toHaveAttribute('aria-pressed', 'true');
        await expect(all).toBeHidden();
      } else {
        await expect(seg).toHaveCount(0);
      }
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const axe = await runAxe(page, { include: '#lb-panel-creators' });
      if (axe) expect(axe).toEqual([]);
      expect(o!.writes).toEqual([]);
    });

    test('Ranked, not live today (real API, read only, fetched when the tab opens)', async ({ page }) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');
      expect(o!.api.filter((a) => a.includes('/api/ranked/'))).toEqual([]);
      await tab(page, 'Ranked').click();
      const note = page.locator('#lb-panel-ranked .p9-rnote[data-state="not-live"]');
      await expect(note).toBeVisible({ timeout: 30_000 });
      await expect(note).toHaveText('Ranked is not live yet: the first season has not started, so there is no ladder to show. How ranked works');
      await expect(note.getByRole('link', { name: 'How ranked works' })).toHaveAttribute('href', '/blindtest/ranked');
      await expect(page.locator('#lb-panel-ranked .p9-pod, #lb-panel-ranked .p9-lrow, #lb-panel-ranked .ux-pin')).toHaveCount(0);
      expect(o!.api.filter((a) => a.includes('/api/ranked/')).sort()).toEqual(['GET /api/ranked/ladder?scope=global', 'GET /api/ranked/me']);
      expect(o!.writes).toEqual([]);
    });

    test('Ranked, live season (P7 engine outputs): season line, podium, rows, your pinned row', async ({ page }) => {
      const now = new Date();
      const card = await sampleCard(now, 'player');
      const ladder = await sampleLadder(now, 'global', 'player');
      const o = await open(page, theme, async (p) => {
        await p.route((u) => u.pathname === '/api/ranked/me', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(card) }));
        await p.route((u) => u.pathname === '/api/ranked/ladder', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(ladder) }));
      });
      test.skip(!o, 'UX v1 flag is OFF on this build');
      await tab(page, 'Ranked').click();
      const pane = page.locator('#lb-panel-ranked');
      await expect(pane.locator('.p9-rline')).toHaveText(/^Season 3 · ends in \d+ days?\. How ranked works$/);
      await expect(pane.locator('.p9-pod')).toHaveCount(3);
      await expect(pane.locator('.p9-pod .p7-gem')).toHaveCount(3);
      await expect(pane.locator('.p9-lrow')).toHaveCount(ladder.rows.length - 3);
      const first = ladder.rows[0]!;
      await expect(pane.locator('.p9-pod[data-rank="1"] a.ux-who')).toHaveText(first.name);
      await expect(pane.locator('.p9-pod[data-rank="1"] .p9-psub')).toHaveText(first.tier.label);
      await expect(pane.locator('.p9-pod[data-rank="1"] .p9-pts')).toHaveText(first.seasonScore.toLocaleString('en-US'));
      const me = ladder.me!;
      const pin = pane.locator('.ux-pin.is-you');
      await expect(pin.locator('.ux-pin-rk')).toHaveText(`#${me.scopePosition.toLocaleString('en-US')}`);
      await expect(pin).toContainText(`${me.name} · ${me.tier.label}`);
      await expect(pin.locator('.p9-pin-v')).toHaveText(me.seasonScore.toLocaleString('en-US'));
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, PIN_LANDMARKS);
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches).toEqual([]);
      const axe = await runAxe(page, { include: '#lb-panel-ranked' });
      if (axe) expect(axe).toEqual([]);
      expect(o!.writes).toEqual([]);
    });

    test('How points work: three native folds with the real rules, mouse and keyboard', async ({ page }) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');
      const how = page.locator('.p9-how');
      await expect(how.getByRole('heading', { level: 2 })).toHaveText('How points work');
      const accs = how.locator('details.p9-acc');
      await expect(accs.locator('summary')).toHaveText(['Fandom war points', 'Player points', 'Creator points']);
      for (let i = 0; i < 3; i++) await expect(accs.nth(i)).not.toHaveAttribute('open', '');
      await accs.nth(0).locator('summary').click();
      await expect(accs.nth(0)).toHaveAttribute('open', '');
      await expect(accs.nth(0).locator('.p9-ab')).toContainText('adds 1 point to that group\'s fandom');
      await expect(accs.nth(0).locator('.p9-ab')).toContainText('last 7 days');
      await accs.nth(1).locator('summary').focus();
      await page.keyboard.press('Enter');
      await expect(accs.nth(1)).toHaveAttribute('open', '');
      await expect(accs.nth(1).locator('.p9-ab')).toContainText('all-time XP');
      await accs.nth(2).locator('summary').focus();
      await page.keyboard.press('Space');
      await expect(accs.nth(2)).toHaveAttribute('open', '');
      await expect(accs.nth(2).locator('.p9-ab')).toContainText('plays their quizzes have received');
      const all = await how.innerText();
      expect(all).not.toMatch(/[\u2013\u2014]/);
      expect(o!.writes).toEqual([]);
    });

    test('Around the community (real data): the live page\'s links and floors', async ({ page }) => {
      const o = await open(page, theme);
      test.skip(!o, 'UX v1 flag is OFF on this build');
      const around = page.locator('.p9-around');
      await expect(around.getByRole('heading', { level: 2 })).toHaveText('Around the community');
      const links = await around.locator('a[href]').evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      expect(links).toContain('/blindtest?daily=true');
      expect(links.filter((l) => /^\/q\/[^?]+\?daily=quiz$/.test(l)).length, 'the quiz of the day').toBeLessThanOrEqual(1);
      for (const l of links) expect(l).toMatch(/^\/(q\/|u\/|[a-z0-9-]+-quiz$|blindtest\?daily=true$|stats$|create$)/);
      // every panel shown has content; titles are h3 under the section's h2
      for (const p of await around.locator('.ux-panel').all()) {
        await expect(p.locator('h3')).toHaveCount(1);
        expect(await p.locator('.p9-hn').count()).toBeGreaterThan(0);
      }
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const axe = await runAxe(page, { include: '.p9-around' });
      if (axe) expect(axe).toEqual([]);
      expect(o!.writes).toEqual([]);
    });
  });
}

signedInTest.describe('leaderboard signed in (test user, read only)', () => {
  signedInTest.describe.configure({ timeout: 120_000 });
  for (const theme of THEMES) {
    signedInTest(`pins from GET /api/ux-v1/p9/standing, no write (${theme})`, async ({ page }, info) => {
      skipUnlessSignedIn();
      // /api/auth/me fails open (signed out) when auth answers slower than 2.5 s: read it until it answers (GET).
      let me: { profile: { username: string } | null } = { profile: null };
      for (let i = 0; i < 4 && !me.profile; i++) me = await (await page.request.get('/api/auth/me')).json() as typeof me;
      expect(me.profile, 'GET /api/auth/me with the storage state = the test user').not.toBeNull();
      let s: P9Standing = { signedIn: false, me: null, war: null, player: null, creator: null };
      for (let i = 0; i < 4 && !s.signedIn; i++) {
        const r = await page.request.get('/api/ux-v1/p9/standing');
        signedInTest.skip(r.status() === 404, 'UX v1 flag is OFF on this build');
        s = await r.json() as P9Standing;
      }
      expect(s.signedIn).toBe(true);
      expect(s.me?.username).toBe(me.profile!.username);
      // The endpoint's player rank = 1 + profiles with more XP (public rows, anon read).
      if (s.player?.rank) {
        const { count } = await rest<unknown[]>(`profiles?select=id&xp=gt.${s.player.xp}`, true);
        expect(s.player.rank).toBe((count ?? 0) + 1);
      }

      const o = await open(page, theme);
      signedInTest.skip(!o, 'UX v1 flag is OFF on this build');
      const warPin = page.locator('#lb-panel-war .ux-pin');
      await expect(warPin).toHaveClass(/is-you/);
      if (s.war) {
        await expect(warPin).toContainText(`${s.war.fandom} is`);
        await expect(warPin.getByRole('link', { name: `Play for ${s.war.fandom}` })).toHaveAttribute('href', s.war.href);
      } else {
        await expect(warPin).toContainText('Pick your main group in Settings to see your fandom here.');
        await expect(warPin.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
      }
      const cmp = await compareLandmarks(page, widthOf(page), theme, PIN_LANDMARKS);
      await info.attach('landmarks-pin.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches).toEqual([]);

      await tab(page, 'Players').click();
      const playerPin = page.locator('#lb-panel-players .ux-pin.is-you');
      await expect(playerPin.locator('.ux-pin-rk')).toHaveText(s.player?.rank ? `#${s.player.rank.toLocaleString('en-US')}` : '-');
      await expect(playerPin.locator('a.ux-who')).toHaveText(me.profile!.username);
      await expect(playerPin).toContainText(`· ${s.player!.line}`);
      await expect(playerPin.locator('.p9-pin-v')).toHaveText(`${s.player!.xp.toLocaleString('en-US')} XP`);

      await tab(page, 'Creators').click();
      const creatorPin = page.locator('#lb-panel-creators .ux-pin.is-you');
      if (s.creator && s.creator.quizzes > 0) {
        await expect(creatorPin.locator('.p9-pin-v')).toContainText('play');
      } else {
        await expect(creatorPin).toContainText('You have not published a quiz yet.');
        await expect(creatorPin.getByRole('link', { name: 'Create a quiz' })).toHaveAttribute('href', '/create');
      }
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe).toEqual([]);
      expect(o!.api.filter((a) => a.startsWith('GET /api/ux-v1/p9/standing')).length, 'one standing read for the page').toBe(1);
      expect(o!.api.filter((a) => a.includes('/api/ux-v1/p9/') && !a.startsWith('GET '))).toEqual([]);
      expect(o!.writes, 'zero write attempts').toEqual([]);
    });

    signedInTest(`a fan with a main fandom (standing fixture): war, players and creators pins (${theme})`, async ({ page }, info) => {
      skipUnlessSignedIn();
      const fixture: P9Standing = {
        signedIn: true,
        me: { username: 'mingi', href: '/u/mingi', avatar: { src: null, bg: null, fg: null }, accent: 'pink', font: null, bias: 'Han' },
        war: { slug: 'stray-kids', href: '/stray-kids-quiz', fandom: 'STAY', group: 'Stray Kids', rank: 2, points: 1240 },
        player: { rank: 212, xp: 640, line: 'Lv 7 · STAY' },
        creator: { rank: 38, quizzes: 3, plays: 312 },
      };
      const o = await open(page, theme, async (p) => {
        await p.route((u) => u.pathname === '/api/ux-v1/p9/standing', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(fixture) }));
      });
      signedInTest.skip(!o, 'UX v1 flag is OFF on this build');
      const warPin = page.locator('#lb-panel-war .ux-pin.is-you');
      await expect(warPin.locator('.p9-pin-b')).toHaveText('STAY is #2');
      await expect(warPin.locator('.p9-pin-s')).toHaveText('· you added 1,240 points this week');
      const play = warPin.getByRole('link', { name: 'Play for STAY' });
      await expect(play).toHaveAttribute('href', '/stray-kids-quiz');
      await expect(play).toHaveClass(/ux-btn-primary/);
      await expect(warPin.locator('.p9-gav img')).toHaveCount(1); // the group's own photo
      // one filled pink button in view (16.2)
      await expect(page.locator('#lb-panel-war .ux-btn-primary')).toHaveCount(1);
      const w = widthOf(page);
      const cmp = await compareLandmarks(page, w, theme, [
        ...PIN_LANDMARKS,
        // the reference capture ran with a fine pointer (its .btn.sm is 32px); on a touch phone the
        // prototype's own coarse-pointer rule makes it 40px (16.4 "40 min on touch"): height skipped at 390
        { proto: '.btn-primary', impl: '#lb-panel-war .ux-pin .ux-btn-primary', state: 'leaderboard', box: w < 500 ? ['width'] : ['width', 'height'], ...(w < 500 ? { skip: ['height'] } : {}) },
      ]);
      await info.attach('landmarks-pin-fandom.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches).toEqual([]);

      await tab(page, 'Players').click();
      const playerPin = page.locator('#lb-panel-players .ux-pin.is-you');
      await expect(playerPin.locator('.ux-pin-rk')).toHaveText('#212');
      await expect(playerPin.locator('a.ux-who')).toHaveText('mingi');
      await expect(playerPin.locator('a.ux-who')).toHaveClass(/ux-acc-pink/);
      await expect(playerPin).toContainText('· Lv 7 · STAY');
      await expect(playerPin.locator('.p9-pin-v')).toHaveText('640 XP');

      await tab(page, 'Creators').click();
      const creatorPin = page.locator('#lb-panel-creators .ux-pin.is-you');
      await expect(creatorPin.locator('.ux-pin-rk')).toHaveText('#38');
      await expect(creatorPin).toContainText('· 3 quizzes');
      await expect(creatorPin.locator('.p9-pin-v')).toHaveText('312 plays');
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(o!.writes).toEqual([]);
    });
  }
});
