#!/usr/bin/env node
// P11 report images: "implementation | prototype reference" per state, width and
// theme, and "before (flag off) | after (flag on) | prototype" for the PR. Read
// only: every mutating request is answered locally and counted (the script fails
// if one was attempted). Signed-in shots use the Playwright setup's storage state
// (apps/quiz/e2e/.auth/test-user.json, never printed).
//
// The notifications page and the bell are shot with the prototype's ten sample
// rows served on GET /api/notifications (a stub inside this browser only, the
// same fixture as e2e/ux-v1/p11.spec.ts: the test user has no notification) and
// the browser clock fixed; the search overlay shows the REAL catalog.
//
//   UX11_CHROMIUM=... node make-shots.mjs --after http://localhost:3041 [--before http://localhost:4111] --out <dir>
// References: docs/design/ux-dashboard-v1/v11/checks/reference/<w>-<theme>-<state>.png (local).

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(here, '../../../../../..');
const APP = path.join(ROOT, 'apps/quiz');
const require = createRequire(path.join(APP, 'package.json'));
const { chromium } = require('@playwright/test');
const sharp = createRequire(path.join(ROOT, 'package.json'))('sharp');
const REF = process.env.UX11_REF_DIR || '/Users/louis/IT/Dev/projects/KpopQuizzV2/docs/design/ux-dashboard-v1/v11/checks/reference';
const AUTH = path.join(APP, 'e2e/.auth/test-user.json');

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const AFTER = opt('--after', 'http://localhost:3041');
const BEFORE = opt('--before', null);
const OUT = opt('--out', here);
const ONLY = opt('--only', null);
fs.mkdirSync(OUT, { recursive: true });

const NOW = new Date('2026-09-26T13:00:00Z');
const H = 3_600_000; const D = 24 * H;
const at = (ms) => new Date(NOW.getTime() - ms).toISOString();
const U = '00000000-0000-4000-8000-000000000000';
const FIXTURE = [
  ['n1', 'milestone', 'SKZ true or false hit 1,400 plays', '37 likes and a 72% average score.', 'skz-true-or-false-only-real-stays-pass', null, false, 2 * H],
  ['n2', 'comment', 'quokka_han commented on Guess the BTS member from clues', '"The Jin clue is too easy, otherwise perfect." Scored 6/6.', 'guess-the-bts-member-from-clues', null, false, 4 * H],
  ['n3', 'battle_beaten', 'blink_edits beat your score', '7/8 against your 5/8 on Ultimate BTS era quiz. The rematch link is open 41 more hours.', 'ultimate-bts-era-quiz-only-real-armys-survive', null, false, 6 * H],
  ['n4', 'badge_earned', 'New badge: Debater II', 'You voted in 10 daily debates. Pin it on your passport.', null, '/me', false, 6 * H + 60_000],
  ['n5', 'new_follower', 'moa_bloom started following you', 'Lv 3 · MOA. They will see your new quizzes.', null, '/u/moa_bloom', true, 26 * H],
  ['n6', 'cheer', 'stay4life cheered your 8/10', 'On the Blindtest of the day. Cheers give you both +5 XP.', null, '/blindtest', true, 27 * H],
  ['n7', 'streak_milestone', '7-day streak', 'A week without missing a day. The next milestone is 14.', null, null, true, 28 * H],
  ['n8', 'followed_new_quiz', 'quizmaster_yj published BTS discography challenge', 'Classic · Medium · 8 questions.', null, '/q/bts-discography-challenge', true, 29 * H],
  ['n9', 'group_mastered', 'Stray Kids: 62% mastered', 'Play the 11 quizzes you have not tried to master the group.', null, '/stray-kids-quiz', true, 5 * D],
  ['n10', 'admin_dm', 'From the KpopQuiz team: the Knowledge Report 2026 is out', 'How 60k plays rank every group, generation and fandom.', null, '/data', true, 7 * D],
].map(([id, type, title, body, quiz_slug, link_url, is_read, ago]) => ({ id, user_id: U, type, title, body, quiz_id: null, quiz_slug, link_url, is_read, created_at: at(ago) }));

const JOBS = [
  { state: 'notifications', path: '/notifications', auth: true, stub: 'saved', full: true, before: true },
  { state: 'bell', path: '/', auth: true, stub: 'saved', click: '.ux-nav-r button[aria-label^="Notifications"]', waitFor: '.ux-bellpop .p11-brow' },
  { state: 'search', path: '/', auth: false, click: '.ux-nav-r .ux-sbtn', waitFor: '#ux-sov .p11-sres .ux-srow' },
];

const browser = await chromium.launch({ executablePath: process.env.UX11_CHROMIUM || undefined });

async function shoot(base, job, width, theme) {
  const phone = width < 500;
  const ctx = await browser.newContext({
    viewport: { width, height: phone ? 844 : 900 }, colorScheme: theme, isMobile: phone, hasTouch: phone, deviceScaleFactor: 1, reducedMotion: 'reduce',
    timezoneId: 'Europe/Paris', ...(job.auth && fs.existsSync(AUTH) ? { storageState: AUTH } : {}),
  });
  await ctx.addInitScript((t) => { try { localStorage.setItem('theme', t); } catch { /* blocked */ } }, theme);
  const page = await ctx.newPage();
  if (job.stub) await page.clock.setFixedTime(NOW);
  let writes = 0;
  await page.route((u) => u.pathname.startsWith('/api/') || u.host.endsWith('.supabase.co'), async (route) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(route.request().method())) return route.continue();
    writes++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  if (job.stub) {
    await page.route((u) => u.pathname === '/api/notifications', async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      const limit = Number(new URL(route.request().url()).searchParams.get('limit') ?? '10');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ notifications: FIXTURE.slice(0, limit), unreadCount: 4, hasMore: false }) });
    });
    await page.route((u) => u.pathname === '/api/auth/me', async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      if (body.profile) Object.assign(body.profile, { daily_streak: 13, last_daily_date: '2026-09-26' });
      return route.fulfill({ response: res, json: body });
    });
  }
  await page.goto(base + job.path, { waitUntil: 'load', timeout: 180000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.waitForFunction(() => Boolean(document.querySelector('.ux-nav-signin:not([aria-busy]), .ux-avabtn, header, nav')), undefined, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(1200);
  if (job.click) {
    await page.locator(job.click).first().click({ timeout: 30000 }).catch(() => {});
    if (job.waitFor) await page.waitForSelector(job.waitFor, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);
  }
  const buf = await page.screenshot({ fullPage: Boolean(job.full), animations: 'disabled' });
  await ctx.close();
  if (writes) throw new Error(`${base}${job.path}: ${writes} write attempt(s)`);
  return buf;
}

const scale = async (buf, w) => sharp(buf).resize({ width: w }).png().toBuffer();

async function compose(name, panels, theme) {
  const metas = await Promise.all(panels.map(([, b]) => sharp(b).metadata()));
  const gap = 24; const label = 28;
  const W = metas.reduce((s, m) => s + m.width, 0) + gap * (panels.length - 1);
  const Hh = Math.max(...metas.map((m) => m.height)) + label;
  const bg = theme === 'dark' ? '#141312' : '#FFFFFF';
  const ink = theme === 'dark' ? '#A8A198' : '#6B655E';
  let x = 0; const comps = []; const texts = [];
  panels.forEach(([n, b], i) => { comps.push({ input: b, top: label, left: x }); texts.push(`<text x="${x}" y="18">${n}</text>`); x += metas[i].width + gap; });
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${label}"><style>text{font:600 13px sans-serif;fill:${ink}}</style>${texts.join('')}</svg>`);
  await sharp({ create: { width: W, height: Hh, channels: 3, background: bg } }).composite([{ input: svg, top: 0, left: 0 }, ...comps]).webp({ quality: 72 }).toFile(path.join(OUT, `${name}.webp`));
  process.stdout.write(`wrote ${name}.webp (${W}x${Hh})\n`);
}

for (const job of JOBS) {
  if (ONLY && job.state !== ONLY) continue;
  for (const width of [1440, 390]) {
    for (const theme of ['light', 'dark']) {
      const col = width < 500 ? width : 720;
      const ref = await scale(fs.readFileSync(path.join(REF, `${width}-${theme}-${job.state}.png`)), col);
      const after = await scale(await shoot(AFTER, job, width, theme), col);
      await compose(`${job.state}-${width}-${theme}`, [[`implementation (flag on) ${job.path}`, after], [`prototype ${job.state} ${width} ${theme}`, ref]], theme);
      if (BEFORE && job.before) {
        const before = await scale(await shoot(BEFORE, job, width, theme), col);
        await compose(`before-after-prototype-${job.state}-${width}-${theme}`, [['before (flag off)', before], ['after (flag on)', after], [`prototype ${job.state}`, ref]], theme);
      }
    }
  }
}
await browser.close();
