import { test, expect } from '@playwright/test';

// TIERLIST phase 2 e2e, against the built app on :3021. Everything here works
// logged-out with no database write (bank reads are public; board state is
// client + URL). Placement is exercised via the tap flow (click a card, click a
// tier), which the maker supports on desktop and touch alike.

test.describe('discovery', () => {
  test('nav has Tier Lists right after Games and links to the hub', async ({ page }) => {
    await page.goto('/');
    const labels = await page.locator('nav[aria-label="Main navigation"] .top-nav-link-label').allTextContents();
    expect(labels).toContain('Tier Lists');
    expect(labels.indexOf('Tier Lists')).toBe(labels.indexOf('Games') + 1);
    await page.locator('nav[aria-label="Main navigation"] a', { hasText: 'Tier Lists' }).first().click();
    await expect(page).toHaveURL(/\/tier-list$/);
  });

  test('home CTA present and links correctly', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByTestId('home-tier-cta');
    await expect(cta).toBeVisible();
    await expect(cta.getByText('Make your K-pop tier list')).toBeVisible();
    await expect(page.getByTestId('home-cta-start')).toHaveAttribute('href', '/tier-list/new');
    await expect(page.getByTestId('home-cta-browse')).toHaveAttribute('href', '/tier-list');
  });

  test('hub renders with make-your-own, start-blank and featured', async ({ page }) => {
    await page.goto('/tier-list');
    await expect(page.getByTestId('tl-hub')).toBeVisible();
    await expect(page.getByTestId('make-your-own')).toHaveAttribute('href', '/tier-list/new');
    await expect(page.getByTestId('start-blank')).toHaveAttribute('href', '/tier-list/new');
    await expect(page.getByTestId('featured').locator('a').first()).toBeVisible();
    await expect(page.getByTestId('trending-empty')).toBeVisible();
  });
});

test.describe('maker', () => {
  test('create-from-blank reaches an empty maker with default tiers', async ({ page }) => {
    await page.goto('/tier-list/new');
    await expect(page.getByTestId('tl-board')).toBeVisible();
    for (const t of ['S', 'A', 'B', 'C', 'D']) await expect(page.getByTestId(`tier-${t}`)).toBeVisible();
    // Blank board: no bank cards in the tray.
    await expect(page.getByTestId('tray').locator('.tl-face')).toHaveCount(0);
  });

  test('create-from-subject loads bank items, tap places a card, undo restores', async ({ page }) => {
    await page.goto('/tier-list/new?group=bts&kind=members');
    const trayFaces = page.getByTestId('tray').locator('.tl-face');
    await expect(trayFaces.first()).toBeVisible();
    const before = await trayFaces.count();
    expect(before).toBeGreaterThan(0);
    // tap a card, then tap tier S.
    await trayFaces.first().click();
    await page.getByTestId('tier-S').click();
    await expect(page.getByTestId('tier-S').locator('.tl-face')).toHaveCount(1);
    await expect(trayFaces).toHaveCount(before - 1);
    // undo returns it to the tray.
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(page.getByTestId('tier-S').locator('.tl-face')).toHaveCount(0);
    await expect(page.getByTestId('tray').locator('.tl-face')).toHaveCount(before);
  });

  test('rename a tier via the tier editor', async ({ page }) => {
    await page.goto('/tier-list/new');
    await page.getByRole('button', { name: 'Tier S settings' }).click();
    const editor = page.getByTestId('tier-editor-S');
    await expect(editor).toBeVisible();
    await editor.getByLabel('Tier label').fill('SS');
    await editor.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByTestId('tier-SS')).toBeVisible();
  });

  test('share button reaches the share sheet, OG preview + rows render', async ({ page }) => {
    await page.goto('/tier-list/new?group=bts&kind=members');
    const trayFaces = page.getByTestId('tray').locator('.tl-face');
    await trayFaces.first().click();
    await page.getByTestId('tier-S').click();
    await page.getByTestId('share-btn').click();
    await expect(page).toHaveURL(/\/tier-list\/share\?d=/);
    const img = page.getByTestId('share-preview');
    await expect(img).toBeVisible();
    await expect(img).toHaveAttribute('src', /\/api\/og\/tier-list\?d=/);
    // the OG route actually returns an image for that state.
    const src = await img.getAttribute('src');
    const resp = await page.request.get(src!);
    expect(resp.ok()).toBeTruthy();
    expect(resp.headers()['content-type']).toContain('image/png');
    await expect(page.getByTestId('save-png')).toBeVisible();
    await expect(page.getByTestId('copy-link')).toBeVisible();
    // challenge reopens the same set on a blank board.
    await expect(page.getByTestId('challenge')).toHaveAttribute('href', /\/tier-list\/new\?d=/);
  });
});
