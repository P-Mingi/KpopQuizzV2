// Run O1, lot E1b: SQL 025, the group quiz alerts on every publication, played on PGlite (a throwaway Postgres in WebAssembly)
// with the real files: the function body of 008-write-locks.sql, then 025-quiz-alerts-every-publish.sql, then its rollback. The
// stand-in tables hold the columns, keys and triggers the function reads and writes (production's definitions of
// docs/strategy/o1/prod-schema). The whole chain 001 to 008 on a real Postgres 18 cluster is rehearsed by
// apps/quiz/e2e/o1/E1b/alerts-rehearsal.sh.
import { readFileSync } from 'node:fs';

import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { MIGRATIONS, failure, one, readMigration, rows } from '@/lib/dle/pglite-harness';

const UP = '025-quiz-alerts-every-publish.sql';
const DOWN = '025-quiz-alerts-every-publish.rollback.sql';

/** The body 008 gives notify_group_quiz_alerts: from its comment line to the closing $function$; */
function body008(): string {
  const s = readMigration('008-write-locks.sql');
  const i = s.indexOf('-- notify_group_quiz_alerts\n\nCREATE OR REPLACE FUNCTION public.notify_group_quiz_alerts()');
  const start = s.indexOf('CREATE OR REPLACE FUNCTION', i);
  const end = s.indexOf('$function$;', s.indexOf('AS $function$', start)) + '$function$;'.length;
  return s.slice(start, end);
}

const STAND_IN = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create table public.groups (id serial primary key, name text not null, slug text not null unique, site_id text not null default 'kpop');
create table public.quizzes (
  id uuid primary key default gen_random_uuid(), creator_id uuid not null, group_id integer not null references public.groups(id),
  title text not null, slug text not null unique, status text not null default 'published', site_id text not null default 'kpop'
);
create table public.group_quiz_alerts (
  user_id uuid not null, group_id integer not null references public.groups(id), created_at timestamptz not null default now(), notified_at timestamptz,
  primary key (user_id, group_id)
);
create index group_quiz_alerts_pending_idx on public.group_quiz_alerts (group_id) where notified_at is null;
create table public.creator_notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, type text not null, title text not null, body text, quiz_id uuid,
  is_read boolean not null default false, created_at timestamptz not null default now(), link_url text, site_id text not null default 'kpop'
);
create unique index creator_notifications_dedup_idx on public.creator_notifications (user_id, quiz_id, type, title);
create table public.notification_prefs (user_id uuid primary key, categories jsonb not null default '{}'::jsonb);
create function public.gate_notification_prefs() returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.notification_prefs p where p.user_id = new.user_id and p.categories ->> 'following' = 'false') then return null; end if;
  return new;
end $$;
create trigger trg_gate_notification_prefs before insert on public.creator_notifications for each row execute function public.gate_notification_prefs();
`;

const TRIGGERS = `
create trigger group_quiz_alerts_on_insert after insert on public.quizzes for each row when (new.status = 'published') execute function public.notify_group_quiz_alerts();
create trigger group_quiz_alerts_on_publish after update of status on public.quizzes for each row when (new.status = 'published' and old.status is distinct from 'published') execute function public.notify_group_quiz_alerts();
`;

const TEAM = '00000000-0000-4000-8000-0000000000a3';
const S1 = '00000000-0000-4000-8000-0000000000a1';
const S2 = '00000000-0000-4000-8000-0000000000a2';
const S3 = '00000000-0000-4000-8000-0000000000a5';
const OTHER = '00000000-0000-4000-8000-0000000000a4';

let db: PGlite;

async function publish(slug: string, group = 1): Promise<void> {
  await db.query('insert into public.quizzes (creator_id, group_id, title, slug) values ($1, $2, $3, $4)', [TEAM, group, `Title of ${slug}`, slug]);
}
const who = async (slug: string): Promise<string> => one<string>(db, `select coalesce(string_agg(n.user_id::text, ',' order by n.user_id), '') from public.creator_notifications n join public.quizzes z on z.id = n.quiz_id where z.slug = $1`, [slug]);
const count = async (slug: string): Promise<number> => Number(await one(db, `select count(*) from public.creator_notifications n join public.quizzes z on z.id = n.quiz_id where z.slug = $1`, [slug]));

beforeAll(async () => {
  db = new PGlite();
  await db.exec(STAND_IN);
  await db.exec(body008());
  await db.exec(TRIGGERS);
});
afterAll(async () => { await db.close(); });

// One database for the file: every test starts from the same rows, 008's function and no 025 index.
beforeEach(async () => {
  await db.exec(`
    truncate public.quizzes, public.group_quiz_alerts, public.creator_notifications, public.notification_prefs, public.groups restart identity cascade;
    drop index if exists public.group_quiz_alerts_group_idx;
    alter table public.creator_notifications drop constraint if exists e1b_fail;
  `);
  await db.exec(body008());
  await db.exec(`
    insert into public.groups (name, slug) values ('Alpha', 'alpha'), ('Beta', 'beta');
    insert into public.group_quiz_alerts (user_id, group_id) values ('${S1}', 1), ('${S2}', 1), ('${TEAM}', 1), ('${OTHER}', 2);
  `);
});

describe('008 as it is: one-shot (the baseline the test stands on)', () => {
  it('the first quiz notifies the subscribers, the second nobody', async () => {
    await publish('one');
    await publish('two');
    expect(await who('one')).toBe(`${S1},${S2}`);
    expect(await count('two')).toBe(0);
  });
});

describe('025: every subscriber, on every publication', () => {
  beforeEach(async () => { await db.exec(readMigration(UP)); });

  it('applies twice with nothing changed', async () => {
    const before = await one<string>(db, `select md5(prosrc) from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure`);
    await db.exec(readMigration(UP));
    expect(await one(db, `select md5(prosrc) from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure`)).toBe(before);
    expect(await one(db, `select count(*) from pg_indexes where indexname = 'group_quiz_alerts_group_idx'`)).toBe(1);
  });

  it('every quiz of the group notifies every subscriber again, the creator excluded', async () => {
    await publish('one');
    await publish('two');
    await publish('three');
    for (const slug of ['one', 'two', 'three']) expect(await who(slug), slug).toBe(`${S1},${S2}`);
  });

  it('notified_at is the last notification: moved forward for the notified, left alone for the creator', async () => {
    await db.exec(`update public.group_quiz_alerts set notified_at = '2026-01-01T00:00:00Z'`);
    await publish('one');
    const r = await rows<{ user_id: string; moved: boolean }>(db, `select user_id, notified_at > '2026-01-01T00:00:00Z' as moved from public.group_quiz_alerts where group_id = 1 order by user_id`);
    expect(r).toEqual([{ user_id: S1, moved: true }, { user_id: S2, moved: true }, { user_id: TEAM, moved: false }]);
    expect(await one(db, `select notified_at = '2026-01-01T00:00:00Z' from public.group_quiz_alerts where user_id = '${OTHER}'`)).toBe(true); // another group: untouched
  });

  it('a quiz of another group notifies that group only', async () => {
    await publish('beta-one', 2);
    expect(await who('beta-one')).toBe(OTHER);
  });

  it('a subscriber who joined later is told by the next quiz; a group with nobody inserts nothing', async () => {
    await publish('one');
    await db.query('insert into public.group_quiz_alerts (user_id, group_id) values ($1, 1)', [S3]);
    await publish('two');
    expect(await who('two')).toBe(`${S1},${S2},${S3}`);
    await db.exec(`insert into public.groups (name, slug) values ('Gamma', 'gamma')`);
    await publish('gamma-one', 3);
    expect(await count('gamma-one')).toBe(0);
  });

  it('published again after a flag: no duplicate, and the subscriber who joined meanwhile is told', async () => {
    await publish('one');
    await db.exec(`update public.quizzes set status = 'flagged' where slug = 'one'`);
    await db.query('insert into public.group_quiz_alerts (user_id, group_id) values ($1, 1)', [S3]);
    await db.exec(`update public.quizzes set status = 'published' where slug = 'one'`);
    expect(await who('one')).toBe(`${S1},${S2},${S3}`);
    expect(await one(db, `select count(*) from (select user_id, quiz_id from public.creator_notifications group by 1, 2 having count(*) > 1) d`)).toBe(0);
  });

  it('a draft published later by an update notifies; a draft alone does not', async () => {
    await db.query(`insert into public.quizzes (creator_id, group_id, title, slug, status) values ($1, 1, 'Draft title', 'draft-one', 'draft')`, [TEAM]);
    expect(await count('draft-one')).toBe(0);
    await db.exec(`update public.quizzes set status = 'published' where slug = 'draft-one'`);
    expect(await who('draft-one')).toBe(`${S1},${S2}`);
  });

  it('a subscriber who turned "following" off gets nothing, the others still do', async () => {
    await db.query(`insert into public.notification_prefs (user_id, categories) values ($1, '{"following": false}')`, [S1]);
    await publish('one');
    expect(await who('one')).toBe(S2);
  });

  it('a failing notification insert never blocks the publish', async () => {
    await db.exec('alter table public.creator_notifications add constraint e1b_fail check (false) not valid');
    await publish('one');
    expect(await one(db, `select count(*) from public.quizzes where slug = 'one' and status = 'published'`)).toBe(1);
    expect(await count('one')).toBe(0);
  });

  it('the world branch writes the notification under the quiz site', async () => {
    await db.exec(`insert into public.groups (name, slug, site_id) values ('Series', 'series', 'anime')`);
    await db.query(`insert into public.group_quiz_alerts (user_id, group_id) values ($1, 3)`, [S1]);
    await db.query(`insert into public.quizzes (creator_id, group_id, title, slug, site_id) values ($1, 3, 'Anime quiz', 'anime-one', 'anime')`, [TEAM]);
    await db.query(`insert into public.quizzes (creator_id, group_id, title, slug, site_id) values ($1, 3, 'Anime quiz two', 'anime-two', 'anime')`, [TEAM]);
    expect(await rows(db, `select n.user_id, n.site_id from public.creator_notifications n join public.quizzes z on z.id = n.quiz_id where z.slug in ('anime-one', 'anime-two') order by z.slug`)).toEqual([
      { user_id: S1, site_id: 'anime' }, { user_id: S1, site_id: 'anime' },
    ]);
  });

  it('refuses to run before 008 (the body without the world branch)', async () => {
    const fresh = new PGlite();
    await fresh.exec(STAND_IN);
    await fresh.exec(body008().replace(/v_site/g, 'v_s'));
    expect(await failure(fresh, readMigration(UP))).toContain('apply 008-write-locks.sql first');
  });
});

describe('025 rollback', () => {
  it('puts 008 back byte for byte: the alert is one-shot again, and a second run changes nothing', async () => {
    const md5 = `select md5(prosrc) from pg_proc where oid = 'public.notify_group_quiz_alerts()'::regprocedure`;
    const before = await one<string>(db, md5);
    await db.exec(readMigration(UP));
    expect(await one<string>(db, md5)).not.toBe(before);
    await db.exec(readMigration(DOWN));
    expect(await one<string>(db, md5)).toBe(before);
    await db.exec(readMigration(DOWN));
    expect(await one<string>(db, md5)).toBe(before);
    expect(await one(db, `select to_regclass('public.group_quiz_alerts_group_idx') is null`)).toBe(true);
    await publish('one');
    await publish('two');
    expect(await count('two')).toBe(0);
  });
});

describe('the files', () => {
  const up = readFileSync(`${MIGRATIONS}/${UP}`, 'utf8');
  const down = readFileSync(`${MIGRATIONS}/${DOWN}`, 'utf8');

  it('have the header of the house style, o1-transaction single, and a rollback', () => {
    for (const k of ['-- What:', '-- Why:', '-- Rows:', '-- Needs:', '-- Verify:', '-- Undo:', '-- o1-transaction: single']) expect(up, k).toContain(k);
    for (const k of ['-- What:', '-- Why:', '-- Rows:', '-- Verify:', '-- Undo:', '-- o1-transaction: single']) expect(down, k).toContain(k);
    expect(up).toContain('Needs:  008-write-locks.sql');
  });

  it('no em dash, no en dash', () => {
    expect(up + down).not.toMatch(new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`));
  });

  it('008 is not touched by this lot: its body still holds the notified_at guard the rollback restores', () => {
    expect(body008()).toContain('notified_at is null');
    expect(down).toContain(body008().replace('-- notify_group_quiz_alerts\n', ''));
  });
});
