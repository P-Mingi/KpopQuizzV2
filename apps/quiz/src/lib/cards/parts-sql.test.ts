// Bunnyverse Cards lot 7: proof of docs/pending-migrations/cards/118-group-parts.sql (built by parts-sql.ts) on PGlite, on the state production
// has (bundle 099 to 115, then 116 and 117). Checked: the file is one DO block with its header and under 400 KB; every refusal changes
// nothing; the data lands by source_page on group photos only (parts, focal point only when still the verdict's, review, rejected, the log,
// the notices); a photo in 3 gives three consecutive card numbers with their own small_2x and the Full Art rule, a photo in 2 keeps today's
// catalog exactly; the panoramas P-0001 and up; the append; the Verify lines; the rollback (md5 of every function, the rows from the log).
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { groupBox, splitParts } from '../../../scripts/cards/card-geometry.mjs';
import { PARTS_DAY, REJECTED_NOTE, buildParts, dataLiteral, type PartsData } from './parts-sql';
import { unguardedWrites } from './safeupdate-scan';
import { SOURCES, ZZ, addGroup, build, entry, failsWith, page, prodDb, run } from './parts-fixture';
import { CARDS_SQL, one, rows } from './sql-harness';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const FNS = ['cards_build_catalog', 'cards_catalog_append', 'cards_open', 'cards_craft'];
const md5s = (db: Awaited<ReturnType<typeof prodDb>>): Promise<Record<string, string>> =>
  rows<{ proname: string; m: string }>(db, `select proname, md5(prosrc) as m from pg_proc where pronamespace = 'public'::regnamespace and proname in ('${FNS.join("','")}')`)
    .then((r) => Object.fromEntries(r.map((x) => [x.proname, x.m])));
const catalog = (db: Awaited<ReturnType<typeof prodDb>>) =>
  rows(db, 'select card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x from cards_catalog order by card_no');
const photoRows = (db: Awaited<ReturnType<typeof prodDb>>) =>
  rows(db, `select id, entity_id, slot, status, review_note, focal_x, focal_y, source_page, storage_path from cards_photos order by id`);

const EMPTY = build([]);

describe('118-group-parts.sql: the file', () => {
  it('is one DO block with its header, no dash, one clock read, and the rollback too', () => {
    const t = build([entry(page(1), { note: 'a note – with a dash — here' })]);
    expect(t.sql.match(/^do \$c118\$$/gm)).toHaveLength(1);
    expect(t.rollback.match(/^do \$c118r\$$/gm)).toHaveLength(1);
    for (const k of ['What:', 'Why:', 'Scope:', 'Rows:', 'Needs:', 'Verify:', 'Refuses:', 'Undo:', 'o1-transaction: single, ONE DO block']) expect(t.sql).toContain(`-- ${k}`);
    expect(t.sql + t.rollback).not.toMatch(/[–—]/);
    expect(t.sql).toContain('\\u2013');
    expect(t.sql.match(/\(now\(\) at time zone 'UTC'\)::time/g)).toHaveLength(1);
    expect(t.sql.match(/^-- Verify:/gm)!.length).toBeGreaterThanOrEqual(10);
    expect(t.rollback).toMatch(/^-- Verify:/m);
  });
  it('stays under 400 KB with 400 photos, and says what it replaces', () => {
    const many = Array.from({ length: 400 }, (_, i) => entry(page(i), { parts: 3, heads_box: { x0: 10.5, x1: 80.25, y0: 20, y1: 60, hw: 4.5 }, note: '3 cards: the 11:8.5 window would cut someone, the 16.5:8.5 window keeps all 7 people once its focal point moves to 40/50', focal_from: { x: 50, y: 50 }, focal: { x: 40, y: 50 }, by: 'thumbnail' }));
    const t = build(many);
    expect(t.sql.length).toBeLessThan(400_000);
    expect(t.rollback.length).toBeLessThan(400_000);
    expect(t.photos).toBe(400);
  });
  it('refuses data it cannot trust', () => {
    expect(() => dataLiteral({ checked_on: '2026-11-17', photos: [entry(page(1)), entry(page(1))] })).toThrow(/listed twice/);
    expect(() => dataLiteral({ checked_on: '2026-11-17', photos: [{ ...entry(page(1)), parts: 4 as 2 }] })).toThrow(/parts must be 2 or 3/);
    expect(() => dataLiteral({ checked_on: '2026-11-17', photos: [entry('https://example.org/a.jpg')] })).toThrow(/Commons file page/);
    expect(() => dataLiteral({ checked_on: '2026-11-17', photos: [entry(page(1), { focal: { x: 120, y: 3 } })] })).toThrow(/0 to 100/);
    expect(() => dataLiteral({ checked_on: '2026-11-17', photos: [entry(page(1), { note: 'x $parts$ y' })] })).toThrow(/quote/);
  });
  it('the committed files equal the generator output (read only once the data lane has committed parts.json)', () => {
    const json = path.join(CARDS_SQL, '../../design/cards/data/lot7/parts.json');
    if (!existsSync(json)) return; // the data lane writes parts.json later; this check runs from then on
    const g = buildParts(SOURCES, JSON.parse(readFileSync(json, 'utf8')) as PartsData, PARTS_DAY);
    expect(readFileSync(path.join(CARDS_SQL, '118-group-parts.sql'), 'utf8')).toBe(g.sql);
    expect(readFileSync(path.join(CARDS_SQL, '118-group-parts.rollback.sql'), 'utf8')).toBe(g.rollback);
  });
});

describe('118-group-parts.sql: refusals change nothing', () => {
  it('refuses between 23:50 and 00:30 UTC, when a pack was opened, a card is owned, a panorama is owned, or a function is not the expected version', async () => {
    const db = await prodDb();
    const before = await md5s(db);
    const none = async (): Promise<void> => {
      expect(await md5s(db)).toEqual(before);
      expect(await one(db, `select to_regclass('public.cards_panoramas') is null`)).toBe(true);
      expect(await one(db, `select count(*) from information_schema.columns where table_name = 'cards_photos' and column_name = 'parts'`)).toBe(0);
    };
    for (const t of ['23:50', '23:59', '00:00', '00:29']) expect(await failsWith(db, EMPTY.sql, t), t).toMatch(/refused between 23:50 and 00:30 UTC/);
    expect(await failsWith(db, EMPTY.sql, '00:30')).toBeNull(); // not refused at 00:30 (then rolled back below)
    await db.exec(EMPTY.rollback);
    await none();
    // a function that is not the expected version, one by one
    for (const [fn, sig, who] of [
      ['cards_build_catalog', '', '117'], ['cards_catalog_append', 'p_dry_run boolean default true', '114'],
      ['cards_craft', 'p_user uuid, p_key text, p_card_no integer, p_now timestamptz default now(), p_timer_cap integer default 40', '110'],
    ] as const) {
      await db.exec('begin');
      await db.exec(`create or replace function public.${fn}(${sig}) returns jsonb language sql as $$ select '{}'::jsonb $$`);
      expect(await failsWith(db, EMPTY.sql), fn).toMatch(new RegExp(`${fn}\\(\\) is not the version of ${who}`));
      await db.exec('rollback');
    }
    await none();
    // a pack, a card
    await db.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000b1')`);
    await db.exec(`insert into public.cards_owned (user_id, card_no) values ('00000000-0000-4000-8000-0000000000b1', 1)`);
    expect(await failsWith(db, EMPTY.sql)).toMatch(/a player owns a card/);
    await none();
    await db.exec(`insert into public.cards_packs (user_id, source, cards, opened_at) values ('00000000-0000-4000-8000-0000000000b1', 'stock', array[1,1,1,1,1], now())`);
    expect(await failsWith(db, EMPTY.sql)).toMatch(/a pack was opened/);
    await none();
    // a panorama owned (a stand-in table, as a later state would hold it)
    const d2 = await prodDb();
    await d2.exec(`create table public.cards_panoramas_owned (user_id uuid, pano_no integer); insert into public.cards_panoramas_owned values ('00000000-0000-4000-8000-0000000000b1', 1)`);
    expect(await failsWith(d2, EMPTY.sql)).toMatch(/a player owns a panorama/);
    // without the tables
    const bare = await (await import('./sql-harness')).freshCardsDb();
    expect(await failsWith(bare, EMPTY.sql)).toMatch(/is missing/);
  });
});

describe('118-group-parts.sql: the data', () => {
  it('lands by source_page on group photos only, logs the old values, counts, and a second run changes nothing', async () => {
    const db = await prodDb();
    const pick = async (status: string, kind: string, n: number, skip = 0) =>
      rows<{ id: number; source_page: string; focal_x: number; focal_y: number; review_note: string | null }>(db,
        `select p.id, p.source_page, p.focal_x, p.focal_y, p.review_note from cards_photos p join cards_entities e on e.id = p.entity_id
          where p.status = '${status}' and e.kind = '${kind}' order by p.id offset ${skip} limit ${n}`);
    const [a, e2] = await pick('auto', 'group', 2);
    const [b] = await pick('approved', 'group', 1);
    const [c] = await pick('pending', 'group', 1);
    const [d] = await pick('auto', 'group', 1, 2);
    const [idol] = await pick('auto', 'idol', 1);
    const [f] = await pick('auto', 'group', 1, 3);
    const data = [
      entry(a!.source_page, { parts: 3, heads_box: { x0: 5, x1: 95, y0: 20, y1: 55, hw: 4 }, note: '3 cards: moved', by: 'thumbnail', focal_from: { x: a!.focal_x, y: a!.focal_y }, focal: { x: 35, y: 60 } }),
      // the owner moved this one since the verdict: the focal point stays, a notice says so
      entry(e2!.source_page, { parts: 2, note: '2 cards: kept', focal_from: { x: (e2!.focal_x + 7) % 100, y: e2!.focal_y }, focal: { x: 20, y: 20 } }),
      entry(b!.source_page, { parts: 3, note: 'To review: someone would be cut even in 3 cards (5 people in the photo)', review: true, by: 'thumbnail' }),
      entry(c!.source_page, { parts: 3, note: 'wide photo, no thumbnail', review: true }),
      entry(d!.source_page, { parts: 2, note: 'x', rejected: true, review: true }),
      entry(idol!.source_page, { parts: 2 }),
      entry(page(999), { parts: 3 }),
      entry(f!.source_page, { parts: 3, note: 'same focal', focal_from: { x: f!.focal_x, y: f!.focal_y }, focal: { x: f!.focal_x, y: f!.focal_y } }),
    ];
    const T = build(data);
    const before = await photoRows(db);
    const cat = await catalog(db);
    const notices = await run(db, T.sql);
    expect(notices).toContain('118-group-parts: photos set to 2: 2, to 3: 4, focal points moved 1, kept (owner\'s) 1, to review 2, rejected 1, pages not found 2');
    expect(notices.some((n) => n.startsWith('118-group-parts: focal point kept for ' + e2!.source_page))).toBe(true);
    expect(notices.some((n) => /not rebuilt by this file/.test(n))).toBe(true);
    const now = Object.fromEntries((await rows<{ id: number; parts: number | null; status: string; review_note: string; focal_x: number; focal_y: number; heads_box: unknown; parts_note: string }>(db,
      'select id, parts, status, review_note, focal_x, focal_y, heads_box, parts_note from cards_photos')).map((r) => [r.id, r]));
    expect(now[a!.id]).toMatchObject({ parts: 3, status: 'auto', focal_x: 35, focal_y: 60, parts_note: '3 cards: moved', heads_box: { x0: 5, x1: 95, y0: 20, y1: 55, hw: 4 } });
    expect(now[e2!.id]).toMatchObject({ parts: 2, focal_x: e2!.focal_x, focal_y: e2!.focal_y, heads_box: null });
    expect(now[b!.id]).toMatchObject({ parts: 3, status: 'pending', review_note: 'To review: someone would be cut even in 3 cards (5 people in the photo)' });
    expect(now[c!.id]!.status).toBe('pending');
    expect(now[c!.id]!.review_note).toContain('To review: wide photo, no thumbnail');
    if (c!.review_note) expect(now[c!.id]!.review_note.startsWith(c!.review_note)).toBe(true);
    expect(now[d!.id]).toMatchObject({ parts: 2, status: 'rejected', review_note: REJECTED_NOTE });
    expect(now[idol!.id]).toMatchObject({ parts: null, parts_note: null });
    expect(now[f!.id]).toMatchObject({ parts: 3, focal_x: f!.focal_x });
    // every other photo is untouched, and the old values are in the log (only the rows whose status, note or focal point changed)
    const log = await rows<{ photo_id: number; status: string; review_note: string | null; focal_x: number; focal_y: number }>(db, 'select * from cards_parts_log order by photo_id');
    expect(log.map((l) => l.photo_id)).toEqual([a!.id, b!.id, c!.id, d!.id].sort((x, y) => x - y));
    for (const l of log) {
      const was = before.find((r) => r.id === l.photo_id)!;
      expect(l).toMatchObject({ status: was.status, review_note: was.review_note, focal_x: was.focal_x, focal_y: was.focal_y });
    }
    const touched = new Set([a!.id, e2!.id, b!.id, c!.id, d!.id, f!.id]);
    expect((await photoRows(db)).filter((r) => !touched.has(r.id as number))).toEqual(before.filter((r) => !touched.has(r.id as number)));
    // the catalog is not rebuilt by the file
    expect(await catalog(db)).toEqual(cat);
    // a second run changes nothing
    const snap = JSON.stringify(await rows(db, 'select * from cards_photos order by id'));
    const again = await run(db, T.sql);
    expect(again).toEqual(['118-group-parts: already applied, nothing changed']);
    expect(JSON.stringify(await rows(db, 'select * from cards_photos order by id'))).toBe(snap);
    expect(await one(db, 'select count(*) from cards_parts_log')).toBe(4);
    // the Verify lines hold
    for (const line of T.sql.split('\n').filter((l) => l.startsWith('-- Verify:'))) {
      const m = /^-- Verify: (.*?);\s{3}expect (\S+)/.exec(line)!;
      const v = await one<unknown>(db, m[1]!);
      expect(String(v === true ? 't' : v === false ? 'f' : v), line).toBe(m[2]);
    }
    // rollback: the photo rows are what they were
    await db.exec(T.rollback);
    expect(await photoRows(db)).toEqual(before);
  });
});

describe('118-group-parts.sql: the catalog of 2 and 3 parts, the panoramas, the append', () => {
  it('a photo in 2 keeps exactly today\'s catalog (the 117 build), then 3 gives consecutive parts with their own small_2x and the Full Art rule', async () => {
    const db = await prodDb();
    await addGroup(db, 'group:zz', ZZ, 'zz');
    await db.exec('select public.cards_build_catalog()'); // 117's build, every photo a pair
    const today = await catalog(db);
    const todayFns = await md5s(db);
    await run(db, EMPTY.sql);
    expect(Object.keys(await md5s(db))).toHaveLength(4);
    expect(await md5s(db)).not.toEqual(todayFns);
    // zz's photos are in 2 or 3 by the owner's choice (the column exists now)
    await one(db, 'select 1'); // the parts column
    await db.exec(`update cards_photos set parts = null where entity_id = 'group:zz'`);
    const sum = await one<{ cards: number; panoramas: number }>(db, 'select public.cards_build_catalog()');
    expect(await catalog(db)).toEqual(today);
    expect(sum.panoramas).toBe(today.filter((c) => c.part === 1).length);
    // now the owner's choices
    await addGroupParts(db);
    const s2 = await one<{ cards: number; panoramas: number }>(db, 'select public.cards_build_catalog()');
    const cs = await rows<{ card_no: number; entity_id: string; rarity: string; part: number; photo_id: number; small_2x: boolean }>(db,
      `select card_no, entity_id, rarity, part, photo_id, small_2x from cards_catalog order by card_no`);
    expect(cs.map((c) => c.card_no)).toEqual(Array.from({ length: cs.length }, (_, i) => i + 1));
    const ph = Object.fromEntries((await rows<{ id: number; source_width: number; source_height: number; parts: number | null; focal_x: number; focal_y: number }>(db,
      `select id, source_width, source_height, parts, focal_x, focal_y from cards_photos where entity_id = 'group:zz'`)).map((r) => [r.id, r]));
    const zz = cs.filter((c) => c.entity_id === 'group:zz');
    const eds = [...new Set(zz.map((c) => c.rarity))];
    expect(eds.length).toBe(6);
    for (const r of eds) {
      const set = zz.filter((c) => c.rarity === r);
      const p = ph[set[0]!.photo_id]!;
      const n = p.parts ?? 2;
      // the parts 1..n, consecutive numbers
      expect(set.map((c) => c.part)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
      expect(set.map((c) => c.card_no)).toEqual(Array.from({ length: n }, (_, i) => set[0]!.card_no + i));
      // small_2x per part follows the geometry of the owner's script (splitParts of groupBox)
      const parts = splitParts(groupBox(p.source_width, p.source_height, n, p.focal_x, p.focal_y), n);
      expect(set.map((c) => c.small_2x)).toEqual(parts.map((q: { width: number }) => q.width < 640));
      // Full Art needs every part at 640 px
      if (r === 'L') expect(parts.every((q: { width: number }) => q.width >= 640)).toBe(true);
    }
    // the photo of 600 px parts is never the Full Art one, the 3 x 1100 one is
    const small = Number(Object.keys(ph).find((k) => ph[Number(k)]!.source_width === 1800));
    expect(zz.find((c) => c.rarity === 'L')!.photo_id).not.toBe(small);
    // 3 part photos exist among zz's cards
    expect(zz.some((c) => c.part === 3)).toBe(true);
    expect(s2.cards).toBe(cs.length);
    // panoramas: one per group edition, P-0001 up in catalog order, the edition and the parts of its cards
    const pa = await rows<{ pano_no: number; num: string; entity_id: string; rarity: string; edition: string; parts: number; first_card: number; photo_id: number }>(db,
      'select * from cards_panoramas order by pano_no');
    const eds2 = cs.filter((c) => c.part === 1);
    expect(pa.map((x) => x.pano_no)).toEqual(eds2.map((_, i) => i + 1));
    expect(pa.map((x) => x.num)).toEqual(eds2.map((_, i) => `P-${String(i + 1).padStart(4, '0')}`));
    expect(pa.map((x) => x.first_card)).toEqual(eds2.map((c) => c.card_no));
    for (const x of pa) {
      const own = cs.filter((c) => c.entity_id === x.entity_id && c.rarity === x.rarity);
      expect(x.parts).toBe(own.length);
      expect(x.photo_id).toBe(own[0]!.photo_id);
      expect(x.edition).toBe((await one<string>(db, `select edition from cards_catalog where card_no = ${x.first_card}`)));
    }
    expect(s2.panoramas).toBe(pa.length);
    expect(await one(db, `select count(*) from cards_panoramas where entity_id not like 'group:%'`)).toBe(0);
    // a rebuild is stable
    await db.exec('select public.cards_build_catalog()');
    expect(await rows(db, 'select pano_no, num, entity_id, rarity, first_card from cards_panoramas order by pano_no')).toEqual(pa.map(({ pano_no, num, entity_id, rarity, first_card }) => ({ pano_no, num, entity_id, rarity, first_card })));
    // the rebuild refuses when a panorama is owned
    await db.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000c1')`);
    await db.exec(`insert into cards_panoramas_owned (user_id, pano_no, source) values ('00000000-0000-4000-8000-0000000000c1', 1, 'craft')`);
    expect(await failsWith(db, 'select public.cards_build_catalog();')).toMatch(/a player owns a panorama/);
  });

  it('the append adds the parts and a panorama after the highest P number, a dry run writes nothing, a second call adds 0', async () => {
    const db = await prodDb();
    await run(db, EMPTY.sql);
    await db.exec('select public.cards_build_catalog()');
    const maxP = await one<number>(db, 'select max(pano_no) from cards_panoramas');
    const maxC = await one<number>(db, 'select max(card_no) from cards_catalog');
    await addGroup(db, 'group:zy', [ZZ[0]!, ZZ[1]!, ZZ[2]!], 'zy');
    const cat = await catalog(db);
    const dry = await one<{ cards: number; panoramas: number; from_no: number; dry_run: boolean }>(db, 'select public.cards_catalog_append(true)');
    expect(dry).toMatchObject({ dry_run: true, from_no: maxC + 1 });
    expect(await catalog(db)).toEqual(cat);
    expect(await one(db, 'select max(pano_no) from cards_panoramas')).toBe(maxP);
    const w = await one<{ cards: number; panoramas: number; subjects: number }>(db, 'select public.cards_catalog_append(false)');
    expect(w.cards).toBe(3 + 2 + 3);
    expect(w.panoramas).toBe(3);
    expect(dry.cards).toBe(8);
    expect(dry.panoramas).toBe(3);
    const zy = await rows<{ card_no: number; rarity: string; part: number }>(db, `select card_no, rarity, part from cards_catalog where entity_id = 'group:zy' order by card_no`);
    expect(zy.map((c) => c.card_no)).toEqual(Array.from({ length: 8 }, (_, i) => maxC + 1 + i));
    const pz = await rows<{ pano_no: number; num: string; rarity: string; parts: number; first_card: number }>(db, `select pano_no, num, rarity, parts, first_card from cards_panoramas where entity_id = 'group:zy' order by pano_no`);
    expect(pz.map((x) => x.pano_no)).toEqual([maxP + 1, maxP + 2, maxP + 3]);
    for (const x of pz) {
      const own = zy.filter((c) => c.rarity === x.rarity);
      expect(x.parts).toBe(own.length);
      expect(x.first_card).toBe(own[0]!.card_no);
      expect(own.map((c) => c.part)).toEqual(Array.from({ length: own.length }, (_, i) => i + 1));
    }
    expect((await one<{ cards: number }>(db, 'select public.cards_catalog_append(false)')).cards).toBe(0);
    expect(await one(db, 'select count(*) from cards_panoramas')).toBe(maxP + 3);
  });
});

async function addGroupParts(db: Awaited<ReturnType<typeof prodDb>>): Promise<void> {
  for (const [i, p] of ZZ.entries()) await db.query('update cards_photos set parts = $1 where entity_id = $2 and slot = $3', [p.parts, 'group:zz', i + 1]);
}

describe('118-group-parts.sql: safeupdate', () => {
  it('no cards_* function of the database holds an UPDATE or a DELETE without a WHERE once 118 is applied', async () => {
    const db = await prodDb();
    await run(db, EMPTY.sql);
    const fns = await rows<{ name: string; src: string }>(db, `select proname as name, prosrc as src from pg_proc where pronamespace = 'public'::regnamespace and proname like 'cards\\_%'`);
    expect(fns.length).toBeGreaterThan(40);
    expect(fns.flatMap((f) => unguardedWrites(f.src).map((u) => `${f.name}: ${u.kind} ${u.statement.slice(0, 80)}`))).toEqual([]);
    expect(fns.find((f) => f.name === 'cards_build_catalog')!.src).toContain('delete from public.cards_panoramas where true;');
  });
});

describe('118-group-parts.rollback.sql', () => {
  it('gives back every function (md5), the rows from the log, drops what 118 added, a second rollback changes nothing, and it is refused once a pack was opened', async () => {
    const db = await prodDb();
    await addGroup(db, 'group:zz', ZZ, 'zz');
    await db.exec('select public.cards_build_catalog()');
    const fns0 = await md5s(db);
    const cat0 = await catalog(db);
    const photos0 = await photoRows(db);
    const first = (await rows<{ source_page: string; focal_x: number; focal_y: number }>(db, `select source_page, focal_x, focal_y from cards_photos where entity_id = 'group:zz' order by slot`));
    const T = build([
      entry(first[0]!.source_page, { parts: 3, focal_from: { x: 50, y: 50 }, focal: { x: 20, y: 40 } }),
      entry(first[1]!.source_page, { parts: 3, review: true, note: 'To review: someone is cut' }),
      entry(first[2]!.source_page, { parts: 3, rejected: true, note: 'x' }),
    ]);
    await run(db, T.sql);
    await db.exec('select public.cards_build_catalog()');
    expect(await one(db, 'select max(part) from cards_catalog')).toBe(3);
    // refused once a pack was opened, with nothing changed
    await db.exec(`insert into auth.users (id) values ('00000000-0000-4000-8000-0000000000d1')`);
    await db.exec(`insert into cards_packs (user_id, source, cards, opened_at) values ('00000000-0000-4000-8000-0000000000d1', 'stock', array[1,1,1,1,1], now())`);
    const fns1 = await md5s(db);
    expect(await failsWith(db, T.rollback)).toMatch(/refused, a pack was opened/);
    expect(await md5s(db)).toEqual(fns1);
    expect(await one(db, `select count(*) from cards_panoramas`)).toBeGreaterThan(0);
    await db.exec('delete from cards_packs where true');
    await run(db, T.rollback);
    expect(await md5s(db)).toEqual(fns0);
    expect(await photoRows(db)).toEqual(photos0);
    for (const t of ['cards_panoramas', 'cards_panoramas_owned', 'cards_parts_log']) expect(await one(db, `select to_regclass('public.${t}') is null`)).toBe(true);
    expect(await one(db, `select count(*) from information_schema.columns where table_name = 'cards_photos' and column_name in ('parts', 'file_parts', 'file_pano', 'heads_box', 'parts_note')`)).toBe(0);
    expect(await one(db, `select pg_get_constraintdef(oid) from pg_constraint where conname = 'cards_catalog_part_check'`)).toMatch(/part <= 2/);
    // the 3 part cards went back to pairs through the old function
    expect(await one(db, 'select max(part) from cards_catalog')).toBe(2);
    expect((await catalog(db)).length).toBe(cat0.length);
    expect(await catalog(db)).toEqual(cat0);
    const notices = await run(db, T.rollback);
    expect(notices).toEqual(['118-group-parts.rollback: already rolled back, nothing changed']);
    expect(await md5s(db)).toEqual(fns0);
    // and 118 applies again
    expect((await run(db, T.sql)).some((n) => /photos set to 2/.test(n))).toBe(true);
  });
});
