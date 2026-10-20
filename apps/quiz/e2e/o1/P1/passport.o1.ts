// Run O1, lane P1: the passport pages of otakuquiz.org on o1-dev, in a real browser (Chromium of the installed Playwright).
//
//   O1_P1_ANIME_URL                    the anime server (http://anime.localhost:<port>, scripts/o1-tools/dev-up.sh); unset skips everything.
// The sign-in links of the fixture accounts are asked from scripts/o1-tools/signin-link.sh when a test needs one (it needs the
// sites up: scripts/o1-tools/dev-up.sh); a link lives in memory only and is never printed.
//
// What it covers: /me, /settings, /u/<member> and /onboarding for the anime-only fixture; no K-pop word and no kpopquiz link on any of them,
// for the anime-only account and for a kpop-heavy account that has no anime membership; sign out of this site only and sign out everywhere;
// an oshi above the reader's spoiler progress is refused. Tests print outcomes only: never a link, a token or an address with a query.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test, type Page } from '@playwright/test';

const ANIME = (process.env.O1_P1_ANIME_URL ?? '').replace(/\/+$/, '');
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

/** A one-time sign-in link of a fixture account for the anime server, from scripts/o1-tools/signin-link.sh (kept in memory only). */
function mint(key: string): string | null {
  try {
    const out = execFileSync('bash', [path.join(REPO, 'scripts/o1-tools/signin-link.sh'), key, 'anime'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 120_000 }).trim();
    return /^http/.test(out) ? out : null;
  } catch {
    return null;
  }
}

test.skip(!ANIME, 'O1_P1_ANIME_URL is not set');

async function signIn(page: Page, key: string): Promise<void> {
  const link = mint(key);
  test.skip(!link, `no sign-in link for ${key} (is scripts/o1-tools/dev-up.sh running?)`);
  await page.goto(link as string, { waitUntil: 'domcontentloaded' });
  await expect.poll(async () => (await page.context().cookies(ANIME)).some((c) => /auth-token/.test(c.name))).toBe(true);
}

/** The visible text and every link of a page, for the leak checks. */
async function surface(page: Page): Promise<{ text: string; hrefs: string[] }> {
  await page.waitForLoadState('networkidle').catch(() => undefined);
  const text = await page.evaluate(() => document.body.innerText);
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
  return { text, hrefs };
}

function expectNoKpop(s: { text: string; hrefs: string[] }, where: string, ownName = ''): void {
  // The member's own display name is their data (the kpop-heavy fixture is called "Fixture Kpop Heavy"), not a word of the site.
  const text = ownName ? s.text.split(ownName).join('') : s.text;
  const hits = text.match(/.{0,40}(?:k-?pop|kpopquiz|discord).{0,40}/gis) ?? [];
  expect(hits, `${where}: visible text`).toEqual([]);
  expect(s.hrefs.filter((h) => /kpopquiz/i.test(h)), `${where}: links`).toEqual([]);
}

test.describe('the anime-only member', () => {
  test('/me, /settings, /u/<member> and /onboarding, with no K-pop word', async ({ page }) => {
    await signIn(page, 'anime_new');
    await page.goto(`${ANIME}/me`);
    await expect(page.locator('h1.p10-pname')).toBeVisible();
    expectNoKpop(await surface(page), '/me');
    const name = (await page.locator('h1.p10-pname').innerText()).trim();
    expect(name.length).toBeGreaterThan(0);

    await page.goto(`${ANIME}/settings`);
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Anime' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your look' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out everywhere' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out of OtakuQuiz only' }).first()).toBeVisible();
    await expect(page.getByText('FanQuiz passport').first()).toBeVisible();
    expectNoKpop(await surface(page), '/settings');

    await page.goto(`${ANIME}/u/o1_anime_new`);
    await expect(page.locator('h1.p10-pname')).toBeVisible();
    expectNoKpop(await surface(page), '/u/o1_anime_new');
    expect(await page.locator('meta[name="robots"]').getAttribute('content')).toMatch(/noindex/);

    await page.goto(`${ANIME}/onboarding`);
    await expect(page.getByRole('heading', { name: 'Pick a username' })).toBeVisible();
    expectNoKpop(await surface(page), '/onboarding');
  });

  test('/login and the sign-in sheet say OtakuQuiz, offer Google and the email link, no Discord', async ({ page }) => {
    await page.goto(`${ANIME}/login`);
    await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Discord/ })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Email me a sign-in link' })).toBeVisible();
    await expect(page.getByText('One FanQuiz passport works on every site of the network.')).toBeVisible();
    expectNoKpop(await surface(page), '/login');
  });

  test('a member that does not exist on this site is a 404', async ({ page }) => {
    const res = await page.goto(`${ANIME}/u/o1_no_such_member_p1`);
    expect(res?.status()).toBe(404);
  });
});

test.describe('a kpop-heavy account that has no anime membership', () => {
  test('/me and /settings show nothing of the kpop presentation; its member page is a 404 here', async ({ page }) => {
    await signIn(page, 'kpop_heavy');
    await page.goto(`${ANIME}/me`);
    await expect(page.locator('h1.p10-pname')).toBeVisible();
    const own = (await page.locator('h1.p10-pname').innerText()).trim();
    expectNoKpop(await surface(page), '/me', own);
    await page.goto(`${ANIME}/settings`);
    await expect(page.getByRole('heading', { name: 'Anime' })).toBeVisible();
    expectNoKpop(await surface(page), '/settings', own);
    const res = await page.goto(`${ANIME}/u/o1_kpop_heavy`);
    expect(res?.status()).toBe(404);
  });
});

test.describe('the oshi', () => {
  test('a character above the reader\'s spoiler progress is refused, one the progress has reached is picked and saved', async ({ page }) => {
    await signIn(page, 'dual');
    await page.goto(`${ANIME}/settings`);
    await page.getByRole('button', { name: 'Add a series' }).click();
    await page.getByRole('searchbox').fill('death');
    await page.getByRole('button', { name: /Death Note/ }).first().click();
    const group = page.getByRole('radiogroup', { name: 'Pick your oshi' });
    await expect(group.getByRole('radio', { name: '?' }).first()).toBeVisible();
    // a locked tile has no name (a name would be the spoiler); picking it is refused and nothing changes
    await group.getByRole('radio', { name: '?' }).first().click({ force: true });
    await expect(page.getByRole('alert').filter({ hasText: 'You have not got that far in Death Note yet' })).toBeVisible();
    await expect(page.locator('.p10-savebar')).toHaveCount(1); // the series is the only change
    await expect(page.getByRole('radio', { name: 'No oshi tag' })).toHaveAttribute('aria-checked', 'true');
    // a character with no spoiler level can be picked
    await group.getByRole('radio').first().click();
    await expect(page.getByRole('radio', { name: 'No oshi tag' })).toHaveAttribute('aria-checked', 'false');
  });
});

test.describe('signing out', () => {
  test('sign out of this site only', async ({ page }) => {
    await signIn(page, 'dual');
    await page.goto(`${ANIME}/settings`);
    await page.getByRole('button', { name: 'Sign out of OtakuQuiz only' }).first().click();
    await page.waitForURL(`${ANIME}/`);
    await page.goto(`${ANIME}/me`);
    await expect(page.getByRole('heading', { name: 'Your OtakuQuiz passport' })).toBeVisible();
  });

  test('sign out everywhere', async ({ page }) => {
    await signIn(page, 'dual');
    await page.goto(`${ANIME}/settings`);
    await page.getByRole('button', { name: 'Sign out everywhere' }).first().click();
    await page.waitForURL(`${ANIME}/`);
    await page.goto(`${ANIME}/me`);
    await expect(page.getByRole('heading', { name: 'Your OtakuQuiz passport' })).toBeVisible();
  });
});
