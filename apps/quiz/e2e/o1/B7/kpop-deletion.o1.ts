// Run O1, lane B7 (owner decision of 2026-10-24): KpopQuiz "Delete account" is the passport deletion, on o1-dev, in a real browser.
//
//   O1_B7_KPOP_URL   the kpop server built with NEXT_PUBLIC_NET_DELETION=1 (http://kpop.localhost:<port>)
//   O1_B7_HUB_URL    the hub server (runs the cron route, like the scheduler does)
//   O1_B7_CRON_SECRET  the CRON_SECRET both servers were started with (a value made for the run, never stored)
//   O1_B7_MAIL_SINK  the file the kpop server writes the "deletion scheduled" mail to (O1_MAIL_SINK of the server; nothing leaves the machine)
//   O1_B7_REPORT     where the numbers go (docs/o1/reports/B7/kpop-deletion.md)
// It needs the Supabase settings of o1-dev (scripts/o1/env.sh dev): the service role makes the test accounts, psql reads the counts and moves
// run_after into the past (dev only). Everything printed is a number or a word of the product: never an address, a key, a link or an id.
// Test accounts are removed at the end, pass or fail. Run it with e2e/o1/B7/run-dev.sh.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const KPOP = (process.env.O1_B7_KPOP_URL ?? '').replace(/\/+$/, '');
const HUB = (process.env.O1_B7_HUB_URL ?? '').replace(/\/+$/, '');
const CRON = process.env.O1_B7_CRON_SECRET ?? '';
const SINK = process.env.O1_B7_MAIL_SINK ?? '';
const REPORT = process.env.O1_B7_REPORT ?? '';
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const DB = process.env.O1_DB_URL ?? '';
const PSQL = process.env.O1_PSQL ?? '/opt/homebrew/opt/postgresql@18/bin/psql';
const SENTINEL = '00000000-0000-0000-0000-00000000dead';

test.skip(!KPOP || !HUB || !CRON || !SB_URL || !SERVICE || !DB || !SINK, 'O1_B7_* or the o1-dev settings are not set (run e2e/o1/B7/run-dev.sh)');
test.describe.configure({ mode: 'serial' });

function sql(query: string): string {
  try {
    return execFileSync(PSQL, [DB, '-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '-c', query], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    // execFileSync's own message holds the whole command line, and so the connection string: say only what psql said.
    const err = ((e as { stderr?: Buffer | string }).stderr ?? '').toString().split('\n').find((l) => /ERROR|FATAL/.test(l)) ?? 'psql failed';
    throw new Error(`psql: ${err.replace(/postgres(ql)?:\/\/\S+/g, '<db-url>').slice(0, 200)}`);
  }
}
const num = (query: string): number => Number(sql(query));

// The tables of Mission U part D (docs/pending-migrations/account-deletion-MODE-EMPLOI.md) that have no foreign key to the account.
const VERSE_TABLES = ['verse_binders', 'verse_profile_shelf', 'verse_profile_shelf_settings', 'photocard_collection', 'collectible_collection', 'verse_essay_reactions',
  'profile_section_visibility', 'verse_essay_series', 'verse_threads', 'verse_watchlists', 'space_members', 'space_poll_votes', 'verse_drafts', 'space_polls', 'verse_essays',
  'verse_flags', 'verse_space_assets', 'idols', 'photocards', 'collectibles', 'verse_banned_terms', 'community_autohidden', 'verse_edit_suggestions', 'verse_content',
  'verse_discussions', 'pages', 'page_revisions', 'verse_revisions', 'verse_pages', 'entity_overrides'];

/** Rows that still carry the account id: every foreign key to profiles or auth.users (the part D catalog loop) and every uuid or text column of the Verse tables. */
function rowsLeft(uid: string): { fkColumns: number; verseColumns: number; rows: number } {
  const cnt = (from: string): string => `(xpath('/row/c/text()', query_to_xml(${from}, false, true, '')))[1]::text::bigint`;
  const fk = sql(`select count(*) || '|' || coalesce(sum(${cnt(`format('select count(*) as c from %s where %I::text = %L', c.conrelid::regclass, a.attname, '${uid}')`)}), 0)
    from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
   where c.contype = 'f' and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass) and c.connamespace = 'public'::regnamespace`).split('|');
  const names = VERSE_TABLES.map((t) => `'${t}'`).join(',');
  const vs = sql(`select count(*) || '|' || coalesce(sum(${cnt(`format('select count(*) as c from public.%I where %I::text = %L', table_name, column_name, '${uid}')`)}), 0)
    from information_schema.columns where table_schema = 'public' and table_name in (${names}) and data_type in ('uuid', 'text', 'character varying')`).split('|');
  return { fkColumns: Number(fk[0]), verseColumns: Number(vs[0]), rows: Number(fk[1]) + Number(vs[1]) };
}

interface Account { id: string; username: string; email: string; password: string; quizIds: string[] }
const made: Account[] = [];
const results: Record<string, number | string> = {};

async function makeAccount(tag: string, other?: Account): Promise<Account> {
  const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
  const username = `o1b7_${tag}_${randomBytes(3).toString('hex')}`;
  const email = `${username}@o1-b7.invalid`;
  const password = randomBytes(18).toString('base64url');
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) throw new Error('createUser failed');
  const id = data.user.id;
  const acc: Account = { id, username, email, password, quizIds: [] };
  made.push(acc);
  sql(`insert into public.profiles (id, username, display_name, bio) values ('${id}', '${username}', '${username}', '') on conflict (id) do nothing;
       insert into public.world_memberships (user_id, site_id) values ('${id}', 'kpop') on conflict do nothing;`);
  const slug = username.replace(/_/g, '-');
  const gid = sql(`select min(id) from public.groups where site_id = 'kpop'`);
  acc.quizIds = sql(`insert into public.quizzes (creator_id, group_id, title, slug, questions, status, question_count)
    select '${id}', ${gid}, 'o1b7 quiz ' || s, '${slug}-' || s, '[{},{},{}]'::jsonb, 'published', 3 from unnest(array['a', 'b']) s returning id`).split('\n').filter(Boolean);
  sql(`insert into public.plays (quiz_id, player_id, score, total_questions) select id, '${id}', 3, 5 from public.quizzes where creator_id = '${id}'`);
  sql(`insert into public.user_badges (user_id, badge_id) select '${id}', (select id from public.badge_definitions where site_id = 'kpop' order by id limit 1)
       where exists (select 1 from public.badge_definitions where site_id = 'kpop')`);
  if (other) {
    sql(`insert into public.follows (follower_id, followed_id) values ('${other.id}', '${id}'), ('${id}', '${other.id}') on conflict do nothing;
         insert into public.plays (quiz_id, player_id, score, total_questions) select id, '${other.id}', 4, 5 from public.quizzes where creator_id = '${id}'`);
  }
  return acc;
}

/** Signs in with the password (a fresh sign-in) and gives the browser the cookies @supabase/ssr would have set. */
async function signIn(context: BrowserContext, acc: Account): Promise<void> {
  const jar: Array<{ name: string; value: string }> = [];
  const supabase = createServerClient(SB_URL, ANON, {
    cookies: {
      getAll: () => jar,
      setAll: (cs) => { for (const c of cs) { const i = jar.findIndex((j) => j.name === c.name); if (i >= 0) jar.splice(i, 1); if (c.value) jar.push({ name: c.name, value: c.value }); } },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({ email: acc.email, password: acc.password });
  if (error) throw new Error('sign-in failed');
  await context.clearCookies();
  await context.addCookies(jar.map((c) => ({ name: c.name, value: c.value, url: KPOP, httpOnly: false, sameSite: 'Lax' as const })));
}

async function openDeleteSheet(page: Page, username: string): Promise<void> {
  await page.goto(`${KPOP}/settings`);
  await expect(page.getByRole('heading', { name: 'Account' })).toBeVisible({ timeout: 90_000 });
  await expect(page.getByText('Delete account', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByText('Delete your account?')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Keep my account' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Delete my account' })).toBeDisabled();
  await dialog.getByLabel(`Type @${username} to confirm`).fill(`@${username}`);
}

const counts = (acc: Account) => ({
  quizzes: num(`select count(*) from public.quizzes where id in (${acc.quizIds.map((q) => `'${q}'`).join(',')})`),
  quizzesOwnedBySentinel: num(`select count(*) from public.quizzes where id in (${acc.quizIds.map((q) => `'${q}'`).join(',')}) and creator_id = '${SENTINEL}'`),
  plays: num(`select count(*) from public.plays where quiz_id in (${acc.quizIds.map((q) => `'${q}'`).join(',')})`),
  authUser: num(`select count(*) from auth.users where id = '${acc.id}'`),
  profile: num(`select count(*) from public.profiles where id = '${acc.id}'`),
  badges: num(`select count(*) from public.user_badges where user_id = '${acc.id}'`),
  follows: num(`select count(*) from public.follows where follower_id = '${acc.id}' or followed_id = '${acc.id}'`),
});

test.afterAll(async () => {
  try {
    const ids = made.map((a) => `'${a.id}'`).join(',');
    const slugs = made.map((a) => `'${a.username.replace(/_/g, '-')}-%'`).join(',');
    if (ids) {
      sql(`delete from public.quizzes where slug like any (array[${slugs}]);`);
      const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false } });
      for (const a of made) await admin.auth.admin.deleteUser(a.id).catch(() => undefined);
      sql(`delete from passport.deletion_requests where user_id in (${ids});
           delete from passport.deletion_log where subject_hash in (select encode(sha256(convert_to('o1-del:' || u, 'UTF8')), 'hex') from unnest(array[${ids}]) u);`);
      results.testAccountsLeft = num(`select count(*) from auth.users where email like '%@o1-b7.invalid'`);
      results.testQuizzesLeft = num(`select count(*) from public.quizzes where slug like 'o1b7-%'`);
    }
  } finally {
    if (SINK && existsSync(SINK)) rmSync(SINK);
    if (REPORT) {
      mkdirSync(path.dirname(REPORT), { recursive: true });
      const lines = Object.entries(results).map(([k, v]) => `| ${k} | ${v} |`);
      writeFileSync(REPORT, `# B7 kpop deletion on o1-dev: numbers only\n\nGenerated by apps/quiz/e2e/o1/B7/kpop-deletion.o1.ts (${new Date().toISOString().slice(0, 10)}). No address, key, link or id.\n\n| measure | value |\n|---|---|\n${lines.join('\n')}\n`);
    }
  }
});

test('request, mail, cancel, request again, cron: the account is gone, the quizzes stay under the dead sentinel', async ({ page, context }) => {
  test.setTimeout(600_000);
  const b = await makeAccount('b');
  const a = await makeAccount('a', b);
  const before = counts(a);
  const bBefore = counts(b);
  results['a.quizzes before'] = before.quizzes;
  results['a.plays on its quizzes before'] = before.plays;
  results['a.badges before'] = before.badges;
  results['a.follow rows before'] = before.follows;
  expect(before.quizzes).toBe(2);
  expect(before.follows).toBe(2);

  // (1) request from kpop Settings, flag on
  await signIn(context, a);
  await openDeleteSheet(page, a.username);
  const dialog = page.getByRole('alertdialog');
  await expect(dialog.getByRole('switch', { name: 'Also remove my published quizzes' })).toHaveAttribute('aria-checked', 'false');
  const t0 = Date.now();
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect.poll(() => num(`select count(*) from passport.deletion_requests where user_id = '${a.id}' and cancelled_at is null and completed_at is null`), { timeout: 60_000 }).toBe(1);
  const req = sql(`select keep_quizzes::int || '|' || requested_from || '|' || round(extract(epoch from run_after - requested_at) / 86400)::int from passport.deletion_requests where user_id = '${a.id}'`).split('|');
  results['request: keep_quizzes (1 = kept)'] = Number(req[0]);
  results['request: asked from kpop (1 = yes)'] = req[1] === 'kpop' ? 1 : 0;
  results['request: days to run_after'] = Number(req[2]);
  expect(req).toEqual(['1', 'kpop', '7']);
  await expect(page).toHaveURL(`${KPOP}/`, { timeout: 30_000 });
  const me = await page.request.get(`${KPOP}/api/passport/delete`);
  results['signed out everywhere: status read after the request (401 expected)'] = me.status();
  expect(me.status()).toBe(401);
  results['nothing deleted by the request: quizzes'] = counts(a).quizzes;
  expect(counts(a)).toEqual(before);

  // (2) the mail
  await expect.poll(() => (existsSync(SINK) ? readFileSync(SINK, 'utf8').trim().split('\n').length : 0), { timeout: 30_000 }).toBe(1);
  const mail = JSON.parse(readFileSync(SINK, 'utf8').trim().split('\n')[0]!) as { subject: string; date: string; site: string; html: string };
  const want = new Date(t0 + 7 * 86_400_000).toISOString().slice(0, 10);
  results['mail: count'] = 1;
  results['mail: subject is the kpop one (1 = yes)'] = mail.subject === 'Your KpopQuiz passport will be deleted' ? 1 : 0;
  results['mail: date is today + 7 days (1 = yes)'] = mail.date === want ? 1 : 0;
  results['mail: cancel link is the kpop settings page (1 = yes)'] = /\/settings"/.test(mail.html) && !/bunnyverse/.test(mail.html.replace(/Bunnyverse is the home[^<]*/, '')) ? 1 : 0;
  expect(mail.subject).toBe('Your KpopQuiz passport will be deleted');
  expect(mail.date).toBe(want);
  expect(mail.site).toBe('kpop');

  // (3) sign in, cancel
  await signIn(context, a);
  await page.goto(`${KPOP}/settings`);
  await expect(page.getByText(`Deletion scheduled for ${want}.`)).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: 'Cancel deletion' }).click();
  await expect(page.getByText('Delete account', { exact: true })).toBeVisible();
  await expect.poll(() => num(`select count(*) from passport.deletion_requests where user_id = '${a.id}' and cancelled_at is not null`)).toBe(1);
  results['cancel: requests still pending'] = num(`select count(*) from passport.deletion_requests where user_id = '${a.id}' and cancelled_at is null and completed_at is null`);
  results['cancel: rows changed in the account (0 expected)'] = JSON.stringify(counts(a)) === JSON.stringify(before) ? 0 : 1;
  expect(counts(a)).toEqual(before);
  const dueWhileCancelled = await fetch(`${HUB}/api/cron/passport-deletions`, { headers: { authorization: `Bearer ${CRON}` } });
  results['cancel: cron answer while cancelled (200)'] = dueWhileCancelled.status;

  // (4) request again, make it due (o1-dev only), call the cron route as the scheduler does
  await openDeleteSheet(page, a.username);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete my account' }).click();
  await expect.poll(() => num(`select count(*) from passport.deletion_requests where user_id = '${a.id}' and cancelled_at is null`), { timeout: 60_000 }).toBe(1);
  sql(`update passport.deletion_requests set run_after = now() - interval '1 minute' where user_id = '${a.id}'`);
  const dueBefore = num(`select count(*) from passport.deletion_requests where cancelled_at is null and completed_at is null and run_after <= now()`);
  results['cron: requests due before the call'] = dueBefore;
  const cron = await fetch(`${HUB}/api/cron/passport-deletions`, { headers: { authorization: `Bearer ${CRON}` } });
  const out = (await cron.json()) as { processed?: number; failed?: number };
  results['cron: status'] = cron.status;
  results['cron: processed'] = out.processed ?? -1;
  results['cron: failed'] = out.failed ?? -1;
  expect(cron.status).toBe(200);
  expect(out).toEqual({ processed: dueBefore, failed: 0 });

  const after = counts(a);
  const left = rowsLeft(a.id);
  results['after: auth user rows'] = after.authUser;
  results['after: profile rows'] = after.profile;
  results['after: quizzes kept'] = after.quizzes;
  results['after: quizzes owned by the dead sentinel'] = after.quizzesOwnedBySentinel;
  results['after: plays kept on those quizzes'] = after.plays;
  results['after: badges rows of the account'] = after.badges;
  results['after: follow rows of the account'] = after.follows;
  results['after: foreign-key columns scanned (profiles, auth.users)'] = left.fkColumns;
  results['after: Verse columns scanned'] = left.verseColumns;
  results['after: rows still carrying the account id'] = left.rows;
  expect(after).toMatchObject({ authUser: 0, profile: 0, quizzes: 2, quizzesOwnedBySentinel: 2, plays: before.plays, badges: 0, follows: 0 });
  expect(left.rows).toBe(0);
  results['after: request rows of the account'] = num(`select count(*) from passport.deletion_requests where user_id = '${a.id}'`);

  // the second account is untouched
  const bAfter = counts(b);
  const bChanged = Object.keys(bAfter).filter((k) => k !== 'follows' && (bAfter as Record<string, number>)[k] !== (bBefore as Record<string, number>)[k]).length;
  results['second account: measures that changed (0 expected)'] = bChanged;
  expect({ ...bAfter, follows: 0 }).toEqual({ ...bBefore, follows: 0 });
  await signIn(context, b);
  results['second account: still signs in (1 = yes)'] = 1;
});

test('"also remove my published quizzes": the quizzes go with the account', async ({ page, context }) => {
  test.setTimeout(600_000);
  const c = await makeAccount('c');
  const before = counts(c);
  await signIn(context, c);
  await openDeleteSheet(page, c.username);
  const dialog = page.getByRole('alertdialog');
  await dialog.getByRole('switch', { name: 'Also remove my published quizzes' }).click();
  await expect(dialog.getByRole('switch', { name: 'Also remove my published quizzes' })).toHaveAttribute('aria-checked', 'true');
  await dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect.poll(() => num(`select count(*) from passport.deletion_requests where user_id = '${c.id}' and cancelled_at is null`), { timeout: 60_000 }).toBe(1);
  results['remove variant: keep_quizzes stored (0 = remove)'] = num(`select keep_quizzes::int from passport.deletion_requests where user_id = '${c.id}'`);
  sql(`update passport.deletion_requests set run_after = now() - interval '1 minute' where user_id = '${c.id}'`);
  const cron = await fetch(`${HUB}/api/cron/passport-deletions`, { headers: { authorization: `Bearer ${CRON}` } });
  const out = (await cron.json()) as { processed?: number; failed?: number };
  results['remove variant: cron processed'] = out.processed ?? -1;
  results['remove variant: cron failed'] = out.failed ?? -1;
  const after = counts(c);
  results['remove variant: quizzes before'] = before.quizzes;
  results['remove variant: quizzes after'] = after.quizzes;
  results['remove variant: plays on them after'] = after.plays;
  results['remove variant: auth user rows after'] = after.authUser;
  results['remove variant: rows still carrying the account id'] = rowsLeft(c.id).rows;
  expect(out).toEqual({ processed: 1, failed: 0 });
  expect(after).toMatchObject({ authUser: 0, profile: 0, quizzes: 0, quizzesOwnedBySentinel: 0, plays: 0 });
});

test('a wrong confirmation and a stale sign-in are refused by the page and the route', async ({ page, context }) => {
  test.setTimeout(300_000);
  const d = await makeAccount('d');
  await signIn(context, d);
  await openDeleteSheet(page, d.username);
  const dialog = page.getByRole('alertdialog');
  await dialog.getByLabel(`Type @${d.username} to confirm`).fill(`@${d.username}x`);
  await expect(dialog.getByRole('button', { name: 'Delete my account' })).toBeDisabled();
  const wrong = await page.request.post(`${KPOP}/api/passport/delete`, { data: { keepQuizzes: true, confirm: `@${d.username}x` }, headers: { origin: KPOP } });
  results['wrong confirm: route status (400)'] = wrong.status();
  expect(wrong.status()).toBe(400);
  // a sign-in older than 10 minutes: make last_sign_in_at old on o1-dev
  sql(`update auth.users set last_sign_in_at = now() - interval '20 minutes' where id = '${d.id}'`);
  await page.reload();
  await openDeleteSheet(page, d.username);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Delete my account' }).click();
  await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText('sign in again');
  await expect(page.getByRole('alertdialog').getByRole('button', { name: 'Sign in again' })).toBeVisible();
  results['stale sign-in: requests created (0 expected)'] = num(`select count(*) from passport.deletion_requests where user_id = '${d.id}'`);
  expect(num(`select count(*) from passport.deletion_requests where user_id = '${d.id}'`)).toBe(0);
});
