import { test, expect } from '@playwright/test';
import { control, finishOpening, go, packs, shards, TARGET } from './helpers/target';
import { record } from './helpers/results';

// Full journeys, by the same ids as the prototype. KC_TARGET=proto runs them on the prototype (spec self-check).
test.use({ viewport: { width: 1366, height: 800 } });

test.afterEach(async ({}, info) => {
  record({ kind: 'journey', name: info.title, target: TARGET, pass: info.status === 'passed', error: info.error?.message?.split('\n')[0]?.slice(0, 240) });
});

const rarities = async (page: import('@playwright/test').Page) =>
  page.$$eval('.fan .fc .card', (els) => els.map((e) => (e.className.match(/\br-(C|U|R|SR|UR|L)\b/) || [])[1]));

test('guest opens the demo pack and is asked to sign in', async ({ page }) => {
  await go(page, '', { state: 'guest' });
  if (TARGET === 'proto') await control(page, 'guest-tg');
  await expect(page.locator('#guest')).toBeVisible();
  await page.click('#guest-demo');
  await expect(page.locator('#ov-step')).toContainText(/demo/i);
  await finishOpening(page);
  await expect(page.locator('#ov-in')).toContainText(/sign in/i);
});

test('open 1 pack: the stock drops by one and the summary shows 5 cards', async ({ page }) => {
  await go(page);
  const before = await packs(page);
  await page.click('#open-btn');
  await finishOpening(page);
  expect(await page.locator('.fan .fc').count()).toBe(5);
  await page.click('#ov-add');
  await expect(page.locator('#ov')).toBeHidden();
  expect(await packs(page)).toBe(before - 1);
});

test('open 5 packs: five packs are used', async ({ page }) => {
  await go(page);
  const before = await packs(page);
  expect(before).toBeGreaterThanOrEqual(5);
  await page.click('#open5-btn');
  await page.waitForSelector('#ov', { state: 'visible' });
  await page.waitForTimeout(800);
  // the multi opening: tap through until the summary (Reveal all as a shortcut)
  const skip = page.locator('#ov-skip');
  if (await skip.isVisible()) await skip.click();
  await page.waitForSelector('#ov-add', { state: 'visible', timeout: 30_000 });
  await page.click('#ov-add');
  await expect(page.locator('#ov')).toBeHidden();
  expect(await packs(page)).toBe(before - 5);
});

test('pack of the day opens once, then says opened today', async ({ page }) => {
  await go(page);
  await page.click('#daily-btn');
  await expect(page.locator('#ov-step')).toContainText(/Pack of the day/i);
  await finishOpening(page);
  await page.click('#ov-add');
  await expect(page.locator('#shelf .sp.daily')).toContainText(/Opened today/i);
  await expect(page.locator('#daily-btn')).toBeDisabled();
});

test('golden pack: the fifth card is Holo or better', async ({ page }) => {
  await go(page);
  await control(page, 'force-golden');
  await page.click('#open-btn');
  await expect(page.locator('#ov-step')).toContainText(/Golden pack/i);
  await finishOpening(page);
  const r = await rarities(page);
  expect(r.length).toBe(5);
  expect(['R', 'SR', 'UR', 'L']).toContain(r[4]);
});

test('Gold and Full Art can be forced and show up in the summary', async ({ page }) => {
  await go(page);
  await control(page, 'force-ur');
  await page.click('#open-btn');
  await finishOpening(page);
  expect(await rarities(page)).toContain('UR');
  await page.click('#ov-add');
  await control(page, 'force-l');
  await page.click('#open-btn');
  await finishOpening(page);
  expect(await rarities(page)).toContain('L');
});

test('Reveal all skips the card by card reveal', async ({ page }) => {
  await go(page);
  await page.click('#open-btn');
  await page.click('#opk');
  await page.waitForSelector('#ov-skip:not([hidden])');
  await page.click('#ov-skip');
  await expect(page.locator('#ov-add')).toBeVisible({ timeout: 20_000 });
});

test('craft a missing card with shards', async ({ page }) => {
  await go(page);
  const btn = page.locator('#almost [data-craft]').first();
  test.skip((await btn.count()) === 0, 'no craftable card in the Almost there row of the seeded state');
  const before = await shards(page);
  await btn.click();
  await page.waitForTimeout(600);
  expect(await shards(page)).toBeLessThan(before);
});

test('a finished set gives its reward once', async ({ page }) => {
  await go(page, '/missions');
  const claim = page.locator('#sets [data-claim]').first();
  await expect(claim).toBeVisible();
  await claim.click();
  await expect(page.locator('#sets .claimed').first()).toBeVisible();
});

test('the week: three goals with progress', async ({ page }) => {
  await go(page, '/missions');
  await expect(page.locator('#week')).toContainText(/Open 20 packs/);
  await expect(page.locator('#week')).toContainText(/Kpopdle/);
  await expect(page.locator('#week')).toContainText(/new cards/);
});

test('ranking: friends and everyone, my card', async ({ page }) => {
  await go(page, '/ranking');
  expect(await page.locator('#rank li').count()).toBeGreaterThan(3);
  await page.click('#rk-tab [data-v="all"]');
  expect(await page.locator('#rank li').count()).toBeGreaterThan(5);
  await expect(page.locator('#me-card')).toBeVisible();
});

test('a friend by code (app only)', async ({ page }) => {
  test.skip(TARGET === 'proto', 'the prototype has no friend code');
  await go(page, '/ranking');
  const input = page.getByPlaceholder(/code/i).or(page.getByLabel(/friend code|add a friend/i));
  await expect(input.first(), 'a friend-code field on the ranking page').toBeVisible();
});

test('an idol page (app only)', async ({ page }) => {
  test.skip(TARGET === 'proto', 'lot 5, not in the prototype');
  await go(page, '/idol/jisoo');
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('.card').first()).toBeVisible();
});

test('locks and recycle: recycling extras turns them into shards', async ({ page }) => {
  await go(page, '/collection');
  const before = await shards(page);
  const rec = page.locator('#recycle');
  await expect(rec).toBeEnabled();
  await rec.click();
  await page.waitForTimeout(600);
  expect(await shards(page)).toBeGreaterThan(before);
});

test('locks: a favourite star can be toggled from the card view', async ({ page }) => {
  await go(page, '/collection');
  await page.click('#f-view [data-v="grid"]');
  await page.click('#grid .card >> nth=0');
  const star = page.locator('#dt .star').first();
  await expect(star).toBeVisible();
  const was = await star.getAttribute('aria-pressed');
  await star.click();
  expect(await page.locator('#dt .star').first().getAttribute('aria-pressed')).not.toBe(was);
});
