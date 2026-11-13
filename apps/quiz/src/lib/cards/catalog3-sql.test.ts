// Bunnyverse Cards lot 3: pglite proof of docs/pending-migrations/cards/103-catalog-photos.sql (owner decision 2026-11-13, "one edition,
// one photo"). The real schema files 001 to 003 run, then 101 and 102 (the state the owner has after lot 2), then a 103 built here from
// photos set by the test. Checked: the ladder opens from the bottom (n photos, n editions; packs from 2 photos), the best photo goes on the
// highest edition, Stage takes a stage photo, Full Art needs an honest 2x, a group gets one pair per edition with consecutive numbers,
// the lock reasons, a pending photo opens nothing until the owner approves it and the catalog is rebuilt, what the owner set is kept by
// source page, the guard, the trigger of the files, a second run, the rollback; and the real 103 file runs.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { vi, beforeAll, describe, expect, it } from 'vitest';

import { build3, fullOk, plannedEditions, type Catalog3Input, type Photo3, type Subject3 } from './catalog3-sql';
import { build, type Subject } from './rebuild-sql';
import { failure, freshCardsDb, one, readCardsSql, rows, CARDS_SQL } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ALL = JSON.parse(readFileSync(path.resolve(HERE, '../../../../../docs/design/cards/data/subjects.json'), 'utf8')) as Subject[];
const lot2 = (slug: string): Subject => ({ ...ALL.find((x) => x.slug === slug)!, age: { ok: true, reason: null, checked_on: '2026-11-12' } });

let pageN = 0;
const photo = (slot: number, o: Partial<Photo3> = {}): Photo3 => ({
  slot, status: 'auto', source: 'commons', page: `https://commons.wikimedia.org/wiki/File:Test_${++pageN}.jpg`, url: `https://upload.example/${pageN}.jpg`,
  width: 2000, height: 3000, sha1: `sha${pageN}`, author: 'A Photographer', author_url: null, licence: 'CC BY-SA 4.0',
  licence_url: 'https://creativecommons.org/licenses/by-sa/4.0', share_alike: true, date: `2024-0${(slot % 9) + 1}-10`, date_precision: 'day',
  event: `Event ${pageN}`, stage: false, quality: 3, focal: { x: 50, y: 30 }, source_path: null, news_only: false, review: [], ...o,
});
const lot2Photo = (slug: string, o: Partial<Photo3> = {}): Photo3 => {
  const s = ALL.find((x) => x.slug === slug)!;
  return photo(1, { status: 'approved', page: s.photo.commons_page, source_path: `${s.photo.bucket}/${s.photo.path}`, ...o });
};

// IU: six photos. Ranked: p2 (q5, full art), p3 (q4, stage, 1242 px), p5 (q4, 582 px), p1 (q3), p4 (q2, stage), p6 (q1).
const IU: Subject3 = { slug: 'iu', kind: 'idol', end_year: null, photos: [
  lot2Photo('iu', { quality: 3, width: 1514, height: 2130 }),
  photo(2, { quality: 5, width: 3822, height: 6000 }),
  photo(3, { quality: 4, width: 1280, height: 1920, stage: true }),
  photo(4, { quality: 2, width: 800, height: 1200, stage: true }),
  photo(5, { quality: 4, width: 600, height: 900 }),
  photo(6, { quality: 1, width: 4000, height: 6000 }),
] };
// Jennie: one approved photo and one waiting for the owner: no edition yet.
const JENNIE: Subject3 = { slug: 'jennie', kind: 'idol', end_year: null, photos: [
  lot2Photo('jennie'),
  photo(2, { status: 'pending', review: ['the licence review is still open on Commons'], quality: 4 }),
] };
// BTOB: three group photos, the best is a stage photo (it still goes on Holo: Stage takes the other stage photo).
const BTOB: Subject3 = { slug: 'btob', kind: 'group', end_year: null, photos: [
  lot2Photo('btob', { quality: 2, width: 1200, height: 800, focal: { x: 50, y: 50 } }),
  photo(2, { quality: 5, width: 4000, height: 2600, stage: true, focal: { x: 50, y: 50 } }),
  photo(3, { quality: 3, width: 3000, height: 2000, stage: true, focal: { x: 50, y: 50 } }),
] };
// AKMU (a returning group): six photos, none wide enough for an honest 2x of a pair: Full Art stays locked ('size').
const AKMU: Subject3 = { slug: 'akmu', kind: 'group', end_year: null, photos: [1, 2, 3, 4, 5, 6].map((n) =>
  photo(n, { quality: 6 - Math.min(n, 5), width: 1100, height: 850, focal: { x: 50, y: 50 } })) };

const INPUT: Catalog3Input = { checked_on: '2026-11-13', subjects: [IU, JENNIE, BTOB, AKMU], left_out: [{ slug: 'nct', reason: 'no photo found' }] };
const SQL = build3(INPUT);

const FIXTURE = `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique, inception_date date);
create table public.idols (
  id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0);
create function gid(s text) returns integer language sql as $$ select id from public.groups where slug = s $$;
insert into public.groups (name, slug, inception_date) values
  ('IU', 'iu', '2008-09-18'), ('BLACKPINK', 'blackpink', '2016-08-08'), ('Jennie', 'jennie', '2018-11-12'),
  ('BTOB', 'btob', '2012-03-21'), ('AKMU', 'akmu', '2014-04-07');
insert into public.idols (group_id, name, birth_date) values
  (gid('iu'), 'IU', current_date - interval '30 years'),
  (gid('blackpink'), 'Jennie', current_date - interval '29 years'), (gid('blackpink'), 'Lisa', current_date - interval '29 years'),
  (gid('btob'), 'Eunkwang', current_date - interval '33 years'), (gid('btob'), 'Minhyuk', current_date - interval '32 years'),
  (gid('akmu'), 'Chanhyuk', current_date - interval '30 years'), (gid('akmu'), 'Suhyun', current_date - interval '27 years');
`;

async function lot2Db(): Promise<PGlite> {
  const db = await freshCardsDb();
  await db.exec(FIXTURE);
  await db.exec(readCardsSql('101-catalog.sql'));
  await db.exec(build([lot2('iu'), lot2('jennie'), lot2('btob')]).sql);
  return db;
}
async function run(db: PGlite, sql: string): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(sql, { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}
type Card = { card_no: number; num: string; entity_id: string; rarity: string; part: number; small_2x: boolean; in_packs: boolean; page: string };
const catalog = (db: PGlite): Promise<Card[]> => rows<Card>(db, `
  select c.card_no, c.num, c.entity_id, c.rarity, c.part, c.small_2x, c.in_packs, p.source_page as page
    from cards_catalog c join cards_photos p on p.id = c.photo_id order by c.card_no`);
const pageOf = (s: Subject3, slot: number): string => s.photos.find((p) => p.slot === slot)!.page;

describe('103-catalog-photos.sql: one edition, one photo', () => {
  let db: PGlite;
  let notices: string[];
  let cards: Card[];
  beforeAll(async () => {
    db = await lot2Db();
    // after lot 2 the owner had cut IU's card and moved BTOB's crop
    await db.exec(`update cards_photos set storage_path = 'iu-50-30', file_focal_x = 50, file_focal_y = 30 where source_path = 'images/group-photos/iu.jpg';
                   update cards_photos set focal_x = 40 where source_path = 'images/group-photos/btob.jpg';`);
    notices = await run(db, SQL.sql);
    cards = await catalog(db);
  });

  it('opens the n lowest editions of a subject with n approved photos, and nothing below 2 photos', () => {
    const eds = (ent: string) => [...new Set(cards.filter((c) => c.entity_id === ent).map((c) => c.rarity))];
    expect(eds('idol:iu')).toEqual(['C', 'U', 'R', 'SR', 'UR', 'L']);
    expect(eds('group:btob')).toEqual(['C', 'U', 'R']);
    expect(eds('group:akmu')).toEqual(['C', 'U', 'R', 'SR', 'UR']);
    expect(eds('idol:jennie')).toEqual([]);
    expect(plannedEditions('idol', IU.photos)).toEqual(['C', 'U', 'R', 'SR', 'UR', 'L']);
    expect(plannedEditions('group', AKMU.photos)).toEqual(['C', 'U', 'R', 'SR', 'UR']);
    expect(plannedEditions('idol', JENNIE.photos)).toEqual([]);
  });

  it('puts the best photo on the highest edition, a stage photo on Stage, a photo with an honest 2x on Full Art', () => {
    const at = (ent: string, r: string) => cards.find((c) => c.entity_id === ent && c.rarity === r)!.page;
    expect(at('idol:iu', 'L')).toBe(pageOf(IU, 2));
    expect(at('idol:iu', 'U')).toBe(pageOf(IU, 4)); // the lowest rated stage photo, so the best ones stay on top
    expect(at('idol:iu', 'UR')).toBe(pageOf(IU, 3));
    expect(at('idol:iu', 'SR')).toBe(pageOf(IU, 5));
    expect(at('idol:iu', 'R')).toBe(pageOf(IU, 1));
    expect(at('idol:iu', 'C')).toBe(pageOf(IU, 6));
    expect(at('group:btob', 'R')).toBe(pageOf(BTOB, 2));
    expect(at('group:btob', 'U')).toBe(pageOf(BTOB, 3));
    expect(at('group:btob', 'C')).toBe(pageOf(BTOB, 1));
    expect(fullOk('group', 1100, 850)).toBe(false);
    expect(fullOk('idol', 3822, 6000)).toBe(true);
  });

  it('never puts one photo on two editions, and numbers the cards 1 to N with each pair consecutive', async () => {
    const used = cards.map((c) => `${c.entity_id}|${c.page}|${c.rarity}`);
    const byPhoto = new Map<string, Set<string>>();
    for (const c of cards) byPhoto.set(c.page, (byPhoto.get(c.page) ?? new Set()).add(c.rarity));
    for (const s of byPhoto.values()) expect(s.size).toBe(1);
    expect(used.length).toBe(6 + 3 * 2 + 5 * 2);
    expect(cards.map((c) => c.card_no)).toEqual(cards.map((_, i) => i + 1));
    expect(cards[0]!.num).toBe('BV1-0001');
    for (const c of cards.filter((x) => x.part === 1)) {
      expect(cards.find((x) => x.entity_id === c.entity_id && x.rarity === c.rarity && x.part === 2)!.card_no).toBe(c.card_no + 1);
    }
    expect(await one(db, `select count(*)::int from cards_catalog a join cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2 where a.part = 1 and b.card_no <> a.card_no + 1`)).toBe(0);
  });

  it('flags small 2x per card: a person window under 640 px, each half of a pair on its own', () => {
    expect(cards.find((c) => c.entity_id === 'idol:iu' && c.rarity === 'SR')!.small_2x).toBe(true);
    expect(cards.find((c) => c.entity_id === 'idol:iu' && c.rarity === 'L')!.small_2x).toBe(false);
    const btobC = cards.filter((c) => c.entity_id === 'group:btob' && c.rarity === 'C');
    expect(btobC.map((c) => c.small_2x)).toEqual([true, true]);
    const btobR = cards.filter((c) => c.entity_id === 'group:btob' && c.rarity === 'R');
    expect(btobR.map((c) => c.small_2x)).toEqual([false, false]);
  });

  it('says why an edition is missing: no photo for it yet, or no photo large enough for Full Art', async () => {
    const locks = await rows<{ id: string; lock_reasons: Record<string, string>; active: boolean }>(db,
      `select id, lock_reasons, active from cards_entities where id in ('idol:iu', 'group:btob', 'group:akmu', 'idol:jennie') order by id`);
    const by = new Map(locks.map((l) => [l.id, l]));
    expect(by.get('idol:iu')!.lock_reasons).toEqual({});
    expect(by.get('group:btob')!.lock_reasons).toEqual({ SR: 'photo', UR: 'photo', L: 'photo' });
    expect(by.get('group:akmu')!.lock_reasons).toEqual({ L: 'size' });
    expect(by.get('idol:jennie')!.active).toBe(false);
    expect(by.get('idol:iu')!.active).toBe(true);
  });

  it('keeps what the owner set by source page: a published file, a moved focal point; new photos take the researcher\'s point', async () => {
    const p = await rows<{ source_page: string; storage_path: string | null; focal_x: number; status: string; slot: number }>(db,
      `select source_page, storage_path, focal_x, status, slot from cards_photos order by entity_id, slot`);
    const iu1 = p.find((x) => x.source_page === pageOf(IU, 1))!;
    expect(iu1.storage_path).toBe('iu-50-30');
    expect(iu1.status).toBe('approved');
    expect(p.find((x) => x.source_page === pageOf(BTOB, 1))!.focal_x).toBe(40);
    expect(p.find((x) => x.source_page === pageOf(IU, 2))!.storage_path).toBeNull();
    expect(p.find((x) => x.source_page === pageOf(JENNIE, 2))!.status).toBe('pending');
    expect(Math.max(...p.map((x) => x.slot))).toBe(6);
  });

  it('keeps a card out of the packs until its photo has something to show, and lets it in once the owner\'s script cuts it', async () => {
    const iuL = cards.find((c) => c.entity_id === 'idol:iu' && c.rarity === 'L')!;
    expect(iuL.in_packs).toBe(false); // a new photo: no bucket copy, no files yet
    expect(cards.find((c) => c.entity_id === 'idol:iu' && c.rarity === 'R')!.in_packs).toBe(true); // the lot 1 photo has its bucket copy
    await db.exec(`update cards_photos set storage_path = 'iu-s2-50-30', file_focal_x = 50, file_focal_y = 30 where source_page = '${pageOf(IU, 2)}'`);
    expect(await one(db, `select in_packs from cards_catalog where card_no = ${iuL.card_no}`)).toBe(true);
    await db.exec(`update cards_photos set status = 'removed' where source_page = '${pageOf(IU, 2)}'`);
    expect(await one(db, `select in_packs from cards_catalog where card_no = ${iuL.card_no}`)).toBe(false);
    await db.exec(`update cards_photos set status = 'auto' where source_page = '${pageOf(IU, 2)}'`);
    expect(await one(db, `select in_packs from cards_catalog where card_no = ${iuL.card_no}`)).toBe(true);
  });

  it('opens an edition after the owner approves a waiting photo and rebuilds (the admin), then keeps that approval on a second run', async () => {
    await db.exec(`update cards_photos set status = 'approved' where source_page = '${pageOf(JENNIE, 2)}'`);
    const summary = await one<{ subjects: number; cards: number }>(db, `select public.cards_build_catalog()`);
    expect(summary.subjects).toBe(4);
    const jennie = await rows<{ rarity: string }>(db, `select rarity from cards_catalog where entity_id = 'idol:jennie' order by card_no`);
    expect(jennie.map((r) => r.rarity)).toEqual(['C', 'U']);
    const again = await run(db, SQL.sql);
    expect(again.some((n) => /1 approvals of the owner kept/.test(n))).toBe(true);
    expect((await rows(db, `select 1 from cards_catalog where entity_id = 'idol:jennie'`)).length).toBe(2);
  });

  it('leaves a photo the owner refused out of a rebuild', async () => {
    await db.exec(`update cards_photos set status = 'rejected' where source_page = '${pageOf(BTOB, 3)}'`);
    const n = await run(db, SQL.sql);
    expect(n.some((x) => /1 photos left out because the owner refused or removed them/.test(x))).toBe(true);
    const btob = await rows<{ rarity: string }>(db, `select distinct rarity from cards_catalog where entity_id = 'group:btob'`);
    expect(btob.map((r) => r.rarity).sort()).toEqual(['C', 'U']);
    expect(await one(db, `select count(*)::int from cards_photos where source_page = '${pageOf(BTOB, 3)}'`)).toBe(0);
  });

  it('writes notices the owner can check against the Verify lines', () => {
    expect(notices.some((n) => /^103-catalog-photos: 3 subjects in the packs, 1 waiting for a second approved photo, 22 cards, highest number BV1-0022$/.test(n))).toBe(true);
    expect(notices).toContain('103-catalog-photos: edition L has 1 cards (1 subjects)');
    expect(notices).toContain('103-catalog-photos: left out nct (no photo found)');
  });

  it('refuses while a player owns a card or opened a pack, and the admin rebuild refuses too', async () => {
    const user = '00000000-0000-0000-0000-000000000001';
    await db.exec(`insert into auth.users (id) values ('${user}')`);
    await db.exec(`insert into cards_owned (user_id, card_no) values ('${user}', 1)`);
    expect(await failure(db, SQL.sql)).toMatch(/a player owns a card/);
    expect(await failure(db, `select public.cards_build_catalog()`)).toMatch(/a player owns a card/);
    await db.exec(`delete from cards_owned`);
  });

  it('rolls back to an empty catalog with the photo columns of 102', async () => {
    await db.exec(SQL.rollback);
    expect(await one(db, `select count(*)::int from cards_catalog`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_proc where proname in ('cards_build_catalog', 'cards_photo_ready')`)).toBe(0);
    expect(await one(db, `select count(*)::int from information_schema.columns where table_name = 'cards_photos' and column_name in ('sha1', 'quality', 'stage', 'event_date_precision', 'news_only')`)).toBe(0);
    await db.exec(SQL.rollback);
  });

  it('refuses a pending photo without its reason and a repeated slot', () => {
    expect(() => build3({ ...INPUT, subjects: [{ ...JENNIE, photos: [lot2Photo('jennie'), photo(2, { status: 'pending' })] }] })).toThrow(/pending without a reason/);
    expect(() => build3({ ...INPUT, subjects: [{ ...JENNIE, photos: [lot2Photo('jennie'), photo(1)] }] })).toThrow(/repeated photo slot/);
  });
});

describe('103-catalog-photos.sql, the file in the repository', () => {
  const file = path.join(CARDS_SQL, '103-catalog-photos.sql');
  it.skipIf(!existsSync(file))('is one DO block with Verify lines, and has a rollback', () => {
    const sql = readFileSync(file, 'utf8');
    expect(sql.match(/^do \$/gm)?.length).toBe(1);
    expect(sql).toMatch(/^-- Verify: /m);
    expect(existsSync(path.join(CARDS_SQL, '103-catalog-photos.rollback.sql'))).toBe(true);
    expect(sql).not.toMatch(/[–—]/);
  });
});
