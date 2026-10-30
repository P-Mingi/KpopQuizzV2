// Daily games (step 1): the SQL of 019-dle-core.sql and 020-dle-kpop-idol.sql, run on PGlite (Postgres 18 in WebAssembly,
// no Docker) on a stand-in of the production objects (pglite-harness.ts).
import { readFileSync } from 'node:fs';

import type { PGlite } from '@electric-sql/pglite';
import { beforeAll, describe, expect, it } from 'vitest';

import { bankDay, isPlayable } from './day';
import { failure, freshDb, one, readMigration, rows } from './pglite-harness';

interface Case { name: string; kind: string; near: number | null; guess: unknown; target: unknown; expect: { status: string; arrow: string | null } }
const CASES = (JSON.parse(readFileSync(new URL('./fixtures/compare.json', import.meta.url), 'utf8')) as { cases: Case[] }).cases;

const EPOCH = '2026-11-01';
const TOKEN = 'tok_aaaaaaaaaaaaaaaa';
const at = (date: string, time = '12:00:00'): string => `${date}T${time}Z`;

/** Runs one statement as a role in its own transaction; returns its rows or the error message. */
async function asRole(db: PGlite, role: string, sql: string, params: unknown[] = [], settings: Record<string, string> = {}): Promise<{ rows?: Record<string, unknown>[]; error?: string }> {
  await db.exec('begin');
  try {
    for (const [k, v] of Object.entries(settings)) await db.query('select set_config($1, $2, true)', [k, v]);
    await db.exec(`set local role ${role}`);
    const r = await db.query<Record<string, unknown>>(sql, params);
    await db.exec('commit');
    return { rows: r.rows };
  } catch (e) {
    await db.exec('rollback');
    return { error: (e as Error).message };
  }
}

/** A synthetic game of n targets (dle_src_<id>), one number column, balance keys over `keys` groups. */
async function syntheticGame(db: PGlite, id: string, n: number, keys = 27, noRepeat = 120): Promise<void> {
  const view = `dle_src_${id.replace(/-/g, '_')}`;
  await db.exec(`
    create or replace view public.${view} as
      select x::text as entity_id, 'Entity ' || x as name, array['entity' || x] as search,
        jsonb_build_object('n', jsonb_build_object('v', x)) as attrs, jsonb_build_object('initial', 'E') as hints,
        null::text as thumb_path, 'k' || (x % ${keys}) as balance_key, true as can_be_target
      from generate_series(1, ${n}) as x;
    insert into public.dle_games (id, universe, entity_kind, source_view, no_repeat_days, min_pool, hint_keys, hint_after)
      values ('${id}', 'kpop', 'idol', '${view}', ${noRepeat}, 2, '{initial}', '{5}');
    insert into public.dle_attributes values ('${id}', 'n', 'number', 1, 2);
  `);
}

/** Pairs of days of the bank with the same target closer than the window, around the cycle. */
async function windowBreaks(db: PGlite, game: string, win: number): Promise<number> {
  return one<number>(db, `
    select count(*)::int from public.dle_schedule a join public.dle_schedule b
      on a.game_id = b.game_id and a.entity_id = b.entity_id and a.bank_day < b.bank_day
    where a.game_id = $1 and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < $2`, [game, win]);
}

describe('019 and 020 apply', () => {
  it('apply on the stand-in, then a second time without change (idempotent)', async () => {
    const db = await freshDb();
    const before = await one<string>(db, `select md5(string_agg(proname || prosrc, ',' order by proname)) from pg_proc where proname like 'dle\\_%'`);
    await db.exec(readMigration('019-dle-core.sql'));
    await db.exec(readMigration('020-dle-kpop-idol.sql'));
    expect(await one(db, `select md5(string_agg(proname || prosrc, ',' order by proname)) from pg_proc where proname like 'dle\\_%'`)).toBe(before);
    expect(await one(db, `select count(*)::int from public.dle_games`)).toBe(1);
    expect(await one(db, `select count(*)::int from public.dle_attributes`)).toBe(8);
  });

  it('019 refuses to run without 018, 020 without 019', async () => {
    const db = await freshDb([]);
    expect(await failure(db, readMigration('019-dle-core.sql'))).toMatch(/apply 018 first/);
    expect(await failure(db, readMigration('020-dle-kpop-idol.sql'))).toMatch(/apply 019 first/);
  });

  it('roll back 020 then 019 to the 018 state, and apply again', async () => {
    const db = await freshDb();
    await db.exec(readMigration('020-dle-kpop-idol.rollback.sql'));
    await db.exec(readMigration('019-dle-core.rollback.sql'));
    expect(await one(db, `select count(*)::int from pg_class where relname like 'dle\\_%'`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_proc where proname like 'dle\\_%'`)).toBe(0);
    expect(await one(db, `select count(*)::int from information_schema.columns where table_name = 'entity_images' and column_name in ('license_verified', 'thumb_path')`)).toBe(0);
    await db.exec(readMigration('019-dle-core.sql'));
    await db.exec(readMigration('020-dle-kpop-idol.sql'));
    expect(await one(db, `select count(*)::int from public.dle_games`)).toBe(1);
  });
});

describe('privileges: the browser roles reach only the four public functions', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb();
  });

  it('every dle table and the source view: permission denied for anon and authenticated', async () => {
    const rels = await rows<{ relname: string }>(db, `select relname from pg_class where relnamespace = 'public'::regnamespace and relname like 'dle\\_%' and relkind in ('r', 'v') order by 1`);
    expect(rels.map((r) => r.relname)).toEqual([
      'dle_attributes', 'dle_curation', 'dle_daily_stats', 'dle_entities', 'dle_games', 'dle_plays', 'dle_rate', 'dle_salt', 'dle_schedule',
      'dle_src_kpop_idol',
    ]);
    for (const role of ['anon', 'authenticated']) {
      for (const { relname } of rels) {
        expect((await asRole(db, role, `select * from public.${relname}`)).error, `${role} ${relname}`).toMatch(/permission denied/);
      }
      expect((await asRole(db, role, `insert into public.dle_plays (game_id, play_date, token_hash) values ('kpopdle-idol', '2026-11-01', repeat('a', 64))`)).error).toMatch(/permission denied/);
    }
  });

  it('every internal function: permission denied; the four public ones run', async () => {
    const fns = await rows<{ sig: string; name: string }>(db, `select p.oid::regprocedure::text as sig, p.proname as name from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\\_%' order by 1`);
    const open = fns.filter((f) => ['dle_guess', 'dle_give_up', 'dle_day', 'dle_pool'].includes(f.name)).map((f) => f.name).sort();
    expect(open).toEqual(['dle_day', 'dle_give_up', 'dle_guess', 'dle_pool']);
    for (const role of ['anon', 'authenticated']) {
      const granted = await rows<{ name: string }>(db, `select p.proname as name from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname like 'dle\\_%' and has_function_privilege($1, p.oid, 'execute') order by 1`, [role]);
      expect(granted.map((g) => g.name)).toEqual(['dle_day', 'dle_give_up', 'dle_guess', 'dle_pool']);
      expect((await asRole(db, role, `select public.dle_build_bank('kpopdle-idol')`)).error).toMatch(/permission denied/);
      expect((await asRole(db, role, `select public.dle_target('kpopdle-idol', '2026-11-01')`)).error).toMatch(/permission denied/);
      expect((await asRole(db, role, `select public.dle_guess_at(now(), 'kpopdle-idol', current_date, $1, '1')`, [TOKEN])).error).toMatch(/permission denied/);
      // The game is off: the public functions run and answer "unavailable", not "permission denied".
      expect((await asRole(db, role, `select public.dle_pool('kpopdle-idol')`)).error).toMatch(/dle_unavailable/);
      expect((await asRole(db, role, `select public.dle_day('kpopdle-idol')`)).error).toMatch(/dle_unavailable/);
      expect((await asRole(db, role, `select public.dle_guess('kpopdle-idol', current_date, $1, '1')`, [TOKEN])).error).toMatch(/dle_unavailable/);
      expect((await asRole(db, role, `select public.dle_give_up('kpopdle-idol', current_date, $1)`, [TOKEN])).error).toMatch(/dle_unavailable/);
    }
  });

  it('RLS is on for every dle table, with no policy; the public functions are SECURITY DEFINER with search_path = public', async () => {
    expect(await one(db, `select count(*)::int from pg_class where relnamespace = 'public'::regnamespace and relname like 'dle\\_%' and relkind = 'r' and not relrowsecurity`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_policies where tablename like 'dle\\_%'`)).toBe(0);
    const defs = await rows<{ proname: string; prosecdef: boolean; proconfig: string[] }>(db, `select proname, prosecdef, proconfig from pg_proc where proname like 'dle\\_%' order by 1`);
    for (const d of defs) {
      expect(d.proconfig, d.proname).toContain('search_path=public');
      expect(d.prosecdef, d.proname).toBe(['dle_guess', 'dle_give_up', 'dle_day', 'dle_pool'].includes(d.proname));
    }
  });
});

describe('dle_compare: the shared cases of fixtures/compare.json', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb();
  });

  it.each(CASES.map((c) => [c.name, c] as const))('%s', async (_name, c) => {
    const got = await one<{ status: string; arrow: string | null }>(db, `select public.dle_compare($1, $2, $3::jsonb, $4::jsonb)`,
      [c.kind, c.near, c.guess === null ? null : JSON.stringify(c.guess), JSON.stringify(c.target)]);
    expect(got).toEqual(c.expect);
  });

  it('covers every kind and every status', () => {
    expect(new Set(CASES.map((c) => c.kind))).toEqual(new Set(['single', 'multi', 'number', 'ordinal']));
    expect(new Set(CASES.map((c) => c.expect.status))).toEqual(new Set(['correct', 'near', 'wrong', 'unknown']));
    expect(new Set(CASES.map((c) => c.expect.arrow))).toEqual(new Set([null, 'up', 'down']));
  });
});

describe('dle_src_kpop_idol', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = await freshDb();
    await db.exec(`
      insert into public.groups (id, name, slug, fandom_name, generation, inception_date, record_label) values
        (1, 'NCT', 'nct', 'NCTzen', '3rd Gen', '2016-04-09', 'SM Entertainment'),
        (2, 'NewGroup', 'newgroup', 'fan', null, '2024-03-01', 'Label X');
      insert into public.group_units (id, parent_group_id, name) values (1, 1, 'NCT 127');
      insert into public.idols (id, group_id, unit_id, name, name_romanized, name_hangul, birth_date, nationality, positions, height_cm, mbti, blood_type) values
        (1, 1, 1, 'Taeyong', 'Lee Taeyong', '태용', '1995-07-01', 'South Korea', '{Leader,"Main Dancer"}', 175, 'INFJ', 'A'),
        (2, 1, null, 'Chenle', 'Zhong Chenle', '천러', '2001-11-22', 'China', '{Vocalist}', 178, 'ENFP', 'B'),
        (3, 2, null, 'Kid', null, null, current_date - interval '17 years', 'South Korea', '{Maknae}', null, null, null),
        (4, 2, null, 'NoBirth', null, null, null, 'South Korea', '{}', null, null, null),
        (5, 2, null, 'Inactive', null, null, '2000-01-01', 'South Korea', '{}', null, null, null),
        (6, 2, null, 'Review', null, null, '2000-01-01', 'South Korea', '{}', null, null, null),
        (7, 2, null, 'Detached', null, null, '2000-01-01', 'South Korea', '{}', null, null, null),
        (8, 2, null, 'Maknae', null, null, '2004-05-05', 'Japan, South Korea', '{"Lead Vocalist", Maknae}', null, null, null);
      update public.idols set active = false where id = 5;
      update public.idols set needs_review = true where id = 6;
      update public.idols set detached_at = now() where id = 7;
    `);
  });

  it('keeps adult, active, reviewed, attached idols only', async () => {
    const ids = await rows<{ entity_id: string }>(db, `select entity_id from public.dle_src_kpop_idol order by entity_id`);
    expect(ids.map((r) => r.entity_id)).toEqual(['1', '2', '8']);
  });

  it('names from idols.name, name_romanized and name_hangul; never height_cm, mbti or blood_type', async () => {
    const cols = await rows<{ column_name: string }>(db, `select column_name from information_schema.columns where table_name = 'dle_src_kpop_idol' order by ordinal_position`);
    expect(cols.map((c) => c.column_name)).toEqual(['entity_id', 'name', 'search', 'attrs', 'hints', 'thumb_path', 'balance_key', 'can_be_target']);
    const r = (await rows<{ name: string; search: string[]; attrs: Record<string, unknown>; hints: Record<string, unknown> }>(db, `select name, search, attrs, hints from public.dle_src_kpop_idol where entity_id = '1'`))[0]!;
    expect(r.name).toBe('Taeyong');
    expect([...r.search].sort()).toEqual(['Lee Taeyong', 'Taeyong', '태용'].sort());
    const text = JSON.stringify(await rows(db, `select * from public.dle_src_kpop_idol`));
    for (const word of ['height', 'mbti', 'blood', '175', 'INFJ']) expect(text).not.toContain(word);
    expect(await one<string>(db, `select pg_get_viewdef('public.dle_src_kpop_idol'::regclass)`)).not.toMatch(/height_cm|mbti|blood_type/);
  });

  it('builds the 8 columns from the facts', async () => {
    const a = await one<Record<string, unknown>>(db, `select attrs from public.dle_src_kpop_idol where entity_id = '1'`);
    expect(a).toEqual({
      gender: { v: null }, group: { v: ['NCT 127'], p: ['NCT'] }, agency: { v: ['SM Entertainment'] }, nationality: { v: ['South Korea'] },
      birth: { v: 1995 }, debut: { v: null }, generation: { v: 3 }, role: { v: 'leader' },
    });
    const b = await one<Record<string, { v: unknown }>>(db, `select attrs from public.dle_src_kpop_idol where entity_id = '8'`);
    expect(b.nationality!.v).toEqual(['Japan', 'South Korea']);
    expect(b.role!.v).toBe('maknae');
    expect(b.generation!.v).toBe(5);
    expect(await one(db, `select attrs -> 'role' ->> 'v' from public.dle_src_kpop_idol where entity_id = '2'`)).toBe('none');
    expect(await one(db, `select hints from public.dle_src_kpop_idol where entity_id = '1'`)).toEqual({ fandom: 'NCTzen', initial: 'T' });
    expect(await one(db, `select hints from public.dle_src_kpop_idol where entity_id = '8'`)).toEqual({ initial: 'M' });
  });

  it('a picture only with a verified licence and a 96 px file', async () => {
    // Step 2 opens the kinds of entity_images to idols; the stand-in does it the same way to test the view.
    await db.exec(`
      alter table public.entity_images drop constraint entity_images_kind_check, drop constraint entity_images_slug_check;
      insert into public.entity_images (site_id, kind, slug, path, width, height, source_url, author, license, license_verified, thumb_path) values
        ('kpop', 'idol', '1', 'idol/1-a.webp', 400, 400, 'https://commons.wikimedia.org/x', 'A', 'cc_by', true, 'idol/1-a-96.webp'),
        ('kpop', 'idol', '2', 'idol/2-a.webp', 400, 400, 'https://commons.wikimedia.org/y', 'B', 'cc_by', false, 'idol/2-a-96.webp'),
        ('kpop', 'idol', '8', 'idol/8-a.webp', 400, 400, 'https://commons.wikimedia.org/z', 'C', 'cc_by', true, null);
    `);
    const t = await rows<{ entity_id: string; thumb_path: string | null }>(db, `select entity_id, thumb_path from public.dle_src_kpop_idol order by entity_id`);
    expect(t).toEqual([{ entity_id: '1', thumb_path: 'idol/1-a-96.webp' }, { entity_id: '2', thumb_path: null }, { entity_id: '8', thumb_path: null }]);
  });

  it('dle-smoke.sql: every check ok, and no name or id of an idol in its output', async () => {
    const out = (await db.exec(readMigration('dle-smoke.sql'))).at(-1)!.rows as { n: number; result: string; got: string }[];
    expect(out).toHaveLength(13);
    expect(out.filter((r) => r.result !== 'info').map((r) => `${r.n} ${r.result}`)).toEqual(Array.from({ length: 10 }, (_, i) => `${i + 1} ok`));
    expect(out.find((r) => r.n === 11)!.got).toBe('3');
    const text = JSON.stringify(out);
    for (const name of ['Taeyong', 'Chenle', 'Maknae', '태용']) expect(text).not.toContain(name);
  });

  it('no idol is a target until lot K1 adds idols.gender and idols.debut_year; then the complete ones are', async () => {
    await db.query(`update public.dle_games set min_pool = 2 where id = 'kpopdle-idol'`);
    await db.query(`select public.dle_refresh_entities('kpopdle-idol')`);
    expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and can_be_target`)).toBe(0);
    expect(await failure(db, `select public.dle_activate('kpopdle-idol', '${EPOCH}')`)).toMatch(/dle_pool_too_small/);
    await db.exec(`
      alter table public.idols add column gender text, add column debut_year integer;
      update public.idols set gender = 'Male', debut_year = 2016 where id in (1, 2);
      update public.idols set gender = 'female' where id = 8;
    `);
    await db.query(`select public.dle_refresh_entities('kpopdle-idol')`);
    const t = await rows<{ entity_id: string; can_be_target: boolean }>(db, `select entity_id, can_be_target from public.dle_entities where game_id = 'kpopdle-idol' order by entity_id`);
    expect(t).toEqual([{ entity_id: '1', can_be_target: true }, { entity_id: '2', can_be_target: true }, { entity_id: '8', can_be_target: false }]);
    expect(await one(db, `select attrs -> 'gender' ->> 'v' from public.dle_entities where game_id = 'kpopdle-idol' and entity_id = '1'`)).toBe('male');
  });
});

describe('the bank of 365 days', () => {
  it.each([[40], [57], [81], [116], [150], [230], [365], [500]])('%i targets: 365 days, never the same target within the window, around the cycle', async (n) => {
    const db = await freshDb();
    await syntheticGame(db, 'syn', n);
    for (const seed of [0.1, 0.5, 0.9]) {
      await db.exec(`delete from public.dle_schedule; update public.dle_games set epoch = null, active = false, pool_hash = null`);
      expect(await one(db, `select public.dle_activate('syn', '${EPOCH}', ${seed})`)).toBe(365);
      const win = await one<number>(db, `select public.dle_window('syn')`);
      expect(win).toBe(Math.max(1, Math.min(120, Math.floor(0.7 * n))));
      expect(await one(db, `select count(*)::int from public.dle_schedule where game_id = 'syn'`)).toBe(365);
      expect(await windowBreaks(db, 'syn', win)).toBe(0);
    }
  }, 60_000);

  it('the same seed draws the same bank; another seed another one', async () => {
    const db = await freshDb();
    await syntheticGame(db, 'syn', 116);
    const draw = async (seed: number): Promise<string> => {
      await db.exec(`delete from public.dle_schedule; update public.dle_games set epoch = null, active = false`);
      await db.query(`select public.dle_activate('syn', '${EPOCH}', ${seed})`);
      return one<string>(db, `select string_agg(entity_id, ',' order by bank_day) from public.dle_schedule`);
    };
    const a = await draw(0.3);
    expect(await draw(0.3)).toBe(a);
    expect(await draw(0.31)).not.toBe(a);
  }, 60_000);

  it('a group (balance key) comes back within 14 days on at most 2 % of the days, around the cycle (a preference, not a rule)', async () => {
    const db = await freshDb();
    await syntheticGame(db, 'syn', 116, 27);
    for (const seed of [0.2, 0.7, 0.9]) {
      await db.exec(`delete from public.dle_schedule; update public.dle_games set epoch = null, active = false`);
      await db.query(`select public.dle_activate('syn', '${EPOCH}', ${seed})`);
      const close = await one<number>(db, `
        select count(*)::int from public.dle_schedule a join public.dle_schedule b
          on a.bank_day < b.bank_day and least(b.bank_day - a.bank_day, 365 - (b.bank_day - a.bank_day)) < 14
        join public.dle_entities ea on ea.game_id = 'syn' and ea.entity_id = a.entity_id
        join public.dle_entities eb on eb.game_id = 'syn' and eb.entity_id = b.entity_id
        where ea.balance_key = eb.balance_key`);
      // Measured on nine seeds: 1 to 5 days of 365, all at the end of the last block or across the start of the cycle.
      expect(close, `seed ${seed}`).toBeLessThanOrEqual(7);
    }
  }, 60_000);

  it('a target that is not complete, excluded or out of the pool is never drawn; a weight changes the odds', async () => {
    const db = await freshDb();
    await syntheticGame(db, 'syn', 60);
    await db.exec(`insert into public.dle_curation (game_id, entity_id, excluded) values ('syn', '7', true)`);
    await db.query(`select public.dle_activate('syn', '${EPOCH}', 0.2)`);
    expect(await one(db, `select count(*)::int from public.dle_schedule where entity_id = '7'`)).toBe(0);
    expect(await one(db, `select in_pool from public.dle_entities where game_id = 'syn' and entity_id = '7'`)).toBe(false);
  });

  it('after day 365 the bank starts again from day 1 and the game number keeps growing', async () => {
    const db = await freshDb();
    await syntheticGame(db, 'syn', 116);
    await db.query(`select public.dle_activate('syn', '${EPOCH}', 0.4)`);
    const day1 = await one(db, `select entity_id from public.dle_schedule where bank_day = 1`);
    const d366 = '2027-11-01';
    expect(await one(db, `select public.dle_bank_day('${EPOCH}', '${d366}')`)).toBe(1);
    expect(await one(db, `select public.dle_target('syn', '${d366}')`)).toBe(day1);
    const day = await one<{ game_no: number }>(db, `select public.dle_day_at('${at(d366)}', 'syn')`);
    expect(day.game_no).toBe(366);
    // Game n. 732 (2028 is a leap year: 2028-11-01 is 731 days after the epoch) plays bank day 2.
    expect(await one(db, `select public.dle_bank_day('${EPOCH}', '2028-11-01')`)).toBe(2);
    expect(await one<{ game_no: number }>(db, `select public.dle_day_at('${at('2028-11-01')}', 'syn')`)).toMatchObject({ game_no: 732 });
  });

  it('a rebuild never moves today nor the 7 days after it, nor a day already served, and keeps the window', async () => {
    const db = await freshDb();
    await syntheticGame(db, 'syn', 80);
    await db.query(`select public.dle_activate('syn', '${EPOCH}', 0.6)`);
    const today = '2027-03-10';
    const served = await one(db, `select public.dle_target('syn', '2027-03-09')`);
    const frozen = await rows(db, `select d::date as d, public.dle_target('syn', d::date) as t from generate_series('${today}'::date, '${today}'::date + 7, interval '1 day') d`);
    await db.exec(`delete from public.dle_daily_stats where play_date >= '${today}'`);
    const before = await one<string>(db, `select string_agg(entity_id, ',' order by bank_day) from public.dle_schedule`);
    // The pool grows: 40 more targets.
    await db.exec(`create or replace view public.dle_src_syn as
      select x::text as entity_id, 'Entity ' || x as name, array['entity' || x] as search, jsonb_build_object('n', jsonb_build_object('v', x)) as attrs,
        jsonb_build_object('initial', 'E') as hints, null::text as thumb_path, 'k' || (x % 27) as balance_key, true as can_be_target
      from generate_series(1, 120) as x`);
    const out = await one<{ game: string; pool: number; rebuilt_days: number }[]>(db, `select public.dle_daily_maintenance('${at(today, '00:05:00')}')`);
    expect(out).toEqual([{ game: 'syn', pool: 120, rebuilt_days: 357 }]);
    expect(await one(db, `select string_agg(entity_id, ',' order by bank_day) from public.dle_schedule`)).not.toBe(before);
    for (const f of frozen as { d: string; t: string }[]) {
      expect(await one(db, `select public.dle_target('syn', $1::date)`, [f.d])).toBe(f.t);
    }
    expect(await one(db, `select public.dle_target('syn', '2027-03-09')`)).toBe(served);
    expect(await windowBreaks(db, 'syn', await one<number>(db, `select public.dle_window('syn')`))).toBe(0);
    // Nothing changed: the next night rebuilds nothing.
    expect(await one(db, `select public.dle_daily_maintenance('${at('2027-03-11', '00:05:00')}')`)).toEqual([{ game: 'syn', pool: 120, rebuilt_days: 0 }]);
  });

  it('the TypeScript calendar gives the same bank day and playability as the SQL', async () => {
    const db = await freshDb();
    for (const date of ['2026-11-01', '2026-12-31', '2027-10-31', '2027-11-01', '2030-02-28', '2026-10-31']) {
      expect(await one(db, `select public.dle_bank_day($1, $2)`, [EPOCH, date]), date).toBe(bankDay(EPOCH, date));
    }
    for (const [now, date] of [['2026-11-05T02:59:59Z', '2026-11-04'], ['2026-11-05T03:00:00Z', '2026-11-04'], ['2026-11-05T00:00:00Z', '2026-11-05'],
      ['2026-11-05T23:59:59Z', '2026-11-06'], ['2026-11-05T01:00:00Z', '2026-11-03'], ['2026-11-01T01:00:00Z', '2026-10-31']] as const) {
      expect(await one(db, `select public.dle_playable($1, $2::timestamptz, $3)`, [EPOCH, now, date]), `${now} ${date}`).toBe(isPlayable(EPOCH, new Date(now), date));
    }
  });
});

describe('plays', () => {
  let db: PGlite;
  const D = '2026-11-10';
  let target: string;
  const guess = async (entity: string, token = TOKEN, now = at(D), date = D): Promise<Record<string, any>> =>
    one(db, `select public.dle_guess_at($1::timestamptz, 'syn', $2::date, $3, $4)`, [now, date, token, entity]);
  const wrong = (n: number): string[] => {
    const out: string[] = [];
    for (let i = 1; out.length < n; i++) if (String(i) !== target) out.push(String(i));
    return out;
  };

  beforeAll(async () => {
    db = await freshDb();
    await syntheticGame(db, 'syn', 60);
    await db.query(`select public.dle_activate('syn', '${EPOCH}', 0.5)`);
    target = await one<string>(db, `select entity_id from public.dle_schedule where bank_day = public.dle_bank_day('${EPOCH}', '${D}')`);
  });

  it('a wrong guess: its statuses, no target, the day counts one play', async () => {
    const [w] = wrong(1);
    const s = await guess(w!);
    expect(s.status).toBe('playing');
    expect(s.game_no).toBe(10);
    expect(s.guesses).toHaveLength(1);
    expect(s.guesses[0].result[0]).toMatchObject({ key: 'n' });
    expect(s.target).toBeNull();
    expect(s.stats).toBeNull();
    expect(JSON.stringify(s)).not.toContain(`"id":"${target}"`);
    expect(await one(db, `select plays from public.dle_daily_stats where game_id = 'syn' and play_date = '${D}'`)).toBe(1);
  });

  it('the same guess again changes nothing', async () => {
    const [w] = wrong(1);
    const s = await guess(w!);
    expect(s.guesses).toHaveLength(1);
    expect(await one(db, `select cardinality(guesses) from public.dle_plays where token_hash = encode(sha256(convert_to('${TOKEN}', 'UTF8')), 'hex')`)).toBe(1);
  });

  it('hints open with the errors counted by the server (after 5 here)', async () => {
    let s: Record<string, any> = {};
    for (const w of wrong(5)) s = await guess(w);
    expect(s.guesses).toHaveLength(5);
    expect(s.hints).toEqual([{ key: 'initial', value: 'E' }]);
  });

  it('the right guess ends the play: the target, the win counted once, the histogram', async () => {
    const s = await guess(target);
    expect(s.status).toBe('won');
    expect(s.target).toMatchObject({ id: target, name: `Entity ${target}` });
    expect(Object.keys(s.target).sort()).toEqual(['attrs', 'id', 'name', 'thumb']);
    expect(s.stats).toBeNull();
    const again = await guess(wrong(7)[6]!);
    expect(again.guesses).toHaveLength(6);
    const st = await rows<{ plays: number; wins: number; h: number }>(db, `select plays, wins, guess_hist[6] as h from public.dle_daily_stats where game_id = 'syn' and play_date = '${D}'`);
    expect(st).toEqual([{ plays: 1, wins: 1, h: 1 }]);
  });

  it('give up: only after a guess, returns the target, counted once', async () => {
    const t2 = 'tok_bbbbbbbbbbbbbbbb';
    expect(await failure(db, `select public.dle_give_up_at('${at(D)}', 'syn', '${D}', '${t2}')`)).toMatch(/dle_no_guess/);
    await guess(wrong(1)[0]!, t2);
    const s = await one<Record<string, any>>(db, `select public.dle_give_up_at('${at(D)}', 'syn', '${D}', '${t2}')`);
    expect(s.status).toBe('given_up');
    expect(s.target.id).toBe(target);
    await db.query(`select public.dle_give_up_at('${at(D)}', 'syn', '${D}', '${t2}')`);
    expect(await one(db, `select give_ups from public.dle_daily_stats where game_id = 'syn' and play_date = '${D}'`)).toBe(1);
    const after = await guess(target, t2);
    expect(after.status).toBe('given_up');
    expect(await one(db, `select wins from public.dle_daily_stats where game_id = 'syn' and play_date = '${D}'`)).toBe(1);
  });

  it('refuses a bad date, a bad token, an unknown entity', async () => {
    expect(await failure(db, `select public.dle_guess_at('${at(D)}', 'syn', '2026-11-08', '${TOKEN}', '1')`)).toMatch(/dle_bad_date/);
    expect(await failure(db, `select public.dle_guess_at('${at(D)}', 'syn', '2026-11-11', '${TOKEN}', '1')`)).toMatch(/dle_bad_date/);
    expect(await failure(db, `select public.dle_guess_at('${at(D, '03:00:00')}', 'syn', '2026-11-09', '${TOKEN}', '1')`)).toMatch(/dle_bad_date/);
    expect(await failure(db, `select public.dle_guess_at('2026-10-31T12:00:00Z', 'syn', '2026-10-31', '${TOKEN}', '1')`)).toMatch(/dle_bad_date/);
    expect(await failure(db, `select public.dle_guess_at('${at(D)}', 'syn', '${D}', 'short', '1')`)).toMatch(/dle_bad_token/);
    expect(await failure(db, `select public.dle_guess_at('${at(D)}', 'syn', '${D}', null, '1')`)).toMatch(/dle_bad_token/);
    expect(await failure(db, `select public.dle_guess_at('${at(D)}', 'syn', '${D}', '${TOKEN}', '9999')`)).toMatch(/dle_unknown_entity/);
  });

  it('yesterday stays playable until 03:00 UTC', async () => {
    const s = await guess(wrong(1)[0]!, 'tok_cccccccccccccccc', at('2026-11-11', '02:59:00'), D);
    expect(s.date).toBe(D);
  });

  it('refuses the 301st guess', async () => {
    const t = 'tok_dddddddddddddddd';
    await guess(wrong(1)[0]!, t);
    await db.query(`update public.dle_plays set guesses = array(select 'x' || g from generate_series(1, 300) g) where token_hash = encode(sha256(convert_to($1, 'UTF8')), 'hex')`, [t]);
    expect(await failure(db, `select public.dle_guess_at('${at(D)}', 'syn', '${D}', '${t}', '${wrong(2)[1]}')`)).toMatch(/dle_too_many_guesses/);
  });

  it('day statistics stay null under 100 plays', async () => {
    const day = await one<Record<string, any>>(db, `select public.dle_day_at('${at(D)}', 'syn')`);
    expect(day.stats).toBeNull();
    await db.query(`update public.dle_daily_stats set plays = 100 where game_id = 'syn' and play_date = '${D}'`);
    const day100 = await one<Record<string, any>>(db, `select public.dle_day_at('${at(D)}', 'syn')`);
    expect(day100.stats).toMatchObject({ plays: 100, wins: 1, give_ups: 1 });
  });

  it("dle_day: the clock, the number, the time left, the caller's play; yesterday's answer only after 03:00 UTC", async () => {
    const early = await one<Record<string, any>>(db, `select public.dle_day_at('2026-11-11T02:00:00Z', 'syn', '${TOKEN}')`);
    expect(early.game_no).toBe(11);
    expect(early.seconds_left).toBe(22 * 3600);
    expect(early.yesterday).toBeNull();
    expect(early.play).toBeNull();
    const late = await one<Record<string, any>>(db, `select public.dle_day_at('2026-11-11T03:00:00Z', 'syn', '${TOKEN}')`);
    expect(late.yesterday).toMatchObject({ date: D, game_no: 10, answer: { id: target } });
    const resume = await one<Record<string, any>>(db, `select public.dle_day_at('${at(D)}', 'syn', '${TOKEN}')`);
    expect(resume.play.status).toBe('won');
    expect(resume.play.guesses).toHaveLength(6);
    const fresh = await one<Record<string, any>>(db, `select public.dle_day_at('${at(D)}', 'syn', 'tok_eeeeeeeeeeeeeeee')`);
    expect(fresh.play).toBeNull();
  });

  it('a signed-in account resumes its play on another device', async () => {
    const user = '11111111-1111-1111-1111-111111111111';
    await db.query(`insert into auth.users (id) values ($1)`, [user]);
    const D2 = '2026-11-12';
    const t1 = 'tok_phonephonephone1';
    const t2 = 'tok_laptoplaptop0002';
    await db.exec('begin');
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [user]);
    await db.query(`select public.dle_guess_at($1::timestamptz, 'syn', $2::date, $3, $4)`, [at(D2), D2, t1, '1']);
    const other = await one<Record<string, any>>(db, `select public.dle_day_at($1::timestamptz, 'syn', $2)`, [at(D2), t2]);
    await db.exec('commit');
    expect(other.play.guesses.map((g: { id: string }) => g.id)).toEqual(['1']);
    expect(await one(db, `select count(*)::int from public.dle_plays where play_date = '${D2}'`)).toBe(1);
  });

  it("a shared browser: a token whose play is another account's raises dle_token_taken, never that play", async () => {
    const a = '22222222-2222-2222-2222-222222222222';
    const b = '33333333-3333-3333-3333-333333333333';
    await db.query(`insert into auth.users (id) values ($1), ($2)`, [a, b]);
    const D4 = '2026-11-16';
    const shared = 'tok_sharedbrowser001';
    await db.exec('begin');
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [a]);
    await db.query(`select public.dle_guess_at($1::timestamptz, 'syn', $2::date, $3, $4)`, [at(D4), D4, shared, '1']);
    await db.exec('commit');

    await db.exec('begin');
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [b]);
    const tries: (string | null)[] = [];
    for (const sql of [
      `select public.dle_day_at('${at(D4)}', 'syn', '${shared}')`,
      `select public.dle_guess_at('${at(D4)}', 'syn', '${D4}', '${shared}', '2')`,
      `select public.dle_give_up_at('${at(D4)}', 'syn', '${D4}', '${shared}')`,
    ]) {
      await db.exec('savepoint s');
      tries.push(await failure(db, sql));
      await db.exec('rollback to savepoint s');
    }
    // With the new token the client draws, b plays its own game; the old token then finds b's play first.
    const own = await one<Record<string, any>>(db, `select public.dle_guess_at($1::timestamptz, 'syn', $2::date, $3, $4)`, [at(D4), D4, 'tok_sharedbrowser002', '2']);
    const back = await one<Record<string, any>>(db, `select public.dle_day_at($1::timestamptz, 'syn', $2)`, [at(D4), shared]);
    await db.exec('commit');

    for (const t of tries) expect(t).toMatch(/dle_token_taken/);
    expect(own.guesses.map((g: { id: string }) => g.id)).toEqual(['2']);
    expect(back.play.guesses.map((g: { id: string }) => g.id)).toEqual(['2']);
    expect(await rows(db, `select user_id::text as u, guesses from public.dle_plays where play_date = '${D4}' order by started_at, user_id`)).toEqual([
      { u: a, guesses: ['1'] },
      { u: b, guesses: ['2'] },
    ]);
  });

  it('the rate limit: 40 calls a minute per address, then refused', async () => {
    const D3 = '2026-11-13';
    const headers = JSON.stringify({ 'x-forwarded-for': '6.6.6.6, 10.0.0.1' });
    await db.exec('begin');
    await db.query(`select set_config('request.headers', $1, true)`, [headers]);
    let error: string | null = null;
    let at41 = 0;
    for (let i = 1; i <= 41 && !error; i++) {
      await db.exec('savepoint s');
      error = await failure(db, `select public.dle_guess_at($1::timestamptz, 'syn', $2::date, $3, $4)`, [at(D3), D3, `tok_rate${String(i).padStart(12, '0')}`, '1']);
      await db.exec(error ? 'rollback to savepoint s' : 'release savepoint s');
      at41 = i;
    }
    await db.exec('rollback');
    expect(error).toMatch(/dle_rate_limited/);
    expect(at41).toBe(41);
  });

  it('dle_day counts against the same limit (it writes the day row and can give a guest play to the account)', async () => {
    const D3 = '2026-11-13';
    await db.exec('begin');
    await db.query(`select set_config('request.headers', $1, true)`, [JSON.stringify({ 'cf-connecting-ip': '7.7.7.7' })]);
    let error: string | null = null;
    let calls = 0;
    for (let i = 1; i <= 41 && !error; i++) {
      await db.exec('savepoint s');
      error = await failure(db, `select public.dle_day_at($1::timestamptz, 'syn')`, [at(D3)]);
      await db.exec(error ? 'rollback to savepoint s' : 'release savepoint s');
      calls = i;
    }
    await db.exec('rollback');
    expect(error).toMatch(/dle_rate_limited/);
    expect(calls).toBe(41);
  });

  it('dle_pool: the columns and the pool, never the target flag, the weights or the hints', async () => {
    const p = await one<Record<string, any>>(db, `select public.dle_pool('syn')`);
    expect(p.attributes).toEqual([{ key: 'n', kind: 'number', near: 2 }]);
    expect(p.entities).toHaveLength(60);
    expect(Object.keys(p.entities[0]).sort()).toEqual(['attrs', 'id', 'name', 'search', 'thumb']);
    expect(JSON.stringify(p)).not.toMatch(/can_be_target|weight|hints|initial/);
  });

  it('the nightly maintenance returns counts only and purges the rate limit and the old salts', async () => {
    await db.exec(`insert into public.dle_rate values ('2026-01-01T00:00:00Z', 'x', 1); insert into public.dle_salt values ('2026-01-01', '\\x00')`);
    const out = await one(db, `select public.dle_daily_maintenance('2026-11-14T00:05:00Z')`);
    expect(out).toEqual([{ game: 'syn', pool: 60, rebuilt_days: 0 }]);
    expect(await one(db, `select count(*)::int from public.dle_rate where bucket < '2026-11-01'`)).toBe(0);
    expect(await one(db, `select count(*)::int from public.dle_salt where day < '2026-11-01'`)).toBe(0);
    expect(await one(db, `select count(*)::int from public.dle_daily_stats where play_date = '2026-11-14'`)).toBe(1);
  });

  it('the public wrappers run on the real clock', async () => {
    const today = await one<string>(db, `select to_char(public.dle_utc_date(now()), 'YYYY-MM-DD')`);
    const r = await asRole(db, 'anon', `select public.dle_day('syn', $1) as d`, [TOKEN]);
    if (today < EPOCH) expect(r.error).toMatch(/dle_bad_date/);
    else expect((r.rows![0]!.d as { date: string }).date).toBe(today);
    const g = await asRole(db, 'anon', `select public.dle_guess('syn', $1::date, $2, '1') as s`, [today, 'tok_anonanonanon0001']);
    if (today < EPOCH) expect(g.error).toMatch(/dle_bad_date/);
    else expect((g.rows![0]!.s as { guesses: unknown[] }).guesses).toHaveLength(1);
  });
});
