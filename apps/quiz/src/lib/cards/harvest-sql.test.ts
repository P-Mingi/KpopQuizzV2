// Bunnyverse Cards lot 6: pglite proof of docs/pending-migrations/cards/116-photos-harvest.sql (built by harvest-sql.ts from invented subjects).
// The real schema files run, then 101, lot 2 and a 103 for lot 3's fixture, then 116: it adds entities (a member inside its group's section, a
// card-less group line, the locked pockets), photos in the next free slots (a known page or sha1 skipped), the age lock at read time, and
// changes nothing that was there; a second run adds nothing; cards_build_catalog() then gives the expected cards; the locks open on the right
// day; the rollback removes only what 116 added and is refused when a player owns a card of these subjects.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { vi, beforeAll, describe, expect, it } from 'vitest';

import { EXISTING_PAGE, HARVEST, HARVEST_SQL, at, harvestBase } from './harvest-fixture';
import { buildHarvest } from './harvest-sql';
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
    ]);
    for (const line of lines) {
      const q = /^-- Verify: (.*?);\s{3}/.exec(line)?.[1];
      expect(q, line).toBeTruthy();
      const r = await rows<Record<string, unknown>>(db, q!);
      const v = String(Object.values(r[0] ?? { x: 'no row' })[0]);
      for (const [k, want] of expect1) if (q!.includes(k.replace(/;$/, ''))) expect(v, q).toBe(want);
    }
    expect(await one(db, 'select count(*) from cards_harvest_log')).toBe(5 + 10);
  });

  it('refuses a database without the tables or file 103, with nothing changed', async () => {
    const bare = await freshCardsDb();
    expect(await failure(bare, SQL)).toMatch(/public\.groups or public\.idols is missing/);
    await bare.exec('create table public.groups (id serial primary key, name text, slug text); create table public.idols (id serial primary key)');
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
    const p = await rows<{ slot: number; status: string; entity_id: string; review_note: string }>(db,
      `select entity_id, slot, status, review_note from cards_photos where id > ${before.maxPhoto} order by entity_id, slot`);
    const slots = (e: string) => p.filter((x) => x.entity_id === e).map((x) => `${x.slot}${x.status[0]}`);
    expect(slots('idol:ada-trio')).toEqual(['1a', '2a', '3a']);
    expect(slots('idol:bea-trio')).toEqual(['1a', '2p']);
    expect(slots('idol:eunkwang-btob')).toEqual(['1a', '2a']);
    // Jennie holds slots 1 (approved) and 2 (pending): the new photos take 3 and 4; BTOB holds 1 to 3: the new one takes 4
    expect(slots('idol:jennie')).toEqual(['3a', '4a']);
    expect(slots('group:btob')).toEqual(['4a']);
    expect(p.find((x) => x.entity_id === 'idol:bea-trio' && x.status === 'pending')!.review_note).toMatch(/^To review: 2 people/);
    expect(p).toHaveLength(3 + 2 + 2 + 2 + 1);
    expect(await one(db, `select count(*) from cards_photos where entity_id in ('idol:cleo-trio', 'group:trio', 'idol:ghost-trio', 'idol:dup-dups')`)).toBe(0);
    expect(notices.some((m) => /skipped ghost-trio \(0 public\.idols rows/.test(m))).toBe(true);
    expect(notices.some((m) => /skipped dup-dups \(2 public\.idols rows/.test(m))).toBe(true);
    expect(notices.some((m) => /eunkwang-btob photo skipped \(the page is already in cards_photos\)/.test(m))).toBe(true);
    expect(notices.some((m) => /eunkwang-btob photo skipped \(the sha1 is already in cards_photos\)/.test(m))).toBe(true);
    expect(EXISTING_PAGE).toBeTruthy();
    expect(await one(db, `select author from cards_photos where entity_id = 'idol:ada-trio' and slot = 1`)).toBe('A Photographer \u2013 Seoul');
  });

  it('changes nothing that was there: every old photo and entity byte for byte, the catalog, public.idols', async () => {
    expect(await snap(db, `(select * from cards_photos where id <= ${before.maxPhoto})`)).toBe(before.photos);
    // the entities that were there, without the new column
    expect(await snap(db, `(select * from cards_entities where id not in (select ref from cards_harvest_log where kind = 'entity'))`, " - 'age_lock'")).toBe(before.entities);
    expect(await cards(db)).toEqual(before.catalog);
    expect(await snap(db, 'public.idols')).toBe(before.idols);
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
    // by sort_key: Jennie (blackpink section), Eunkwang then BTOB (btob section), IU, Ada
    expect(ents).toEqual(['idol:jennie', 'idol:eunkwang-btob', 'group:btob', 'idol:iu', 'idol:ada-trio']);
    const eds = (e: string) => [...new Set(cs.filter((c) => c.entity_id === e).map((c) => c.rarity))];
    expect(eds('idol:ada-trio')).toEqual(['C', 'U', 'R']);
    expect(eds('idol:eunkwang-btob')).toEqual(['C', 'U']);
    expect(eds('group:btob')).toEqual(['C', 'U', 'R']);
    expect(eds('idol:jennie')).toEqual(['C', 'U', 'R']);
    expect(cs.filter((c) => c.entity_id === 'group:btob').every((c) => c.part > 0)).toBe(true);
    expect(summary.cards).toBe(cs.length);
    expect(cs.map((c) => c.card_no)).toEqual(Array.from({ length: cs.length }, (_, i) => i + 1));
    // no card for a locked pocket, for Bea (one live photo, one pending), for a skipped person
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
    await fresh.exec(`create view public.dle_src_kpop_idol as select id::text as entity_id from public.idols where active`);
    expect(await failure(fresh, SQL)).toBeNull();
    const moving = await base();
    await moving.exec(`create view public.dle_src_kpop_idol as select id as entity_id from public.cards_entities`);
    expect(await failure(moving, SQL)).toMatch(/the Kpopdle source would go from \d+ to \d+ entities/);
    expect(await one(moving, `select count(*) from cards_photos where id > ${before.maxPhoto}`)).toBe(0);
  });
});

describe('116-photos-harvest.rollback.sql', () => {
  it('removes only what 116 added, and the catalog is built again as it was', async () => {
    const db = await base();
    const old = { photos: await snap(db, 'cards_photos'), ents: await snap(db, 'cards_entities'), catalog: await cards(db) };
    await run(db, SQL);
    await db.exec('select public.cards_build_catalog()');
    expect((await cards(db)).length).toBeGreaterThan(old.catalog.length);
    await run(db, HARVEST_SQL.rollback);
    expect(await snap(db, 'cards_photos')).toBe(old.photos);
    expect(await snap(db, 'cards_entities')).toBe(old.ents);
    expect(await cards(db)).toEqual(old.catalog);
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
  it('lists only what the file added: explicit lists, no public.idols write', () => {
    expect(HARVEST_SQL.rollback).toContain("'group:trio'");
    expect(HARVEST_SQL.rollback).toContain(HARVEST.subjects[0]!.photos[0]!.page);
    expect(HARVEST_SQL.sql).not.toMatch(/\b(insert into|update|delete from) public\.idols\b/);
    expect(readFileSync(path.join(CARDS_SQL, '114-catalog-append.sql'), 'utf8')).toContain('o1-transaction');
    expect(buildHarvest({ checked_on: '2026-11-16', subjects: [] }).sql).toContain('0 subjects');
  });
});
