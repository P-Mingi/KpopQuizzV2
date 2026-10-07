// The first community post of a kind linked from /community, or null. Replaces fixed post
// ids in the QA walks: thread 1 and blog 2 were test rows of the owner's local account,
// kept out of /community for good (owner, 2026-10-06), so a fixed id no longer says
// anything about the page. A run with no such post skips that case, it never passes it.

import type { Page } from '@playwright/test';

export async function firstPostPath(page: Page, kind: 'thread' | 'blog'): Promise<string | null> {
  const res = await page.goto('/community', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  if (!res || res.status() !== 200) return null;
  const href = await page.locator(`a[href^="/community/${kind}/"]`).first().getAttribute('href', { timeout: 10_000 }).catch(() => null);
  return href && /^\/community\/(thread|blog)\/e?\d{1,12}$/.test(href) ? href : null;
}
