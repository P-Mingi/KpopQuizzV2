// KpopCards launch (owner, 2026-11-23): proof of docs/pending-migrations/cards/127n-kpopcards-launch-notice.sql and its rollback on PGlite, with
// stand-ins for the production tables it reads (profiles, auth.users, sites, world_memberships, notification_prefs) and the real notification
// gate of supabase/migrations/122_notification_foundation.sql. One row per account, in the bell of its own site, never twice; Announcements off
// and banned accounts get none; the rollback takes back these rows only.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { describe, expect, it, vi } from 'vitest';

import { CARDS_SQL, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const UP = '127n-kpopcards-launch-notice.sql';
const DOWN = '127n-kpopcards-launch-notice.rollback.sql';
const rd = (f: string): string => readFileSync(path.join(CARDS_SQL, f), 'utf8');
const TITLE = 'KpopCards is here! Collect all your fave idols <3';
const LINK_K = '/auth/passport/out?to=hub&next=%2Fkpopcards&via=k.pp';
const LINK_A = '/auth/passport/out?to=hub&next=%2Fkpopcards&via=a.pp';
const DASH = new RegExp(`[${String.fromCharCode(0x2013)}${String.fromCharCode(0x2014)}]`);

/** The gate of 122, taken from the migration itself: the function and its BEFORE INSERT trigger. */
function gate122(): string {
  const src = readFileSync(path.join(CARDS_SQL, '../../../supabase/migrations/122_notification_foundation.sql'), 'utf8');
  const a = src.indexOf('CREATE OR REPLACE FUNCTION public.gate_notification_prefs()');
  const b = src.indexOf('FOR EACH ROW EXECUTE FUNCTION public.gate_notification_prefs();');
  expect(a).toBeGreaterThan(0);
  expect(b).toBeGreaterThan(a);
  return src.slice(a, b + 'FOR EACH ROW EXECUTE FUNCTION public.gate_notification_prefs();'.length);
}

const BASE = `
create schema auth;
create table auth.users (id uuid primary key);
create table public.sites (id text primary key);
insert into public.sites (id) values ('kpop'), ('anime'), ('hub');
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, username text not null, banned_at timestamptz);
create table public.world_memberships (user_id uuid not null references public.profiles(id) on delete cascade, site_id text not null references public.sites(id), primary key (user_id, site_id));
create table public.quizzes (id uuid primary key default gen_random_uuid());
create table public.creator_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  quiz_id uuid references public.quizzes(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  link_url text,
  sender_id uuid references auth.users(id) on delete set null,
  site_id text not null default 'kpop' references public.sites(id)
);
alter table public.creator_notifications add constraint creator_notifications_type_check check (type in (
  'milestone', 'rating', 'comment', 'admin_dm', 'new_follower', 'streak_milestone', 'group_mastered', 'followed_new_quiz', 'badge_earned', 'cheer'));
create unique index creator_notifications_dedup_idx on public.creator_notifications (user_id, quiz_id, type, title);
create table public.notification_prefs (user_id uuid primary key references auth.users(id) on delete cascade, categories jsonb not null default '{}'::jsonb,
  quiz_mutes uuid[] not null default '{}', updated_at timestamptz not null default now());
`;

const U = (n: number): string => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
/** The accounts: [id, username, memberships, banned, prefs]. */
const ACCOUNTS: ReadonlyArray<readonly [number, string, readonly string[], boolean, Record<string, boolean> | null]> = [
  [1, 'kpop_only', ['kpop'], false, null],
  [2, 'anime_only', ['anime'], false, null],
  [3, 'hub_only', ['hub'], false, null],
  [4, 'kpop_and_anime', ['anime', 'kpop'], false, null],
  [5, 'anime_and_hub', ['hub', 'anime'], false, null],
  [6, 'no_membership', [], false, null],
  [7, 'banned', ['kpop'], true, null],
  [8, 'announcements_off', ['kpop'], false, { announcements: false }],
  [9, 'social_off', ['kpop'], false, { social: false }],
];

async function world(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(BASE);
  await db.exec(gate122());
  for (const [n, name, sites, banned, prefs] of ACCOUNTS) {
    await db.query('insert into auth.users (id) values ($1)', [U(n)]);
    await db.query('insert into public.profiles (id, username, banned_at) values ($1, $2, $3)', [U(n), name, banned ? '2026-11-01T00:00:00Z' : null]);
    for (const s of sites) await db.query('insert into public.world_memberships (user_id, site_id) values ($1, $2)', [U(n), s]);
    if (prefs) await db.query('insert into public.notification_prefs (user_id, categories) values ($1, $2)', [U(n), JSON.stringify(prefs)]);
  }
  // An auth user who never made a profile: not an account yet.
  await db.query('insert into auth.users (id) values ($1)', [U(99)]);
  // Notifications already there: another admin message, a follower, and the same title sent by hand by the admin (account 9 has it already).
  await db.query(`insert into public.creator_notifications (user_id, type, title, site_id) values ($1, 'admin_dm', 'Join the Discord', 'kpop'), ($1, 'new_follower', 'x followed you', 'kpop')`, [U(1)]);
  await db.query(`insert into public.creator_notifications (user_id, type, title, sender_id, site_id) values ($1, 'admin_dm', $2, $3, 'kpop')`, [U(9), TITLE, U(1)]);
  return db;
}

async function run(db: PGlite, sql: string): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(sql, { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}

const sent = (db: PGlite) => rows<{ username: string; site_id: string; link_url: string; body: string; sender_id: string | null; is_read: boolean }>(db,
  `select p.username, n.site_id, n.link_url, n.body, n.sender_id, n.is_read from public.creator_notifications n join public.profiles p on p.id = n.user_id
    where n.type = 'admin_dm' and n.title = $1 and n.sender_id is null order by p.username`, [TITLE]);

describe('127n-kpopcards-launch-notice.sql: the files', () => {
  it.each([[UP, 'c127'], [DOWN, 'c127r']])('%s is one DO block with its header, no dash, no temp table, every delete with its where', (file, tag) => {
    const sql = rd(file);
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
    expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
    expect(sql).toMatch(/^-- Verify: /m);
    expect(sql).toContain('-- When:   any time except 23:50 to 00:30 UTC.');
    for (const k of ['What:', 'Why:', 'Rows:']) expect(sql).toContain(`-- ${k}`);
    expect(sql).not.toMatch(DASH);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).not.toMatch(/\bupdate\s+public\./i);
    for (const st of code.split(';').map((x) => x.replace(/--.*$/gm, '').trim()).filter((x) => /^(update|delete)\b/i.test(x))) expect(st, st.slice(0, 60)).toMatch(/\bwhere\b/i);
  });
  it('the links are the ones the code builds: the signed-in jump from kpopquiz.org and OtakuQuiz, the plain path on Bunnyverse', async () => {
    const { cardsHref, CARDS_PATH } = await import('../cards-bridge/links');
    expect(cardsHref(CARDS_PATH, { id: 'kpop', letter: 'k' })).toBe(LINK_K);
    expect(cardsHref(CARDS_PATH, { id: 'anime', letter: 'a' })).toBe(LINK_A);
    expect(cardsHref(CARDS_PATH, { id: 'hub', letter: 'f' })).toBe('/kpopcards');
    for (const l of [LINK_K, LINK_A, "'/kpopcards'"]) expect(rd(UP)).toContain(l);
  });
  it('the title fits the admin message rule (2 to 80 characters) and the body its 500', () => {
    expect(TITLE.length).toBeLessThanOrEqual(80);
    expect(rd(UP)).toContain(`v_title constant text := '${TITLE}';`);
  });
});

describe('127n-kpopcards-launch-notice.sql: on the tables production has', () => {
  it('one notification per account, in the bell of its own site, unread, no sender; none for a banned account, Announcements off, or no profile', async () => {
    const db = await world();
    const notices = await run(db, rd(UP));
    expect(notices).toEqual(['127n-kpopcards-launch-notice: sent 6 of 8 accounts; in the bells now: kpopquiz.org 4, OtakuQuiz 2, Bunnyverse 1; 1 with Announcements off got none']);
    const got = await sent(db);
    expect(got.map((r) => [r.username, r.site_id, r.link_url])).toEqual([
      ['anime_and_hub', 'anime', LINK_A],
      ['anime_only', 'anime', LINK_A],
      ['hub_only', 'hub', '/kpopcards'],
      ['kpop_and_anime', 'kpop', LINK_K],
      ['kpop_only', 'kpop', LINK_K],
      ['no_membership', 'kpop', LINK_K],
    ]);
    expect(got.every((r) => r.is_read === false && r.sender_id === null && r.body === 'Free K-pop photocards on Bunnyverse. Open free packs and build your collection.')).toBe(true);
    // Account 9 already had the same title from the admin: not sent twice. Nobody holds it twice.
    expect(await one(db, `select count(*)::int from public.creator_notifications where type = 'admin_dm' and title = $1 and user_id = $2`, [TITLE, U(9)])).toBe(1);
    expect(await one(db, `select count(*)::int from (select user_id from public.creator_notifications where type = 'admin_dm' and title = $1 group by user_id having count(*) > 1) d`, [TITLE])).toBe(0);
    // Nothing else moved.
    expect(await one(db, `select count(*)::int from public.creator_notifications where title <> $1`, [TITLE])).toBe(2);
  });

  it('a second run inserts nothing', async () => {
    const db = await world();
    await run(db, rd(UP));
    const before = await one(db, 'select count(*)::int from public.creator_notifications');
    expect(await run(db, rd(UP))).toEqual(['127n-kpopcards-launch-notice: already sent (7 rows), nothing inserted']);
    expect(await one(db, 'select count(*)::int from public.creator_notifications')).toBe(before);
  });

  it('a missing prerequisite stops it before any insert', async () => {
    const db = await world();
    await db.exec('drop table public.world_memberships');
    await expect(run(db, rd(UP))).rejects.toThrow(/world_memberships is missing/);
    expect(await one(db, `select count(*)::int from public.creator_notifications where title = $1 and sender_id is null`, [TITLE])).toBe(0);
    const old = await world();
    await old.exec(`alter table public.creator_notifications drop constraint creator_notifications_type_check;
      alter table public.creator_notifications add constraint creator_notifications_type_check check (type in ('milestone', 'rating', 'comment')) not valid`);
    await expect(run(old, rd(UP))).rejects.toThrow(/admin_dm is not allowed/);
  });

  it('the rollback deletes these rows only (the admin message sent by hand with the same title stays), and twice is harmless', async () => {
    const db = await world();
    await run(db, rd(UP));
    await db.query('update public.creator_notifications set is_read = true where user_id = $1 and title = $2', [U(1), TITLE]);
    expect(await run(db, rd(DOWN))).toEqual(['127n-kpopcards-launch-notice.rollback: 6 notifications deleted']);
    expect(await sent(db)).toEqual([]);
    expect(await one(db, `select count(*)::int from public.creator_notifications where title = $1 and sender_id = $2`, [TITLE, U(1)])).toBe(1);
    expect(await one(db, 'select count(*)::int from public.creator_notifications')).toBe(3);
    expect(await run(db, rd(DOWN))).toEqual(['127n-kpopcards-launch-notice.rollback: 0 notifications deleted']);
  });
});
