// C1 pixel checker: per-state drivers for the implementation (flag-ON build) and the
// landmark map (prototype selector -> implementation selector). Drivers reuse the page
// agents' specs (apps/quiz/e2e/ux-v1/p*.spec.ts): same URLs, same ready signals, same
// fixtures where a spec uses one. Every mutating request is answered locally by the
// write guard installed in c1-pixel.mjs before any of these run (no production write).

import fs from 'node:fs';
import path from 'node:path';

export const WT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../../../../..');
const APP = path.join(WT, 'apps/quiz');

// ---- shared waits ----------------------------------------------------------------

export async function hasShell(page) { return (await page.locator('.ux-app').count()) > 0; }

export async function waitHydrated(page) {
  await page.waitForFunction(() => Boolean(document.querySelector('.ux-nav-signin:not([aria-busy]), .ux-avabtn, .ux-nav-r button[aria-label^="Notifications"]')), undefined, { timeout: 30_000 }).catch(() => {});
}

/** goto + ready selector, reloading up to 3 times when a read timed out (shared DB). */
/** `want`: the complete render (every read made it); after `attempts` reloads without it
 *  the page is measured as served (a missing section then shows as a missing landmark). */
async function openReady(page, p, ready, { attempts = 4, timeout = 45_000, want = null } = {}) {
  let lastErr = null;
  for (let i = 0; i < attempts; i++) {
    const res = i === 0 ? await page.goto(p, { waitUntil: 'domcontentloaded', timeout: 120_000 }) : await page.reload({ waitUntil: 'domcontentloaded', timeout: 120_000 });
    if (!res || res.status() >= 500) { lastErr = new Error(`${p}: HTTP ${res && res.status()}`); await page.waitForTimeout(3000); continue; }
    if (!(await hasShell(page))) throw new Error(`${p}: no v11 shell (flag off?)`);
    try {
      if (ready) await page.locator(ready).first().waitFor({ state: 'attached', timeout });
      await waitHydrated(page);
      if (want && i < attempts - 1 && (await page.locator(want).count()) === 0) { lastErr = new Error(`incomplete render (${want})`); await page.waitForTimeout(4000); continue; }
      page.__c1Incomplete = want && (await page.locator(want).count()) === 0 ? want : null;
      return res;
    } catch (e) { lastErr = e; }
  }
  throw new Error(`${p}: "${ready}" never rendered (${lastErr && lastErr.message.split('\n')[0]})`);
}

const json = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

// ---- P4 quiz run ------------------------------------------------------------------

const P4_CLASSIC = 'ultimate-bts-era-quiz-only-real-armys-survive';
const P4_DAILY = 'stray-kids-district-9-quiz';

function correctIndex(q) {
  if (typeof q.correct === 'boolean') {
    if (q.options && q.options.length > 0) return q.options.findIndex((o) => String(o).toLowerCase() === (q.correct ? 'true' : 'false'));
    return q.correct ? 0 : 1;
  }
  return q.correct;
}

async function recordQuestions(page) {
  let qs = [];
  await page.route(/\/api\/quiz\/[^/]+\/questions$/, async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    qs = body.questions;
    await route.fulfill({ response: res, json: body });
  });
  return () => qs;
}

async function openQuiz(page, slug, query = '') {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await page.goto(`/q/${slug}${query}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    if (!res || res.status() !== 200) throw new Error(`/q/${slug}: HTTP ${res && res.status()}`);
    if (!(await hasShell(page))) throw new Error('no v11 shell');
    if ((await page.locator('.p4-page').count()) > 0) break;
    if (attempt === 3) throw new Error(`/q/${slug}: quiz page never rendered`);
  }
  await waitHydrated(page);
  await page.locator('.p4-act[data-ready], .p4-qq').first().waitFor({ state: 'attached', timeout: 90_000 });
}

async function p4Start(page) {
  await page.locator('.p4-act .ux-btn-primary').click();
  await page.locator('.p4-qq').waitFor({ timeout: 90_000 });
}

const answerButtons = (page) => page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');

async function p4PlayRight(page, qs) {
  for (let guard = 0; guard < 40; guard++) {
    const idx = Number(await page.locator('.p4-segs').getAttribute('aria-valuenow')) - 1;
    const q = qs()[idx];
    await answerButtons(page).nth(q ? correctIndex(q) : 0).click();
    const next = page.locator('.p4-nextrow .ux-btn-primary');
    await next.waitFor({ timeout: 20_000 });
    const label = await next.innerText();
    await next.click();
    if (/result/i.test(label)) break;
    await answerButtons(page).first().waitFor();
  }
  await page.locator('.p4-pcard').waitFor({ timeout: 30_000 });
}

async function p4ChallengeStub(page) {
  await page.route('**/api/ux-v1/p4/challenge', (route) => json(route, { id: '0f8fad5b-d9cb-469f-a165-70867728950e', url: 'https://kpopquiz.org/q/x?c=0f8fad5b-d9cb-469f-a165-70867728950e.a1b2c3d4e5f60718' }));
}

// ---- P5 create --------------------------------------------------------------------

async function openCreate(page, step, { pending = false } = {}) {
  const { SAMPLE_DRAFT } = await import(path.join(WT, 'docs/design/ux-dashboard-v1/v11/reports/P5/sample-draft.mjs'));
  await page.route('**/api/quiz/title-check**', (r) => json(r, { exists: false }));
  const seed = JSON.stringify({ ...SAMPLE_DRAFT, updatedAt: Date.now() });
  await page.addInitScript(({ d, s, p }) => {
    try {
      if (sessionStorage.getItem('c1-seeded')) return;
      sessionStorage.setItem('c1-seeded', '1');
      if (p) localStorage.setItem('ux:pending-action', JSON.stringify({ id: 'p5:publish', path: '/create', at: Date.now() })); else localStorage.removeItem('ux:pending-action');
      localStorage.setItem('kq_create_draft_v1', d);
      localStorage.setItem('kq_create_step_v1', s);
    } catch { /* blocked */ }
  }, { d: seed, s: String(step), p: pending });
  await page.goto('/create', { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await waitHydrated(page);
  await page.locator('.p5-col[data-ready="1"]').waitFor({ timeout: 45_000 });
  for (let i = 0; i < 3 && (await page.locator('.p5-col[data-groups="0"]').count()) > 0; i++) {
    await page.reload();
    await page.locator('.p5-col[data-ready="1"]').waitFor({ timeout: 45_000 });
  }
  await page.locator(`.p5-pane[data-step="${step}"]`).waitFor();
}

// ---- P6 blindtest fixtures (p6.spec.ts) -------------------------------------------

const TITLES = ["God's Menu", 'How You Like That', 'Supernova', 'Hype Boy', 'Dynamite', 'FANCY', 'HOT', 'SHEESH', 'LOVE DIVE', 'Guerrilla'];
const ARTISTS = ['Stray Kids', 'BLACKPINK', 'aespa', 'NewJeans', 'BTS', 'TWICE', 'SEVENTEEN', 'BABYMONSTER', 'IVE', 'ATEEZ'];
function btQuestion(i) {
  const artist = i % 3 === 1;
  const pool = artist ? ARTISTS : TITLES;
  const correct = pool[i];
  const wrong = [1, 2, 3].map((k) => pool[(i + k) % pool.length]);
  const choices = [...wrong];
  choices.splice(i % 4, 0, correct);
  return {
    song_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`, question_type: artist ? 'artist' : 'title',
    question_text: artist ? 'Which group is this?' : 'Name the song', preview_url: `https://cdnt-preview.dzcdn.net/api/p6-test/${i}.mp3`,
    album_cover_medium: '/mascot/mascot-default.png', album_cover_big: '/mascot/mascot-default.png', correct_answer: correct, choices,
    reveal: { title: TITLES[i], artist: ARTISTS[i], album: `Album ${i + 1}`, cover: '/mascot/mascot-default.png' },
  };
}
const BT_QUESTIONS = Array.from({ length: 10 }, (_, i) => btQuestion(i));
function silentWav(seconds = 12) {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();

async function p6Fixtures(page) {
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  await page.route((u) => u.pathname === '/api/blind-test/generate', (r) => json(r, { questions: BT_QUESTIONS }));
  // GET /api/daily/blindtest may run ensure_daily_blindtest (a write): fixture, as P6 does
  await page.route((u) => u.pathname === '/api/daily/blindtest', (r) => json(r, { date: 'fixture', questions: BT_QUESTIONS, timer_duration: 10, songs_count: 10 }));
}

async function openBlindtest(page) {
  await p6Fixtures(page);
  await openReady(page, '/blindtest', '.p6-hub[data-live], .p6-play[data-live]');
  await page.locator('.p6-setup[data-live]').waitFor({ timeout: 30_000 });
  await page.locator('.p6-btg-h[data-live]').waitFor({ timeout: 30_000 });
  await page.locator('.p6-board[data-live][data-loaded]').waitFor({ timeout: 30_000 });
}

async function btStart(page) {
  await page.locator('.p6-setup .ux-btn-primary').click();
  await page.locator('.p6-play').waitFor();
  await page.locator('.p6-ans').first().waitFor();
}

// ---- P11 notifications fixture (p11.spec.ts) --------------------------------------

const NOW = new Date('2026-09-26T13:00:00Z');
const H = 3_600_000; const D = 24 * H;
const at = (ms) => new Date(NOW.getTime() - ms).toISOString();
const U = '00000000-0000-4000-8000-000000000000';
const Q1 = '11111111-1111-4111-8111-111111111111';
const Q2 = '22222222-2222-4222-8222-222222222222';
const NFIX = [
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

async function p11Stub(page) {
  await page.clock.setFixedTime(NOW);
  await page.route((u) => u.pathname === '/api/notifications', async (route) => {
    if (route.request().method() !== 'GET') { await route.fallback(); return; }
    const u = new URL(route.request().url());
    const limit = Number(u.searchParams.get('limit') ?? '10');
    await json(route, { notifications: NFIX.slice(0, limit), unreadCount: NFIX.filter((r) => !r.is_read).length, hasMore: false });
  });
  await page.route((u) => u.pathname === '/api/auth/me', async (route) => {
    const res = await route.fetch();
    const body = await res.json();
    if (body.profile) Object.assign(body.profile, { daily_streak: 13, last_daily_date: '2026-09-26' });
    await route.fulfill({ response: res, json: body });
  });
}

// ---- P10 passport -----------------------------------------------------------------

const P10_USER = 'testtest';
async function openPassport(page) {
  let served = false;
  for (let attempt = 0; attempt < 3 && !served; attempt++) {
    const res = await page.goto(`/u/${P10_USER}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    served = Boolean(res && res.status() === 200) && (await hasShell(page)) && (await page.locator('.p10-passport').count()) > 0;
  }
  if (!served) throw new Error('/u/testtest not served');
  await page.locator('.p10-passport').waitFor({ state: 'visible', timeout: 60_000 });
  await waitHydrated(page);
  await page.waitForFunction(() => {
    const nodes = [document.querySelector('#p10-tab-overview'), document.querySelector('.p10-acts button')];
    return nodes.every((n) => n !== null && Object.keys(n).some((k) => k.startsWith('__reactProps$')));
  }, undefined, { timeout: 30_000 });
}

// ---- P8 community -----------------------------------------------------------------

async function openCommunity(page) {
  await openReady(page, '/community', '.p8-feed');
}
async function firstPostHref(page, kind) {
  await openCommunity(page);
  const href = await page.locator(`.p8-feed .ux-ptt a[href^="/community/${kind}/"]`).first().getAttribute('href', { timeout: 10_000 }).catch(() => null);
  if (!href) throw new Error(`no ${kind} post in the /community feed today`);
  return href;
}

// ---- the 38 states ----------------------------------------------------------------
//
// lm: landmark pairs. `proto` is looked up inside `.view.on` first, then in the whole
// prototype document (sheets); `impl` in the implementation document. `box` lists the
// box parts compared within 2px: x, y (document top), w, h; vx / vy compare viewport
// coordinates (fixed bars, sheets). `styles: false` compares no computed style; `skip`
// lists style props not compared (with the reason in `why`). `seq: true` compares every
// match in order (x, w and the vertical gap between consecutive boxes).

const NAV = [
  { name: 'nav', proto: '.nav', impl: '.ux-nav', box: ['x', 'y', 'w', 'h'] },
  { name: 'nav active pill', proto: '.links a.on', impl: '.ux-links a[aria-current="page"]', box: ['h', 'y'] },
  { name: 'tab bar', proto: '.tabbar', impl: '.ux-tabbar', box: ['x', 'w', 'h', 'vy'] },
  { name: 'footer', proto: '.foot', impl: '.ux-foot', box: ['x', 'w'] },
];
const NAV_ONLY = NAV.filter((l) => l.name === 'nav');
const PH = [
  { name: 'page header', proto: '.ph', impl: '.ux-ph', box: ['x', 'w'] },
  { name: 'page H1', proto: '.ph h1', impl: '.ux-ph h1', box: ['x'] },
];

export const STATES = {
  home: {
    owner: 'P1', auth: 'user', shot: 'full',
    open: async (page) => { await openReady(page, '/', '.p1-home', { want: '.p1-home:has(.p1-qotd):has(#p1-groups-h)' }); await page.locator('.p1-kick').filter({ hasText: /left|played/ }).waitFor({ timeout: 30_000 }).catch(() => {}); },
    lm: [...NAV,
      { name: 'page frame', proto: '.wrap.pg', impl: '.p1-home', box: ['x', 'w'] },
      { name: 'ticker', proto: '.ticker', impl: '.p1-ticker > div', box: ['x', 'y', 'w', 'h'] },
      { name: 'header', proto: '.hhead', impl: '.p1-hhead', box: ['x', 'y', 'w'] },
      { name: 'H1', proto: '.hhead h1', impl: '.p1-hhead h1', box: ['x', 'w'] },
      { name: 'quiz of the day', proto: '.qotd', impl: '.p1-qotd', box: ['x', 'w', 'h'], phoneBox: ['x', 'w'], why: 'phone: the real title and replay line wrap (text)' },
      { name: 'sections', proto: 'section.sec', impl: '.p1-home > section.ux-sec', seq: true, gapInfo: true, styles: false },
      { name: 'section title', proto: '.sec-h h2', impl: '.p1-home .ux-sec-h h2', box: ['h'] },
      { name: 'quiz card', proto: '.qcard', impl: '.p1-home .ux-qcard', box: ['w'] },
      { name: 'quiz card photo', proto: '.qcard .qcov', impl: '.p1-home .ux-qcard .ux-qcov', box: ['w', 'h'], skip: ['background-image', 'background-color'], why: 'photo' },
      { name: 'quiz card body', proto: '.qcard .qb', impl: '.p1-home .ux-qcard .ux-qb', box: ['w'] },
      { name: 'quiz cards row', proto: '#h-trend .qcard', impl: '.p1-trend .ux-qcard', seq: 'row', styles: false },
      { name: 'blindtest band', proto: '.band', impl: '.p1-band', box: ['x', 'w', 'h'] },
    ],
  },
  'home-guest': {
    owner: 'P1', auth: 'guest', shot: 'full',
    open: async (page) => { await openReady(page, '/', '.p1-home', { want: '.p1-home:has(.p1-qotd):has(#p1-groups-h)' }); await page.locator('.p1-kick').filter({ hasText: /left|played/ }).waitFor({ timeout: 30_000 }).catch(() => {}); },
    lm: [...NAV,
      { name: 'page frame', proto: '.wrap.pg', impl: '.p1-home', box: ['x', 'w'] },
      { name: 'ticker', proto: '.ticker', impl: '.p1-ticker > div', box: ['x', 'y', 'w', 'h'] },
      { name: 'header', proto: '.hhead', impl: '.p1-hhead', box: ['x', 'y', 'w'] },
      { name: 'H1', proto: '.hhead h1', impl: '.p1-hhead h1', box: ['x', 'w'] },
      { name: 'hero CTAs', proto: '.hcta', impl: '.p1-hcta', box: ['x', 'y', 'w', 'h'] },
      { name: 'primary button', proto: '.hcta .btn-primary', impl: '.p1-hcta .ux-btn-primary', box: ['h', 'y'] },
      { name: 'quiz of the day', proto: '.qotd', impl: '.p1-qotd', box: ['x', 'y', 'w', 'h'], phoneBox: ['x', 'y', 'w'], why: 'phone: the real title and replay line wrap (text)' },
      { name: 'qotd label', proto: '.qlab', impl: '.p1-qlab', box: ['h'] },
      { name: 'qotd meta line', proto: '.qline', impl: '.p1-qline', box: ['w'] },
      { name: 'sections', proto: 'section.sec', impl: '.p1-home > section.ux-sec', seq: true, gapInfo: true, styles: false },
      { name: 'section title', proto: '.sec-h h2', impl: '.p1-home .ux-sec-h h2', box: ['h'] },
      { name: 'quiz card', proto: '.qcard', impl: '.p1-home .ux-qcard', box: ['w'] },
      { name: 'quiz card photo', proto: '.qcard .qcov', impl: '.p1-home .ux-qcard .ux-qcov', box: ['w', 'h'], skip: ['background-image', 'background-color'], why: 'photo' },
      { name: 'blindtest band', proto: '.band', impl: '.p1-band', box: ['x', 'w', 'h'] },
    ],
  },
  groups: {
    owner: 'P3', auth: 'user', shot: 'full',
    open: (page) => openReady(page, '/groups', '.p3-filter[data-live]'),
    lm: [...NAV, ...PH,
      { name: 'filter input', proto: '.view.on > .wrap > .inp', impl: '.p3-filter', box: ['x', 'w', 'h'] },
      { name: 'sections', proto: 'section.sec', impl: '.ux-page section.ux-sec', seq: true, gapInfo: true, styles: false },
      { name: 'section title', proto: '.sec-h h2', impl: '.ux-sec-h h2', box: ['h'] },
      { name: 'group tile', proto: '.gitem', impl: '.ux-page .ux-gitem, .ux-page .p3-gitem', box: ['w', 'h'] },
    ],
  },
  quizzes: {
    owner: 'P2', auth: 'user', shot: 'full', pending: 'pending P2 (branch waits for the owner; the server shows the pre-P2 page)',
    open: (page) => openReady(page, '/quizzes', null),
    lm: [...NAV],
  },
  quiz: {
    owner: 'P4', auth: 'user', shot: 'full',
    open: (page) => openQuiz(page, P4_CLASSIC),
    lm: [...NAV,
      { name: 'page column', proto: '.col.pg', impl: '.p4-intro', box: ['x', 'w'] },
      { name: 'meta line', proto: '.metaline', impl: '.p4-meta', box: ['x', 'y', 'h'] },
      { name: 'author line', proto: '.author', impl: '.p4-author', box: ['x', 'y', 'w', 'h'] },
      { name: 'sections', proto: '.col.pg > section', impl: '.p4-intro > section', seq: true, gapInfo: true, styles: false },
      { name: 'crumb', proto: '.crumb', impl: '.p4-page .ux-crumb', box: ['x', 'y', 'w', 'h'] },
      { name: 'cover', proto: '.qcover', impl: '.p4-cover', box: ['x', 'y', 'w', 'h'], skip: ['background-image', 'background-color'], why: 'photo' },
      { name: 'H1', proto: 'h1.qtitle', impl: '.p4-page h1', box: ['x', 'y', 'w'] },
      { name: 'actions', proto: '.qact', impl: '.p4-act', box: ['x', 'w', 'h'] },
      { name: 'primary button', proto: '.qact .btn-primary', impl: '.p4-act .ux-btn-primary', box: ['h'] },
      { name: 'about box', proto: '.aboutbox', impl: '.p4-about.ux-box', box: ['x', 'w'] },
      { name: 'text card', proto: '.tcard', impl: '.ux-tcard', box: ['w'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.ux-sec-h h2', box: ['h'] },
    ],
  },
  play: {
    owner: 'P4', auth: 'user', shot: 'viewport',
    open: async (page, s) => { s.qs = await recordQuestions(page); await openQuiz(page, P4_CLASSIC); await p4Start(page); },
    lm: [
      { name: 'game bar', proto: '.gbar', impl: '.p4-gbar', box: ['x', 'y', 'w', 'h'] },
      { name: 'progress segments', proto: '.segs', impl: '.p4-segs', box: ['y', 'h'] },
      { name: 'timer ring', proto: '.tring', impl: '.p4-tring', box: ['x', 'y', 'w', 'h'], skip: ['background-image'], why: 'the ring sweep is a live countdown' },
      { name: 'question', proto: 'h1.qq', impl: '.p4-qq', box: ['y'] },
      { name: 'answers', proto: '.answers', impl: '.p4-answers', box: ['x', 'w'] },
      { name: 'answer buttons', proto: '.answers > *', impl: '.p4-answers .p4-ans', seq: true },
    ],
  },
  'play-answered': {
    owner: 'P4', auth: 'user', shot: 'viewport',
    open: async (page, s) => {
      s.qs = await recordQuestions(page); await openQuiz(page, P4_CLASSIC); await p4Start(page);
      const q = s.qs()[0]; const right = q ? correctIndex(q) : 0; const wrong = right === 2 ? 1 : 2;
      await answerButtons(page).nth(wrong).click();
      await page.locator('.p4-nextrow .ux-btn-primary').waitFor();
    },
    lm: [
      { name: 'game bar', proto: '.gbar', impl: '.p4-gbar', box: ['x', 'y', 'w', 'h'] },
      { name: 'timer ring', proto: '.tring', impl: '.p4-tring', box: ['x', 'y', 'w', 'h'], skip: ['background-image'], why: 'live countdown' },
      { name: 'answers', proto: '.answers', impl: '.p4-answers', box: ['x', 'w'] },
      { name: 'answer buttons', proto: '.answers > *', impl: '.p4-answers .p4-ans', seq: true },
      { name: 'fact', proto: '.fact', impl: '.p4-fact', box: ['x', 'w'] },
      { name: 'next button', proto: '#g-after .btn-primary', impl: '.p4-nextrow .ux-btn-primary', box: ['h'] },
    ],
  },
  'play-qotd': {
    owner: 'P4', auth: 'user', shot: 'viewport',
    open: async (page, s) => { s.qs = await recordQuestions(page); await openQuiz(page, P4_DAILY, '?daily=quiz'); await p4Start(page); },
    lm: [
      { name: 'game bar', proto: '.gbar', impl: '.p4-gbar', box: ['x', 'y', 'w', 'h'] },
      { name: 'timer ring', proto: '.tring', impl: '.p4-tring', box: ['x', 'y', 'w', 'h'], skip: ['background-image'], why: 'live countdown' },
      { name: 'answers', proto: '.answers', impl: '.p4-answers', box: ['x', 'w'] },
      { name: 'answer buttons', proto: '.answers > *', impl: '.p4-answers .p4-ans', seq: true },
    ],
  },
  'end-guest': {
    owner: 'P4', auth: 'guest', shot: 'full',
    open: async (page, s) => { s.qs = await recordQuestions(page); await openQuiz(page, P4_CLASSIC); await p4Start(page); await p4PlayRight(page, s.qs); },
    lm: [...NAV,
      { name: 'stats row', proto: '.stats3', impl: '.p4-res-in .ux-stats3', box: ['x', 'w', 'h'] },
      { name: 'primary button', proto: '.btn-primary', impl: '.p4-resact .ux-btn-primary', box: ['h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.p4-keep .ux-sec-h h2', box: ['h'] },
      { name: 'photocard', proto: '.pcard', impl: '.p4-pcard', box: ['x', 'y', 'w', 'h'] },
    ],
  },
  end: {
    owner: 'P4', auth: 'user', shot: 'full',
    open: async (page, s) => { s.qs = await recordQuestions(page); await openQuiz(page, P4_CLASSIC); await p4Start(page); await p4PlayRight(page, s.qs); },
    lm: [...NAV,
      { name: 'stats row', proto: '.stats3', impl: '.p4-res-in .ux-stats3', box: ['x', 'w', 'h'] },
      { name: 'primary button', proto: '.btn-primary', impl: '.p4-resact .ux-btn-primary', box: ['h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.p4-keep .ux-sec-h h2', box: ['h'] },
      { name: 'photocard', proto: '.pcard', impl: '.p4-pcard', box: ['x', 'y', 'w', 'h'] },
    ],
  },
  share: {
    owner: 'P4', auth: 'user', shot: 'viewport',
    open: async (page, s) => {
      await p4ChallengeStub(page);
      s.qs = await recordQuestions(page); await openQuiz(page, P4_CLASSIC); await p4Start(page); await p4PlayRight(page, s.qs);
      await page.locator('.p4-resact').getByRole('button', { name: 'Share' }).click();
      await page.getByRole('dialog', { name: 'Share your score' }).waitFor();
    },
    lm: [
      { name: 'share sheet', proto: '#share .sh', impl: '.ux-layer .ux-sheet', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'sheet header', proto: '#share .sh-h', impl: '.ux-layer .ux-sh-h', box: ['w', 'h'] },
    ],
  },
  'create-1': {
    owner: 'P5', auth: 'user', shot: 'full',
    open: async (page) => { await openCreate(page, 1); await page.locator('#p5-group-q').focus(); },
    lm: [...NAV_ONLY, ...PH,
      { name: 'stepper', proto: '.stepper', impl: '.p5-stepper', box: ['x', 'w', 'h'] },
      { name: 'sticky bar', proto: '.cbar', impl: '.p5-bar', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'next button', proto: '#cnext', impl: '.p5-next', box: ['h'] },
    ],
  },
  'create-2': {
    owner: 'P5', auth: 'user', shot: 'full',
    open: async (page) => { await openCreate(page, 2); await page.locator('#p5-qt-1').click(); },
    lm: [...NAV_ONLY, ...PH,
      { name: 'stepper', proto: '.stepper', impl: '.p5-stepper', box: ['x', 'w', 'h'] },
      { name: 'sticky bar', proto: '.cbar', impl: '.p5-bar', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'next button', proto: '#cnext', impl: '.p5-next', box: ['h'] },
    ],
  },
  'create-3': {
    owner: 'P5', auth: 'user', shot: 'full',
    open: (page) => openCreate(page, 3),
    lm: [...NAV_ONLY, ...PH,
      { name: 'stepper', proto: '.stepper', impl: '.p5-stepper', box: ['x', 'w', 'h'] },
      { name: 'card preview', proto: '.qcard', impl: '.p5-card', box: ['w', 'h'] },
      { name: 'sticky bar', proto: '.cbar', impl: '.p5-bar', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'next button', proto: '#cnext', impl: '.p5-next', box: ['h'] },
    ],
  },
  signin: {
    owner: 'P5', auth: 'guest', shot: 'viewport',
    open: async (page) => { await openCreate(page, 3); await page.locator('.p5-next').click(); await page.locator('.ux-sheet').waitFor(); },
    lm: [
      { name: 'sign-in sheet', proto: '#signin .sh', impl: '.ux-layer .ux-sheet', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'sheet header', proto: '#signin .sh-h', impl: '.ux-layer .ux-sh-h', box: ['w', 'h'] },
    ],
  },
  blindtest: {
    owner: 'P6', auth: 'user', shot: 'full',
    open: (page) => openBlindtest(page),
    lm: [...NAV,
      { name: 'hero', proto: '.bthero', impl: '.p6-hero', box: ['x', 'y', 'w'] },
      { name: 'group search', proto: '.gsearch', impl: '.p6-gsearch', box: ['w', 'h'] },
      { name: 'playlist tile', proto: '.bpt', impl: '.p6-bpt', box: ['w', 'h'] },
      { name: 'group index item', proto: '.gi', impl: '.p6-gi', box: ['w', 'h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.ux-sec-h h2', box: ['h'] },
      { name: 'start button', proto: '.btn-primary', impl: '.p6-setup .ux-btn-primary', box: ['h'] },
      { name: 'board row', proto: '.lrow', impl: '.p6-lrow', box: ['w'] },
    ],
  },
  'blindtest-playlist-open': {
    owner: 'P6', auth: 'user', shot: 'viewport',
    open: async (page) => { await openBlindtest(page); await page.locator('.p6-pl').click(); await page.locator('.p6-plmenu').waitFor(); },
    lm: [...NAV_ONLY,
      { name: 'playlist menu', proto: '#plmenu', impl: '.p6-plmenu', box: ['vx', 'vy', 'w', 'h'] },
    ],
  },
  'blindtest-group-search': {
    owner: 'P6', auth: 'user', shot: 'full',
    open: async (page) => { await openBlindtest(page); await page.locator('.p6-gsearch input').fill('nct'); await page.waitForTimeout(500); },
    lm: [...NAV,
      { name: 'group search', proto: '.gsearch', impl: '.p6-gsearch', box: ['w', 'h'] },
      { name: 'group index item', proto: '.gi', impl: '.p6-gi', box: ['w', 'h'] },
    ],
  },
  btplay: {
    owner: 'P6', auth: 'user', shot: 'viewport',
    open: async (page) => { await openBlindtest(page); await btStart(page); },
    lm: [
      { name: 'orb', proto: '.orb', impl: '.p6-orb', box: ['x', 'y', 'w', 'h'], skip: ['box-shadow'], why: 'the reference caught the breathing glow mid-animation (P6)' },
      { name: 'answer buttons', proto: '.btans > *, .answers > *', impl: '.p6-ans', seq: true },
    ],
  },
  'btplay-answered': {
    owner: 'P6', auth: 'user', shot: 'viewport',
    open: async (page) => { await openBlindtest(page); await btStart(page); await page.locator('.p6-ans').nth(0).click(); await page.locator('.p6-next').waitFor(); },
    lm: [
      { name: 'orb', proto: '.orb', impl: '.p6-orb', box: ['x', 'y', 'w', 'h'], skip: ['box-shadow'], why: 'breathing glow' },
      { name: 'answer buttons', proto: '.btans > *, .answers > *', impl: '.p6-ans', seq: true },
    ],
  },
  'btend-ranked': {
    owner: 'P7', auth: 'user', shot: 'full', pending: 'NOT verified until the ranked migration is applied (populated ranked state)',
    open: async (page) => { await openReady(page, '/blindtest/ranked', '.p7-body[data-live]:not([data-live="loading"])'); },
    lm: [...NAV],
  },
  ranked: {
    owner: 'P7', auth: 'user', shot: 'full', pending: 'populated state NOT verified until the ranked migration is applied; the not-live state is checked',
    open: async (page) => { await openReady(page, '/blindtest/ranked', '.p7-body[data-live]:not([data-live="loading"])'); },
    lm: [...NAV],
  },
  community: {
    owner: 'P8', auth: 'user', shot: 'full',
    open: (page) => openCommunity(page),
    lm: [...NAV, ...PH,
      { name: 'composer', proto: '.composer', impl: '.p8-composer', box: ['x', 'w', 'h'] },
      { name: 'feed post', proto: '.post', impl: '.p8-feed .ux-post', box: ['x', 'w'] },
      { name: 'rail', proto: '.rail', impl: '.p8-rail', box: ['x', 'w'] },
      { name: 'rail panel', proto: '.rail>section', impl: '.p8-rail > .ux-panel', box: ['w'] },
      { name: 'feed tab on', proto: '.utabs button.on', impl: '.p8-fctl [aria-selected="true"]', box: ['h'] },
    ],
  },
  'post-challenge': {
    owner: 'P8', auth: 'user', shot: 'full',
    pending: 'NOT verified: no challenge post exists (the challenge store is a pending migration, P8 report); the thread post view stands in for the shared post layout',
    open: async (page) => { const h = await firstPostHref(page, 'thread'); await openReady(page, h, '.p8-post-page, .p8-pv'); },
    lm: [...NAV,
      { name: 'crumb', proto: '#pv .crumb', impl: '.p8-pv .ux-crumb', box: ['x', 'y', 'w'] },
      { name: 'post title', proto: '.post-t', impl: '.p8-post-t', box: ['x', 'w'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.p8-post-page .ux-sec-h h2', box: ['h'] },
    ],
  },
  'post-blog': {
    owner: 'P8', auth: 'user', shot: 'full',
    open: async (page) => { const h = await firstPostHref(page, 'blog'); await openReady(page, h, '.p8-post-page, .p8-pv'); },
    lm: [...NAV,
      { name: 'crumb', proto: '#pv .crumb', impl: '.p8-pv .ux-crumb', box: ['x', 'y', 'w'] },
      { name: 'post title', proto: '.post-t', impl: '.p8-post-t', box: ['x', 'w'] },
      { name: 'cover', proto: '.post-cover', impl: '.p8-post-cover', box: ['x', 'w', 'h'], skip: ['background-image', 'background-color'], why: 'photo' },
      { name: 'section title', proto: '.sec-h h2', impl: '.p8-post-page .ux-sec-h h2', box: ['h'] },
    ],
  },
  'post-debate': {
    owner: 'P8', auth: 'user', shot: 'full',
    open: async (page) => { await openReady(page, `/community/debate/${new Date().toISOString().slice(0, 10)}`, '.p8-post-page, .p8-pv'); },
    lm: [...NAV,
      { name: 'crumb', proto: '#pv .crumb', impl: '.p8-pv .ux-crumb', box: ['x', 'y', 'w'] },
      { name: 'post title', proto: '.post-t', impl: '.p8-post-t', box: ['x', 'w'] },
      { name: 'vote buttons', proto: '#pv .vote button', impl: '.p8-pv .p8-vote button', box: ['h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.p8-post-page .ux-sec-h h2', box: ['h'] },
    ],
  },
  editor: {
    owner: 'P8', auth: 'user', shot: 'viewport',
    open: async (page) => {
      await openCommunity(page);
      await page.locator('.p8-composer-in').click();
      await page.locator('.p8-ed').waitFor();
      await page.locator('.p8-ed .p8-modes4 button').nth(2).click();
      await page.getByRole('dialog', { name: 'New debate' }).waitFor();
    },
    lm: [
      { name: 'editor sheet', proto: '#editor .sh', impl: '.p8-ed', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'modes', proto: '#edmodes', impl: '.p8-modes4', box: ['w', 'h'] },
      { name: 'mode on', proto: '#edmodes button.on', impl: '.p8-modes4 [aria-pressed="true"]', box: ['w', 'h'] },
    ],
  },
  leaderboard: {
    owner: 'P9', auth: 'user', shot: 'full',
    open: async (page) => {
      await openReady(page, '/leaderboard', '.p9-tabs');
      await page.waitForFunction(() => !document.querySelector('.p9-pane:not([hidden]) .p9-pin-wait'), undefined, { timeout: 30_000 }).catch(() => {});
    },
    lm: [...NAV, ...PH,
      { name: 'tab on', proto: '.utabs button.on', impl: '.p9-tabs [aria-selected="true"]', box: ['w', 'h'] },
      { name: 'board row', proto: '.lrow', impl: '.p9-pane:not([hidden]) .p9-rows-top > .p9-lrow', box: ['w', 'h'] },
      { name: 'pinned row', proto: '.pin', impl: '.p9-pane:not([hidden]) .ux-pin.is-you', box: ['w', 'h'] },
    ],
  },
  'hub-blackpink': {
    owner: 'P3', auth: 'user', shot: 'full',
    open: (page) => openReady(page, '/blackpink-quiz', '.p3-hub:has(.p3-qs[data-live] .ux-tcard):has(a[href="/blackpink-trivia"]):has(.p3-fan):has(.p3-war):has(.p3-members)'),
    lm: [...NAV,
      { name: 'crumb', proto: '.crumb', impl: '.p3-hub .ux-crumb', box: ['x', 'y', 'w'] },
      { name: 'hub header', proto: '.hub2', impl: '.p3-hub2, .p3-head', box: ['x', 'y', 'w', 'h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.ux-sec-h h2', box: ['h'] },
      { name: 'primary button', proto: '.btn-primary', impl: '.p3-actions .ux-btn-primary', box: ['h'] },
      { name: 'text card', proto: '.tcard', impl: '.ux-tcard', box: ['w'] },
    ],
  },
  'hub-ateez': {
    owner: 'P3', auth: 'user', shot: 'full',
    open: (page) => openReady(page, '/ateez-quiz', '.p3-hub:has(.p3-qs[data-live] .ux-tcard):has(.p3-fan):has(.p3-war):has(a[href="/articles/stray-kids-vs-ateez"])'),
    lm: [...NAV,
      { name: 'crumb', proto: '.crumb', impl: '.p3-hub .ux-crumb', box: ['x', 'y', 'w'] },
      { name: 'hub header', proto: '.hub2', impl: '.p3-hub2, .p3-head', box: ['x', 'y', 'w', 'h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.ux-sec-h h2', box: ['h'] },
      { name: 'primary button', proto: '.btn-primary', impl: '.p3-actions .ux-btn-primary', box: ['h'] },
      { name: 'text card', proto: '.tcard', impl: '.ux-tcard', box: ['w'] },
    ],
  },
  'hub-empty': {
    owner: 'P3', auth: 'user', shot: 'full',
    open: (page) => openReady(page, '/chungha-quiz', '.p3-notify[data-state]'),
    lm: [...NAV,
      { name: 'crumb', proto: '.crumb', impl: '.p3-hub .ux-crumb', box: ['x', 'y', 'w'] },
      { name: 'primary button', proto: '.btn-primary', impl: '.p3-actions .ux-btn-primary', box: ['h'] },
    ],
  },
  passport: {
    owner: 'P10', auth: 'guest', shot: 'full', note: 'checked on /u/testtest as a guest (signed-in /me NOT verified, owner decision 1): no owner controls',
    open: (page) => openPassport(page),
    lm: [...NAV,
      { name: 'band', proto: '.pband', impl: '.p10-band', box: ['x', 'y', 'w', 'h'] },
      { name: 'head', proto: '.phead', impl: '.p10-head', box: ['x', 'w'] },
      { name: 'avatar', proto: '.pav', impl: '.p10-pav', box: ['x', 'y', 'w', 'h'], skip: ['background-image', 'background-color'], why: 'photo' },
      { name: 'stats', proto: '.statsin', impl: '.p10-stats', box: ['x', 'w', 'h'] },
      { name: 'tabs', proto: '#ptabs', impl: '.p10-tabs', box: ['x', 'w', 'h'] },
      { name: 'tab on', proto: '.utabs button.on', impl: '.p10-tabs [aria-selected="true"]', box: ['h'] },
    ],
  },
  'passport-badges': {
    owner: 'P10', auth: 'guest', shot: 'full', note: 'checked on /u/testtest as a guest (signed-in /me NOT verified, owner decision 1)',
    open: async (page) => {
      await openPassport(page);
      const t = page.getByRole('tab', { name: 'Badges' });
      for (let i = 0; i < 3; i++) { await t.click(); if ((await t.getAttribute('aria-selected')) === 'true') break; await page.waitForTimeout(500); }
    },
    lm: [...NAV,
      { name: 'band', proto: '.pband', impl: '.p10-band', box: ['x', 'y', 'w', 'h'] },
      { name: 'tabs', proto: '#ptabs', impl: '.p10-tabs', box: ['x', 'w', 'h'] },
      { name: 'tab on', proto: '.utabs button.on', impl: '.p10-tabs [aria-selected="true"]', box: ['h'] },
      { name: 'medal tile', proto: '.medal2', impl: '.ux-medal2', box: ['w'] },
    ],
  },
  settings: {
    owner: 'P10', auth: 'user', shot: 'full',
    open: async (page) => {
      let res = await page.goto('/settings', { waitUntil: 'domcontentloaded', timeout: 120_000 });
      for (let i = 0; i < 2 && new URL(page.url()).pathname !== '/settings'; i++) res = await page.goto('/settings', { waitUntil: 'domcontentloaded' });
      if (!res || new URL(page.url()).pathname !== '/settings') throw new Error('/settings redirected (session)');
      await page.locator('.p10-settings').waitFor({ timeout: 60_000 });
      await page.locator('.p10-personprev').waitFor({ timeout: 60_000 });
      await waitHydrated(page);
    },
    lm: [...NAV, ...PH,
      { name: 'person preview', proto: '.personprev', impl: '.p10-personprev', box: ['x', 'w'], skip: ['margin-top'], why: 'A0/P10 documented' },
    ],
  },
  'header-sheet': {
    owner: 'P10', auth: 'user', shot: 'viewport', note: 'signed in on /u/testtest (public read page, owner controls on the client); never /me',
    open: async (page) => {
      await openPassport(page);
      await page.locator('.p10-hbtn').waitFor({ state: 'visible', timeout: 45_000 });
      await page.locator('.p10-hbtn').click();
      await page.locator('.ux-layer .ux-sheet').waitFor();
    },
    lm: [
      { name: 'header sheet', proto: '#hsheet .sh', impl: '.ux-layer .ux-sheet', box: ['vx', 'vy', 'w'] },
      { name: 'drop zone', proto: '#hsheet .drop', impl: '.ux-layer .ux-drop', box: ['w', 'h'] },
      { name: 'url row', proto: '#hsheet .urlrow', impl: '.ux-layer .ux-urlrow', box: ['w', 'h'] },
    ],
  },
  notifications: {
    owner: 'P11', auth: 'user', shot: 'full', note: "rows = P11's fixture (the prototype's sample, p11.spec.ts); streak row saved",
    setup: (page) => p11Stub(page),
    open: async (page) => { await openReady(page, '/notifications', '.p11-notifs'); await page.locator('.p11-nrow').first().waitFor({ timeout: 30_000 }); },
    lm: [...NAV,
      { name: 'header', proto: '#notifs .ph', impl: '.p11-nh', box: ['x', 'y', 'w', 'h'] },
      { name: 'filter', proto: '#notifs .seg', impl: '.p11-seg', box: ['x', 'w', 'h'] },
      { name: 'streak row', proto: '#notifs .streakrow', impl: '.p11-streak', box: ['x', 'w', 'h'] },
      { name: 'group', proto: '.ngroup', impl: '.p11-ngroup', box: ['x', 'w'] },
      { name: 'rows', proto: '.nrow', impl: '.p11-nrow', seq: true },
    ],
  },
  search: {
    owner: 'P11', auth: 'user', shot: 'viewport',
    open: async (page) => {
      await openReady(page, '/', '.p1-home');
      await page.locator('.ux-nav-r .ux-sbtn, .ux-nav .ux-sbtn').first().click();
      await page.locator('#ux-sov').waitFor();
      await page.locator('#ux-sov .p11-sres .ux-srow').first().waitFor({ timeout: 30_000 });
    },
    lm: [
      { name: 'overlay', proto: '#sov .sov-in, #sov > div', impl: '#ux-sov > div', box: ['vx', 'vy', 'w'] },
      { name: 'list label', proto: '.sov-l', impl: '.p11-sres .ux-sov-l', box: ['h'] },
      { name: 'result rows', proto: '#sres .srow', impl: '.p11-sres .ux-srow', seq: true },
    ],
  },
  bell: {
    owner: 'P11', auth: 'user', shot: 'viewport',
    setup: (page) => p11Stub(page),
    open: async (page) => {
      await openReady(page, '/', '.p1-home');
      const trigger = page.locator('.ux-nav-r button[aria-label^="Notifications"]');
      await trigger.click();
      await page.locator('.ux-bellpop').waitFor();
      await page.locator('.ux-bellpop .p11-brow').first().waitFor({ timeout: 20_000 }).catch(() => {});
    },
    lm: [
      { name: 'bell panel', proto: '#bellpop', impl: '.ux-bellpop', box: ['vx', 'vy', 'w', 'h'] },
      { name: 'panel header', proto: '#bellpop .pop-h', impl: '.ux-bellpop .ux-pop-h', box: ['w', 'h'] },
      { name: 'rows', proto: '.brow', impl: '.p11-brow', seq: true },
    ],
  },
};

export const AUTH_FILE = path.join(APP, 'e2e/.auth/test-user.json');
export const authReady = () => fs.existsSync(AUTH_FILE);
