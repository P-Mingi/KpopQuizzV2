// Lane DLE-KPOP (owner 2026-11-22): "I don't want any '?'. Double check everybody and put all the missing information."
// L34 (kpopdle fill) on PGlite: the real files 011 ... 022, 021d, 021e, L19, L20 (the production state of the night before), then L34 and its rollback.
// A cell of Kpopdle Idol shows "?" when the idol's value for the column is empty: the test reads the pool the way the game does (dle_pool, the snapshot) and the view.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { kpopdleWorld, productionCalendar } from './kpopdle-fixture';
import { MIGRATIONS, one, rows } from './pglite-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 240_000, hookTimeout: 240_000 });

const readLaunch = (file: string): string => readFileSync(path.join(MIGRATIONS, 'launch', file), 'utf8');
const L19 = readLaunch('L19-l1-kpopdle-data-fixes.sql');
const L20 = readLaunch('L20-l1-kpopdle-view.sql');
const L34 = readLaunch('L34-l1-kpopdle-fill.sql');
const L34_RB = readLaunch('L34-l1-kpopdle-fill.rollback.sql');

const ADULT = `(current_date - interval '30 years')::date`;
const MINOR = `(current_date - interval '12 years')::date`;
const KEYS = ['gender', 'group', 'agency', 'nationality', 'birth', 'debut', 'generation', 'role'];

interface Empty { entity_id: string; name: string; keys: string[] }
/** The idols of the view (the pool the game reads) with at least one empty cell, and which cells: what shows "?" today. */
async function emptyCells(db: PGlite): Promise<Empty[]> {
  return rows<Empty>(db, `
    select s.entity_id, s.name, array(select a.key from public.dle_attributes a where a.game_id = 'kpopdle-idol'
      and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0 order by a.position) as keys
    from public.dle_src_kpop_idol s
    where exists (select 1 from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0)
    order by s.entity_id::integer`);
}

/** What the game's own read says: dle_pool, every entity, every column: a value the page would print (it prints "?" for an empty one). */
async function poolCellsWithoutValue(db: PGlite): Promise<string[]> {
  const pool = await one<{ attributes: { key: string }[]; entities: { id: string; name: string; attrs: Record<string, { v: unknown }> }[] }>(db, `select public.dle_pool('kpopdle-idol')`);
  expect(pool.attributes.map((a) => a.key)).toEqual(KEYS);
  const bad: string[] = [];
  for (const e of pool.entities) {
    for (const key of KEYS) {
      const v = e.attrs[key]?.v;
      const shown = Array.isArray(v) ? v.filter((x) => x !== null && x !== '').join(', ') : v === null || v === undefined ? '' : String(v);
      if (!shown) bad.push(`${e.id} ${e.name}: ${key}`);
    }
  }
  return bad;
}

/** A fingerprint of everything L34 may touch, and of what it must not: the same text twice means nothing moved. */
async function fingerprint(db: PGlite): Promise<Record<string, string>> {
  const q = async (sql: string): Promise<string> => (await one<string>(db, `select coalesce(md5(string_agg(t, '|' order by t)), '') from (${sql}) x(t)`)) ?? '';
  return {
    idols: await q(`select row(id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, gender, debut_year)::text from public.idols`),
    groups: await q(`select row(id, name, slug, record_label, generation, inception_date)::text from public.groups`),
    sources: await q(`select row(entity_type, entity_id, field, source, source_ref, source_url, fetched_at)::text from public.entity_sources`),
    agencies: await q(`select row(slug, name, parent_id, sources, created_at)::text from public.agencies`),
    links: await q(`select row(idol_id, group_id)::text from public.idol_other_groups`),
    curation: await q(`select row(game_id, entity_id, excluded, weight, note)::text from public.dle_curation`),
    entities: await q(`select row(entity_id, name, attrs, can_be_target, in_pool)::text from public.dle_entities where game_id = 'kpopdle-idol'`),
    schedule: await q(`select row(bank_day, entity_id)::text from public.dle_schedule where game_id = 'kpopdle-idol'`),
  };
}

const idol = (db: PGlite, id: number) => one<Record<string, unknown>>(db, `select to_jsonb(i) - 'created_at' - 'updated_at' from public.idols i where id = $1`, [id]);
const cell = async (db: PGlite, id: number, col: string): Promise<unknown> => one(db, `select ${col} from public.idols where id = $1`, [id]);
const grp = (db: PGlite, slug: string) => one<Record<string, unknown>>(db, `select jsonb_build_object('label', record_label, 'generation', generation) from public.groups where slug = $1`, [slug]);

interface Verify { query: string; expect: string }
/** The "-- Verify: <query>;   expect <value>" lines of a file header, as the owner reads them. */
function verifyOf(sql: string): Verify[] {
  const out: Verify[] = [];
  for (const line of sql.split('\n')) {
    if (!line.startsWith('-- Verify:')) continue;
    const m = /^-- Verify: (select .*;)   expect (.*)$/.exec(line);
    if (!m) throw new Error(`unreadable Verify line: ${line}`);
    out.push({ query: m[1]!, expect: m[2]! });
  }
  return out;
}
async function check(db: PGlite, sql: string): Promise<void> {
  const list = verifyOf(sql);
  expect(list.length).toBeGreaterThanOrEqual(3);
  expect(list.length).toBeLessThanOrEqual(12);
  for (const v of list) {
    const r = await rows<Record<string, unknown>>(db, v.query.replace(/;$/, ''));
    expect(r.length, v.query).toBe(1);
    const c = Object.values(r[0]!)[0];
    expect(c === null ? 'NULL' : String(c), v.query).toBe(v.expect);
  }
}

describe('L34: Kpopdle Idol never shows a "?" and every value is the verified one', () => {
  let db: PGlite;
  let before: Record<string, string>;
  let afterRun: Record<string, string>;
  let emptyBefore: Empty[];
  let noValueBefore: string[];
  let birthBefore: string;

  beforeAll(async () => {
    db = await kpopdleWorld();
    await productionCalendar(db);
    await db.exec(L19);
    await db.exec(L20);
    // The cases of production that the K1 seed of the fixture does not hold. Birth dates are relative to today: this test holds no date of birth.
    await db.exec(`
      insert into public.groups (name, slug, fandom_name, record_label, generation) values ('ENHYPEN', 'enhypen', 'ENGENE', null, null);
      insert into public.groups (name, slug, fandom_name, record_label, generation) values ('Red Velvet', 'red-velvet', 'ReVeluv', 'SM Entertainment', '3rd Gen');
      insert into public.groups (name, slug, fandom_name, record_label, generation) values ('LE SSERAFIM', 'le-sserafim', 'FEARNOT', 'Geffen Records', null);
      insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, gender, debut_year, ord)
        values (116, (select id from public.groups where slug = 'enhypen'), 'Jay', ${ADULT}, null, '{}', 'Q105717862', true, false, 'male', 2020, 116),
               (104, (select id from public.groups where slug = 'red-velvet'), 'Wendy', ${ADULT}, null, '{}', 'Q17478642', true, false, 'female', 2014, 104);
      -- a minor (switched off, as a minor must be) on a QID of the truth (never gets data), an inactive row on another, a wrong gender, a wrong nationality, a dual citizen whose single value is right
      insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, ord)
        values (900, (select id from public.groups where slug = 'exo'), 'Minor Kai', ${MINOR}, null, '{}', 'Q10775090', false, false, 900);
      insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, needs_review, ord)
        values (901, (select id from public.groups where slug = 'exo'), 'Inactive Kai', ${ADULT}, null, '{}', 'Q10775090', false, true, 901);
      update public.idols set gender = 'female' where id = 7;
      update public.idols set nationality = 'Japan' where id = 30;
    `);
    await db.exec(`select setval(pg_get_serial_sequence('public.idols', 'id'), (select max(id) from public.idols))`);
    await db.exec(`select public.dle_refresh_entities('kpopdle-idol')`);
    before = await fingerprint(db);
    emptyBefore = await emptyCells(db);
    noValueBefore = await poolCellsWithoutValue(db);
    birthBefore = await one<string>(db, `select md5(string_agg(row(id, birth_date, positions, active, needs_review)::text, '|' order by id)) from public.idols`);
  });

  it('before: the "?" of production are in the game (S.Coups, DK, The8, Kai, Jay, Wendy, the FIFTY FIFTY agency)', async () => {
    const byId = new Map(emptyBefore.map((e) => [e.entity_id, e.keys]));
    for (const id of ['39', '46', '48', '175']) expect(byId.get(id), id).toEqual(['gender', 'nationality']);
    expect(byId.get('116')).toEqual(['agency', 'nationality', 'generation']); // ENHYPEN has no label and no generation either
    expect(byId.get('104')).toEqual(['nationality']);
    expect(byId.get('163')).toEqual(['agency']);
    expect(noValueBefore.some((c) => c.startsWith('39 ') && c.endsWith('gender'))).toBe(true);
    expect(noValueBefore.length).toBeGreaterThanOrEqual(8);
    // The minor and the inactive row are not in the game at all.
    expect(byId.has('900')).toBe(false);
    expect(byId.has('901')).toBe(false);
  });

  describe('apply', () => {
    beforeAll(async () => {
      await db.exec(L34);
      afterRun = await fingerprint(db);
    });

    it('no idol of the pool has an empty cell: not in the view, not in the snapshot, not in dle_pool (what the page prints)', async () => {
      expect(await emptyCells(db)).toEqual([]);
      expect(await poolCellsWithoutValue(db)).toEqual([]);
      expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and in_pool and not can_be_target`)).toBe(0);
      // The idols that became complete are possible answers; nobody left the pool.
      expect(await one(db, `select count(*)::int from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('39', '46', '48', '175', '116', '104', '163') and can_be_target`)).toBe(7);
    });

    it('the filled values are the verified ones', async () => {
      expect(await rows(db, `select id, gender, nationality, debut_year from public.idols where id in (39, 46, 48, 175) order by id`)).toEqual([
        { id: 39, gender: 'male', nationality: 'South Korea', debut_year: 2015 }, { id: 46, gender: 'male', nationality: 'South Korea', debut_year: 2015 },
        { id: 48, gender: 'male', nationality: 'China', debut_year: 2015 }, { id: 175, gender: 'male', nationality: 'South Korea', debut_year: 2012 },
      ]);
      expect(await cell(db, 116, 'nationality')).toBe('South Korea');
      expect(await cell(db, 104, 'nationality')).toBe('South Korea');
      expect(await grp(db, 'fifty-fifty')).toEqual({ label: 'Attrakt', generation: '4th Gen' });
      expect(await grp(db, 'enhypen')).toEqual({ label: 'Belift Lab', generation: '4th generation' });
      expect(await grp(db, 'le-sserafim')).toEqual({ label: 'Source Music', generation: '4th generation' });
      // The group row that was right stays as it is, spelling included.
      expect(await grp(db, 'red-velvet')).toEqual({ label: 'SM Entertainment', generation: '3rd Gen' });
      expect(await grp(db, 'bts')).toEqual({ label: 'BigHit Music', generation: '3rd Gen' });
    });

    it('a contradicting value is corrected, a right one is not touched', async () => {
      expect(await cell(db, 7, 'gender')).toBe('male');              // was female
      expect(await cell(db, 30, 'nationality')).toBe('South Korea'); // was Japan
      expect(await cell(db, 80, 'nationality')).toBe('Canada');      // Mark: Canada is one of his two countries, left as it is
      expect(await cell(db, 33, 'nationality')).toBe('China');       // L19's label, same country
      expect(await cell(db, 29, 'nationality')).toBe('Taiwan');
    });

    it('the minor and the inactive row get nothing; no birth date, position, status moved; the calendar and the curation are the same', async () => {
      expect(await idol(db, 900)).toMatchObject({ gender: null, nationality: null });
      expect(await idol(db, 901)).toMatchObject({ gender: null, nationality: null });
      expect(await one(db, `select md5(string_agg(row(id, birth_date, positions, active, needs_review)::text, '|' order by id)) from public.idols`)).toBe(birthBefore);
      expect(afterRun.schedule).toBe(before.schedule);
      expect(afterRun.curation).toBe(before.curation);
      expect(afterRun.links).toBe(before.links);
      expect(await one(db, `select count(*)::int from public.idols where active and birth_date > (current_date - interval '18 years')::date`)).toBe(0);
    });

    it('one entity_sources row per written value, Wikidata with the QID or Wikipedia with a revision; the new agency is in public.agencies', async () => {
      expect(await rows(db, `select source, source_ref, source_url from public.entity_sources where entity_type = 'idol' and entity_id = '104' and field = 'nationality'`)).toEqual([
        { source: 'wikipedia', source_ref: 'rev 1385140600', source_url: 'https://en.wikipedia.org/wiki/Wendy_(singer)' },
      ]);
      expect(await rows(db, `select source, source_ref, source_url from public.entity_sources where entity_type = 'idol' and entity_id = '39' and field = 'nationality'`)).toEqual([
        { source: 'wikidata', source_ref: 'Q21824968', source_url: 'https://www.wikidata.org/wiki/Q21824968' },
      ]);
      expect(await rows(db, `select source, source_ref, source_url from public.entity_sources e join public.groups g on g.id::text = e.entity_id where e.entity_type = 'group' and e.field = 'record_label' and g.slug = 'fifty-fifty'`)).toEqual([
        { source: 'wikipedia', source_ref: 'rev 1386705560', source_url: 'https://en.wikipedia.org/wiki/Fifty_Fifty_(group)' },
      ]);
      expect(await one(db, `select count(*)::int from public.agencies where name = 'Attrakt' and slug = 'attrakt' and created_at = timestamptz '2026-11-22 00:00:00+00'`)).toBe(1);
      const bad = await one<number>(db, `select count(*)::int from public.entity_sources where fetched_at = timestamptz '2026-11-22 00:00:00+00'
        and (source_url !~ '^https://(www\\.wikidata\\.org/wiki/Q[0-9]+|en\\.wikipedia\\.org/wiki/[^ ]+)$' or source_url ~ '[\u2013\u2014]')`);
      expect(bad).toBe(0);
    });

    it('the Verify lines of the header hold after the file', async () => {
      await check(db, L34);
    });

    it('a second run changes nothing', async () => {
      await db.exec(L34);
      expect(await fingerprint(db)).toEqual(afterRun);
      expect(await emptyCells(db)).toEqual([]);
    });
  });

  describe('rollback', () => {
    it('puts the exact old values back (nulls, the wrong gender, the wrong nationality, the empty and the old labels), a second rollback changes nothing', async () => {
      await db.exec(L34_RB);
      expect(await fingerprint(db)).toEqual(before);
      expect(await cell(db, 7, 'gender')).toBe('female');
      expect(await cell(db, 30, 'nationality')).toBe('Japan');
      expect(await cell(db, 39, 'gender')).toBeNull();
      expect(await grp(db, 'fifty-fifty')).toEqual({ label: null, generation: '4th Gen' });
      expect(await grp(db, 'le-sserafim')).toEqual({ label: 'Geffen Records', generation: null });
      expect(await one(db, `select count(*)::int from pg_class where oid = to_regclass('public.kpopdle_fill_backup')`)).toBe(0);
      expect((await emptyCells(db)).map((e) => e.entity_id)).toEqual(emptyBefore.map((e) => e.entity_id));
      await check(db, L34_RB);
      await db.exec(L34_RB);
      expect(await fingerprint(db)).toEqual(before);
    });

    it('a row changed after L34 is left alone by the rollback, and the file applies again after a rollback', async () => {
      await db.exec(L34);
      await db.exec(`update public.idols set nationality = 'Japan' where id = 39; update public.groups set record_label = 'Somebody Else' where slug = 'enhypen'`);
      await db.exec(L34_RB);
      expect(await cell(db, 39, 'nationality')).toBe('Japan');
      expect((await grp(db, 'enhypen'))?.label).toBe('Somebody Else');
      expect(await cell(db, 39, 'gender')).toBeNull();
      await db.exec(`update public.idols set nationality = null where id = 39; update public.groups set record_label = null where slug = 'enhypen'`);
      await db.exec(L34);
      expect(await emptyCells(db)).toEqual([]);
      expect(await fingerprint(db)).toEqual(afterRun);
    });
  });

  describe('the files', () => {
    it('are one DO block each, no temp table, no session setting as a statement, no dash, no birth data', () => {
      for (const [sql, tag] of [[L34, 'o1l34'], [L34_RB, 'o1l34r']] as const) {
        const outer = `$${tag}$`;
        const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
        expect(code.startsWith(`do ${outer}\nbegin`)).toBe(true);
        expect(code.endsWith(`end ${outer};`)).toBe(true);
        expect(code.split(outer).length).toBe(3);
        expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
        expect(sql).not.toMatch(/^set\s+(lock_timeout|client_min_messages|statement_timeout|search_path|role|session)\b/im);
        expect(sql).toMatch(/perform set_config\('lock_timeout', '5s', true\);/);
        expect(sql).toMatch(/-- o1-transaction: single, ONE DO block/);
        expect(sql).not.toMatch(/[\u2013\u2014]/);
        expect(sql).not.toMatch(/birth_date\s*[=<>]+\s*(date\s+)?'\d{4}/i);
        expect(sql.replace(/2026-11-22/g, '')).not.toMatch(/\b(19|20)\d\d-\d\d-\d\d\b/);
      }
    });

    it('every UPDATE and DELETE has a WHERE', () => {
      for (const sql of [L34, L34_RB]) {
        const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n');
        for (const stmt of code.split(';')) {
          if (/^\s*(update|delete\s+from)\b/i.test(stmt)) expect(stmt, stmt.slice(0, 80)).toMatch(/\bwhere\b/i);
        }
      }
    });

    it('the truth holds no minor and only the two values that are not Wikidata\'s are named as such', () => {
      const json = /v_idols jsonb := '(\[[\s\S]*?\n\])';/.exec(L34)![1]!.replace(/''/g, "'");
      const list = JSON.parse(json) as { qid: string; gender: string; nat: string; debut?: number; ns?: string }[];
      expect(list.length).toBeGreaterThan(250);
      expect(new Set(list.map((e) => e.qid)).size).toBe(list.length);
      expect(list.every((e) => ['female', 'male'].includes(e.gender) && e.nat.length > 0)).toBe(true);
      expect(list.find((e) => e.qid === 'Q123554441')).toBeUndefined(); // Chiquita (BABYMONSTER) is a minor
      expect(list.filter((e) => e.ns).map((e) => e.qid)).toEqual(['Q17478642']);
      expect(Object.keys(list[0]!)).not.toContain('birth');
    });
  });
});
