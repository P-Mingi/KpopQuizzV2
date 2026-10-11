import fs from 'node:fs';
import path from 'node:path';

import { signedInTest as test, expect, skipUnlessSignedIn } from '../ux-v1/helpers/auth';
import { APP_DIR, loadTestEnv } from '../ux-v1/helpers/env';

import type { APIRequestContext, Page } from '@playwright/test';

// V12 community comments (owner, 2026-10-06): every signed-in fan comments on every post,
// the daily debate included (its own box, open or closed, voted or not), and replies nest
// like on Reddit (any comment or reply, 10 levels, a thin line per level, a fold button
// per branch, "[removed]" for a hidden reply). Runs on a dev server with
// NEXT_PUBLIC_UX_V1=1 and NEXT_PUBLIC_UX_V12=1, as the signed-in test user.
//
// Writes: the repo rule (helpers/guard.ts) is that an e2e never writes to the production
// database. Without COMMUNITY_E2E_WRITES=1 the closed-debate comment is stubbed (payload
// asserted) and the banned-word reply hits the REAL route, which refuses it before any
// write. With COMMUNITY_E2E_WRITES=1 the comment is real, and a test thread and a test
// blog (origin community, as posted from /community) are made with two replies under the
// thread; every row is soft-removed after the run (thread removed, blog rejected,
// replies deleted). Captures (light and dark) go to the local checks folder, not git.

const env = loadTestEnv();
const WRITES = process.env.COMMUNITY_E2E_WRITES === '1';
const SHOTS = path.resolve(APP_DIR, '../../docs/design/growth-v12/run/checks/community-comments');
const BANNED = 'This comeback is fucking great';
const today = (): string => new Date().toISOString().slice(0, 10);

function svc(): Record<string, string> {
  return { apikey: env.serviceKey!, Authorization: `Bearer ${env.serviceKey!}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
}
const rest = (p: string): string => `${env.supabaseUrl}/rest/v1/${p}`;

async function one<T>(api: APIRequestContext, p: string): Promise<T | null> {
  const r = await api.get(rest(p), { headers: svc() });
  return ((await r.json()) as T[])[0] ?? null;
}

async function insert<T>(api: APIRequestContext, table: string, row: Record<string, unknown>): Promise<T> {
  const r = await api.post(rest(table), { headers: svc(), data: row });
  expect(r.status(), `${table} insert`).toBe(201);
  return ((await r.json()) as T[])[0]!;
}

/** The session is known (else a click opens the sign-in sheet). */
async function signedIn(page: Page): Promise<void> {
  await expect(page.locator('.ux-nav-signin')).toHaveCount(0, { timeout: 30_000 });
}

async function shot(page: Page, name: string): Promise<void> {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: false });
}

interface Fixture { bts: number; thread: number; l1: number; l2: number; blog: number }
let fx: Fixture | null = null;
const madeReplies: number[] = [];

test.describe('V12 community comments', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async ({ playwright }) => {
    if (!WRITES || !env.supabaseUrl || !env.serviceKey || !env.userId) return;
    const api = await playwright.request.newContext();
    const bts = (await one<{ id: number }>(api, 'groups?select=id&slug=eq.bts'))!.id;
    const earlier = (min: number): string => new Date(Date.now() - min * 60_000).toISOString();
    const stamp = Date.now();
    // A thread and a blog as /community posts them (origin community), dated a few minutes
    // back so the test user's reply rate cap stays free for the replies under test.
    const thread = await insert<{ id: number }>(api, 'verse_threads', { group_id: bts, slug: `e2e-nested-${stamp}`, title: `[e2e] nested replies ${stamp}`, created_by: env.userId, entity_type: 'group', entity_id: String(bts), status: 'visible', origin: 'community', created_at: earlier(10), updated_at: earlier(10) });
    const anchor = { entity_type: 'group', entity_id: String(bts), author: env.userId, thread_id: thread.id, status: 'visible' };
    await insert(api, 'verse_discussions', { ...anchor, body: 'An e2e test thread, removed right after.', parent_id: null, created_at: earlier(10) });
    const l1 = await insert<{ id: number }>(api, 'verse_discussions', { ...anchor, body: '[e2e] level one', parent_id: null, created_at: earlier(9) });
    const l2 = await insert<{ id: number }>(api, 'verse_discussions', { ...anchor, body: '[e2e] level two', parent_id: l1.id, created_at: earlier(8) });
    const blog = await insert<{ id: number }>(api, 'verse_essays', {
      group_id: bts, author: env.userId, title: `[e2e] blog replies ${stamp}`, status: 'featured', featured_at: earlier(10), origin: 'community', created_at: earlier(10),
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'An e2e test blog, removed right after.' }] }] },
    });
    fx = { bts, thread: thread.id, l1: l1.id, l2: l2.id, blog: blog.id };
    await api.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    if (!env.supabaseUrl || !env.serviceKey) return;
    const api = await playwright.request.newContext();
    if (fx) {
      await api.patch(rest(`verse_discussions?thread_id=eq.${fx.thread}`), { headers: svc(), data: { status: 'deleted' } });
      await api.patch(rest(`verse_discussions?entity_type=eq.essay&entity_id=eq.${fx.blog}`), { headers: svc(), data: { status: 'deleted' } });
      await api.patch(rest(`verse_threads?id=eq.${fx.thread}`), { headers: svc(), data: { status: 'removed' } });
      await api.patch(rest(`verse_essays?id=eq.${fx.blog}`), { headers: svc(), data: { status: 'rejected' } });
    }
    if (madeReplies.length) await api.patch(rest(`community_replies?id=in.(${madeReplies.join(',')})`), { headers: svc(), data: { status: 'deleted' } });
    await api.dispose();
  });

  test('a closed daily debate takes a comment in its own box, independent of the vote', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!env.supabaseUrl || !env.serviceKey, 'needs the service key to find a closed debate');
    const date = (await one<{ date: string }>(page.request, `daily_debates?select=date&date=lt.${today()}&order=date.desc&limit=1`))?.date;
    test.skip(!date, 'no closed daily debate');
    const body = `[e2e] comment on a closed debate ${Date.now()}`;
    let sent: Record<string, unknown> | null = null;
    if (WRITES) {
      page.on('request', (r) => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/ux-v1/p8/replies') sent = r.postDataJSON() as Record<string, unknown>; });
    } else {
      await page.route('**/api/ux-v1/p8/replies', async (route) => {
        sent = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 991 }) });
      });
    }
    await page.goto(`/community/debate/${date}`);
    await expect(page.locator('.p8-pv .p8-help').first()).toContainText('closed');
    await signedIn(page);
    const form = page.locator('#replies form.p8-cform').first();
    await form.getByPlaceholder('Write a comment').fill(body);
    await form.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(page.locator('#replies .p8-cmt').filter({ hasText: body })).toBeVisible();
    expect(sent).toMatchObject({ target_type: 'daily_debate', target_id: date, body });
    if (WRITES) {
      await page.reload();
      await expect(page.locator('#replies .p8-cmt').filter({ hasText: body })).toBeVisible();
      const row = await one<{ id: number; target_id: number }>(page.request, `community_replies?select=id,target_id&target_type=eq.daily_debate&body=eq.${encodeURIComponent(body)}`);
      expect(row?.target_id).toBe(Number(date!.replace(/-/g, '')));
      if (row) madeReplies.push(row.id);
    }
  });

  test('a signed-out visitor sees the comment box; a click goes through sign-in', async ({ browser }) => {
    test.skip(!env.supabaseUrl || !env.serviceKey, 'needs the service key to find a closed debate');
    const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] }, ...(process.env.PLAYWRIGHT_BASE_URL ? { baseURL: process.env.PLAYWRIGHT_BASE_URL } : {}) });
    const page = await ctx.newPage();
    const date = (await one<{ date: string }>(page.request, `daily_debates?select=date&date=lt.${today()}&order=date.desc&limit=1`))?.date;
    test.skip(!date, 'no closed daily debate');
    await page.goto(`/community/debate/${date}`);
    const box = page.locator('#replies').getByPlaceholder('Write a comment');
    await expect(box).toBeVisible();
    await expect(page.locator('.ux-nav-signin').first()).toBeVisible({ timeout: 30_000 });
    await box.click();
    await expect(page.getByRole('dialog')).toContainText('Sign in to reply');
    await ctx.close();
  });

  test('a reply to a reply to a reply (3 levels) under a thread posted from /community', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes a test thread: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    await page.goto(`/community/thread/${f.thread}`);
    await signedIn(page);
    const l2 = page.locator(`#reply-${f.l1} > .p8-thr > #reply-${f.l2}`);
    await expect(l2).toContainText('[e2e] level two');
    await l2.locator(':scope > .p8-cmt').getByRole('button', { name: 'Reply', exact: true }).click();
    const text = `[e2e] level three ${Date.now()}`;
    const sub = l2.locator(':scope > .p8-subform');
    await sub.locator('textarea').fill(text);
    await sub.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(l2.locator(':scope > .p8-thr > .p8-node').filter({ hasText: text })).toBeVisible();
    // The server's tree after a reload: thread > level one > level two > level three.
    await page.reload();
    const l3 = page.locator(`#reply-${f.l1} > .p8-thr > #reply-${f.l2} > .p8-thr > .p8-node`).filter({ hasText: text });
    await expect(l3).toBeVisible();
    await expect(l3.locator(':scope > .p8-cmt').getByRole('button', { name: 'Reply', exact: true })).toBeVisible();
    await expect(page.locator('#p8-rep-h')).toHaveText('3 replies');
    // A top-level comment under the same thread.
    const top = `[e2e] a comment on the thread ${Date.now()}`;
    const form = page.locator('#replies form.p8-cform').first();
    await form.getByPlaceholder('Write a reply').fill(top);
    await form.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(page.locator('#replies > .p8-node').filter({ hasText: top })).toBeVisible();
  });

  test('the fold button hides a whole branch and shows it again', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes a test thread: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    await page.goto(`/community/thread/${f.thread}`);
    const l1 = page.locator(`#reply-${f.l1}`);
    const fold = l1.locator(':scope > .p8-cmt .p8-fold');
    await expect(l1.locator(`#reply-${f.l2}`)).toBeVisible();
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await fold.click();
    await expect(fold).toHaveAttribute('aria-expanded', 'false');
    await expect(l1.locator(`#reply-${f.l2}`)).toHaveCount(0);
    await expect(l1).toContainText(/\d+ repl(y|ies) hidden/);
    await expect(l1.locator(':scope > .p8-cmt')).not.toContainText('[e2e] level one');
    await fold.click();
    await expect(fold).toHaveAttribute('aria-expanded', 'true');
    await expect(l1.locator(`#reply-${f.l2}`)).toBeVisible();
    await expect(l1).toContainText('[e2e] level one');
  });

  test('a banned word in a reply is refused by the real route, with a clear message; nothing is posted', async ({ page }) => {
    skipUnlessSignedIn();
    let url: string;
    if (fx) {
      url = `/community/thread/${fx.thread}`;
    } else {
      test.skip(!env.supabaseUrl || !env.serviceKey, 'needs the service key to find a vote comment');
      const v = await one<{ date: string }>(page.request, `debate_votes?select=date&comment=not.is.null&date=lt.${today()}&order=date.desc&limit=1`);
      test.skip(!v, 'no closed debate with a vote comment');
      url = `/community/debate/${v!.date}`;
    }
    const statuses: number[] = [];
    page.on('response', (r) => {
      if (r.request().method() === 'POST' && /^\/api\/(verse\/discussions|ux-v1\/p8\/replies)$/.test(new URL(r.url()).pathname)) statuses.push(r.status());
    });
    await page.goto(url);
    await signedIn(page);
    const node = fx ? page.locator(`#reply-${fx.l1}`) : page.locator('#replies > .p8-node').first();
    await node.locator(':scope > .p8-cmt').getByRole('button', { name: 'Reply', exact: true }).click();
    const sub = node.locator(':scope > .p8-subform');
    await sub.locator('textarea').fill(BANNED);
    await sub.getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(sub.getByRole('alert')).toContainText('words that are not allowed here');
    await expect(sub.getByRole('alert')).toContainText('Nothing was posted');
    expect(statuses).toEqual([422]);
    // The text stays in the reply box for the fan to edit; it never joins the list.
    await expect(page.locator('#replies .p8-cmt p').filter({ hasText: BANNED })).toHaveCount(0);
  });

  test('a blog posted from /community takes a comment and a reply to it', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes a test blog: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    await page.goto(`/community/blog/${f.blog}`);
    await signedIn(page);
    const c1 = `[e2e] a comment on the blog ${Date.now()}`;
    const form = page.locator('#replies form.p8-cform').first();
    await form.getByPlaceholder('Write a reply').fill(c1);
    await form.getByRole('button', { name: 'Reply', exact: true }).click();
    const node = page.locator('#replies > .p8-node').filter({ hasText: c1 });
    await expect(node).toBeVisible();
    await node.locator(':scope > .p8-cmt').getByRole('button', { name: 'Reply', exact: true }).click();
    const r1 = `[e2e] a reply on the blog ${Date.now()}`;
    await node.locator(':scope > .p8-subform textarea').fill(r1);
    await node.locator(':scope > .p8-subform').getByRole('button', { name: 'Reply', exact: true }).click();
    await expect(node.locator(':scope > .p8-thr > .p8-node').filter({ hasText: r1 })).toBeVisible();
    await page.reload();
    const again = page.locator('#replies > .p8-node').filter({ hasText: c1 });
    await expect(again.locator(':scope > .p8-thr > .p8-node').filter({ hasText: r1 })).toBeVisible();
    await expect(page.locator('#p8-rep-h')).toHaveText('2 replies');
  });

  test('light and dark: the thread line and the losing debate bar are visible', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!env.supabaseUrl || !env.serviceKey, 'needs the service key to find a debate');
    const url = fx ? `/community/thread/${fx.thread}` : null;
    const date = (await one<{ date: string }>(page.request, `daily_debates?select=date&date=lt.${today()}&order=date.desc&limit=1`))?.date;
    for (const scheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme: scheme });
      if (url) {
        await page.goto(url);
        const thr = page.locator('.p8-thr').first();
        await expect(thr).toBeVisible();
        const [line, ground] = await thr.evaluate((el) => {
          const box = el.closest('.p8-rep-box') as HTMLElement;
          return [getComputedStyle(el).borderLeftColor, getComputedStyle(box).backgroundColor];
        });
        expect(line, `${scheme}: the thread line differs from its box`).not.toBe(ground);
        await page.locator('#replies').scrollIntoViewIfNeeded();
        await shot(page, `nested-${scheme}.png`);
      }
      if (date) {
        await page.goto(`/community/debate/${date}`);
        const lose = page.locator('.p8-pv .p8-dopt:not(.is-win)').first();
        await expect(lose).toBeVisible();
        const s = await lose.evaluate((el) => {
          const box = el.closest('.p8-pv-box') as HTMLElement;
          const bar = el.querySelector('i') as HTMLElement;
          return { track: getComputedStyle(el).backgroundColor, edge: getComputedStyle(el).boxShadow, bar: getComputedStyle(bar).backgroundColor, box: getComputedStyle(box).backgroundColor };
        });
        if (scheme === 'dark') {
          expect(s.track, 'dark: the track stands out from the box').not.toBe(s.box);
          expect(s.edge, 'dark: the track has an edge').not.toBe('none');
          expect(s.bar, 'dark: the bar stands out from the track').not.toBe(s.track);
        }
        await lose.scrollIntoViewIfNeeded();
        await shot(page, `debate-${scheme}.png`);
      }
    }
  });
});

