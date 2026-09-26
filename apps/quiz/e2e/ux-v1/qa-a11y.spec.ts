import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { hasShell, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';
import { SAMPLE_DRAFT } from '../../../../docs/design/ux-dashboard-v1/v11/reports/P5/sample-draft.mjs';

import type { Page, Route } from '@playwright/test';
import type { AxeFinding } from './helpers/a11y';
import type { Theme } from './helpers/setup-page';

// C3 QA (v11 briefs/C3.md step 2): axe on EVERY state of the flag-on build, on the
// WHOLE document (shell + page + portals), 1440 and 390 (the project), light and
// dark, guest and signed in (read only). 0 serious / critical is the bar. The page
// specs of each owner run axe scoped to their own region; this spec is the
// cross-page pass. Every mutating request is answered locally (guardWrites); /me
// and /profile are never loaded; a link is never followed while signed in.
//
// QA_OUT=<dir>: every result is appended to <dir>/qa-a11y.jsonl (for REPORT.md).

const env = loadTestEnv();
test.describe.configure({ timeout: 150_000 });
signedInTest.describe.configure({ timeout: 150_000 });

const OUT = process.env.QA_OUT;
function record(entry: Record<string, unknown>): void {
  if (!OUT) return;
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(path.join(OUT, 'qa-a11y.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

const QUIZ = '/q/ultimate-bts-era-quiz-only-real-armys-survive';

interface PageCase { id: string; owner: string; path: string; ready: string; pending?: string }
const GUEST_PAGES: PageCase[] = [
  { id: 'home-guest', owner: 'P1', path: '/', ready: '.p1-home' },
  { id: 'quizzes', owner: 'P2', path: '/quizzes', ready: '.ux-main', pending: 'P2 not merged (pre-P2 page inside the shell)' },
  { id: 'groups', owner: 'P3', path: '/groups', ready: '.p3-groups' },
  { id: 'hub-blackpink', owner: 'P3', path: '/blackpink-quiz', ready: '.p3-hub' },
  { id: 'hub-ateez', owner: 'P3', path: '/ateez-quiz', ready: '.p3-hub' },
  { id: 'hub-empty', owner: 'P3', path: '/chungha-quiz', ready: '.p3-hub' },
  { id: 'trivia', owner: 'P3', path: '/blackpink-trivia', ready: '.ux-main' },
  { id: 'quiz', owner: 'P4', path: QUIZ, ready: '.p4-act[data-ready]' },
  { id: 'quiz-tf', owner: 'P4', path: '/q/skz-true-or-false-only-real-stays-pass', ready: '.p4-act[data-ready]' },
  { id: 'quiz-image', owner: 'P4', path: '/q/real-coers-cortis-fans-can-take-this-quiz', ready: '.p4-act[data-ready]' },
  { id: 'create-1', owner: 'P5', path: '/create', ready: '.p5-col[data-ready="1"]' },
  { id: 'blindtest', owner: 'P6', path: '/blindtest', ready: '.p6-hub[data-live]' },
  { id: 'blindtest-mode', owner: 'P6', path: '/blindtest/classic', ready: '.ux-main' },
  { id: 'ranked', owner: 'P7', path: '/blindtest/ranked', ready: '.p7-page' },
  { id: 'community', owner: 'P8', path: '/community', ready: '.p8-page' },
  { id: 'post-blog', owner: 'P8', path: '/community/blog/2', ready: '.p8-post-page' },
  { id: 'post-thread', owner: 'P8', path: '/community/thread/1', ready: '.p8-post-page' },
  { id: 'post-debate', owner: 'P8', path: '/community/debate/2026-09-22', ready: '.p8-post-page' },
  { id: 'leaderboard', owner: 'P9', path: '/leaderboard', ready: '.p9-lb' },
  { id: 'passport', owner: 'P10', path: '/u/testtest', ready: '.p10-passport' },
  { id: 'search-page', owner: 'P11', path: '/search', ready: '.ux-main' },
  { id: 'pt', owner: 'A0', path: '/pt', ready: '.ux-main' },
  { id: 'pt-blindtest', owner: 'A0', path: '/pt/blindtest', ready: '.ux-main' },
  { id: 'pt-leaderboard', owner: 'A0', path: '/pt/leaderboard', ready: '.ux-main' },
  { id: 'articles', owner: 'A0', path: '/articles', ready: '.ux-main' },
  { id: 'article', owner: 'A0', path: '/articles/best-kpop-quiz-sites-2026', ready: '.ux-main' },
  { id: 'stats', owner: 'A0', path: '/stats', ready: '.ux-main' },
];

/** Opens a page, waits for its own root and the shell islands; retries a read that timed out. */
async function openPage(page: Page, c: { path: string; ready: string }): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await page.goto(c.path, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    expect(res?.status(), `GET ${c.path}`).toBe(200);
    if (!(await hasShell(page))) return false;
    const ok = await page.locator(c.ready).first().waitFor({ state: 'attached', timeout: 45_000 }).then(() => true, () => false);
    if (ok) break;
    expect(attempt, `${c.ready} rendered on ${c.path}`).toBeLessThan(3);
  }
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await waitHydrated(page);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  return true;
}

/** Full-document axe + the dependency-free basics; records and returns the serious / critical findings. */
async function check(page: Page, state: string, owner: string, theme: Theme, who: 'guest' | 'signed-in', extra: Record<string, unknown> = {}): Promise<AxeFinding[]> {
  const axe = await runAxe(page);
  expect(axe, 'axe-core resolved (eslint-config-next)').not.toBeNull();
  const basics = await basicA11y(page);
  const findings = axe ?? [];
  // Evidence for an issue: the failing nodes' HTML and axe's own summary (colours, ratio).
  const detail = findings.length === 0 ? [] : await page.evaluate(async (ids) => {
    const w = window as unknown as { axe: { run: (ctx: unknown, o: unknown) => Promise<{ violations: { id: string; nodes: { html: string; target: string[]; failureSummary?: string }[] }[] }> } };
    const r = await w.axe.run(document, { runOnly: { type: 'rule', values: ids }, resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.slice(0, 8).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 220), summary: (n.failureSummary ?? '').replace(/\s+/g, ' ').slice(0, 260) })) }));
  }, [...new Set(findings.map((f) => f.id))]);
  record({ kind: 'axe', state, owner, width: widthOf(page), theme, who, url: new URL(page.url()).pathname + new URL(page.url()).search, serious: findings, detail, basics, ...extra });
  return findings;
}

const fmt = (f: AxeFinding[]): string => f.map((x) => `${x.impact} ${x.id}: ${x.help} @ ${x.nodes.join(' | ')}`).join('\n');

// ---- fixtures for the blindtest game (read-only generate answered locally, as p6.spec) ----
const TITLES = ["God's Menu", 'How You Like That', 'Supernova', 'Hype Boy', 'Dynamite', 'FANCY', 'HOT', 'SHEESH', 'LOVE DIVE', 'Guerrilla'];
const ARTISTS = ['Stray Kids', 'BLACKPINK', 'aespa', 'NewJeans', 'BTS', 'TWICE', 'SEVENTEEN', 'BABYMONSTER', 'IVE', 'ATEEZ'];
function btQuestion(i: number): Record<string, unknown> {
  const artist = i % 3 === 1;
  const pool = artist ? ARTISTS : TITLES;
  const correct = pool[i]!;
  const choices = [1, 2, 3].map((k) => pool[(i + k) % pool.length]!);
  choices.splice(i % 4, 0, correct);
  return {
    song_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    question_type: artist ? 'artist' : 'title', question_text: artist ? 'Which group is this?' : 'Name the song',
    preview_url: `https://cdnt-preview.dzcdn.net/api/qa/${i}.mp3`, album_cover_medium: '/mascot/mascot-default.png', album_cover_big: '/mascot/mascot-default.png',
    correct_answer: correct, choices, reveal: { title: TITLES[i]!, artist: ARTISTS[i]!, album: `Album ${i + 1}`, cover: '/mascot/mascot-default.png' },
  };
}
const BT_QUESTIONS = Array.from({ length: 10 }, (_, i) => btQuestion(i));
function silentWav(seconds = 12): Buffer {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();
const json = (route: Route, body: unknown, status = 200): Promise<void> => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function blindtestFixtures(page: Page): Promise<void> {
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  await page.route((u) => u.pathname === '/api/blind-test/generate', (r) => json(r, { questions: BT_QUESTIONS }));
  await page.route((u) => u.pathname === '/api/daily/blindtest', (r) => json(r, { date: 'fixture', questions: BT_QUESTIONS, timer_duration: 10, songs_count: 10 }));
}

/** Plays the open quiz run to the results with the first answer every time (writes stubbed). */
async function playQuizToEnd(page: Page): Promise<void> {
  const answers = page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');
  for (let guard = 0; guard < 40; guard++) {
    await expect(answers.first()).toBeEnabled({ timeout: 30_000 });
    await answers.first().click();
    const next = page.locator('.p4-nextrow .ux-btn-primary');
    await expect(next).toBeVisible();
    const label = await next.innerText();
    await next.click();
    if (/result/i.test(label)) break;
  }
  await expect(page.locator('.p4-pcard')).toBeVisible({ timeout: 30_000 });
}

for (const theme of THEMES) {
  test.describe(`QA axe, guest, ${theme}`, () => {
    test.beforeEach(async ({ page }) => { await preparePage(page, theme); });

    for (const c of GUEST_PAGES) {
      test(`${c.id} (${c.path})`, async ({ page }) => {
        const calls = await guardWrites(page, env.supabaseUrl);
        test.skip(!(await openPage(page, c)), 'flag off');
        const f = await check(page, c.id, c.owner, theme, 'guest', c.pending ? { pending: c.pending } : {});
        if (c.pending) test.info().annotations.push({ type: 'pending', description: c.pending });
        expect.soft(calls.filter((x) => !/\/api\/(analytics|track|vitals)/.test(x.url)), 'no write on view').toEqual([]);
        expect(f, fmt(f)).toEqual([]);
      });
    }

    test('overlays: search, sign-in sheet', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openPage(page, { path: '/', ready: '.ux-main' })), 'flag off');
      await page.locator('.ux-nav-r .ux-sbtn').click();
      await expect(page.locator('#ux-sov')).toBeVisible();
      await page.locator('#ux-sov .ux-sov-b > *').first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(500);
      const s = await check(page, 'search', 'P11', theme, 'guest');
      expect.soft(s, fmt(s)).toEqual([]);
      await page.keyboard.press('Escape');
      await expect(page.locator('#ux-sov')).toBeHidden();
      await page.locator('.ux-nav-signin').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      const si = await check(page, 'signin (nav)', 'A0', theme, 'guest');
      expect(si, fmt(si)).toEqual([]);
    });

    test('quiz game: play, play-answered, end-guest, share (results)', async ({ page }) => {
      const calls = await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openPage(page, { path: QUIZ, ready: '.p4-act[data-ready]' })), 'flag off');
      await page.locator('.p4-act .ux-btn-primary').click();
      await expect(page.locator('.p4-qq')).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(400);
      const play = await check(page, 'play', 'P4', theme, 'guest');
      expect.soft(play, fmt(play)).toEqual([]);
      await page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians').first().click();
      await expect(page.locator('.p4-nextrow .ux-btn-primary')).toBeVisible();
      await page.waitForTimeout(400);
      const answered = await check(page, 'play-answered', 'P4', theme, 'guest');
      expect.soft(answered, fmt(answered)).toEqual([]);
      await page.locator('.p4-nextrow .ux-btn-primary').click();
      await playQuizToEnd(page);
      await page.waitForTimeout(800);
      const end = await check(page, 'end-guest', 'P4', theme, 'guest', { stubbedWrites: calls.map((c) => `${c.method} ${new URL(c.url).pathname}`) });
      expect.soft(end, fmt(end)).toEqual([]);
      const share = page.locator('.p4-resact').getByRole('button', { name: /share/i }).first();
      if (await share.count()) {
        await share.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.waitForTimeout(500);
        const sh = await check(page, 'share', 'P4', theme, 'guest');
        expect.soft(sh, fmt(sh)).toEqual([]);
      } else {
        record({ kind: 'note', state: 'share', owner: 'P4', width: widthOf(page), theme, note: 'no Share button on the results for this score (primary is Play again); share covered by the quiz-page share' });
      }
      await openPage(page, { path: QUIZ, ready: '.p4-act[data-ready]' });
      await page.getByRole('button', { name: 'Share this quiz' }).click();
      await expect(page.getByRole('dialog', { name: 'Share this quiz' })).toBeVisible();
      await page.waitForTimeout(400);
      const sq = await check(page, 'share (quiz page)', 'P4', theme, 'guest');
      expect(sq, fmt(sq)).toEqual([]);
    });

    test('quiz of the day link: play-qotd', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openPage(page, { path: `${QUIZ}?daily=quiz`, ready: '.p4-act[data-ready], .p4-qq' })), 'flag off');
      const start = page.locator('.p4-act .ux-btn-primary');
      if (await start.count()) await start.click();
      await expect(page.locator('.p4-qq')).toBeVisible({ timeout: 90_000 });
      await page.waitForTimeout(400);
      const f = await check(page, 'play-qotd', 'P4', theme, 'guest');
      expect(f, fmt(f)).toEqual([]);
    });

    test('create: create-2, create-3, signin (guest publish)', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      await page.route('**/api/quiz/title-check**', (r) => json(r, { exists: false }));
      const draft = JSON.stringify({ ...SAMPLE_DRAFT, updatedAt: Date.now() });
      await page.addInitScript(({ d }) => {
        try {
          if (sessionStorage.getItem('qa-seeded')) return;
          sessionStorage.setItem('qa-seeded', '1');
          localStorage.removeItem('ux:pending-action');
          localStorage.setItem('kq_create_draft_v1', d);
          localStorage.setItem('kq_create_step_v1', '2');
        } catch { /* blocked */ }
      }, { d: draft });
      test.skip(!(await openPage(page, { path: '/create', ready: '.p5-col[data-ready="1"]' })), 'flag off');
      await expect(page.locator('.p5-pane[data-step="2"]')).toBeVisible();
      await page.locator('#p5-qt-1').click().catch(() => {});
      await page.waitForTimeout(400);
      const c2 = await check(page, 'create-2', 'P5', theme, 'guest');
      expect.soft(c2, fmt(c2)).toEqual([]);
      await page.locator('.p5-next').click();
      await expect(page.locator('.p5-pane[data-step="3"]')).toBeVisible();
      await page.waitForTimeout(400);
      const c3 = await check(page, 'create-3', 'P5', theme, 'guest');
      expect.soft(c3, fmt(c3)).toEqual([]);
      await page.locator('.p5-next').click();
      await expect(page.locator('.ux-sheet')).toBeVisible();
      await page.waitForTimeout(400);
      const si = await check(page, 'signin', 'P5', theme, 'guest');
      expect(si, fmt(si)).toEqual([]);
    });

    test('blindtest: playlist-open, group-search, btplay, btplay-answered, btend', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      await blindtestFixtures(page);
      test.skip(!(await openPage(page, { path: '/blindtest', ready: '.p6-hub[data-live]' })), 'flag off');
      await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 30_000 });
      await page.locator('.p6-pl').click();
      await expect(page.locator('.p6-plmenu')).toBeVisible();
      await page.waitForTimeout(300);
      const pl = await check(page, 'blindtest-playlist-open', 'P6', theme, 'guest');
      expect.soft(pl, fmt(pl)).toEqual([]);
      await page.keyboard.press('Escape');
      const search = page.locator('.p6-gsearch input');
      if (await search.count()) {
        await search.fill('nct');
        await page.waitForTimeout(500);
        const gs = await check(page, 'blindtest-group-search', 'P6', theme, 'guest');
        expect.soft(gs, fmt(gs)).toEqual([]);
        await search.fill('');
      }
      await page.locator('.p6-setup .ux-btn-primary').click();
      await expect(page.locator('.p6-ans').first()).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(400);
      const bp = await check(page, 'btplay', 'P6', theme, 'guest');
      expect.soft(bp, fmt(bp)).toEqual([]);
      await page.locator('.p6-ans').first().click();
      await expect(page.locator('.p6-next')).toBeVisible();
      await page.waitForTimeout(300);
      const ba = await check(page, 'btplay-answered', 'P6', theme, 'guest');
      expect.soft(ba, fmt(ba)).toEqual([]);
      await page.locator('.p6-next').click();
      for (let i = 1; i < 10; i++) {
        await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4, { timeout: 20_000 });
        await page.locator('.p6-ans').first().click();
        await page.locator('.p6-next').click();
      }
      await expect(page.locator('.p6-btcard')).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(600);
      const be = await check(page, 'btend', 'P6', theme, 'guest');
      expect(be, fmt(be)).toEqual([]);
    });

    test('community editor (new post sheet)', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openPage(page, { path: '/community', ready: '.p8-page' })), 'flag off');
      await page.locator('.p8-composer-in').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.waitForTimeout(400);
      const f = await check(page, 'editor', 'P8', theme, 'guest');
      expect(f, fmt(f)).toEqual([]);
    });
  });

  signedInTest.describe(`QA axe, signed in (read only), ${theme}`, () => {
    signedInTest.beforeEach(async ({ page }) => { await preparePage(page, theme); });

    const SIGNED: PageCase[] = [
      { id: 'home', owner: 'P1', path: '/', ready: '.p1-home' },
      { id: 'notifications', owner: 'P11', path: '/notifications', ready: '.p11-notifs' },
      { id: 'settings', owner: 'P10', path: '/settings', ready: '.p10-settings' },
      { id: 'passport (owner view of /u/testtest)', owner: 'P10', path: '/u/testtest', ready: '.p10-passport' },
      { id: 'leaderboard', owner: 'P9', path: '/leaderboard', ready: '.p9-lb' },
      { id: 'community', owner: 'P8', path: '/community', ready: '.p8-page' },
      { id: 'blindtest', owner: 'P6', path: '/blindtest', ready: '.p6-hub[data-live]' },
      { id: 'quiz', owner: 'P4', path: QUIZ, ready: '.p4-act[data-ready]' },
      { id: 'hub-blackpink', owner: 'P3', path: '/blackpink-quiz', ready: '.p3-hub' },
      { id: 'create-1', owner: 'P5', path: '/create', ready: '.p5-col[data-ready="1"]' },
    ];
    for (const c of SIGNED) {
      signedInTest(`${c.id} (${c.path})`, async ({ page }) => {
        skipUnlessSignedIn();
        await guardWrites(page, env.supabaseUrl);
        // never follow a link while signed in (a row or a menu can point at /me or /profile)
        signedInTest.skip(!(await openPage(page, c)), 'flag off');
        const f = await check(page, c.id, c.owner, theme, 'signed-in');
        expect(f, fmt(f)).toEqual([]);
      });
    }

    signedInTest('bell, account menu, header sheet', async ({ page }) => {
      skipUnlessSignedIn();
      await guardWrites(page, env.supabaseUrl);
      signedInTest.skip(!(await openPage(page, { path: '/u/testtest', ready: '.p10-passport' })), 'flag off');
      const bell = page.locator('.ux-nav-r button[aria-label^="Notifications"]');
      if (await bell.count()) {
        await bell.click();
        await expect(page.locator('.ux-bellpop [role="dialog"], .ux-bellpop [role="menu"], [id][role="dialog"]').first()).toBeVisible();
        await page.waitForTimeout(600);
        const b = await check(page, 'bell', 'P11', theme, 'signed-in');
        expect.soft(b, fmt(b)).toEqual([]);
        await page.keyboard.press('Escape');
      }
      const ava = page.locator('.ux-avabtn');
      if (await ava.count() && await ava.isVisible()) {
        await ava.click();
        await page.waitForTimeout(400);
        const m = await check(page, 'account menu', 'A0', theme, 'signed-in');
        expect.soft(m, fmt(m)).toEqual([]);
        await page.keyboard.press('Escape');
      }
      const hbtn = page.locator('.p10-hbtn');
      if (await hbtn.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true, () => false)) {
        await hbtn.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.waitForTimeout(400);
        const h = await check(page, 'header-sheet', 'P10', theme, 'signed-in');
        expect(h, fmt(h)).toEqual([]);
      } else {
        record({ kind: 'note', state: 'header-sheet', owner: 'P10', width: widthOf(page), theme, note: 'owner controls did not resolve (auth read slow): NOT verified here' });
      }
    });
  });
}
