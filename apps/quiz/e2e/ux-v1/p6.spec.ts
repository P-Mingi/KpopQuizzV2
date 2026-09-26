import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, widthOf } from './helpers/setup-page';

import type { Page, Route } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';
import type { Theme } from './helpers/setup-page';

// P6 Blindtest (UX v11.2, day mode): the /blindtest hub, the game, the results,
// the daily one try and challenge links, flag ON, at the project width (ux-1440 /
// ux-390), light and dark. Every mutating request is stubbed (guardWrites: the dev
// server and previews use the PRODUCTION Supabase) and its payload asserted. The
// read-only generate / daily GET are answered from fixtures so runs are
// deterministic and never make ensure_daily_blindtest write; the audio is a local
// silent clip. Skips on a flag-off build.

const env = loadTestEnv();

// ---- fixtures ---------------------------------------------------------------------

const TITLES = ["God's Menu", 'How You Like That', 'Supernova', 'Hype Boy', 'Dynamite', 'FANCY', 'HOT', 'SHEESH', 'LOVE DIVE', 'Guerrilla'];
const ARTISTS = ['Stray Kids', 'BLACKPINK', 'aespa', 'NewJeans', 'BTS', 'TWICE', 'SEVENTEEN', 'BABYMONSTER', 'IVE', 'ATEEZ'];

interface Q {
  song_id: string; question_type: 'artist' | 'title'; question_text: string; preview_url: string;
  album_cover_medium: string | null; album_cover_big: string | null; correct_answer: string; choices: string[];
  reveal: { title: string; artist: string; album: string | null; cover: string | null };
}

function question(i: number): Q {
  const artist = i % 3 === 1;
  const pool = artist ? ARTISTS : TITLES;
  const correct = pool[i]!;
  const wrong = [1, 2, 3].map((k) => pool[(i + k) % pool.length]!);
  const choices = [...wrong];
  choices.splice(i % 4, 0, correct);
  return {
    song_id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    question_type: artist ? 'artist' : 'title',
    question_text: artist ? 'Which group is this?' : 'Name the song',
    preview_url: `https://cdnt-preview.dzcdn.net/api/p6-test/${i}.mp3`,
    album_cover_medium: '/mascot/mascot-default.png',
    album_cover_big: '/mascot/mascot-default.png',
    correct_answer: correct,
    choices,
    reveal: { title: TITLES[i]!, artist: ARTISTS[i]!, album: `Album ${i + 1}`, cover: '/mascot/mascot-default.png' },
  };
}
const QUESTIONS = Array.from({ length: 10 }, (_, i) => question(i));
/** Index of the right answer of round i (see question()). */
const RIGHT = (i: number): number => i % 4;

const BOARD_TOP = [
  { rank: 1, name: 'kwangya_notes', username: 'kwangya_notes', avatarUrl: null, accent: 'purple', font: 'mono', bias: 'Karina', score: 10, timeMs: 24100 },
  { rank: 2, name: 'stay4life', username: 'stay4life', avatarUrl: null, accent: 'teal', font: 'default', bias: 'Felix', score: 10, timeMs: 28200 },
  { rank: 3, name: 'blink_edits', username: 'blink_edits', avatarUrl: null, accent: 'pink', font: 'serif', bias: 'Lisa', score: 9, timeMs: 30500 },
  { rank: 4, name: 'hobi_sunshine', username: 'hobi_sunshine', avatarUrl: null, accent: 'amber', font: 'default', bias: 'j-hope', score: 9, timeMs: 31000 },
  { rank: 5, name: 'carat_diary', username: 'carat_diary', avatarUrl: null, accent: 'blue', font: 'default', bias: 'Hoshi', score: 9, timeMs: 33300 },
];
function board(me: 'guest' | 'fresh' | 'played'): Record<string, unknown> {
  const mine = me === 'guest' ? null : {
    played: me === 'played', rank: me === 'played' ? 212 : null, score: me === 'played' ? 8 : null, timeMs: me === 'played' ? 41800 : null,
    best: 8, rankTitle: null, name: 'mingi', avatarUrl: null,
  };
  return { date: new Date().toISOString().slice(0, 10), total: 1204, resetsInMs: 6 * 3600 * 1000 + 60000, top: BOARD_TOP, me: mine };
}

function silentWav(seconds = 12): Buffer {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();

// ---- harness ----------------------------------------------------------------------

interface Harness { writes: StubbedCall[]; generate: unknown[]; created: unknown[] }

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** guardWrites first, then the fixtures (later routes win in Playwright). */
async function harness(page: Page, theme: Theme, opts: { board?: 'guest' | 'fresh' | 'played' | 'real'; challenge?: Record<string, unknown> } = {}): Promise<Harness> {
  await preparePage(page, theme);
  const writes = await guardWrites(page, env.supabaseUrl);
  const h: Harness = { writes, generate: [], created: [] };
  await page.route(/cdnt-preview\.dzcdn\.net/, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  await page.route((u) => u.pathname === '/api/blind-test/generate', async (r) => { h.generate.push(r.request().postDataJSON()); await json(r, { questions: QUESTIONS }); });
  await page.route((u) => u.pathname === '/api/daily/blindtest', (r) => json(r, { date: 'fixture', questions: QUESTIONS, timer_duration: 10, songs_count: 10 }));
  const which = opts.board === 'real' ? null : (opts.board ?? 'guest');
  if (which) await page.route((u) => u.pathname === '/api/ux-v1/p6/board', (r) => json(r, board(which)));
  await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, { ranked: 'not_live' }, 503));
  await page.route((u) => u.pathname === '/api/ux-v1/p6/challenge', async (r) => {
    if (r.request().method() !== 'POST') { await r.fallback(); return; }
    h.created.push(r.request().postDataJSON());
    await json(r, { code: 'KQ7P2X', path: '/blindtest?c=KQ7P2X', expiresAt: new Date(Date.now() + 48 * 3600e3).toISOString() });
  });
  if (opts.challenge) {
    const view = opts.challenge;
    await page.route((u) => /^\/api\/ux-v1\/p6\/challenge\/[A-Z0-9]{6}$/.test(u.pathname), (r) => json(r, view));
  }
  return h;
}

async function openHub(page: Page, path = '/blindtest'): Promise<boolean> {
  const res = await page.goto(path);
  if (!res || res.status() !== 200 || !(await hasShell(page))) return false;
  if ((await page.locator('.p6-hub').count()) === 0 && (await page.locator('.p6-play').count()) === 0) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  await page.locator('.p6-hub[data-live], .p6-play[data-live]').first().waitFor({ timeout: 45_000 });
  return true;
}

async function hubReady(page: Page): Promise<void> {
  await expect(page.locator('.p6-setup[data-live]')).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator('.p6-btg-h[data-live]')).toHaveCount(1, { timeout: 20_000 });
  await expect(page.locator('.p6-board[data-live][data-loaded]')).toHaveCount(1, { timeout: 20_000 });
}

async function start(page: Page): Promise<void> {
  await page.locator('.p6-setup .ux-btn-primary').click();
  await expect(page.locator('.p6-play')).toBeVisible();
  await expect(page.locator('.p6-ans').first()).toBeVisible();
}

/** Answer round `i` right (or wrong) and move on with the Next button. */
async function answer(page: Page, i: number, right: boolean): Promise<void> {
  await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
  await page.locator('.p6-ans').nth(right ? RIGHT(i) : (RIGHT(i) + 1) % 4).click();
  await expect(page.locator('.p6-next')).toBeVisible();
}

async function playAll(page: Page, pattern: (i: number) => boolean): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await answer(page, i, pattern(i));
    await page.locator('.p6-next').click();
  }
  await expect(page.locator('.p6-btcard')).toBeVisible();
}

const nonGenerate = (w: StubbedCall[]): StubbedCall[] => w.filter((c) => !/\/api\/blind-test\/generate$/.test(new URL(c.url).pathname));

// Prototype landmarks (styles.json) mapped to P6's implementation.
const HUB_LANDMARKS: Landmark[] = [
  { proto: '.bthero', impl: '.p6-hero', state: 'blindtest', box: ['width'] },
  { proto: '.gsearch', impl: '.p6-gsearch', state: 'blindtest', box: ['width', 'height'] },
  { proto: '.bpt', impl: '.p6-bpt', state: 'blindtest', box: ['width', 'height'] },
  { proto: '.gi', impl: '.p6-gi', state: 'blindtest', box: ['width', 'height'] },
  { proto: '.sec-h h2', impl: '.ux-sec-h h2', state: 'blindtest', box: ['height'] },
  { proto: '.btn-primary', impl: '.p6-setup .ux-btn-primary', state: 'blindtest', box: ['height'] },
  // Width only: the prototype's sample fans all have a bias tag, which stacks a line on phones.
  { proto: '.lrow', impl: '.p6-lrow', state: 'blindtest', box: ['width'] },
];
// box-shadow skipped: the reference caught the orb mid "glow" animation (a breathing
// second shadow); the static ring shadow (0 0 0 1px --qotd-edge) is the same.
const GAME_LANDMARKS: Landmark[] = [{ proto: '.orb', impl: '.p6-orb', state: 'btplay', box: ['width', 'height'], skip: ['box-shadow'] }];

// ---- specs ------------------------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`blindtest hub ${theme}`, () => {
    // The dev server compiles on first hit and a run is ten rounds: allow for both.
    test.describe.configure({ timeout: 120_000 });
    test('SEO lock, every playlist link, landmarks, no horizontal scroll, a11y', async ({ page }, info) => {
      const h = await harness(page, theme);
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);

      // SEO lock (brief + 16.10): metadata, H1, intro, FAQ + JSON-LD exactly as today.
      await expect(page).toHaveTitle(/K-pop Blind Test - Guess the Song from a Clip/);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /Play the free K-pop blind test: hear a 10-second clip and guess the song\./);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/blindtest$/);
      await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute('href', /\/pt\/blindtest$/);
      await expect(page.locator('h1')).toHaveCount(1);
      expect(await page.locator('h1').evaluate((e) => e.textContent)).toBe('Name thatK-pop song');
      await expect(page.locator('.p6-lead')).toHaveText('10 songs. 10 seconds each. Guess the song or the artist from a clip.');
      const faq = await page.locator('.p6-acc summary').allTextContents();
      expect(faq.map((q) => q.trim())).toEqual([
        'What is a K-pop blind test?', 'How many songs are available?', 'Can I play for just one group?', 'How does a round work?',
        'Is the blind test free?', 'What generations are covered?', 'Can I play on mobile?',
      ]);
      const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
      const types = ld.map((t) => (JSON.parse(t) as { '@type': string })['@type']);
      expect(types).toEqual(expect.arrayContaining(['FAQPage', 'WebApplication', 'BreadcrumbList']));
      const faqLd = ld.map((t) => JSON.parse(t) as { '@type': string; mainEntity?: { name: string }[] }).find((j) => j['@type'] === 'FAQPage');
      expect(faqLd?.mainEntity?.map((q) => q.name)).toEqual(faq.map((q) => q.trim()));

      // Every group playlist and every theme playlist is a real link (as today).
      const n = Number((await page.locator('.p6-more > summary').textContent())?.match(/\d+/)?.[0]);
      expect(n, 'playlist count').toBeGreaterThan(24);
      await expect(page.locator('.p6-gsearch input')).toHaveAttribute('placeholder', `Search ${n} groups`);
      await expect(page.locator('a.p6-gi')).toHaveCount(n);
      await expect(page.locator('a.p6-gi').first()).toHaveAttribute('href', /^\/blindtest\/group-[a-z0-9-]+$/);
      await expect(page.locator('.p6-bpt')).toHaveCount(6);
      await expect(page.locator('.p6-themes a')).toHaveCount(18);
      await expect(page.locator('.p6-themes a[href="/blindtest/classic"]')).toHaveCount(1);
      await expect(page.locator('a.p6-mcard[href="/blindtest/ranked"]')).toHaveCount(1);
      await expect(page.locator('.p6-eyebrow')).toContainText('1,204 fans playing today');

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, HUB_LANDMARKS);
      await info.attach('landmarks-hub.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);

      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical on the hub').toEqual([]);
      expect(h.writes, 'the hub writes nothing').toEqual([]);
    });

    test('playlist menu: all groups + mixes, search, pick, Escape returns focus; rounds; Start sends the live body', async ({ page }) => {
      const h = await harness(page, theme);
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      const trigger = page.locator('.p6-pl');
      await trigger.click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'true');
      const menu = page.locator('.p6-plmenu');
      await expect(menu).toBeVisible();
      await expect(menu.locator('.p6-mi').first()).toContainText(/All K-pop\s*[\d,]+ songs/);
      const total = Number((await menu.locator('.p6-pl-h small').first().textContent())?.match(/\d+/)?.[0]);
      await expect(menu.locator('.p6-pl-list .p6-mi')).toHaveCount(total);
      await menu.getByLabel('Find a group').fill('nct');
      const nct = await menu.locator('.p6-pl-list .p6-mi').count();
      expect(nct).toBeLessThan(total);
      await expect(menu.locator('.p6-pl-h small').first()).toHaveText(`${nct} ${nct === 1 ? 'playlist' : 'playlists'}`);
      await menu.getByLabel('Find a group').fill('');
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();

      // By generation opens the generations; a pick updates the button and toasts.
      await trigger.click();
      const gen = menu.getByRole('button', { name: /By generation/ });
      await gen.click();
      await expect(gen).toHaveAttribute('aria-expanded', 'true');
      await menu.getByRole('button', { name: '4th gen', exact: true }).click();
      await expect(menu).toBeHidden();
      await expect(trigger.locator('b')).toHaveText('4th gen');
      await expect(page.getByTestId('ux-toast')).toHaveText('Playlist: 4th gen');

      // A group pick, then the rounds (hidden on phones like the prototype), then Start.
      await trigger.click();
      await menu.getByLabel('Find a group').fill('bts');
      await menu.locator('.p6-pl-list .p6-mi', { hasText: /^BTS/ }).first().click();
      await expect(trigger.locator('b')).toHaveText('BTS');
      const seg = page.locator('.p6-seg');
      let count = 10;
      if (await seg.isVisible()) {
        await seg.getByRole('button', { name: '5 songs', exact: true }).click();
        await expect(seg.getByRole('button', { name: '5 songs', exact: true })).toHaveAttribute('aria-pressed', 'true');
        await expect(seg.getByRole('button', { name: '10 songs', exact: true })).toHaveAttribute('aria-pressed', 'false');
        count = 5;
      }
      await start(page);
      expect(h.generate.at(-1), 'the live game body').toEqual({ playlist: 'bts', count, mode: 'challenge' });
      if (widthOf(page) > 760) await expect(page.locator('.p6-gt')).toHaveText('BTS');
      expect(nonGenerate(h.writes)).toEqual([]);
    });

    test('game: orb, keys 1-4, answer states, live region, focus to Next, Enter, sound, replay, quit', async ({ page }, info) => {
      const h = await harness(page, theme);
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      // Freeze Date.now (timers keep running): every answer is timed at 0 ms, so the
      // points are the formula's exact value whatever the machine load.
      await page.clock.setFixedTime(Date.now());
      await start(page);
      // Focus mode: nav, tab bar and footer are gone; the slim game bar remains.
      await expect(page.locator('.ux-nav')).toBeHidden();
      await expect(page.locator('.ux-foot')).toBeHidden();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.p6-orb [role="timer"]')).toHaveAttribute('aria-label', /\d+ seconds left/);
      await expect(page.locator('.p6-segs span')).toHaveCount(10);
      await expect(page.locator('.p6-segs span.is-cur')).toHaveCount(1);
      await expect(page.locator('.p6-rlab span')).toHaveText('Song round');
      await expect(page.locator('.p6-btq')).toHaveText('Which song is this?');
      await expect(page.locator('.p6-ans').first()).toHaveAttribute('aria-keyshortcuts', '1');
      const cmp = await compareLandmarks(page, widthOf(page), theme, GAME_LANDMARKS);
      expect(cmp.mismatches, 'orb styles').toEqual([]);

      // Key 1 on round 0 is the right answer (index 0), at 0 ms: full speed bonus.
      await page.keyboard.press('1');
      await expect(page.locator('.p6-ans.is-ok')).toHaveCount(1);
      await expect(page.locator('.p6-ans.is-ok')).toContainText('Correct');
      await expect(page.locator('.p6-vd')).toHaveText('Correct');
      await expect(page.locator('.p6-rv-t')).toHaveText(TITLES[0]!);
      await expect(page.locator('.p6-sa')).toHaveText(`${ARTISTS[0]} · Album 1`);
      await expect(page.getByTestId('ux-live')).toContainText(`Correct, plus 200 points. ${TITLES[0]} by ${ARTISTS[0]}.`, { timeout: 2000 });
      await expect(page.locator('.p6-gscore')).toContainText('200');
      await expect(page.locator('.p6-next')).toBeFocused();
      await expect(page.locator('.p6-nxt')).toContainText('Next song in 3 seconds');
      await page.keyboard.press('Enter');

      // Round 1 (artist round): a wrong pick shows Your pick + the right one, muted rest.
      await expect(page.locator('.p6-rlab span')).toHaveText('Artist round');
      await expect(page.locator('.p6-rlab span')).toHaveClass(/is-artist/);
      await expect(page.locator('.p6-btq')).toHaveText('Who sings this?');
      await page.locator('.p6-ans').nth((RIGHT(1) + 1) % 4).click();
      await expect(page.locator('.p6-ans.is-no')).toContainText('Your pick');
      await expect(page.locator('.p6-ans.is-ok')).toHaveCount(1);
      await expect(page.locator('.p6-ans.is-rest')).toHaveCount(2);
      await expect(page.locator('.p6-vd')).toHaveText('Missed');
      await expect(page.locator('.p6-segs span.is-ok')).toHaveCount(1);
      await expect(page.locator('.p6-segs span.is-no')).toHaveCount(1);
      await expect(page.getByTestId('ux-live')).toContainText('Missed.');
      await info.attach(`btplay-answered-${widthOf(page)}-${theme}.png`, { body: await page.screenshot(), contentType: 'image/png' });

      // Auto-next after 3 s (generous timeout: a loaded CI box can be slow to paint).
      await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4, { timeout: 10_000 });
      await expect(page.locator('.p6-lstate')).toContainText('Song 3 of 10');

      // Sound toggle + replay are keyboard buttons.
      const mute = page.getByRole('button', { name: 'Mute the clip' });
      await mute.focus();
      await page.keyboard.press('Enter');
      await expect(mute).toHaveAttribute('aria-pressed', 'true');
      await page.keyboard.press('Space');
      await expect(mute).toHaveAttribute('aria-pressed', 'false');
      await expect(page.getByRole('button', { name: 'Replay the clip' })).toBeEnabled();
      await page.getByRole('button', { name: 'Replay the clip' }).click();

      const axe = await runAxe(page, { include: '.p6-play' });
      if (axe) expect(axe, 'axe serious / critical in game').toEqual([]);

      // Quit returns to the hub, chrome back.
      await page.getByRole('button', { name: 'Quit blindtest' }).click();
      await expect(page.locator('.p6-hero')).toBeVisible({ timeout: 10_000 });
      await expect(page.locator('.ux-nav')).toBeVisible();
      expect(nonGenerate(h.writes)).toEqual([]);
    });

    test('quit while the songs load: the hub stays, the late answer is ignored', async ({ page }) => {
      await harness(page, theme);
      // Slow generate: the answer lands after the player has quit.
      await page.route((u) => u.pathname === '/api/blind-test/generate', async (r) => {
        await new Promise((res) => setTimeout(res, 1500));
        await json(r, { questions: QUESTIONS });
      });
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      await page.locator('.p6-setup .ux-btn-primary').click();
      await expect(page.locator('.p6-play[data-phase="loading"]')).toBeVisible();
      await page.getByRole('button', { name: 'Quit blindtest' }).click();
      await expect(page.locator('.p6-hero')).toBeVisible();
      await page.waitForTimeout(2500);
      await expect(page.locator('.p6-play')).toHaveCount(0);
      await expect(page.locator('.p6-hero')).toBeVisible();
    });

    test('results: stats, Play again, Share sheet, song clips, Copy link payload, free play writes nothing else', async ({ page }) => {
      const h = await harness(page, theme);
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      await start(page);
      await playAll(page, (i) => i !== 3 && i !== 7);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('8/10 on the All K-pop blindtest');
      await expect(page.locator('.p6-s')).toHaveText('8/10');
      await expect(page.locator('.p6-l')).toContainText(/Sharp listener · [\d,]+ points/);
      await expect(page.locator('.p6-stats3 > div')).toHaveCount(3);
      await expect(page.locator('.p6-stats3')).toContainText('Best combo');
      await expect(page.locator('.p6-stats3')).toContainText('Average answer');
      await expect(page.locator('.p6-stats3')).toContainText('Fastest answer'); // free play awards no XP (live behaviour)
      await expect(page.getByTestId('ux-live')).toContainText('Blindtest finished. 8 out of 10');
      await expect(page.locator('.p6-songrow')).toHaveCount(10);
      await expect(page.locator('.p6-songrow .p6-sres.is-no')).toHaveCount(2);

      // Song clip buttons toggle (aria-pressed), keyboard operable.
      const play0 = page.locator('.p6-play-b').first();
      await play0.focus();
      await page.keyboard.press('Enter');
      await expect(play0).toHaveAttribute('aria-pressed', 'true');
      await play0.click();
      await expect(play0).toHaveAttribute('aria-pressed', 'false');

      // Share sheet: real numbers, closes with Escape, focus returns.
      const share = page.getByRole('button', { name: 'Share', exact: true });
      await share.click();
      const dlg = page.locator('.ux-layer [role="dialog"]');
      await expect(dlg).toBeVisible();
      await expect(dlg).toContainText('8/10 on the All K-pop blindtest');
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(share).toBeFocused();

      // Challenge a friend: the payload is the run (no preview URLs), then the link shows.
      await page.getByRole('button', { name: 'Copy link' }).click();
      await expect(page.locator('.p6-link')).toContainText('/blindtest?c=KQ7P2X');
      const c = h.created.at(-1) as { playlist: string; score: number; total: number; questions: Record<string, unknown>[]; bestCombo: number; points: number };
      expect(c.playlist).toBe('all');
      expect(c.score).toBe(8);
      expect(c.total).toBe(10);
      expect(c.questions).toHaveLength(10);
      expect(c.questions[0]).not.toHaveProperty('preview_url');
      expect(c.questions[0]?.song_id).toBe(QUESTIONS[0]!.song_id);
      expect(c.bestCombo).toBe(3);

      const axe = await runAxe(page, { include: '.p6-res' });
      if (axe) expect(axe, 'axe serious / critical on results').toEqual([]);

      // Play again: the same body again.
      const before = h.generate.length;
      await page.getByRole('button', { name: 'Play again' }).click();
      await expect(page.locator('.p6-play')).toBeVisible();
      expect(h.generate.length).toBe(before + 1);
      expect(h.generate.at(-1)).toEqual(h.generate.at(-2));
      expect(nonGenerate(h.writes), 'free play saves nothing (live behaviour)').toEqual([]);
    });

    test('daily: one try, the live saves in order, See today\'s board', async ({ page }) => {
      const h = await harness(page, theme, { board: 'fresh' });
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      const card = page.locator('a.p6-mcard[href="/blindtest?daily=true"]');
      await expect(card.locator('.p6-ft')).toHaveText('1,204 played · 6 hours left');
      await card.click();
      await expect(page.locator('.p6-play')).toBeVisible();
      await expect(page.locator('.p6-gt')).toHaveText('Blindtest of the day');
      await playAll(page, (i) => i < 7);
      await expect(page.locator('.p6-kick')).toHaveText('Blindtest of the day');
      await expect.poll(() => nonGenerate(h.writes).map((w) => new URL(w.url).pathname)).toEqual(['/api/daily/blindtest/submit', '/api/daily/complete']);
      const submit = JSON.parse(nonGenerate(h.writes)[0]!.body ?? '{}') as { score: number; time_ms: number };
      expect(submit.score).toBe(7);
      expect(submit.time_ms).toBeGreaterThanOrEqual(0);
      expect(submit.time_ms).toBeLessThanOrEqual(100_000);
      expect(JSON.parse(nonGenerate(h.writes)[1]!.body ?? '{}')).toEqual({ kind: 'blindtest' });
      expect(h.generate, 'the daily does not call generate').toEqual([]);
      expect(await page.evaluate(() => localStorage.getItem('kq_daily_blindtest_played'))).toBe(new Date().toISOString().slice(0, 10));
      await page.getByRole('button', { name: 'See today\'s board' }).click();
      await expect(page.locator('#bt-board')).toBeInViewport();

      // Second try the same day: no game, a toast, the board.
      await card.click();
      await expect(page.locator('.p6-play')).toHaveCount(0);
      await expect(page.getByTestId('ux-toast')).toContainText('One try per day');
    });

    test('daily deep link: tap to play the clip, and a played day goes to the board', async ({ page }) => {
      await harness(page, theme, { board: 'guest' });
      test.skip(!(await openHub(page, '/blindtest?daily=true')), 'UX v1 flag is OFF on this build');
      await expect(page.locator('.p6-play')).toBeVisible();
      const tap = page.getByRole('button', { name: 'Tap to play the clip' });
      await expect(tap).toBeVisible();
      await expect(page.locator('h1')).toHaveText('Ten songs, the same for everyone.');
      await tap.click();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      await page.getByRole('button', { name: 'Quit blindtest' }).click();

      await page.evaluate(() => localStorage.setItem('kq_daily_blindtest_played', new Date().toISOString().slice(0, 10)));
      await page.goto('/blindtest?daily=true');
      await expect(page.locator('.p6-hero')).toBeVisible();
      await expect(page.getByTestId('ux-toast')).toContainText('One try per day');
    });

    test('today\'s board: flair names, your row Play starts the daily; played shows your rank', async ({ page }) => {
      await harness(page, theme, { board: 'fresh' });
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      const rows = page.locator('.p6-board .p6-lrow');
      await expect(rows).toHaveCount(6);
      await expect(rows.first().locator('.ux-who')).toHaveText('kwangya_notes');
      await expect(rows.first().locator('.ux-who')).toHaveClass(/ux-acc-purple/);
      await expect(rows.first().locator('.ux-bias')).toHaveText('Karina');
      await expect(rows.first().locator('.ux-who')).toHaveAttribute('href', '/u/kwangya_notes');
      await expect(rows.first().locator('.p6-pts')).toHaveText('24.1s');
      const you = page.locator('.p6-lrow.is-you');
      await expect(you).toContainText('not played today');
      await expect(page.locator('.p6-btbest')).toHaveText('Your best 8/10');
      await you.getByRole('button', { name: 'Play' }).click();
      await expect(page.locator('.p6-play')).toBeVisible();
      await expect(page.locator('.p6-gt')).toHaveText('Blindtest of the day');
    });

    test('board when played: your rank row and the daily card say so', async ({ page }) => {
      await harness(page, theme, { board: 'played' });
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      await expect(page.locator('.p6-lrow.is-you')).toContainText('8/10 · played today');
      await expect(page.locator('.p6-lrow.is-you .p6-rk')).toHaveText('#212');
      await expect(page.locator('a.p6-mcard[href="/blindtest?daily=true"] .p6-ft')).toHaveText('Played · 8/10 · #212 today');
      await page.locator('a.p6-mcard[href="/blindtest?daily=true"]').click();
      await expect(page.locator('.p6-play')).toHaveCount(0);
      await expect(page.getByTestId('ux-toast')).toHaveText('One try per day. Your 8/10 is on today\'s board.');
    });

    test('play by group: popular six, index, search + empty state, Show all, a row starts that group', async ({ page }) => {
      const h = await harness(page, theme);
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      await hubReady(page);
      const idx = page.locator('.p6-btidx').first();
      await expect(idx.locator('a.p6-gi')).toHaveCount(24);
      const more = page.locator('.p6-more');
      await expect(more).not.toHaveAttribute('open', '');
      await more.locator('summary').click();
      await expect(more).toHaveAttribute('open', '');
      await expect(more.locator('summary')).toBeHidden();
      await expect(more.locator('a.p6-gi').first()).toBeVisible();

      const q = page.locator('.p6-gsearch input');
      await q.fill('zzzz');
      await expect(page.locator('.p6-btg-empty')).toHaveText('No group matches. Try the All K-pop playlist.');
      await expect(page.locator('.p6-btpop')).toHaveCount(0);
      await q.fill('stray');
      await expect(page.locator('a.p6-gi')).toHaveCount(1);
      const row = page.locator('a.p6-gi').first();
      await expect(row).toHaveAttribute('href', '/blindtest/group-stray-kids');
      await expect(row).toHaveAttribute('aria-label', /Stray Kids blindtest, \d+ songs/);
      await q.press('Tab');
      await expect(row).toBeFocused();
      await expect(row.locator('.p6-gp')).toHaveCSS('opacity', '1');
      await page.keyboard.press('Enter');
      await expect(page.locator('.p6-play')).toBeVisible();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      expect(h.generate.at(-1)).toEqual({ playlist: 'stray-kids', count: 10, mode: 'challenge' });
      await page.getByRole('button', { name: 'Quit blindtest' }).click();
      await expect(page.locator('.p6-hero')).toBeVisible();
      await expect(page.locator('.p6-pl b')).toHaveText('Stray Kids');

      // Popular tile starts its group too.
      await page.locator('.p6-gsearch input').fill('');
      const tile = page.locator('.p6-bpt').first();
      const slug = (await tile.getAttribute('href'))?.replace('/blindtest/group-', '');
      await tile.click();
      await expect(page.locator('.p6-play')).toBeVisible();
      expect(h.generate.at(-1)).toEqual({ playlist: slug, count: 10, mode: 'challenge' });
    });

    test('challenge link: tap to play with the score to beat, attempt payload, who won', async ({ page }) => {
      const view = {
        code: 'KQ7P2X', playlist: 'all', label: 'All K-pop', creatorName: 'blink_edits', creatorScore: 9, creatorTotal: 10,
        expiresAt: new Date(Date.now() + 3600e3).toISOString(), expired: false, questions: QUESTIONS,
      };
      const h = await harness(page, theme, { challenge: view });
      test.skip(!(await openHub(page, '/blindtest?c=KQ7P2X')), 'UX v1 flag is OFF on this build');
      await expect(page.locator('.p6-play')).toBeVisible();
      await expect(page.locator('h1')).toHaveText('blink_edits scored 9/10. Your turn.');
      expect(new URL(page.url()).search, 'the code leaves the URL').toBe('');
      await page.getByRole('button', { name: 'Tap to play the clip' }).click();
      await expect(page.locator('.p6-ans').first()).toBeVisible();
      if (widthOf(page) > 760) await expect(page.locator('.p6-gch')).toHaveText('Beat blink_edits: 9/10');
      await playAll(page, (i) => i < 6);
      await expect(page.locator('.p6-outcome')).toHaveText('blink_edits wins this one (9/10). Same songs, one more try?');
      await expect.poll(() => h.writes.filter((w) => w.url.includes('/attempt')).length).toBe(1);
      const a = JSON.parse(h.writes.find((w) => w.url.includes('/api/ux-v1/p6/challenge/KQ7P2X/attempt'))!.body ?? '{}') as Record<string, number>;
      expect(a.score).toBe(6);
      expect(a.total).toBe(10);
      await expect(page.getByRole('button', { name: 'Copy link' })).toHaveCount(0);
      expect(h.generate, 'a challenge plays the frozen songs').toEqual([]);
    });

    test('expired or unknown challenge link: toast, the hub stays', async ({ page }) => {
      await harness(page, theme, { challenge: { code: 'KQ7P2X', expired: true, questions: [], creatorName: 'x', creatorScore: 1, creatorTotal: 10, label: 'All K-pop', playlist: 'all', expiresAt: new Date().toISOString() } });
      test.skip(!(await openHub(page, '/blindtest?c=KQ7P2X')), 'UX v1 flag is OFF on this build');
      await expect(page.getByTestId('ux-toast')).toHaveText('This challenge link has expired. Play a new run instead.');
      await expect(page.locator('.p6-hero')).toBeVisible();
    });

    test('FAQ opens in place (answers in the HTML), theme links and keyboard focus ring', async ({ page }) => {
      await harness(page, theme);
      test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
      const first = page.locator('.p6-acc').first();
      await expect(first.locator('.p6-ab')).toHaveText(/A blind test plays a short audio clip/);
      await first.locator('summary').click();
      await expect(first).toHaveAttribute('open', '');
      await first.locator('summary').press('Enter');
      await expect(first).not.toHaveAttribute('open', '');
      await page.locator('.p6-lead').click();
      await page.locator('.p6-pl').focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await expect(page.locator('.p6-pl')).toBeFocused();
      const ring = await page.locator('.p6-pl').evaluate((e) => getComputedStyle(e).outlineColor + ' ' + getComputedStyle(e).outlineWidth);
      expect(ring).toBe('rgb(232, 69, 122) 2px');
    });
  });
}

test.describe('wiring (real, read only)', () => {
  test.describe.configure({ timeout: 120_000 });
  test('board endpoint answers its shape; the hub lists every playable group', async ({ page, request }) => {
    const res = await request.get('/api/ux-v1/p6/board');
    test.skip(res.status() === 404, 'UX v1 flag is OFF on this build');
    expect(res.status()).toBe(200);
    const b = (await res.json()) as { date: string; total: number; resetsInMs: number; top: unknown[]; me: unknown };
    expect(b.date).toBe(new Date().toISOString().slice(0, 10));
    expect(typeof b.total).toBe('number');
    expect(b.top.length).toBeLessThanOrEqual(5);
    expect(b.me).toBeNull();
    expect(JSON.stringify(b)).not.toMatch(/user_id|email/);
    const writes = await guardWrites(page, env.supabaseUrl);
    await preparePage(page, 'light');
    test.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
    const n = await page.locator('a.p6-gi').count();
    expect(n, 'playlists = getAdvertisablePlaylists() groups').toBeGreaterThanOrEqual(79);
    expect(writes).toEqual([]);
  });

  test('unknown challenge code is a 404', async ({ request }) => {
    const res = await request.get('/api/ux-v1/p6/challenge/ZZZZZZ');
    test.skip(res.status() === 404 && (await request.get('/api/ux-v1/p6/board')).status() === 404, 'UX v1 flag is OFF on this build');
    expect(res.status()).toBe(404);
  });
});

signedInTest.describe('signed in (test user, read only)', () => {
  signedInTest.describe.configure({ timeout: 120_000 });
  signedInTest('your row, best and played state come from the real board; zero writes', async ({ page }) => {
    skipUnlessSignedIn();
    const writes = await guardWrites(page, env.supabaseUrl);
    await preparePage(page, 'light');
    await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, { ranked: 'not_live' }, 503));
    signedInTest.skip(!(await openHub(page)), 'UX v1 flag is OFF on this build');
    await expect(page.locator('.p6-board[data-loaded]')).toHaveCount(1, { timeout: 20_000 });
    const you = page.locator('.p6-lrow.is-you');
    await expect(you).toHaveCount(1);
    await expect(you).toContainText(/not played today|played today/);
    expect(writes, 'viewing the hub signed in writes nothing').toEqual([]);
  });
});
