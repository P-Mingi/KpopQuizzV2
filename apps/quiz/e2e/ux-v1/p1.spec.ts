import { test, expect } from '@playwright/test';

import { basicA11y, focusRing, runAxe } from './helpers/a11y';
import { signedInTest, skipUnlessSignedIn } from './helpers/auth';
import { loadTestEnv } from './helpers/env';
import { guardWrites } from './helpers/guard';
import { A0_LANDMARKS, compareLandmarks } from './helpers/landmarks';
import { hasShell, horizontalOverflow, preparePage, THEMES, widthOf } from './helpers/setup-page';

import type { Landmark } from './helpers/landmarks';
import type { Page } from '@playwright/test';

// UX v11.2 home (P1): live ticker, centred header, quiz of the day, continue,
// groups, trending, all time best | new, blindtest band, community. States
// `home` (signed in) and `home-guest` of v11/capture-prototype.mjs, at the project
// width (ux-1440 / ux-390), light and dark. Runs against a flag-ON server
// (PLAYWRIGHT_BASE_URL); every case skips on a flag-off build. No production
// write: guardWrites stubs every mutating request and the specs assert there is
// none; navigations are stubbed too (the destination pages are other agents').
// Data checks read the same public tables with the anon key (GET only).

const env = loadTestEnv();
const PINK_RING = /^2px solid rgb\(232, 69, 122\)$/;

/** P1 landmarks: prototype selector -> implementation selector (C1 criteria). */
function p1Landmarks(width: number): Landmark[] {
  const desk = width > 760;
  return [
    { proto: '.qotd', impl: '.p1-qotd', state: 'home-guest', box: desk ? ['width', 'height'] : ['width'] },
    { proto: '.qlab', impl: '.p1-qlab', state: 'home-guest', box: ['width', 'height'] },
    // the meta line wraps with the real text on phones: width only there
    { proto: '.qline', impl: '.p1-qline', state: 'home-guest', box: desk ? ['width', 'height'] : ['width'] },
    { proto: '.btn-primary', impl: '.p1-hcta .ux-btn-primary', state: 'home-guest', box: ['height'] },
    // same rule for the guest and the signed-in H1 (the reference state that shows it is `home`)
    { proto: '.hhead h1', impl: '.p1-hhead h1', state: 'home', box: ['width'] },
    { proto: '.sec-h h2', impl: '.p1-home .ux-sec-h h2', state: 'home', box: ['height'] },
    { proto: '.qcard', impl: '.p1-home .ux-qcard', state: 'home', box: ['width'] },
  ];
}

/** Top of each landmark in the guest reference (prototype, measured), px from the document top. */
const GUEST_TOPS: Record<number, Record<string, number>> = {
  1440: { '.p1-ticker': 89, '.p1-hhead': 181, '.p1-hcta': 323.9, '.p1-qotd': 407.9, '.p1-home .ux-sec': 615.7 },
  390: { '.p1-ticker': 81, '.p1-hhead': 153, '.p1-hcta': 292.6, '.p1-qotd': 410.6, '.p1-home .ux-sec': 662.2 },
};

async function rest<T>(query: string, count = false): Promise<{ rows: T; count: number | null }> {
  // GET only. Retried on a network error (the shared live backend can be slow to connect).
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(`${env.supabaseUrl}/rest/v1/${query}`, {
        headers: { apikey: env.anonKey as string, Authorization: `Bearer ${env.anonKey}`, ...(count ? { Prefer: 'count=exact', Range: '0-0' } : {}) },
      });
      const range = r.headers.get('content-range');
      return { rows: (await r.json()) as T, count: range ? Number(range.split('/')[1]) : null };
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
}

// Every case reads the live backend (page render + client islands + the checks
// above): allow for a slow network, the assertions stay the same.
test.describe.configure({ timeout: 90_000 });

const today = (): string => new Date().toISOString().slice(0, 10);

/** The quiz of the day the home must show: the latest stored pick on or before today. */
async function expectedQotd(): Promise<{ slug: string; title: string; date: string; avg: number | null; questions: number } | null> {
  const d = today();
  const [{ rows: log }, { rows: flag }] = await Promise.all([
    rest<{ quiz_id: string; featured_date: string }[]>(`qotd_log?select=quiz_id,featured_date&featured_date=lte.${d}&order=featured_date.desc&limit=3`),
    rest<{ id: string; quiz_of_the_day_date: string }[]>(`quizzes?select=id,quiz_of_the_day_date&status=eq.published&is_quiz_of_the_day=eq.true&quiz_of_the_day_date=lte.${d}&order=quiz_of_the_day_date.desc&limit=3`),
  ]);
  const picks = [...log.map((r) => ({ id: r.quiz_id, date: r.featured_date })), ...flag.map((r) => ({ id: r.id, date: r.quiz_of_the_day_date }))]
    .sort((a, b) => b.date.localeCompare(a.date));
  for (const p of picks) {
    const { rows } = await rest<{ slug: string; title: string; question_count: number; total_score_sum: number; total_completions: number }[]>(
      `quizzes?select=slug,title,question_count,total_score_sum,total_completions&id=eq.${p.id}&status=eq.published`,
    );
    const q = rows[0];
    if (!q) continue;
    const avg = q.total_completions >= 3 && q.question_count ? Math.round((q.total_score_sum / q.total_completions / q.question_count) * 100) : null;
    return { slug: q.slug, title: q.title, date: p.date, avg, questions: q.question_count };
  }
  return null;
}

/** Stub every page the home links to (they belong to other agents): a navigation
 *  lands on a tiny stub, so a click proves the href without loading the target. */
async function stubDestinations(page: Page): Promise<void> {
  await page.route((url) => url.origin === new URL(page.url() || 'http://localhost').origin && url.pathname !== '/' && !url.pathname.startsWith('/_next') && !url.pathname.startsWith('/api/') && !/\.(png|jpe?g|webp|svg|ico|css|js|woff2?)$/.test(url.pathname), async (route) => {
    if (route.request().resourceType() === 'document' || route.request().headers()['rsc'] === '1') {
      await route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title><h1>stub</h1>' });
    } else {
      await route.continue();
    }
  });
}

async function openHome(page: Page): Promise<boolean> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  if (!(await hasShell(page))) return false;
  await expect(page.locator('.p1-home')).toBeVisible();
  // hydrated: the band's client countdown is in
  await expect(page.locator('.p1-kick')).toContainText(/left|played/, { timeout: 30_000 });
  await stubDestinations(page);
  return true;
}

for (const theme of THEMES) {
  test.describe(`home ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await preparePage(page, theme);
    });

    test('guest: SEO header, layout and styles vs the reference, axe, no write', async ({ page }, info) => {
      const calls = await guardWrites(page, env.supabaseUrl);
      const w = widthOf(page);
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');

      // SEO lock: production's H1, intro (H2) and exact-match CTA, one H1.
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveText('K-pop QuizAre you a real fan?');
      await expect(page.locator('.p1-hhead h2.p1-hsub')).toHaveText('Prove it. Play K-pop quizzes and see where you rank.');
      const browse = page.locator('.p1-hcta a[href="/quizzes"]');
      await expect(browse).toHaveAttribute('aria-label', 'Browse K-pop quizzes');
      await expect(browse).toHaveText('Browse K-pop quizzes');
      await expect(page.locator('.p1-hcta a[href="/create"]')).toHaveText('Create a quiz');
      await expect(page).toHaveTitle('K-pop Quiz - 380+ Free Fan-Made Quizzes for Every Group');
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://kpopquiz.org');
      await expect(page.locator('link[rel="alternate"][hreflang="pt-BR"]')).toHaveAttribute('href', 'https://kpopquiz.org/pt');
      const ld = await page.locator('script[type="application/ld+json"]').evaluateAll((s) => s.map((x) => (JSON.parse(x.textContent || '{}') as { '@type'?: string })['@type']));
      expect(ld).toEqual(expect.arrayContaining(['WebSite', 'ItemList', 'Organization', 'SiteNavigationElement']));

      // Layout: tops of the landmarks within 2px of the guest reference.
      for (const [sel, top] of Object.entries(GUEST_TOPS[w] ?? {})) {
        const box = await page.locator(sel).first().boundingBox();
        const y = (box?.y ?? -999) + (await page.evaluate(() => window.scrollY));
        expect(Math.abs(y - top), `${sel} top ${y} vs reference ${top}`).toBeLessThanOrEqual(2);
      }
      expect(await horizontalOverflow(page), 'no horizontal scroll').toBeLessThanOrEqual(0);

      // Computed styles equal to styles.json (C1).
      const lm = [...p1Landmarks(w), ...A0_LANDMARKS.filter((l) => l.proto === '.nav')];
      const cmp = await compareLandmarks(page, w, theme, lm);
      await info.attach('landmarks.json', { body: JSON.stringify(cmp, null, 1), contentType: 'application/json' });
      expect(cmp.missing, 'landmarks present').toEqual([]);
      expect(cmp.mismatches, 'computed styles equal to styles.json').toEqual([]);

      // Accessibility.
      expect(await basicA11y(page)).toEqual([]);
      const axe = await runAxe(page, { include: '.p1-home' });
      if (axe) expect(axe, 'axe serious / critical on the home').toEqual([]);
      else info.annotations.push({ type: 'axe', description: 'axe-core not resolvable; basic checks only' });

      await info.attach(`home-guest-${w}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      expect(calls, 'no mutating request from the home').toEqual([]);
    });

    test('live ticker: the live component and its two endpoints, restyled', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      const recent = page.waitForResponse((r) => r.url().includes('/api/activity/recent'));
      const live = page.waitForResponse((r) => r.url().includes('/api/stats/live'));
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      const events = (await (await recent).json()) as { events: { text: string }[] };
      const online = (await (await live).json()) as { online: number | null };
      const bar = page.locator('.p1-ticker > div');
      if (events.events.length === 0 && !online.online) {
        await expect(bar, 'renders nothing when there is neither activity nor a count').toHaveCount(0);
        return;
      }
      await expect(bar).toBeVisible();
      const h = await bar.boundingBox();
      expect(Math.round(h?.height ?? 0)).toBe(widthOf(page) > 760 ? 44 : 40);
      const liveWord = bar.getByText('Live', { exact: true });
      await expect(liveWord).toHaveCSS('font-size', '11px');
      await expect(liveWord).toHaveCSS('font-weight', '800');
      await expect(bar).toHaveCSS('border-top-left-radius', '14px');
      const line = (await bar.locator('[aria-live="polite"]').textContent())?.trim() ?? '';
      if (events.events.length > 0) expect(events.events.map((e) => e.text)).toContain(line);
      else expect(line).toMatch(/^[\d,]+ fans playing now$/);
    });

    test('quiz of the day: the stored pick, real meta, truthful note, Play', async ({ page }) => {
      const calls = await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      const q = await expectedQotd();
      const row = page.locator('section.p1-qotd');
      if (!q) { await expect(row).toHaveCount(0); return; }
      await expect(row.locator('.p1-qlab')).toHaveText('Quiz of the day');
      await expect(row.locator('h2')).toHaveText(q.title);
      await expect(row).toHaveAttribute('aria-labelledby', 'p1-qotd-t');
      const meta = (await row.locator('.p1-qline').textContent()) ?? '';
      expect(meta).toContain(`${q.questions} questions`);
      if (q.avg != null) expect(meta).toContain(`${q.avg}% average`);
      else expect(meta).not.toContain('average');
      // No group tag, no question preview (17.10).
      await expect(row.locator('.ux-chip, .ux-qg, [class*="prev"]')).toHaveCount(0);
      const note = (await row.locator('.p1-note').textContent()) ?? '';
      if (q.date === today()) expect(note).toMatch(/^(New quiz in \d+h \d+m|New quiz in \d+m|Today's pick)$/);
      else expect(note, 'an old pick is never presented as today\'s').toMatch(/^Picked (yesterday|on [A-Z][a-z]+ \d{1,2}(, \d{4})?)$/);
      const play = row.getByRole('link', { name: /^Play the quiz of the day/ });
      await expect(play).toHaveAttribute('href', `/q/${q.slug}?daily=quiz`);
      await play.click();
      await expect(page).toHaveURL(new RegExp(`/q/${q.slug}\\?daily=quiz$`));
      expect(calls).toEqual([]);
    });

    test('groups rail: 10 real groups, published counts, hub links', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      const sec = page.locator('section[aria-labelledby="p1-groups-h"]');
      await expect(sec.locator('h2')).toHaveText('Groups');
      const all = sec.locator('.ux-sec-h a');
      await expect(all).toHaveAttribute('href', '/groups');
      const { count: groupRows } = await rest<unknown[]>('groups?select=id', true);
      await expect(all, 'visible groups = all rows minus the quarantine row').toHaveText(`All ${(groupRows ?? 1) - 1} groups`);
      const items = sec.locator('a.p1-gitem');
      expect(await items.count()).toBeLessThanOrEqual(10);
      expect(await items.count()).toBeGreaterThan(0);
      const hrefs = await items.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      for (const h of hrefs) expect(h).toMatch(/^\/[a-z0-9-]+-quiz$/);
      expect(new Set(hrefs).size).toBe(hrefs.length);
      // Counts are PUBLISHED quizzes (16.10), checked on the first two groups.
      for (const i of [0, 1]) {
        const slug = hrefs[i]!.slice(1, -'-quiz'.length);
        const label = (await items.nth(i).locator('.p1-gc').textContent())?.trim() ?? '';
        if (label === 'New quiz') continue;
        const { rows: g } = await rest<{ id: number }[]>(`groups?select=id&slug=eq.${slug}`);
        const { count } = await rest<unknown[]>(`quizzes?select=id&status=eq.published&group_id=eq.${g[0]?.id}`, true);
        expect(label).toBe(`${count} ${count === 1 ? 'quiz' : 'quizzes'}`);
      }
      // "New quiz" is a word, never a dot alone.
      await expect(sec.locator('.p1-gc.is-new').first()).toHaveText(/^New quiz$|^$/);
      await items.first().click();
      await expect(page).toHaveURL(new RegExp(`${hrefs[0]}$`));
    });

    test('trending, all time best, new: real order, no quiz twice, no photo twice in a row', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      const trend = page.locator('section[aria-labelledby="p1-trend-h"]');
      await expect(trend.locator('.ux-sec-h a')).toHaveAttribute('href', '/quizzes/popular-this-week');
      const cards = trend.locator('a.ux-qcard');
      expect(await cards.count()).toBeLessThanOrEqual(4);
      const photos = await trend.locator('.ux-qcov-img').evaluateAll((imgs) => imgs.map((i) => new URL((i as HTMLImageElement).currentSrc || (i as HTMLImageElement).src).searchParams.get('url') ?? (i as HTMLImageElement).src));
      expect(new Set(photos).size, 'never the same photo twice in one row (16.8)').toBe(photos.length);

      const best = page.locator('.p1-two > div').filter({ has: page.locator('#p1-best-h') });
      await expect(best.locator('.ux-sec-h a')).toHaveAttribute('href', '/quizzes?sort=most_played');
      const rn = await best.locator('.ux-rn').allTextContents();
      expect(rn).toEqual(rn.map((_, i) => String(i + 1)));
      expect(await best.locator('.ux-rn.is-top').count()).toBe(Math.min(3, rn.length));
      const plays = (await best.locator('.ux-rs').allTextContents()).map((t) => Number(t.replace(/.*·\s*/, '').replace(/[^\d]/g, '')));
      expect([...plays].sort((a, b) => b - a), 'all time best = play_count order').toEqual(plays);

      const fresh = page.locator('.p1-two > div').filter({ has: page.locator('#p1-new-h') });
      await expect(fresh.locator('.ux-sec-h a')).toHaveAttribute('href', '/quizzes?sort=newest');
      await expect(fresh.locator('.p1-glyph svg').first()).toBeVisible();
      expect((await fresh.locator('.ux-row-end').allTextContents()).every((t) => /ago$|^yesterday$|^just now$/.test(t.trim()))).toBe(true);

      const slugs = await page.locator('.p1-qotd a, .p1-home .ux-qcard, .p1-two a.ux-row').evaluateAll((as) => as.map((a) => (a.getAttribute('href') ?? '').replace(/\?.*$/, '')));
      expect(new Set(slugs).size, 'no quiz appears twice (16.7)').toBe(slugs.length);

      await cards.first().click();
      await expect(page).toHaveURL(/\/q\/[a-z0-9-]+$/);
    });

    test('blindtest band: real count, Play the daily, modes link, played state', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      const band = page.locator('.p1-band');
      await expect(band.locator('h2')).toHaveText('Ten songs. Same for everyone. One shot.');
      await expect(band.locator('.p1-kick')).toHaveText(/^Blindtest of the day · (\d+ hours?|\d+ minutes?) left$/);
      const { count } = await rest<unknown[]>(`daily_blindtest_scores?select=user_id&date=eq.${today()}`, true);
      const p = (await band.locator('.p1-band-p').textContent()) ?? '';
      if ((count ?? 0) > 0) expect(p).toMatch(new RegExp(`^${(count ?? 0).toLocaleString('en-US')} fans? played today\\. `));
      else expect(p).not.toContain('played today');
      await expect(band.getByRole('link', { name: 'Play the daily' })).toHaveAttribute('href', '/blindtest?daily=true');
      await expect(band.getByRole('link', { name: 'All blindtest modes' })).toHaveAttribute('href', '/blindtest');
      await band.getByRole('link', { name: 'Play the daily' }).click();
      await expect(page).toHaveURL(/\/blindtest\?daily=true$/);

      // After playing (this browser's flag, as the daily game sets it): See today's board.
      await page.addInitScript((d) => { try { localStorage.setItem('kq_daily_blindtest_played', d); } catch { /* blocked */ } }, today());
      test.skip(!(await openHome(page)), 'flag off');
      await expect(band.locator('h2')).toHaveText("You played today's blindtest.");
      await expect(band.locator('.p1-kick')).toHaveText('Blindtest of the day · played');
      await expect(band.getByRole('link', { name: "See today's board" })).toHaveAttribute('href', '/blindtest/leaderboard');
    });

    test('community rows and continue (guest: hidden)', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      await page.addInitScript(() => {
        try { localStorage.setItem('kq_ux_continue_v1', JSON.stringify([{ slug: 'any-quiz', title: 'Any quiz', groupSlug: 'bts', answered: 3, total: 8, updatedAt: new Date().toISOString() }])); } catch { /* blocked */ }
      });
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      await expect(page.locator('#p1-cont-h'), 'Continue is for signed-in fans only (prototype)').toHaveCount(0);
      const comm = page.locator('section[aria-labelledby="p1-comm-h"]');
      if (await comm.count() === 0) return; // min-gate: no community row today
      await expect(comm.locator('.ux-sec-h a')).toHaveAttribute('href', '/community');
      const rows = comm.locator('a.ux-row');
      expect(await rows.count()).toBeLessThanOrEqual(3);
      for (const sub of await rows.locator('.ux-rs').allTextContents()) expect(sub).toMatch(/^(Debate|Thread|Blog) · /);
      const hrefs = await rows.evaluateAll((as) => as.map((a) => a.getAttribute('href') ?? ''));
      for (const h of hrefs) expect(h).toMatch(/^\/(community|verse\/[a-z0-9-]+\/(community|essays)\/[A-Za-z0-9-]+)$/);
    });

    test('keyboard reaches and operates every home control, pink focus ring', async ({ page }) => {
      await guardWrites(page, env.supabaseUrl);
      test.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');
      const controls = await page.locator('.p1-home a[href], .p1-home button').evaluateAll((els) => els
        .filter((e) => (e as HTMLElement).offsetParent !== null)
        .map((e) => e.getAttribute('href') ?? e.textContent ?? ''));
      const reached = new Set<string>();
      await page.locator('body').click({ position: { x: 1, y: 1 } });
      for (let i = 0; i < 90 && reached.size < controls.length; i++) {
        await page.keyboard.press('Tab');
        const href = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el && el.closest('.p1-home') ? (el.getAttribute('href') ?? el.textContent ?? '') : null;
        });
        if (href !== null) reached.add(href);
        if (href === '/quizzes') expect((await focusRing(page))?.outline).toMatch(PINK_RING);
      }
      for (const c of controls) expect(reached, `keyboard reaches ${c}`).toContain(c);
      // Enter operates a focused control (QOTD Play).
      const play = page.locator('.p1-qotd a');
      if (await play.count()) {
        await play.focus();
        expect((await focusRing(page))?.outline).toMatch(PINK_RING);
        const href = await play.getAttribute('href');
        await page.keyboard.press('Enter');
        await expect(page).toHaveURL(new RegExp(`${(href ?? '').replace('?', '\\?')}$`));
      }
    });
  });
}

signedInTest.describe('home signed in (test user, read only)', () => {
  for (const theme of THEMES) {
    signedInTest(`greeting, streak line, continue, band (${theme})`, async ({ page }, info) => {
      skipUnlessSignedIn();
      await preparePage(page, theme);
      const calls = await guardWrites(page, env.supabaseUrl);
      // /api/auth/me fails open (signed out) when Supabase auth answers slower than
      // 2.5 s; the first call on a cold server can: read it until it answers (GET).
      let me: { profile: { username: string; display_name: string | null } | null } = { profile: null };
      for (let i = 0; i < 4 && !me.profile; i++) me = await (await page.request.get('/api/auth/me')).json() as typeof me;
      expect(me.profile, 'GET /api/auth/me with the storage state = the test user').not.toBeNull();
      const name = (me.profile?.display_name || me.profile?.username || '').trim();
      // Two unfinished runs on this device: a quiz the home does not list (older than
      // 60 days, least played: not new, not trending, not all time best) and the quiz
      // of the day (already on the home: left out, 16.7).
      const q = await expectedQotd();
      const before = new Date(Date.now() - 60 * 86_400_000).toISOString();
      const { rows: oldest } = await rest<{ slug: string }[]>(`quizzes?select=slug&status=eq.published&created_at=lt.${before}&order=play_count.asc,id.asc&limit=1`);
      const runSlug = oldest[0]?.slug;
      if (runSlug) {
        await page.addInitScript(([slug, qotdSlug]) => {
          const at = new Date().toISOString();
          const runs = [{ slug, title: 'Continue run', groupSlug: 'stray-kids', answered: 3, total: 8, updatedAt: at }];
          if (qotdSlug) runs.push({ slug: qotdSlug, title: 'Quiz of the day run', groupSlug: 'stray-kids', answered: 2, total: 8, updatedAt: at });
          try { localStorage.setItem('kq_ux_continue_v1', JSON.stringify(runs)); } catch { /* blocked */ }
        }, [runSlug, q?.slug ?? null] as const);
      }
      const band = page.waitForResponse((r) => r.url().includes('/api/ux-v1/p1/daily-band'));
      signedInTest.skip(!(await openHome(page)), 'UX v1 flag is OFF on this build');

      const h1 = page.locator('h1');
      await expect(h1).toHaveCount(1);
      await expect(h1).toHaveText(new RegExp(`^K-pop QuizGood (morning|afternoon|evening), ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
      await expect(h1.locator('em')).toHaveText(name);
      await expect(page.locator('.p1-hhead p.p1-hsub')).toHaveText(/streak/);
      await expect(page.locator('.p1-hcta'), 'no CTAs for a signed-in fan').toHaveCount(0);

      if (runSlug) {
        const cont = page.locator('section[aria-labelledby="p1-cont-h"]');
        await expect(cont.locator('h2')).toHaveText('Continue playing');
        await expect(cont.locator('a.p1-citem'), 'the quiz of the day run is not listed twice').toHaveCount(1);
        await expect(cont.locator('a.p1-citem')).toHaveAttribute('href', `/q/${runSlug}`);
        await expect(cont.locator('.ux-rs')).toHaveText('3 of 8 answered');
      }

      const res = (await (await band).json()) as { signedIn: boolean; today: { score: number; rank: number; of: number } | null; best: number | null };
      expect(res.signedIn).toBe(true);
      if (res.today) {
        await expect(page.locator('.p1-band h2')).toHaveText(`You scored ${res.today.score}/10 today.`);
        await expect(page.locator('.p1-band').getByRole('link', { name: "See today's board" })).toBeVisible();
      }
      if (res.best != null && widthOf(page) > 760) await expect(page.locator('.p1-stat')).toHaveText(`Your best ${res.best}/10`);
      else await expect(page.locator('.p1-stat')).toHaveCount(0);

      const lm = p1Landmarks(widthOf(page)).filter((l) => l.state === 'home');
      const cmp = await compareLandmarks(page, widthOf(page), theme, lm);
      expect(cmp.mismatches, 'signed-in header styles equal to styles.json').toEqual([]);
      const axe = await runAxe(page, { include: '.p1-home' });
      if (axe) expect(axe).toEqual([]);
      await info.attach(`home-${widthOf(page)}-${theme}.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
      expect(calls, 'zero write attempts while signed in').toEqual([]);
    });
  }
});
