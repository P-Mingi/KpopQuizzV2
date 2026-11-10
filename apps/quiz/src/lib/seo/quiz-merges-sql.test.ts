// O1 audit 03 P1-9 (owner, 2026-11-09): L28 takes the merged K01 quiz out of publication, additively, and its rollback publishes it again
// without sending the group alerts. Run on PGlite with the production shape of the tables it touches and the production publish trigger
// (notify_group_quiz_alerts, read from production on 2026-11-09, kpop branch).
import { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import { readLaunchFile, verifyDiffs, verifyLines } from '@/lib/editorial/launch-verify';

import { QUIZ_MERGES } from './quiz-redirects';

vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

const UP = 'L28-l1-quiz-merges.sql';
const DOWN = 'L28-l1-quiz-merges.rollback.sql';
const LOSER = '00000000-0000-4000-8000-0000000000a1';
const KEPT = '00000000-0000-4000-8000-0000000000a2';

const SCHEMA = `
  create table public.groups (id int primary key, name text not null);
  create table public.quizzes (
    id uuid primary key, slug text unique not null, title text not null, status text not null default 'draft',
    site_id text not null default 'kpop', group_id int references public.groups(id), creator_id uuid,
    question_count int, play_count int not null default 0,
    constraint status_valid check (status = any (array['draft', 'published', 'flagged', 'removed']))
  );
  create table public.group_quiz_alerts (
    user_id uuid not null, group_id int not null references public.groups(id), created_at timestamptz not null default now(),
    notified_at timestamptz, primary key (user_id, group_id)
  );
  create table public.creator_notifications (
    id uuid primary key default gen_random_uuid(), user_id uuid not null, type text not null, title text not null, body text,
    quiz_id uuid references public.quizzes(id), is_read boolean not null default false, created_at timestamptz not null default now(),
    link_url text, site_id text not null default 'kpop'
  );
  create unique index creator_notifications_dedup_idx on public.creator_notifications (user_id, quiz_id, type, title);
  create function public.notify_group_quiz_alerts() returns trigger language plpgsql as $f$
  declare v_group text;
  begin
    begin
      select name into v_group from public.groups where id = new.group_id;
      if v_group is null then return new; end if;
      with sent as (
        insert into public.creator_notifications (user_id, type, title, body, quiz_id, link_url)
        select a.user_id, 'followed_new_quiz', 'A new ' || v_group || ' quiz is here', new.title, new.id, '/q/' || new.slug
          from public.group_quiz_alerts a
         where a.group_id = new.group_id and a.user_id is distinct from new.creator_id
           and coalesce(a.notified_at, '-infinity'::timestamptz) <= now() - interval '20 hours'
        on conflict do nothing
        returning user_id
      )
      update public.group_quiz_alerts g set notified_at = now() from sent s where g.group_id = new.group_id and g.user_id = s.user_id;
    exception when others then return new;
    end;
    return new;
  end $f$;
  create trigger group_quiz_alerts_on_publish after update of status on public.quizzes for each row
    when (new.status = 'published' and old.status is distinct from 'published') execute function public.notify_group_quiz_alerts();
  insert into public.groups values (7, 'ILLIT'), (9, 'BABYMONSTER');
  insert into public.quizzes (id, slug, title, status, group_id, question_count, play_count) values
    ('${LOSER}', 'this-is-only-for-true-gllits', 'This is only for ~true~ Gllits!', 'published', 7, 10, 50),
    ('${KEPT}', 'this-is-only-for-true-gllits-2', 'This is only for ~true~ Gllits!', 'published', 7, 10, 116),
    ('00000000-0000-4000-8000-0000000000a3', 'only-real-monstiez', 'ONLY REAL MONSTIEZ', 'flagged', 9, 5, 227),
    ('00000000-0000-4000-8000-0000000000a4', 'babymonster-quiz', 'BABYMONSTER quiz', 'published', 9, 15, 814);
  insert into public.group_quiz_alerts (user_id, group_id, notified_at) values
    ('00000000-0000-4000-8000-0000000000b1', 7, null),
    ('00000000-0000-4000-8000-0000000000b2', 7, '2026-11-01 10:00:00+00'),
    ('00000000-0000-4000-8000-0000000000b3', 9, null);
  insert into public.creator_notifications (user_id, type, title, quiz_id, created_at) values
    ('00000000-0000-4000-8000-0000000000b9', 'followed_new_quiz', 'A new ILLIT quiz is here', '${LOSER}', '2026-10-01 10:00:00+00');`;

describe('L28 on PGlite', () => {
  let db: PGlite;
  const snap = async (sql: string): Promise<string> => JSON.stringify((await db.query(sql)).rows);
  const quizzes = (): Promise<string> => snap('select id, slug, title, status, site_id, group_id, question_count, play_count from public.quizzes order by id');
  const alerts = (): Promise<string> => snap('select user_id, group_id, created_at, notified_at from public.group_quiz_alerts order by user_id');
  const notes = (): Promise<string> => snap('select user_id, type, title, quiz_id, created_at from public.creator_notifications order by created_at, user_id');
  const fails = async (sql: string): Promise<string | null> => { try { await db.exec(sql); return null; } catch (e) { return (e as Error).message; } };
  let before: { quizzes: string; alerts: string; notes: string };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(SCHEMA);
    before = { quizzes: await quizzes(), alerts: await alerts(), notes: await notes() };
  });

  it('is the K01 pair of the code (QUIZ_MERGES)', () => {
    expect(QUIZ_MERGES['this-is-only-for-true-gllits']).toBe('this-is-only-for-true-gllits-2');
    expect(readLaunchFile(UP)).toContain("'this-is-only-for-true-gllits'");
  });

  it('applies: the merged quiz is removed, its Verify lines hold, nothing else moves and nothing is sent', async () => {
    await db.exec(readLaunchFile(UP));
    expect(verifyLines(UP).length).toBe(4);
    expect(await verifyDiffs(db, UP)).toEqual([]);
    const want = JSON.parse(before.quizzes) as Array<{ slug: string; status: string }>;
    for (const q of want) if (q.slug === 'this-is-only-for-true-gllits') q.status = 'removed';
    expect(await quizzes()).toBe(JSON.stringify(want));
    expect(await alerts()).toBe(before.alerts);
    expect(await notes()).toBe(before.notes);
  });

  it('a second run changes nothing', async () => {
    const once = await quizzes();
    await db.exec(readLaunchFile(UP));
    expect(await quizzes()).toBe(once);
    expect(await verifyDiffs(db, UP)).toEqual([]);
  });

  it('the rollback publishes it again with no alert sent, the alerts end as they began, and it runs twice', async () => {
    await db.exec(readLaunchFile(DOWN));
    expect(verifyLines(DOWN).length).toBe(3);
    expect(await verifyDiffs(db, DOWN)).toEqual([]);
    expect(await quizzes()).toBe(before.quizzes);
    expect(await alerts()).toBe(before.alerts);
    expect(await notes()).toBe(before.notes);
    await db.exec(readLaunchFile(DOWN));
    expect(await quizzes()).toBe(before.quizzes);
  });

  it('control: without the stamp, the same publish would have notified the two ILLIT subscribers', async () => {
    await db.exec(`begin; update public.quizzes set status = 'removed' where id = '${LOSER}';
      update public.quizzes set status = 'published' where id = '${LOSER}';`);
    const sent = (await db.query<{ n: number }>(`select count(*)::int n from public.creator_notifications where created_at > now() - interval '1 minute'`)).rows[0]!.n;
    await db.exec('rollback;');
    expect(sent).toBe(2);
    expect(await notes()).toBe(before.notes);
  });

  it('refuses and writes nothing when the kept quiz is not published or the pair is not the K01 pair', async () => {
    await db.exec(`update public.quizzes set status = 'flagged' where id = '${KEPT}'`);
    expect(await fails(readLaunchFile(UP))).toMatch(/not published/);
    await db.exec(`update public.quizzes set status = 'published' where id = '${KEPT}'`);
    await db.exec(`update public.quizzes set question_count = 9 where id = '${KEPT}'`);
    expect(await fails(readLaunchFile(UP))).toMatch(/not the K01 pair/);
    await db.exec(`update public.quizzes set question_count = 10 where id = '${KEPT}'`);
    expect(await quizzes()).toBe(before.quizzes);
  });
});
