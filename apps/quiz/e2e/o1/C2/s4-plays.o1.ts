// S4 (lane C2): after S4-revoke-public-execute.sql, the kpop flows that reach the 32 SECURITY DEFINER functions still
// work signed out and signed in on the local kpop server against o1-dev: a quiz play (record_play by the user key,
// award_xp by the service role), a like (increment_like_count and decrement_like_count by the user key, award_like_xp
// by the service role), the daily blind test (ensure_daily_blindtest and get_daily_bt_leaderboard by the service role,
// submit_daily_bt_score by the user) and the daily quiz (/daily, a play, /api/daily/complete: award_xp,
// grant_streak_badges and emit_activity by the service role). Two direct PostgREST probes with the anon key prove the
// revocation itself: get_daily_bt_leaderboard (revoked) is refused, get_personality_counts (kept) answers.
//   O1_KPOP_URL=http://kpop.localhost:<port> scripts/o1/env.sh dev -- playwright test -c playwright.o1.config.ts e2e/o1/C2
// Writes on o1-dev: plays, a like then its unlike, a daily blind test score and the daily streak of the fixture account
// kpop_heavy, all through the app. The service role is used only to mint the fixture's one-time sign-in link.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type APIRequestContext, type Browser, type BrowserContext } from '@playwright/test';

const KPOP = (process.env.O1_KPOP_URL ?? '').replace(/\/+$/, '');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../../..');
const FIXTURE = 'kpop_heavy';

const missing = [!KPOP && 'O1_KPOP_URL', !SUPABASE_URL && 'NEXT_PUBLIC_SUPABASE_URL', !ANON && 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  !SERVICE && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean) as string[];

async function sessionCookies(key: string): Promise<Array<{ name: string; value: string }>> {
  const list = JSON.parse(fs.readFileSync(path.join(REPO, 'docs/o1/fixtures-dev.json'), 'utf8')).users as Array<{ key: string; email: string }>;
  const f = list.find((u) => u.key === key);
  if (!f) throw new Error(`fixture ${key} is not in docs/o1/fixtures-dev.json`);
  const admin = createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email: f.email });
  expect(link.error, `sign-in link for ${key}`).toBeNull();
  const jar = new Map<string, string>();
  const ssr = createServerClient(SUPABASE_URL, ANON, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (l) => { for (const c of l) { if (c.value) jar.set(c.name, c.value); else jar.delete(c.name); } },
    },
  });
  const signed = await ssr.auth.verifyOtp({ type: 'email', token_hash: link.data.properties!.hashed_token });
  expect(signed.error, `session for ${key}`).toBeNull();
  return [...jar].map(([name, value]) => ({ name, value }));
}

async function contextFor(browser: Browser, signedIn: boolean): Promise<BrowserContext> {
  const context = await browser.newContext();
  if (signedIn) {
    const cookies = await sessionCookies(FIXTURE);
    await context.addCookies(cookies.map(({ name, value }) => ({ name, value, url: KPOP, sameSite: 'Lax' as const })));
  }
  return context;
}

/** A published kpop quiz, read with the anon key (a read only). */
async function someKpopQuiz(): Promise<{ id: string; slug: string }> {
  const db = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await db.from('quizzes').select('id, slug').eq('status', 'published').eq('site_id', 'kpop').limit(200);
  expect(error, 'read kpop quizzes').toBeNull();
  const rows = (data ?? []) as Array<{ id: string; slug: string }>;
  expect(rows.length, 'o1-dev holds published kpop quizzes').toBeGreaterThan(0);
  return rows[Math.floor(Math.random() * rows.length)]!;
}

async function postJson(req: APIRequestContext, p: string, body: unknown) {
  const r = await req.post(`${KPOP}${p}`, { data: body, headers: { 'Content-Type': 'application/json' }, maxRedirects: 0 });
  let json: Record<string, unknown> = {};
  try { json = (await r.json()) as Record<string, unknown>; } catch { /* not json */ }
  return { status: r.status(), json };
}

test.describe('S4: kpop flows after the PUBLIC execute revocation', () => {
  test.skip(missing.length > 0, `needs ${missing.join(', ')}`);

  test('PostgREST with the anon key: a revoked function is refused, a kept one answers', async ({ request }) => {
    const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };
    const revoked = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_daily_bt_leaderboard`, { headers, data: {} });
    expect([401, 403], 'get_daily_bt_leaderboard refused to anon').toContain(revoked.status());
    expect(((await revoked.json()) as { code?: string }).code).toBe('42501');
    const kept = await request.post(`${SUPABASE_URL}/rest/v1/rpc/get_personality_counts`, { headers, data: { p_group_id: 0 } });
    expect(kept.status(), 'get_personality_counts still open to anon').toBe(200);
  });

  for (const signedIn of [false, true]) {
    const who = signedIn ? 'signed in' : 'signed out';

    test(`quiz play and like, ${who}`, async ({ browser }) => {
      const context = await contextFor(browser, signedIn);
      const quiz = await someKpopQuiz();
      const page = await context.request.get(`${KPOP}/q/${quiz.slug}`);
      expect(page.status(), `/q/${quiz.slug}`).toBe(200);

      const play = await postJson(context.request, `/api/quiz/${quiz.id}/play`, { score: 8, total_questions: 10, time_taken_seconds: 42 });
      expect(play.status, `play ${JSON.stringify(play.json)}`).toBe(200);
      expect(typeof play.json.play_id, 'record_play returned a play id').toBe('string');
      if (signedIn && (play.json.xp_earned as number) > 0) expect(typeof play.json.new_xp, 'award_xp answered (service role)').toBe('number');

      const like = await postJson(context.request, `/api/quiz/${quiz.id}/like`, { action: 'like' });
      expect(like.status, `like ${JSON.stringify(like.json)}`).toBe(200);
      expect(like.json.liked).toBe(true);
      const unlike = await postJson(context.request, `/api/quiz/${quiz.id}/like`, { action: 'unlike' });
      expect(unlike.status, `unlike ${JSON.stringify(unlike.json)}`).toBe(200);
      expect(unlike.json.like_count, 'the unlike takes back the like').toBe(Math.max(0, (like.json.like_count as number) - 1));
      await context.close();
    });

    test(`daily quiz, ${who}`, async ({ browser }) => {
      const context = await contextFor(browser, signedIn);
      const daily = await context.request.get(`${KPOP}/daily`, { maxRedirects: 0 });
      expect([302, 303, 307, 308], '/daily redirects').toContain(daily.status());
      const to = daily.headers()['location'] ?? '';
      const m = /\/q\/([^/?#]+)\?daily=quiz/.exec(to);
      expect(m, `/daily lands on the quiz of the day (${to})`).not.toBeNull();
      const slug = m![1]!;
      expect((await context.request.get(`${KPOP}/q/${slug}?daily=quiz`)).status(), 'the quiz of the day').toBe(200);
      const db = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } });
      const { data } = await db.from('quizzes').select('id').eq('slug', slug).maybeSingle();
      expect(data?.id, 'quiz of the day id').toBeTruthy();
      const play = await postJson(context.request, `/api/quiz/${data!.id}/play`, { score: 7, total_questions: 10, time_taken_seconds: 60 });
      expect(play.status, `daily play ${JSON.stringify(play.json)}`).toBe(200);
      const done = await postJson(context.request, '/api/daily/complete', { kind: 'quiz' });
      expect(done.status, `daily complete ${JSON.stringify(done.json)}`).toBe(200);
      expect(done.json.signed_in).toBe(signedIn);
      if (signedIn) expect(done.json.already_today === true || (done.json.awarded as number) > 0, 'the streak XP was awarded or already today').toBe(true);
      await context.close();
    });

    test(`daily blind test, ${who}`, async ({ browser }) => {
      const context = await contextFor(browser, signedIn);
      expect((await context.request.get(`${KPOP}/blindtest`)).status(), '/blindtest').toBe(200);
      const set = await context.request.get(`${KPOP}/api/daily/blindtest`);
      expect(set.status(), 'ensure_daily_blindtest through the service role').toBe(200);
      const submit = await postJson(context.request, '/api/daily/blindtest/submit', { score: 6, time_ms: 41_000 });
      if (signedIn) expect(submit.status, `submit ${JSON.stringify(submit.json)}`).toBe(200);
      else expect(submit.status, 'a signed-out score is refused, as before S4').toBe(401);
      const board = await context.request.get(`${KPOP}/api/daily/blindtest/leaderboard`);
      expect(board.status(), 'get_daily_bt_leaderboard through the service role').toBe(200);
      expect((await context.request.get(`${KPOP}/blindtest/leaderboard`)).status(), '/blindtest/leaderboard').toBe(200);
      const done = await postJson(context.request, '/api/daily/complete', { kind: 'blindtest' });
      expect(done.status, `daily complete ${JSON.stringify(done.json)}`).toBe(200);
      expect(done.json.signed_in).toBe(signedIn);
      await context.close();
    });
  }
});
