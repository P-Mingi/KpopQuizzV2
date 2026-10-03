// C1 (V12 run) drivers, part 2: G5 personality quizzes, G6 Name them all, G7 This or that card.
// Pairs, flows and fixtures from apps/quiz/e2e/ux-v12/g5.spec.ts, g6.spec.ts, g7.spec.ts.
import { NAV, openV12, json } from './drivers-v12.mjs';

const KPDH_URL = '/kpop-demon-hunters-quiz';
const WMA_URL = '/which-stray-kids-member-are-you';
const persOpen = (url) => (page) => openV12(page, url, '[data-testid="pers-intro"]');
async function persAnswer(page, index, step, total) {
  const q = page.getByTestId('pers-question');
  await page.locator(`[data-testid="pers-question"][data-step="${step}"]`).waitFor({ timeout: 20_000 });
  await q.locator('.ux-pers-opt').nth(index).click();
  if (step < total) await page.locator(`[data-testid="pers-question"][data-step="${step + 1}"]`).waitFor({ timeout: 20_000 });
  else await page.getByTestId('pers-result').waitFor({ timeout: 20_000 });
}
async function kpdhQuestion(page) { await persOpen(KPDH_URL)(page); await page.getByRole('button', { name: 'Find my group' }).click(); await page.getByTestId('pers-question').waitFor(); }
async function wmaQuestion(page) { await persOpen(WMA_URL)(page); await page.getByRole('button', { name: 'Start' }).click(); await persAnswer(page, 2, 1, 8); }

export const G5 = {
  'kpdh-intro': { owner: 'G5', auth: 'guest', anchor: null, open: persOpen(KPDH_URL),
    lm: [...NAV, { name: 'intro card', proto: '.pintro', impl: '.ux-pers-intro', box: ['x', 'w', 'h'] }, { name: 'start button', proto: '.btn-primary', impl: '.ux-pers-intro .ux-btn-primary', box: ['w', 'h'] }] },
  'kpdh-question': { owner: 'G5', auth: 'guest', anchor: null, open: kpdhQuestion,
    lm: [...NAV, { name: 'question card', proto: '.pq', impl: '.ux-pers-q', box: ['x', 'w', 'h'] }, { name: 'answer', proto: '.popt', impl: '.ux-pers-opt', box: ['w', 'h'] }] },
  'kpdh-result': { owner: 'G5', auth: 'guest', anchor: null,
    open: async (page) => { await kpdhQuestion(page); const sheet = [0, 0, 3, 0, 0, 0]; for (let i = 0; i < 6; i++) await persAnswer(page, sheet[i], i + 1, 6); },
    note: 'the distribution and the "same result" line show only with real shares (G5); the result card height is compared only when they show',
    lm: [...NAV, { name: 'result card', proto: '.rescard', impl: '.ux-rescard', box: ['x', 'w'], why: 'height: the sample "24% of players" line shows only with real results (G5)' },
      { name: 'traits', proto: '.traits', impl: '.ux-traits', box: ['w', 'h'] },
      { name: 'result button', proto: '.btn-primary', impl: '.ux-rescard .ux-btn-primary', box: ['h'] },
      { name: 'section title', proto: '.sec-h h2', impl: '.ux-pers-sec .ux-sec-h h2', box: ['h'] },
      { name: 'distribution', proto: '.dist', impl: '.ux-dist', box: ['x', 'w'] }] },
  'wma-question': { owner: 'G5', auth: 'guest', anchor: null, open: wmaQuestion,
    lm: [...NAV, { name: 'question card', proto: '.pq', impl: '.ux-pers-q', box: ['x', 'w'], why: 'height: the stored question and answers are not the sample copy (G5)' },
      { name: 'answer', proto: '.popt', impl: '.ux-pers-opt', box: ['w'], why: 'height: stored answer copy wraps differently (G5)' }] },
  'wma-result': { owner: 'G5', auth: 'guest', anchor: null,
    open: async (page) => { await wmaQuestion(page); for (let step = 2; step <= 8; step++) await persAnswer(page, 0, step, 8); },
    lm: [...NAV, { name: 'result card', proto: '.rescard', impl: '.ux-rescard', box: ['x', 'w'], why: 'height: two sentences built from the stored axes (G5)' },
      { name: 'traits', proto: '.traits', impl: '.ux-traits', box: ['w', 'h'] },
      { name: 'bias offer', proto: '.biasoffer', impl: '.ux-pers-bias', box: ['x', 'w'], why: 'height: copy (G5)' },
      { name: 'result button', proto: '.btn-primary', impl: '.ux-rescard .ux-btn-primary', box: ['h'] },
      { name: 'distribution', proto: '.dist', impl: '.ux-dist', box: ['x', 'w'] }] },
};

// ---- G6
const NTA_URL = '/stray-kids-name-all-members';
const ntaOpen = (page) => openV12(page, NTA_URL, '[data-testid="nta"]', { timeout: 60_000 });
async function ntaPlay(page) {
  await ntaOpen(page);
  for (let i = 0; i < 30; i++) {
    await page.getByTestId('nta-start').click({ timeout: 2_000 }).catch(() => {});
    if ((await page.getByTestId('nta').getAttribute('data-state')) === 'play') break;
    await page.waitForTimeout(1000);
  }
  for (const n of ['hyunjin', 'felix']) { await page.locator('#nta-in').fill(n); await page.locator('#nta-in').press('Enter'); }
  await page.locator('.ux-nta-slot.is-found').nth(1).waitFor({ timeout: 10_000 });
}
const NTA_LM = (st) => [...NAV,
  { name: 'game card', proto: '.nta', impl: '.ux-nta', box: st === 'nta-play' ? ['x', 'w', 'h'] : ['x', 'w'], why: st === 'nta-play' ? undefined : 'height: members only, the community line only when its number exists (G6 deviations 1, 2)' },
  ...(st !== 'nta-result' ? [{ name: 'timer ring', proto: '.nring', impl: '.ux-nta-ring', box: ['w', 'h'] }] : []),
  { name: 'member slot', proto: '.ntagrid .slot', impl: '.ux-nta-grid .ux-nta-slot', box: ['w', 'h'] },
  ...(st === 'nta-result' ? [{ name: 'result block', proto: '.ntares', impl: '.ux-nta-res', box: ['x', 'w'], why: 'height: no invented community row (G6)' }] : []),
  { name: 'primary button', proto: '.btn-primary', impl: '.ux-nta .ux-btn-primary', box: ['w', 'h'] },
];
export const G6 = {
  'nta-intro': { owner: 'G6', auth: 'guest', anchor: null, open: ntaOpen, lm: NTA_LM('nta-intro') },
  'nta-play': { owner: 'G6', auth: 'guest', anchor: null, open: ntaPlay, lm: NTA_LM('nta-play') },
  'nta-result': { owner: 'G6', auth: 'guest', anchor: null, note: 'community line NOT verified until v12-g6-name-all.sql is applied (hidden as specified)',
    open: async (page) => { await ntaPlay(page); await page.getByTestId('nta').getByRole('button', { name: 'Give up' }).click(); await page.locator('[data-testid="nta"][data-state="end"]').waitFor(); },
    lm: NTA_LM('nta-result') },
};

// ---- G7 (the prototype's own five BTS pairs, as the G7 spec, so text-driven boxes compare)
const QUIZ = 'ultimate-bts-era-quiz-only-real-armys-survive';
const PAIRS = [['Dynamite', 2020, 'Butter', 2021], ['Spring Day', 2017, 'Blood Sweat & Tears', 2016], ['Fake Love', 2018, 'IDOL', 2018], ['Life Goes On', 2020, 'Permission to Dance', 2021], ['DNA', 2017, 'Boy With Luv', null]];
const sid = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
async function toResults(page) {
  await page.route((u) => u.pathname === '/api/duel/pairs', (r) => json(r, { pairs: PAIRS.map(([ta, ya, tb, yb], i) => ({ token: `c1-token-${i + 1}`, a: { id: sid(i * 2 + 1), title: ta, year: ya, cover: null }, b: { id: sid(i * 2 + 2), title: tb, year: yb, cover: null } })), group: { slug: 'bts', name: 'BTS', fandom: 'ARMY' }, ranked: true }));
  await page.route((u) => u.pathname === '/api/duel/vote', (r) => json(r, { status: 'ok', split: { a: 54, b: 46, total: 100 } }));
  let qs = [];
  await page.route(/\/api\/quiz\/[^/]+\/questions$/, async (route) => { const res = await route.fetch(); const body = await res.json(); qs = body.questions; await route.fulfill({ response: res, json: body }); });
  await openV12(page, `/q/${QUIZ}`, '.p4-act[data-ready], .p4-qq', { timeout: 90_000 });
  await page.locator('.p4-act .ux-btn-primary').click();
  await page.locator('.p4-qq').waitFor({ timeout: 90_000 });
  const answers = page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');
  for (let g = 0; g < 40; g++) {
    const idx = Number(await page.locator('.p4-segs').getAttribute('aria-valuenow')) - 1;
    const q = qs[idx]; await answers.nth(q && typeof q.correct === 'number' ? q.correct : 0).click();
    const next = page.locator('.p4-nextrow .ux-btn-primary'); await next.waitFor({ timeout: 20_000 });
    const label = await next.innerText(); await next.click();
    if (/result/i.test(label)) break;
    await answers.first().waitFor();
  }
  await page.getByTestId('tot').waitFor({ timeout: 30_000 });
}
const TOT_LM = [{ name: 'card', proto: '.tot', impl: '.ux-tot', box: ['x', 'w', 'h'] }, { name: 'song option', proto: '.toto', impl: '.ux-toto', box: ['w', 'h'] }, { name: 'card footer', proto: '.totf', impl: '.ux-tot-f', box: ['w', 'h'] }];
export const G7 = {
  'quiz-bonus': { owner: 'G7', auth: 'guest', anchor: '.ux-tot', open: toResults, note: 'pairs answered by the G7 fixture (the prototype\'s five BTS pairs) so text-driven boxes compare; the save of the play is answered locally', lm: TOT_LM },
  'quiz-bonus-voted': { owner: 'G7', auth: 'guest', anchor: '.ux-tot', pending: 'NOT verified until v12-g7-this-or-that.sql is applied (duel_cast_song_vote: the real vote and split); checked with the vote answered locally by the G7 fixture',
    open: async (page) => { await toResults(page); await page.locator('.ux-toto').first().click(); await page.locator('[data-testid="tot"][data-state="voted"]').waitFor(); }, lm: TOT_LM },
};
