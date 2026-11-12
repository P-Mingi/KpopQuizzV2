// Bunnyverse Cards lot 2: pglite proof of docs/pending-migrations/cards/102-catalog-rebuild.sql. The real schema files 001 to 003 run, then
// 101 (the state the owner has), then the 102 built by scripts/cards/gen-rebuild-sql.mts from real subjects of subjects.json with
// verdicts set here (the real verdicts come from the research file, which never enters the repository). Checked: the guard (a card owned, a
// pack opened, an open report: nothing changes), the age rule (a subject that fails it gets no card), the apply-time adult rule, the pairs
// (8 consecutive numbers a group, 1/2 then 2/2 per edition, small_2x per half), what a person keeps, a refused photo staying out, a second
// run, the rollback.
import { readFileSync } from 'node:fs';

import { vi, beforeAll, describe, expect, it } from 'vitest';

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

import { build } from '../../../scripts/cards/gen-rebuild-sql.mts';
import { SUBJECTS_JSON, type Subject } from '../../../scripts/cards/gen-subjects.mts';

import { failure, freshCardsDb, one, readCardsSql, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

const ALL = JSON.parse(readFileSync(SUBJECTS_JSON, 'utf8')) as Subject[];
const pick = (slug: string, ok: boolean, reason: string | null = null): Subject => {
  const s = ALL.find((x) => x.slug === slug);
  if (!s) throw new Error(`no subject ${slug}`);
  return { ...s, age: { ok, reason, checked_on: '2026-11-12' } };
};
// Two people, three groups that pass the photo rule, one group that does not (its lineup had a minor on the photo date).
const SUBJECTS: Subject[] = [
  pick('iu', true), pick('jennie', true), pick('btob', true), pick('akmu', true), pick('nct', false, 'minor_at_photo'), pick('illit', true),
];
const SQL = build(SUBJECTS);

const FIXTURE = `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique, inception_date date);
create table public.idols (
  id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0);
create function gid(s text) returns integer language sql as $$ select id from public.groups where slug = s $$;
insert into public.groups (name, slug, inception_date) values
  ('IU', 'iu', '2008-09-18'), ('BLACKPINK', 'blackpink', '2016-08-08'), ('Jennie', 'jennie', '2018-11-12'),
  ('BTOB', 'btob', '2012-03-21'), ('AKMU', 'akmu', '2014-04-07'), ('NCT', 'nct', '2016-04-09'), ('ILLIT', 'illit', '2024-03-25');
insert into public.idols (group_id, name, birth_date) values
  (gid('iu'), 'IU', current_date - interval '30 years'),
  (gid('blackpink'), 'Jennie', current_date - interval '29 years'), (gid('blackpink'), 'Lisa', current_date - interval '29 years'),
  (gid('btob'), 'Eunkwang', current_date - interval '33 years'), (gid('btob'), 'Minhyuk', current_date - interval '32 years'),
  (gid('akmu'), 'Chanhyuk', current_date - interval '30 years'), (gid('akmu'), 'Suhyun', current_date - interval '27 years'),
  (gid('nct'), 'Adult', current_date - interval '28 years'),
  -- the apply-time rule (decision 17) still runs: an active minor in public.idols leaves the group out even when the photo rule passed
  (gid('illit'), 'Adult One', current_date - interval '22 years'), (gid('illit'), 'Minor One', current_date - interval '16 years');
`;

async function stateDb(): Promise<PGlite> {
  const db = await freshCardsDb();
  await db.exec(FIXTURE);
  await db.exec(readCardsSql('101-catalog.sql'));
  return db;
}
async function run(db: PGlite, sql: string): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(sql, { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}
type Card = { card_no: number; num: string; entity_id: string; rarity: string; edition: string; part: number; small_2x: boolean };
const catalog = (db: PGlite): Promise<Card[]> =>
  rows<Card>(db, `select card_no, num, entity_id, rarity, edition, part, small_2x from cards_catalog order by card_no`);

describe('102-catalog-rebuild.sql: the rebuild', () => {
  let db: PGlite;
  let notices: string[];
  let before: Array<{ entity_id: string }>;
  beforeAll(async () => {
    db = await stateDb();
    // the owner's script had cut Jennie's and BTOB's whole cards, and the owner had moved BTOB's crop
    await db.exec(`update cards_photos set storage_path = 'jennie-50-30', file_focal_x = 50, file_focal_y = 30 where source_path = 'images/group-photos/jennie.jpg';
                   update cards_photos set focal_x = 30, storage_path = 'btob-30-50', file_focal_x = 30, file_focal_y = 50 where source_path = 'images/group-photos/btob.jpg';`);
    before = await rows<{ entity_id: string }>(db, `select entity_id from cards_catalog order by card_no`);
    notices = await run(db, SQL.sql);
  });

  it('started from the 101 catalog, NCT included (the state the new rule corrects)', () => {
    expect(before.some((c) => c.entity_id === 'group:nct')).toBe(true);
  });

  it('gives no card to a subject that fails the photo age rule, and says so with the reason only', async () => {
    expect(await one(db, `select count(*)::int from cards_entities where id = 'group:nct'`)).toBe(0);
    expect(await one(db, `select count(*)::int from cards_photos where source_path = 'images/group-photos/nct.jpg'`)).toBe(0);
    expect(notices).toContain('102-catalog-rebuild: left out nct (age rule: minor_at_photo)');
  });

  it('still applies the apply-time adult rule of decision 17 on public.idols', async () => {
    expect(await one(db, `select count(*)::int from cards_entities where id = 'group:illit'`)).toBe(0);
    expect(notices).toContain('102-catalog-rebuild: left out illit (minor_member)');
  });

  it('numbers from BV1-0001, contiguous: 4 a person, 8 a group, sections A to Z, people before their group', async () => {
    const cards = await catalog(db);
    expect(cards.map((c) => c.card_no)).toEqual(cards.map((_, i) => i + 1));
    expect(cards[0]?.num).toBe('BV1-0001');
    // sections: AKMU, BLACKPINK (Jennie), BTOB, IU
    const order = [...new Set(cards.map((c) => c.entity_id))];
    expect(order).toEqual(['group:akmu', 'idol:jennie', 'group:btob', 'idol:iu']);
    expect(cards.filter((c) => c.entity_id === 'idol:iu')).toHaveLength(4);
    expect(cards.filter((c) => c.entity_id === 'group:btob')).toHaveLength(8);
    expect(notices).toContain('102-catalog-rebuild: 2 people and 2 groups in, 24 cards, highest number BV1-0024');
  });

  it('gives a group a pair per edition: 1/2 then 2/2, consecutive numbers, C U R UR', async () => {
    const btob = (await catalog(db)).filter((c) => c.entity_id === 'group:btob');
    expect(btob.map((c) => `${c.rarity}${c.part}`)).toEqual(['C1', 'C2', 'U1', 'U2', 'R1', 'R2', 'UR1', 'UR2']);
    expect(btob.map((c) => c.edition)).toEqual(['std', 'std', 'stage', 'stage', 'holo', 'holo', 'gold', 'gold']);
    for (let k = 1; k < btob.length; k++) expect(btob[k]!.card_no).toBe(btob[k - 1]!.card_no + 1);
    const iu = (await catalog(db)).filter((c) => c.entity_id === 'idol:iu');
    expect(iu.map((c) => `${c.rarity}${c.part}`)).toEqual(['C0', 'U0', 'R0', 'UR0']);
  });

  it('takes small_2x per half from the pair of subjects.json, the photo row is small when either half is', async () => {
    const s = SUBJECTS.find((x) => x.slug === 'btob')!;
    const cards = (await catalog(db)).filter((c) => c.entity_id === 'group:btob');
    for (const c of cards) expect(c.small_2x).toBe(s.pair!.halves.find((h) => h.part === c.part)!.small_2x);
    expect(await one(db, `select small_2x from cards_photos where source_path = 'images/group-photos/btob.jpg'`)).toBe(s.pair!.halves.some((h) => h.small_2x));
    const iu = SUBJECTS.find((x) => x.slug === 'iu')!;
    expect(await one(db, `select bool_and(small_2x = $1) from cards_catalog where entity_id = 'idol:iu'`, [iu.small_2x])).toBe(true);
  });

  it('keeps a person published files and every focal point; a group loses its whole-card files', async () => {
    const jennie = await rows(db, `select storage_path, file_focal_x, file_focal_y, focal_x, focal_y from cards_photos where source_path = 'images/group-photos/jennie.jpg'`);
    expect(jennie).toEqual([{ storage_path: 'jennie-50-30', file_focal_x: 50, file_focal_y: 30, focal_x: 50, focal_y: 30 }]);
    const btob = await rows(db, `select storage_path, file_focal_x, file_focal_y, focal_x, focal_y from cards_photos where source_path = 'images/group-photos/btob.jpg'`);
    expect(btob).toEqual([{ storage_path: null, file_focal_x: null, file_focal_y: null, focal_x: 30, focal_y: 50 }]);
    expect(notices).toContain('102-catalog-rebuild: 1 people kept their published files; the groups need their halves cut (publish-card-files.mjs)');
  });

  it('replaces the unique key and adds the columns of the pairs', async () => {
    const keys = await rows<{ conname: string }>(db, `select conname from pg_constraint where conrelid = 'public.cards_catalog'::regclass and contype = 'u' order by conname`);
    expect(keys.map((k) => k.conname)).toEqual(['cards_catalog_entity_rarity_part_key', 'cards_catalog_num_key']);
    expect(await failure(db, `insert into cards_catalog (card_no, num, entity_id, rarity, edition, part) values (999, 'BV1-0999', 'idol:iu', 'C', 'std', 3)`)).toMatch(/cards_catalog_part_check/);
  });

  it('gives the same catalog on a second run', async () => {
    const first = await catalog(db);
    await run(db, SQL.sql);
    expect(await catalog(db)).toEqual(first);
  });
});

describe('102-catalog-rebuild.sql: the guard', () => {
  it('refuses while a player owns a card, and changes nothing', async () => {
    const db = await stateDb();
    await db.exec(`insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
                   insert into cards_owned (user_id, card_no) values ('00000000-0000-0000-0000-000000000001', 1);`);
    const read = (): Promise<unknown[]> => rows(db, `select card_no, num, entity_id, rarity, edition, photo_id from cards_catalog order by card_no`);
    const before = await read();
    expect(before.length).toBeGreaterThan(0);
    const err = await failure(db, SQL.sql);
    expect(err).toMatch(/a player owns a card/);
    expect(await read()).toEqual(before);
    expect(await one(db, `select count(*)::int from information_schema.columns where table_name = 'cards_catalog' and column_name = 'part'`)).toBe(0);
  });

  it('refuses after a pack was opened, and while a photo report is open', async () => {
    const db = await stateDb();
    await db.exec(`insert into auth.users (id) values ('00000000-0000-0000-0000-000000000002');
                   insert into cards_packs (user_id, source, cards) values ('00000000-0000-0000-0000-000000000002', 'stock', array[1,2,3,4,5]);`);
    expect(await failure(db, SQL.sql)).toMatch(/a pack was opened/);
    const db2 = await stateDb();
    await db2.exec(`insert into cards_reports (card_no, role, message) values (1, 'person', 'please check')`);
    expect(await failure(db2, SQL.sql)).toMatch(/a photo report is open/);
    await db2.exec(`update cards_reports set status = 'closed'`);
    expect(await failure(db2, SQL.sql)).toBeNull();
  });

  it('keeps a photo the owner refused or removed out of the rebuilt catalog', async () => {
    const db = await stateDb();
    await db.exec(`update cards_photos set status = 'removed' where source_path = 'images/group-photos/iu.jpg'`);
    const notices = await run(db, SQL.sql);
    expect(notices).toContain('102-catalog-rebuild: left out iu (photo_removed)');
    expect(await one(db, `select count(*)::int from cards_catalog where entity_id = 'idol:iu'`)).toBe(0);
  });

  it('works on a database where 101 was never applied', async () => {
    const db = await freshCardsDb();
    await db.exec(FIXTURE);
    await run(db, SQL.sql);
    expect(await one(db, `select count(*)::int from cards_catalog`)).toBe(24);
  });
});

describe('102-catalog-rebuild.rollback.sql', () => {
  it('empties the catalog and gives back the shape of 001; 102 runs again after it', async () => {
    const db = await stateDb();
    await run(db, SQL.sql);
    await run(db, SQL.rollback);
    expect(await one(db, `select count(*)::int from cards_catalog`)).toBe(0);
    expect(await one(db, `select count(*)::int from information_schema.columns where table_name = 'cards_catalog' and column_name in ('part', 'small_2x')`)).toBe(0);
    expect(await one(db, `select count(*)::int from pg_constraint where conname = 'cards_catalog_entity_rarity_key'`)).toBe(1);
    await run(db, SQL.rollback);
    await run(db, SQL.sql);
    expect(await one(db, `select count(*)::int from cards_catalog`)).toBe(24);
  });

  it('refuses while a player owns a card', async () => {
    const db = await stateDb();
    await run(db, SQL.sql);
    await db.exec(`insert into auth.users (id) values ('00000000-0000-0000-0000-000000000003');
                   insert into cards_owned (user_id, card_no) values ('00000000-0000-0000-0000-000000000003', 1);`);
    expect(await failure(db, SQL.rollback)).toMatch(/a player owns a card/);
  });
});

describe('gen-rebuild-sql.mts', () => {
  it('refuses to write 102 while a subject has no age verdict', () => {
    expect(() => build([{ ...pick('iu', true), age: null }])).toThrow(/no age verdict/);
  });

  it('leaves no em or en dash in the files', () => {
    expect(SQL.sql).not.toMatch(/[–—]/);
    expect(SQL.rollback).not.toMatch(/[–—]/);
  });
});
