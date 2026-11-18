// Bunnyverse Cards, lot LAUNCH-PREP lane REFILL: proof of docs/pending-migrations/cards/123-refill.sql (built by refill-sql.ts from refill-data.ts)
// on PGlite in the state production has after 119 (the bundle 099 to 115, then 116, 117, 118 and 119). Checked: the file is one DO block with
// its header and no dash; it refuses without 119 and between 23:50 and 00:30 UTC; it adds the new photos (approved, no file, in a free slot),
// approves the accepted pending photos, gives the cards 119 took out of the packs their photo back by the owner's rule (the best looking photo
// on the rarest edition kept), keeps every number and owned copy, and the cards of a new photo enter the packs once the workflow cuts it; a
// second run changes nothing; a subject whose rows changed since 119 is left alone; the rollback gives the state after 119 back exactly. Then the
// committed file on the rows of the export with the committed 119 (every Verify line, idempotent, the rollback), and lot8/photos.json: every
// new photo of 123 is there, so the publish workflow finds its original by source page.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { mergePhotoFiles } from '../../../scripts/cards/card-files.mjs';

import { build, failsWith, prodDb, run } from './parts-fixture';
import { planSubject, type Rarity } from './photocheck-plan';
import { buildPhotocheck, type PcUnit } from './photocheck-sql';
import { after119, chooseSlot, refillData, type RefillNew, type State, type StatePhoto } from './refill-data';
import { buildRefill, dataLiteral, type RefillData } from './refill-sql';
import { CARDS_SQL, one, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const ADA = 'idol:rf-ada';
const ZZ = 'group:rf-zz';
const U9 = '00000000-0000-4000-8000-0000000000d9';

/** Every row of the tables 119 and 123 touch, as one fingerprint. */
const STATE = `select md5(string_agg(t, E'\\n' order by t)) from (
  select 'c' || to_jsonb(c)::text as t from public.cards_catalog c union all select 'p' || to_jsonb(p)::text from public.cards_photos p
  union all select 'z' || to_jsonb(z)::text from public.cards_panoramas z union all select 'e' || to_jsonb(e)::text from public.cards_entities e
  union all select 'o' || to_jsonb(o)::text from public.cards_owned o) x`;

interface PRow extends StatePhoto { quality: number }
const photosOf = (db: PGlite, ids: string[] = [ADA, ZZ]): Promise<PRow[]> => rows<PRow>(db, `select id, entity_id, slot, status, focal_x, focal_y, file_focal_x, file_focal_y,
  storage_path, source_path, parts, source_width, source_height, stage, source_page, sha1, quality from public.cards_photos where entity_id = any ($1) order by id`, [ids]);
async function stateOf(db: PGlite): Promise<State> {
  return {
    photos: await photosOf(db),
    catalog: await rows(db, `select card_no, entity_id, rarity, part, photo_id, in_packs from public.cards_catalog where entity_id in ('${ADA}', '${ZZ}') order by card_no`),
    panoramas: await rows(db, `select pano_no, entity_id, rarity, photo_id, first_card from public.cards_panoramas where entity_id in ('${ADA}', '${ZZ}') order by pano_no`),
    entities: await rows(db, `select id, kind, lock_reasons from public.cards_entities where id in ('${ADA}', '${ZZ}')`),
  } as State;
}

/** Production with 118 applied, plus a person with six live photos and a pending one, and a group with three photos (two in 3 parts, one in 2);
 *  the catalog built, the files cut, a card owned. Then a 119 of the test: two photos of the person and one of the group replaced, the rule on
 *  the rest (UR and L of the person, one edition of the group leave the packs). */
async function world(): Promise<{ db: PGlite; before119: string }> {
  const db = await prodDb();
  await run(db, build([]).sql);
  await db.exec(`insert into public.cards_entities (id, kind, name, sort_key, active) values ('${ADA}', 'idol', 'Ada', 'zzz-rf-ada', true), ('${ZZ}', 'group', 'ZZ', 'zzz-rf-zz', true)`);
  const ins = async (entity: string, slot: number, w: number, h: number, q: number, status: string, parts: number | null, stage = false): Promise<void> => {
    await db.query(`insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at,
        source_width, source_height, status, quality, stage, focal_x, focal_y, event_date, parts, sha1)
      values ($1, $2, 'commons', $3, 'https://upload.wikimedia.org/x.jpg', 'A', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', false, '2026-11-17',
        $4, $5, $6, $7, $8, 50, 30, $9, $10, $11)`,
    [entity, slot, `https://commons.wikimedia.org/wiki/File:${entity.replace(':', '_')}_${slot}_${status}.jpg`, w, h, status, q, stage, `2025-01-${String(10 + slot)}`, parts,
      `${entity}${slot}${status}`.split('').map((c) => c.charCodeAt(0).toString(16)).join('').padEnd(40, '0').slice(0, 40)]);
  };
  for (let s = 1; s <= 6; s++) await ins(ADA, s, 1000 + s, 1600, 4, 'auto', null, s === 2);
  await ins(ZZ, 1, 4000, 1700, 5, 'auto', 3);
  await ins(ZZ, 2, 2000, 1600, 4, 'auto', 2);
  await ins(ZZ, 3, 3900, 1700, 3, 'auto', 3);
  await db.exec(`select public.cards_build_catalog()`);
  await db.exec(`update public.cards_photos set storage_path = 'stem-' || id, file_focal_x = focal_x, file_focal_y = focal_y where entity_id in ('${ADA}', '${ZZ}') and status = 'auto'`);
  // a pending photo of the person, in the slot of a photo 119 replaces
  await ins(ADA, 6, 1100, 1700, 3, 'pending', null);
  await db.exec(`insert into auth.users (id) values ('${U9}')`);
  const lCard = await one<number>(db, `select card_no from public.cards_catalog where entity_id = '${ADA}' and rarity = 'L'`);
  await db.exec(`insert into public.cards_owned (user_id, card_no, copies) values ('${U9}', ${lCard}, 2)`);
  const before119 = await one<string>(db, STATE);
  // the 119 of the test, built with the rule of 119
  const st = await stateOf(db);
  const units: PcUnit[] = [];
  const a = st.photos.filter((p) => p.entity_id === ADA && p.status === 'auto');
  const z = st.photos.filter((p) => p.entity_id === ZZ);
  for (const [entity, rejected, pool] of [[ADA, [a[4]!, a[5]!], [a[2]!, a[0]!, a[1]!, a[3]!]], [ZZ, [z[0]!], [z[1]!, z[2]!]]] as const) {
    const cs = st.catalog.filter((c) => c.entity_id === entity);
    const eds = (['C', 'U', 'R', 'SR', 'UR', 'L'] as Rarity[]).filter((r) => cs.some((c) => c.rarity === r));
    const group = entity.startsWith('group:');
    const r = planSubject(eds.map((x) => ({ rarity: x, cards: cs.filter((c) => c.rarity === x).length })),
      pool.map((p) => { const np = group ? (p.parts ?? 2) : 1; const cw = Math.floor(Math.min(p.source_width, (p.source_height * np * 5.5) / 8.5)); return { id: p.id, parts: np, fullOk: Math.floor(cw / np) >= 640, stage: p.stage }; }),
      Object.fromEntries(eds.map((x) => [x, cs.find((c) => c.rarity === x)!.photo_id])) as Partial<Record<Rarity, number>>);
    const lock = st.entities.find((e) => e.id === entity)!.lock_reasons;
    units.push({
      entity,
      photos: rejected.map((p) => ({ id: p.id, old: { status: 'auto', fx: p.focal_x, fy: p.focal_y, ffx: p.file_focal_x, ffy: p.file_focal_y }, new: { status: 'rejected' }, note: 'test: replaced' })),
      cards: cs.filter((c) => ((r.assign as Record<string, number>)[c.rarity] ?? null) !== c.photo_id)
        .map((c) => ({ no: c.card_no, old: { photo: c.photo_id, in_packs: c.in_packs }, new: { photo: (r.assign as Record<string, number>)[c.rarity] ?? null } })),
      panos: st.panoramas.filter((x) => x.entity_id === entity && ((r.assign as Record<string, number>)[x.rarity] ?? null) !== x.photo_id)
        .map((x) => ({ no: x.pano_no, old: x.photo_id, new: (r.assign as Record<string, number>)[x.rarity] ?? null })),
      lock: r.dropped.length ? { old: lock, new: { ...lock, ...Object.fromEntries(r.dropped.map((d) => [d, r.lock[d]!])) } } : null,
    });
  }
  const pc = buildPhotocheck({ checked_on: '2026-11-17', export: 'test', units, expect: { units: 2, catalog: 0, dropped: 0, inPacks: 0, inPacksAfterPublish: 0, nullPanos: 0, toCut: 0, statuses: {} } });
  expect((await run(db, pc.sql)).join('\n')).toMatch(/2 subjects applied/);
  return { db, before119 };
}

const newPhoto = (key: string, o: Partial<RefillNew> = {}): RefillNew => ({
  key, page: `https://commons.wikimedia.org/wiki/File:${key}.jpg`, url: `https://upload.wikimedia.org/wikipedia/commons/a/ab/${key}.jpg`,
  sha1: key.split('').map((c) => c.charCodeAt(0).toString(16)).join('').padEnd(40, 'a').slice(0, 40), author: 'B', author_url: null, licence: 'CC BY 4.0',
  licence_url: 'https://creativecommons.org/licenses/by/4.0', share_alike: false, date: '2025-06-01', event: 'a press call', stage: false, quality: 5,
  fx: 50, fy: 30, width: 1400, height: 2100, parts: null, note: 'Refill 2026-11-18 (file 123): test', ...o,
});

/** The refill of the test: the person gets a new photo (the best looking) and its pending photo (the least); the group a new photo in 3 parts. */
async function scenario(): Promise<{ db: PGlite; data: RefillData; sql: ReturnType<typeof buildRefill>; st: State; before119: string; owned: number }> {
  const { db, before119 } = await world();
  const st = await stateOf(db);
  const live = (e: string) => st.photos.filter((p) => p.entity_id === e && (p.status === 'auto' || p.status === 'approved'));
  const a = live(ADA);
  const pend = st.photos.find((p) => p.entity_id === ADA && p.status === 'pending')!;
  const z = live(ZZ);
  const { data } = refillData(st, [
    { entity: ADA, pool: ['rf-ada-new', ...a.map((p) => p.id), pend.id], add: [newPhoto('rf-ada-new')], approve: [{ id: pend.id, note: 'Refill 2026-11-18 (file 123): accepted' }] },
    { entity: ZZ, pool: [...z.map((p) => p.id), 'rf-zz-new'], add: [newPhoto('rf-zz-new', { width: 4200, height: 1800, parts: 3, fx: 50, fy: 50, quality: 3 })], approve: [] },
  ], '2026-11-18', 'test');
  const owned = await one<number>(db, `select card_no from public.cards_owned where user_id = '${U9}'`);
  return { db, data, sql: buildRefill(data), st, before119, owned };
}

describe('123-refill.sql: the file', () => {
  it('is one DO block with its header and its Verify lines, without a dash, and so is its rollback', async () => {
    const { sql } = await scenario();
    expect(sql.sql.match(/^do \$c123\$$/gm)).toHaveLength(1);
    expect(sql.rollback.match(/^do \$c123r\$$/gm)).toHaveLength(1);
    for (const k of ['What:', 'Why:', 'Scope:', 'Rows:', 'Needs:', 'Verify:', 'Refuses:', 'Undo:', 'o1-transaction: single, ONE DO block']) expect(sql.sql).toContain(`-- ${k}`);
    expect(sql.sql.match(/^-- Verify:/gm)!.length).toBeGreaterThanOrEqual(14);
    expect(sql.rollback).toMatch(/^-- Verify:/m);
    expect(sql.sql + sql.rollback).not.toMatch(/[\u2013\u2014]/);
    expect(sql.sql.match(/\(now\(\) at time zone 'UTC'\)::time/g)).toHaveLength(1);
    expect(sql.rollback.match(/\(now\(\) at time zone 'UTC'\)::time/g)).toHaveLength(1);
    // never cards_owned, XP, level, streak or badges
    const code = (sql.sql + sql.rollback).split('\n').filter((l) => !l.startsWith('--')).join('\n');
    expect(code).not.toMatch(/(update|insert into|delete from)\s+public\.cards_owned|\bxp\b|streak|badge|\blevel\b(?! security)/i);
  });

  it('refuses data it cannot trust', async () => {
    const { data } = await scenario();
    const u = data.units[0]!;
    expect(() => dataLiteral({ ...data, units: [u, { ...u }] })).toThrow(/listed twice/);
    const n = u.add[0]!;
    expect(() => dataLiteral({ ...data, units: [{ ...u, add: [{ ...n, licence: 'CC BY-NC 4.0' }] }] })).toThrow(/free licence/);
    expect(() => dataLiteral({ ...data, units: [{ ...u, add: [{ ...n, slot: u.photos.find((p) => p.status === 'auto')!.slot }] }] })).toThrow(/held by another live photo/);
    expect(() => dataLiteral({ ...data, units: [{ ...u, cards: u.cards.map((c) => ({ ...c, new: c.new === n.key ? null : c.new })) }] })).toThrow(/goes on no card/);
    const rejected = u.photos.find((p) => p.status === 'rejected')!;
    expect(() => dataLiteral({ ...data, units: [{ ...u, cards: u.cards.map((c, i) => (i === 0 ? { ...c, new: rejected.id } : c)) }] })).toThrow(/is not live/);
    expect(() => dataLiteral({ ...data, units: [{ ...u, add: [{ ...n, note: 'x $rf$ y' }] }] })).toThrow(/quote/);
    expect(() => dataLiteral({ ...data, units: [{ ...u, add: [{ ...n, parts: 2 }] }] })).toThrow(/parts/);
  });

  it('chooses a slot no live photo holds, first one no pending photo holds, then one whose stem is not an older file', () => {
    const p = (slot: number, status: StatePhoto['status'], storage_path: string | null = null) => ({ slot, status, storage_path }) as StatePhoto;
    expect(chooseSlot([p(1, 'auto'), p(2, 'pending'), p(3, 'rejected', 'ada-s3-50-30')], new Set([1]), 'ada', 50, 30)).toBe(4);
    expect(chooseSlot([p(1, 'auto'), p(3, 'rejected', 'ada-s3-50-30')], new Set([1]), 'ada', 50, 30)).toBe(2);
    expect(() => chooseSlot([], new Set([1, 2, 3, 4, 5, 6]), 'ada', 50, 30)).toThrow(/no free slot/);
  });

  it('the committed 123 holds no birth date and stays under 400 KB', () => {
    const f = path.join(CARDS_SQL, '123-refill.sql');
    if (!existsSync(f)) return;
    const sql = readFileSync(f, 'utf8');
    expect(sql.length).toBeLessThan(400_000);
    expect(sql).not.toMatch(/birth/i);
    expect(sql).not.toMatch(/[\u2013\u2014]/);
  });
});

describe('123-refill.sql on the database', () => {
  it('adds and approves photos, brings the dropped cards back by the rule, keeps every number and owned copy, and a second run changes nothing', async () => {
    const { db, sql, st, owned } = await scenario();
    const before = await rows<{ card_no: number; num: string; rarity: string; part: number }>(db, `select card_no, num, rarity, part from public.cards_catalog order by card_no`);
    const notices = await run(db, sql.sql);
    expect(notices.join('\n')).toMatch(/2 subjects applied, 0 already applied, 0 left alone/);
    expect(notices.join('\n')).toMatch(/new photos 2, pending photos approved 1/);
    expect(await rows(db, `select card_no, num, rarity, part from public.cards_catalog order by card_no`)).toEqual(before);
    expect(await one<number>(db, `select copies from public.cards_owned where user_id = '${U9}' and card_no = ${owned}`)).toBe(2);
    const p = await photosOf(db);
    const nAda = p.find((x) => x.source_page.endsWith('rf-ada-new.jpg'))!;
    const nZz = p.find((x) => x.source_page.endsWith('rf-zz-new.jpg'))!;
    expect(nAda).toMatchObject({ status: 'approved', storage_path: null, source_path: null, parts: null, quality: 5 });
    expect(nZz).toMatchObject({ status: 'approved', storage_path: null, parts: 3 });
    // a slot no live photo held (the person's replaced slots were 5 and 6; 6 is the pending photo's, so 5)
    expect(nAda.slot).toBe(5);
    const pend = st.photos.find((x) => x.entity_id === ADA && x.status === 'pending')!;
    expect(p.find((x) => x.id === pend.id)!.status).toBe('approved');
    const card = (e: string, r: string) => rows<{ photo_id: number | null; in_packs: boolean; card_no: number }>(db,
      `select photo_id, in_packs, card_no from public.cards_catalog where entity_id = '${e}' and rarity = '${r}' order by card_no`);
    // the best looking photo (the new one) on the rarest edition, L, which is the owned card; out of the packs until its file is cut
    expect((await card(ADA, 'L'))[0]).toMatchObject({ photo_id: nAda.id, in_packs: false, card_no: owned });
    // UR comes back at once on a photo that has its files; U keeps the on-stage photo; C takes the accepted pending photo
    expect((await card(ADA, 'UR'))[0]!.in_packs).toBe(true);
    expect((await card(ADA, 'U'))[0]!.photo_id).toBe(st.photos.find((x) => x.entity_id === ADA && x.stage)!.id);
    expect((await card(ADA, 'C'))[0]!.photo_id).toBe(pend.id);
    expect(await one(db, `select lock_reasons from public.cards_entities where id = '${ADA}'`)).toEqual({});
    // the group: the new 3-part photo takes the dropped edition, its panorama follows
    expect((await rows<{ n: number }>(db, `select count(*)::int as n from public.cards_catalog where photo_id = ${nZz.id}`))[0]!.n).toBe(3);
    expect(await one<number>(db, `select count(*) from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card where z.entity_id = '${ZZ}' and z.photo_id is distinct from c.photo_id`)).toBe(0);
    expect(await one<number>(db, `select count(*) from public.cards_catalog where entity_id in ('${ADA}', '${ZZ}') and photo_id is null`)).toBe(0);
    // the publish workflow cuts the new and the approved photos: the trigger of 103 puts their cards in the packs
    await db.exec(`update public.cards_photos set storage_path = 'stem-' || id, file_focal_x = focal_x, file_focal_y = focal_y where id in (${nAda.id}, ${nZz.id}, ${pend.id})`);
    expect(await one<number>(db, `select count(*) from public.cards_catalog where entity_id in ('${ADA}', '${ZZ}') and not in_packs`)).toBe(0);
    for (const q of ['select count(*) from public.cards_catalog where in_packs and photo_id is null',
      `select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved')`,
      'select count(*) from (select entity_id, photo_id from public.cards_catalog where photo_id is not null group by entity_id, photo_id having count(distinct rarity) > 1) x',
      'select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.entity_id <> c.entity_id']) expect(await one<number>(db, q), q).toBe(0);
    // a second run changes nothing
    const s1 = await one<string>(db, STATE);
    expect((await run(db, sql.sql)).join('\n')).toMatch(/0 subjects applied, 2 already applied, 0 left alone/);
    expect(await one<string>(db, STATE)).toBe(s1);
  });

  it('a database where 119 left a subject alone: 123 leaves it alone too (its rows are not the ones 119 leaves)', async () => {
    const { db, sql } = await scenario();
    // as if 119 had applied nothing: the person's rows back to the export (its 119 rollback), its log row gone
    await run(db, (await import('./photocheck-sql')).buildPhotocheck({ checked_on: '2026-11-17', export: 'test', units: [], expect: { units: 0, catalog: 0, dropped: 0, inPacks: 0, inPacksAfterPublish: 0, nullPanos: 0, toCut: 0, statuses: {} } }).rollback);
    expect(await one(db, `select to_regclass('public.cards_photocheck_log') is null`)).toBe(true);
    expect(await failsWith(db, sql.sql)).toMatch(/119-photocheck.sql is not applied/);
    await db.exec(`create table public.cards_photocheck_log (entity_id text primary key, applied_at timestamptz not null default now(), old jsonb not null, new jsonb not null)`);
    const notices = await run(db, sql.sql);
    expect(notices.join('\n')).toMatch(/cards_photocheck_log is empty/);
    expect(notices.join('\n')).toMatch(/0 subjects applied, 0 already applied, 2 left alone/);
  });

  it('refuses when 119 is not applied, with nothing changed', async () => {
    const { db, sql, before119 } = await scenario();
    const s0 = await one<string>(db, STATE);
    await db.exec('drop table public.cards_photocheck_log');
    expect(await failsWith(db, sql.sql)).toMatch(/119-photocheck.sql is not applied \(no cards_photocheck_log\)/);
    expect(await one<string>(db, STATE)).toBe(s0);
    expect(s0).not.toBe(before119);
    expect(await one(db, `select to_regclass('public.cards_refill_log') is null`)).toBe(true);
  });

  it('leaves alone a subject whose rows changed since 119 or whose new photo is already in, and applies the others', async () => {
    const { db, sql, st } = await scenario();
    // the owner rejected a live photo of the person in the admin after 119
    const a = st.photos.find((p) => p.entity_id === ADA && p.status === 'auto')!;
    await db.exec(`update public.cards_photos set status = 'rejected' where id = ${a.id}`);
    const adaBefore = await one<string>(db, `select md5(string_agg(to_jsonb(c)::text, ',' order by c.card_no)) from public.cards_catalog c where c.entity_id = '${ADA}'`);
    const notices = await run(db, sql.sql);
    expect(notices.join('\n')).toContain(`${ADA} left alone: photo ${a.id} changed since 119`);
    expect(notices.join('\n')).toMatch(/1 subjects applied, 0 already applied, 1 left alone/);
    expect(await one<string>(db, `select md5(string_agg(to_jsonb(c)::text, ',' order by c.card_no)) from public.cards_catalog c where c.entity_id = '${ADA}'`)).toBe(adaBefore);
    expect(await one<number>(db, `select count(*) from public.cards_photos where source_page like '%rf-ada-new.jpg'`)).toBe(0);
    expect(await one<number>(db, `select count(*) from public.cards_refill_log where entity_id = '${ZZ}'`)).toBe(1);
    // a new photo already in cards_photos (the owner added it by hand): the subject is left alone
    const { db: db2, sql: sql2 } = await scenario();
    await db2.exec(`insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, status)
      values ('${ZZ}', 4, 'commons', 'https://commons.wikimedia.org/wiki/File:rf-zz-new.jpg', 'https://upload.wikimedia.org/x.jpg', 'A', 'CC BY 4.0', 'https://x', false, '2026-11-18', 'pending')`);
    expect((await run(db2, sql2.sql)).join('\n')).toContain(`${ZZ} left alone: its photos (one more or one less) changed since 119`);
  });

  it('refuses between 23:50 and 00:30 UTC with nothing changed', async () => {
    const { db, sql } = await scenario();
    const s0 = await one<string>(db, STATE);
    for (const t of ['23:50', '23:59', '00:00', '00:29']) {
      expect(await failsWith(db, sql.sql, t), t).toMatch(/refused between 23:50 and 00:30 UTC/);
      expect(await failsWith(db, sql.rollback, t), t).toMatch(/refused between 23:50 and 00:30 UTC/);
    }
    expect(await one<string>(db, STATE)).toBe(s0);
    expect(await one(db, `select to_regclass('public.cards_refill_log') is null`)).toBe(true);
  });

  it('the rollback gives the state after 119 back exactly, also after the workflow cut the new photos; then 119 rolls back to the start', async () => {
    const { db, sql, before119 } = await scenario();
    const s119 = await one<string>(db, STATE);
    await run(db, sql.sql);
    expect(await one<string>(db, STATE)).not.toBe(s119);
    await db.exec(`update public.cards_photos set storage_path = 'stem-' || id, file_focal_x = focal_x, file_focal_y = focal_y where status = 'approved' and storage_path is null and entity_id in ('${ADA}', '${ZZ}')`);
    const back = await run(db, sql.rollback);
    expect(back.join('\n')).toMatch(/2 subjects given back, 0 left alone/);
    expect(await one<string>(db, STATE)).toBe(s119);
    expect(await one(db, `select to_regclass('public.cards_refill_log') is null`)).toBe(true);
    expect((await run(db, sql.rollback)).join('\n')).toMatch(/nothing to undo/);
    // and 123 again after its rollback gives the same rows as the first time (ids aside)
    await run(db, sql.sql);
    expect(await one<number>(db, 'select count(*) from public.cards_refill_log')).toBe(2);
    await run(db, sql.rollback);
    expect(await one<string>(db, STATE)).toBe(s119);
    void before119;
  });
});

// The committed files on the rows production had at the export (out/launch-prep, git-ignored: this runs only where the export is).
const EXPORT = path.join(CARDS_SQL, '../../../out/launch-prep/cards-live-2026-11-17.json');
const ENTITIES = path.join(CARDS_SQL, '../../../out/launch-prep/cards-entities-2026-11-17.json');
const PLAN119 = path.join(CARDS_SQL, '../../../out/launch-prep/pc/plan.json');
const LOT8 = path.join(CARDS_SQL, '../../design/cards/data/lot8/photos.json');
const COMMITTED = path.join(CARDS_SQL, '123-refill.sql');

/** The data literal of a committed 123 (the jsonb between its $rf$ quotes). */
const literalOf = (sql: string): RefillData => JSON.parse(sql.slice(sql.indexOf('$rf$') + 4, sql.lastIndexOf('$rf$')));

describe.runIf(existsSync(COMMITTED))('lot8/photos.json: the publish workflow finds every new photo of 123', () => {
  it('has one entry per new photo, with its original, sha1, focal point and parts, read by mergePhotoFiles after lot 3 and lot 6', () => {
    const data = literalOf(readFileSync(COMMITTED, 'utf8'));
    const lot8 = JSON.parse(readFileSync(LOT8, 'utf8'));
    const lot3 = JSON.parse(readFileSync(path.join(CARDS_SQL, '../../design/cards/data/photos.json'), 'utf8'));
    const lot6 = JSON.parse(readFileSync(path.join(CARDS_SQL, '../../design/cards/data/lot6/photos.json'), 'utf8'));
    const merged = mergePhotoFiles(mergePhotoFiles(lot3, lot6), lot8);
    const byPage = new Map<string, { s: { slug: string; kind: string }; p: Record<string, unknown> }>(
      merged.subjects.flatMap((s: { slug: string; kind: string; photos: Array<Record<string, unknown>> }) => s.photos.filter((p) => p.status !== 'out').map((p) => [p.page as string, { s, p }])));
    const added = data.units.flatMap((u) => u.add.map((n) => ({ u, n })));
    expect(added.length).toBeGreaterThan(0);
    expect(lot8.subjects.flatMap((s: { photos: unknown[] }) => s.photos)).toHaveLength(added.length);
    for (const { u, n } of added) {
      const hit = byPage.get(n.page);
      expect(hit, n.page).toBeDefined();
      expect(hit!.s.slug).toBe(u.entity.split(':')[1]);
      expect(hit!.s.kind).toBe(u.entity.split(':')[0]);
      expect(hit!.p).toMatchObject({ url: n.url, sha1: n.sha1, status: 'approved', focal: { x: n.fx, y: n.fy }, slot: n.slot, parts: n.parts });
    }
    // the pending photos 123 approves were already in the data files (lot 3 or lot 6), not out
    for (const u of data.units) for (const a of u.approve) expect(u.photos.find((p) => p.id === a.id)!.status).toBe('pending');
    expect(readFileSync(LOT8, 'utf8')).not.toMatch(/[\u2013\u2014]|birth/i);
  });
});

describe.runIf(existsSync(EXPORT) && existsSync(ENTITIES) && existsSync(PLAN119) && existsSync(COMMITTED))('the committed 123 on the rows of the export, after the committed 119', () => {
  it('applies every subject, gives the numbers of its Verify lines, changes nothing on a second run, and the rollback gives the state after 119 back', async () => {
    const exp = JSON.parse(readFileSync(EXPORT, 'utf8')) as { photos: unknown[]; catalog: unknown[]; panoramas: unknown[]; owned_by_card: Array<{ card_no: number; owners: number; copies: number }> };
    const ents = (JSON.parse(readFileSync(ENTITIES, 'utf8')) as Array<Record<string, unknown>>).map((e) => ({ ...e, sort_key: e.id }));
    const db = await prodDb();
    await run(db, build([]).sql);
    await db.exec('truncate public.cards_panoramas_owned, public.cards_panoramas, public.cards_owned, public.cards_catalog, public.cards_photos, public.cards_entities cascade');
    await db.query(`insert into public.cards_entities select * from jsonb_populate_recordset(null::public.cards_entities, $1::jsonb)`, [JSON.stringify(ents)]);
    await db.query(`insert into public.cards_photos select * from jsonb_populate_recordset(null::public.cards_photos, $1::jsonb)`, [JSON.stringify(exp.photos)]);
    await db.exec(`select setval(pg_get_serial_sequence('public.cards_photos', 'id'), (select max(id) from public.cards_photos))`);
    await db.query(`insert into public.cards_catalog select * from jsonb_populate_recordset(null::public.cards_catalog, $1::jsonb)`, [JSON.stringify(exp.catalog)]);
    await db.query(`insert into public.cards_panoramas select * from jsonb_populate_recordset(null::public.cards_panoramas, $1::jsonb)`, [JSON.stringify(exp.panoramas)]);
    for (const [i, o] of exp.owned_by_card.entries()) {
      const u = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
      await db.exec(`insert into auth.users (id) values ('${u}') on conflict do nothing; insert into public.cards_owned (user_id, card_no, copies) values ('${u}', ${o.card_no}, ${o.copies})`);
    }
    // the state the generator read: the export with the units of 119 applied
    const plan119 = JSON.parse(readFileSync(PLAN119, 'utf8'));
    const st = after119({ photos: exp.photos, catalog: exp.catalog, panoramas: exp.panoramas, entities: ents } as unknown as State, plan119.units);
    const notices119 = await run(db, readFileSync(path.join(CARDS_SQL, '119-photocheck.sql'), 'utf8'));
    expect(notices119.join('\n')).toMatch(/0 left alone/);
    expect(await one<number>(db, `select count(*) from public.cards_catalog where in_packs`)).toBe(st.catalog.filter((c) => c.in_packs).length);
    const s119 = await one<string>(db, STATE);
    const sql = readFileSync(COMMITTED, 'utf8');
    const head = sql.slice(0, sql.indexOf('\ndo $c123$'));
    const units = Number(/-- Rows: {3}(\d+) subjects/.exec(head)![1]);
    const notices = await run(db, sql);
    expect(notices.join('\n')).toContain(`${units} subjects applied, 0 already applied, 0 left alone`);
    // every Verify line answers what it expects (the first number of "expect")
    const lines = head.split('\n').filter((l) => l.startsWith('-- Verify: '));
    expect(lines.length).toBeGreaterThanOrEqual(14);
    for (const l of lines) {
      const [q, want] = l.slice('-- Verify: '.length).split(';   expect ');
      const r = await rows<Record<string, unknown>>(db, q!);
      if (/group by status/.test(q!)) expect(r.map((x) => `${x.status} ${x.count}`).join(', '), l).toBe(want);
      else if (/group by entity_id, slot/.test(q!)) expect(r, l).toEqual([]);
      else if (/count\(\*\), min/.test(q!)) expect(Object.values(r[0]!).map(Number).join(', '), l).toBe(/^[\d, ]+/.exec(want!)![0].trim().replace(/,$/, ''));
      else expect(Number(Object.values(r[0]!)[0]), l).toBe(Number(/^\d+/.exec(want!)![0]));
    }
    expect(await one<number>(db, 'select count(*) from public.cards_owned')).toBe(exp.owned_by_card.length);
    // once the publish workflow has cut every live photo, the cards in the packs are the number the Verify line gives
    const after = Number(/expect \d+ now \(\d+ when the publish workflow ran after 119\), (\d+) once/.exec(head)![1]);
    const s1 = await one<string>(db, STATE);
    expect((await run(db, sql)).join('\n')).toContain(`0 subjects applied, ${units} already applied, 0 left alone`);
    expect(await one<string>(db, STATE)).toBe(s1);
    // the rollback of 123 gives the state after 119 back, exactly
    expect((await run(db, readFileSync(path.join(CARDS_SQL, '123-refill.rollback.sql'), 'utf8'))).join('\n')).toContain(`${units} subjects given back, 0 left alone`);
    expect(await one<string>(db, STATE)).toBe(s119);
    // the workflow after 119 and 123: every live photo cut, the packs hold the number of the Verify line
    await run(db, sql);
    await db.exec(`update public.cards_photos set storage_path = coalesce(storage_path, 'stem-' || id), file_focal_x = focal_x, file_focal_y = focal_y where status in ('auto', 'approved')`);
    expect(await one<number>(db, 'select count(*) from public.cards_catalog where in_packs')).toBe(after);
    expect(after).toBeGreaterThanOrEqual(1000);
  });
});
