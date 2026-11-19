// L33 (lane SECAUDIT, lot LAUNCH-PREP): the security hardening file, as ONE do block with no temp table, on PGlite. Proves, on a stand-in
// of the production objects: anon cannot record a play for another player (and a guest still can), one like per user with a consistent
// count, the three views are left alone (and why security_invoker would break them), the triggers still fire after the revoke,
// the 30 flagged functions get a fixed search_path, and a second run changes nothing. Then the rollback.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { checkVerify } from './daily-bank/verify-lines';
import { failure, freshDb, MIGRATIONS, one, rows } from './dle/pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

const read = (f: string): string => readFileSync(path.join(MIGRATIONS, 'launch', f), 'utf8');
const UP = read('L33-l1-security-audit.sql');
const DOWN = read('L33-l1-security-audit.rollback.sql');

const U1 = '00000000-0000-0000-0000-000000000001';
const U2 = '00000000-0000-0000-0000-000000000002';
const CREATOR = '00000000-0000-0000-0000-0000000000c1';
const Q_KPOP = '00000000-0000-0000-0000-0000000000a1';
const Q_ANIME = '00000000-0000-0000-0000-0000000000a2';

/** Stand-in of the production objects the file touches (columns that the function bodies read or write). */
const STAND_IN = `
create table public.profiles (id uuid primary key, username text, banned_at timestamptz, total_plays_received int not null default 0,
  quizzes_played int not null default 0, total_likes_received int not null default 0, updated_at timestamptz default now());
alter table public.groups add column total_plays int not null default 0, add column quiz_count int not null default 0;
create table public.quizzes (id uuid primary key, site_id text, creator_id uuid, group_id int, play_count int not null default 0,
  total_score_sum int not null default 0, total_completions int not null default 0, like_count int not null default 0, updated_at timestamptz default now());
create table public.plays (id uuid primary key default gen_random_uuid(), quiz_id uuid not null, player_id uuid, score int not null,
  total_questions int not null, time_taken_seconds int, created_at timestamptz not null default now());
create table public.likes (id uuid primary key default gen_random_uuid(), user_id uuid not null, quiz_id uuid not null references public.quizzes(id) on delete cascade,
  created_at timestamptz not null default now(), unique (user_id, quiz_id));
create table public.player_group_mastery (player_id uuid, group_id int, songs_played int not null default 0, songs_correct int not null default 0,
  mastered boolean not null default false, updated_at timestamptz default now(), primary key (player_id, group_id));
create table public.activity_events (id serial primary key, event_type text, user_id uuid, display_name text, group_slug text, payload jsonb, site_id text);
create table public.world_counter_log (site text, user_id uuid, counter text, delta int);
create function public.emit_activity(p_event_type text, p_user_id uuid, p_group_slug text, p_payload jsonb) returns void language sql as
  $$ insert into public.activity_events (event_type, user_id, group_slug, payload) values (p_event_type, p_user_id, p_group_slug, p_payload) $$;
create function public.bump_world_counter(p_user uuid, p_site text, p_counter text, p_delta integer) returns integer language sql as
  $$ insert into public.world_counter_log values (p_site, p_user, p_counter, p_delta); select p_delta $$;

alter table public.plays enable row level security;
create policy plays_insert_all on public.plays for insert to public with check (true);
create policy plays_select_all on public.plays for select to public using (true);
alter table public.likes enable row level security;
create policy likes_select_all on public.likes for select to public using (true);
create policy likes_insert_own on public.likes for insert to public with check (auth.uid() = user_id);
create policy likes_delete_own on public.likes for delete to public using (auth.uid() = user_id);

-- the production record_play, as it is today (008-write-locks): the file replaces it
create function public.record_play(p_quiz_id uuid, p_player_id uuid, p_score integer, p_total_questions integer, p_time_taken_seconds integer)
  returns table(play_id uuid, percentile integer) language plpgsql security definer as $$
begin return query select 'old'::uuid, 0; end $$;

-- two flagged functions (no search_path today) and one that already has one
create function public.calc_player_level(xp integer) returns integer language sql as $$ select xp / 100 $$;
create function public.award_xp(p_user_id uuid, p_amount integer, p_reason text) returns integer language sql security definer as $$ select p_amount $$;
create function public.get_today_stats() returns integer language sql set search_path = 'public' as $$ select 1 $$;

-- trigger functions in the three shapes of production
create table public.t_events (id serial primary key, who uuid);
create table public.t_log (what text);
create function public.handle_t_event() returns trigger language plpgsql security definer as $$ begin insert into public.t_log values ('handle'); return new; end $$;
create function public.notify_t_event() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.t_log values ('notify'); return new; end $$;
create function public.grant_t_badge() returns trigger language plpgsql as $$ begin insert into public.t_log values ('grant'); return new; end $$;
create trigger t1 after insert on public.t_events for each row execute function public.handle_t_event();
create trigger t2 after insert on public.t_events for each row execute function public.notify_t_event();
create trigger t3 after insert on public.t_events for each row execute function public.grant_t_badge();

insert into public.profiles (id, username) values ('${U1}', 'one'), ('${U2}', 'two'), ('${CREATOR}', 'creator');
insert into public.groups (name, slug) values ('G1', 'g1');
insert into public.quizzes (id, site_id, creator_id, group_id, like_count) values ('${Q_KPOP}', 'kpop', '${CREATOR}', 1, 5), ('${Q_ANIME}', 'otaku', '${CREATOR}', 1, 0);
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
grant usage on all sequences in schema public to anon, authenticated;
`;

let db: PGlite;
const as = async (role: 'anon' | 'authenticated' | 'service_role', uid: string | null, sql: string): Promise<string | null> => {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false)`);
  try {
    return await failure(db, sql);
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`);
  }
};
const play = (quiz: string, player: string | null, score = 3, total = 5): string =>
  `select * from public.record_play('${quiz}', ${player ? `'${player}'` : 'null'}, ${score}, ${total}, 30)`;
const snapshot = async (d: PGlite): Promise<unknown> => ({
  fns: await rows(d, `select p.oid::regprocedure::text as sig, pg_get_functiondef(p.oid) as def, p.proconfig, p.proacl::text from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1`),
  pol: await rows(d, `select tablename, policyname, cmd, with_check from pg_policies where schemaname = 'public' order by 1, 2`),
  trg: await rows(d, `select tgname from pg_trigger where not tgisinternal order by 1`),
});

beforeAll(async () => {
  db = await freshDb([]);
  await db.exec(STAND_IN);
}, 240_000);

describe('L33 security audit SQL', { timeout: 120_000 }, () => {
  it('is one do block: no temp table, no bare statement outside it, lock_timeout set inside, no dash', () => {
    for (const sql of [UP, DOWN]) {
      const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
      expect(code.startsWith('do $op$')).toBe(true);
      expect(code.endsWith('end $op$;')).toBe(true);
      expect(code.match(/\bdo \$op\$/g)).toHaveLength(1);
      expect(code).not.toMatch(/temp(orary)?\s+table/i);
      expect(code).toContain("set_config('lock_timeout', '5s', true)");
      expect(sql).not.toMatch(/[\u2013\u2014]/);
    }
  });

  it('before the file: anyone can record a play for another player, and count a like twice', async () => {
    // the stand-in record_play is a stub; the open door is the plays policy and the like functions
    expect(await as('anon', null, `insert into public.plays (quiz_id, player_id, score, total_questions) values ('${Q_KPOP}', '${U2}', 5, 5)`)).toBeNull();
    await db.exec(`delete from public.plays`);
    expect(await one(db, `select has_function_privilege('anon', 'public.increment_like_count(uuid)'::regprocedure, 'EXECUTE')`).catch(() => 'absent')).toBe('absent');
    // the production like functions (008-write-locks), so the file replaces something real
    await db.exec(`
      create function public.increment_like_count(quiz_uuid uuid) returns void language plpgsql security definer as $$
      begin update public.quizzes set like_count = like_count + 1 where id = quiz_uuid; end $$;
      create function public.decrement_like_count(quiz_uuid uuid) returns void language plpgsql security definer as $$
      begin update public.quizzes set like_count = greatest(like_count - 1, 0) where id = quiz_uuid; end $$;
      grant execute on function public.increment_like_count(uuid), public.decrement_like_count(uuid) to public, anon, authenticated;`);
    expect(await as('anon', null, `select public.increment_like_count('${Q_KPOP}')`)).toBeNull();
    expect(await as('anon', null, `select public.increment_like_count('${Q_KPOP}')`)).toBeNull();
    expect(await one(db, `select like_count from public.quizzes where id = '${Q_KPOP}'`)).toBe(7);
    await db.exec(`update public.quizzes set like_count = 5 where id = '${Q_KPOP}'`);
  });

  it('apply: the Verify lines hold', async () => {
    await db.exec(UP);
    await checkVerify(db, UP, 'L33 up', 8);
  });

  it('record_play: anon and authenticated cannot record a play for another player', async () => {
    expect(await as('anon', null, play(Q_KPOP, U2))).toMatch(/the player must be the signed-in user/);
    expect(await as('anon', U1, play(Q_KPOP, U2))).toMatch(/the player must be the signed-in user/);
    expect(await as('authenticated', U1, play(Q_KPOP, U2))).toMatch(/the player must be the signed-in user/);
    expect(await as('authenticated', null, play(Q_KPOP, U2))).toMatch(/the player must be the signed-in user/);
    expect(await one(db, `select count(*)::int from public.plays`)).toBe(0);
  });

  it('record_play: a guest (no player) and a signed-in player for itself are still recorded, with the same bookkeeping', async () => {
    expect(await as('anon', null, play(Q_KPOP, null))).toBeNull();
    expect(await as('authenticated', U1, play(Q_KPOP, U1))).toBeNull();
    expect(await as('authenticated', U1, play(Q_ANIME, U1, 5, 5))).toBeNull();
    expect(await one(db, `select count(*)::int from public.plays`)).toBe(3);
    expect(await rows(db, `select play_count, total_completions from public.quizzes where id = '${Q_KPOP}'`)).toEqual([{ play_count: 2, total_completions: 2 }]);
    expect(await one(db, `select quizzes_played from public.profiles where id = '${U1}'`)).toBe(1); // kpop: profiles counter, once per quiz
    expect(await rows(db, `select site, counter from public.world_counter_log where counter = 'quizzes_played'`)).toEqual([{ site: 'otaku', counter: 'quizzes_played' }]);
    expect(await one(db, `select count(*)::int from public.plays where player_id is null`)).toBe(1);
  });

  it('record_play: the service role and the SQL editor can still name any player; scores out of range are refused', async () => {
    expect(await as('service_role', null, play(Q_KPOP, U2))).toBeNull();
    expect(await failure(db, play(Q_KPOP, U2))).toBeNull();
    expect(await as('anon', null, play(Q_KPOP, null, 9999, 5))).toMatch(/score out of range/);
    expect(await as('anon', null, play(Q_KPOP, null, -1, 5))).toMatch(/score out of range/);
    expect(await as('anon', null, play(Q_KPOP, null, 15, 5))).toBeNull(); // 3 x total: the guess-from-clues maximum
    await db.exec(`delete from public.plays`);
  });

  it('plays: a row written straight through the API follows the same rule', async () => {
    const ins = (player: string | null) => `insert into public.plays (quiz_id, player_id, score, total_questions) values ('${Q_KPOP}', ${player ? `'${player}'` : 'null'}, 1, 5)`;
    expect(await as('anon', null, ins(U2))).toMatch(/row-level security/);
    expect(await as('authenticated', U1, ins(U2))).toMatch(/row-level security/);
    expect(await as('authenticated', U1, ins(U1))).toBeNull();
    expect(await as('anon', null, ins(null))).toBeNull();
    await db.exec(`delete from public.plays`);
  });

  it('likes: one like per user, the count moves once, anon cannot touch it', async () => {
    const like = (u: string, q: string) => `insert into public.likes (user_id, quiz_id) values ('${u}', '${q}') on conflict (user_id, quiz_id) do nothing`;
    const count = (q: string) => one<number>(db, `select like_count from public.quizzes where id = '${q}'`);
    expect(await count(Q_KPOP)).toBe(5);
    expect(await as('authenticated', U1, like(U1, Q_KPOP))).toBeNull();
    expect(await as('authenticated', U1, like(U1, Q_KPOP))).toBeNull(); // a repeat: no second like, no second count
    expect(await as('authenticated', U1, like(U1, Q_KPOP))).toBeNull();
    expect(await count(Q_KPOP)).toBe(6);
    expect(await one(db, `select total_likes_received from public.profiles where id = '${CREATOR}'`)).toBe(1);
    expect(await as('authenticated', U2, like(U2, Q_KPOP))).toBeNull();
    expect(await count(Q_KPOP)).toBe(7);
    // a like for somebody else is refused by the policy, and the count does not move
    expect(await as('authenticated', U1, like(U2, Q_ANIME))).toMatch(/row-level security/);
    expect(await as('anon', null, like(U2, Q_ANIME))).toMatch(/row-level security/);
    expect(await count(Q_ANIME)).toBe(0);
    // another world: the world counter moves, profiles (kpop) does not
    expect(await as('authenticated', U1, like(U1, Q_ANIME))).toBeNull();
    expect(await count(Q_ANIME)).toBe(1);
    expect(await rows(db, `select site, counter, delta from public.world_counter_log where counter = 'likes_received'`)).toEqual([{ site: 'otaku', counter: 'likes_received', delta: 1 }]);
    expect(await one(db, `select total_likes_received from public.profiles where id = '${CREATOR}'`)).toBe(2);
    // unlike: down once, a second delete finds no row and moves nothing
    const unlike = (u: string, q: string) => `delete from public.likes where user_id = '${u}' and quiz_id = '${q}'`;
    expect(await as('authenticated', U1, unlike(U1, Q_KPOP))).toBeNull();
    expect(await as('authenticated', U1, unlike(U1, Q_KPOP))).toBeNull();
    expect(await count(Q_KPOP)).toBe(6);
    expect(await as('authenticated', U2, unlike(U1, Q_ANIME))).toBeNull(); // not its row: deletes nothing
    expect(await count(Q_ANIME)).toBe(1);
    // the count never goes below zero
    await db.exec(`update public.quizzes set like_count = 0 where id = '${Q_KPOP}'`);
    expect(await as('authenticated', U2, unlike(U2, Q_KPOP))).toBeNull();
    expect(await count(Q_KPOP)).toBe(0);
  });

  it('likes: the two old functions are closed to anon and authenticated and do nothing even for the service role', async () => {
    expect(await as('anon', null, `select public.increment_like_count('${Q_KPOP}')`)).toMatch(/permission denied/);
    expect(await as('authenticated', U1, `select public.decrement_like_count('${Q_KPOP}')`)).toMatch(/permission denied/);
    await db.exec(`update public.quizzes set like_count = 4 where id = '${Q_KPOP}'`);
    expect(await as('service_role', null, `select public.increment_like_count('${Q_KPOP}')`)).toBeNull();
    expect(await one(db, `select like_count from public.quizzes where id = '${Q_KPOP}'`)).toBe(4);
  });

  it('triggers: no EXECUTE left for anon, authenticated or PUBLIC, and every trigger still fires for the role that writes', async () => {
    for (const fn of ['handle_t_event', 'notify_t_event', 'grant_t_badge', 'likes_count_sync']) {
      for (const role of ['anon', 'authenticated', 'public']) {
        expect(await one(db, `select has_function_privilege('${role}', 'public.${fn}()'::regprocedure, 'EXECUTE')`), `${role} ${fn}`).toBe(false);
      }
    }
    await db.exec(`delete from public.t_log`);
    expect(await as('authenticated', U1, `insert into public.t_events (who) values ('${U1}')`)).toBeNull();
    expect(await as('anon', null, `insert into public.t_events (who) values (null)`)).toBeNull();
    expect(await rows(db, `select what, count(*)::int as n from public.t_log group by what order by what`)).toEqual([
      { what: 'grant', n: 2 }, { what: 'handle', n: 2 }, { what: 'notify', n: 2 }]);
  });

  it('search_path: the flagged functions get one, one that had its own keeps it', async () => {
    const cfg = (fn: string) => one<string[] | null>(db, `select proconfig from pg_proc where proname = '${fn}' and pronamespace = 'public'::regnamespace`);
    expect(await cfg('calc_player_level')).toEqual(['search_path=public, pg_temp']);
    expect(await cfg('award_xp')).toEqual(['search_path=public, pg_temp']);
    expect(await cfg('record_play')).toEqual(['search_path=public, pg_temp']);
    expect(await cfg('get_today_stats')).toEqual(['search_path=public']); // not in the list of the file's 30 names? it is: it had one, so it is skipped
    expect(await one(db, `select public.calc_player_level(250)`)).toBe(2);
  });

  it('a second run changes nothing', async () => {
    const before = await snapshot(db);
    await db.exec(UP);
    await checkVerify(db, UP, 'L33 up again', 8);
    expect(await snapshot(db)).toEqual(before);
  });

  it('refuses to run when record_play or the tables are missing', async () => {
    const bare = await freshDb([]);
    await expect(bare.exec(UP)).rejects.toThrow(/L33: quizzes, plays, profiles, likes, groups/);
  });

  it('rollback: the Verify lines of the rollback hold, and it is idempotent', async () => {
    await db.exec(DOWN);
    await checkVerify(db, DOWN, 'L33 down', 5);
    expect(await as('anon', null, play(Q_KPOP, null))).toBeNull(); // the old stub body again
    expect(await as('anon', null, `select public.increment_like_count('${Q_KPOP}')`)).toBeNull();
    await db.exec(DOWN);
    await checkVerify(db, DOWN, 'L33 down again', 5);
  });
});

describe('L33 leaves the three public views alone', { timeout: 120_000 }, () => {
  let v: PGlite;
  beforeAll(async () => {
    v = await freshDb([]);
    await v.exec(`
      create table public.entity_images (site_id text, kind text, slug text, path text, thumb_path text, needs_credit boolean, author text, license_verified boolean, source_url text);
      create table public.site_assets (key text, path text, published_at timestamptz, license text, license_verified boolean, retired_at timestamptz);
      create table public.favourite_characters (user_id uuid, group_id int, character_id int);
      create table public.profiles (id uuid primary key); create table public.plays (id uuid, player_id uuid); create table public.likes (id uuid);
      create table public.quizzes (id uuid);
      create function public.bump_world_counter(uuid, text, text, integer) returns integer language sql as $$ select 0 $$;
      create function public.emit_activity(text, uuid, text, jsonb) returns void language sql as $$ select $$;
      create function public.record_play(uuid, uuid, integer, integer, integer) returns table(play_id uuid, percentile integer) language sql as $$ select null::uuid, 0 $$;
      create function public.increment_like_count(uuid) returns void language sql as $$ select $$;
      create function public.decrement_like_count(uuid) returns void language sql as $$ select $$;
      alter table public.entity_images enable row level security;
      create policy entity_images_select_display on public.entity_images for select to anon, authenticated using (kind = any (array['series', 'character']));
      alter table public.site_assets enable row level security;           -- no policy, as in production
      alter table public.favourite_characters enable row level security;
      create policy fc_select_own on public.favourite_characters for select to authenticated using (user_id = auth.uid());
      create view public.entity_images_public as select site_id, kind, slug from public.entity_images where license_verified and thumb_path is not null;
      create view public.site_assets_public as select key, path from public.site_assets where retired_at is null and published_at <= now();
      create view public.favourite_character_counts as select group_id, character_id, count(*)::int as picks from public.favourite_characters group by 1, 2 having count(*) >= 2;
      grant select on all tables in schema public to anon, authenticated;
      insert into public.entity_images values ('kpop', 'idol', 'a', 'p', 't', false, null, true, null), ('otaku', 'character', 'b', 'p', 't', false, null, true, null);
      insert into public.site_assets values ('hero', 'p', now() - interval '1 day', 'cc0', true, null);
      insert into public.favourite_characters values ('${U1}', 1, 1), ('${U2}', 1, 1), ('${CREATOR}', 1, 1);`);
  }, 240_000);
  const readAs = async (role: string, uid: string | null, sql: string): Promise<number> => {
    await v.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false)`);
    try { return (await v.query(sql)).rows.length; } finally { await v.exec(`reset role; select set_config('request.jwt.claim.sub', '', false)`); }
  };

  it('as they are (owner rights), anon and authenticated read everything the pages read', async () => {
    expect(await readAs('anon', null, 'select * from public.entity_images_public')).toBe(2);
    expect(await readAs('anon', null, 'select * from public.site_assets_public')).toBe(1);
    expect(await readAs('authenticated', U1, 'select * from public.favourite_character_counts')).toBe(1);
    expect(await readAs('anon', null, 'select * from public.favourite_character_counts')).toBe(1);
  });

  it('with security_invoker they would read nothing, or less: the reason the views are not switched', async () => {
    for (const view of ['entity_images_public', 'site_assets_public', 'favourite_character_counts']) {
      await v.exec(`alter view public.${view} set (security_invoker = true)`);
    }
    expect(await readAs('anon', null, 'select * from public.entity_images_public')).toBe(1); // the idol and every non-display kind vanish
    expect(await readAs('anon', null, `select * from public.entity_images_public where kind = 'idol'`)).toBe(0);
    expect(await readAs('anon', null, 'select * from public.site_assets_public')).toBe(0); // RLS on, no policy
    expect(await readAs('anon', null, 'select * from public.favourite_character_counts')).toBe(0); // anon sees no picks
    expect(await readAs('authenticated', U1, 'select * from public.favourite_character_counts')).toBe(0); // the user sees only its own pick: below the threshold
    for (const view of ['entity_images_public', 'site_assets_public', 'favourite_character_counts']) {
      await v.exec(`alter view public.${view} reset (security_invoker)`);
    }
  });

  it('the file does not touch the views', async () => {
    await v.exec(UP);
    expect(await one(v, `select count(*)::int from pg_class where relname in ('entity_images_public', 'site_assets_public', 'favourite_character_counts') and reloptions is not null`)).toBe(0);
    expect(await readAs('anon', null, 'select * from public.entity_images_public')).toBe(2);
    expect(await readAs('anon', null, 'select * from public.site_assets_public')).toBe(1);
    expect(await readAs('anon', null, 'select * from public.favourite_character_counts')).toBe(1);
  });
});
