import { test, expect } from '@playwright/test';

import { loadTestEnv } from '../ux-v1/helpers/env';
import { guardWrites } from '../ux-v1/helpers/guard';

import type { APIRequestContext, Page, Route } from '@playwright/test';
import type { StubbedCall } from '../ux-v1/helpers/guard';

// G1 Tracking (V12): the start, finish and beacon payloads of one blindtest flow of
// each kind, on whichever build is served:
//   v11 on  (NEXT_PUBLIC_UX_V1=1): hub playlist, group, theme page, daily, challenge
//           (components/blindtest/ux-v1/use-run.ts)
//   v11 off: the legacy hub game, its daily, and the legacy playlist page player
//           (components/blind-test/**)
// with NEXT_PUBLIC_BT_TRACKING=1. On a build with the switch off it proves the
// opposite: no tracking request at all and a 404 endpoint.
//
// DATA SAFETY: the dev server uses the production database, so every mutating
// request is answered locally by guardWrites (200 {}) and only its payload is
// asserted. POST /api/track/bt-run never reaches the server from a page here. The
// three direct calls at the bottom send bodies the route refuses BEFORE any
// database access (not JSON, not a run, a bot user agent). The proof against the
// real table is a separate, owner-gated script (run/reports/G1/tracking-proof.mjs).
//
// Run (dev server on 3061, cached Chromium):
//   PLAYWRIGHT_BASE_URL=http://localhost:3061 UX11_CHROMIUM=... \
//     pnpm exec playwright test e2e/ux-v12/g1.spec.ts --project=desktop

const env = loadTestEnv();
const TRACK = '/api/track/bt-run';
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test.describe.configure({ timeout: 180_000 });

// ---- fixtures (the shape POST /api/blind-test/generate and GET /api/daily/blindtest answer) ----

const TITLES = ["God's Menu", 'How You Like That', 'Supernova', 'Hype Boy', 'Dynamite', 'FANCY', 'HOT', 'SHEESH', 'LOVE DIVE', 'Guerrilla'];
const ARTISTS = ['Stray Kids', 'BLACKPINK', 'aespa', 'NewJeans', 'BTS', 'TWICE', 'SEVENTEEN', 'BABYMONSTER', 'IVE', 'ATEEZ'];
const songId = (i: number): string => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
const kindOf = (i: number): 'artist' | 'title' => (i % 3 === 1 ? 'artist' : 'title');
/** Index of the right answer of round i. */
const RIGHT = (i: number): number => i % 4;

function question(i: number): Record<string, unknown> {
  const pool = kindOf(i) === 'artist' ? ARTISTS : TITLES;
  const choices = [1, 2, 3].map((k) => pool[(i + k) % pool.length]!);
  choices.splice(RIGHT(i), 0, pool[i]!);
  return {
    song_id: songId(i),
    question_type: kindOf(i),
    question_text: kindOf(i) === 'artist' ? 'Which group is this?' : 'Name the song',
    preview_url: `https://cdnt-preview.dzcdn.net/api/g1-test/${i}.mp3`,
    album_cover_medium: '/mascot/mascot-default.png',
    album_cover_big: '/mascot/mascot-default.png',
    correct_answer: pool[i]!,
    choices,
    reveal: { title: TITLES[i]!, artist: ARTISTS[i]!, album: `Album ${i + 1}`, cover: '/mascot/mascot-default.png' },
  };
}
const QUESTIONS = Array.from({ length: 10 }, (_, i) => question(i));

function silentWav(seconds = 12): Buffer {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();

// ---- harness ----

interface Harness { writes: StubbedCall[]; generate: Array<Record<string, unknown>> }

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** guardWrites first, then the read fixtures (later routes win in Playwright). */
async function harness(page: Page, opts: { challenge?: Record<string, unknown> } = {}): Promise<Harness> {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const writes = await guardWrites(page, env.supabaseUrl);
  const h: Harness = { writes, generate: [] };
  // Belt and braces for the one endpoint this spec is about: a context-level stub, so
  // a tracking request sent while a page is closing or navigating (a beacon) is still
  // answered locally. Page routes run first; this only catches what they miss.
  await page.context().route((u) => u.pathname === TRACK, async (r) => {
    if (r.request().method() !== 'POST') { await r.continue(); return; }
    writes.push({ method: 'POST', url: r.request().url(), body: r.request().postData() });
    await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  await page.route((u) => u.pathname === '/api/blind-test/generate', async (r) => {
    const body = r.request().postDataJSON() as Record<string, unknown>;
    h.generate.push(body);
    const count = typeof body.count === 'number' ? body.count : 10;
    await json(r, { questions: QUESTIONS.slice(0, count), timer_duration: 10 });
  });
  await page.route((u) => u.pathname === '/api/daily/blindtest', (r) => json(r, { date: 'fixture', questions: QUESTIONS, timer_duration: 10, songs_count: 10 }));
  await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, { ranked: 'not_live' }, 503));
  if (opts.challenge) {
    const view = opts.challenge;
    await page.route((u) => /^\/api\/ux-v1\/p6\/challenge\/[A-Z0-9]{6}$/.test(u.pathname), (r) => json(r, view));
  }
  return h;
}

type Payload = Record<string, unknown> & { songs?: Array<Record<string, unknown>> };

/** The tracking events a page sent (all stubbed by guardWrites, never served). */
function tracked(h: Harness): Payload[] {
  return h.writes
    .filter((w) => new URL(w.url).pathname === TRACK)
    .map((w) => {
      expect(w.method).toBe('POST');
      expect(w.body, 'the tracking request carries its payload').toBeTruthy();
      return JSON.parse(w.body ?? '{}') as Payload;
    });
}

const events = (h: Harness, event: string): Payload[] => tracked(h).filter((p) => p.event === event);

/** Is the tracking switch on in the served build? The body is refused before any database access. */
async function trackingOn(request: APIRequestContext): Promise<boolean> {
  const res = await request.post(TRACK, { data: 'not json', headers: { 'content-type': 'text/plain' } });
  expect([200, 404]).toContain(res.status());
  return res.status() === 200;
}

async function isV11(page: Page): Promise<boolean> {
  return (await page.locator('.ux-app').count()) > 0;
}

function expectContext(p: Payload, want: { playlist: string | RegExp; source: string; rounds: number; mode?: string }): void {
  expect(String(p.run_id)).toMatch(UUID);
  if (typeof want.playlist === 'string') expect(p.playlist).toBe(want.playlist);
  else expect(String(p.playlist)).toMatch(want.playlist);
  expect(p.mode).toBe(want.mode ?? 'classic');
  expect(p.source).toBe(want.source);
  expect(p.locale).toBe('en');
  expect(p.rounds).toBe(want.rounds);
  expect(p.anon_id === null || UUID.test(String(p.anon_id)), 'anon id is the browser uuid or null').toBe(true);
}

function expectStart(h: Harness, want: Parameters<typeof expectContext>[1]): Payload {
  const starts = events(h, 'start');
  expect(starts, 'one start per run').toHaveLength(1);
  const s = starts[0]!;
  expectContext(s, want);
  expect(s.clip_played).toBe(true);
  expect(Object.keys(s).sort()).toEqual(['anon_id', 'clip_played', 'event', 'locale', 'mode', 'playlist', 'rounds', 'run_id', 'source']);
  return s;
}

function expectFinish(h: Harness, start: Payload, want: Parameters<typeof expectContext>[1] & { answered: number; correct: number; completed: boolean }): Payload {
  const finishes = events(h, 'finish');
  expect(finishes, 'one finish per run').toHaveLength(1);
  const f = finishes[0]!;
  expectContext(f, want);
  expect(f.run_id, 'the finish closes the run the start opened').toBe(start.run_id);
  expect(f.anon_id).toBe(start.anon_id);
  expect(f.completed).toBe(want.completed);
  expect(f.answered).toBe(want.answered);
  expect(f.correct).toBe(want.correct);
  expect(typeof f.score).toBe('number');
  expect(f.best_combo as number).toBeLessThanOrEqual(want.correct);
  expect(f.duration_ms as number).toBeGreaterThan(0);
  expect(f.songs).toHaveLength(want.answered);
  (f.songs ?? []).forEach((s, i) => {
    expect(s.song_id).toBe(songId(i));
    expect(s.kind).toBe(kindOf(i));
    expect(typeof s.correct).toBe('boolean');
    expect(s.ms as number).toBeGreaterThanOrEqual(0);
    expect(s.ms as number).toBeLessThanOrEqual(10_000);
    expect(Object.keys(s).sort()).toEqual(['correct', 'kind', 'ms', 'song_id']);
  });
  expect((f.songs ?? []).filter((s) => s.correct).length).toBe(want.correct);
  return f;
}

// ---- v11 game (flag on) ----

async function openV11Hub(page: Page, path = '/blindtest'): Promise<boolean> {
  let res = await page.goto(path);
  for (let i = 0; i < 4 && path === '/blindtest' && res?.status() === 200 && (await page.locator('.p6-hub').count()) > 0 && (await page.locator('.p6-btg').count()) === 0; i++) {
    res = await page.reload();
  }
  if (!res || res.status() !== 200 || !(await isV11(page))) return false;
  if ((await page.locator('.p6-hub').count()) === 0 && (await page.locator('.p6-play').count()) === 0) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.locator('.p6-hub[data-live], .p6-play[data-live]').first().waitFor({ timeout: 60_000 });
  return true;
}

async function v11Answer(page: Page, i: number, right: boolean): Promise<void> {
  await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
  await page.locator('.p6-ans').nth(right ? RIGHT(i) : (RIGHT(i) + 1) % 4).click();
  await expect(page.locator('.p6-next')).toBeVisible();
}

async function v11PlayAll(page: Page, rounds: number, pattern: (i: number) => boolean): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await v11Answer(page, i, pattern(i));
    await page.locator('.p6-next').click();
  }
  await expect(page.locator('.p6-btcard')).toBeVisible();
}

test.describe('v11 flows record through trackBtRun', () => {
  test('hub playlist run: start when the clip plays, finish on the results (completed)', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    test.skip(!(await openV11Hub(page)), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 20_000 });
    expect(tracked(h), 'nothing is sent before a run').toEqual([]);

    await page.locator('.p6-setup .ux-btn-primary').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length, { message: 'start once the first clip plays' }).toBe(1);
    const rounds = (h.generate.at(-1)?.count as number) ?? 10;
    const want = { playlist: 'all', source: 'hub', rounds };
    const start = expectStart(h, want);
    expect(events(h, 'finish')).toEqual([]);

    await v11PlayAll(page, rounds, (i) => i !== 3 && i !== 7);
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    const f = expectFinish(h, start, { ...want, answered: rounds, correct: rounds - 2, completed: true });
    expect(f.score as number, 'v11 points, not the right-answer count').toBeGreaterThan(rounds);
    expect(f.best_combo).toBe(3);

    // Play again is a NEW run: a second start with another id, the first finish untouched.
    await page.getByRole('button', { name: /Play again/ }).first().click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(2);
    expect(events(h, 'start')[1]!.run_id).not.toBe(start.run_id);
    expect(events(h, 'finish')).toHaveLength(1);
    // Close the second run before the page goes away (no run is left open at teardown).
    await page.getByRole('button', { name: 'Quit blindtest' }).click();
    await expect.poll(() => events(h, 'finish').length).toBe(2);
    expect(events(h, 'finish')[1]).toMatchObject({ completed: false, answered: 0, run_id: events(h, 'start')[1]!.run_id });
  });

  test('quit mid-run: one beacon finish with completed = false and the answers so far', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    test.skip(!(await openV11Hub(page)), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 20_000 });
    const beacons: string[] = [];
    page.on('request', (r) => { if (new URL(r.url()).pathname === TRACK) beacons.push(r.resourceType()); });

    await page.locator('.p6-setup .ux-btn-primary').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const rounds = (h.generate.at(-1)?.count as number) ?? 10;
    const want = { playlist: 'all', source: 'hub', rounds };
    const start = expectStart(h, want);
    await v11Answer(page, 0, true);
    await page.locator('.p6-next').click();
    await v11Answer(page, 1, false);
    await page.getByRole('button', { name: 'Quit blindtest' }).click();
    await expect(page.locator('.p6-hub')).toBeVisible();

    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expectFinish(h, start, { ...want, answered: 2, correct: 1, completed: false });
    expect(beacons.at(-1), 'the abandoned run goes through navigator.sendBeacon').toBe('ping');
    // Leaving the page afterwards sends nothing more.
    await page.goto('about:blank');
    expect(events(h, 'finish')).toHaveLength(1);
  });

  test('leaving the page mid-run (pagehide): the abandoned run still lands', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    test.skip(!(await openV11Hub(page)), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 20_000 });
    await page.locator('.p6-setup .ux-btn-primary').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const rounds = (h.generate.at(-1)?.count as number) ?? 10;
    const start = expectStart(h, { playlist: 'all', source: 'hub', rounds });
    await v11Answer(page, 0, true);
    // The event the browser fires when the tab closes or navigates away. Dispatched
    // here (not a real navigation) so the request stays inside the page's stubs.
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expectFinish(h, start, { playlist: 'all', source: 'hub', rounds, answered: 1, correct: 1, completed: false });
    // A second pagehide, or a quit after it, sends nothing more.
    await page.evaluate(() => { window.dispatchEvent(new Event('pagehide')); });
    await page.getByRole('button', { name: 'Quit blindtest' }).click();
    await expect(page.locator('.p6-hub')).toBeVisible();
    expect(events(h, 'finish')).toHaveLength(1);
  });

  test('group run from the hub index: playlist group:<slug>', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    test.skip(!(await openV11Hub(page)), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.p6-btg-h[data-live]')).toHaveCount(1, { timeout: 20_000 });
    const link = page.locator('a.p6-gi').first();
    const slug = ((await link.getAttribute('href')) ?? '').replace('/blindtest/group-', '');
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    await link.click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    expect(h.generate.at(-1)?.playlist).toBe(slug);
    const start = expectStart(h, { playlist: `group:${slug}`, source: 'hub', rounds: 10 });
    await page.getByRole('button', { name: 'Quit blindtest' }).click();
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expectFinish(h, start, { playlist: `group:${slug}`, source: 'hub', rounds: 10, answered: 0, correct: 0, completed: false });
  });

  test('theme page /blindtest/girl-groups: playlist theme:gg', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    const res = await page.goto('/blindtest/girl-groups');
    test.skip(!res || res.status() !== 200 || !(await isV11(page)) || (await page.locator('.p6-mode').count()) === 0, 'UX v1 flag is OFF on this build');
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await expect(page.locator('.p6-mode-go[data-live]')).toHaveCount(1, { timeout: 60_000 });
    await page.locator('.p6-mode-go .ux-btn').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const want = { playlist: 'theme:gg', source: 'other', rounds: 10 };
    const start = expectStart(h, want);
    await v11PlayAll(page, 10, () => true);
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    const f = expectFinish(h, start, { ...want, answered: 10, correct: 10, completed: true });
    expect(f.best_combo).toBe(10);
  });

  test('daily: playlist daily:<utc date>, source daily; the daily saves are unchanged', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    test.skip(!(await openV11Hub(page, '/blindtest?daily=true')), 'UX v1 flag is OFF on this build');
    const tap = page.getByRole('button', { name: 'Tap to play the clip' });
    await expect(tap).toBeVisible();
    expect(tracked(h), 'waiting for a tap is not a run').toEqual([]);
    await tap.click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const want = { playlist: `daily:${new Date().toISOString().slice(0, 10)}`, source: 'daily', rounds: 10 };
    const start = expectStart(h, want);
    await v11PlayAll(page, 10, (i) => i < 7);
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expectFinish(h, start, { ...want, answered: 10, correct: 7, completed: true });
    // The existing daily submit still goes out with its own body (stubbed), exactly once.
    await expect.poll(() => h.writes.filter((w) => new URL(w.url).pathname === '/api/daily/blindtest/submit').length).toBe(1);
    const submit = JSON.parse(h.writes.find((w) => new URL(w.url).pathname === '/api/daily/blindtest/submit')!.body ?? '{}') as Record<string, unknown>;
    expect(Object.keys(submit).sort()).toEqual(['score', 'time_ms']);
    expect(submit.score).toBe(7);
  });

  test('challenge link: playlist challenge:<code>, source challenge', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const view = {
      code: 'KQ7P2X', playlist: 'all', label: 'All K-pop', creatorName: 'blink_edits', creatorScore: 9, creatorTotal: 10,
      expiresAt: new Date(Date.now() + 3600e3).toISOString(), expired: false, questions: QUESTIONS,
    };
    const h = await harness(page, { challenge: view });
    test.skip(!(await openV11Hub(page, '/blindtest?c=KQ7P2X')), 'UX v1 flag is OFF on this build');
    await page.getByRole('button', { name: 'Tap to play the clip' }).click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const want = { playlist: 'challenge:KQ7P2X', source: 'challenge', rounds: 10 };
    const start = expectStart(h, want);
    await v11PlayAll(page, 10, (i) => i < 6);
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expectFinish(h, start, { ...want, answered: 10, correct: 6, completed: true });
  });
});

// ---- legacy games (v11 flag off) ----

async function openLegacyHub(page: Page, path = '/blindtest'): Promise<boolean> {
  const res = await page.goto(path);
  if (!res || res.status() !== 200 || (await isV11(page))) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await expect(page.locator('.bt-setup .bt-start')).toBeVisible({ timeout: 60_000 });
  // Hydrated: the round chips answer a click.
  await expect(async () => {
    await page.locator('.bt-chip', { hasText: /^5 songs$/ }).click();
    await expect(page.locator('.bt-chip.on', { hasText: /^5 songs$/ })).toHaveCount(1, { timeout: 1000 });
  }).toPass({ timeout: 45_000 });
  return true;
}

async function legacyAnswer(page: Page, i: number, rounds: number, right: boolean): Promise<void> {
  await expect(page.locator('.bt-count')).toHaveText(`${i + 1}/${rounds}`, { timeout: 15_000 });
  await expect(page.locator('.answers button:not([disabled])')).toHaveCount(4);
  await page.locator('.answers button').nth(right ? RIGHT(i) : (RIGHT(i) + 1) % 4).click();
}

test.describe('legacy games record through trackBtRun', () => {
  test('legacy hub run to the results, then a quit on the next run', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    const legacy = await page.goto('/blindtest').then(async (r) => r?.status() === 200 && !(await isV11(page)));
    test.skip(!legacy, 'UX v1 flag is ON on this build (the legacy game is not served)');
    expect(await openLegacyHub(page)).toBe(true);
    expect(tracked(h)).toEqual([]);

    await page.locator('.bt-start').click();
    await legacyAnswer(page, 0, 5, true);
    await expect.poll(() => events(h, 'start').length).toBe(1);
    expect(h.generate.at(-1)).toEqual({ playlist: 'all', count: 5, mode: 'challenge' });
    const want = { playlist: 'all', source: 'hub', rounds: 5 };
    const start = expectStart(h, want);
    for (let i = 1; i < 5; i++) await legacyAnswer(page, i, 5, i !== 2);
    await expect(page.locator('.bt-results')).toBeVisible({ timeout: 15_000 });
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    const f = expectFinish(h, start, { ...want, answered: 5, correct: 4, completed: true });
    expect(f.score, 'the legacy score is the right-answer count').toBe(4);
    expect(f.best_combo).toBe(2);

    // A second run, quit after one answer: a beacon with completed = false.
    await page.goto('/blindtest');
    expect(await openLegacyHub(page)).toBe(true);
    await page.locator('.bt-start').click();
    await legacyAnswer(page, 0, 5, false);
    await expect.poll(() => events(h, 'start').length).toBe(2);
    await page.getByRole('button', { name: 'Quit game' }).click();
    await expect(page.locator('.bt-setup')).toBeVisible();
    await expect.poll(() => events(h, 'finish').length).toBe(2);
    const quit = events(h, 'finish')[1]!;
    expect(quit.run_id).toBe(events(h, 'start')[1]!.run_id);
    expect(quit.run_id).not.toBe(start.run_id);
    expect(quit).toMatchObject({ completed: false, answered: 1, correct: 0, score: 0, playlist: 'all', source: 'hub', rounds: 5 });
  });

  test('legacy daily: playlist daily:<utc date>, source daily', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    const res = await page.goto('/blindtest?daily=true');
    test.skip(!res || res.status() !== 200 || (await isV11(page)), 'UX v1 flag is ON on this build (the legacy game is not served)');
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    await expect(page.locator('.bt-kicker')).toHaveText('Blindtest of the day', { timeout: 60_000 });
    await page.locator('.bt-start').click();
    await legacyAnswer(page, 0, 10, true);
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const want = { playlist: `daily:${new Date().toISOString().slice(0, 10)}`, source: 'daily', rounds: 10 };
    const start = expectStart(h, want);
    await page.getByRole('button', { name: 'Quit game' }).click();
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expectFinish(h, start, { ...want, answered: 1, correct: 1, completed: false });
  });

  test('legacy playlist page /blindtest/girl-groups: theme:gg, finish on the results', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await harness(page);
    const res = await page.goto('/blindtest/girl-groups');
    test.skip(!res || res.status() !== 200 || (await isV11(page)), 'UX v1 flag is ON on this build (the legacy player is not served)');
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    const play = page.getByRole('button', { name: 'Play', exact: true });
    await expect(play).toBeEnabled({ timeout: 60_000 });
    await expect(async () => {
      await play.click({ timeout: 2000 });
      await expect(page.getByText('1 of 10')).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 45_000 });
    expect(h.generate.at(-1)).toEqual({ playlist: 'gg', count: 10, mode: 'challenge' });
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const want = { playlist: 'theme:gg', source: 'other', rounds: 10 };
    const start = expectStart(h, want);
    for (let i = 0; i < 10; i++) {
      await expect(page.getByText(`${i + 1} of 10`)).toBeVisible();
      const answers = page.locator('.space-y-2 > button');
      await expect(answers).toHaveCount(4);
      await answers.nth(i < 8 ? RIGHT(i) : (RIGHT(i) + 1) % 4).click();
      await page.getByRole('button', { name: i === 9 ? 'See results' : 'Next song' }).click();
    }
    await expect(page.getByText('8/10')).toBeVisible();
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    const f = expectFinish(h, start, { ...want, answered: 10, correct: 8, completed: true });
    expect(f.score).toBe(8);
    expect(f.best_combo).toBe(8);
  });
});

// ---- the switch, the endpoint, the admin page ----

test.describe('tracking switch off', () => {
  test('a whole run sends no tracking request and the endpoint is a 404', async ({ page, request }) => {
    test.skip(await trackingOn(request), 'NEXT_PUBLIC_BT_TRACKING is on in this build');
    const res404 = await request.post(TRACK, { data: { event: 'start' } });
    expect(res404.status()).toBe(404);
    // A guest gets what any admin URL that does not exist gives (the middleware sends
    // guests to sign in before a page is looked up); signed in, the page is a 404.
    const runs = await request.get('/admin/blind-tests/runs', { maxRedirects: 0 });
    const ghost = await request.get('/admin/blind-tests/does-not-exist', { maxRedirects: 0 });
    expect(runs.status()).toBe(ghost.status());
    expect((runs.headers().location ?? '').replace('runs', 'x')).toBe((ghost.headers().location ?? '').replace('does-not-exist', 'x'));

    const h = await harness(page);
    const res = await page.goto('/blindtest');
    expect(res?.status()).toBe(200);
    await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
    if (await isV11(page)) {
      await page.locator('.p6-hub[data-live]').waitFor({ timeout: 60_000 });
      await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 20_000 });
      await page.locator('.p6-setup .ux-btn-primary').click();
      await v11Answer(page, 0, true);
      await page.getByRole('button', { name: 'Quit blindtest' }).click();
      await expect(page.locator('.p6-hub')).toBeVisible();
    } else {
      expect(await openLegacyHub(page)).toBe(true);
      await page.locator('.bt-start').click();
      await legacyAnswer(page, 0, 5, true);
      await page.getByRole('button', { name: 'Quit game' }).click();
      await expect(page.locator('.bt-setup')).toBeVisible();
    }
    await page.goto('about:blank');
    expect(tracked(h), 'nothing is sent with the switch off').toEqual([]);
  });
});

test.describe('endpoint guards (no database access on any of these)', () => {
  test('refuses what is not a run and drops bots, always without an error status', async ({ request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const notJson = await request.post(TRACK, { data: 'not json', headers: { 'content-type': 'text/plain' } });
    expect(notJson.status()).toBe(200);
    expect(await notJson.json()).toEqual({ ok: false, reason: 'invalid' });
    expect(notJson.headers()['cache-control']).toContain('no-store');

    const notRun = await request.post(TRACK, { data: { event: 'start', run_id: 'nope', playlist: 'all', mode: 'classic', rounds: 10, clip_played: true }, headers: { 'user-agent': BROWSER_UA } });
    expect(notRun.status()).toBe(200);
    expect(await notRun.json()).toEqual({ ok: false, reason: 'invalid' });

    // A bot is dropped on its user agent, before the body is even validated.
    const bot = await request.post(TRACK, { data: { event: 'start' }, headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } });
    expect(bot.status()).toBe(200);
    expect(await bot.json()).toEqual({ ok: false, reason: 'dropped' });

    expect((await request.get(TRACK)).status(), 'no GET').toBe(405);
  });

  test('/admin/blind-tests/runs: a guest is sent away, the page is not indexable', async ({ request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const res = await request.get('/admin/blind-tests/runs', { maxRedirects: 0 });
    expect([302, 303, 307, 308]).toContain(res.status());
    expect(new URL(res.headers().location ?? '', 'http://x').pathname).not.toBe('/admin/blind-tests/runs');
    expect(await res.text()).not.toContain('Runs per day');
  });
});

// ---- ranked (G1 follow-up, request G1 R1) ----
//
// The ranked run has its own hook (components/ranked/ux-v1/use-ranked-run.ts) and its
// own server engine. Here the whole engine is a fixture: the season card, the issue,
// each released round, each reveal and the submit are answered locally, so nothing of
// ranked and nothing of tracking reaches the server. What is proved is what the page
// sends to /api/track/bt-run, and that the ranked calls themselves did not change.

const RANKED_TOKEN = 'g1-ranked-fixture-token';
const RANKED_POINTS = (i: number): number => 100 + 10 * i;

const RANKED_CARD = {
  season: { id: 1, startsAt: '2026-10-01T00:00:00.000Z', endsAt: '2026-12-31T00:00:00.000Z', daysLeft: 90 },
  signedIn: true,
  me: {
    score: 0,
    tier: { tier: 'bronze', name: 'Bronze', division: 3, label: 'Bronze III' },
    legend: false,
    next: null,
    toBeat: null,
    best: [],
    placement: { done: 0, of: 5, complete: false },
    avgAnswerMs: null,
    runsToday: 0,
    runsLeft: 5,
    resetsAt: '2026-10-03T00:00:00.000Z',
    ladder: { position: null, total: 0 },
    recent: [],
  },
};

interface RankedHarness extends Harness { ranked: Array<{ path: string; body: Record<string, unknown> | null }> }

async function rankedHarness(page: Page): Promise<RankedHarness> {
  const h = (await harness(page)) as RankedHarness;
  h.ranked = [];
  let streak = 0;
  let total = 0;
  const note = (r: Route): Record<string, unknown> | null => {
    const body = (r.request().postDataJSON() ?? null) as Record<string, unknown> | null;
    h.ranked.push({ path: new URL(r.request().url()).pathname, body });
    return body;
  };
  await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, RANKED_CARD));
  await page.route((u) => u.pathname === '/api/ranked/ladder', (r) => json(r, { ranked: 'not_live' }, 503));
  await page.route((u) => u.pathname === '/api/ranked/run', async (r) => {
    note(r);
    streak = 0; total = 0;
    await json(r, { token: RANKED_TOKEN, season: { id: 1, endsAt: RANKED_CARD.season.endsAt }, rounds: 10, roundMs: 10_000, expiresAt: '2099-01-01T00:00:00.000Z', runsToday: 1, runsLeft: 4 });
  });
  await page.route((u) => u.pathname === '/api/ranked/run/start', async (r) => {
    const i = Number(note(r)?.round ?? 0);
    const q = QUESTIONS[i]!;
    await json(r, { round: i, of: 10, kind: kindOf(i) === 'artist' ? 'artist' : 'song', prompt: q.question_text, choices: q.choices, previewUrl: q.preview_url, roundMs: 10_000 });
  });
  await page.route((u) => u.pathname === '/api/ranked/run/answer', async (r) => {
    const body = note(r);
    const i = Number(body?.round ?? 0);
    const choice = typeof body?.choice === 'number' ? body.choice : null;
    const correct = choice === RIGHT(i);
    streak = correct ? streak + 1 : 0;
    const points = correct ? RANKED_POINTS(i) : 0;
    total += points;
    await json(r, {
      round: i, correct, timedOut: choice === null, choice, correctIndex: RIGHT(i), effectiveMs: typeof body?.clientMs === 'number' ? body.clientMs : null,
      points, speedBonus: 0, comboTenths: 10, streak, totalPoints: total, song: QUESTIONS[i]!.reveal, last: i === 9,
    });
  });
  // A refusal (not a transient failure): the results show "this run will be recorded"
  // and no season impact has to be invented here.
  await page.route((u) => u.pathname === '/api/ranked/run/submit', async (r) => { note(r); await json(r, { error: 'run_finished' }, 409); });
  return h;
}

async function openRanked(page: Page): Promise<boolean> {
  const res = await page.goto('/blindtest/ranked');
  if (!res || res.status() !== 200 || !(await isV11(page)) || (await page.locator('.p7-page').count()) === 0) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.locator('.p7-card[data-state="placing"]').waitFor({ timeout: 60_000 });
  return true;
}

function expectRankedSongs(f: Payload, answered: number, right: (i: number) => boolean): void {
  expect(f.songs).toHaveLength(answered);
  (f.songs ?? []).forEach((s, i) => {
    // The ranked server never tells the browser a song id: the round placeholder is
    // sent and the tracking route drops it (unit test in lib/tracking/bt-followup.test.ts).
    expect(s.song_id).toBe(`round-${i}`);
    expect(s.kind).toBe(kindOf(i));
    expect(s.correct).toBe(right(i));
    expect(s.ms as number).toBeGreaterThanOrEqual(0);
    expect(s.ms as number).toBeLessThanOrEqual(10_000);
    expect(Object.keys(s).sort()).toEqual(['correct', 'kind', 'ms', 'song_id']);
  });
}

test.describe('ranked runs record through trackBtRun (mode ranked)', () => {
  const want = { playlist: 'theme:ranked', source: 'other', rounds: 10, mode: 'ranked' };

  test('a ranked run to the results: one start, one completed finish with the server points', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await rankedHarness(page);
    test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
    expect(tracked(h), 'nothing is sent before a run').toEqual([]);

    await page.locator('.p7-card .p7-qact .ux-btn').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length, { message: 'start once the first clip plays' }).toBe(1);
    const starts = events(h, 'start');
    expectContext(starts[0]!, want);
    expect(starts[0]!.clip_played).toBe(true);
    expect(Object.keys(starts[0]!).sort()).toEqual(['anon_id', 'clip_played', 'event', 'locale', 'mode', 'playlist', 'rounds', 'run_id', 'source']);
    expect(events(h, 'finish')).toEqual([]);

    const right = (i: number): boolean => i !== 3 && i !== 7;
    await v11PlayAll(page, 10, right);
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    expect(events(h, 'start'), 'still one start').toHaveLength(1);
    const f = events(h, 'finish')[0]!;
    expectContext(f, want);
    expect(f.run_id).toBe(starts[0]!.run_id);
    expect(f.anon_id).toBe(starts[0]!.anon_id);
    expect(f).toMatchObject({ completed: true, answered: 10, correct: 8, best_combo: 3 });
    expect(f.score, 'the sum of the server points').toBe([0, 1, 2, 4, 5, 6, 8, 9].reduce((s, i) => s + RANKED_POINTS(i), 0));
    expect(f.duration_ms as number).toBeGreaterThan(0);
    expectRankedSongs(f, 10, right);

    // The ranked engine got what it always gets: one issue, ten releases, ten answers, one submit.
    const paths = h.ranked.map((c) => c.path);
    expect(paths.filter((p) => p === '/api/ranked/run')).toHaveLength(1);
    expect(paths.filter((p) => p === '/api/ranked/run/start')).toHaveLength(10);
    expect(paths.filter((p) => p === '/api/ranked/run/answer')).toHaveLength(10);
    const submits = h.ranked.filter((c) => c.path === '/api/ranked/run/submit');
    expect(submits).toHaveLength(1);
    expect(submits[0]!.body).toEqual({ token: RANKED_TOKEN });
    const firstAnswer = h.ranked.find((c) => c.path === '/api/ranked/run/answer')!.body!;
    expect(Object.keys(firstAnswer).sort()).toEqual(['choice', 'clientMs', 'round', 'token']);
    await page.goto('about:blank');
    expect(tracked(h), 'leaving the results sends nothing more').toHaveLength(2);
  });

  test('quitting a ranked run: one beacon finish, completed = false, the answers so far', async ({ page, request }) => {
    test.skip(!(await trackingOn(request)), 'NEXT_PUBLIC_BT_TRACKING is off on this build');
    const h = await rankedHarness(page);
    test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
    const beacons: string[] = [];
    page.on('request', (r) => { if (new URL(r.url()).pathname === TRACK) beacons.push(r.resourceType()); });

    await page.locator('.p7-card .p7-qact .ux-btn').click();
    await expect(page.locator('.p6-ans').first()).toBeVisible();
    await expect.poll(() => events(h, 'start').length).toBe(1);
    const start = events(h, 'start')[0]!;
    await v11Answer(page, 0, true);
    await page.locator('.p6-next').click();
    await v11Answer(page, 1, false);
    await page.getByRole('button', { name: 'Quit blindtest' }).click();
    await expect.poll(() => events(h, 'finish').length).toBe(1);
    const f = events(h, 'finish')[0]!;
    expectContext(f, want);
    expect(f.run_id).toBe(start.run_id);
    expect(f).toMatchObject({ completed: false, answered: 2, correct: 1, best_combo: 1, score: RANKED_POINTS(0) });
    expectRankedSongs(f, 2, (i) => i === 0);
    expect(beacons.at(-1), 'an abandoned run leaves through sendBeacon').toBe('ping');
    // The quit still closes the ranked run on its own server, once.
    await expect.poll(() => h.ranked.filter((c) => c.path === '/api/ranked/run/submit').length).toBe(1);
    await page.goto('about:blank');
    expect(events(h, 'finish'), 'pagehide after a quit sends nothing more').toHaveLength(1);
  });

  test('tracking off: a ranked run sends no tracking request', async ({ page, request }) => {
    test.skip(await trackingOn(request), 'NEXT_PUBLIC_BT_TRACKING is on in this build');
    const h = await rankedHarness(page);
    test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
    await page.locator('.p7-card .p7-qact .ux-btn').click();
    await v11Answer(page, 0, true);
    await page.getByRole('button', { name: 'Quit blindtest' }).click();
    await expect.poll(() => h.ranked.filter((c) => c.path === '/api/ranked/run/submit').length).toBe(1);
    await page.goto('about:blank');
    expect(tracked(h), 'nothing is sent with the switch off').toEqual([]);
  });
});
