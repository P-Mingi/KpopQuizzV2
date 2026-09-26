import fs from 'node:fs';
import path from 'node:path';

import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { APP_DIR, loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, widthOf } from './helpers/setup-page';
import { outcomesOf } from '../../src/lib/ranked/run';
import { scoreRun } from '../../src/lib/ranked/scoring';
import { FixtureRunServer, sampleCard, sampleLadder } from '../../src/lib/ranked/test-fixtures';

import type { Page, Route } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';
import type { Theme } from './helpers/setup-page';
import type { SeasonCard } from '../../src/lib/ranked/service';
import type { LadderScope, LadderView } from '../../src/lib/ranked/view';

// P7 Ranked (UX v11.2): /blindtest/ranked and the ranked run (P6's game view + P6's
// results with the season impact block), flag ON, at the project width (ux-1440 /
// ux-390), light and dark.
//
// Production has no ranked tables yet (v11-p7-ranked.sql is pending), so:
//  - "not live" tests use the REAL API (GET /api/ranked/me answers 503 today; read only);
//  - populated states answer the two GETs with ENGINE OUTPUTS (lib/ranked/test-fixtures:
//    the prototype's sample season through the real seasonCard() / ladderView());
//  - a ranked run is answered by FixtureRunServer (the real run state machine and the
//    real season impact) inside the test, so every POST stays local and its payload
//    is asserted. guardWrites stubs and records any other mutating request.
// Skips on a flag-off build.

const env = loadTestEnv();

// ---- fixtures ---------------------------------------------------------------------

function silentWav(seconds = 12): Buffer {
  const rate = 8000; const n = rate * seconds;
  const b = Buffer.alloc(44 + n, 128);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVE', 8); b.write('fmt ', 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  return b;
}
const WAV = silentWav();
const COVER = fs.readFileSync(path.join(APP_DIR, 'public/mascot/mascot-default.png'));

type Who = 'player' | 'guest' | 'placing' | 'limit';

interface Harness {
  writes: StubbedCall[];
  ranked: Array<{ path: string; body: Record<string, unknown> | null }>;
  ladderScopes: string[];
  server: FixtureRunServer;
}

async function json(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

/** guardWrites first, then the fixtures (later routes win in Playwright). */
async function harness(page: Page, theme: Theme, opts: { who?: Who | 'real'; fandom?: string | null; issue?: { status: number; body: unknown } } = {}): Promise<Harness> {
  await preparePage(page, theme);
  const writes = await guardWrites(page, env.supabaseUrl);
  const server = new FixtureRunServer(() => new Date());
  const h: Harness = { writes, ranked: [], ladderScopes: [], server };
  await page.route(/cdn\.example\/preview\//, (r) => r.fulfill({ status: 200, contentType: 'audio/wav', body: WAV }));
  await page.route(/img\.example\//, (r) => r.fulfill({ status: 200, contentType: 'image/png', body: COVER }));
  const who = opts.who ?? 'player';
  if (who !== 'real') {
    const now = new Date();
    const card: SeasonCard = await sampleCard(now, who);
    await page.route((u) => u.pathname === '/api/ranked/me', (r) => json(r, card));
    await page.route((u) => u.pathname === '/api/ranked/ladder', async (r) => {
      const scope = (new URL(r.request().url()).searchParams.get('scope') ?? 'global') as LadderScope;
      h.ladderScopes.push(scope);
      const view: LadderView = await sampleLadder(now, scope, who === 'guest' ? 'guest' : 'player', opts.fandom === undefined ? 'stray-kids' : opts.fandom);
      await json(r, view);
    });
  }
  // The ranked run: answered by the real engine in this process, never by the server.
  await page.route((u) => u.pathname.startsWith('/api/ranked/run'), async (r) => {
    const req = r.request();
    if (req.method() !== 'POST') { await r.fallback(); return; }
    const p = new URL(req.url()).pathname;
    const body = (req.postDataJSON() ?? null) as Record<string, unknown> | null;
    h.ranked.push({ path: p, body });
    if (p === '/api/ranked/run') {
      if (opts.issue) { await json(r, opts.issue.body, opts.issue.status); return; }
      await json(r, server.issue());
      return;
    }
    const out = p.endsWith('/start') ? server.start(Number(body?.round))
      : p.endsWith('/answer') ? server.answer(Number(body?.round), (body?.choice ?? null) as number | null, (body?.clientMs ?? null) as number | null)
        : server.submit();
    await json(r, out, 'error' in out ? 409 : 200);
  });
  return h;
}

async function openRanked(page: Page): Promise<boolean> {
  const res = await page.goto('/blindtest/ranked');
  if (!res || res.status() !== 200 || !(await hasShell(page))) return false;
  await page.addStyleTag({ content: 'nextjs-portal{display:none!important}' });
  // The controller answered: the card left its loading state.
  await page.locator('.p7-body[data-live]:not([data-live="loading"])').waitFor({ timeout: 45_000 });
  return true;
}

/** Answer the open round (right or wrong) after a human delay, then wait for the reveal. */
async function answer(page: Page, h: Harness, round: number, right: boolean): Promise<void> {
  await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
  await page.waitForTimeout(450); // faster than 300 ms after the release is refused as impossible
  const correct = h.server.correctIndex(round);
  await page.locator('.p6-ans').nth(right ? correct : (correct + 1) % 4).click();
  await expect(page.locator('.p6-next')).toBeVisible();
}

// Prototype landmarks (styles.json, states ranked / btend-ranked) mapped to P7.
const PAGE_LANDMARKS: Landmark[] = [
  { proto: '.sec-h h2', impl: '.p7-sec .ux-sec-h h2', state: 'ranked', box: ['width', 'height'] },
  { proto: '.btn-primary', impl: '.p7-qact .ux-btn-primary', state: 'ranked', box: ['width', 'height'] },
  { proto: '.lrow', impl: '.p7-lrow', state: 'ranked', box: ['width', 'height'] },
  { proto: '.pin', impl: '.p7-pin', state: 'ranked', box: ['width', 'height'] },
];
const RESULT_LANDMARKS: Landmark[] = [
  { proto: '.btn-primary', impl: '.p6-resact .ux-btn-primary', state: 'btend-ranked', box: ['width', 'height'] },
  { proto: '.sec-h h2', impl: '.p6-res .ux-sec-h h2', state: 'btend-ranked', box: ['width', 'height'] },
  // P6's stats box. background skipped: P6 decision 9 (dark box made AA-readable; the
  // prototype's dark capture shows the light box).
  { proto: '.stats3', impl: '.p6-stats3', state: 'btend-ranked', box: ['width', 'height'], skip: ['background-color'] },
];

// ---- specs ------------------------------------------------------------------------

for (const theme of THEMES) {
  test.describe(`ranked ${theme}`, () => {
    test.describe.configure({ timeout: 150_000 });

    test('not live today (real API, read only): truthful state, rules, no ladder, noindex, a11y', async ({ page }) => {
      const h = await harness(page, theme, { who: 'real' });
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('.p7-body')).toHaveAttribute('data-live', 'not_live');
      await expect(page).toHaveTitle('Ranked blindtest | KpopQuiz');
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Not live yet');
      await expect(page.locator('.p7-card')).toContainText('The first season has not started.');
      await expect(page.locator('.p7-qact a.ux-btn-primary')).toHaveAttribute('href', '/blindtest');
      await expect(page.locator('.p7-crumb a')).toHaveAttribute('href', '/blindtest');
      await expect(page.locator('.p7-tk')).toHaveCount(7);
      await expect(page.locator('.p7-tk.is-on')).toHaveCount(0);
      await expect(page.locator('#p7-ladder-h')).toHaveCount(0); // min-gate: no ladder until live
      await expect(page.locator('details.p7-acc')).toHaveCount(6);
      await expect(page.locator('details.p7-acc').first()).toHaveAttribute('open', '');
      await expect(page.locator('.p7-rew .ux-row')).toHaveCount(3);
      // No invented number anywhere on the card.
      expect(await page.locator('.p7-card').innerText()).not.toMatch(/\d,\d{3}|#\d/);
      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(h.writes, 'the page writes nothing').toEqual([]);
      expect(h.ranked).toEqual([]);
    });

    test('placed player (engine fixture): card, tiers, ladder, pinned row, landmarks, a11y', async ({ page }, info) => {
      const h = await harness(page, theme);
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('.p7-body')).toHaveAttribute('data-live', 'live');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('Gold I');
      await expect(page.locator('.p7-season')).toHaveText('Season 3 · ends in 19 days');
      await expect(page.locator('.p7-line')).toHaveText('8,290 season points · #412 of 18,204');
      await expect(page.locator('.p7-next')).toHaveText('210 points to Platinum III');
      await expect(page.locator('.p7-prog')).toHaveAttribute('aria-valuenow', '68.5');
      await expect(page.locator('.p7-note')).toHaveText('Score over 1,420 to count · 12 of 15 runs left today');
      await expect(page.locator('.p7-best5')).toHaveText(/Your best 5 runs:\s*1,910\s*1,780\s*1,640\s*1,540\s*1,420 \(lowest\)\s*= 8,290/);
      await expect(page.locator('.p7-best5 .is-low b')).toHaveText('1,420');
      await expect(page.locator('.p7-tk.is-on')).toHaveText(/Gold/);
      await expect(page.locator('.p7-tk.is-past')).toHaveCount(2);

      // Ladder: 8 rows with flair (accent class, bias chip, profile link) and the pinned row.
      await expect(page.locator('#p7-ladder-h')).toHaveText('Season 3 ladder');
      await expect(page.locator('.p7-lrow')).toHaveCount(8);
      const first = page.locator('.p7-lrow').first();
      await expect(first.locator('.p7-rk')).toHaveText('1');
      await expect(first.locator('a.ux-who')).toHaveAttribute('href', '/u/kwangya_notes');
      await expect(first.locator('a.ux-who')).toHaveClass(/ux-acc-purple/);
      await expect(first.locator('.ux-bias')).toHaveText('Karina');
      await expect(first.locator('.p7-sub')).toHaveText('Master · average 1.4s');
      await expect(first.locator('.p7-score')).toHaveText('13,240');
      await expect(page.locator('.p7-pin')).toContainText('#412');
      await expect(page.locator('.p7-pin')).toContainText('mingi · Gold I · average 2.1s');
      await expect(page.locator('.p7-pin .p7-score')).toHaveText('8,290');
      expect(h.ladderScopes).toEqual(['global']);

      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);
      const cmp = await compareLandmarks(page, widthOf(page), theme, PAGE_LANDMARKS);
      await info.attach('landmarks-ranked.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(h.writes).toEqual([]);
    });

    test('ladder scopes: My fandom, Following, no main fandom = Settings link', async ({ page }) => {
      const h = await harness(page, theme, { fandom: null });
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      const seg = page.locator('.p7-sec .ux-seg');
      await seg.getByRole('button', { name: 'My fandom' }).click();
      await expect(seg.getByRole('button', { name: 'My fandom' })).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.p7-lnote')).toContainText('Pick your main fandom in Settings');
      await expect(page.locator('.p7-lnote a')).toHaveAttribute('href', '/settings');
      await seg.getByRole('button', { name: 'Following' }).click();
      // two fans you follow and you, ranked inside the scope; your row is also pinned
      await expect(page.locator('.p7-lrow')).toHaveCount(3);
      await expect(page.locator('.p7-lrow .p7-rk')).toHaveText(['1', '2', '3']);
      await expect(page.locator('.p7-pin')).toContainText('#3');
      await seg.getByRole('button', { name: 'Global' }).click();
      await expect(page.locator('.p7-pin')).toContainText('#412');
      expect(h.ladderScopes).toEqual(['global', 'fandom', 'following', 'global']);
      expect(h.writes).toEqual([]);
    });

    test('guest: sign-in call opens the sheet (Escape returns focus); personal scopes ask to sign in', async ({ page }) => {
      const h = await harness(page, theme, { who: 'guest' });
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('h1')).toHaveText('Ranked blindtest');
      await expect(page.locator('.p7-season')).toHaveText('Season 3 · ends in 19 days');
      await expect(page.locator('.p7-card')).not.toContainText('season points');
      await expect(page.locator('.p7-lrow')).toHaveCount(8);
      await expect(page.locator('.p7-pin')).toHaveCount(0);
      const cta = page.getByRole('button', { name: 'Sign in to play ranked' });
      await cta.click();
      const dlg = page.getByRole('dialog', { name: 'Sign in to play ranked' });
      await expect(dlg).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(dlg).toBeHidden();
      await expect(cta).toBeFocused();
      await page.locator('.p7-sec .ux-seg').getByRole('button', { name: 'My fandom' }).click();
      await expect(page.getByRole('dialog', { name: 'Sign in to play ranked' })).toBeVisible();
      await page.getByRole('dialog').getByRole('button', { name: /close/i }).first().click();
      expect(h.ladderScopes).toEqual(['global']);
      expect(h.ranked).toEqual([]);
      expect(h.writes).toEqual([]);
    });

    test('placing and no runs left: "3 / 5 placed"; the button is disabled at 0 left', async ({ page }) => {
      await harness(page, theme, { who: 'placing' });
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('h1')).toHaveText('3 / 5 placed');
      await expect(page.locator('.p7-next')).toContainText('2 placement runs to go');
      await expect(page.locator('.p7-best5')).toContainText('Your runs so far:');
      await expect(page.locator('.p7-tk.is-on')).toHaveCount(0);
      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await harness(page, theme, { who: 'limit' });
      await page.reload();
      await page.locator('.p7-body[data-live="live"]').waitFor();
      await expect(page.locator('.p7-qact .ux-btn-primary')).toBeDisabled();
      await expect(page.locator('.p7-note')).toContainText('No ranked runs left today');
    });

    test('a full ranked run: server rounds, server points, results with the season impact', async ({ page }, info) => {
      const h = await harness(page, theme);
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await page.locator('.p7-qact .ux-btn-primary').click();
      await expect(page.locator('.p6-play')).toBeVisible();
      await expect(page.locator('.ux-nav')).toBeHidden(); // focus mode
      await expect(page.locator('.p6-gt')).toHaveText('Ranked');
      await expect(page.locator('.p6-segs span')).toHaveCount(10);
      await expect(page.locator('.p6-lstate')).toContainText('Song 1 of 10');
      await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
      const axeGame = await runAxe(page, { include: '.ux-page' });
      if (axeGame) expect(axeGame, 'axe serious / critical in the ranked game').toEqual([]);

      const rightRounds = new Set([0, 1, 2, 4, 5, 6, 7, 9]); // 8 / 10, like the prototype
      for (let i = 0; i < 10; i++) {
        await answer(page, h, i, rightRounds.has(i));
        const reveal = h.server.state!.rounds[i]!.reveal;
        await expect(page.locator('.p6-rv-t')).toHaveText(reveal.title);
        await expect(page.locator('.p6-vd')).toHaveText(rightRounds.has(i) ? 'Correct' : 'Missed');
        await page.locator('.p6-next').click();
      }
      await expect(page.locator('.p6-btcard')).toBeVisible();

      // Payloads: issue (no body), then start / answer per round, in order, then submit.
      const paths = h.ranked.map((c) => c.path.replace('/api/ranked/run', '') || 'issue');
      expect(paths).toEqual(['issue', ...Array.from({ length: 10 }, () => ['/start', '/answer']).flat(), '/submit']);
      const token = h.server.state!.token;
      h.ranked.filter((c) => c.path.endsWith('/start')).forEach((c, i) => expect(c.body).toEqual({ token, round: i }));
      for (const [i, c] of h.ranked.filter((x) => x.path.endsWith('/answer')).entries()) {
        expect(c.body).toMatchObject({ token, round: i });
        expect(typeof c.body?.choice).toBe('number');
        expect(c.body?.clientMs as number).toBeGreaterThanOrEqual(300);
      }
      expect(h.ranked.at(-1)?.body).toEqual({ token });

      // Results: P6's card with the ranked kicker, the server's points, the impact slot.
      const res = h.server.submit(); // same run, already closed: answers run_finished
      expect('error' in res && res.error).toBe('run_finished');
      await expect(page.locator('.p6-kick')).toHaveText('Ranked run · Season 3');
      await expect(page.locator('.p6-s')).toHaveText('8/10');
      await expect(page.locator('.p7-impact')).toBeVisible();
      await expect(page.locator('.p7-imp-text')).toContainText('This run replaces your lowest best run (1,420). Season score');
      await expect(page.locator('.p7-tierchip').first()).toHaveText('Gold I');
      await expect(page.locator('.p6-resact .ux-btn-primary')).toHaveText('Play another ranked run');
      await expect(page.locator('.p6-mine')).toContainText('Challenge a friend with these exact songs');
      await expect(page.locator('.p6-songrow')).toHaveCount(10);
      // The points on the card are the engine's score of this very run (server answers).
      const engine = scoreRun(outcomesOf(h.server.state!), 10);
      await expect(page.locator('.p6-l')).toHaveText(`Sharp listener · ${engine.points.toLocaleString('en-US')} points`);
      expect(engine.correct).toBe(8);

      const cmp = await compareLandmarks(page, widthOf(page), theme, RESULT_LANDMARKS);
      await info.attach('landmarks-btend-ranked.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);
      const axe = await runAxe(page, { include: '.ux-page' });
      if (axe) expect(axe, 'axe serious / critical on the ranked results').toEqual([]);
      expect(h.writes, 'nothing else was written').toEqual([]);
    });

    test('keys 1-4 answer and Enter goes on; a timeout sends choice null; quitting records the run', async ({ page }) => {
      const h = await harness(page, theme);
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await page.locator('.p7-qact .ux-btn-primary').click();
      await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
      await page.waitForTimeout(450);
      await page.keyboard.press(String(h.server.correctIndex(0) + 1));
      await expect(page.locator('.p6-vd')).toHaveText('Correct');
      await page.locator('body').press('Enter');
      // Round 2: let the 10 s timer run out.
      await expect(page.locator('.p6-ans:not([disabled])')).toHaveCount(4);
      await expect(page.locator('.p6-vd')).toHaveText('Time is up', { timeout: 15_000 });
      const answers = h.ranked.filter((c) => c.path.endsWith('/answer'));
      expect(answers[1]?.body).toMatchObject({ round: 1, choice: null, clientMs: null });
      // Quit: the run is closed on the server (recorded with the songs answered).
      await page.getByRole('button', { name: 'Quit blindtest' }).click();
      await expect(page.getByTestId('ux-toast')).toHaveText('Run recorded with the songs you answered');
      await expect(page.locator('.p7-card')).toBeVisible();
      expect(h.ranked.at(-1)?.path).toBe('/api/ranked/run/submit');
      expect(h.server.state?.status).toBe('quit');
      expect(h.writes).toEqual([]);
    });

    test('refused start (15 a day): toast, no game', async ({ page }) => {
      const h = await harness(page, theme, { issue: { status: 429, body: { error: 'daily_limit', runsToday: 15, limit: 15 } } });
      test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
      await page.locator('.p7-qact .ux-btn-primary').click();
      await expect(page.getByTestId('ux-toast')).toHaveText('No ranked runs left today. They come back at midnight UTC.');
      await expect(page.locator('.p6-play')).toHaveCount(0);
      expect(h.ranked.map((c) => c.path)).toEqual(['/api/ranked/run']);
    });
  });
}

signedInTest('signed in as the test user (real API, read only): not live, nothing written', async ({ page }) => {
  skipUnlessSignedIn();
  const h = await harness(page, 'light', { who: 'real' });
  test.skip(!(await openRanked(page)), 'UX v1 flag is OFF on this build');
  await expect(page.locator('.p7-body')).toHaveAttribute('data-live', 'not_live');
  await expect(page.locator('h1')).toHaveText('Not live yet');
  expect(h.writes).toEqual([]);
  expect(h.ranked).toEqual([]);
});
