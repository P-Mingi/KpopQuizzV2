import { test, expect, type Page } from '@playwright/test';

// GAMES HUB e2e, against the built app on :3021 (never dev). Runs on both the
// desktop and mobile projects. Everything here works logged out with no database
// write: the hub is server-rendered ISR HTML plus client islands (filter, streak,
// countdown). The eight cards are always in the DOM (SEO); the filter only toggles
// visibility, so filter assertions use visibility, not DOM presence.

const CARD_IDS = [
  'name-them-all', 'sort-it', 'match-up', 'this-or-that',
  'which-member', 'duel', 'tier-lists', 'kpop-idle',
] as const;

// Mirrors src/lib/games/hub-filters.ts (unit-tested there); duplicated here so the
// e2e is self-contained.
const FILTER_SETS: Record<string, string[]> = {
  all: [...CARD_IDS],
  solo: ['name-them-all', 'sort-it', 'match-up', 'which-member', 'tier-lists', 'kpop-idle'],
  timed: ['name-them-all', 'sort-it', 'match-up'],
  versus: ['duel'],
  vote: ['this-or-that'],
};

async function gotoHub(page: Page, path = '/games'): Promise<void> {
  await page.goto(path, { waitUntil: 'load' });
  await expect(page.locator('.gh')).toBeVisible();
}

test.describe('games hub', () => {
  test('renders all eight game cards in the server HTML', async ({ page }) => {
    await gotoHub(page);
    for (const id of CARD_IDS) {
      await expect(page.getByTestId(`card-${id}`)).toBeVisible();
    }
    await expect(page.locator('.gh-card')).toHaveCount(8);
  });

  test('every idol face is a real image that loaded (naturalWidth > 0)', async ({ page }) => {
    await gotoHub(page);
    const faces = page.locator('.gh-face img');
    const n = await faces.count();
    expect(n).toBeGreaterThanOrEqual(8);
    // Wait (bounded) for the hub faces specifically to finish loading, without
    // touching unrelated page images (whose decode() can hang the whole page).
    await expect.poll(
      () => faces.evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0)),
      { timeout: 15000 },
    ).toBe(true);
  });

  test('daily band CTA links to the blind test', async ({ page }) => {
    await gotoHub(page);
    await expect(page.locator('a.gh-band-play')).toHaveAttribute('href', '/blindtest');
  });

  test('Tier Lists card links to the tier-list maker and shows the New badge', async ({ page }) => {
    await gotoHub(page);
    const card = page.getByTestId('card-tier-lists');
    await expect(card.locator('a.gh-play')).toHaveAttribute('href', '/tier-list');
    await expect(card.getByText('New', { exact: true })).toBeVisible();
  });

  test('K-pop Idle card is a dead-button-free "coming soon" (no link)', async ({ page }) => {
    await gotoHub(page);
    const card = page.getByTestId('card-kpop-idle');
    await expect(card.locator('a')).toHaveCount(0);
    await expect(card.getByText('Coming soon')).toBeVisible();
  });

  test('filter chips reveal exactly their set and All restores all eight', async ({ page }) => {
    await gotoHub(page);
    for (const [filter, set] of Object.entries(FILTER_SETS)) {
      await page.getByTestId(`filter-${filter}`).click();
      for (const id of CARD_IDS) {
        const card = page.getByTestId(`card-${id}`);
        if (set.includes(id)) await expect(card).toBeVisible();
        else await expect(card).toBeHidden();
      }
    }
    // explicit All restore
    await page.getByTestId('filter-all').click();
    for (const id of CARD_IDS) await expect(page.getByTestId(`card-${id}`)).toBeVisible();
  });

  test('no emoji anywhere in the hub', async ({ page }) => {
    await gotoHub(page);
    const text = (await page.locator('.gh').innerText()) ?? '';
    // Common emoji ranges (pictographs, symbols, dingbats, flags, variation selectors).
    const emoji = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{1F1E6}-\u{1F1FF}]/u;
    expect(emoji.test(text)).toBe(false);
  });

  test('/pt/games renders the same eight cards', async ({ page }) => {
    await gotoHub(page, '/pt/games');
    for (const id of CARD_IDS) await expect(page.getByTestId(`card-${id}`)).toBeVisible();
    await expect(page.locator('.gh-card')).toHaveCount(8);
  });
});

test.describe('games hub mobile', () => {
  test('no horizontal overflow at 390 (mobile artboard width)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only overflow guard');
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoHub(page);
    const { sw, cw } = await page.evaluate(() => ({
      sw: document.documentElement.scrollWidth,
      cw: document.documentElement.clientWidth,
    }));
    expect(sw).toBeLessThanOrEqual(cw);
  });

  test('foot stats stay one line and never overlap the CTA at 390', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile-only one-line guard');
    await page.setViewportSize({ width: 390, height: 800 });
    await gotoHub(page);
    const bad = await page.locator('.gh-card').evaluateAll((cards) =>
      cards.flatMap((card) => {
        const out: Array<{ card: string | null; issue: string }> = [];
        const id = card.getAttribute('data-testid');
        const stat = card.querySelector('.gh-stat') as HTMLElement | null;
        const cta = card.querySelector('.gh-cta') as HTMLElement | null;
        if (stat) {
          // one line: a nowrap stat never exceeds ~1.6 line-heights of box height
          const lh = parseFloat(getComputedStyle(stat).lineHeight) || 16;
          if (stat.getBoundingClientRect().height > lh * 1.6) out.push({ card: id, issue: 'stat wraps' });
          // no overlap: the stat's right edge must clear the CTA's left edge
          if (cta) {
            const s = stat.getBoundingClientRect();
            const c = cta.getBoundingClientRect();
            if (s.right > c.left + 1) out.push({ card: id, issue: 'stat overlaps cta' });
          }
        }
        return out;
      }),
    );
    expect(bad).toEqual([]);
  });
});
