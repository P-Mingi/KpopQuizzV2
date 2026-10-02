import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect } from '@playwright/test';

import { LocalLive } from '../../scripts/live-load/local-fake';
import { LIVE_TOKEN_HEADER } from '../../src/lib/live/constants';
import { fakeCorrect } from '../../src/lib/live/fake';
import { encodeQr, qrPath } from '../../src/lib/live/qr';
import { basicA11y, runAxe } from '../ux-v1/helpers/a11y';
import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';
import { OWNER_DEVIATIONS } from '../ux-v1/helpers/landmarks';
import { horizontalOverflow, preparePage, THEMES, widthOf } from '../ux-v1/helpers/setup-page';

import type { GeneratedQuestion } from '../../src/lib/live/fake';
import type { StubbedCall } from '../ux-v1/helpers/guard';
import type { Theme } from '../ux-v1/helpers/setup-page';
import type { Browser, BrowserContext, Page, WebSocketRoute } from '@playwright/test';

// G4 live blindtest: one host screen (/live) and phones (/join), played in real
// browsers. NOTHING here reaches production: the live API and the generate route
// are answered locally by the real service over the memory store, and Realtime is
// answered locally by a fake of the channel protocol (scripts/live-load/local-fake.ts).
// Every page is also wrapped with guardWrites, and each test asserts that no
// other mutating request was even attempted.
//
// Runs in the ux-1440 and ux-390 projects (the host at the project width, the
// phones always at 390 x 844) on a dev server with NEXT_PUBLIC_UX_V1=1 and
// NEXT_PUBLIC_UX_V12=1. With NEXT_PUBLIC_BT_TRACKING unset (the brief): a beacon
// sent at page teardown can escape a route.
//
// G4_EXPECT=v12 | off makes the flag state an assertion. G4_SHOTS=<dir> saves the
// state captures and the landmark numbers of the report.

const here = path.dirname(fileURLToPath(import.meta.url));
const STYLES_JSON = path.resolve(here, '../../../../docs/design/growth-v12/run/checks/reference/styles.json');
type StyleMap = Record<string, string>;
const REFERENCE = JSON.parse(fs.readFileSync(STYLES_JSON, 'utf8')) as Record<string, Record<string, StyleMap>>;

const env = loadTestEnv();
const EXPECT = process.env.G4_EXPECT as 'v12' | 'off' | undefined;
const SHOTS = process.env.G4_SHOTS;

// A silent clip (44 bytes of WAV header, no samples): what the host "plays".
const SILENT_WAV = Buffer.from('UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=', 'base64');

interface Wired {
  /** Mutating requests that were NOT the live API or generate: must stay empty. */
  writes: StubbedCall[];
  /** Clip requests of this page (the audio plays on the host only). */
  clips: string[];
  sockets: WebSocketRoute[];
}

/** Answer everything a live page talks to locally. Call before page.goto. */
async function wire(page: Page, local: LocalLive): Promise<Wired> {
  const writes = await guardWrites(page, env.supabaseUrl);
  const clips: string[] = [];
  const sockets: WebSocketRoute[] = [];
  await page.route((url) => url.pathname.startsWith('/api/live') || url.pathname === '/api/blind-test/generate', async (route) => {
    const req = route.request();
    const r = await local.api(req.method(), new URL(req.url()).pathname, { [LIVE_TOKEN_HEADER]: req.headers()[LIVE_TOKEN_HEADER] }, req.postData());
    await route.fulfill({ status: r.status, contentType: 'application/json', body: JSON.stringify(r.body) });
  });
  await page.route((url) => url.hostname.endsWith('dzcdn.net'), async (route) => {
    clips.push(route.request().url());
    await route.fulfill({ status: 200, contentType: 'audio/wav', body: SILENT_WAV });
  });
  await page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    sockets.push(ws);
    const conn = local.connect({ send: (text) => { try { ws.send(text); } catch { /* closed */ } } });
    ws.onMessage((m) => conn.onMessage(m));
    ws.onClose(() => conn.onClose());
    // A closed tab does not say goodbye: the server side notices the dead socket.
    page.once('close', () => conn.onClose());
  });
  return { writes, clips, sockets };
}

type FlagState = 'v12' | 'off';

async function openLive(page: Page): Promise<FlagState> {
  const res = await page.goto('/live');
  if (!res || res.status() === 404 || new URL(page.url()).pathname !== '/live') return 'off';
  if ((await page.locator('.ux-live-screen').count()) === 0) return 'off';
  // The island decided whether the mode is open (its first call to /api/live came back).
  await expect(page.locator('.ux-live-screen')).not.toHaveAttribute('data-open', 'checking', { timeout: 20_000 });
  return 'v12';
}

interface Phone { ctx: BrowserContext; page: Page; wired: Wired }

async function newPhone(browser: Browser, local: LocalLive, theme: Theme = 'light'): Promise<Phone> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await preparePage(page, theme);
  const wired = await wire(page, local);
  return { ctx, page, wired };
}

/** Open a join page and wait until its island is interactive (a dev server hydrates late). */
async function gotoJoin(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator('.ux-live-join .ux-live-pbody')).toHaveAttribute('data-ready', '1', { timeout: 20_000 });
}

/** Join from the join page: /join/<code> (the QR link) or /join with the code typed. */
async function joinRoom(p: Phone, code: string, nickname: string, opts: { typeCode?: boolean; colour?: number } = {}): Promise<void> {
  await gotoJoin(p.page, opts.typeCode ? '/join' : `/join/${code}`);
  const form = p.page.locator('.ux-live-join form');
  await expect(form).toBeVisible();
  if (opts.typeCode) await form.getByLabel('Room code').fill(code.toLowerCase());
  else await expect(form.getByLabel('Room code')).toHaveValue(code);
  await form.getByLabel('Nickname').fill(nickname);
  if (opts.colour !== undefined) await form.getByRole('radio', { name: `Colour ${opts.colour + 1}` }).click();
  await form.getByRole('button', { name: 'Join' }).click();
  await expect(p.page.locator('.ux-live-pmsg b')).toHaveText('You are in!');
}

const screen = (page: Page) => page.locator('.ux-live-screen');
const ctl = (page: Page) => page.locator('.ux-live-ctl');
const phoneMsg = (p: Phone) => p.page.locator('.ux-live-pmsg b');
const phoneFoot = (p: Phone) => p.page.locator('.ux-live-pfoot');

async function openRoom(page: Page, local: LocalLive, opts: { rounds?: 5 | 10 | 15; seconds?: 10 | 15 | 20 } = {}): Promise<string> {
  if (opts.rounds) await screen(page).getByRole('group', { name: 'Rounds' }).getByRole('button', { name: String(opts.rounds), exact: true }).click();
  if (opts.seconds) await screen(page).getByRole('group', { name: 'Seconds' }).getByRole('button', { name: `${opts.seconds} s`, exact: true }).click();
  await ctl(page).getByRole('button', { name: 'Open the room' }).click();
  await expect(screen(page)).toHaveAttribute('data-state', 'lobby');
  const code = (await page.locator('.ux-live-code').innerText()).trim();
  expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  expect([...local.live.store.rooms.values()].some((r) => r.code === code)).toBe(true);
  return code;
}

function roomOf(local: LocalLive, code: string) {
  const room = [...local.live.store.rooms.values()].find((r) => r.code === code);
  if (!room) throw new Error(`no room ${code}`);
  return room;
}

const pts = (n: number): string => n.toLocaleString('en-US');

// ---------------------------------------------------------------------------
// Landmarks against the pinned prototype (run/checks/reference/styles.json).
// ---------------------------------------------------------------------------

const PROPS = ['width', 'height', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top',
  'border-top-width', 'border-top-color', 'border-radius', 'background-color', 'background-image', 'color', 'font-size',
  'font-weight', 'line-height', 'letter-spacing', 'box-shadow', 'gap'] as const;

interface Landmark { proto: string; impl: string }
const LM: Record<string, Landmark> = {
  screen: { proto: '.screen', impl: '.ux-live-screen' },
  phone: { proto: '.phone', impl: '.ux-live-phone' },
  lobby: { proto: '.lobby', impl: '.ux-live-lobby' },
  qrbox: { proto: '.qrbox', impl: '.ux-live-qrbox' },
  players: { proto: '.players', impl: '.ux-live-players' },
  lt: { proto: '.ltiles .lt', impl: '.ux-live-screen .ux-ltiles .ux-lt' },
  pb: { proto: '.pbtns .pb', impl: '.ux-live-phone .ux-pbtns .ux-pb' },
  reveal: { proto: '.reveal2', impl: '.ux-live-round2.is-reveal' },
  board: { proto: '.board', impl: '.ux-live-board' },
  podium: { proto: '.podium2', impl: '.ux-live-podium' },
  primary: { proto: '.btn-primary', impl: '.ux-live-ctl .ux-btn-primary' },
  steps: { proto: '.steps3', impl: '.ux-live-page .ux-steps3' },
  h2: { proto: '.sec-h h2', impl: '.ux-live-page .ux-sec-h h2' },
};

interface Deviation { prefix: string[]; state: string; proto: string; prop: string; from: string; to: string; why: string }
/**
 * Expected values that differ from the capture: each exact (a new expected value,
 * never a skip), each with its reason. The v11 owner deviations apply on top.
 */
const G4_DEVIATIONS: Deviation[] = [
  // The prototype's podium has three fixed 130px columns (414px) in a 312px phone
  // screen: its own capture is 452px wide and scrolls sideways (m-live-end: .screen
  // 452px). C1 asks for no sideways scroll at 390, so the columns share the width.
  { prefix: ['m', 'mk'], state: 'live-end', proto: '.screen', prop: 'width', from: '452px', to: '350px', why: 'no sideways scroll at 390: the podium columns shrink to the screen' },
  { prefix: ['m', 'mk'], state: 'live-end', proto: '.podium2', prop: 'width', from: '414px', to: '312px', why: 'same: three columns in 312px' },
];

function refKey(width: number, theme: Theme, state: string): string {
  return `${width > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}-${state}`;
}

function expectedStyles(width: number, theme: Theme, state: string, l: Landmark): StyleMap | null {
  const key = refKey(width, theme, state);
  const raw = REFERENCE[key]?.[l.proto];
  if (!raw) return null;
  const out: StyleMap = { ...raw };
  const prefix = key.split('-')[0] ?? '';
  for (const d of G4_DEVIATIONS) if (d.prefix.includes(prefix) && d.state === state && d.proto === l.proto && out[d.prop] === d.from) out[d.prop] = d.to;
  for (const d of OWNER_DEVIATIONS) if (d.theme === theme && (d.proto === '*' || d.proto === l.proto) && out[d.prop] === d.from) out[d.prop] = d.to;
  return out;
}

const norm = (v: string): string => v.replace(/\s+/g, ' ').trim();
function close(a: string, b: string): boolean {
  if (norm(a) === norm(b)) return true;
  return /^-?[\d.]+px$/.test(a.trim()) && /^-?[\d.]+px$/.test(b.trim()) && Math.abs(parseFloat(a) - parseFloat(b)) <= 2;
}

interface Row { state: string; landmark: string; prop: string; expected: string; actual: string }

async function measure(page: Page, width: number, theme: Theme, state: string, marks: Landmark[], skip: Partial<Record<string, string[]>> = {}): Promise<{ checked: number; missing: string[]; mismatches: Row[]; rows: unknown[] }> {
  const got = await page.evaluate(({ sels, props }) => {
    const out: Record<string, Record<string, string> | null> = {};
    for (const s of sels) {
      const el = document.querySelector<HTMLElement>(s);
      if (!el || el.offsetParent === null) { out[s] = null; continue; }
      const cs = getComputedStyle(el);
      out[s] = Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)]));
    }
    return out;
  }, { sels: marks.map((m) => m.impl), props: [...PROPS] });
  const missing: string[] = [];
  const mismatches: Row[] = [];
  const rows: unknown[] = [];
  let checked = 0;
  for (const l of marks) {
    const exp = expectedStyles(width, theme, state, l);
    expect(exp, `reference has ${l.proto} in ${refKey(width, theme, state)}`).not.toBeNull();
    const act = got[l.impl];
    if (!exp) continue;
    if (!act) { missing.push(`${l.impl} (${state})`); continue; }
    checked += 1;
    rows.push({ state: refKey(width, theme, state), landmark: l.proto, impl: l.impl, expected: exp, actual: act, notCompared: skip[l.proto] ?? [] });
    for (const p of PROPS) {
      if (skip[l.proto]?.includes(p)) continue;
      const e = exp[p];
      const a = act[p];
      if (e === undefined || a === undefined) continue;
      if (!close(e, a)) mismatches.push({ state, landmark: l.proto, prop: p, expected: e, actual: a });
    }
  }
  return { checked, missing, mismatches, rows };
}

// The prototype's sample game (BTQ and LVNAMES of prototype.html), so the boxes
// that depend on their text (answer tiles, player chips) are comparable.
const PROTO_NAMES: Array<[string, number]> = [['stayforever', 1], ['coer4ever', 2], ['hyunjinnie', 3], ['sone2007', 0], ['lalalala', 1]];
const PROTO_QUESTIONS: Array<{ k: 'title' | 'artist'; o: [string, string, string, string]; c: number }> = [
  { k: 'title', o: ["God's Menu", 'Thunderous', 'MANIAC', 'S-Class'], c: 0 },
  { k: 'artist', o: ['TWICE', 'BLACKPINK', 'aespa', 'ITZY'], c: 1 },
  { k: 'title', o: ['Drama', 'Next Level', 'Supernova', 'Spicy'], c: 2 },
  { k: 'title', o: ['Ditto', 'Hype Boy', 'Super Shy', 'OMG'], c: 1 },
  { k: 'artist', o: ['SEVENTEEN', 'Stray Kids', 'BTS', 'ENHYPEN'], c: 2 },
];
function protoQuestions(count: number): GeneratedQuestion[] {
  return Array.from({ length: count }, (_, i) => {
    const q = PROTO_QUESTIONS[i % PROTO_QUESTIONS.length] as (typeof PROTO_QUESTIONS)[number];
    return {
      song_id: `bbbbbbbb-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
      question_type: q.k,
      question_text: q.k === 'title' ? 'Name the song' : 'Which group is this?',
      preview_url: `https://cdnt-preview.dzcdn.net/api/1/1/proto-${i + 1}.mp3`,
      correct_answer: q.o[q.c] as string,
      choices: [...q.o],
    };
  });
}

/** Players that only exist on the server side of the fake (no browser): they join and answer through the same service. */
async function addBots(local: LocalLive, code: string, names: Array<[string, number]>): Promise<string[]> {
  const tokens: string[] = [];
  for (const [nickname, colour] of names) {
    const r = await local.api('POST', `/api/live/rooms/${code}/join`, {}, JSON.stringify({ nickname, colour }));
    expect(r.status).toBe(201);
    tokens.push((r.body as { token: string }).token);
  }
  return tokens;
}

async function botAnswer(local: LocalLive, code: string, token: string, choice: number): Promise<number> {
  return (await local.api('POST', `/api/live/rooms/${code}/answer`, { [LIVE_TOKEN_HEADER]: token }, JSON.stringify({ choice }))).status;
}

async function shot(page: Page, width: number, theme: Theme, name: string): Promise<void> {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  const t = `${width > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}`;
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(SHOTS, `${t}-${name}.png`) });
}

// ---------------------------------------------------------------------------

test.describe('G4 live: flag and SEO', () => {
  test('the flag state is the expected one; /live and /join are noindex and out of the sitemap', async ({ page }) => {
    const local = new LocalLive();
    const w = await wire(page, local);
    const hydration: string[] = [];
    page.on('console', (m) => { if (m.type() === 'error' && /hydrat/i.test(m.text())) hydration.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => { if (/hydrat/i.test(e.message)) hydration.push(e.message.slice(0, 200)); });
    const state = await openLive(page);
    if (EXPECT) expect(state).toBe(EXPECT);
    test.info().annotations.push({ type: 'flag-state', description: state });

    const sitemap = await page.request.get('/sitemap.xml');
    const xml = sitemap.ok() ? await sitemap.text() : '';
    expect(xml).not.toMatch(/<loc>[^<]*\/(live|join)(\/[^<]*)?<\/loc>/);

    if (state === 'off') {
      // Flag off: neither URL nor any live route exists.
      for (const url of ['/join', '/join/K7Q2PX']) {
        const res = await page.goto(url);
        expect(new URL(page.url()).pathname === url && res?.status() === 200, `${url} is not served`).toBe(false);
      }
      const api = await page.request.get('/api/live');
      expect(api.status()).toBe(404);
      return;
    }

    for (const [url, canonical, title] of [['/live', '/live', 'Live blindtest'], ['/join', '/join', 'Join a live blindtest'], ['/join/K7Q2PX', '/join', 'Join a live blindtest']] as const) {
      await page.goto(url);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.title()).toContain(title);
      expect(await page.locator('link[rel="canonical"]').getAttribute('href')).toMatch(new RegExp(`${canonical}$`));
      expect(await horizontalOverflow(page), `${url}: no sideways scroll`).toBeLessThanOrEqual(0);
      await page.waitForTimeout(500);
    }
    expect(hydration, 'the server HTML and the client render agree').toEqual([]);
    expect(w.writes).toEqual([]);
  });
});

for (const theme of THEMES) {
  test.describe(`G4 live ${theme}`, () => {
    let local: LocalLive;
    let host: Wired;
    const phones: Phone[] = [];

    test.beforeEach(async ({ page }) => {
      local = new LocalLive();
      await preparePage(page, theme);
      host = await wire(page, local);
    });

    test.afterEach(async () => {
      const escaped = [...host.writes, ...phones.flatMap((p) => p.wired.writes)];
      for (const p of phones.splice(0)) await p.ctx.close();
      expect(escaped, 'no mutating request left the live API fake').toEqual([]);
      expect(local.clientSends, 'no browser ever sent on a room channel').toBe(0);
    });

    test('before the SQL is applied: the pages say the mode is not open yet', async ({ page, browser }) => {
      local.open = false;
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      await expect(screen(page)).toHaveAttribute('data-open', 'no');
      await expect(screen(page).locator('.ux-live-closed')).toHaveText('Live blindtest is not open yet. It opens here soon.');
      await expect(ctl(page).getByRole('button', { name: 'Open the room' })).toBeDisabled();
      // The phone frame waits; nothing was created.
      await expect(page.locator('.ux-live-phone .ux-live-pmsg b')).toHaveText('Waiting for a room');
      expect(local.live.store.rooms.size).toBe(0);

      const phone = await newPhone(browser, local, theme);
      phones.push(phone);
      await gotoJoin(phone.page, '/join/K7Q2PX');
      await phone.page.getByLabel('Nickname').fill('mingi');
      await phone.page.getByRole('button', { name: 'Join' }).click();
      await expect(phoneMsg(phone)).toHaveText('Not open yet');
      expect(local.calls.filter((c) => c.status === 503).length).toBeGreaterThanOrEqual(2);
    });

    test('a whole game: one host, three phones, five rounds, podium, play again', async ({ page, browser }) => {
      test.setTimeout(120_000);
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const width = widthOf(page);

      // ----- setup -----
      await expect(screen(page)).toHaveAttribute('data-state', 'setup');
      await expect(screen(page).getByRole('heading', { name: 'Host a live blindtest' })).toBeVisible();
      await expect(screen(page).getByRole('radio', { name: 'All K-pop' })).toHaveAttribute('aria-checked', 'true');
      await expect(page.locator('.ux-live-phone .ux-live-pmsg b')).toHaveText('Waiting for a room');
      await screen(page).getByRole('radio', { name: 'Girl groups' }).click();
      const code = await openRoom(page, local, { rounds: 5, seconds: 10 });
      const room = roomOf(local, code);
      expect(local.generated).toEqual([{ playlist: 'gg', count: 5 }]);
      expect(room).toMatchObject({ playlist: 'gg', label: 'Girl groups', rounds: 5, seconds: 10, status: 'lobby', is_test: true });

      // ----- lobby: code, QR, join link -----
      await expect(screen(page).locator('.ux-live-sh')).toContainText(`Room ${code}`);
      const origin = new URL(page.url()).origin;
      await expect(screen(page).locator('.ux-live-url')).toHaveText(`${new URL(page.url()).host}/join`);
      // The QR on screen is the code of the join link, module for module.
      const qr = screen(page).locator('.ux-live-qrbox svg');
      await expect(qr).toHaveAttribute('aria-label', `QR code to join room ${code.split('').join(' ')}`);
      expect(await qr.locator('path').getAttribute('d')).toBe(qrPath(encodeQr(`${origin}/join/${code}`, { level: 'M' }), 2));
      await expect(ctl(page).getByRole('button', { name: 'Start' })).toBeDisabled();
      // The phone frame next to the screen offers to join this room.
      await expect(page.locator('.ux-live-phone').getByLabel('Room code')).toHaveValue(code);

      // ----- three phones: the QR link, the typed code, and the same nickname twice -----
      const [a, b, c] = [await newPhone(browser, local, theme), await newPhone(browser, local, theme), await newPhone(browser, local, theme)];
      phones.push(a, b, c);
      await joinRoom(a, code, 'mingi', { colour: 1 });
      await joinRoom(b, code, 'Mingi', { typeCode: true, colour: 2 });
      await joinRoom(c, code, 'sofia', { colour: 3 });
      await expect(phoneFoot(a)).toHaveText(`mingi${code}`);
      await expect(phoneFoot(b)).toHaveText(`Mingi 2${code}`);
      expect(new URL(b.page.url()).pathname).toBe(`/join/${code}`);
      // The host screen sees them (it polls: joins are not broadcast).
      await expect(screen(page).locator('.ux-live-players > li')).toHaveText(['Mmingi', 'MMingi 2', 'Ssofia']);
      await expect(screen(page).locator('.ux-live-sfoot')).toContainText('3 players in');
      await expect(screen(page).locator('.ux-live-sfoot')).toContainText('Audio plays on this screen only');
      // Each phone listens on the room's private channel, and only listens.
      await expect.poll(() => local.listeners(`live:${room.id}`)).toBe(3);
      expect(local.refusedJoins).toBe(0);

      // ----- five rounds -----
      const expectScore = { a: 0, b: 0, c: 0 };
      for (let round = 1; round <= 5; round++) {
        if (round === 1) await ctl(page).getByRole('button', { name: 'Start' }).click();
        else await ctl(page).getByRole('button', { name: 'Next round' }).click();
        await expect(screen(page)).toHaveAttribute('data-state', 'round');
        await expect(screen(page).locator('.ux-live-sh')).toContainText(`Round ${round} of 5`);
        await expect(screen(page).locator('.ux-lt')).toHaveCount(4);
        await expect(screen(page).locator('.ux-live-answered')).toHaveText('0 of 3 answered');
        await expect(screen(page).getByRole('timer')).toBeVisible();
        // The clip of the round was requested by the host page.
        await expect.poll(() => host.clips.some((u) => u.endsWith(`test-${round}.mp3`))).toBe(true);

        // The phones got the round on the channel: four buttons, no answer text.
        for (const p of [a, b, c]) {
          await expect(p.page.locator('.ux-pb')).toHaveCount(4);
          await expect(p.page.locator('.ux-pbtns')).not.toHaveClass(/is-locked/);
        }
        const text = await a.page.locator('.ux-live-join').innerText();
        expect(text).not.toMatch(/Song \d|Artist \d/);

        const right = fakeCorrect(round);
        const wrong = (right + 1) % 4;
        // a: right. b: wrong on round 2, else right. c: no answer on round 1, else right.
        await a.page.locator('.ux-pb').nth(right).click();
        await expect(a.page.locator('.ux-pbtns')).toHaveClass(/is-locked/);
        await expect(a.page.locator('.ux-pb.is-me')).toHaveCount(1);
        await expect(phoneFoot(a)).toContainText(/Locked in · \d+\.\d s/);
        // A second tap does nothing (the buttons are locked and the server refuses a second answer).
        await a.page.locator('.ux-pb').nth(wrong).click({ force: true }).catch(() => {});
        await b.page.locator('.ux-pb').nth(round === 2 ? wrong : right).click();
        if (round === 1) {
          await expect(screen(page).locator('.ux-live-answered')).toHaveText('2 of 3 answered');
          await ctl(page).getByRole('button', { name: 'Skip the timer' }).click();
        } else {
          await c.page.locator('.ux-pb').nth(right).click();
          // Everybody answered: the host screen reveals by itself.
        }

        await expect(screen(page)).toHaveAttribute('data-state', 'reveal', { timeout: 15_000 });
        const answers = local.live.store.answers.filter((x) => x.room_id === room.id && x.game === 1 && x.round === round);
        expect(answers).toHaveLength(round === 1 ? 2 : 3);
        const tiles = screen(page).locator('.ux-ltiles.is-reveal .ux-lt');
        await expect(tiles.nth(right)).toHaveClass(/is-ok/);
        // The made-up questions alternate song and artist; the right answer is the title of the reveal.
        await expect(screen(page).locator('.ux-live-round2 h2')).toHaveText(`${round % 2 === 1 ? 'Song' : 'Artist'} ${round}${'ABCD'[right]}`);

        // What each phone reads is what the server scored.
        const me = (id: string) => local.live.store.players.get(id)!;
        const ids = { a: [...local.live.store.players.values()].find((p) => p.nickname === 'mingi')!.id, b: [...local.live.store.players.values()].find((p) => p.nickname === 'Mingi 2')!.id, c: [...local.live.store.players.values()].find((p) => p.nickname === 'sofia')!.id };
        await expect(phoneMsg(a)).toHaveText(`+${pts(me(ids.a).last_gain)}`);
        expect(me(ids.a).last_gain).toBeGreaterThanOrEqual(500);
        if (round === 2) await expect(phoneMsg(b)).toHaveText('Not this time');
        else await expect(phoneMsg(b)).toHaveText(`+${pts(me(ids.b).last_gain)}`);
        if (round === 1) {
          await expect(phoneMsg(c)).toHaveText('No answer');
          await expect(c.page.locator('.ux-live-pmsg span')).toHaveText('Streak reset');
        } else {
          await expect(phoneMsg(c)).toHaveText(`+${pts(me(ids.c).last_gain)}`);
        }
        // The streak bonus shows from the third right answer in a row (a: rounds 3, 4, 5).
        if (round >= 3) {
          expect(me(ids.a).last_bonus).toBe(Math.min(300, (round - 2) * 100));
          await expect(a.page.locator('.ux-live-pmsg span')).toHaveText(`Streak ${round} · +${me(ids.a).last_bonus} bonus`);
        } else {
          await expect(a.page.locator('.ux-live-pmsg span')).toHaveText('Correct');
        }
        expectScore.a = me(ids.a).score;
        expectScore.b = me(ids.b).score;
        expectScore.c = me(ids.c).score;
        await expect(phoneFoot(a)).toContainText(`${pts(expectScore.a)} pts`);

        // ----- leaderboard -----
        await ctl(page).getByRole('button', { name: 'Show the leaderboard' }).click();
        await expect(screen(page)).toHaveAttribute('data-state', 'board');
        const rows = screen(page).locator('.ux-live-br');
        await expect(rows).toHaveCount(3);
        await expect(rows.nth(0)).toContainText('mingi');
        await expect(rows.nth(0).locator('.ux-live-pts')).toHaveText(pts(expectScore.a));
        await expect(phoneMsg(a)).toHaveText('#1 of 3');
        await expect(a.page.locator('.ux-live-pmsg span')).toHaveText(`${pts(expectScore.a ?? 0)} points${round < 5 ? ' · next round soon' : ''}`);
      }

      // a was right five times: 5 rounds of speed points and 100 + 200 + 300 of streak bonus.
      expect(expectScore.a).toBeGreaterThanOrEqual(5 * 500 + 600);
      expect(expectScore.a).toBeGreaterThan(expectScore.b!);

      // ----- podium -----
      await ctl(page).getByRole('button', { name: 'Show the podium' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'ended');
      await expect(screen(page).getByRole('heading', { name: 'Final podium' })).toBeVisible();
      await expect(screen(page).locator('.ux-live-p.is-p1 b')).toHaveText('mingi');
      await expect(screen(page).locator('.ux-live-p')).toHaveCount(3);
      await expect(phoneMsg(a)).toHaveText('#1 of 3');
      await expect(a.page.locator('.ux-live-pmsg span')).toHaveText(`${pts(expectScore.a)} points`);
      await expect(a.page.getByRole('link', { name: 'Play solo' })).toHaveAttribute('href', '/blindtest');
      // Run tracking is off in this run, so there is no "Save my score" door.
      await expect(a.page.getByRole('button', { name: 'Save my score' })).toHaveCount(0);
      expect(await horizontalOverflow(page), 'podium: no sideways scroll').toBeLessThanOrEqual(0);
      expect(width).toBeGreaterThan(0);

      // ----- play again: same room, same phones, scores at zero -----
      await ctl(page).getByRole('button', { name: 'Play again' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'lobby');
      await expect(page.locator('.ux-live-code')).toHaveText(code);
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(3);
      for (const p of [a, b, c]) await expect(phoneMsg(p)).toHaveText('You are in!');
      expect(roomOf(local, code)).toMatchObject({ game: 2, round: 0, status: 'lobby' });
      expect([...local.live.store.players.values()].every((p) => p.score === 0)).toBe(true);
      await ctl(page).getByRole('button', { name: 'Start' }).click();
      await expect(a.page.locator('.ux-pb')).toHaveCount(4);
      await expect(phoneFoot(a)).toContainText('0 pts');

      // ----- who did what on the wire -----
      // The audio played on the host only: no phone requested a clip, and no phone asked for songs.
      for (const p of [a, b, c]) expect(p.wired.clips).toEqual([]);
      expect(host.clips.length).toBeGreaterThanOrEqual(5);
      expect(local.generated).toHaveLength(2);
      // Host actions carried the host token; the phones never called a host route successfully.
      expect(local.calls.filter((x) => x.path.endsWith('/host') && x.status === 200).every((x) => x.token)).toBe(true);
      expect(local.live.sent.length).toBeGreaterThanOrEqual(5 * 3 + 2);
    });

    test('server time: a late answer is refused; a host reload resumes the room and reveals', async ({ page, browser, context }) => {
      test.setTimeout(90_000);
      // The "database clock" of this test only moves when the test moves it.
      local.live.clock.freeze();
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local, { rounds: 5, seconds: 10 });
      const room = roomOf(local, code);
      const [a, b] = [await newPhone(browser, local, theme), await newPhone(browser, local, theme)];
      phones.push(a, b);
      await joinRoom(a, code, 'early');
      await joinRoom(b, code, 'late');
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(2);
      await ctl(page).getByRole('button', { name: 'Start' }).click();
      await expect(a.page.locator('.ux-pb')).toHaveCount(4);
      await expect(b.page.locator('.ux-pb')).toHaveCount(4);

      // 4.2 s into the round on the server clock, whatever the phone thinks.
      local.live.clock.advance(4200);
      await a.page.locator('.ux-pb').nth(fakeCorrect(1)).click();
      await expect(phoneFoot(a)).toContainText('Locked in · 4.2 s');

      // The host tab goes away in the middle of the round (the laptop lid, a crash).
      await page.goto('about:blank');
      // The round's 10 seconds pass on the server.
      local.live.clock.advance(6000);
      await b.page.locator('.ux-pb').nth(fakeCorrect(1)).click();
      await expect(b.page.locator('.ux-live-perr')).toHaveText('Too late for this round.');
      expect(local.live.store.answers.filter((x) => x.room_id === room.id)).toHaveLength(1);
      expect(local.calls.filter((x) => x.path.endsWith('/answer')).map((x) => x.status)).toEqual([200, 409]);
      expect(room.status).toBe('round');

      // The host comes back: same browser, same token. The room is still there, the
      // time is up, so the screen asks for the reveal at once.
      const again = await context.newPage();
      await preparePage(again, theme);
      const againWired = await wire(again, local);
      await again.goto('/live');
      await expect(screen(again)).toHaveAttribute('data-state', 'reveal', { timeout: 20_000 });
      await expect(again.locator('.ux-live-sh')).toContainText('Round 1 of 5');
      expect(room.code).toBe(code);
      expect(local.live.store.rooms.size).toBe(1);
      // 4.2 s of 10 s: 500 + 500 x 0.58 = 790.
      await expect(phoneMsg(a)).toHaveText('+790');
      await expect(phoneMsg(b)).toHaveText('No answer');
      expect([...local.live.store.players.values()].map((p) => [p.nickname, p.score])).toEqual([['early', 790], ['late', 0]]);

      // A reload on the reveal, then on the leaderboard: the screen comes back where it was.
      await again.reload();
      await expect(screen(again)).toHaveAttribute('data-state', 'reveal', { timeout: 20_000 });
      await ctl(again).getByRole('button', { name: 'Show the leaderboard' }).click();
      await expect(screen(again)).toHaveAttribute('data-state', 'board');
      await again.reload();
      await expect(screen(again)).toHaveAttribute('data-state', 'board', { timeout: 20_000 });
      await expect(again.locator('.ux-live-br').first()).toContainText('early');
      await ctl(again).getByRole('button', { name: 'Next round' }).click();
      await expect(screen(again)).toHaveAttribute('data-state', 'round');
      await expect(a.page.locator('.ux-pbtns')).not.toHaveClass(/is-locked/);
      expect(againWired.writes).toEqual([]);
    });

    test('a phone drops and rejoins with its score; a dead socket falls back to the state route', async ({ page, browser }) => {
      test.setTimeout(90_000);
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local, { rounds: 5, seconds: 10 });
      const room = roomOf(local, code);
      const [a, b] = [await newPhone(browser, local, theme), await newPhone(browser, local, theme)];
      phones.push(a, b);
      await joinRoom(a, code, 'stay');
      await joinRoom(b, code, 'drop');
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(2);

      // Round 1: both right.
      await ctl(page).getByRole('button', { name: 'Start' }).click();
      await a.page.locator('.ux-pb').nth(fakeCorrect(1)).click();
      await b.page.locator('.ux-pb').nth(fakeCorrect(1)).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'reveal', { timeout: 15_000 });
      const dropId = [...local.live.store.players.values()].find((p) => p.nickname === 'drop')!.id;
      const scoreAfter1 = local.live.store.players.get(dropId)!.score;
      expect(scoreAfter1).toBeGreaterThanOrEqual(500);
      await ctl(page).getByRole('button', { name: 'Show the leaderboard' }).click();

      // The phone leaves (tab closed, battery, tunnel) and misses the whole of round 2.
      await b.page.close();
      await expect.poll(() => local.listeners(`live:${room.id}`)).toBe(1);
      await ctl(page).getByRole('button', { name: 'Next round' }).click();
      await a.page.locator('.ux-pb').nth(fakeCorrect(2)).click();
      await ctl(page).getByRole('button', { name: 'Skip the timer' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'reveal', { timeout: 15_000 });
      await ctl(page).getByRole('button', { name: 'Show the leaderboard' }).click();
      await ctl(page).getByRole('button', { name: 'Next round' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'round');

      // It comes back on the same address: no form, straight into round 3, with its score.
      b.page = await b.ctx.newPage();
      await preparePage(b.page, theme);
      b.wired = await wire(b.page, local);
      await gotoJoin(b.page, `/join/${code}`);
      await expect(b.page.locator('.ux-pb')).toHaveCount(4);
      await expect(b.page.locator('form')).toHaveCount(0);
      await expect(phoneFoot(b)).toHaveText(`drop${pts(scoreAfter1)} pts`);
      expect(local.live.store.players.size).toBe(2);
      await b.page.locator('.ux-pb').nth(fakeCorrect(3)).click();
      await a.page.locator('.ux-pb').nth(fakeCorrect(3)).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'reveal', { timeout: 15_000 });
      expect(local.live.store.players.get(dropId)!.score).toBeGreaterThan(scoreAfter1);
      await expect(phoneMsg(b)).toHaveText(`+${pts(local.live.store.players.get(dropId)!.last_gain)}`);

      // Realtime dies for phone a (the socket is closed under it and stays refused): it
      // keeps up through the state route.
      await a.page.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => { void ws.close({ code: 1011, reason: 'gone' }); });
      for (const ws of a.wired.sockets) await ws.close({ code: 1011, reason: 'gone' }).catch(() => {});
      await ctl(page).getByRole('button', { name: 'Show the leaderboard' }).click();
      await ctl(page).getByRole('button', { name: 'Next round' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'round');
      await expect(b.page.locator('.ux-pb')).toHaveCount(4);
      await expect(a.page.locator('.ux-pb'), 'phone a has no socket: it polls the state').toHaveCount(4, { timeout: 20_000 });
      await a.page.locator('.ux-pb').nth(fakeCorrect(4)).click();
      await expect(phoneFoot(a)).toContainText('Locked in');
    });

    test('the host removes a player', async ({ page, browser }) => {
      test.setTimeout(60_000);
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local, { rounds: 5, seconds: 10 });
      const [a, b] = [await newPhone(browser, local, theme), await newPhone(browser, local, theme)];
      phones.push(a, b);
      await joinRoom(a, code, 'keep');
      await joinRoom(b, code, 'out');
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(2);

      await ctl(page).getByRole('button', { name: 'Players' }).click();
      const sheet = page.getByRole('dialog', { name: 'Players' });
      await expect(sheet.locator('.ux-live-manage > li')).toHaveCount(2);
      await sheet.getByRole('button', { name: 'Remove out' }).click();
      await expect(sheet.locator('.ux-live-manage > li')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);

      // The host screen and the other phone no longer count it; the removed phone is told.
      await expect(screen(page).locator('.ux-live-players > li')).toHaveText(['Kkeep']);
      await expect(phoneMsg(b)).toHaveText('You were removed');
      await expect(b.page.locator('.ux-live-pmsg span')).toHaveText('The host removed you from this room.');
      await expect(phoneMsg(a)).toHaveText('You are in!');
      const removed = [...local.live.store.players.values()].find((p) => p.nickname === 'out')!;
      expect(removed.removed_at).not.toBeNull();

      // Its token is dead: a reload does not bring it back.
      await b.page.reload();
      await expect(phoneMsg(b)).toHaveText('You were removed');
      expect(local.calls.filter((x) => x.status === 403).length).toBeGreaterThanOrEqual(1);
      // One player left: the game cannot start with fewer than two.
      await expect(ctl(page).getByRole('button', { name: 'Start' })).toBeDisabled();
    });

    test('the nickname filter and the errors of the join form', async ({ page, browser }) => {
      // A stand-in for the site's moderation list (the real one is a database table).
      local.live.deps.bannedTerms = async () => ['badword'];
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local);
      const p = await newPhone(browser, local, theme);
      phones.push(p);

      await gotoJoin(p.page, '/join');
      const form = p.page.locator('.ux-live-join form');
      await form.getByLabel('Room code').fill('ZZZZZZ');
      await form.getByLabel('Nickname').fill('mingi');
      await form.getByRole('button', { name: 'Join' }).click();
      await expect(form.getByRole('alert')).toHaveText('No room with this code. Check the big screen.');
      await form.getByLabel('Room code').fill('abc');
      await form.getByRole('button', { name: 'Join' }).click();
      await expect(form.getByRole('alert')).toHaveText('No room with this code. Check the big screen.');

      await form.getByLabel('Room code').fill(code);
      await form.getByLabel('Nickname').fill('xX_b4dw0rd_Xx');
      await form.getByRole('button', { name: 'Join' }).click();
      await expect(form.getByRole('alert')).toHaveText('Pick another nickname.');
      await form.getByLabel('Nickname').fill('');
      await form.getByRole('button', { name: 'Join' }).click();
      await expect(form.getByRole('alert')).toHaveText('Type a nickname.');
      expect(local.live.store.players.size).toBe(0);

      await form.getByLabel('Nickname').fill('<b>mingi</b>');
      await form.getByRole('button', { name: 'Join' }).click();
      await expect(phoneMsg(p)).toHaveText('You are in!');
      // Markup in a name is dropped on the server and shown as text on the big screen.
      await expect(screen(page).locator('.ux-live-players > li')).toHaveText(['Bbmingi/b']);
      expect(await screen(page).locator('.ux-live-players b, .ux-live-players script').count()).toBe(0);
    });

    test('a room expires after two hours', async ({ page, browser }) => {
      local.live.clock.freeze();
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local);
      const p = await newPhone(browser, local, theme);
      phones.push(p);
      await joinRoom(p, code, 'mingi');
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(1);

      local.live.clock.advance(2 * 60 * 60 * 1000 - 1000);
      await expect(screen(page)).toHaveAttribute('data-state', 'lobby');
      local.live.clock.advance(1000);

      // The host screen (it polls the lobby) goes back to the setup and says why.
      await expect(screen(page)).toHaveAttribute('data-state', 'setup', { timeout: 15_000 });
      await expect(page.getByTestId('ux-toast')).toHaveText('This room is closed.');
      // The phone learns it the next time it asks (here: the tab comes back to the front).
      await p.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
      await expect(phoneMsg(p)).toHaveText('Room closed');
      // A new phone cannot join, and the QR link of the old room says so.
      const late = await newPhone(browser, local, theme);
      phones.push(late);
      await gotoJoin(late.page, `/join/${code}`);
      await late.page.getByLabel('Nickname').fill('late');
      await late.page.getByRole('button', { name: 'Join' }).click();
      await expect(late.page.locator('.ux-live-perr')).toHaveText('No room with this code. Check the big screen.');

      // The cron then deletes the (test) room with its player.
      expect((await local.expire()).body).toEqual({ ok: true, closed: 0, deleted: 1 });
      expect(local.live.store.rooms.size).toBe(0);
      expect(local.live.store.players.size).toBe(0);
    });

    test('the host can play along from the phone frame; settings from the lobby keep the room', async ({ page }) => {
      test.setTimeout(60_000);
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local, { rounds: 5, seconds: 15 });
      const frame = page.locator('.ux-live-phone');
      await frame.getByLabel('Nickname').fill('host');
      await frame.getByRole('button', { name: 'Join' }).click();
      await expect(frame.locator('.ux-live-pmsg b')).toHaveText('You are in!');
      // The address of the host page does not change (only /join follows the room).
      expect(new URL(page.url()).pathname).toBe('/live');
      await addBots(local, code, [['sofia', 2]]);
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(2);

      // Settings: back to the setup, another length, the same room and players.
      await ctl(page).getByRole('button', { name: 'Settings' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'setup');
      await screen(page).getByRole('group', { name: 'Rounds' }).getByRole('button', { name: '10', exact: true }).click();
      await ctl(page).getByRole('button', { name: 'Back to the room' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'lobby');
      await expect(page.locator('.ux-live-code')).toHaveText(code);
      expect(local.live.store.rooms.size).toBe(1);
      expect(roomOf(local, code)).toMatchObject({ rounds: 10, status: 'lobby' });
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(2);

      await ctl(page).getByRole('button', { name: 'Start' }).click();
      await expect(screen(page).locator('.ux-live-sh')).toContainText('Round 1 of 10');
      await expect(frame.locator('.ux-pb')).toHaveCount(4);
      await frame.locator('.ux-pb').nth(fakeCorrect(1)).click();
      await expect(frame.locator('.ux-pbtns')).toHaveClass(/is-locked/);
      await expect(screen(page).locator('.ux-live-answered')).toHaveText('1 of 2 answered');
      // One socket for the page, whoever listens on it.
      expect(host.sockets.length).toBeLessThanOrEqual(1);
    });

    test('every state against the prototype reference, a11y, no sideways scroll', async ({ page }, info) => {
      test.setTimeout(120_000);
      local.questions = protoQuestions;
      test.skip((await openLive(page)) !== 'v12', 'v12 is off here');
      const w = widthOf(page);
      const all: { checked: number; missing: string[]; mismatches: Row[]; rows: unknown[] } = { checked: 0, missing: [], mismatches: [], rows: [] };
      const add = (r: Awaited<ReturnType<typeof measure>>): void => {
        all.checked += r.checked;
        all.missing.push(...r.missing);
        all.mismatches.push(...r.mismatches);
        all.rows.push(...r.rows);
      };
      const check = async (state: string, marks: Landmark[], skip: Partial<Record<string, string[]>> = {}): Promise<void> => {
        // Off the button just clicked (its hover colour is not the resting one), and past the
        // 1 ms transitions the shell gives every property under reduced motion.
        await page.mouse.move(0, 0);
        await page.waitForTimeout(120);
        add(await measure(page, w, theme, state, marks, skip));
        expect(await horizontalOverflow(page), `${state}: no sideways scroll`).toBeLessThanOrEqual(0);
        await shot(page, w, theme, state);
      };
      const axe = async (state: string): Promise<void> => {
        const found = await runAxe(page, { include: '.ux-live-page' });
        if (found) expect(found, `axe serious / critical in ${state}`).toEqual([]);
      };
      // The lobby box height follows the chips; the players' box is compared for its styles and width.
      const frame = page.locator('.ux-live-phone');

      // setup
      await check('live-setup', [LM.screen!, LM.phone!, LM.primary!, LM.steps!, LM.h2!]);
      expect(await basicA11y(page)).toEqual([]);
      await axe('setup');

      // lobby: the prototype's five first players
      const code = await openRoom(page, local, { rounds: 5, seconds: 15 });
      // The prototype adds a simulated player every 650 ms, so how many chips its lobby capture
      // holds depends on when the capture ran: four (one row at 1440, two at 390) or five (two
      // rows at 1440). The reference height says which; the fifth joins before the next state.
      const refRows = parseFloat(REFERENCE[refKey(w, theme, 'live-lobby')]?.['.players']?.height ?? '72');
      const firstWave = w > 500 && refRows > 40 ? 5 : 4;
      const bots = await addBots(local, code, PROTO_NAMES.slice(0, firstWave));
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(firstWave);
      await check('live-lobby', [LM.screen!, LM.lobby!, LM.qrbox!, LM.players!, LM.phone!, LM.primary!]);
      await axe('lobby');
      bots.push(...await addBots(local, code, PROTO_NAMES.slice(firstWave)));
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(5);

      // join: the host plays along as "mingi" from the phone frame
      await frame.getByLabel('Nickname').fill('mingi');
      await frame.getByRole('button', { name: 'Join' }).click();
      await expect(frame.locator('.ux-live-pmsg b')).toHaveText('You are in!');
      await expect(screen(page).locator('.ux-live-players > li')).toHaveCount(6);
      await check('live-join', [LM.screen!, LM.lobby!, LM.qrbox!, LM.players!, LM.phone!, LM.primary!]);

      // round
      await ctl(page).getByRole('button', { name: 'Start' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'round');
      await expect(frame.locator('.ux-pb')).toHaveCount(4);
      await check('live-round', [LM.screen!, LM.lt!, LM.phone!, LM.pb!]);
      await axe('round');

      // answer: the phone is locked on its pick
      await frame.locator('.ux-pb').nth(0).click();
      await expect(frame.locator('.ux-pbtns')).toHaveClass(/is-locked/);
      await check('live-answer', [LM.screen!, LM.lt!, LM.phone!, LM.pb!]);

      // reveal
      for (const [i, t] of bots.entries()) expect(await botAnswer(local, code, t, i < 3 ? 0 : i - 2)).toBe(200);
      await expect(screen(page)).toHaveAttribute('data-state', 'reveal', { timeout: 15_000 });
      await check('live-reveal', [LM.screen!, LM.lt!, LM.reveal!, LM.phone!, LM.primary!]);
      await axe('reveal');

      // board
      await ctl(page).getByRole('button', { name: 'Show the leaderboard' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'board');
      await expect(screen(page).locator('.ux-live-br')).toHaveCount(5);
      await check('live-board', [LM.screen!, LM.board!, LM.phone!, LM.primary!]);
      await axe('board');

      // end: play the four other rounds through the service, then the podium
      for (let round = 2; round <= 5; round++) {
        await ctl(page).getByRole('button', { name: 'Next round' }).click();
        await expect(screen(page)).toHaveAttribute('data-state', 'round');
        await ctl(page).getByRole('button', { name: 'Skip the timer' }).click();
        await expect(screen(page)).toHaveAttribute('data-state', 'reveal', { timeout: 15_000 });
        await ctl(page).getByRole('button', { name: 'Show the leaderboard' }).click();
        await expect(screen(page)).toHaveAttribute('data-state', 'board');
      }
      await ctl(page).getByRole('button', { name: 'Show the podium' }).click();
      await expect(screen(page)).toHaveAttribute('data-state', 'ended');
      await check('live-end', [LM.screen!, LM.podium!, LM.phone!, LM.primary!]);
      await axe('end');

      await info.attach('g4-landmarks.json', { body: JSON.stringify(all, null, 1), contentType: 'application/json' });
      if (SHOTS) {
        const t = `${w > 500 ? 'd' : 'm'}${theme === 'dark' ? 'k' : ''}`;
        fs.writeFileSync(path.join(SHOTS, `${t}-landmarks.json`), `${JSON.stringify(all, null, 1)}\n`);
      }
      expect(all.missing, 'every landmark of the live states is rendered').toEqual([]);
      expect(all.mismatches, 'boxes within 2px, styles equal to styles.json').toEqual([]);
    });

    test('the join page: a phone screen with named controls, a11y', async ({ page }) => {
      const state = await openLive(page);
      test.skip(state !== 'v12', 'v12 is off here');
      const code = await openRoom(page, local);
      await gotoJoin(page, `/join/${code}`);
      const form = page.locator('.ux-live-join form');
      await expect(form.getByRole('heading', { name: 'Join a game' })).toBeVisible();
      await expect(form.getByLabel('Room code')).toHaveValue(code);
      await expect(form.getByRole('radiogroup', { name: 'Colour' }).getByRole('radio')).toHaveCount(4);
      await expect(form.getByRole('radio', { name: 'Colour 1' })).toHaveAttribute('aria-checked', 'true');
      // The game shell: no site nav, no tab bar, no footer on the phone page.
      for (const sel of ['.ux-nav', '.ux-tabbar', '.ux-foot']) await expect(page.locator(sel).first()).toBeHidden();
      expect(await basicA11y(page)).toEqual([]);
      const found = await runAxe(page, { include: '.ux-live-join' });
      if (found) expect(found).toEqual([]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      if (SHOTS) await shot(page, widthOf(page), theme, 'join-page');

      await form.getByLabel('Nickname').fill('mingi');
      await form.getByRole('radio', { name: 'Colour 3' }).click();
      await expect(form.getByRole('radio', { name: 'Colour 3' })).toHaveText('M');
      await form.getByRole('button', { name: 'Join' }).click();
      await expect(page.locator('.ux-live-pmsg b')).toHaveText('You are in!');
      const stored = [...local.live.store.players.values()][0]!;
      expect(stored).toMatchObject({ nickname: 'mingi', colour: 2 });
      // The token is kept in this browser only, and only its hash on the server.
      const saved = await page.evaluate(() => window.localStorage.getItem('kq-live-player'));
      expect(saved).toContain(code);
      expect(JSON.stringify([...local.live.store.players.values()])).not.toContain((JSON.parse(saved as string) as { token: string }).token);
    });
  });
}
