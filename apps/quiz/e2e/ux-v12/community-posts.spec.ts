import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { signedInTest as test, expect, skipUnlessSignedIn } from '../ux-v1/helpers/auth';
import { APP_DIR, loadTestEnv } from '../ux-v1/helpers/env';

import type { Page, Request } from '@playwright/test';

// V12 community posts (owner, 2026-10-06): fans post Threads and Blogs from /community for
// every group, banned words and NSFW photos are refused by the server, and the 3rd report by
// a 3rd account hides a post. Runs on a dev server with NEXT_PUBLIC_UX_V1=1 and
// NEXT_PUBLIC_UX_V12=1, as the signed-in test user.
//
// Writes: the repo rule (helpers/guard.ts) is that an e2e never writes to the production
// database. The create tests stub their writes and assert the payloads. The refusal tests hit
// the REAL routes, which refuse before any write (banned word, NSFW photo with a SIMULATED
// verdict: the dev-only x-nsfw-simulate header, never a real NSFW picture). The 3rd-report
// test needs a real post: it runs only with COMMUNITY_E2E_WRITES=1, creates one test thread,
// adds two reports from made-up accounts, lets the test user file the real 3rd, and then
// soft-cleans (status removed, reports dismissed, the log row marked restored).

const env = loadTestEnv();
const PHOTO_FILE = path.join(APP_DIR, 'public/idols/BTS.jpg'); // a safe group photo
const WRITES = process.env.COMMUNITY_E2E_WRITES === '1';

async function openEditor(page: Page, mode: 'Thread' | 'Blog'): Promise<void> {
  await page.goto('/community');
  await page.locator('.p8-composer-in').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  await sheet.getByRole('group', { name: 'Post type' }).getByRole('button', { name: mode, exact: true }).click();
  // Thread and Blog are offered for every group (here BTS), the Verse closed.
  const picker = sheet.getByRole('combobox');
  await picker.fill('BTS');
  await sheet.getByRole('option', { name: 'BTS', exact: true }).click();
}

/** Every write the page sends to these routes, recorded and answered locally. */
async function stubWrites(page: Page, answers: Record<string, unknown>): Promise<Array<{ url: string; body: unknown }>> {
  const calls: Array<{ url: string; body: unknown }> = [];
  await page.route((u) => u.pathname.startsWith('/api/'), async (route) => {
    const req: Request = route.request();
    if (req.method() === 'GET' || req.method() === 'HEAD') { await route.continue(); return; }
    const p = new URL(req.url()).pathname;
    let body: unknown = null;
    try { body = req.postDataJSON(); } catch { body = '(binary)'; }
    calls.push({ url: p, body });
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(answers[p] ?? {}) });
  });
  return calls;
}

test.describe('V12 community posts', () => {
  test.describe.configure({ timeout: 120_000 });

  test('thread with a photo: the checked photo rides with a community thread', async ({ page }) => {
    skipUnlessSignedIn();
    const assetPath = `community/${env.userId ?? '00000000-0000-4000-8000-000000000000'}/${randomUUID()}.jpg`;
    const calls = await stubWrites(page, {
      '/api/ux-v1/p8/photo': { ok: true, assetPath, url: '/idols/BTS.jpg' },
      '/api/verse/threads': { ok: true, id: 987654, slug: 'e2e' },
    });
    await openEditor(page, 'Thread');
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Title').fill('Which era should a new fan start with?');
    await sheet.getByLabel(/^Text/).fill('Tell me yours.');
    await sheet.locator('input[type="file"]').setInputFiles(PHOTO_FILE);
    await expect(sheet.getByRole('img', { name: 'The photo of your post' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page).toHaveURL(/\/community\/thread\/987654$/);
    const photo = calls.find((c) => c.url === '/api/ux-v1/p8/photo');
    expect(photo, 'the photo went to the check first').toBeTruthy();
    const thread = calls.find((c) => c.url === '/api/verse/threads')?.body as Record<string, unknown>;
    expect(thread).toMatchObject({ title: 'Which era should a new fan start with?', body: 'Tell me yours.', origin: 'community', cover: { assetPath } });
    expect(calls.indexOf(photo!)).toBeLessThan(calls.findIndex((c) => c.url === '/api/verse/threads'));
  });

  test('blog with a photo: published at once, no space to join, no review', async ({ page }) => {
    skipUnlessSignedIn();
    const assetPath = `community/${env.userId ?? '00000000-0000-4000-8000-000000000000'}/${randomUUID()}.jpg`;
    const calls = await stubWrites(page, {
      '/api/ux-v1/p8/photo': { ok: true, assetPath, url: '/idols/BTS.jpg' },
      '/api/verse/essays': { ok: true, id: 876543, status: 'featured' },
    });
    await openEditor(page, 'Blog');
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText('published right away');
    await sheet.getByLabel('Title').fill('Every era, ranked');
    await sheet.getByLabel(/^Text/).fill('First paragraph.\n\nSecond paragraph.');
    await sheet.locator('input[type="file"]').setInputFiles(PHOTO_FILE);
    await expect(sheet.getByRole('img', { name: 'The photo of your post' })).toBeVisible();
    await sheet.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(page).toHaveURL(/\/community\/blog\/876543$/);
    const blog = calls.find((c) => c.url === '/api/verse/essays')?.body as Record<string, unknown>;
    expect(blog).toMatchObject({ title: 'Every era, ranked', origin: 'community', cover: { assetPath } });
    expect((blog.content as { type: string; content: unknown[] }).content).toHaveLength(2);
    // No membership step and no "submit for review" call.
    expect(calls.some((c) => c.url === '/api/verse/membership')).toBe(false);
    expect(calls.filter((c) => c.url === '/api/verse/essays')).toHaveLength(1);
  });

  test('a banned word is refused by the real route, with a clear message; nothing is posted', async ({ page }) => {
    skipUnlessSignedIn();
    const sent: number[] = [];
    page.on('response', (r) => { if (new URL(r.url()).pathname === '/api/verse/threads') sent.push(r.status()); });
    await openEditor(page, 'Thread');
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Title').fill('This comeback is fucking great');
    await sheet.getByRole('button', { name: 'Post', exact: true }).click();
    await expect(sheet.getByRole('alert')).toContainText('words that are not allowed here');
    await expect(sheet.getByRole('alert')).toContainText('Nothing was posted');
    expect(sent).toEqual([422]);
    await expect(page).toHaveURL(/\/community$/);
  });

  test('an NSFW photo (simulated verdict) is refused by the real route: not stored, not posted', async ({ page }) => {
    skipUnlessSignedIn();
    const statuses: number[] = [];
    let threadCalls = 0;
    await page.route('**/api/ux-v1/p8/photo', async (route) => {
      // The dev server honours this test-only header; the picture itself is a safe group photo.
      await route.continue({ headers: { ...route.request().headers(), 'x-nsfw-simulate': 'nsfw' } });
    });
    page.on('response', (r) => { if (new URL(r.url()).pathname === '/api/ux-v1/p8/photo') statuses.push(r.status()); });
    page.on('request', (r) => { if (new URL(r.url()).pathname === '/api/verse/threads') threadCalls++; });
    await openEditor(page, 'Thread');
    const sheet = page.getByRole('dialog');
    await sheet.getByLabel('Title').fill('Stage photo');
    await sheet.locator('input[type="file"]').setInputFiles(PHOTO_FILE);
    await expect(sheet.getByRole('alert')).toContainText('This photo cannot be posted here', { timeout: 60_000 });
    await expect(sheet.getByRole('img', { name: 'The photo of your post' })).toHaveCount(0);
    expect(statuses).toEqual([422]);
    expect(threadCalls, 'no thread was sent').toBe(0);
  });

  test('the 3rd report by a 3rd account hides the post for everyone (real database)', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!WRITES || !env.supabaseUrl || !env.serviceKey, 'writes a test thread: run with COMMUNITY_E2E_WRITES=1');
    const svc = { apikey: env.serviceKey!, Authorization: `Bearer ${env.serviceKey!}`, 'Content-Type': 'application/json' };
    const rest = `${env.supabaseUrl}/rest/v1`;
    const bts = (await (await page.request.get(`${rest}/groups?select=id&slug=eq.bts`, { headers: svc })).json() as Array<{ id: number }>)[0]!.id;
    const made = await page.request.post('/api/verse/threads', { data: { group_id: bts, title: `[e2e] report test ${Date.now()}`, body: 'An e2e test thread, removed right after.', origin: 'community' } });
    expect(made.status()).toBe(200);
    const id = (await made.json() as { id: number }).id;
    try {
      // Two reports from two other (made-up) accounts.
      for (let i = 0; i < 2; i++) {
        const r = await page.request.post(`${rest}/verse_flags`, { headers: svc, data: { target_type: 'thread', target_id: id, group_id: bts, reporter: randomUUID(), reason: 'e2e', status: 'open' } });
        expect(r.status()).toBe(201);
      }
      await page.goto(`/community/thread/${id}`);
      await expect(page.locator('h1')).toContainText('[e2e] report test');
      // The session is known (else Report opens the sign-in sheet), then the test user files
      // the 3rd report, through the real route and the real trigger.
      await expect(page.locator('.ux-nav-signin')).toHaveCount(0, { timeout: 30_000 });
      await page.getByRole('button', { name: 'Report', exact: true }).click();
      await expect(page.getByTestId('ux-toast')).toContainText('This post is now hidden');
      await expect(page).toHaveURL(/\/community$/);
      const after = await (await page.request.get(`${rest}/verse_threads?select=status&id=eq.${id}`, { headers: svc })).json() as Array<{ status: string }>;
      expect(after[0]?.status).toBe('hidden');
      expect((await page.request.get(`/community/thread/${id}`)).status()).toBe(404);
      // A second report by the same account is refused.
      const again = await page.request.post('/api/verse/flags', { data: { target_type: 'thread', target_id: id } });
      expect([404, 409]).toContain(again.status());
    } finally {
      await page.request.patch(`${rest}/verse_threads?id=eq.${id}`, { headers: svc, data: { status: 'removed' } });
      await page.request.patch(`${rest}/verse_flags?target_type=eq.thread&target_id=eq.${id}`, { headers: svc, data: { status: 'dismissed' } });
      await page.request.patch(`${rest}/community_autohidden?target_type=eq.thread&target_id=eq.${id}`, { headers: svc, data: { restored_at: new Date().toISOString() } });
    }
  });
});
