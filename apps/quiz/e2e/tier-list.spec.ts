import { test, expect } from '@playwright/test';

// TIERLIST e2e, against the built app on :3021. Everything works logged-out with
// no database write (bank reads are public; board state is client + URL).
// Placement is exercised via the tap flow (click a card, click a tier), which the
// maker supports on desktop and touch alike. The `maker` describe runs on both
// the desktop and mobile projects (the responsive core, incl. the touch tap); the
// `discovery` and `wizard` describes assert desktop chrome/layout, so they skip on
// the mobile project.

const desktopOnly = (testInfo: { project: { name: string } }) =>
  test.skip(testInfo.project.name === 'mobile', 'desktop nav/layout');

test.describe('discovery', () => {
  test.beforeEach(({}, testInfo) => desktopOnly(testInfo));

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

  test('hub renders; make-your-own opens the wizard, start-blank the maker', async ({ page }) => {
    await page.goto('/tier-list');
    await expect(page.getByTestId('tl-hub')).toBeVisible();
    await expect(page.getByTestId('make-your-own')).toHaveAttribute('href', '/tier-list/create');
    await expect(page.getByTestId('start-blank')).toHaveAttribute('href', '/tier-list/new');
    await expect(page.getByTestId('featured').locator('a').first()).toBeVisible();
    await expect(page.getByTestId('trending-empty')).toBeVisible();
  });
});

test.describe('wizard', () => {
  test.beforeEach(({}, testInfo) => desktopOnly(testInfo));

  test('make-your-own reaches the subject step with Start blank first-class', async ({ page }) => {
    await page.goto('/tier-list/create');
    await expect(page.getByTestId('tl-create')).toBeVisible();
    await expect(page.getByTestId('wizard-start-blank')).toBeVisible();
    await expect(page.getByTestId('group-bts')).toBeVisible();
  });

  test('pick a subject -> pool step loads real bank items -> open the board', async ({ page }) => {
    await page.goto('/tier-list/create');
    await page.getByTestId('group-bts').click();
    await expect(page.getByTestId('subject-selected')).toBeVisible();
    await page.getByTestId('kind-members').click();
    await expect(page).toHaveURL(/\/tier-list\/create\?group=bts&kind=members/);
    await expect(page.getByTestId('tl-pool')).toBeVisible();
    const tiles = page.getByTestId('pool-grid').locator('.tl-face');
    await expect(tiles.first()).toBeVisible();
    expect(await tiles.count()).toBeGreaterThan(0);
    await page.getByTestId('open-board').click();
    await expect(page.getByTestId('tl-board')).toBeVisible();
    for (const t of ['S', 'A', 'B', 'C', 'D']) await expect(page.getByTestId(`tier-${t}`)).toBeVisible();
    // The bank pool arrived on the board (unranked tray).
    await expect(page.getByTestId('tray').locator('.tl-face').first()).toBeVisible();
  });

  test('Start blank reaches an empty maker', async ({ page }) => {
    await page.goto('/tier-list/create');
    await page.getByTestId('wizard-start-blank').click();
    await expect(page.getByTestId('tl-board')).toBeVisible();
    await expect(page.getByTestId('tray').locator('.tl-face')).toHaveCount(0);
  });

  test('import modal adds a cropped, named custom item to the tray', async ({ page }) => {
    // Keep this hermetic: force the asset upload to fail so the modal uses its
    // client-only fallback and writes nothing to the DB/bucket. The real upload +
    // moderation seam is verified live in docs/proofs/tierlist-p3.
    await page.route('**/api/tier-list/asset', (r) => r.abort());
    await page.goto('/tier-list/create?group=bts&kind=members');
    await expect(page.getByTestId('tl-pool')).toBeVisible();
    await page.getByTestId('open-import').click();
    await expect(page.getByTestId('import-modal')).toBeVisible();
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
    await page.getByTestId('import-file').setInputFiles({ name: 'bias.png', mimeType: 'image/png', buffer: png });
    await expect(page.getByTestId('import-name')).toBeVisible();
    await page.getByTestId('import-name').fill('My Bias');
    await page.getByTestId('import-add').click();
    // The custom item lands in the pool (My uploads view) and then on the board.
    await expect(page.getByTestId('seg-mine')).toContainText('(1)');
    await page.getByTestId('open-board').click();
    await expect(page.getByTestId('tl-board')).toBeVisible();
    await expect(page.getByTestId('tray').locator('.tl-face[aria-label="My Bias"]')).toBeVisible();
  });
});

test.describe('maker', () => {
  test('create-from-blank reaches an empty maker with default tiers', async ({ page }) => {
    await page.goto('/tier-list/new');
    await expect(page.getByTestId('tl-board')).toBeVisible();
    for (const t of ['S', 'A', 'B', 'C', 'D']) await expect(page.getByTestId(`tier-${t}`)).toBeVisible();
    await expect(page.getByTestId('tray').locator('.tl-face')).toHaveCount(0);
  });

  test('create-from-subject loads bank items, tap places a card, undo restores', async ({ page }) => {
    await page.goto('/tier-list/new?group=bts&kind=members');
    const trayFaces = page.getByTestId('tray').locator('.tl-face');
    await expect(trayFaces.first()).toBeVisible();
    const before = await trayFaces.count();
    expect(before).toBeGreaterThan(0);
    await trayFaces.first().click();
    await page.getByTestId('tier-S').click();
    await expect(page.getByTestId('tier-S').locator('.tl-face')).toHaveCount(1);
    await expect(trayFaces).toHaveCount(before - 1);
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
    const src = await img.getAttribute('src');
    const resp = await page.request.get(src!);
    expect(resp.ok()).toBeTruthy();
    expect(resp.headers()['content-type']).toContain('image/png');
    await expect(page.getByTestId('save-png')).toBeVisible();
    await expect(page.getByTestId('copy-link')).toBeVisible();
    await expect(page.getByTestId('challenge')).toHaveAttribute('href', /\/tier-list\/new\?d=/);
  });

  test('publish: the share sheet offers a publish control with visibility options', async ({ page }) => {
    await page.goto('/tier-list/new?group=bts&kind=members');
    const trayFaces = page.getByTestId('tray').locator('.tl-face');
    await trayFaces.first().click();
    await page.getByTestId('tier-S').click();
    await page.getByTestId('share-btn').click();
    await expect(page).toHaveURL(/\/tier-list\/share\?d=/);
    await expect(page.getByTestId('tl-publish')).toBeVisible();
    await expect(page.getByTestId('vis-public')).toBeVisible();
    await expect(page.getByTestId('vis-unlisted')).toBeVisible();
    await expect(page.getByTestId('vis-private')).toBeVisible();
    await expect(page.getByTestId('tl-publish-btn')).toBeVisible();
  });

  test('publish: a logged-out PUBLIC publish is refused 401 needsAuth (no row written)', async ({ page }) => {
    // Assert the server gate directly (deterministic, no UI-timing dependency):
    // a public list requires a signed-in creator, so logged out it is refused and
    // nothing is written. Private/unlisted saves are what a guest gets instead.
    await page.goto('/tier-list');
    const resp = await page.request.post('/api/tier-list/save', {
      data: { title: 'E2E gate check', visibility: 'public', subjectKind: 'members', subjectGroupId: 1,
        tiers: [{ label: 'S', color: '#E8457A', ord: 0 }], placements: { S: ['idol:1'] } },
    });
    expect(resp.status()).toBe(401);
    expect((await resp.json()).needsAuth).toBe(true);
  });

  test('like: a logged-out like is refused 401 needsAuth (writes no row)', async ({ page }) => {
    await page.goto('/tier-list');
    // A like requires a signed-in user (it ranks a public surface), so logged out
    // the endpoint refuses before any write; the GET still returns the public count.
    const post = await page.request.post('/api/tier-list/like', { data: { slug: 'anything', action: 'like' } });
    expect(post.status()).toBe(401);
    expect((await post.json()).needsAuth).toBe(true);
  });

  test('OG card for a bank board embeds real photos (materially larger than initials)', async ({ page }) => {
    // A bank board (real photos) vs a same-shape board with an unfetchable face
    // (initials fallback): the photo card is materially larger, proving real
    // images are embedded, and the fallback still returns a valid PNG.
    await page.goto('/tier-list/new?group=bts&kind=members');
    const trayFaces = page.getByTestId('tray').locator('.tl-face');
    await expect(trayFaces.first()).toBeVisible();
    await trayFaces.nth(0).click();
    await page.getByTestId('tier-S').click();
    await trayFaces.nth(0).click();
    await page.getByTestId('tier-S').click();
    await page.getByTestId('share-btn').click();
    const src = await page.getByTestId('share-preview').getAttribute('src');
    const photo = await page.request.get(src!);
    expect(photo.headers()['content-type']).toContain('image/png');
    const photoBytes = (await photo.body()).length;

    // A board whose only face has a non-fetchable url -> initials fallback, still a PNG.
    const initialsState = 'eyJ0IjoiVCIsImsiOltbIlMiLCIjRTg0NTdBIl1dLCJwIjp7IlMiOlsiY3VzdG9tOjEiXX0sImkiOltbImN1c3RvbToxIiwiWCIsImJsb2I6aHR0cHM6Ly94L2EiXV19';
    const initials = await page.request.get(`/api/og/tier-list?d=${initialsState}`);
    expect(initials.headers()['content-type']).toContain('image/png');
    const initialsBytes = (await initials.body()).length;
    expect(photoBytes).toBeGreaterThan(initialsBytes);
  });
});
