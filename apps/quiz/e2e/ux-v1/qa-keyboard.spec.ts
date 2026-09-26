import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@playwright/test';

import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { hasShell, preparePage, waitHydrated, widthOf } from './helpers/setup-page';

import type { Locator, Page, Route } from '@playwright/test';

// C3 QA (v11 briefs/C3.md step 2): keyboard + screen reader pass on the flag-on
// build, light theme, at the project width (1440 / 390).
//  1. Keyboard walk of every v11 page: Tab from the top until focus cycles; every
//     visible control is reached, every stop shows a focus indicator, focus never
//     falls back to <body> mid-walk. Disclosures (aria-expanded) open with Enter
//     and close with Escape, focus back on the trigger. Links are never followed.
//  2. Sheets and popovers: role, accessible name, aria-modal, describedby targets,
//     focus moves in, Tab is trapped (modal), X / Escape / backdrop close, focus
//     returns to the trigger.
//  3. Game semantics: the live region announces the result of an answer (quiz and
//     blindtest), the question is focused, the timer is a named timer.
// Writes are answered locally (guardWrites). QA_OUT=<dir> appends every result to
// <dir>/qa-keyboard.jsonl.

const env = loadTestEnv();
test.describe.configure({ timeout: 180_000 });
signedInTest.describe.configure({ timeout: 180_000 });

const OUT = process.env.QA_OUT;
function record(entry: Record<string, unknown>): void {
  if (!OUT) return;
  fs.mkdirSync(OUT, { recursive: true });
  fs.appendFileSync(path.join(OUT, 'qa-keyboard.jsonl'), `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`);
}

const QUIZ = '/q/ultimate-bts-era-quiz-only-real-armys-survive';

// Same helpers as qa-a11y.spec.ts (a spec cannot import another spec, and e2e/ux-v1/helpers/ is A0's).
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

const WALK: { id: string; owner: string; path: string; ready: string; pending?: string }[] = [
  { id: 'home-guest', owner: 'P1', path: '/', ready: '.p1-home' },
  { id: 'quizzes', owner: 'P2', path: '/quizzes', ready: '.ux-main', pending: 'P2 not merged' },
  { id: 'groups', owner: 'P3', path: '/groups', ready: '.p3-groups' },
  { id: 'hub-blackpink', owner: 'P3', path: '/blackpink-quiz', ready: '.p3-hub' },
  { id: 'hub-empty', owner: 'P3', path: '/chungha-quiz', ready: '.p3-hub' },
  { id: 'quiz', owner: 'P4', path: QUIZ, ready: '.p4-act[data-ready]' },
  { id: 'create-1', owner: 'P5', path: '/create', ready: '.p5-col[data-ready="1"]' },
  { id: 'blindtest', owner: 'P6', path: '/blindtest', ready: '.p6-hub[data-live]' },
  { id: 'ranked', owner: 'P7', path: '/blindtest/ranked', ready: '.p7-page' },
  { id: 'community', owner: 'P8', path: '/community', ready: '.p8-page' },
  { id: 'post-blog', owner: 'P8', path: '/community/blog/2', ready: '.p8-post-page' },
  { id: 'post-debate', owner: 'P8', path: '/community/debate/2026-09-22', ready: '.p8-post-page' },
  { id: 'leaderboard', owner: 'P9', path: '/leaderboard', ready: '.p9-lb' },
  { id: 'passport', owner: 'P10', path: '/u/testtest', ready: '.p10-passport' },
];

interface Stop { i: number; qa: string | null; tag: string; name: string; ring: boolean; inView: boolean }

/** Tags every visible focusable control (data-qa-k) and returns their count. */
async function tagCandidates(page: Page): Promise<number> {
  return page.evaluate(() => {
    const sel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
    let n = 0;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(sel))) {
      if (el.closest('[inert], [aria-hidden="true"], nextjs-portal')) continue;
      if (el.tabIndex < 0) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width < 1 || r.height < 1 || cs.visibility === 'hidden' || !el.checkVisibility({ opacityProperty: false, visibilityProperty: true })) continue;
      // a radio group is one tab stop: only the checked (or first) radio counts
      if (el instanceof HTMLInputElement && el.type === 'radio' && el.name) {
        const group = Array.from(document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${CSS.escape(el.name)}"]`));
        const stop = group.find((g) => g.checked) ?? group[0];
        if (stop !== el) continue;
      }
      el.dataset.qaK = String(n++);
      // the unfocused look, to tell a focus indicator that is not an outline or a shadow
      // (a border or background change, as the prototype's search field) from none
      const look = (e: Element): string => { const s = getComputedStyle(e); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderBottomWidth, s.backgroundColor, s.color, s.textDecorationLine].join('|'); };
      el.dataset.qaLook = look(el);
      if (el.parentElement) el.dataset.qaLookP = look(el.parentElement);
    }
    return n;
  });
}

async function readStop(page: Page, i: number): Promise<Stop> {
  const read = (): Promise<Omit<Stop, 'i'>> => page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return { qa: null, tag: 'body', name: '', ring: false, inView: false };
    const own = (e: Element): boolean => {
      const cs = getComputedStyle(e);
      const outline = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 1;
      return outline || (cs.boxShadow !== 'none' && cs.boxShadow !== '');
    };
    // an indicator can sit on the control or on its wrapper (:focus-within): an outline, a
    // shadow, or any visible change of border, background, colour or underline vs unfocused
    const look = (e: Element): string => { const s = getComputedStyle(e); return [s.outlineStyle, s.outlineWidth, s.outlineColor, s.boxShadow, s.borderTopColor, s.borderBottomColor, s.borderBottomWidth, s.backgroundColor, s.color, s.textDecorationLine].join('|'); };
    let ring = own(el) || (el.dataset.qaLook !== undefined && look(el) !== el.dataset.qaLook);
    if (!ring && el.parentElement && el.dataset.qaLookP !== undefined) ring = look(el.parentElement) !== el.dataset.qaLookP;
    for (let p = el.parentElement, k = 0; !ring && p && k < 3; p = p.parentElement, k++) ring = own(p) && p.matches(':focus-within');
    const r = el.getBoundingClientRect();
    const inView = r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
    const name = (el.getAttribute('aria-label') || el.textContent || (el as HTMLInputElement).placeholder || el.getAttribute('href') || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    return { qa: el.dataset.qaK ?? null, tag: `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').filter(Boolean).slice(0, 2).join('.') : ''}`, name, ring, inView };
  });
  let s = await read();
  if (!s.ring && s.qa !== null) { await page.waitForTimeout(350); s = await read(); }
  return { i, ...s };
}

async function walk(page: Page, max = 400): Promise<{ stops: Stop[]; candidates: number; unreached: string[] }> {
  const candidates = await tagCandidates(page);
  await page.evaluate(() => { (document.activeElement as HTMLElement | null)?.blur(); window.scrollTo(0, 0); });
  const stops: Stop[] = [];
  const seen = new Set<string>();
  let firstKey: string | null = null;
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab');
    const s = await readStop(page, i);
    const key = s.qa ?? `${s.tag}|${s.name}`;
    if (i > 2 && key === firstKey) break; // full cycle
    if (firstKey === null && s.tag !== 'body') firstKey = key;
    stops.push(s);
    if (s.qa !== null) seen.add(s.qa);
  }
  const unreached = await page.evaluate((reached) => {
    const set = new Set(reached);
    return Array.from(document.querySelectorAll<HTMLElement>('[data-qa-k]'))
      .filter((el) => !set.has(el.dataset.qaK ?? ''))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width >= 1 && r.height >= 1 && el.checkVisibility(); })
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.')} "${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('href') || '').replace(/\s+/g, ' ').trim().slice(0, 50)}"`);
  }, [...seen]);
  return { stops, candidates, unreached };
}

/** Enter opens every aria-expanded trigger reached; Escape closes it and focus comes back. */
async function disclosures(page: Page): Promise<{ checked: number; failed: string[] }> {
  const triggers = page.locator('[aria-expanded]:not([disabled])');
  const n = Math.min(await triggers.count(), 12);
  const failed: string[] = [];
  let checked = 0;
  for (let i = 0; i < n; i++) {
    const t = triggers.nth(i);
    if (!(await t.isVisible())) continue;
    const tag = await t.evaluate((el) => el.tagName.toLowerCase());
    if (tag === 'a') continue; // a link is never followed here
    const label = ((await t.getAttribute('aria-label')) || (await t.innerText()).trim()).slice(0, 40);
    if (/sign out|delete/i.test(label)) continue;
    const before = await t.getAttribute('aria-expanded');
    if (before === 'true') continue;
    await t.focus();
    // a combobox opens with ArrowDown (APG combobox), a button with Enter
    const combo = (await t.getAttribute('role')) === 'combobox' || tag === 'input';
    await page.keyboard.press(combo ? 'ArrowDown' : 'Enter');
    await page.waitForTimeout(300);
    const opened = (await t.getAttribute('aria-expanded')) === 'true';
    checked++;
    if (!opened) { failed.push(`"${label || tag}": ${combo ? 'ArrowDown' : 'Enter'} did not open (aria-expanded stayed ${before})`); continue; }
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const closed = (await t.getAttribute('aria-expanded')) !== 'true';
    const back = await t.evaluate((el) => document.activeElement === el);
    if (!closed) { failed.push(`"${label}": Escape did not close`); await t.click().catch(() => {}); continue; }
    if (!back) failed.push(`"${label}": focus did not return to the trigger after Escape`);
  }
  return { checked, failed };
}

interface DialogResult { name: string; role: string | null; modal: string | null; accName: string; describedByOk: boolean; focusInside: boolean; trapOk: boolean | null; escape: boolean; escapeFocus: boolean; x: boolean | null; xFocus: boolean | null; backdrop: boolean | null; backdropFocus: boolean | null; notes: string[] }

async function dialogInfo(d: Locator): Promise<{ role: string | null; modal: string | null; accName: string; describedByOk: boolean; focusInside: boolean }> {
  return d.evaluate((el) => {
    const by = el.getAttribute('aria-labelledby');
    const accName = (el.getAttribute('aria-label') || (by ? by.split(/\s+/).map((i) => document.getElementById(i)?.textContent ?? '').join(' ') : '')).trim();
    const desc = el.getAttribute('aria-describedby');
    const describedByOk = !desc || desc.split(/\s+/).every((i) => Boolean(document.getElementById(i)?.textContent?.trim()));
    return { role: el.getAttribute('role'), modal: el.getAttribute('aria-modal'), accName, describedByOk, focusInside: el.contains(document.activeElement) };
  });
}

async function checkDialog(page: Page, name: string, trigger: Locator, dialog: () => Locator, opts: { modal: boolean; closeX?: boolean; backdrop?: boolean }): Promise<DialogResult> {
  const notes: string[] = [];
  const open = async (): Promise<void> => {
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(dialog()).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(250);
  };
  const focusOnTrigger = (): Promise<boolean> => trigger.evaluate((el) => document.activeElement === el);
  await open();
  const info = await dialogInfo(dialog());
  let trapOk: boolean | null = null;
  if (opts.modal) {
    trapOk = true;
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press(i % 5 === 4 ? 'Shift+Tab' : 'Tab');
      if (!(await dialog().evaluate((el) => el.contains(document.activeElement)))) { trapOk = false; notes.push(`focus left the dialog after ${i + 1} Tab presses`); break; }
    }
  }
  await page.keyboard.press('Escape');
  const escape = await dialog().isHidden({ timeout: 5_000 }).catch(() => false) || await expect(dialog()).toBeHidden({ timeout: 5_000 }).then(() => true, () => false);
  await page.waitForTimeout(200);
  const escapeFocus = await focusOnTrigger();
  let x: boolean | null = null; let xFocus: boolean | null = null;
  if (opts.closeX !== false) {
    await open();
    const close = dialog().getByRole('button', { name: /^close$/i }).first();
    if (await close.count()) {
      await close.click();
      x = await expect(dialog()).toBeHidden({ timeout: 5_000 }).then(() => true, () => false);
      await page.waitForTimeout(200);
      xFocus = await focusOnTrigger();
    } else { notes.push('no Close (X) button'); await page.keyboard.press('Escape'); }
  }
  let backdrop: boolean | null = null; let backdropFocus: boolean | null = null;
  if (opts.backdrop !== false) {
    await open();
    const box = await dialog().boundingBox();
    const vp = page.viewportSize() ?? { width: 1440, height: 900 };
    // a point outside the dialog: top-left corner, or just above a bottom sheet
    const pt = box && box.y > 40 ? { x: 8, y: Math.max(8, box.y - 20) } : { x: 8, y: vp.height - 8 };
    await page.mouse.click(pt.x, pt.y);
    backdrop = await expect(dialog()).toBeHidden({ timeout: 5_000 }).then(() => true, () => false);
    await page.waitForTimeout(200);
    backdropFocus = await focusOnTrigger();
    if (!backdrop) await page.keyboard.press('Escape');
  }
  return { name, ...info, trapOk, escape, escapeFocus, x, xFocus, backdrop, backdropFocus, notes };
}

function dialogProblems(r: DialogResult, modal: boolean): string[] {
  const p: string[] = [];
  if (!['dialog', 'alertdialog', 'menu'].includes(r.role ?? '')) p.push(`role=${r.role}`);
  if (modal && r.modal !== 'true') p.push('aria-modal missing');
  if (!r.accName) p.push('no accessible name');
  if (!r.describedByOk) p.push('aria-describedby target missing or empty');
  // A modal sheet must take focus and give it back on every close. A non-modal popover
  // must close with Escape and give focus back; a click outside may move focus where
  // the pointer went (native behaviour), so it is recorded, not required.
  if (modal && !r.focusInside) p.push('focus did not move into the dialog on open');
  if (r.trapOk === false) p.push('Tab not trapped');
  if (!r.escape) p.push('Escape did not close');
  if (!r.escapeFocus) p.push('focus not returned after Escape');
  if (r.x === false) p.push('X did not close');
  if (r.xFocus === false) p.push('focus not returned after X');
  if (r.backdrop === false) p.push('backdrop click did not close');
  if (modal && r.backdropFocus === false) p.push('focus not returned after backdrop click');
  return p;
}

test.describe('QA keyboard walk (light)', () => {
  test.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });
  for (const c of WALK) {
    test(`${c.id} (${c.path})`, async ({ page }) => {
      const calls = await guardWrites(page, env.supabaseUrl);
      // never follow a link during the walk
      await page.addInitScript(() => document.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest?.('a[href]')) e.preventDefault(); }, true));
      test.skip(!(await openPage(page, c)), 'flag off');
      const w = await walk(page);
      const noRing = w.stops.filter((s) => s.qa !== null && !s.ring).map((s) => `${s.tag} "${s.name}"`);
      const lost = w.stops.filter((s, i) => s.tag === 'body' && i > 0 && i < w.stops.length - 1);
      const d = await disclosures(page);
      record({ kind: 'walk', state: c.id, owner: c.owner, width: widthOf(page), url: c.path, pending: c.pending ?? null, candidates: w.candidates, stops: w.stops.length, reached: new Set(w.stops.map((s) => s.qa).filter(Boolean)).size, unreached: w.unreached, noRing: [...new Set(noRing)], focusToBody: lost.length, disclosures: d, writes: calls.map((x) => `${x.method} ${new URL(x.url).pathname}`) });
      expect.soft(w.unreached, 'every visible control is reached by Tab').toEqual([]);
      expect.soft([...new Set(noRing)], 'every Tab stop shows a focus indicator').toEqual([]);
      expect.soft(lost.length, 'focus never falls back to <body> mid-walk').toBe(0);
      expect(d.failed, 'disclosures open with Enter, close with Escape, focus returns').toEqual([]);
    });
  }
});

test.describe('QA sheets and popovers (guest, light)', () => {
  test.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });

  test('search overlay and sign-in sheet (shell)', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openPage(page, { path: '/', ready: '.ux-main' })), 'flag off');
    const s = await checkDialog(page, 'search', page.locator('.ux-nav-r .ux-sbtn'), () => page.locator('#ux-sov'), { modal: true });
    const si = await checkDialog(page, 'sign-in sheet', page.locator('.ux-nav-signin'), () => page.locator('.ux-sheet'), { modal: true });
    for (const r of [s, si]) record({ kind: 'dialog', state: r.name, owner: r.name === 'search' ? 'P11/A0' : 'A0', width: widthOf(page), result: r, problems: dialogProblems(r, true) });
    expect.soft(dialogProblems(s, true), 'search overlay').toEqual([]);
    expect(dialogProblems(si, true), 'sign-in sheet').toEqual([]);
  });

  test('share sheet (quiz page)', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openPage(page, { path: QUIZ, ready: '.p4-act[data-ready]' })), 'flag off');
    const r = await checkDialog(page, 'share', page.getByRole('button', { name: 'Share this quiz' }), () => page.getByRole('dialog', { name: 'Share this quiz' }), { modal: true });
    record({ kind: 'dialog', state: 'share', owner: 'P4/A0', width: widthOf(page), result: r, problems: dialogProblems(r, true) });
    expect(dialogProblems(r, true)).toEqual([]);
  });

  test('quit confirm (quiz game, after an answer)', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openPage(page, { path: QUIZ, ready: '.p4-act[data-ready]' })), 'flag off');
    await page.locator('.p4-act .ux-btn-primary').click();
    await expect(page.locator('.p4-qq')).toBeVisible({ timeout: 90_000 });
    await page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians').first().click();
    // the game moves focus to Next 60 ms after an answer: open the confirm after that, as a person would
    await expect(page.locator('.p4-nextrow .ux-btn-primary')).toBeFocused();
    const r = await checkDialog(page, 'quit confirm', page.getByRole('button', { name: 'Quit quiz' }), () => page.locator('.ux-sheet[role="alertdialog"], .ux-sheet[role="dialog"]').first(), { modal: true });
    record({ kind: 'dialog', state: 'quit confirm', owner: 'P4/A0', width: widthOf(page), result: r, problems: dialogProblems(r, true) });
    expect(dialogProblems(r, true)).toEqual([]);
  });

  test('blindtest playlist menu (popover)', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    await blindtestFixtures(page);
    test.skip(!(await openPage(page, { path: '/blindtest', ready: '.p6-hub[data-live]' })), 'flag off');
    await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 30_000 });
    const r = await checkDialog(page, 'playlist menu', page.locator('.p6-pl'), () => page.locator('.p6-plmenu'), { modal: false, closeX: false });
    record({ kind: 'dialog', state: 'blindtest-playlist-open', owner: 'P6/A0', width: widthOf(page), result: r, problems: dialogProblems(r, false) });
    expect(dialogProblems(r, false)).toEqual([]);
  });

  test('community editor (new post sheet)', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openPage(page, { path: '/community', ready: '.p8-page' })), 'flag off');
    const r = await checkDialog(page, 'editor', page.locator('.p8-composer-in'), () => page.locator('.p8-ed'), { modal: true });
    record({ kind: 'dialog', state: 'editor', owner: 'P8/A0', width: widthOf(page), result: r, problems: dialogProblems(r, true) });
    expect(dialogProblems(r, true)).toEqual([]);
  });
});

signedInTest.describe('QA sheets and popovers (signed in, read only, light)', () => {
  signedInTest.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });

  signedInTest('bell popover, account menu, header sheet (/u/testtest as its owner)', async ({ page }) => {
    skipUnlessSignedIn();
    await guardWrites(page, env.supabaseUrl);
    await page.addInitScript(() => document.addEventListener('click', (e) => { if ((e.target as Element | null)?.closest?.('a[href]')) e.preventDefault(); }, true));
    signedInTest.skip(!(await openPage(page, { path: '/u/testtest', ready: '.p10-passport' })), 'flag off');
    const results: { r: DialogResult; modal: boolean; owner: string }[] = [];
    const bell = page.locator('.ux-nav-r button[aria-label^="Notifications"]');
    if (await bell.count()) {
      const id = await bell.getAttribute('aria-controls');
      results.push({ r: await checkDialog(page, 'bell', bell, () => page.locator(`[id="${id}"]`), { modal: false, closeX: false }), modal: false, owner: 'P11/A0' });
    }
    const ava = page.locator('.ux-avabtn');
    if (await ava.count() && await ava.isVisible()) {
      const id = await ava.getAttribute('aria-controls');
      results.push({ r: await checkDialog(page, 'account menu', ava, () => page.locator(`[id="${id}"]`), { modal: false, closeX: false }), modal: false, owner: 'A0' });
    }
    const hbtn = page.locator('.p10-hbtn');
    if (await hbtn.waitFor({ state: 'visible', timeout: 30_000 }).then(() => true, () => false)) {
      results.push({ r: await checkDialog(page, 'header-sheet', hbtn, () => page.locator('.ux-sheet[role="dialog"]').first(), { modal: true }), modal: true, owner: 'P10/A0' });
    }
    for (const { r, modal, owner } of results) record({ kind: 'dialog', state: r.name, owner, width: widthOf(page), who: 'signed-in', result: r, problems: dialogProblems(r, modal) });
    for (const { r, modal } of results) expect.soft(dialogProblems(r, modal), r.name).toEqual([]);
    expect(results.length).toBeGreaterThan(0);
  });
});

test.describe('QA screen reader semantics of the games (guest, light)', () => {
  test.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });

  test('quiz: named timer, focused question, live region announces the answer and the result', async ({ page }) => {
    const calls = await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openPage(page, { path: QUIZ, ready: '.p4-act[data-ready]' })), 'flag off');
    const live = page.getByTestId('ux-live');
    await expect(live).toHaveAttribute('aria-live', 'polite');
    await page.locator('.p4-act .ux-btn-primary').click();
    await expect(page.locator('.p4-qq')).toBeVisible({ timeout: 90_000 });
    const timer = await page.getByRole('timer').first().getAttribute('aria-label');
    const focused = await page.evaluate(() => { const a = document.activeElement; return a ? `${a.tagName.toLowerCase()}${a.className ? '.' + String(a.className).split(' ')[0] : ''}` : null; });
    const group = await page.getByRole('group', { name: 'Answers' }).count();
    await page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians').first().click();
    await expect(live).toHaveText(/The answer is/, { timeout: 10_000 });
    const afterAnswer = await live.innerText();
    await page.locator('.p4-nextrow .ux-btn-primary').click();
    const answers = page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');
    for (let g = 0; g < 40; g++) {
      await expect(answers.first()).toBeEnabled({ timeout: 30_000 });
      await answers.first().click();
      const next = page.locator('.p4-nextrow .ux-btn-primary');
      const label = await next.innerText();
      await next.click();
      if (/result/i.test(label)) break;
    }
    await expect(live).toHaveText(/Quiz finished/, { timeout: 30_000 });
    const atEnd = await live.innerText();
    const h1 = await page.locator('h1').allInnerTexts();
    record({ kind: 'sr', state: 'quiz game', owner: 'P4', width: widthOf(page), timer, focusedOnQuestion: focused, answersGroup: group, afterAnswer, atEnd, h1, writes: calls.map((x) => `${x.method} ${new URL(x.url).pathname}`) });
    expect(timer ?? '').toMatch(/seconds left|timer/i);
    expect(group).toBeGreaterThan(0);
    expect(h1.length).toBe(1);
  });

  test('blindtest: live region announces each reveal and the result', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    await blindtestFixtures(page);
    test.skip(!(await openPage(page, { path: '/blindtest', ready: '.p6-hub[data-live]' })), 'flag off');
    await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 30_000 });
    const live = page.getByTestId('ux-live');
    await page.locator('.p6-setup .ux-btn-primary').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible({ timeout: 30_000 });
    const answersGroup = await page.locator('.p6-play [role="group"], .p6-play [role="radiogroup"]').count();
    await page.locator('.p6-ans').first().click();
    await expect(live).not.toHaveText('', { timeout: 10_000 });
    const afterAnswer = await live.innerText();
    await page.locator('.p6-next').click();
    for (let i = 1; i < 10; i++) {
      await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4, { timeout: 20_000 });
      await page.locator('.p6-ans').first().click();
      await page.locator('.p6-next').click();
    }
    await expect(page.locator('.p6-btcard')).toBeVisible({ timeout: 20_000 });
    await page.waitForTimeout(800);
    const atEnd = await live.innerText();
    const h1 = await page.locator('h1').allInnerTexts();
    record({ kind: 'sr', state: 'blindtest game', owner: 'P6', width: widthOf(page), answersGroup, afterAnswer, atEnd, h1 });
    expect(afterAnswer.length).toBeGreaterThan(0);
    expect(h1.length).toBe(1);
  });
});
