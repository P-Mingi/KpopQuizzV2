import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

import type { Page, Route } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Theme } from './helpers/setup-page';

// P11 notifications page, bell panel and search overlay results (UX v11.2,
// DESIGN-SPEC 15.2 / 16.5 / 16.7 / 17.10 / 17.11), flag ON, at the project width
// (ux-1440 / ux-390), light and dark.
//
// Production-write rules (ORCH): every page is wrapped in guardWrites() (each
// mutating request is answered locally and recorded) and the specs assert the
// recorded payloads (mark read, mark all read, dismiss, mute). /me and /profile
// are never loaded: row clicks are kept on the page (their default is prevented
// before Next's Link sees it), so only the recorded call is checked.
// /notifications signed in: its GET path only reads (auth.getUser on the server;
// GET /api/notifications, GET /api/auth/me in the browser).
//
// Data: the real test user has no notification and no live streak (checked in the
// "real data" cases). The populated states are rendered from a STUBBED
// GET /api/notifications (the prototype's ten sample rows, test fixture only, never
// written anywhere) and a stubbed streak on GET /api/auth/me, with the browser
// clock fixed so Today / Yesterday / Earlier and the ages are stable.
//
// The bell and the overlay content are P11's slot components; until A0 swaps them
// into components/layout/ux-v1/slots.tsx (v11/requests/P11.md item 1) those cases
// skip with that reason.

const env = loadTestEnv();
const here = path.dirname(fileURLToPath(import.meta.url));
const PROTO = JSON.parse(fs.readFileSync(path.resolve(here, '../../../../docs/design/ux-dashboard-v1/v11/reports/P11/proto-styles.json'), 'utf8')) as
  Record<string, Record<string, Record<string, string | number[]>>>;

test.use({ timezoneId: 'Europe/Paris' });

// 26 Sep 2026 15:00 in Paris: the fixture rows are 2h to 7 days older.
const NOW = new Date('2026-09-26T13:00:00Z');
const H = 3_600_000;
const D = 24 * H;
const at = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();

interface Row {
  id: string; user_id: string; type: string; title: string; body: string | null; quiz_id: string | null; quiz_slug: string | null;
  link_url: string | null; is_read: boolean; created_at: string;
}
const U = '00000000-0000-4000-8000-000000000000';
const Q1 = '11111111-1111-4111-8111-111111111111';
const Q2 = '22222222-2222-4222-8222-222222222222';
/** The prototype's NF sample (prototype.html, test fixture only). */
const FIXTURE: Row[] = [
  { id: 'n1', user_id: U, type: 'milestone', title: 'SKZ true or false hit 1,400 plays', body: '37 likes and a 72% average score.', quiz_id: Q1, quiz_slug: 'skz-true-or-false-only-real-stays-pass', link_url: null, is_read: false, created_at: at(2 * H) },
  { id: 'n2', user_id: U, type: 'comment', title: 'quokka_han commented on Guess the BTS member from clues', body: '"The Jin clue is too easy, otherwise perfect." Scored 6/6.', quiz_id: Q2, quiz_slug: 'guess-the-bts-member-from-clues', link_url: null, is_read: false, created_at: at(4 * H) },
  { id: 'n3', user_id: U, type: 'battle_beaten', title: 'blink_edits beat your score', body: '7/8 against your 5/8 on Ultimate BTS era quiz. The rematch link is open 41 more hours.', quiz_id: null, quiz_slug: 'ultimate-bts-era-quiz-only-real-armys-survive', link_url: null, is_read: false, created_at: at(6 * H) },
  { id: 'n4', user_id: U, type: 'badge_earned', title: 'New badge: Debater II', body: 'You voted in 10 daily debates. Pin it on your passport.', quiz_id: null, quiz_slug: null, link_url: '/me', is_read: false, created_at: at(6 * H + 60_000) },
  { id: 'n5', user_id: U, type: 'new_follower', title: 'moa_bloom started following you', body: 'Lv 3 · MOA. They will see your new quizzes.', quiz_id: null, quiz_slug: null, link_url: '/u/moa_bloom', is_read: true, created_at: at(26 * H) },
  { id: 'n6', user_id: U, type: 'cheer', title: 'stay4life cheered your 8/10', body: 'On the Blindtest of the day. Cheers give you both +5 XP.', quiz_id: null, quiz_slug: null, link_url: '/blindtest', is_read: true, created_at: at(27 * H) },
  { id: 'n7', user_id: U, type: 'streak_milestone', title: '7-day streak', body: 'A week without missing a day. The next milestone is 14.', quiz_id: null, quiz_slug: null, link_url: null, is_read: true, created_at: at(28 * H) },
  { id: 'n8', user_id: U, type: 'followed_new_quiz', title: 'quizmaster_yj published BTS discography challenge', body: 'Classic · Medium · 8 questions.', quiz_id: null, quiz_slug: null, link_url: '/q/bts-discography-challenge', is_read: true, created_at: at(29 * H) },
  { id: 'n9', user_id: U, type: 'group_mastered', title: 'Stray Kids: 62% mastered', body: 'Play the 11 quizzes you have not tried to master the group.', quiz_id: null, quiz_slug: null, link_url: '/stray-kids-quiz', is_read: true, created_at: at(5 * D) },
  { id: 'n10', user_id: U, type: 'admin_dm', title: 'From the KpopQuiz team: the Knowledge Report 2026 is out', body: 'How 60k plays rank every group, generation and fandom.', quiz_id: null, quiz_slug: null, link_url: '/data', is_read: true, created_at: at(7 * D) },
];
const MORE: Row[] = [
  { id: 'n11', user_id: U, type: 'rating', title: '3 new reactions on your quiz', body: 'On "SKZ true or false".', quiz_id: Q1, quiz_slug: 'skz-true-or-false-only-real-stays-pass', link_url: null, is_read: true, created_at: at(9 * D) },
];

async function fulfillJson(route: Route, body: unknown): Promise<void> {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

interface Stubs { reads: string[] }

/** Serves the fixture on GET /api/notifications (limit / offset honoured) and a
 *  streak on GET /api/auth/me (the real profile with the streak fields replaced).
 *  Registered AFTER guardWrites, so it answers first. A mark-read / dismiss call is
 *  applied to the fixture (like the server would) and then falls back to the guard,
 *  which records it and answers locally: nothing is ever sent. */
async function stubNotifications(page: Page, opts: { more?: boolean; streak?: 'saved' | 'at_risk' | null } = {}): Promise<Stubs> {
  const stubs: Stubs = { reads: [] };
  let rows: Row[] = (opts.more ? [...FIXTURE, ...MORE] : FIXTURE).map((r) => ({ ...r }));
  await page.route((u) => u.pathname === '/api/notifications' || u.pathname === '/api/notifications/mark-read', async (route) => {
    const req = route.request();
    const u = new URL(req.url());
    if (req.method() === 'POST' && u.pathname.endsWith('/mark-read')) {
      const body = JSON.parse(req.postData() || '{}') as { ids?: string[] };
      rows = rows.map((r) => (!body.ids || body.ids.includes(r.id) ? { ...r, is_read: true } : r));
      await route.fallback();
      return;
    }
    if (req.method() === 'DELETE') {
      const body = JSON.parse(req.postData() || '{}') as { id?: string };
      rows = rows.filter((r) => r.id !== body.id);
      await route.fallback();
      return;
    }
    if (req.method() !== 'GET' || u.pathname !== '/api/notifications') { await route.fallback(); return; }
    stubs.reads.push(u.search);
    const limit = Number(u.searchParams.get('limit') ?? '10');
    const offset = Number(u.searchParams.get('offset') ?? '0');
    // First page: the ten sample rows (+ hasMore when there is a second page).
    const first = rows.filter((r) => !MORE.some((m) => m.id === r.id));
    const pageRows = offset === 0 ? first.slice(0, limit) : rows.slice(offset, offset + limit);
    const hasMore = offset === 0 ? Boolean(opts.more) && limit >= first.length : false;
    await fulfillJson(route, { notifications: pageRows, unreadCount: rows.filter((r) => !r.is_read).length, hasMore });
  });
  if (opts.streak !== undefined) {
    await page.route((u) => u.pathname === '/api/auth/me', async (route) => {
      const res = await route.fetch();
      const body = (await res.json()) as { profile: Record<string, unknown> | null };
      if (body.profile) {
        if (opts.streak === 'saved') Object.assign(body.profile, { daily_streak: 13, last_daily_date: '2026-09-26' });
        else if (opts.streak === 'at_risk') Object.assign(body.profile, { daily_streak: 12, last_daily_date: '2026-09-25' });
        else Object.assign(body.profile, { daily_streak: 0, last_daily_date: null });
      }
      await route.fulfill({ response: res, json: body });
    });
  }
  return stubs;
}

async function setup(page: Page, theme: Theme, clock = true): Promise<StubbedCall[]> {
  await preparePage(page, theme);
  if (clock) await page.clock.setFixedTime(NOW);
  return guardWrites(page, env.supabaseUrl);
}

/** Keeps a click on the page: Next's Link sees defaultPrevented and does not
 *  navigate (a row may point at /me, which must never load signed in). */
async function holdNavigation(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest('a[href]')) e.preventDefault(); }, true);
  });
}

async function openNotifications(page: Page): Promise<boolean> {
  const res = await page.goto('/notifications');
  if (!res || !(await hasShell(page))) return false;
  if ((await page.locator('.p11-notifs').count()) === 0) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await waitHydrated(page);
  return true;
}

// ---------------------------------------------------------------------------
// Prototype comparison: computed styles and boxes (v11/reports/P11/proto-styles.json)
// ---------------------------------------------------------------------------

interface Lm { proto: string; impl: string; box?: boolean; skip?: string[] }
const STYLE_PROPS = ['padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-top-color', 'border-radius',
  'background-color', 'color', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap', 'text-align', 'white-space', 'display'];
const TEXT_W = ['width'];

const NOTIF_LMS: Lm[] = [
  { proto: '#notifs .ph', impl: '.p11-nh', box: true },
  { proto: '#notifs .ph h1', impl: '.p11-nh h1', box: true, skip: ['border-radius'] },
  { proto: '#n-sub', impl: '.p11-sub', box: true },
  { proto: '#notifs .ph .lnk', impl: '.p11-nh .ux-lnk', box: true },
  { proto: '#notifs .seg', impl: '.p11-seg', box: true },
  { proto: '#notifs .seg button.on', impl: '.p11-seg [aria-pressed="true"]', box: true },
  { proto: '#notifs .seg button:not(.on)', impl: '.p11-seg [aria-pressed="false"]', box: true },
  { proto: '#notifs .streakrow', impl: '.p11-streak', box: true },
  { proto: '#notifs .streakrow > .ico', impl: '.p11-streak > .ux-ico', box: true },
  { proto: '#notifs .streakrow .grow', impl: '.p11-streak-g', box: true },
  { proto: '#notifs .streakrow b', impl: '.p11-streak-g b', skip: TEXT_W },
  { proto: '#notifs .streakrow .grow .muted', impl: '.p11-streak-g span', box: true },
  { proto: '.ngroup', impl: '.p11-ngroup', box: true },
  { proto: '.nrow.u', impl: '.p11-nrow.is-unread', box: true },
  { proto: '.nrow:not(.u)', impl: '.p11-nrow:not(.is-unread)', box: true },
  { proto: '.nrow.u .ud', impl: '.p11-nrow.is-unread .p11-ud', box: true },
  { proto: '.nrow:not(.u) .ud', impl: '.p11-nrow:not(.is-unread) .p11-ud', box: true },
  { proto: '.nrow .ni', impl: '.p11-ni', box: true },
  { proto: '.nrow .ni .ico', impl: '.p11-ni .ux-ico', box: true },
  { proto: '.nrow .grow', impl: '.p11-grow', box: true },
  { proto: '.nrow.u .t', impl: '.p11-nrow.is-unread .p11-t', box: true },
  { proto: '.nrow:not(.u) .t', impl: '.p11-nrow:not(.is-unread) .p11-t', box: true },
  { proto: '.nrow .b', impl: '.p11-b', box: true },
  { proto: '.nrow .tm', impl: '.p11-tm', box: true },
  // the retention line says the real rule (read, 60 days: cron notification-prune), so its text is longer
  { proto: '#notifs .help', impl: '.p11-foot', box: true, skip: ['margin-top'] },
  { proto: '#notifs .help .lnk', impl: '.p11-foot .ux-lnk', skip: TEXT_W },
];
const NOTIF_RISK_LMS: Lm[] = [
  { proto: '#notifs .streakrow', impl: '.p11-streak', box: true },
  { proto: '#notifs .streakrow .btn', impl: '.p11-streak .ux-btn', skip: TEXT_W },
];
const BELL_LMS: Lm[] = [
  { proto: '#bellpop', impl: '.ux-bellpop', box: true },
  // A0's frame: gap 12px (prototype none) has no effect with space-between
  { proto: '#bellpop .pop-h', impl: '.ux-bellpop .ux-pop-h', box: true, skip: ['gap'] },
  { proto: '#bellpop .pop-h b', impl: '.ux-bellpop .ux-pop-h b', box: true },
  { proto: '.brow', impl: '.p11-brow', box: true },
  { proto: '.brow .u:not(.r)', impl: '.p11-bu:not(.is-read)', box: true },
  { proto: '.brow .u.r', impl: '.p11-bu.is-read', box: true },
  { proto: '.brow > span:last-child', impl: '.p11-bb', box: true },
  { proto: '.brow .t', impl: '.p11-bt', box: true },
  { proto: '.brow .t b', impl: '.p11-bt b', skip: ['display'] },
  { proto: '.brow .tm', impl: '.p11-btm', skip: TEXT_W },
  { proto: '#bellpop .msep', impl: '.ux-bellpop .ux-msep', box: true },
  { proto: '#bellpop .mi', impl: '.ux-bellpop .ux-mi', box: true },
];
const BELL_LINK_LM: Lm = { proto: '#bellpop .pop-h .lnk', impl: '.ux-bellpop .ux-pop-h .ux-lnk', box: true };
const SEARCH_LMS: Lm[] = [
  { proto: '.sov-l', impl: '.p11-sres .ux-sov-l', box: true },
  { proto: '.srow.act', impl: '.p11-sres .ux-srow.is-active', box: true },
  { proto: '.srow:not(.act)', impl: '.p11-sres .ux-srow:not(.is-active)', box: true },
  { proto: '.srow .th', impl: '.p11-sres .ux-srow-th:not(.is-sq)', box: true },
  { proto: '.srow > span:not(.th)', impl: '.p11-sres .p11-st', box: true },
  // nowrap keeps "BTS · 2.4k plays" on one line (the prototype subs are short); same render in the reference states
  { proto: '.srow small', impl: '.p11-sres .ux-srow small', box: true, skip: ['white-space'] },
];
const SEARCH_BTS_LMS: Lm[] = [
  { proto: '.sov-l', impl: '.p11-sres .ux-sov-l', box: true },
  { proto: '.srow.act', impl: '.p11-sres .ux-srow.is-active', box: true },
  { proto: '.srow .th', impl: '.p11-sres .ux-srow-th:not(.is-sq)', box: true },
  { proto: '.srow .th.sq', impl: '.p11-sres .ux-srow-th.is-sq', skip: ['background-color'] },
];
const SEARCH_NONE_LMS: Lm[] = [
  { proto: '#sres .empty', impl: '.p11-sempty', box: true },
  { proto: '#sres .empty b', impl: '.p11-sempty b', skip: TEXT_W },
];

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function sameValue(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  const px = /^-?[\d.]+px$/;
  return px.test(a.trim()) && px.test(b.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) <= 0.6;
}

interface Diff { lm: string; prop: string; expected: string; actual: string }

/** Computed styles (exact, 0.6px for rounding) and boxes (x, y, w, h within 2px,
 *  C1 criterion) of each landmark vs the prototype state. */
async function compareProto(page: Page, theme: Theme, state: string, lms: Lm[]): Promise<{ checked: number; missing: string[]; diffs: Diff[] }> {
  const ref = PROTO[`${widthOf(page)}-${theme}-${state}`];
  if (!ref) throw new Error(`no prototype capture for ${widthOf(page)}-${theme}-${state}`);
  const got = await page.evaluate(({ sels, props }) => {
    const o: Record<string, Record<string, string | number[]> | null> = {};
    for (const s of sels) {
      const el = Array.from(document.querySelectorAll<HTMLElement>(s)).find((e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed');
      if (!el) { o[s] = null; continue; }
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      o[s] = { ...Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])), width: cs.width, height: cs.height, _box: [r.x, r.y + window.scrollY, r.width, r.height] };
    }
    return o;
  }, { sels: lms.map((l) => l.impl), props: STYLE_PROPS });
  const diffs: Diff[] = []; const missing: string[] = []; let checked = 0;
  for (const l of lms) {
    const e = ref[l.proto]; const a = got[l.impl];
    if (!e) continue;
    if (!a) { missing.push(l.impl); continue; }
    checked++;
    for (const p of STYLE_PROPS) {
      if (l.skip?.includes(p)) continue;
      const ev = e[p]; const av = a[p];
      if (typeof ev !== 'string' || typeof av !== 'string') continue;
      if (p === 'border-top-color' && parseFloat(String(e['border-top-width'] ?? '0')) === 0 && parseFloat(String(a['border-top-width'] ?? '0')) === 0) continue;
      if (!sameValue(ev, av)) diffs.push({ lm: l.impl, prop: p, expected: ev, actual: av });
    }
    if (l.box) {
      const eb = e._box as number[]; const ab = a._box as number[];
      const names = ['x', 'y', 'w', 'h'];
      for (let i = 0; i < 4; i++) {
        if (l.skip?.includes('width') && i === 2) continue;
        if (Math.abs((eb[i] ?? 0) - (ab[i] ?? 0)) > 2) diffs.push({ lm: l.impl, prop: `box.${names[i]}`, expected: String(eb[i]), actual: String(Math.round((ab[i] ?? 0) * 10) / 10) });
      }
    }
  }
  return { checked, missing, diffs };
}

// ---------------------------------------------------------------------------
// Guest
// ---------------------------------------------------------------------------

test.describe('P11 guest', () => {
  test('/notifications still sends a guest to /login', async ({ page }) => {
    await setup(page, 'light', false);
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/login/);
  });

  test('the search endpoint: flag gated, public catalog only, no user field', async ({ page, request }) => {
    await setup(page, 'light', false);
    await page.goto('/');
    const on = await hasShell(page);
    const r = await request.get('/api/ux-v1/p11/search?q=bts');
    if (!on) { expect(r.status()).toBe(404); return; }
    expect(r.status()).toBe(200);
    const d = (await r.json()) as Record<string, unknown> & { groups: { href: string }[]; quizzes: { href: string }[]; songs: { href: string }[] };
    expect(Object.keys(d).sort()).toEqual(['degraded', 'groups', 'mode', 'q', 'quizzes', 'songs']);
    expect(d.groups.every((g) => /^\/[a-z0-9-]+-quiz$/.test(g.href))).toBe(true);
    expect(d.quizzes.every((q) => q.href.startsWith('/q/'))).toBe(true);
    expect(d.songs.every((s) => s.href === '/blindtest' || s.href.startsWith('/blindtest/group-'))).toBe(true);
    const text = JSON.stringify(d);
    for (const k of ['email', 'user_id', 'creator', 'profile', 'username']) expect(text).not.toContain(`"${k}"`);
    const pop = (await (await request.get('/api/ux-v1/p11/search')).json()) as { mode: string; groups: unknown[]; quizzes: unknown[] };
    expect(pop.mode).toBe('popular');
    expect(pop.groups.length).toBe(4);
    expect(pop.quizzes.length).toBe(3);
  });

  for (const theme of THEMES) {
    test.describe(`search overlay ${theme}`, () => {
      async function openOverlay(page: Page): Promise<boolean> {
        await page.goto('/');
        if (!(await hasShell(page))) return false;
        await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
        await waitHydrated(page);
        await page.locator('.ux-nav-r .ux-sbtn').click();
        await expect(page.locator('#ux-sov')).toBeVisible();
        await page.locator('#ux-sov .ux-sov-b > *').first().waitFor({ timeout: 20_000 });
        if ((await page.locator('#ux-sov [data-p11="search"]').count()) === 0) return false;
        await page.locator('#ux-sov .p11-sres .ux-srow').first().waitFor({ timeout: 30_000 });
        return true;
      }

      test('popular lists, rows, prototype styles, axe', async ({ page }) => {
        const writes = await setup(page, theme, false);
        test.skip(!(await openOverlay(page)), 'flag off, or the P11 SearchResults slot is not wired yet (requests/P11.md item 1)');
        const box = page.locator('#ux-sov .p11-sres');
        await expect(box.locator('.ux-sov-l')).toHaveText(['Popular groups', 'Most played quizzes']);
        const groups = box.locator('ul').nth(0).locator('.ux-srow');
        const quizzes = box.locator('ul').nth(1).locator('.ux-srow');
        await expect(groups).toHaveCount(4);
        await expect(quizzes).toHaveCount(3);
        for (const href of await groups.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) expect(href).toMatch(/^\/[a-z0-9-]+-quiz$/);
        for (const href of await quizzes.evaluateAll((els) => els.map((e) => e.getAttribute('href')))) expect(href).toMatch(/^\/q\/[a-z0-9-]+$/);
        await expect(groups.first()).toHaveClass(/is-active/);
        await expect(groups.first().locator('small')).toHaveText(/^\d+ quizz?(es)?$|^1 quiz$/);
        const r = await compareProto(page, theme, 'search', SEARCH_LMS);
        expect(r.missing, 'landmarks present').toEqual([]);
        expect(r.diffs, JSON.stringify(r.diffs, null, 1)).toEqual([]);
        const axe = await runAxe(page, { include: '#ux-sov' });
        if (axe) expect(axe, JSON.stringify(axe)).toEqual([]);
        expect(await basicA11y(page, '#ux-sov')).toEqual([]);
        expect(await horizontalOverflow(page)).toBe(0);
        expect(writes).toEqual([]);
      });

      test('typing: groups, quizzes of the group, songs; arrows; Enter opens the highlighted row', async ({ page }) => {
        test.slow(); // it navigates: a cold dev server compiles the target page first
        const writes = await setup(page, theme, false);
        test.skip(!(await openOverlay(page)), 'flag off, or the P11 SearchResults slot is not wired yet');
        await page.locator('#ux-sq').fill('bts');
        const box = page.locator('#ux-sov .p11-sres');
        await expect(box.locator('.ux-sov-l').first()).toHaveText('Groups', { timeout: 20_000 });
        await expect(box.locator('.ux-sov-l')).toHaveText(['Groups', 'Quizzes', 'Songs in the blindtest']);
        await expect(box.locator('ul').nth(0).locator('.ux-srow').first()).toHaveAttribute('href', '/bts-quiz');
        const quizSubs = await box.locator('ul').nth(1).locator('small').allTextContents();
        expect(quizSubs.length).toBeGreaterThan(0);
        expect(quizSubs.every((s) => /^BTS · (New|[\d.,]+k? plays)$/.test(s)), quizSubs.join('|')).toBe(true);
        await expect(box.locator('ul').nth(2).locator('.ux-srow').first()).toHaveAttribute('href', '/blindtest/group-bts');
        await expect(box.locator('[role="status"]')).toHaveText(/1 group, \d quizz?(es)? and \d songs?/);
        const r = await compareProto(page, theme, 'search-bts', SEARCH_BTS_LMS);
        expect(r.diffs, JSON.stringify(r.diffs, null, 1)).toEqual([]);
        // ArrowDown from the field moves focus into the rows; ArrowUp from the first row goes back.
        await page.locator('#ux-sq').focus();
        await page.keyboard.press('ArrowDown');
        await expect(box.locator('.ux-srow').first()).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(box.locator('.ux-srow').nth(1)).toBeFocused();
        await expect(box.locator('.ux-srow').nth(1)).toHaveClass(/is-active/);
        await page.keyboard.press('ArrowUp');
        await page.keyboard.press('ArrowUp');
        await expect(page.locator('#ux-sq')).toBeFocused();
        // Enter in the field opens the highlighted (first) row and closes the overlay.
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(/\/bts-quiz$/, { timeout: 30_000 });
        await expect(page.locator('#ux-sov')).toHaveCount(0);
        expect(writes).toEqual([]);
      });

      test('no results: a real empty state, Enter goes to the full search page', async ({ page }) => {
        test.slow();
        await setup(page, theme, false);
        test.skip(!(await openOverlay(page)), 'flag off, or the P11 SearchResults slot is not wired yet');
        await page.locator('#ux-sq').fill('zzzzqx');
        const empty = page.locator('#ux-sov .p11-sempty');
        await expect(empty).toBeVisible({ timeout: 20_000 });
        await expect(empty.locator('b')).toHaveText('No results for "zzzzqx"');
        await expect(empty).toContainText('Try a group name, like Stray Kids, or a song title.');
        const r = await compareProto(page, theme, 'search-none', SEARCH_NONE_LMS);
        expect(r.diffs, JSON.stringify(r.diffs, null, 1)).toEqual([]);
        await page.locator('#ux-sq').press('Enter');
        await expect(page).toHaveURL(/\/search\?q=zzzzqx$/, { timeout: 30_000 });
      });

      test('a click on a row closes the overlay; Escape closes and returns focus', async ({ page }) => {
        test.slow();
        await setup(page, theme, false);
        test.skip(!(await openOverlay(page)), 'flag off, or the P11 SearchResults slot is not wired yet');
        await page.keyboard.press('Escape');
        await expect(page.locator('#ux-sov')).toHaveCount(0);
        await expect(page.locator('.ux-nav-r .ux-sbtn')).toBeFocused();
        await page.locator('.ux-nav-r .ux-sbtn').click();
        const first = page.locator('#ux-sov .p11-sres .ux-srow').first();
        await first.waitFor();
        const href = await first.getAttribute('href');
        await first.click();
        await expect(page.locator('#ux-sov')).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`${href}$`), { timeout: 30_000 });
      });
    });
  }
});

// ---------------------------------------------------------------------------
// Signed in (the parity test user, read only)
// ---------------------------------------------------------------------------

signedInTest.describe('P11 signed in', () => {
  signedInTest('real data: the test user\'s own notifications, read only', async ({ page }) => {
    skipUnlessSignedIn();
    const writes = await setup(page, 'light', false);
    const reads: string[] = [];
    page.on('request', (r) => { if (r.url().includes('/api/notifications')) reads.push(`${r.method()} ${new URL(r.url()).pathname}${new URL(r.url()).search}`); });
    const res = await page.goto('/notifications');
    expect(res?.status()).toBe(200);
    if (!(await hasShell(page))) {
      // flag off: the live center, unchanged
      await expect(page.locator('h1')).toContainText('Notifications');
      await expect(page.locator('.p11-notifs')).toHaveCount(0);
      return;
    }
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await expect(page.locator('.p11-notifs h1')).toHaveText('Notifications');
    await expect(page.locator('.p11-sub')).toHaveText(/^(\d[\d,]* unread|All caught up)$/, { timeout: 30_000 });
    const api = (await (await page.request.get('/api/notifications?limit=50')).json()) as { notifications: unknown[]; unreadCount: number };
    await expect(page.locator('.p11-sub')).toHaveText(api.unreadCount > 0 ? `${api.unreadCount} unread` : 'All caught up');
    if (api.notifications.length === 0) await expect(page.locator('.p11-empty b')).toHaveText('Nothing here yet');
    else await expect(page.locator('.p11-nrow')).toHaveCount(api.notifications.length);
    expect(reads).toContain('GET /api/notifications?limit=50');
    expect(await basicA11y(page)).toEqual([]);
    expect(writes).toEqual([]);
  });

  for (const theme of THEMES) {
    signedInTest.describe(`notifications page ${theme} (stubbed rows)`, () => {
      signedInTest('layout and styles match the prototype (streak saved)', async ({ page }) => {
        skipUnlessSignedIn();
        const writes = await setup(page, theme);
        await stubNotifications(page, { streak: 'saved' });
        test.skip(!(await openNotifications(page)), 'flag off');
        await expect(page.locator('.p11-sub')).toHaveText('4 unread');
        await expect(page.locator('.p11-ngroup')).toHaveText(['Today', 'Yesterday', 'Earlier']);
        await expect(page.locator('.p11-nrow')).toHaveCount(10);
        await expect(page.locator('.p11-nrow.is-unread')).toHaveCount(4);
        await expect(page.locator('.p11-tm > [aria-hidden="true"]')).toHaveText(['2h', '4h', '6h', '6h', '1d', '1d', '1d', '1d', '5d', '1w']);
        await expect(page.locator('.p11-streak')).toHaveClass(/is-saved/);
        await expect(page.locator('.p11-streak-g b')).toHaveText('Streak saved: 13 days');
        await expect(page.locator('.p11-streak-g span')).toHaveText('Come back tomorrow to make it 14.');
        await expect(page.locator('.p11-foot')).toHaveText('Read notifications older than 60 days are cleared. Notification settings');
        await expect(page.locator('.p11-foot a')).toHaveAttribute('href', '/settings');
        // targets: the live card rule (link_url, else /q/<slug>); a row without one is not a link
        const hrefs = await page.locator('.p11-nrow').evaluateAll((els) => els.map((e) => (e.tagName === 'A' ? e.getAttribute('href') : e.tagName.toLowerCase())));
        expect(hrefs).toEqual(['/q/skz-true-or-false-only-real-stays-pass', '/q/guess-the-bts-member-from-clues', '/q/ultimate-bts-era-quiz-only-real-armys-survive', '/me',
          '/u/moa_bloom', '/blindtest', 'div', '/q/bts-discography-challenge', '/stray-kids-quiz', '/data']);
        const r = await compareProto(page, theme, 'notifications', NOTIF_LMS);
        expect(r.missing, 'landmarks present').toEqual([]);
        expect(r.diffs, JSON.stringify(r.diffs, null, 1)).toEqual([]);
        const axe = await runAxe(page, { exclude: ['.ux-foot'] });
        if (axe) expect(axe, JSON.stringify(axe)).toEqual([]);
        expect(await basicA11y(page)).toEqual([]);
        expect(await horizontalOverflow(page)).toBe(0);
        expect(writes).toEqual([]);
      });

      signedInTest('streak at risk: the real rule and the daily link', async ({ page }) => {
        skipUnlessSignedIn();
        await setup(page, theme);
        await stubNotifications(page, { streak: 'at_risk' });
        test.skip(!(await openNotifications(page)), 'flag off');
        await expect(page.locator('.p11-streak')).toHaveClass(/is-at_risk/);
        await expect(page.locator('.p11-streak-g b')).toHaveText('Your 12-day streak ends in 11h 0m');
        await expect(page.locator('.p11-streak-g span')).toHaveText('Play the daily quiz or the daily blindtest to keep it.');
        await expect(page.locator('.p11-streak .ux-btn')).toHaveAttribute('href', '/daily');
        const r = await compareProto(page, theme, 'notifications-risk', NOTIF_RISK_LMS);
        expect(r.diffs, JSON.stringify(r.diffs, null, 1)).toEqual([]);
      });

      signedInTest('no streak: no row (min-gate)', async ({ page }) => {
        skipUnlessSignedIn();
        await setup(page, theme);
        await stubNotifications(page, { streak: null });
        test.skip(!(await openNotifications(page)), 'flag off');
        await expect(page.locator('.p11-nrow').first()).toBeVisible();
        await expect(page.locator('.p11-streak')).toHaveCount(0);
      });
    });
  }

  signedInTest('filters, mark read on open, mark all read, row menu (dismiss, mute), load more: payloads on stubs', async ({ page }) => {
    skipUnlessSignedIn();
    signedInTest.slow(); // one long walk through every control
    const writes = await setup(page, 'light');
    const stubs = await stubNotifications(page, { more: true, streak: 'saved' });
    test.skip(!(await openNotifications(page)), 'flag off');
    await holdNavigation(page);
    const seg = page.locator('.p11-seg');
    await expect(seg).toHaveAttribute('role', 'group');
    await expect(seg.locator('button')).toHaveText(['All', 'Your quizzes', 'Social', 'Achievements']);
    // Filters (client side, the live categories)
    await seg.getByRole('button', { name: 'Social' }).click();
    await expect(seg.getByRole('button', { name: 'Social' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.p11-t')).toHaveText([/blink_edits beat your score/, /moa_bloom started following you/, /stay4life cheered your 8\/10/]);
    await seg.getByRole('button', { name: 'Your quizzes' }).click();
    await expect(page.locator('.p11-t')).toHaveText([/SKZ true or false hit 1,400 plays/, /quokka_han commented/]);
    await seg.getByRole('button', { name: 'Achievements' }).click();
    await expect(page.locator('.p11-t')).toHaveText([/New badge: Debater II/, /7-day streak/, /Stray Kids: 62% mastered/]);
    await seg.getByRole('button', { name: 'All' }).click();
    await expect(page.locator('.p11-nrow')).toHaveCount(10);

    // Opening an unread row marks it read (POST mark-read { ids: [id] }), the count follows
    await page.locator('.p11-nrow').first().click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ method: 'POST', body: JSON.stringify({ ids: ['n1'] }) });
    expect(new URL(writes[0]!.url).pathname).toBe('/api/notifications/mark-read');
    await expect(page.locator('.p11-nrow').first()).not.toHaveClass(/is-unread/);
    await expect(page.locator('.p11-sub')).toHaveText('3 unread');

    // Row menu: Mark as read (unread row), keyboard reachable, Escape returns focus
    const row2 = page.locator('.p11-nli').nth(1);
    await row2.locator('.p11-nrow').focus();
    await page.keyboard.press('Tab');
    await expect(row2.locator('.p11-more')).toBeFocused();
    await page.keyboard.press('Enter');
    const menu = page.locator('.p11-rowpop[role="menu"]:not([hidden])');
    await expect(menu).toBeVisible();
    await expect(menu.locator('[role="menuitem"]')).toHaveText(['Mark as read', 'Mute this quiz', 'Dismiss']);
    await expect(menu.locator('[role="menuitem"]').first()).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(row2.locator('.p11-more')).toBeFocused();
    await row2.locator('.p11-more').click();
    await page.locator('.p11-rowpop:not([hidden]) [role="menuitem"]', { hasText: 'Mark as read' }).click();
    await expect.poll(() => writes.length).toBe(2);
    expect(writes[1]).toMatchObject({ method: 'POST', body: JSON.stringify({ ids: ['n2'] }) });
    await expect(page.locator('.p11-sub')).toHaveText('2 unread');

    // Mute this quiz (POST prefs { muteQuiz }): every loaded row of that quiz leaves the list
    await row2.locator('.p11-more').click();
    await page.locator('.p11-rowpop:not([hidden]) [role="menuitem"]', { hasText: 'Mute this quiz' }).click();
    await expect.poll(() => writes.length).toBe(3);
    expect(writes[2]).toMatchObject({ method: 'POST', body: JSON.stringify({ muteQuiz: Q2 }) });
    expect(new URL(writes[2]!.url).pathname).toBe('/api/notifications/prefs');
    await expect(page.locator('.p11-nrow')).toHaveCount(9);
    await expect(page.locator('[data-p11-row="n2"]')).toHaveCount(0);

    // Dismiss (DELETE { id }), focus moves to the row that takes its place
    const blink = page.locator('.p11-nli', { has: page.locator('[data-p11-row="n3"]') });
    await blink.locator('.p11-more').click();
    await page.locator('.p11-rowpop:not([hidden]) [role="menuitem"]', { hasText: 'Dismiss' }).click();
    await expect.poll(() => writes.length).toBe(4);
    expect(writes[3]).toMatchObject({ method: 'DELETE', body: JSON.stringify({ id: 'n3' }) });
    await expect(page.locator('[data-p11-row="n3"]')).toHaveCount(0);
    await expect(page.locator('[data-p11-row="n4"]')).toBeFocused();
    await expect(page.locator('.p11-sub')).toHaveText('1 unread');

    // Mark all read (POST mark-read {})
    await page.locator('.p11-nh').getByRole('button', { name: 'Mark all read' }).click();
    await expect.poll(() => writes.length).toBe(5);
    expect(writes[4]).toMatchObject({ method: 'POST', body: '{}' });
    await expect(page.locator('.p11-nrow.is-unread')).toHaveCount(0);
    await expect(page.locator('.p11-sub')).toHaveText('All caught up');
    await expect(page.locator('.p11-nh').getByRole('button', { name: 'Mark all read' })).toHaveCount(0);
    await expect(page.getByTestId('ux-toast')).toHaveText('All marked as read');

    // Load more (GET ...&offset=<loaded rows>)
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect(page.locator('[data-p11-row="n11"]')).toBeVisible();
    expect(stubs.reads).toContain('?limit=50&offset=8');
    await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
    expect(writes).toHaveLength(5);
  });

  for (const theme of THEMES) {
    signedInTest(`bell panel ${theme}: latest 6, styles, open a row, See all`, async ({ page }) => {
      skipUnlessSignedIn();
      const writes = await setup(page, theme);
      await stubNotifications(page, { streak: 'saved' });
      await page.goto('/');
      test.skip(!(await hasShell(page)), 'flag off');
      await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
      await waitHydrated(page);
      const trigger = page.locator('.ux-nav-r button[aria-label^="Notifications"]');
      await expect(trigger).toHaveAttribute('aria-label', 'Notifications, 4 unread', { timeout: 20_000 });
      await trigger.click();
      const pop = page.locator('.ux-bellpop');
      await expect(pop).toBeVisible();
      test.skip((await pop.locator('[data-p11="bell"]').count()) === 0, 'the P11 BellPanel slot is not wired yet (requests/P11.md item 1)');
      const rows = pop.locator('.p11-brow');
      await expect(rows).toHaveCount(6);
      await expect(pop.locator('.p11-bt b')).toHaveCount(4);
      await expect(pop.locator('.p11-btm > [aria-hidden="true"]')).toHaveText(['2h ago', '4h ago', '6h ago', '6h ago', '1d ago', '1d ago']);
      const lms = (await pop.locator('.ux-pop-h .ux-lnk').count()) ? [...BELL_LMS, BELL_LINK_LM] : BELL_LMS;
      const r = await compareProto(page, theme, 'bell', lms);
      expect(r.missing, 'landmarks present').toEqual([]);
      expect(r.diffs, JSON.stringify(r.diffs, null, 1)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-bellpop' });
      if (axe) expect(axe, JSON.stringify(axe)).toEqual([]);
      expect(await basicA11y(page, '.ux-bellpop')).toEqual([]);
      // Opening a row marks it read and closes the panel (focus back on the bell)
      await holdNavigation(page);
      await rows.first().click();
      await expect.poll(() => writes.length).toBe(1);
      expect(writes[0]).toMatchObject({ method: 'POST', body: JSON.stringify({ ids: ['n1'] }) });
      await expect(pop).toBeHidden();
      await expect(trigger).toHaveAttribute('aria-label', 'Notifications, 3 unread');
      await expect(trigger).toBeFocused();
      // Reopen: the row stays read; Escape closes and returns focus
      await trigger.click();
      await expect(pop.locator('.p11-bt b')).toHaveCount(3);
      await page.keyboard.press('Escape');
      await expect(pop).toBeHidden();
      await expect(trigger).toBeFocused();
      expect(writes).toHaveLength(1);
    });
  }

  signedInTest('bell: Mark all read in the header (A0 request 2) sets every row read', async ({ page }) => {
    skipUnlessSignedIn();
    const writes = await setup(page, 'light');
    await stubNotifications(page, { streak: 'saved' });
    await page.goto('/');
    test.skip(!(await hasShell(page)), 'flag off');
    await waitHydrated(page);
    const trigger = page.locator('.ux-nav-r button[aria-label^="Notifications"]');
    await expect(trigger).toHaveAttribute('aria-label', 'Notifications, 4 unread', { timeout: 20_000 });
    await trigger.click();
    const pop = page.locator('.ux-bellpop');
    await expect(pop).toBeVisible();
    test.skip((await pop.locator('[data-p11="bell"]').count()) === 0, 'the P11 BellPanel slot is not wired yet');
    const link = pop.locator('.ux-pop-h').getByRole('button', { name: 'Mark all read' });
    test.skip((await link.count()) === 0, 'A0 has not added Mark all read to the bell header yet (requests/P11.md item 2)');
    await pop.locator('.p11-brow').first().waitFor();
    await link.click();
    await expect.poll(() => writes.length).toBe(1);
    expect(writes[0]).toMatchObject({ method: 'POST', body: '{}' });
    expect(new URL(writes[0]!.url).pathname).toBe('/api/notifications/mark-read');
    await expect(pop.locator('.p11-bt b')).toHaveCount(0);
    await expect(trigger).toHaveAttribute('aria-label', 'Notifications');
  });
});
