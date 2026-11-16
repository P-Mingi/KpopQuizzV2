// Bunnyverse Cards lot 6: pglite proof of docs/pending-migrations/cards/116-photos-harvest.sql (built by harvest-sql.ts from invented subjects).
// The real schema files run, then 101, lot 2 and a 103 for lot 3's fixture, then 116: it adds entities (a member inside its group's section, a
// card-less group line, the locked pockets), photos in the next free slots (a known page or sha1 skipped), the age lock at read time, and
// changes nothing that was there; a second run adds nothing; cards_build_catalog() then gives the expected cards; the locks open on the right
// day; the rollback removes only what 116 added and is refused when a player owns a card of these subjects.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { vi, beforeAll, describe, expect, it } from 'vitest';

import { EXISTING_PAGE, HARVEST, HARVEST_SQL, at, harvestBase } from './harvest-fixture';
import { buildHarvest, typesOf111 } from './harvest-sql';
import { PLAYER } from './catalog-append-fixture';
import { failure, freshCardsDb, one, rows, CARDS_SQL } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const SQL = at(HARVEST_SQL.sql, '12:00');
async function base(): Promise<PGlite> {
  const db = await freshCardsDb();
  for (const f of harvestBase()) await db.exec(f);
  return db;
}
async function run(db: PGlite, sql: string): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(sql, { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}
const snap = (db: PGlite, table: string, strip = ''): Promise<string> =>
  one<string>(db, `select coalesce(md5(string_agg((to_jsonb(t)${strip})::text, E'\\n' order by (to_jsonb(t)->>'id'))), 'empty') from ${table} t`);
type Card = { card_no: number; entity_id: string; rarity: string; part: number };
const cards = (db: PGlite): Promise<Card[]> => rows<Card>(db, 'select card_no, entity_id, rarity, part from cards_catalog order by card_no');

describe('116-photos-harvest.sql', () => {
  let db: PGlite;
  let notices: string[];
  let before: { photos: string; entities: string; idols: string; catalog: Card[]; maxPhoto: number };
  beforeAll(async () => {
    db = await base();
    before = {
      photos: await snap(db, 'cards_photos'), entities: await snap(db, 'cards_entities'), idols: await snap(db, 'public.idols'),
      catalog: await cards(db), maxPhoto: await one<number>(db, 'select max(id) from cards_photos'),
    };
    notices = await run(db, SQL);
  });

  it('is one DO block with the header of 114, no dash, the clock read once, and a time window', async () => {
    const text = HARVEST_SQL.sql;
    expect(text.match(/^do \$c116\$$/gm)).toHaveLength(1);
    for (const k of ['What:', 'How:', 'Why:', 'Rows:', 'Needs:', 'Verify:', 'Refuses:', 'Undo:', 'o1-transaction: single, ONE DO block']) expect(text).toContain(`-- ${k}`);
    expect(text.match(/now\(\)/g)).toHaveLength(1);
    expect(text + HARVEST_SQL.rollback).not.toMatch(/[\u2013\u2014]/);
    expect(text).toContain('\\u2013'); // the author's dash is escaped, not written
    expect(HARVEST_SQL.rollback.match(/^do \$c116r\$$/gm)).toHaveLength(1);
    const fresh = await base();
    for (const t of ['23:50', '23:59', '00:00', '00:29']) expect(await failure(fresh, at(HARVEST_SQL.sql, t)), t).toMatch(/refused between 23:50 and 00:30 UTC/);
    expect(await failure(fresh, at(HARVEST_SQL.sql, '00:30'))).toBeNull();
  });

  it('runs every Verify line of the header without error, with the values it says', async () => {
    const lines = HARVEST_SQL.sql.split('\n').filter((l) => l.startsWith('-- Verify:'));
    expect(lines.length).toBeGreaterThanOrEqual(8);
    const expect1 = new Map<string, string>([
      ["column_name = 'age_lock';", '1'], ["proname = 'cards_age_locks';", '1'], ["'authenticated', 'public.cards_age_locks(date)', 'execute');", 'false'],
      ["has_function_privilege('service_role'", 'true'], ['not exists (select 1 from public.cards_entities e where e.id = p.entity_id);', '0'],
      // integrator, 2026-11-16: the rows of 116 are never active, and the trigger that keeps them so is there
      ["review_reason like '116-photos-harvest%' and active;", '0'], ["tgname = 'cards_116_idols_guard' and not tgisinternal;", '1'],
    ]);
    for (const line of lines) {
      const q = /^-- Verify: (.*?);\s{3}/.exec(line)?.[1];
      expect(q, line).toBeTruthy();
      const r = await rows<Record<string, unknown>>(db, q!);
      const v = String(Object.values(r[0] ?? { x: 'no row' })[0]);
      for (const [k, want] of expect1) if (q!.includes(k.replace(/;$/, ''))) expect(v, q).toBe(want);
    }
    // integrator, 2026-11-16 (listed): 8 entities (ghost-trio, dup-kpopdle-dups and the dups group line join), 1 idols row (ghost-trio),
    // 14 photos (ghost-trio 2, dup-kpopdle-dups 2); was 5 + 10
    expect(await one(db, 'select count(*) from cards_harvest_log')).toBe(8 + 1 + 14);
    expect(await one(db, `select count(*) from public.idols where review_reason like '116-photos-harvest%' and (active or not needs_review or birth_date is not null)`)).toBe(0);
    expect(await one(db, `select count(*) from public.dle_src_kpop_idol s join public.idols i on i.id::text = s.entity_id where i.review_reason like '116-photos-harvest%'`)).toBe(0);
  });

  it('refuses a database without the tables or file 103, with nothing changed', async () => {
    const bare = await freshCardsDb();
    expect(await failure(bare, SQL)).toMatch(/public\.groups or public\.idols is missing/);
    await bare.exec('create table public.groups (id serial primary key, name text, slug text); create table public.idols (id serial primary key)');
    expect(await failure(bare, SQL)).toMatch(/public\.idols lacks a column of 124/);
    await bare.exec('alter table public.idols add column wikidata_qid text, add column birth_date date, add column active boolean, add column ord integer, add column needs_review boolean, add column review_reason text');
    expect(await failure(bare, SQL)).toMatch(/file 103 is missing/);
    expect(await one(bare, `select count(*) from information_schema.columns where table_name = 'cards_entities' and column_name = 'age_lock'`)).toBe(0);
  });

  it('adds the entities: a member inside its group section, a card-less group line, the pockets; an existing person keeps its entity', async () => {
    const ents = await rows<{ id: string; kind: string; group_id: string | null; qid: string | null; sort_key: string; age_lock: boolean }>(db,
      `select id, kind, group_id, qid, sort_key, age_lock from cards_entities where id in ('idol:ada-trio','idol:bea-trio','idol:cleo-trio','group:trio','idol:eunkwang-btob','idol:jennie-blackpink','idol:jennie','group:btob','group:blackpink') order by id`);
    const by = Object.fromEntries(ents.map((e) => [e.id, e]));
    expect(by['idol:ada-trio']).toMatchObject({ kind: 'idol', group_id: 'group:trio', qid: 'Q1', sort_key: 'trio|0|ada', age_lock: false });
    expect(by['idol:cleo-trio']).toMatchObject({ kind: 'idol', group_id: 'group:trio', age_lock: true });
    expect(by['group:trio']).toMatchObject({ kind: 'group', sort_key: 'trio|1|trio', age_lock: true });
    // a member of an existing group sorts inside its section, before the group's own cards
    expect(by['idol:eunkwang-btob']).toMatchObject({ group_id: 'group:btob', sort_key: 'btob|0|eunkwang' });
    expect(by['group:btob']!.sort_key).toBe('btob|1|btob');
    // the same Wikidata id: no second entity for Jennie
    expect(by['idol:jennie-blackpink']).toBeUndefined();
    expect(by['idol:jennie']).toBeDefined();
    expect(await one(db, `select count(*) from cards_entities where qid = 'Q500'`)).toBe(1);
    expect(await one(db, `select count(*) from cards_entities where age_lock`)).toBe(2);
  });

  it('adds the photos in the next free slots, with the status of the check, and skips a known page, a known sha1, and the people it cannot resolve', async () => {
    // integrator, 2026-11-16 (listed): a Kpopdle idol is found by its public.idols id even when its Wikidata id has two rows (dup-kpopdle-dups);
    // a person with no row gets one without a birth date, and an adult's photos wait as pending (ghost-trio: was skipped)
    const p = await rows<{ slot: number; status: string; entity_id: string; review_note: string }>(db,
      `select entity_id, slot, status, review_note from cards_photos where id > ${before.maxPhoto} order by entity_id, slot`);
    const slots = (e: string) => p.filter((x) => x.entity_id === e).map((x) => `${x.slot}${x.status[0]}`);
    expect(slots('idol:ada-trio')).toEqual(['1a', '2a', '3a']);
    expect(slots('idol:bea-trio')).toEqual(['1a', '2p']);
    expect(slots('idol:eunkwang-btob')).toEqual(['1a', '2a']);
    // Jennie holds slots 1 (approved) and 2 (pending): the new photos take 3 and 4; BTOB holds 1 to 3: the new one takes 4
    expect(slots('idol:jennie')).toEqual(['3a', '4a']);
    expect(slots('group:btob')).toEqual(['4a']);
    expect(slots('idol:dup-kpopdle-dups')).toEqual(['1a', '2a']);
    expect(slots('idol:ghost-trio')).toEqual(['1p', '2p']);
    expect(p.filter((x) => x.entity_id === 'idol:ghost-trio').every((x) => /^To review: public\.idols has no birth date for this person yet/.test(x.review_note))).toBe(true);
    expect(p.find((x) => x.entity_id === 'idol:bea-trio' && x.status === 'pending')!.review_note).toMatch(/^To review: 2 people/);
    expect(p).toHaveLength(3 + 2 + 2 + 2 + 1 + 2 + 2);
    expect(await one(db, `select count(*) from cards_photos where entity_id in ('idol:cleo-trio', 'group:trio', 'idol:dup-dups')`)).toBe(0);
    expect(notices.some((m) => /idols rows added 1 \(inactive, flagged, no birth date\); photos waiting for a birth date in public\.idols 2/.test(m))).toBe(true);
    expect(await rows(db, `select name, birth_date, active, needs_review, wikidata_qid from public.idols where review_reason like '116-photos-harvest%'`))
      .toEqual([{ name: 'ghost-trio', birth_date: null, active: false, needs_review: true, wikidata_qid: 'Q999' }]);
    expect(notices.some((m) => /skipped dup-dups \(2 public\.idols rows/.test(m))).toBe(true);
    expect(notices.some((m) => /eunkwang-btob photo skipped \(the page is already in cards_photos\)/.test(m))).toBe(true);
    expect(notices.some((m) => /eunkwang-btob photo skipped \(the sha1 is already in cards_photos\)/.test(m))).toBe(true);
    expect(EXISTING_PAGE).toBeTruthy();
    expect(await one(db, `select author from cards_photos where entity_id = 'idol:ada-trio' and slot = 1`)).toBe('A Photographer \u2013 Seoul');
  });

  it('changes nothing that was there: every old photo and entity byte for byte, the catalog, the old public.idols rows', async () => {
    expect(await snap(db, `(select * from cards_photos where id <= ${before.maxPhoto})`)).toBe(before.photos);
    // the entities that were there, without the new column
    expect(await snap(db, `(select * from cards_entities where id not in (select ref from cards_harvest_log where kind = 'entity'))`, " - 'age_lock'")).toBe(before.entities);
    expect(await cards(db)).toEqual(before.catalog);
    // integrator, 2026-11-16 (listed): public.idols gains the rows of the log only; every old row is byte for byte the same (was: the whole table)
    expect(await snap(db, `(select * from public.idols where id not in (select ref::integer from cards_harvest_log where kind = 'idol'))`)).toBe(before.idols);
  });

  it('runs a second time and adds nothing', async () => {
    const photos = await snap(db, 'cards_photos');
    const ents = await one(db, 'select count(*) from cards_entities');
    const log = await one(db, 'select count(*) from cards_harvest_log');
    const again = await run(db, SQL);
    expect(await snap(db, 'cards_photos')).toBe(photos);
    expect(await one(db, 'select count(*) from cards_entities')).toBe(ents);
    expect(await one(db, 'select count(*) from cards_harvest_log')).toBe(log);
    expect(again.find((m) => /subjects, \d+ entities added/.test(m))).toMatch(/0 entities added \(0 of them group lines of a member\), 0 locked pockets, photos added 0 \(0 to review\)/);
  });

  it('gives the expected cards once the catalog is built again, the pockets and the waiting subjects without a card', async () => {
    const summary = await one<{ subjects: number; cards: number }>(db, 'select public.cards_build_catalog()');
    const cs = await cards(db);
    const ents = [...new Set(cs.map((c) => c.entity_id))];
    // by sort_key: Jennie (blackpink section), Eunkwang then BTOB (btob section), Dup Kpopdle (dups section), IU, Ada
    expect(ents).toEqual(['idol:jennie', 'idol:eunkwang-btob', 'group:btob', 'idol:dup-kpopdle-dups', 'idol:iu', 'idol:ada-trio']);
    const eds = (e: string) => [...new Set(cs.filter((c) => c.entity_id === e).map((c) => c.rarity))];
    expect(eds('idol:ada-trio')).toEqual(['C', 'U', 'R']);
    expect(eds('idol:eunkwang-btob')).toEqual(['C', 'U']);
    expect(eds('group:btob')).toEqual(['C', 'U', 'R']);
    expect(eds('idol:jennie')).toEqual(['C', 'U', 'R']);
    expect(cs.filter((c) => c.entity_id === 'group:btob').every((c) => c.part > 0)).toBe(true);
    expect(summary.cards).toBe(cs.length);
    expect(cs.map((c) => c.card_no)).toEqual(Array.from({ length: cs.length }, (_, i) => i + 1));
    // no card for a locked pocket, for Bea (one live photo, one pending), for a person whose photos wait for a birth date
    expect(cs.some((c) => ['idol:cleo-trio', 'group:trio', 'idol:bea-trio', 'idol:ghost-trio'].includes(c.entity_id))).toBe(false);
    expect(await one(db, `select count(*) from cards_entities where id = 'idol:bea-trio' and not active`)).toBe(1);
  });

  it('computes the lock at read time from public.idols, and opens it on the right day', async () => {
    type L = { entity_id: string; locked: boolean; opens_month: string | null };
    const locks = async (today: string): Promise<Record<string, [boolean, string | null]>> =>
      Object.fromEntries((await rows<L>(db, `select entity_id, locked, to_char(opens_month, 'YYYY-MM') as opens_month from cards_age_locks('${today}'::date) order by 1`)).map((r) => [r.entity_id, [r.locked, r.opens_month]]));
    // Cleo's 18th birthday is 2028-03-15: locked the day before, a normal entity on the day; the group follows (Ada and Bea are adults)
    expect(await locks('2028-03-14')).toEqual({ 'idol:cleo-trio': [true, '2028-03'], 'group:trio': [true, '2028-03'] });
    expect(await locks('2028-03-15')).toEqual({ 'idol:cleo-trio': [false, null], 'group:trio': [false, null] });
    expect(await locks('2026-11-16')).toEqual({ 'idol:cleo-trio': [true, '2028-03'], 'group:trio': [true, '2028-03'] });
    // an unknown birth date locks, with no opening month
    await db.exec(`update public.idols set birth_date = null where name = 'Cleo'`);
    expect(await locks('2040-01-01')).toEqual({ 'idol:cleo-trio': [true, null], 'group:trio': [true, null] });
    // a person with no public.idols row at all stays locked
    await db.exec(`delete from public.idols where name = 'Cleo'`);
    expect(await locks('2040-01-01')).toEqual({ 'idol:cleo-trio': [true, null], 'group:trio': [true, null] });
    // an adult birth date in public.idols opens the pocket at once
    await db.exec(`insert into public.idols (group_id, name, birth_date, wikidata_qid, active) values (gid('trio'), 'Cleo', '1998-02-02', 'Q3', true)`);
    expect(await locks('2026-11-16')).toEqual({ 'idol:cleo-trio': [false, null], 'group:trio': [false, null] });
    // a 29 February birthday turns 18 on 1 March
    await db.exec(`update public.idols set birth_date = '2008-02-29' where name = 'Cleo'`);
    expect(await locks('2026-02-28')).toMatchObject({ 'idol:cleo-trio': [true, '2026-03'] });
    expect(await locks('2026-03-01')).toMatchObject({ 'idol:cleo-trio': [false, null] });
    // the default is today
    expect(await one(db, `select count(*) from cards_age_locks()`)).toBe(2);
  });

  it('keeps the function and the column out of reach of a browser role', async () => {
    expect(await one(db, `select has_function_privilege('anon', 'public.cards_age_locks(date)', 'execute') or has_function_privilege('authenticated', 'public.cards_age_locks(date)', 'execute')`)).toBe(false);
    expect(await one(db, `select has_function_privilege('service_role', 'public.cards_age_locks(date)', 'execute')`)).toBe(true);
    expect(await one(db, `select prosecdef and proconfig = array['search_path=public'] from pg_proc where proname = 'cards_age_locks'`)).toBe(true);
    expect(await one(db, `select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_age_locks'`)).toBe(1);
  });

  it('leaves the Kpopdle source alone, and refuses when it would move', async () => {
    const fresh = await base();
    // the fixture's view reads rows without needs_review (as production); one that reads every active row does not move either
    await fresh.exec(`create or replace view public.dle_src_kpop_idol as select id::text as entity_id from public.idols where active`);
    expect(await failure(fresh, SQL)).toBeNull();
    const moving = await base();
    await moving.exec(`create or replace view public.dle_src_kpop_idol as select id as entity_id from public.cards_entities`);
    expect(await failure(moving, SQL)).toMatch(/the Kpopdle source would go from \d+ to \d+ entities/);
    expect(await one(moving, `select count(*) from cards_photos where id > ${before.maxPhoto}`)).toBe(0);
  });
});

describe('116-photos-harvest.rollback.sql', () => {
  it('removes only what 116 added, and the catalog is built again as it was', async () => {
    const db = await base();
    const old = { photos: await snap(db, 'cards_photos'), ents: await snap(db, 'cards_entities'), idols: await snap(db, 'public.idols'), catalog: await cards(db) };
    await run(db, SQL);
    await db.exec('select public.cards_build_catalog()');
    expect((await cards(db)).length).toBeGreaterThan(old.catalog.length);
    await run(db, HARVEST_SQL.rollback);
    expect(await snap(db, 'cards_photos')).toBe(old.photos);
    expect(await snap(db, 'cards_entities')).toBe(old.ents);
    expect(await cards(db)).toEqual(old.catalog);
    expect(await snap(db, 'public.idols')).toBe(old.idols);
    expect(await one(db, `select count(*) from information_schema.columns where table_name = 'cards_entities' and column_name = 'age_lock'`)).toBe(0);
    expect(await one(db, `select count(*) from pg_proc where proname in ('cards_age_locks', 'cards_age_day')`)).toBe(0);
    expect(await one(db, `select to_regclass('public.cards_harvest_log') is null`)).toBe(true);
    // a second run changes nothing
    await run(db, HARVEST_SQL.rollback);
    expect(await snap(db, 'cards_photos')).toBe(old.photos);
  });
  it('keeps a photo and an entity that existed before 116 (the same page already in the game is not removed)', async () => {
    const db = await base();
    await run(db, SQL);
    await run(db, HARVEST_SQL.rollback);
    expect(await one(db, `select count(*) from cards_photos where source_page = $1`, [EXISTING_PAGE])).toBe(1);
    expect(await one(db, `select count(*) from cards_entities where id in ('group:btob', 'group:blackpink', 'idol:jennie')`)).toBe(3);
  });
  it('is refused while a player owns a card of these subjects, and while a pack was opened over a catalog that holds them', async () => {
    const db = await base();
    await run(db, SQL);
    await db.exec('select public.cards_build_catalog()');
    await db.exec(PLAYER);
    const photos = await snap(db, 'cards_photos');
    expect(await failure(db, HARVEST_SQL.rollback)).toMatch(/a player owns a card of these subjects/);
    expect(await snap(db, 'cards_photos')).toBe(photos);
    await db.exec('delete from cards_owned');
    expect(await failure(db, HARVEST_SQL.rollback)).toMatch(/a pack was opened and the catalog holds cards of these subjects/);
    expect(await snap(db, 'cards_photos')).toBe(photos);
  });
  it('lists only what the file added: explicit lists; public.idols gets one insert of a flagged row without a birth date, never an update or a delete', () => {
    expect(HARVEST_SQL.rollback).toContain("'group:trio'");
    expect(HARVEST_SQL.rollback).toContain(HARVEST.subjects[0]!.photos[0]!.page);
    // integrator, 2026-11-16 (listed): was "no insert into public.idols" either
    expect(HARVEST_SQL.sql).not.toMatch(/\b(update|delete from) public\.idols\b/);
    expect(HARVEST_SQL.sql.match(/\binsert into public\.idols\b/g)).toHaveLength(1);
    expect(HARVEST_SQL.sql).toMatch(/insert into public\.idols \(group_id, name, birth_date, wikidata_qid, active, ord, needs_review, review_reason\)\n\s+values \(g\.id, sj ->> 'name', null, v_qid, false, 0, true,/);
    // the rollback deletes only the logged rows still flagged and without a date (a row the owner completed stays)
    expect(HARVEST_SQL.rollback).toMatch(/delete from public\.idols i\n\s+where i\.id = any \(v_idol_ids\) and i\.review_reason like '116-photos-harvest%' and i\.birth_date is null and i\.needs_review and not i\.active;/);
    expect(readFileSync(path.join(CARDS_SQL, '114-catalog-append.sql'), 'utf8')).toContain('o1-transaction');
    expect(buildHarvest({ checked_on: '2026-11-16', subjects: [] }).sql).toContain('0 subjects');
  });
});

describe('116-photos-harvest.sql: the research slug that differs from the database (ORCH, 2026-11-16)', () => {
  it('takes a member\'s group from its public.idols row, finds a group by its name, and the rollback removes what the log says', async () => {
    const db = await base();
    await db.exec(`insert into public.idols (group_id, name, birth_date, wikidata_qid, active) values ((select id from public.groups where slug = 'dups'), 'Solo Dup', '1994-02-02', 'Q710', true)`);
    const p = (n: number) => ({ ...HARVEST.subjects[0]!.photos[0]!, page: `https://commons.wikimedia.org/wiki/File:Alias_${n}.jpg`, sha1: `alias-sha-${n}`, date: `2024-0${n}-03`, event: `Alias ${n}` });
    const sql = buildHarvest({
      checked_on: '2026-11-16',
      subjects: [
        // the research wrote the group as "dups-research"; public.idols says dups
        { slug: 'solo-dup-dups-research', kind: 'idol', name: 'Solo Dup', qid: 'Q710', group: 'dups-research', locked: false, photos: [p(1), p(2)] },
        // a group photo under a slug the database does not have: found by its name (DUPS)
        { slug: 'dups-research', kind: 'group', name: 'D.U.P.S', qid: null, group: null, locked: false, photos: [{ ...p(3), width: 4000, height: 2600 }] },
        // no row of that name either: skipped
        { slug: 'nowhere', kind: 'group', name: 'Nowhere Band', qid: null, group: null, locked: false, photos: [p(4)] },
      ],
    });
    const notices = await run(db, at(sql.sql, '12:00'));
    expect(notices.join('\n')).toMatch(/solo-dup-dups-research belongs to dups in public\.idols \(the research said dups-research\)/);
    expect(notices.join('\n')).toMatch(/skipped nowhere \(no public\.groups row with that slug or name\)/);
    const ents = await rows<{ id: string; group_id: string | null }>(db, `select id, group_id from cards_entities where id in ('idol:solo-dup-dups-research', 'group:dups', 'group:dups-research', 'group:nowhere') order by id`);
    expect(ents).toEqual([{ id: 'group:dups', group_id: null }, { id: 'idol:solo-dup-dups-research', group_id: 'group:dups' }]);
    expect(await one<number>(db, `select count(*)::int from cards_photos where entity_id = 'group:dups'`)).toBe(1);
    expect(await one<number>(db, `select count(*)::int from cards_photos where entity_id = 'idol:solo-dup-dups-research'`)).toBe(2);
    await run(db, sql.rollback);
    expect(await one<number>(db, `select count(*)::int from cards_entities where id in ('idol:solo-dup-dups-research', 'group:dups')`)).toBe(0);
    expect(await one<number>(db, `select count(*)::int from cards_photos where source_page like '%Alias_%'`)).toBe(0);
  });
});

describe('116-photos-harvest.sql: a person with no public.idols row (ORCH and integrator, 2026-11-16)', () => {
  it('adds the row without a birth date: a locked pocket stays locked until the owner fills it, an adult\'s photos wait as pending', async () => {
    const db = await base();
    const p = (n: number) => ({ ...HARVEST.subjects[0]!.photos[0]!, page: `https://commons.wikimedia.org/wiki/File:Nobody_${n}.jpg`, sha1: `nobody-sha-${n}`, event: `Nobody ${n}` });
    const sql = buildHarvest({
      checked_on: '2026-11-16',
      subjects: [
        { slug: 'nobody-yet-trio', kind: 'idol', name: 'Nobody Yet', qid: 'Q4242', group: 'trio', locked: true, photos: [] },
        { slug: 'nobody-else-trio', kind: 'idol', name: 'Nobody Else', qid: 'Q4243', group: 'trio', locked: false, photos: [p(1), p(2)] },
        // a row of the same name in the group, without this Wikidata id: nothing is added; the locked one keeps its pocket, the adult is skipped
        { slug: 'ada-again-trio', kind: 'idol', name: 'Ada', qid: 'Q4244', group: 'trio', locked: false, photos: [p(3)] },
        { slug: 'bea-again-trio', kind: 'idol', name: 'Bea', qid: 'Q4245', group: 'trio', locked: true, photos: [] },
      ],
    });
    const idolsBefore = await snap(db, 'public.idols');
    const notices = (await run(db, at(sql.sql, '12:00'))).join('\n');
    expect(notices).toMatch(/a public\.idols row named Ada exists in trio without the Wikidata id Q4244: the owner links it/);
    expect(notices).toMatch(/skipped ada-again-trio \(no public\.idols row, and none could be added\)/);
    expect(notices).toMatch(/bea-again-trio has no public\.idols row: its pocket stays locked until the owner adds one/);
    expect(await rows(db, `select name, birth_date, active, needs_review from public.idols where review_reason like '116-photos-harvest%' order by name`))
      .toEqual([{ name: 'Nobody Else', birth_date: null, active: false, needs_review: true }, { name: 'Nobody Yet', birth_date: null, active: false, needs_review: true }]);
    expect(await rows(db, `select id, age_lock from cards_entities where id in ('idol:nobody-yet-trio', 'idol:nobody-else-trio', 'idol:ada-again-trio', 'idol:bea-again-trio') order by id`))
      .toEqual([{ id: 'idol:bea-again-trio', age_lock: true }, { id: 'idol:nobody-else-trio', age_lock: false }, { id: 'idol:nobody-yet-trio', age_lock: true }]);
    expect(await rows(db, `select entity_id, locked, opens_month from cards_age_locks('2026-11-16') where entity_id in ('idol:nobody-yet-trio', 'idol:bea-again-trio') order by 1`))
      .toEqual([{ entity_id: 'idol:bea-again-trio', locked: true, opens_month: null }, { entity_id: 'idol:nobody-yet-trio', locked: true, opens_month: null }]);
    expect(await rows(db, `select status from cards_photos where entity_id = 'idol:nobody-else-trio'`)).toEqual([{ status: 'pending' }, { status: 'pending' }]);
    // the owner fills a date: the pocket opens by itself (the age lock reads public.idols); the rollback then keeps that completed row
    await db.exec(`update public.idols set birth_date = '1999-09-09', needs_review = false where name = 'Nobody Yet'`);
    expect(await rows(db, `select locked from cards_age_locks('2026-11-16') where entity_id = 'idol:nobody-yet-trio'`)).toEqual([{ locked: false }]);
    const back = (await run(db, sql.rollback)).join('\n');
    expect(back).toMatch(/1 public\.idols rows removed, 1 kept \(the owner completed them\)/);
    expect(await one(db, `select count(*) from public.idols where name = 'Nobody Yet'`)).toBe(1);
    expect(await one(db, `select count(*) from public.idols where name = 'Nobody Else'`)).toBe(0);
    expect(idolsBefore).toBeTruthy();
  });
});

describe('116-photos-harvest.sql: a row it adds to public.idols never becomes active (integrator, 2026-11-16)', () => {
  // policy idols_public_read shows active rows only: while these rows stay inactive, the birth date the owner fills stays private
  it('opens a pocket at read time and never makes the row active, through the lock, a rebuild, or a manual update while under 18', async () => {
    const db = await base();
    const sql = buildHarvest({
      checked_on: '2026-11-16',
      subjects: [{ slug: 'teen-yet-trio', kind: 'idol', name: 'Teen Yet', qid: 'Q4250', group: 'trio', locked: true, photos: [] }],
    });
    await run(db, at(sql.sql, '12:00'));
    const row = `(select id from public.idols where wikidata_qid = 'Q4250')`;
    const active = () => one<boolean>(db, `select active from public.idols where wikidata_qid = 'Q4250'`);
    expect(await active()).toBe(false);
    // no date: the trigger refuses active = true
    expect(await failure(db, `update public.idols set active = true where id = ${row}`)).toMatch(/stays inactive while the person is under 18 or has no birth date/);
    // the owner fills a date (as 116b does): locked before the 18th birthday, open on the day, the row still inactive
    await db.exec(`update public.idols set birth_date = '2010-01-01' where id = ${row}`);
    const lock = (d: string) => one<boolean>(db, `select locked from cards_age_locks('${d}'::date) where entity_id = 'idol:teen-yet-trio'`);
    expect(await lock('2027-12-31')).toBe(true);
    expect(await lock('2028-01-01')).toBe(false);
    await db.exec('select public.cards_build_catalog()');
    expect(await active()).toBe(false);
    // under 18 today: the trigger refuses it too
    expect(await failure(db, `update public.idols set active = true where id = ${row}`)).toMatch(/stays inactive/);
    expect(await active()).toBe(false);
    // the lock functions only read: no insert, update or delete in their bodies
    for (const f of ['cards_age_locks', 'cards_age_day']) {
      expect(await one<string>(db, `select prosrc from pg_proc where proname = '${f}'`), f).not.toMatch(/\b(insert|update|delete)\b/i);
    }
    // an adult with a date may be published later by the owner; a row that is not of 116 is not touched by the trigger
    await db.exec(`update public.idols set birth_date = '1999-01-01' where id = ${row}`);
    expect(await failure(db, `update public.idols set active = true where id = ${row}`)).toBeNull();
    await db.exec(`update public.idols set active = false where name = 'Cleo'`);
    expect(await failure(db, `update public.idols set active = true where name = 'Cleo'`)).toBeNull();
    // the rollback removes the trigger and its function
    await run(db, sql.rollback);
    expect(await one(db, `select count(*) from pg_trigger where tgname = 'cards_116_idols_guard'`)).toBe(0);
    expect(await one(db, `select count(*) from pg_proc where proname = 'cards_116_idols_guard'`)).toBe(0);
  });
});

describe('116-photos-harvest.sql: the type of a group it brings in, from file 111 (two sources each)', () => {
  it('reads 111\'s list, gives a type to a group entity of the lot that has none, invents none, and the rollback removes it', async () => {
    const t111 = typesOf111(readFileSync(path.join(CARDS_SQL, '111-group-types.sql'), 'utf8'));
    expect(t111.types).toHaveLength(41);
    expect(t111.checked_on).toBe('2026-11-13');
    expect(t111.types.every((t) => t.source_a.length > 0 && t.source_b.length > 0 && t.source_a !== t.source_b)).toBe(true);
    const db = await base();
    // the fixture holds the table of 110 (empty)
    const types = [
      { id: 'group:trio', gender: 'girl' as const, source_a: 'en.wikipedia.org short description "girl group" (TRIO)', source_b: 'Wikidata item Q1, instance of Q641066 (girl group)' },
      { id: 'group:elsewhere', gender: 'boy' as const, source_a: 'a', source_b: 'b' },
    ];
    const sql = buildHarvest({ ...HARVEST, types, types_checked_on: '2026-11-13' });
    // only the groups of the lot are in the file
    expect(sql.sql).toContain('group:trio');
    expect(sql.sql).not.toContain('group:elsewhere');
    const n = (await run(db, at(sql.sql, '12:00'))).join('\n');
    expect(n).toMatch(/group types added 1 \(from file 111\)/);
    expect(await rows(db, `select entity_id, gender, checked_on::text from public.cards_group_types`)).toEqual([{ entity_id: 'group:trio', gender: 'girl', checked_on: '2026-11-13' }]);
    // a second run adds nothing
    expect((await run(db, at(sql.sql, '12:00'))).join('\n')).toMatch(/group types added 0/);
    await run(db, sql.rollback);
    expect(await one(db, 'select count(*) from public.cards_group_types')).toBe(0);
  });
});
