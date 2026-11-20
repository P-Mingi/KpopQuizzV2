// Bunnyverse Cards, lot LAUNCH-PREP lane PHOTOCHECK: proof of docs/pending-migrations/cards/119-photocheck.sql (built by photocheck-sql.ts) and of
// the rule it follows (photocheck-plan.ts), on PGlite in the state production has (the bundle 099 to 115, then 116, 117 and 118). Checked: the
// rule (the best looking photo on the rarest edition kept, the rarest editions leave first, Stage keeps an on-stage photo, Full Art needs a 2x,
// a group edition takes a photo in as many parts as it has cards); the file is one DO block with its header and no dash; it runs; a card keeps
// its number and its owned copies; the best ranked photo ends on the rarest edition kept; a dropped card leaves the packs with no photo; a
// second run changes nothing; a subject whose rows changed since the export is left alone; the time window; the rollback gives every row back.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { build, failsWith, prodDb, run } from './parts-fixture';
import { checkPlan, dataOf } from './photocheck-data';
import { planSubject, type PlanEdition, type PlanPhoto, type Rarity } from './photocheck-plan';
import { buildPhotocheck, dataLiteral, type PcUnit, type PhotocheckData } from './photocheck-sql';
import { CARDS_SQL, one, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

const ph = (id: number, o: Partial<PlanPhoto> = {}): PlanPhoto => ({ id, parts: 1, fullOk: true, stage: false, ...o });
const eds = (...r: Rarity[]): PlanEdition[] => r.map((rarity) => ({ rarity, cards: 1 }));

describe('the rule of the photo check (planSubject)', () => {
  it('puts the best ranked photo on the rarest edition kept, and drops the rarest editions first', () => {
    const r = planSubject(eds('C', 'U', 'R', 'SR', 'UR', 'L'), [ph(5), ph(1), ph(2, { stage: true }), ph(3), ph(4)]);
    expect(r.dropped).toEqual(['L']);
    expect(r.assign.UR).toBe(5);
    expect(r.assign).toEqual({ UR: 5, SR: 1, R: 3, U: 2, C: 4 });
    expect(r.lock).toEqual({ L: 'photo' });
    const two = planSubject(eds('C', 'U', 'R', 'SR'), [ph(9), ph(8)]);
    expect(two.dropped).toEqual(['R', 'SR']);
    expect(two.assign).toEqual({ U: 9, C: 8 });
  });
  it('keeps the Stage promise: an on-stage photo goes on U, even the best one (a listed conflict)', () => {
    const r = planSubject(eds('C', 'U', 'R'), [ph(1, { stage: true }), ph(2), ph(3)]);
    expect(r.assign).toEqual({ U: 1, R: 2, C: 3 });
    expect(r.conflicts.join(' ')).toMatch(/best photo \(1\) is on stage/);
    const none = planSubject(eds('C', 'U'), [ph(1), ph(2)]);
    expect(none.assign).toEqual({ U: 1, C: 2 });
    expect(none.conflicts.join(' ')).toMatch(/Stage keeps photo 1, not on stage/);
  });
  it('gives Full Art only a photo with an honest 2x, and says size when none has it', () => {
    const r = planSubject(eds('C', 'U', 'R', 'SR', 'UR', 'L'), [ph(1, { fullOk: false }), ph(2), ph(3), ph(4), ph(5), ph(6)]);
    expect(r.assign.L).toBe(2);
    expect(r.assign.UR).toBe(1);
    const no2x = planSubject(eds('C', 'U', 'R', 'SR', 'UR', 'L'), [1, 2, 3, 4, 5, 6].map((i) => ph(i, { fullOk: false })));
    expect(no2x.dropped).toEqual(['L']);
    expect(no2x.lock).toEqual({ L: 'size' });
    expect(no2x.assign.UR).toBe(1);
  });
  it('gives a group edition a photo in as many parts as it has cards, keeping the lowest editions it can', () => {
    const g = [{ rarity: 'C', cards: 3 }, { rarity: 'U', cards: 2 }, { rarity: 'R', cards: 3 }] as PlanEdition[];
    const r = planSubject(g, [ph(1, { parts: 2 }), ph(2, { parts: 3 }), ph(3, { parts: 3 })]);
    expect(r.assign).toEqual({ R: 2, U: 1, C: 3 });
    // one 3-part photo only: C (3) and U (2) stay, R leaves
    const r2 = planSubject(g, [ph(1, { parts: 3 }), ph(2, { parts: 2 })]);
    expect(r2.assign).toEqual({ C: 1, U: 2 });
    expect(r2.dropped).toEqual(['R']);
    // no photo in 2 parts: U cannot be kept, so C and R (both 3) stay, the best on R
    const r3 = planSubject(g, [ph(7, { parts: 3 }), ph(8, { parts: 3 })]);
    expect(r3.assign).toEqual({ R: 7, C: 8 });
    expect(r3.dropped).toEqual(['U']);
  });
  it('changes nothing when the photos are already in the order of the rule, and drops everything with no good photo', () => {
    const r = planSubject(eds('C', 'U'), [ph(2, { stage: true }), ph(1, { stage: true })], { C: 1, U: 2 });
    expect(r.assign).toEqual({ U: 2, C: 1 });
    const tie = planSubject(eds('C', 'U'), [ph(2, { stage: true }), ph(1, { stage: true })], { C: 1, U: 2 });
    expect(tie).toEqual(r);
    expect(planSubject(eds('C', 'U', 'R'), [])).toEqual({ assign: {}, dropped: ['C', 'U', 'R'], lock: { C: 'photo', U: 'photo', R: 'photo' }, conflicts: [] });
  });
});

// ---------- the database ----------

const ADA = 'idol:pc-ada';
const ZZ = 'group:pc-zz';
const U9 = '00000000-0000-4000-8000-0000000000c9';

/** Production with 118 applied, plus two subjects of the test: a person with six photos and a group with three (two in 3 parts, one in 2) and a
 *  pending one in 3 parts; the catalog built, the files cut (storage_path), and a card owned (so the numbers are frozen as in production). */
async function world(): Promise<PGlite> {
  const db = await prodDb();
  await run(db, build([]).sql);
  await db.exec(`insert into public.cards_entities (id, kind, name, sort_key, active) values ('${ADA}', 'idol', 'Ada', 'zzz-ada', true), ('${ZZ}', 'group', 'ZZ', 'zzz-zz', true)`);
  const ins = async (entity: string, slot: number, w: number, h: number, q: number, status: string, parts: number | null, stage = false): Promise<void> => {
    await db.query(`insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at,
        source_width, source_height, status, quality, stage, focal_x, focal_y, event_date, parts)
      values ($1, $2, 'commons', $3, 'https://upload.example/x.jpg', 'A', 'CC BY 4.0', 'https://creativecommons.org/licenses/by/4.0', false, '2026-11-17',
        $4, $5, $6, $7, $8, 50, 30, $9, $10)`,
    [entity, slot, `https://commons.wikimedia.org/wiki/File:${entity.replace(':', '_')}_${slot}.jpg`, w, h, status, q, stage, `2025-01-${String(10 + slot)}`, parts]);
  };
  for (let s = 1; s <= 6; s++) await ins(ADA, s, 1000 + s, 1600, 6 - Math.min(s, 5), 'auto', null, s === 2);
  await ins(ZZ, 1, 4000, 1700, 5, 'auto', 3);
  await ins(ZZ, 2, 2000, 1600, 4, 'auto', 2);
  await ins(ZZ, 3, 3900, 1700, 3, 'auto', 3);
  await ins(ZZ, 4, 3800, 1700, 3, 'pending', 3);
  await db.exec(`select public.cards_build_catalog()`);
  await db.exec(`update public.cards_photos set storage_path = 'stem-' || id, file_focal_x = focal_x, file_focal_y = focal_y where entity_id in ('${ADA}', '${ZZ}') and status = 'auto'`);
  await db.exec(`insert into auth.users (id) values ('${U9}')`);
  const lCard = await one<number>(db, `select card_no from public.cards_catalog where entity_id = '${ADA}' and rarity = 'L'`);
  await db.exec(`insert into public.cards_owned (user_id, card_no, copies) values ('${U9}', ${lCard}, 2)`);
  return db;
}

interface PRow { id: number; entity_id: string; slot: number; status: string; focal_x: number; focal_y: number; file_focal_x: number | null; file_focal_y: number | null;
  storage_path: string | null; source_path: string | null; parts: number | null; source_width: number; source_height: number; stage: boolean }
interface CRow { card_no: number; num: string; entity_id: string; rarity: string; part: number; photo_id: number | null; in_packs: boolean; small_2x: boolean }

const photosOf = (db: PGlite): Promise<PRow[]> => rows<PRow>(db, `select id, entity_id, slot, status, focal_x, focal_y, file_focal_x, file_focal_y, storage_path, source_path, parts,
  source_width, source_height, stage from public.cards_photos where entity_id in ('${ADA}', '${ZZ}') order by id`);
const cardsOf = (db: PGlite): Promise<CRow[]> => rows<CRow>(db, `select card_no, num, entity_id, rarity, part, photo_id, in_packs, small_2x from public.cards_catalog
  where entity_id in ('${ADA}', '${ZZ}') order by card_no`);
/** Every row of the tables 119 touches, as one fingerprint. */
const STATE = `select md5(string_agg(t, E'\\n' order by t)) from (
  select 'c' || to_jsonb(c)::text as t from public.cards_catalog c union all select 'p' || to_jsonb(p)::text from public.cards_photos p
  union all select 'z' || to_jsonb(z)::text from public.cards_panoramas z union all select 'e' || to_jsonb(e)::text from public.cards_entities e
  union all select 'o' || to_jsonb(o)::text from public.cards_owned o) x`;

/** The plan of the test, built the way the photo check builds it: verdicts, then the rule per subject, then the rows of each unit. */
async function planOf(db: PGlite, verdicts: Record<number, { v: 'OK' | 'RECROP' | 'REPLACE'; fx?: number; fy?: number }>, ranks: Record<string, number[]>):
  Promise<{ plan: { checked_on: string; export: string; subjects: unknown[]; units: PcUnit[] }; exp: { photos: PRow[]; catalog: CRow[]; panoramas: Array<{ pano_no: number; photo_id: number | null; entity_id: string; rarity: string }> } }> {
  const photos = await photosOf(db);
  const catalog = await cardsOf(db);
  const panoramas = await rows<{ pano_no: number; photo_id: number | null; entity_id: string; rarity: string }>(db,
    `select pano_no, photo_id, entity_id, rarity from public.cards_panoramas where entity_id in ('${ADA}', '${ZZ}') order by pano_no`);
  const byId = new Map(photos.map((p) => [p.id, p]));
  const locks = new Map((await rows<{ id: string; lock_reasons: Record<string, string> }>(db, `select id, lock_reasons from public.cards_entities where id in ('${ADA}', '${ZZ}')`)).map((e) => [e.id, e.lock_reasons]));
  const subjects: unknown[] = [];
  const units: PcUnit[] = [];
  for (const entity of [ADA, ZZ]) {
    const cs = catalog.filter((c) => c.entity_id === entity);
    const rar = [...new Set(cs.map((c) => c.rarity))] as Rarity[];
    const need = Object.fromEntries(rar.map((r) => [r, cs.filter((c) => c.rarity === r).length]));
    const current = Object.fromEntries(rar.map((r) => [r, cs.find((c) => c.rarity === r)!.photo_id]));
    const pool = ranks[entity]!.map((id) => {
      const p = byId.get(id)!;
      const np = entity.startsWith('group:') ? (p.parts ?? 2) : 1;
      const cw = Math.floor(Math.min(p.source_width, (p.source_height * (np === 1 ? 5.5 : np * 5.5)) / 8.5));
      return { id, parts: np, fullOk: Math.floor(cw / np) >= 640, stage: p.stage };
    });
    const r = planSubject(rar.map((x) => ({ rarity: x, cards: need[x]! })), pool, current as Partial<Record<Rarity, number>>);
    subjects.push({ entity, editions: rar, need, current, assign: r.assign, dropped: r.dropped, pool: ranks[entity], lock: r.lock });
    const assigned = new Set(Object.values(r.assign));
    const unit: PcUnit = { entity, photos: [], cards: [], panos: [], lock: null };
    for (const p of photos.filter((x) => x.entity_id === entity)) {
      const v = verdicts[p.id];
      if (!v) continue;
      const row: PcUnit['photos'][number] = { id: p.id, old: { status: p.status as 'auto', fx: p.focal_x, fy: p.focal_y, ffx: p.file_focal_x, ffy: p.file_focal_y }, new: {} };
      if (v.v === 'REPLACE') { if (p.status === 'pending') continue; row.new.status = 'rejected'; row.note = 'test: replaced'; }
      else {
        if (p.status === 'pending') { if (!assigned.has(p.id)) continue; row.new.status = 'approved'; row.note = 'test: approved'; }
        if (v.v === 'RECROP') {
          const fx = v.fx ?? p.focal_x;
          const fy = v.fy ?? p.focal_y;
          if (fx !== p.focal_x || fy !== p.focal_y) { row.new.fx = fx; row.new.fy = fy; } else row.new.reset_files = true;
        }
      }
      unit.photos.push(row);
    }
    for (const c of cs) {
      const np = (r.assign as Record<string, number | undefined>)[c.rarity] ?? null;
      if (np !== c.photo_id) unit.cards.push({ no: c.card_no, old: { photo: c.photo_id, in_packs: c.in_packs }, new: { photo: np } });
    }
    for (const z of panoramas.filter((x) => x.entity_id === entity)) {
      const np = (r.assign as Record<string, number | undefined>)[z.rarity] ?? null;
      if (np !== z.photo_id) unit.panos.push({ no: z.pano_no, old: z.photo_id, new: np });
    }
    if (r.dropped.length) {
      const old = locks.get(entity) ?? {};
      const nw = { ...old };
      for (const d of r.dropped) if (!(d in nw)) nw[d] = r.lock[d]!;
      unit.lock = { old, new: nw };
    }
    units.push(unit);
  }
  return { plan: { checked_on: '2026-11-17', export: 'test', subjects, units }, exp: { photos, catalog, panoramas } };
}

const RANKS_OF = (p: PRow[]): Record<string, number[]> => {
  const a = p.filter((x) => x.entity_id === ADA).map((x) => x.id);
  const z = p.filter((x) => x.entity_id === ZZ).map((x) => x.id);
  // the person: slot 6 replaced; the best looking is slot 5, then 1, 2 (on stage), 3, 4. The group: slot 1 replaced, the pending slot 4 takes its place
  return { [ADA]: [a[4]!, a[0]!, a[1]!, a[2]!, a[3]!], [ZZ]: [z[3]!, z[1]!, z[2]!] };
};
const VERDICTS_OF = (p: PRow[]): Record<number, { v: 'OK' | 'RECROP' | 'REPLACE'; fx?: number; fy?: number }> => {
  const a = p.filter((x) => x.entity_id === ADA);
  const z = p.filter((x) => x.entity_id === ZZ);
  return {
    [a[5]!.id]: { v: 'REPLACE' }, [a[2]!.id]: { v: 'RECROP', fx: 40, fy: 20 }, [a[3]!.id]: { v: 'RECROP', fx: 50, fy: 30 },
    [z[0]!.id]: { v: 'REPLACE' }, [z[3]!.id]: { v: 'OK' },
  };
};

async function scenario(): Promise<{ db: PGlite; data: PhotocheckData; sql: ReturnType<typeof buildPhotocheck>; photos: PRow[]; before: CRow[]; owned: number }> {
  const db = await world();
  const photos = await photosOf(db);
  const before = await cardsOf(db);
  const { plan, exp } = await planOf(db, VERDICTS_OF(photos), RANKS_OF(photos));
  expect(checkPlan(plan as never, exp as never)).toBe(2);
  const data = dataOf(plan as never, { photos: exp.photos, catalog: exp.catalog, panoramas: exp.panoramas } as never);
  const owned = await one<number>(db, `select card_no from public.cards_owned where user_id = '${U9}'`);
  return { db, data, sql: buildPhotocheck(data), photos, before, owned };
}

describe('119-photocheck.sql: the file', () => {
  it('is one DO block with its header and its Verify lines, without a dash, and so is its rollback', async () => {
    const { sql } = await scenario();
    expect(sql.sql.match(/^do \$c119\$$/gm)).toHaveLength(1);
    expect(sql.rollback.match(/^do \$c119r\$$/gm)).toHaveLength(1);
    for (const k of ['What:', 'Why:', 'Scope:', 'Rows:', 'Needs:', 'Verify:', 'Refuses:', 'Undo:', 'o1-transaction: single, ONE DO block']) expect(sql.sql).toContain(`-- ${k}`);
    expect(sql.sql.match(/^-- Verify:/gm)!.length).toBeGreaterThanOrEqual(12);
    expect(sql.rollback).toMatch(/^-- Verify:/m);
    expect(sql.sql + sql.rollback).not.toMatch(/[\u2013\u2014]/);
    expect(sql.sql.match(/\(now\(\) at time zone 'UTC'\)::time/g)).toHaveLength(1);
  });
  it('refuses data it cannot trust', async () => {
    const { data } = await scenario();
    const u = data.units[0]!;
    const twice = { ...data, units: [u, { ...u }] };
    expect(() => dataLiteral(twice)).toThrow(/listed twice/);
    const badFocal = { ...data, units: [{ ...u, photos: [{ ...u.photos[0]!, new: { fx: 120, fy: 3 } }] }] };
    expect(() => dataLiteral(badFocal)).toThrow(/0 to 100/);
    const rejectedOnCard = { ...data, units: [{ ...u, cards: [{ no: 1, old: { photo: 1, in_packs: true }, new: { photo: u.photos.find((p) => p.new.status === 'rejected')!.id } }] }] };
    expect(() => dataLiteral(rejectedOnCard)).toThrow(/rejected by the same unit/);
    const z = data.units[1]!;
    const approvedAlone = { ...data, units: [{ ...z, cards: [] }] };
    expect(() => dataLiteral(approvedAlone)).toThrow(/approved but no card takes it/);
    const quote = { ...data, units: [{ ...u, photos: [{ ...u.photos[0]!, note: 'x $pc$ y' }] }] };
    expect(() => dataLiteral(quote)).toThrow(/quote/);
    expect(dataLiteral({ ...data, units: [{ ...u, photos: [{ ...u.photos[0]!, note: 'a \u2013 b \u2014 c' }] }] })).toContain('\\u2013');
  });
  it('the committed 119 holds production data under 400 KB and no birth date (read only when the plan of the check is on this machine)', () => {
    const sql = readFileSync(path.join(CARDS_SQL, '119-photocheck.sql'), 'utf8');
    expect(sql.length).toBeLessThan(400_000);
    expect(sql).not.toMatch(/birth/i);
    const plan = path.join(CARDS_SQL, '../../../out/launch-prep/pc/plan.json');
    if (!existsSync(plan)) return;
    expect(sql).toMatch(/^do \$c119\$$/m);
  });
});

describe('119-photocheck.sql on the database', () => {
  it('moves the photos by the rule, keeps every number and owned copy, drops the rarest editions out of the packs, and a second run changes nothing', async () => {
    const { db, sql, photos, before, owned } = await scenario();
    const a = photos.filter((x) => x.entity_id === ADA);
    const z = photos.filter((x) => x.entity_id === ZZ);
    const notices = await run(db, sql.sql);
    expect(notices.join('\n')).toMatch(/2 subjects applied, 0 already applied, 0 left alone/);
    const after = await cardsOf(db);
    // the numbers and the editions do not move; the owned copy is still on its number
    expect(after.map((c) => [c.card_no, c.num, c.rarity, c.part])).toEqual(before.map((c) => [c.card_no, c.num, c.rarity, c.part]));
    expect(await one<number>(db, `select copies from public.cards_owned where user_id = '${U9}' and card_no = ${owned}`)).toBe(2);
    const ed = (e: string, r: string): CRow[] => after.filter((c) => c.entity_id === e && c.rarity === r);
    // the person: 5 good photos for 6 editions: L leaves the packs with no photo (the owned card is that one), the best (slot 5) on UR
    expect(ed(ADA, 'L')[0]).toMatchObject({ photo_id: null, in_packs: false, card_no: owned });
    expect(ed(ADA, 'UR')[0]!.photo_id).toBe(a[4]!.id);
    expect(ed(ADA, 'SR')[0]!.photo_id).toBe(a[0]!.id);
    expect(ed(ADA, 'U')[0]!.photo_id).toBe(a[1]!.id); // the on-stage photo
    for (const r of ['C', 'U', 'R', 'SR', 'UR']) expect(ed(ADA, r)[0]!.in_packs).toBe(true);
    // the group: the pending photo in 3 parts takes the place of the replaced one, approved, out of the packs until its files are cut
    const pend = z[3]!;
    const withPend = after.filter((c) => c.photo_id === pend.id);
    expect(withPend.length).toBe(3);
    expect(withPend.every((c) => !c.in_packs)).toBe(true);
    expect(after.filter((c) => c.entity_id === ZZ && c.photo_id === z[0]!.id)).toEqual([]);
    // the panoramas follow their cards
    expect(await one<number>(db, `select count(*) from public.cards_panoramas z join public.cards_catalog c on c.card_no = z.first_card
      where z.entity_id = '${ZZ}' and z.photo_id is distinct from c.photo_id`)).toBe(0);
    // the photos: replaced, approved, the new focal point, the files to cut again; the lock reason of the dropped edition
    const p = new Map((await photosOf(db)).map((x) => [x.id, x]));
    expect(p.get(a[5]!.id)!.status).toBe('rejected');
    expect(p.get(z[0]!.id)!.status).toBe('rejected');
    expect(p.get(pend.id)!.status).toBe('approved');
    expect([p.get(a[2]!.id)!.focal_x, p.get(a[2]!.id)!.focal_y]).toEqual([40, 20]);
    expect([p.get(a[3]!.id)!.file_focal_x, p.get(a[3]!.id)!.file_focal_y]).toEqual([null, null]);
    expect(await one(db, `select lock_reasons from public.cards_entities where id = '${ADA}'`)).toEqual({ L: 'photo' });
    // the publish workflow cuts the approved photo: the trigger of 103 puts its cards in the packs
    await db.exec(`update public.cards_photos set storage_path = 'stem-new', file_focal_x = focal_x, file_focal_y = focal_y where id = ${pend.id}`);
    expect((await cardsOf(db)).filter((c) => c.photo_id === pend.id).every((c) => c.in_packs)).toBe(true);
    // the Verify lines that must be 0
    for (const q of ['select count(*) from public.cards_catalog where in_packs and photo_id is null',
      `select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where c.in_packs and p.status not in ('auto', 'approved')`,
      'select count(*) from (select entity_id, photo_id from public.cards_catalog where photo_id is not null group by entity_id, photo_id having count(distinct rarity) > 1) x',
      'select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.entity_id <> c.entity_id']) expect(await one<number>(db, q), q).toBe(0);
    // a second run changes nothing
    const s1 = await one<string>(db, STATE);
    const again = await run(db, sql.sql);
    expect(again.join('\n')).toMatch(/0 subjects applied, 2 already applied, 0 left alone/);
    expect(await one<string>(db, STATE)).toBe(s1);
    expect(await one<number>(db, 'select count(*) from public.cards_photocheck_log')).toBe(2);
  });

  it('leaves alone a subject whose rows changed since the export, and applies the others', async () => {
    const { db, sql, photos } = await scenario();
    const z = photos.filter((x) => x.entity_id === ZZ);
    // the owner moved the focal point of the group's pending photo in the admin after the export
    await db.exec(`update public.cards_photos set focal_x = 45 where id = ${z[3]!.id}`);
    const zBefore = await one<string>(db, `select md5(string_agg(to_jsonb(c)::text, ',' order by c.card_no)) from public.cards_catalog c where c.entity_id = '${ZZ}'`);
    const notices = await run(db, sql.sql);
    expect(notices.join('\n')).toContain(`${ZZ} left alone: photo ${z[3]!.id} changed since the export`);
    expect(notices.join('\n')).toMatch(/1 subjects applied, 0 already applied, 1 left alone/);
    expect(await one<string>(db, `select md5(string_agg(to_jsonb(c)::text, ',' order by c.card_no)) from public.cards_catalog c where c.entity_id = '${ZZ}'`)).toBe(zBefore);
    expect(await one<string>(db, `select status from public.cards_photos where id = ${z[3]!.id}`)).toBe('pending');
    expect(await one<number>(db, `select count(*) from public.cards_photocheck_log where entity_id = '${ADA}'`)).toBe(1);
  });

  it('refuses between 23:50 and 00:30 UTC with nothing changed', async () => {
    const { db, sql } = await scenario();
    const s0 = await one<string>(db, STATE);
    for (const t of ['23:50', '23:59', '00:00', '00:29']) expect(await failsWith(db, sql.sql, t), t).toMatch(/refused between 23:50 and 00:30 UTC/);
    expect(await one<string>(db, STATE)).toBe(s0);
    expect(await one(db, `select to_regclass('public.cards_photocheck_log') is null`)).toBe(true);
  });

  it('the rollback gives every row back and drops its table; a second rollback has nothing to undo', async () => {
    const { db, sql } = await scenario();
    const s0 = await one<string>(db, STATE);
    await run(db, sql.sql);
    expect(await one<string>(db, STATE)).not.toBe(s0);
    const back = await run(db, sql.rollback);
    expect(back.join('\n')).toMatch(/2 subjects given back, 0 left alone/);
    expect(await one<string>(db, STATE)).toBe(s0);
    expect(await one(db, `select to_regclass('public.cards_photocheck_log') is null`)).toBe(true);
    expect((await run(db, sql.rollback)).join('\n')).toMatch(/nothing to undo/);
  });
});

// The committed file on the rows production had at the export (out/launch-prep, git-ignored: this runs only on the machine of the photo check).
const EXPORT = path.join(CARDS_SQL, '../../../out/launch-prep/cards-live-2026-11-17.json');
const ENTITIES = path.join(CARDS_SQL, '../../../out/launch-prep/cards-entities-2026-11-17.json');

describe.runIf(existsSync(EXPORT) && existsSync(ENTITIES))('the committed 119 on the rows of the export', () => {
  it('applies every subject, gives the numbers of its Verify lines, changes nothing on a second run, and the rollback gives the export back', async () => {
    const exp = JSON.parse(readFileSync(EXPORT, 'utf8')) as { photos: unknown[]; catalog: unknown[]; panoramas: unknown[]; owned_by_card: Array<{ card_no: number; owners: number; copies: number }> };
    const ents = (JSON.parse(readFileSync(ENTITIES, 'utf8')) as Array<Record<string, unknown>>).map((e) => ({ ...e, sort_key: e.id }));
    const db = await prodDb();
    await run(db, build([]).sql);
    await db.exec('truncate public.cards_panoramas_owned, public.cards_panoramas, public.cards_owned, public.cards_catalog, public.cards_photos, public.cards_entities cascade');
    await db.query(`insert into public.cards_entities select * from jsonb_populate_recordset(null::public.cards_entities, $1::jsonb)`, [JSON.stringify(ents)]);
    await db.query(`insert into public.cards_photos select * from jsonb_populate_recordset(null::public.cards_photos, $1::jsonb)`, [JSON.stringify(exp.photos)]);
    await db.query(`insert into public.cards_catalog select * from jsonb_populate_recordset(null::public.cards_catalog, $1::jsonb)`, [JSON.stringify(exp.catalog)]);
    await db.query(`insert into public.cards_panoramas select * from jsonb_populate_recordset(null::public.cards_panoramas, $1::jsonb)`, [JSON.stringify(exp.panoramas)]);
    // the owned copies: one stand-in player per card owned
    for (const [i, o] of exp.owned_by_card.entries()) {
      const u = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
      await db.exec(`insert into auth.users (id) values ('${u}') on conflict do nothing; insert into public.cards_owned (user_id, card_no, copies) values ('${u}', ${o.card_no}, ${o.copies})`);
    }
    const s0 = await one<string>(db, STATE);
    const sql = readFileSync(path.join(CARDS_SQL, '119-photocheck.sql'), 'utf8');
    const head = sql.slice(0, sql.indexOf('\ndo $c119$'));
    const notices = await run(db, sql);
    const units = Number(/-- Rows: {3}(\d+) subjects/.exec(head)![1]);
    expect(notices.join('\n')).toContain(`${units} subjects applied, 0 already applied, 0 left alone`);
    // every Verify line of the file answers what it expects (the first number of "expect")
    const lines = head.split('\n').filter((l) => l.startsWith('-- Verify: '));
    expect(lines.length).toBeGreaterThanOrEqual(12);
    for (const l of lines) {
      const [q, want] = l.slice('-- Verify: '.length).split(';   expect ');
      const r = await rows<Record<string, unknown>>(db, q!);
      if (/group by status/.test(q!)) {
        expect(r.map((x) => `${x.status} ${x.count}`).join(', '), l).toBe(want);
      } else if (/count\(\*\), min/.test(q!)) {
        expect(Object.values(r[0]!).map(Number).join(', '), l).toBe(/^[\d, ]+/.exec(want!)![0].trim().replace(/,$/, ''));
      } else {
        expect(Number(Object.values(r[0]!)[0]), l).toBe(Number(/^\d+/.exec(want!)![0]));
      }
    }
    // the owned copies are all still on a numbered card
    expect(await one<number>(db, 'select count(*) from public.cards_owned')).toBe(exp.owned_by_card.length);
    const s1 = await one<string>(db, STATE);
    expect((await run(db, sql)).join('\n')).toContain(`0 subjects applied, ${units} already applied, 0 left alone`);
    expect(await one<string>(db, STATE)).toBe(s1);
    await run(db, readFileSync(path.join(CARDS_SQL, '119-photocheck.rollback.sql'), 'utf8'));
    expect(await one<string>(db, STATE)).toBe(s0);
  });
});
