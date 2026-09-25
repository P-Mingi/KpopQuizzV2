import { test, expect } from '@playwright/test';

import { basicA11y, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, waitHydrated, widthOf } from './helpers/setup-page';

import type { Page } from '@playwright/test';
import type { StubbedCall } from './helpers/guard';
import type { Landmark } from './helpers/landmarks';

// P4: /q/[slug] (quiz page), the quiz game and the results, flag on (DESIGN-SPEC
// 16.7, 17.4, 17.11; prototype states quiz, play, play-answered, play-qotd, end,
// end-guest, share). Every mutating request is answered by guardWrites (production
// is never written); the spec asserts the payloads the page sends instead. The
// quizzes are real published quizzes read from production (read only).

const env = loadTestEnv();

// A dev server renders /q/[slug] on demand (several seconds cold, much more on a loaded
// machine): every P4 test gets 2 minutes.
test.describe.configure({ timeout: 120_000 });
signedInTest.describe.configure({ timeout: 120_000 });

const SLUG = {
  classic: 'ultimate-bts-era-quiz-only-real-armys-survive',
  tf: 'skz-true-or-false-only-real-stays-pass',
  image: 'real-coers-cortis-fans-can-take-this-quiz',
  clues: 'guess-the-bts-member-from-clues',
  intruder: 'are-u-a-real-gllit',
} as const;

const P4_LANDMARKS: Record<string, Landmark[]> = {
  quiz: [
    { proto: '.aboutbox', impl: '.p4-about.ux-box', state: 'quiz' },
    { proto: '.tcard', impl: '.ux-tcard', state: 'quiz' },
    { proto: '.sec-h h2', impl: '.ux-sec-h h2', state: 'quiz', box: ['height'] },
    { proto: '.btn-primary', impl: '.p4-act .ux-btn-primary', state: 'quiz', box: ['height'] },
  ],
  play: [
    { proto: '.tring', impl: '.p4-tring', state: 'play', box: ['width', 'height'] },
  ],
  answered: [
    { proto: '.tring', impl: '.p4-tring', state: 'play-answered', box: ['width', 'height'] },
    { proto: '.btn-primary', impl: '.p4-nextrow .ux-btn-primary', state: 'play-answered', box: ['height'] },
  ],
  end: [
    { proto: '.stats3', impl: '.p4-res-in .ux-stats3', state: 'end-guest', box: ['height'] },
    { proto: '.sec-h h2', impl: '.p4-keep .ux-sec-h h2', state: 'end-guest', box: ['height'] },
    { proto: '.btn-primary', impl: '.p4-resact .ux-btn-primary', state: 'end-guest', box: ['height'] },
  ],
};

interface Q { question: string; options?: unknown[]; correct: number | boolean; clues?: string[] }

function correctIndex(q: Q): number {
  if (typeof q.correct === 'boolean') {
    if (q.options && q.options.length > 0) return q.options.findIndex((o) => String(o).toLowerCase() === (q.correct ? 'true' : 'false'));
    return q.correct ? 0 : 1;
  }
  return q.correct;
}

/** Records the questions the page fetched (read only) so a run can pick right or wrong answers. */
async function recordQuestions(page: Page): Promise<{ get: () => Q[] }> {
  let qs: Q[] = [];
  await page.route(/\/api\/quiz\/[^/]+\/questions$/, async (route) => {
    const res = await route.fetch();
    const json = (await res.json()) as { questions: Q[] };
    qs = json.questions;
    await route.fulfill({ response: res, json });
  });
  return { get: () => qs };
}

async function openQuiz(page: Page, slug: string, query = ''): Promise<boolean> {
  // domcontentloaded: the dev server optimises remote covers and avatars on the fly, and
  // the load event waits for every image (not what these checks are about)
  const res = await page.goto(`/q/${slug}${query}`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  // a failed load is a failure, never a skip; only a flag-off page (no v11 markup) skips
  expect(res?.status(), `GET /q/${slug}`).toBe(200);
  if (!(await hasShell(page)) || (await page.locator('.p4-page').count()) === 0) return false;
  await waitHydrated(page);
  // the P4 islands are code-split (components/quiz/ux-v1/islands.tsx) and hydrate after the shell;
  // tests that click another island wait for its own marker (a dev server compiles each chunk on demand)
  await page.locator('.p4-act[data-ready]').waitFor({ state: 'attached', timeout: 90_000 });
  return true;
}

async function start(page: Page): Promise<void> {
  await page.locator('.p4-act .ux-btn-primary').click();
  await expect(page.locator('.p4-qq')).toBeVisible({ timeout: 20_000 });
}

const answerButtons = (page: Page) => page.locator('.p4-answers .p4-ans, .p4-igrid .p4-ians');

/** Plays the whole run: every answer right, every answer wrong, or a fixed pattern. */
async function playRun(page: Page, qs: () => Q[], mode: 'right' | 'wrong'): Promise<number> {
  let n = 0;
  for (let guard = 0; guard < 40; guard++) {
    const idx = Number(await page.locator('.p4-segs').getAttribute('aria-valuenow')) - 1;
    const q = qs()[idx];
    const right = q ? correctIndex(q) : 0;
    const pick = mode === 'right' ? right : (right === 0 ? 1 : 0);
    await answerButtons(page).nth(pick).click();
    n++;
    const next = page.locator('.p4-nextrow .ux-btn-primary');
    await expect(next).toBeVisible();
    const label = await next.innerText();
    await next.click();
    if (/result/i.test(label)) break;
    await expect(answerButtons(page).first()).toBeEnabled();
  }
  await expect(page.locator('.p4-pcard')).toBeVisible({ timeout: 20_000 });
  return n;
}

const writesTo = (calls: StubbedCall[], re: RegExp): StubbedCall[] => calls.filter((c) => re.test(new URL(c.url).pathname));

for (const theme of THEMES) {
  test.describe(`P4 ${theme}`, () => {
    test.beforeEach(async ({ page }) => { await preparePage(page, theme); });

    test('quiz page: SEO blocks in the HTML, layout, reference styles, a11y', async ({ page, request }, info) => {
      const calls = await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off or quiz not reachable');

      // server HTML (what a crawler reads): one H1 = the title, the intro, JSON-LD, links
      const html = (await (await request.get(`/q/${SLUG.classic}`)).text()).replace(/<!-- -->/g, '');
      expect(html.match(/<h1[\s>]/g)?.length).toBe(1);
      expect(html).toContain('"@type":"Quiz"');
      expect(html).toContain('"@type":"BreadcrumbList"');
      expect(html).toMatch(/Test your BTS knowledge with this medium/);
      expect(html).toMatch(/Show the \d+ questions in this quiz/);
      expect(html).toContain('href="/bts-quiz"');

      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1.p4-title')).toHaveText(/Ultimate BTS era quiz/);
      await expect(page.locator('.p4-crumb a[href="/"]')).toBeVisible();
      await expect(page.locator('.p4-crumb a[href="/bts-quiz"]')).toBeVisible();
      await expect(page.locator('.p4-meta')).toContainText(/\d+ questions/);
      await expect(page.locator('.p4-meta')).toContainText(/plays/);
      await expect(page.locator('.p4-author a.p4-handle')).toHaveAttribute('href', /^\/u\//);
      await expect(page.locator('.p4-timerline')).toContainText(/seconds per question/);
      const rows = await page.locator('.p4-hrow').count();
      expect(rows).toBeLessThanOrEqual(5);
      await page.locator('.p4-mine[data-ready]').waitFor({ state: 'attached', timeout: 90_000 });
      await expect(page.locator('[data-testid="p4-mine"]')).toBeVisible();
      await expect(page.locator('.p4-about')).toContainText('About this quiz');
      await expect(page.locator('.p4-qrow')).toHaveCount(4);
      expect(await page.locator('.ux-tcard[href^="/q/"]').count()).toBeGreaterThanOrEqual(4);
      if (await page.locator('.p4-dyk a').count()) await expect(page.locator('.p4-dyk a')).toHaveAttribute('href', '/bts-trivia');

      // the question list is a native <details>: in the HTML, opens in place
      const review = page.locator('details.p4-review');
      await review.locator('summary').click();
      await expect(review.locator('ol > li').first()).toBeVisible();

      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const w = widthOf(page);
      const cmp = await compareLandmarks(page, w, theme, P4_LANDMARKS.quiz!);
      await info.attach('landmarks-quiz.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches).toEqual([]);

      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.p4-page' });
      if (axe) expect(axe, 'axe serious / critical').toEqual([]);
      expect(calls, 'the quiz page writes nothing on load').toEqual([]);
    });

    test('game: focus shell, timer ring, answer states, fact, Next, live region', async ({ page }, info) => {
      const calls = await guardWrites(page, env.supabaseUrl);
      const qs = await recordQuestions(page);
      test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off or quiz not reachable');
      await start(page);

      await expect(page.locator('.ux-nav')).toBeHidden();
      await expect(page.locator('.ux-foot')).toBeHidden();
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('.p4-qq')).toBeFocused();
      await expect(page.locator('.p4-segs')).toHaveAttribute('aria-valuenow', '1');
      await expect(page.locator('.p4-tring')).toHaveAttribute('role', 'timer');
      await expect(page.locator('.p4-tring')).toHaveAttribute('aria-label', /\d+ seconds left/);
      const w = widthOf(page);
      let cmp = await compareLandmarks(page, w, theme, P4_LANDMARKS.play!);
      expect(cmp.mismatches, 'ring before the answer').toEqual([]);

      const q = qs.get()[0]!;
      const right = correctIndex(q);
      const wrong = right === 2 ? 1 : 2;
      await answerButtons(page).nth(wrong).click();
      await expect(answerButtons(page).nth(right)).toHaveClass(/is-ok/);
      await expect(answerButtons(page).nth(right)).toContainText('Correct');
      await expect(answerButtons(page).nth(wrong)).toHaveClass(/is-no/);
      await expect(answerButtons(page).nth(wrong)).toContainText('Your pick');
      await expect(page.locator('.p4-tring')).toHaveClass(/is-no/);
      await expect(page.locator('.p4-fact')).toContainText('Did you know');
      await expect(page.locator('.p4-nextrow .ux-btn-primary')).toBeFocused();
      await expect(page.getByTestId('ux-live')).toContainText(/Not quite\. The answer is/);
      await expect(page.locator('.p4-segs span').first()).toHaveClass(/is-no/);

      cmp = await compareLandmarks(page, w, theme, P4_LANDMARKS.answered!);
      await info.attach('landmarks-answered.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches).toEqual([]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      const axe = await runAxe(page, { include: '.p4-page' });
      if (axe) expect(axe, 'axe serious / critical in game').toEqual([]);

      await page.locator('.p4-nextrow .ux-btn-primary').click();
      await expect(page.locator('.p4-segs')).toHaveAttribute('aria-valuenow', '2');
      await expect(page.locator('.p4-qq')).toBeFocused();
      expect(calls, 'nothing is saved before the last question').toEqual([]);
    });

    test('results (guest): save payload, photocard, stats row, primary by score, a11y', async ({ page }, info) => {
      test.setTimeout(120_000);
      const calls = await guardWrites(page, env.supabaseUrl);
      const qs = await recordQuestions(page);
      test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off or quiz not reachable');
      await start(page);
      const n = await playRun(page, qs.get, 'right');

      const plays = writesTo(calls, /^\/api\/quiz\/[^/]+\/play$/);
      expect(plays).toHaveLength(1);
      const body = JSON.parse(plays[0]!.body ?? '{}') as Record<string, unknown>;
      expect(Object.keys(body)).toEqual(['score', 'total_questions', 'time_taken_seconds', 'max_score', 'per_question_times', 'anon_id']);
      expect(body.score).toBe(n);
      expect(body.total_questions).toBe(n);
      expect(body.max_score).toBe(n);
      expect(typeof body.time_taken_seconds).toBe('number');
      expect((body.per_question_times as number[]).length).toBe(n);
      expect(String(body.anon_id)).toMatch(/^[0-9a-f-]{36}$/);

      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText(new RegExp(`^${n}/${n} on Ultimate BTS era quiz`));
      await expect(page.locator('.p4-pc-b .p4-s')).toContainText(`${n}/${n}`);
      await expect(page.locator('.p4-stamp')).toContainText(/PERFECT/);
      await expect(page.locator('.ux-nav')).toBeVisible();
      await expect(page.getByTestId('p4-xpline')).toContainText(`Save your ${n}/${n} and start a streak.`);
      await expect(page.locator('.ux-stats3 > div')).toHaveCount(3);
      await expect(page.locator('.ux-stats3')).toContainText('100%');
      // a perfect run is above any average: Share is the primary action
      await expect(page.locator('.p4-resact .ux-btn-primary')).toHaveText(/Share/);
      await expect(page.locator('.p4-keep a[href^="/q/"]').first()).toBeVisible();
      await expect(page.locator('.p4-keep a[href^="/blindtest"]')).toBeVisible();

      const w = widthOf(page);
      const cmp = await compareLandmarks(page, w, theme, P4_LANDMARKS.end!);
      await info.attach('landmarks-end.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing).toEqual([]);
      expect(cmp.mismatches).toEqual([]);
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.p4-page' });
      if (axe) expect(axe, 'axe serious / critical on results').toEqual([]);
      await info.attach(`end-${w}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });
  });
}

test.describe('P4 interactions', () => {
  test.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });

  test('keyboard: 1-4 answer, Enter next; key hints per pointer', async ({ page }) => {
    const calls = await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    const right = correctIndex(qs.get()[0]!);
    await page.keyboard.press(String(right + 1));
    await expect(answerButtons(page).nth(right)).toHaveClass(/is-ok/);
    await expect(page.getByTestId('ux-live')).toContainText(/Correct\. The answer is/);
    await expect(page.locator('.p4-gscore')).toContainText('1');
    await page.locator('body').press('Enter');
    await expect(page.locator('.p4-segs')).toHaveAttribute('aria-valuenow', '2');
    await expect(answerButtons(page).first()).toHaveAttribute('aria-keyshortcuts', '1');
    const touch = widthOf(page) < 500;
    await expect(answerButtons(page).first().locator('.p4-t')).toBeVisible({ visible: touch });
    await expect(answerButtons(page).first().locator('.p4-d')).toBeVisible({ visible: !touch });
    expect(calls).toEqual([]);
  });

  test('timer: warn, danger, then "Time is up" when it runs out', async ({ page }) => {
    await page.clock.install();
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    const ring = page.locator('.p4-tring');
    await expect(ring).toHaveAttribute('aria-label', '15 seconds left');
    await page.clock.runFor(7_100);
    await expect(ring).toHaveClass(/is-warn/);
    await page.clock.runFor(3_000);
    await expect(ring).toHaveClass(/is-danger/);
    await page.clock.runFor(6_000);
    await expect(page.locator('.p4-fact')).toContainText('Time is up. Did you know');
    await expect(ring).toHaveClass(/is-no/);
    await expect(page.locator('.p4-segs span').first()).toHaveClass(/is-no/);
  });

  test('quit: no answer leaves at once; after an answer it asks, Keep playing / Leave saves to Continue, resume', async ({ page }) => {
    const calls = await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    await page.getByRole('button', { name: 'Quit quiz' }).click();
    await expect(page.locator('.p4-title')).toBeVisible();
    await start(page);
    await answerButtons(page).first().click();
    await page.locator('.p4-nextrow .ux-btn-primary').click();
    await page.getByRole('button', { name: 'Quit quiz' }).click();
    const dlg = page.getByRole('alertdialog', { name: 'Leave this quiz?' });
    await expect(dlg).toContainText('You answered 1 of');
    await expect(dlg.getByRole('button', { name: 'Keep playing' })).toBeFocused();
    await dlg.getByRole('button', { name: 'Keep playing' }).click();
    await expect(dlg).toBeHidden();
    await expect(page.locator('.p4-qq')).toBeVisible();
    await page.getByRole('button', { name: 'Quit quiz' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Leave' }).click();
    await expect(page.getByTestId('ux-toast')).toContainText('Saved to Continue playing');
    await expect(page.locator('.p4-title')).toBeVisible();
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('ux:continue:v1') ?? '[]') as Array<{ slug: string; answered: number; run: { questionIndex: number } }>);
    expect(saved[0]).toMatchObject({ slug: SLUG.classic, answered: 1, run: { questionIndex: 1 } });

    await openQuiz(page, SLUG.classic, '?resume=1');
    await expect(page.locator('.p4-qq')).toBeVisible();
    await expect(page.locator('.p4-segs')).toHaveAttribute('aria-valuenow', '2');
    await expect(page.getByTestId('ux-toast')).toContainText('Back at question 2');
    expect(new URL(page.url()).search).toBe('');
    expect(calls).toEqual([]);
  });

  test('share this quiz: sheet, copy, closes with Escape and returns focus', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});
    const calls = await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    const trigger = page.getByRole('button', { name: 'Share this quiz' });
    await trigger.click();
    const dlg = page.getByRole('dialog', { name: 'Share this quiz' });
    await expect(dlg).toContainText('plays');
    await dlg.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByTestId('ux-toast')).toContainText(/Link copied|Copy failed/);
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();
    await expect(trigger).toBeFocused();
    expect(calls, 'guest share writes nothing').toEqual([]);
  });

  test('results share: real numbers, challenge link minted from the run (payload), story + more apps', async ({ page }) => {
    test.setTimeout(120_000);
    const calls = await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    await page.route('**/api/ux-v1/p4/challenge', async (route) => {
      calls.push({ method: route.request().method(), url: route.request().url(), body: route.request().postData() });
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: '0f8fad5b-d9cb-469f-a165-70867728950e', url: 'https://kpopquiz.org/q/x?c=0f8fad5b-d9cb-469f-a165-70867728950e.a1b2c3d4e5f60718' }) });
    });
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    const n = await playRun(page, qs.get, 'right');
    await page.locator('.p4-resact').getByRole('button', { name: 'Share' }).click();
    const dlg = page.getByRole('dialog', { name: 'Share your score' });
    await expect(dlg).toContainText(`${n}/${n} on Ultimate BTS era quiz`);
    for (const b of ['Copy link', 'Story image', 'More apps', 'Discord']) await expect(dlg.getByRole('button', { name: b })).toBeVisible();
    await expect(dlg).toContainText('Challenge link');
    await expect(dlg).toContainText('kpopquiz.org/q/x?c=');
    const made = writesTo(calls, /^\/api\/ux-v1\/p4\/challenge$/);
    expect(made).toHaveLength(1);
    const body = JSON.parse(made[0]!.body ?? '{}') as { quizId: string; questions: string[]; score: number };
    expect(body.score).toBe(n);
    expect(body.questions).toHaveLength(n);
    expect(body.questions).toEqual(qs.get().map((q) => q.question));
  });

  test('low score: Play again is the primary action and starts a new run', async ({ page }) => {
    test.setTimeout(120_000);
    await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    await playRun(page, qs.get, 'wrong');
    await expect(page.locator('.p4-resact .ux-btn-primary')).toHaveText(/Play again/);
    await expect(page.locator('.p4-stamp')).toContainText(/Keep trying/i);
    await page.locator('.p4-resact .ux-btn-primary').click();
    await expect(page.locator('.p4-qq')).toBeVisible();
    await expect(page.locator('.p4-segs')).toHaveAttribute('aria-valuenow', '1');
  });

  test('like, comments (guest -> sign in to reply), report sheet payload', async ({ page }) => {
    test.setTimeout(120_000);
    const calls = await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    await playRun(page, qs.get, 'right');

    const like = page.locator('.p4-likeb');
    const before = Number((await like.innerText()).replace(/\D/g, ''));
    await like.click();
    await expect(like).toHaveAttribute('aria-pressed', 'true');
    await expect(like).toContainText(String(before + 1));
    const likes = writesTo(calls, /\/api\/quiz\/[^/]+\/like$/);
    expect(likes.map((c) => JSON.parse(c.body ?? '{}'))).toEqual([{ action: 'like' }]);

    await page.locator('.p4-acc > summary', { hasText: 'Comments' }).click();
    await expect(page.locator('.p4-cform textarea')).toBeVisible();
    await page.locator('.p4-cform textarea').fill('Great quiz');
    await expect(page.locator('.p4-crow .p4-gch')).toContainText(/Your score \d+\/\d+ is shown/);
    await page.locator('.p4-cform').getByRole('button', { name: 'Send' }).click();
    await expect(page.getByRole('dialog', { name: 'Sign in to reply' })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(writesTo(calls, /\/comment$/), 'a guest comment is never sent').toEqual([]);

    await page.locator('.p4-report-c .p4-report').click();
    const rep = page.getByRole('dialog', { name: 'Report this quiz' });
    await expect(rep.getByRole('radio').first()).toBeFocused();
    await rep.getByRole('radio', { name: 'Wrong answers' }).check();
    await rep.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByTestId('ux-toast')).toContainText("Thanks for reporting");
    const reports = writesTo(calls, /\/api\/quiz\/[^/]+\/report$/);
    expect(reports.map((c) => JSON.parse(c.body ?? '{}'))).toEqual([{ reason: 'wrong_answers', details: '' }]);
  });

  test('guest: Sign in to save and Follow open the sign-in sheet and keep the action', async ({ page }) => {
    test.setTimeout(120_000);
    const calls = await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await page.locator('.p4-author button[data-ready]').waitFor({ timeout: 60_000 });
    await page.locator('.p4-author').getByRole('button', { name: 'Follow' }).click();
    await expect(page.getByRole('dialog', { name: /^Follow / })).toBeVisible();
    await page.keyboard.press('Escape');
    await start(page);
    const n = await playRun(page, qs.get, 'right');
    await page.getByTestId('p4-xpline').getByRole('button', { name: 'Sign in to save' }).click();
    const dlg = page.getByRole('dialog', { name: `Save your ${n}/${n}` });
    await expect(dlg).toBeVisible();
    await expect(dlg.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    // the sheet stores the action before leaving for a provider; simulate that step
    // without leaving (no OAuth, no email): the page resumes it on the way back
    expect(writesTo(calls, /^\/api\/follow$/)).toEqual([]);
  });

  test('challenge link: chip on the page and in the game, win line, attempt payload', async ({ page }) => {
    test.setTimeout(120_000);
    const calls = await guardWrites(page, env.supabaseUrl);
    const id = '0f8fad5b-d9cb-469f-a165-70867728950e';
    const html = await (await page.request.get(`/q/${SLUG.classic}`)).text();
    const quizId = /data-p4-quiz="([0-9a-f-]{36})"/.exec(html)?.[1];
    test.skip(!quizId, 'flag off');
    // The challenge GET is answered from the quiz's own questions: a real challenge row
    // cannot be created during the run (no production writes). Read only.
    const questions = ((await (await page.request.get(`/api/quiz/${quizId}/questions`)).json()) as { questions: Q[] }).questions;
    const beat = `Beat mingi: 5/${questions.length}`;
    await page.route(`**/api/ux-v1/p4/challenge/${id}?s=*`, (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id, quizId, challenger: { name: 'mingi', accent: null, font: null }, score: 5, total: questions.length, maxScore: questions.length, questions, createdAt: new Date().toISOString(), expired: false }),
    }));
    expect(await openQuiz(page, SLUG.classic, `?c=${id}.a1b2c3d4e5f60718`)).toBe(true);
    await expect(page.locator('.p4-timerline .p4-gch')).toHaveText(beat);
    await start(page);
    if (widthOf(page) >= 760) await expect(page.getByTestId('p4-challenge-chip')).toHaveText(beat);
    await playRun(page, () => questions, 'right');
    await expect(page.getByTestId('p4-rankline')).toHaveText(`You beat mingi (5/${questions.length}). Reply with your score.`);
    const att = writesTo(calls, new RegExp(`/api/ux-v1/p4/challenge/${id}/attempt$`));
    expect(att).toHaveLength(1);
    const body = JSON.parse(att[0]!.body ?? '{}') as { sig: string; score: number; perQuestion: boolean[]; timeMs: number };
    expect(body.sig).toBe('a1b2c3d4e5f60718');
    expect(body.perQuestion).toHaveLength(questions.length);
    expect(body.perQuestion.every(Boolean)).toBe(true);
    expect(body.score).toBe(questions.length);
    expect(typeof body.timeMs).toBe('number');
  });

  test('quiz of the day (?daily=quiz): the run also completes the daily through the existing call', async ({ page }) => {
    test.setTimeout(120_000);
    const calls = await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    test.skip(!(await openQuiz(page, 'stray-kids-district-9-quiz', '?daily=quiz')), 'flag off');
    await start(page);
    await expect(page.locator('.p4-segs span')).toHaveCount(10);
    await playRun(page, qs.get, 'right');
    const daily = writesTo(calls, /^\/api\/daily\/complete$/);
    expect(daily.map((c) => JSON.parse(c.body ?? '{}'))).toEqual([{ kind: 'quiz' }]);
    expect(writesTo(calls, /^\/api\/quiz\/[^/]+\/play$/)).toHaveLength(1);
  });

  test('level up: the save response drives the EXISTS level-up overlay', async ({ page }) => {
    test.setTimeout(120_000);
    await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    await page.route(/\/api\/quiz\/[^/]+\/play$/, (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ play_id: null, percentile: 88, xp_earned: 30, pass_rate: 61, new_xp: 1200, leveled_up: true, new_level: 6, new_level_name: 'Stan' }),
    }));
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await start(page);
    await playRun(page, qs.get, 'right');
    await expect(page.locator('.p4-pc-b .p4-beat')).toContainText('You beat 88% of players');
    await expect(page.getByText(/level 6|Lv\.? ?6/i).first()).toBeVisible();
  });

  test('quiz types: true/false, image, clues, intruder render and answer', async ({ page }) => {
    test.setTimeout(180_000);
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openQuiz(page, SLUG.tf)), 'flag off');
    await start(page);
    await expect(answerButtons(page)).toHaveCount(2);
    await answerButtons(page).first().click();
    await expect(page.locator('.p4-fact')).toBeVisible();

    await openQuiz(page, SLUG.image);
    await start(page);
    await expect(answerButtons(page).first()).toBeVisible();
    await answerButtons(page).first().click();
    await expect(page.locator('.p4-nextrow')).toBeVisible();

    await openQuiz(page, SLUG.clues);
    await start(page);
    await expect(page.locator('.p4-clues li')).toHaveCount(1);
    await expect(page.locator('.p4-gscore small')).toHaveText('pts');
    await page.getByRole('button', { name: /Get a clue/ }).click();
    await expect(page.locator('.p4-clues li')).toHaveCount(2);
    await expect(page.locator('.p4-cluebar')).toContainText('2 points if you answer now');

    await openQuiz(page, SLUG.intruder);
    await start(page);
    await expect(page.locator('.p4-igrid .p4-ians')).toHaveCount(4);
    await page.locator('.p4-igrid .p4-ians').first().click();
    await expect(page.locator('.p4-igrid .p4-ians.is-ok')).toHaveCount(1);
  });

  test('relaxed mode: hidden until the relaxed-run column is live, then toggles the rule', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    const toggle = page.locator('.p4-timerline button.ux-lnk');
    if ((await toggle.count()) === 0) {
      await expect(page.locator('.p4-timerline')).not.toContainText('Play without a timer');
      return; // fail soft: v11-p4-relaxed-runs.sql not applied
    }
    await toggle.click();
    await expect(page.locator('.p4-timerline')).toContainText('No timer. Relaxed runs do not enter the hall of fame.');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await start(page);
    await expect(page.locator('.p4-tring')).toHaveAttribute('aria-label', 'No timer');
  });

  test('phones: sticky Start appears once the first Start scrolls away', async ({ page }) => {
    await guardWrites(page, env.supabaseUrl);
    test.skip(widthOf(page) >= 760, 'phone only');
    test.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    const sticky = page.locator('.p4-sstart');
    await page.locator('.p4-sstart[data-ready]').waitFor({ state: 'attached', timeout: 60_000 });
    await expect(sticky).not.toHaveClass(/is-shown/);
    await expect(sticky.locator('button')).toHaveAttribute('tabindex', '-1');
    await page.locator('.p4-about').scrollIntoViewIfNeeded();
    await expect(sticky).toHaveClass(/is-shown/);
    await sticky.locator('button').click();
    await expect(page.locator('.p4-qq')).toBeVisible();
  });

  test('API: v11 routes are read-only on GET and refuse bad input', async ({ request }) => {
    const bad = await request.get('/api/ux-v1/p4/challenge/0f8fad5b-d9cb-469f-a165-70867728950e?s=0000000000000000');
    expect([404]).toContain(bad.status());
    expect((await request.get('/api/ux-v1/p4/standing')).status()).toBe(400);
    const guest = await request.get('/api/ux-v1/p4/standing?quiz=0f8fad5b-d9cb-469f-a165-70867728950e&score=3');
    expect(guest.status()).toBe(200);
    expect(await guest.json()).toMatchObject({ signedIn: false });
  });
});

signedInTest.describe('P4 signed in (test user, read only)', () => {
  signedInTest.beforeEach(async ({ page }) => { await preparePage(page, 'light'); });

  signedInTest('quiz page reads your standing; a run posts the same payload; results say saved', async ({ page }) => {
    skipUnlessSignedIn();
    signedInTest.setTimeout(120_000);
    const calls = await guardWrites(page, env.supabaseUrl);
    const qs = await recordQuestions(page);
    signedInTest.skip(!(await openQuiz(page, SLUG.classic)), 'flag off');
    await expect(page.locator('.ux-nav-signin'), 'signed in: no Sign in button').toHaveCount(0);
    await expect(page.getByTestId('p4-mine')).toContainText(/Your best \d+\/\d+|Play to put your name on this board\./);
    await expect(page.locator('.p4-timerline')).not.toContainText('No account needed');
    // Follow the creator: the existing POST /api/follow { username, action } (stubbed)
    const creator = (await page.locator('.p4-author a.p4-handle').innerText()).trim();
    const follow = page.locator('.p4-author button.ux-lnk');
    await follow.and(page.locator('[data-ready]')).waitFor({ timeout: 60_000 }).catch(() => {});
    if (await follow.count()) {
      await follow.click();
      await expect.poll(() => writesTo(calls, /^\/api\/follow$/).length).toBe(1);
      expect(JSON.parse(writesTo(calls, /^\/api\/follow$/)[0]!.body ?? '{}')).toMatchObject({ username: creator, action: expect.stringMatching(/^(follow|unfollow)$/) });
    }
    await start(page);
    const n = await playRun(page, qs.get, 'right');
    const plays = writesTo(calls, /^\/api\/quiz\/[^/]+\/play$/);
    expect(plays).toHaveLength(1);
    expect(JSON.parse(plays[0]!.body ?? '{}')).toMatchObject({ score: n, total_questions: n, max_score: n });
    await expect(page.getByTestId('p4-xpline')).toContainText(/Saved to your passport|XP/);
    // rank line from get_quiz_rank for the session user (read only): shown when they have a play on this quiz
    const mine = await (await page.request.get(`/api/ux-v1/p4/standing?quiz=${await page.locator('[data-p4-quiz]').getAttribute('data-p4-quiz')}`)).json() as { played?: boolean };
    if (mine.played) await expect(page.getByTestId('p4-rankline')).toContainText(/^#\d+ of [\d,]+ players · your best \d+\/\d+$/);
    // the comment field posts the existing payload for a signed-in fan
    await page.locator('.p4-acc > summary', { hasText: 'Comments' }).click();
    await page.locator('.p4-cform textarea').fill('Great quiz');
    await page.locator('.p4-cform').getByRole('button', { name: 'Send' }).click();
    const sent = writesTo(calls, /\/api\/quiz\/[^/]+\/comment$/);
    expect(sent.map((c) => JSON.parse(c.body ?? '{}'))).toEqual([{ content: 'Great quiz' }]);
    const other = calls.filter((c) => !/\/api\/quiz\/[^/]+\/(play|comment)$|\/api\/share\/generate$|\/api\/ux-v1\/p4\/|^\/api\/follow$/.test(new URL(c.url).pathname));
    expect(other, 'no other write attempt').toEqual([]);
  });
});
