import { signedInTest as test, expect, skipUnlessSignedIn } from '../ux-v1/helpers/auth';
import { loadTestEnv } from '../ux-v1/helpers/env';

import type { APIRequestContext, Page } from '@playwright/test';

// V12 community notifications (owner, 2026-10-07), in the existing bell (creator_notifications,
// notification_prefs Social): a reply notifies the author of the comment it answers, at any
// level; a comment notifies the post's author; unread notifications group; Social off sends
// nothing; a click opens the post on the right comment. Runs on a dev server with
// NEXT_PUBLIC_UX_V1=1 and NEXT_PUBLIC_UX_V12=1, as the signed-in test user.
//
// Writes, only with COMMUNITY_E2E_WRITES=1 (helpers/guard.ts: no e2e write otherwise). Two
// existing accounts: the test user acts through the real routes; the owner's local test
// account `localdev` is the author who gets notified. The posts and comments are made with
// the service key, dated a few minutes back (the test user's reply rate cap stays free).
// After the run: posts removed, comments deleted, the notifications made here deleted, and
// localdev's notification settings put back as they were.

const env = loadTestEnv();
const WRITES = process.env.COMMUNITY_E2E_WRITES === '1';
const LOCALDEV = '67358f12-5068-4cd9-ba02-ad19fdadad73';

function svc(): Record<string, string> {
  return { apikey: env.serviceKey!, Authorization: `Bearer ${env.serviceKey!}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
}
const rest = (p: string): string => `${env.supabaseUrl}/rest/v1/${p}`;

async function rows<T>(api: APIRequestContext, p: string): Promise<T[]> {
  return (await (await api.get(rest(p), { headers: svc() })).json()) as T[];
}
async function insert<T>(api: APIRequestContext, table: string, row: Record<string, unknown>): Promise<T> {
  const r = await api.post(rest(table), { headers: svc(), data: row });
  expect(r.status(), `${table} insert`).toBe(201);
  return ((await r.json()) as T[])[0]!;
}

async function signedIn(page: Page): Promise<void> {
  await expect(page.locator('.ux-nav-signin')).toHaveCount(0, { timeout: 30_000 });
}

/** Reply under a comment of the open post, through the real route. */
async function replyUnder(page: Page, commentId: number, text: string): Promise<number> {
  const node = page.locator(`#reply-${commentId}`);
  await node.locator(':scope > .p8-cmt').getByRole('button', { name: 'Reply', exact: true }).click();
  const sub = node.locator(':scope > .p8-subform');
  await sub.locator('textarea').fill(text);
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/verse/discussions'),
    sub.getByRole('button', { name: 'Reply', exact: true }).click(),
  ]);
  expect(res.status()).toBe(200);
  return ((await res.json()) as { id: number }).id;
}

interface Notice { id: string; user_id: string; type: string; title: string; body: string | null; link_url: string | null; group_key: string | null; is_read: boolean; sources: { ref: string }[] | null }
const NOTICE = 'id,user_id,type,title,body,link_url,group_key,is_read,sources';

interface Fixture { thread: number; l1: number; l2: number; l2b: number; l2c: number; blog: number; deepThread: number; deep: number[] }
let fx: Fixture | null = null;
let prefsBefore: { categories: Record<string, unknown> } | null | undefined;
const madeNotices: string[] = [];

test.describe('V12 community notifications', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async ({ playwright }) => {
    if (!WRITES || !env.supabaseUrl || !env.serviceKey || !env.userId) return;
    const api = await playwright.request.newContext();
    const bts = (await rows<{ id: number }>(api, 'groups?select=id&slug=eq.bts'))[0]!.id;
    const ago = (min: number): string => new Date(Date.now() - min * 60_000).toISOString();
    const stamp = Date.now();
    const thread = async (by: string, title: string): Promise<number> => {
      const t = await insert<{ id: number }>(api, 'verse_threads', { group_id: bts, slug: `e2e-notif-${stamp}-${Math.random().toString(36).slice(2, 8)}`, title, created_by: by, entity_type: 'group', entity_id: String(bts), status: 'visible', origin: 'community', created_at: ago(20), updated_at: ago(20) });
      await insert(api, 'verse_discussions', { entity_type: 'group', entity_id: String(bts), author: by, thread_id: t.id, status: 'visible', body: 'An e2e test thread, removed right after.', parent_id: null, created_at: ago(20) });
      return t.id;
    };
    const comment = async (threadId: number, by: string, body: string, parent: number | null, min: number): Promise<number> =>
      (await insert<{ id: number }>(api, 'verse_discussions', { entity_type: 'group', entity_id: String(bts), author: by, thread_id: threadId, status: 'visible', body, parent_id: parent, created_at: ago(min) })).id;
    // The thread is the test user's (a comment-level notice would go to themselves: none);
    // level one is the test user's, level two is localdev's.
    const t = await thread(env.userId, `[e2e] notifications ${stamp}`);
    const l1 = await comment(t, env.userId, '[e2e] level one', null, 19);
    const l2 = await comment(t, LOCALDEV, '[e2e] level two, by localdev', l1, 18);
    const l2b = await comment(t, LOCALDEV, '[e2e] another comment by localdev', null, 17);
    const l2c = await comment(t, LOCALDEV, '[e2e] a third comment by localdev', null, 16);
    // A blog by localdev (a comment on it notifies localdev).
    const blog = await insert<{ id: number }>(api, 'verse_essays', {
      group_id: bts, author: LOCALDEV, title: `[e2e] notified blog ${stamp}`, status: 'featured', featured_at: ago(20), origin: 'community', created_at: ago(20),
      content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'An e2e test blog, removed right after.' }] }] },
    });
    // A branch 8 levels deep (past "Continue this thread"), for the click test.
    const d = await thread(LOCALDEV, `[e2e] deep branch ${stamp}`);
    const deep: number[] = [];
    for (let i = 0; i < 8; i++) deep.push(await comment(d, i % 2 ? env.userId : LOCALDEV, `[e2e] depth ${i + 1}`, deep[i - 1] ?? null, 15 - i));
    fx = { thread: t, l1, l2, l2b, l2c, blog: blog.id, deepThread: d, deep };
    prefsBefore = (await rows<{ categories: Record<string, unknown> }>(api, `notification_prefs?select=categories&user_id=eq.${LOCALDEV}`))[0] ?? null;
    await api.dispose();
  });

  test.afterAll(async ({ playwright }) => {
    if (!fx || !env.supabaseUrl || !env.serviceKey) return;
    const api = await playwright.request.newContext();
    for (const t of [fx.thread, fx.deepThread]) {
      await api.patch(rest(`verse_discussions?thread_id=eq.${t}`), { headers: svc(), data: { status: 'deleted' } });
      await api.patch(rest(`verse_threads?id=eq.${t}`), { headers: svc(), data: { status: 'removed' } });
    }
    await api.patch(rest(`verse_discussions?entity_type=eq.essay&entity_id=eq.${fx.blog}`), { headers: svc(), data: { status: 'deleted' } });
    await api.patch(rest(`verse_essays?id=eq.${fx.blog}`), { headers: svc(), data: { status: 'rejected' } });
    // The notifications this run made (test rows), and localdev's settings as they were.
    const ids = [...madeNotices];
    const groups = [`reply:comment:${fx.l2}`, `reply:comment:${fx.l2b}`, `reply:comment:${fx.l2c}`, `post:blog:${fx.blog}`, `post:thread:${fx.thread}`];
    for (const g of groups) for (const r of await rows<{ id: string }>(api, `creator_notifications?select=id&group_key=eq.${encodeURIComponent(g)}`)) ids.push(r.id);
    if (ids.length) await api.delete(rest(`creator_notifications?id=in.(${[...new Set(ids)].join(',')})`), { headers: svc() });
    if (prefsBefore === null) await api.delete(rest(`notification_prefs?user_id=eq.${LOCALDEV}`), { headers: svc() });
    else if (prefsBefore) await api.patch(rest(`notification_prefs?user_id=eq.${LOCALDEV}`), { headers: svc(), data: { categories: prefsBefore.categories } });
    await api.dispose();
  });

  test('a reply at level 3 notifies the author of the comment it answers, and only them', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes test posts: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    await page.goto(`/community/thread/${f.thread}`);
    await signedIn(page);
    const text = `[e2e] a level three reply ${Date.now()}`;
    const id = await replyUnder(page, f.l2, text);
    const mine = await rows<Notice>(page.request, `creator_notifications?select=${NOTICE}&sources=cs.${encodeURIComponent(JSON.stringify([{ ref: `comment:${id}` }]))}`);
    expect(mine, 'one notification, to the author of level two').toHaveLength(1);
    expect(mine[0]).toMatchObject({ user_id: LOCALDEV, type: 'community_reply', title: 'testtest replied to your comment', body: text, link_url: `/community/thread/${f.thread}?reply=${id}`, group_key: `reply:comment:${f.l2}`, is_read: false });
    madeNotices.push(mine[0]!.id);
  });

  test('a comment on a post notifies its author', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes test posts: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    await page.goto(`/community/blog/${f.blog}`);
    await signedIn(page);
    const text = `[e2e] a comment on localdev's blog ${Date.now()}`;
    const form = page.locator('#replies form.p8-cform').first();
    await form.getByPlaceholder('Write a reply').fill(text);
    const [res] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/verse/discussions'),
      form.getByRole('button', { name: 'Reply', exact: true }).click(),
    ]);
    const id = ((await res.json()) as { id: number }).id;
    const got = await rows<Notice>(page.request, `creator_notifications?select=${NOTICE}&group_key=eq.post:blog:${f.blog}`);
    expect(got).toHaveLength(1);
    expect(got[0]).toMatchObject({ user_id: LOCALDEV, type: 'community_comment', title: 'testtest commented on your post', body: text, link_url: `/community/blog/${f.blog}?reply=${id}` });
    madeNotices.push(got[0]!.id);
  });

  test('two replies to the same comment while unread: one notification, "X and 1 other"', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes test posts: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    // An earlier reply by another fan already told localdev (its unread notification).
    const earlier = await insert<{ id: string }>(page.request, 'creator_notifications', {
      user_id: LOCALDEV, type: 'community_reply', title: 'Mina replied to your comment', body: 'First!', link_url: `/community/thread/${f.thread}?reply=1`,
      group_key: `reply:comment:${f.l2b}`, sources: [{ ref: 'comment:e2e-earlier', sender: '00000000-0000-4000-8000-0000000000e2', name: 'Mina', excerpt: 'First!', link: `/community/thread/${f.thread}?reply=1`, at: new Date().toISOString() }],
    });
    madeNotices.push(earlier.id);
    await page.goto(`/community/thread/${f.thread}`);
    await signedIn(page);
    const a = await replyUnder(page, f.l2b, `[e2e] first reply ${Date.now()}`);
    const b = await replyUnder(page, f.l2b, `[e2e] second reply ${Date.now()}`);
    const got = await rows<Notice>(page.request, `creator_notifications?select=${NOTICE}&group_key=eq.${encodeURIComponent(`reply:comment:${f.l2b}`)}`);
    expect(got, 'still one row').toHaveLength(1);
    expect(got[0]).toMatchObject({ id: earlier.id, title: 'testtest and 1 other replied to your comment', link_url: `/community/thread/${f.thread}?reply=${b}`, is_read: false });
    expect(got[0]!.sources!.map((s) => s.ref)).toEqual(['comment:e2e-earlier', `comment:${a}`, `comment:${b}`]);
  });

  test('Social switched off: a reply notifies no one', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes test posts: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    const set = await page.request.post(rest('notification_prefs'), {
      headers: { ...svc(), Prefer: 'resolution=merge-duplicates,return=representation' },
      data: { user_id: LOCALDEV, categories: { ...(prefsBefore?.categories ?? {}), social: false } },
    });
    expect(set.status()).toBeLessThan(300);
    await page.goto(`/community/thread/${f.thread}`);
    await signedIn(page);
    const id = await replyUnder(page, f.l2c, `[e2e] a reply with Social off ${Date.now()}`);
    const got = await rows<Notice>(page.request, `creator_notifications?select=${NOTICE}&group_key=eq.${encodeURIComponent(`reply:comment:${f.l2c}`)}`);
    expect(got, `no notification for comment:${id}`).toEqual([]);
  });

  test('a click on the notification opens the post on the right comment, past "Continue this thread"', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx || !env.userId, 'writes test posts: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    const target = f.deep[7]!; // level 8: behind "Continue this thread" in the full view
    const link = `/community/thread/${f.deepThread}?reply=${target}`;
    const n = await insert<{ id: string }>(page.request, 'creator_notifications', {
      user_id: env.userId, type: 'community_reply', title: '[e2e] localdev replied to your comment', body: '[e2e] depth 8', link_url: link,
      group_key: `reply:comment:${f.deep[6]}`, sources: [{ ref: `comment:${target}`, sender: LOCALDEV, name: 'localdev', excerpt: '[e2e] depth 8', link, at: new Date().toISOString() }],
    });
    madeNotices.push(n.id);
    await page.goto('/');
    await signedIn(page);
    await page.getByRole('button', { name: /^Notifications/ }).click();
    const row = page.locator('ul.p11-bell a.p11-brow').filter({ hasText: '[e2e] localdev replied to your comment' });
    await expect(row).toBeVisible({ timeout: 20_000 });
    await row.click();
    await expect(page).toHaveURL(new RegExp(`/community/thread/${f.deepThread}\\?reply=${target}$`));
    const cmt = page.locator(`#reply-${target} > .p8-cmt`);
    await expect(cmt).toContainText('[e2e] depth 8');
    await expect(cmt).toHaveClass(/is-flash/);
    await expect(cmt).toBeInViewport();
    await expect(page.locator('.p8-branch-bar')).toContainText('Back to all replies');
    // the moment passes
    await expect(cmt).not.toHaveClass(/is-flash/, { timeout: 6_000 });
    await expect.poll(async () => (await rows<Notice>(page.request, `creator_notifications?select=${NOTICE}&id=eq.${n.id}`))[0]?.is_read, { message: 'the click marks it read' }).toBe(true);
  });

  test('a reply hidden by 3 reports takes its notification away', async ({ page }) => {
    skipUnlessSignedIn();
    test.skip(!fx, 'writes test posts: run with COMMUNITY_E2E_WRITES=1');
    const f = fx!;
    const replies = await rows<{ id: number }>(page.request, `verse_discussions?select=id&thread_id=eq.${f.thread}&parent_id=eq.${f.l2}&status=eq.visible`);
    test.skip(!replies.length, 'needs the level three reply of the first test');
    const ref = `comment:${replies[0]!.id}`;
    const query = `creator_notifications?select=${NOTICE}&sources=cs.${encodeURIComponent(JSON.stringify([{ ref }]))}`;
    expect(await rows<Notice>(page.request, query)).toHaveLength(1);
    for (let i = 0; i < 3; i++) {
      const r = await page.request.post(rest('verse_flags'), { headers: svc(), data: { target_type: 'comment', target_id: replies[0]!.id, reporter: crypto.randomUUID(), reason: 'e2e', status: 'open' } });
      expect(r.status()).toBe(201);
    }
    expect(await rows<Notice>(page.request, query), 'the notification is gone').toEqual([]);
    await page.request.patch(rest(`verse_flags?target_type=eq.comment&target_id=eq.${replies[0]!.id}`), { headers: svc(), data: { status: 'dismissed' } });
  });
});
