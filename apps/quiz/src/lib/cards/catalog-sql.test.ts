// Bunnyverse Cards, lane DATA: pglite proof of docs/pending-migrations/cards/100 and 101. The real schema files 001 to 003 are run, then
// 101-catalog.sql on fixture groups and idols rows, and the rules of the brief are checked: adult rule (decision 17), group line (18),
// contiguous numbers in the order of decision 2, 4 cards per subject, the Verify notices, idempotence, the rollback.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { beforeAll, describe, expect, it } from 'vitest';

import { CARDS_SQL, freshCardsDb, one, readCardsSql, rows } from './sql-harness';

import type { PGlite } from '@electric-sql/pglite';

const FIXTURE = `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique, inception_date date);
create table public.idols (
  id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0);

-- a soloist, adult (own group row, one idol)
insert into public.groups (name, slug, inception_date) values ('IU', 'iu', '2008-09-18');
insert into public.idols (group_id, name, birth_date, wikidata_qid) values (currentval_g('iu'), 'IU', current_date - interval '30 years', 'Q1');
-- a member of another group: the person's own group row has no idol, the idol sits in BLACKPINK (not a subject)
insert into public.groups (name, slug, inception_date) values ('BLACKPINK', 'blackpink', '2016-08-08');
insert into public.groups (name, slug, inception_date) values ('Jennie', 'jennie', '2018-11-12');
insert into public.idols (group_id, name, birth_date) values (currentval_g('blackpink'), 'Jennie', current_date - interval '29 years');
insert into public.idols (group_id, name, birth_date) values (currentval_g('blackpink'), 'Lisa', current_date - interval '29 years');
-- exactly 18 years old today: in; one day younger: out
insert into public.groups (name, slug, inception_date) values ('Jimin', 'jimin', '2013-06-13');
insert into public.idols (group_id, name, birth_date) values (currentval_g('jimin'), 'Jimin', current_date - interval '18 years');
insert into public.groups (name, slug, inception_date) values ('Rose', 'rose', '2016-08-08');
insert into public.idols (group_id, name, birth_date) values (currentval_g('rose'), 'Rose', current_date - interval '18 years' + interval '1 day');
-- a soloist with a groups row and no idols row
insert into public.groups (name, slug, inception_date) values ('PSY', 'psy', '2001-01-01');
-- a group of adults, in; a group with one minor, out; a group with one unknown birth date, out; a group with no member, out
insert into public.groups (name, slug, inception_date) values ('BTOB', 'btob', '2012-03-21');
insert into public.idols (group_id, name, birth_date, ord) values
  (currentval_g('btob'), 'Eunkwang', current_date - interval '33 years', 1), (currentval_g('btob'), 'Minhyuk', current_date - interval '32 years', 2);
insert into public.idols (group_id, name, birth_date, ord, active) values (currentval_g('btob'), 'Gone Member', null, 3, false);
insert into public.groups (name, slug, inception_date) values ('ILLIT', 'illit', '2024-03-25');
insert into public.idols (group_id, name, birth_date) values
  (currentval_g('illit'), 'Adult One', current_date - interval '22 years'), (currentval_g('illit'), 'Minor One', current_date - interval '16 years');
insert into public.groups (name, slug, inception_date) values ('TWS', 'tws', '2024-01-22');
insert into public.idols (group_id, name, birth_date) values (currentval_g('tws'), 'Known', current_date - interval '21 years'), (currentval_g('tws'), 'Unknown', null);
insert into public.groups (name, slug, inception_date) values ('AKMU', 'akmu', '2014-04-07');
-- a member of MAMAMOO (a section after IU in A to Z)
insert into public.groups (name, slug, inception_date) values ('MAMAMOO', 'mamamoo', '2014-06-19');
insert into public.groups (name, slug, inception_date) values ('Hwasa', 'hwasa', '2019-07-29');
insert into public.idols (group_id, name, birth_date) values (currentval_g('mamamoo'), 'Hwasa', current_date - interval '31 years');
`;
const SETUP = `create function currentval_g(s text) returns integer language plpgsql as $$ declare r integer; begin select id into r from public.groups where slug = s; return r; end $$;`;

async function fixtureDb(): Promise<PGlite> {
  const db = await freshCardsDb();
  await db.exec(SETUP);
  await db.exec(FIXTURE);
  return db;
}

async function run101(db: PGlite): Promise<string[]> {
  const notices: string[] = [];
  await db.exec(readCardsSql('101-catalog.sql'), { onNotice: (n) => notices.push(n.message ?? '') });
  return notices;
}

describe('101-catalog.sql on fixture groups and idols', () => {
  let db: PGlite;
  let notices: string[];
  beforeAll(async () => {
    db = await fixtureDb();
    notices = await run101(db);
  });

  it('puts in the adult soloist, the adult member (group line), the boundary 18th birthday and the adult groups', async () => {
    const subj = await rows<{ entity_id: string }>(db, `select distinct entity_id from cards_catalog order by entity_id`);
    expect(subj.map((r) => r.entity_id)).toEqual(['group:btob', 'idol:hwasa', 'idol:iu', 'idol:jennie', 'idol:jimin']);
  });

  it('leaves out minors, unknown birth dates, empty groups, missing idol rows and missing slugs, each with a reason', () => {
    const left = notices.filter((m) => m.startsWith('101-catalog: left out '));
    const has = (slug: string, reason: string) => expect(left).toContain(`101-catalog: left out ${slug} (${reason})`);
    has('rose', 'minor');
    has('psy', 'no_idol_row');
    has('illit', 'minor_member');
    has('tws', 'unknown_birth_date');
    has('akmu', 'no_active_member');
    has('nct', 'no_groups_row');
    expect(left.length).toBe(59 - 5);
  });

  it('gives each subject 4 cards, C U R UR, contiguous from BV1-0001, in the order of decision 2', async () => {
    const r = await rows<{ num: string; entity_id: string; rarity: string; edition: string }>(
      db, `select num, entity_id, rarity, edition from cards_catalog order by card_no`);
    expect(r.length).toBe(20);
    expect(r.map((x) => x.num)).toEqual(Array.from({ length: 20 }, (_, k) => `BV1-${String(k + 1).padStart(4, '0')}`));
    // sections: BLACKPINK (Jennie), BTOB (group), Jimin, IU... sorted by section name; Hwasa sits in MAMAMOO.
    const order = [...new Set(r.map((x) => x.entity_id))];
    expect(order).toEqual(['idol:jennie', 'group:btob', 'idol:iu', 'idol:jimin', 'idol:hwasa']);
    for (let s = 0; s < 5; s++) {
      expect(r.slice(s * 4, s * 4 + 4).map((x) => `${x.rarity}/${x.edition}`)).toEqual(['C/std', 'U/stage', 'R/holo', 'UR/gold']);
      expect(new Set(r.slice(s * 4, s * 4 + 4).map((x) => x.entity_id)).size).toBe(1);
    }
  });

  it('resolves names, debut years and the group line from the database', async () => {
    const e = await rows<{ id: string; name: string; group_id: string | null; debut_year: number | null; kind: string; qid: string | null }>(
      db, `select id, name, group_id, debut_year, kind, qid from cards_entities order by id`);
    const by = Object.fromEntries(e.map((x) => [x.id, x]));
    expect(by['idol:jennie']).toMatchObject({ name: 'Jennie', group_id: 'group:blackpink', debut_year: 2016, kind: 'idol' });
    expect(by['idol:hwasa']).toMatchObject({ group_id: 'group:mamamoo', debut_year: 2014 });
    expect(by['idol:iu']).toMatchObject({ group_id: null, debut_year: 2008, qid: 'Q1' });
    expect(by['group:btob']).toMatchObject({ name: 'BTOB', debut_year: 2012, kind: 'group' });
    // the group lines carry no card
    expect(by['group:blackpink']).toMatchObject({ kind: 'group', name: 'BLACKPINK' });
    expect(await one(db, `select count(*) from cards_catalog where entity_id in ('group:blackpink', 'group:mamamoo')`)).toBe(0);
  });

  it('writes one approved photo per subject with its credit, focal point and source', async () => {
    const p = await rows<Record<string, unknown>>(db, `select * from cards_photos order by entity_id`);
    expect(p.length).toBe(5);
    for (const x of p) {
      expect(x).toMatchObject({ slot: 1, source: 'commons', status: 'approved' });
      expect(String(x.author).length).toBeGreaterThan(0);
      expect(String(x.licence_url)).toMatch(/^https:\/\/creativecommons\.org\//);
      expect(String(x.source_page)).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
      expect(String(x.source_path)).toMatch(/^images\/group-photos\/[a-z0-9-]+\.jpg$/);
      expect(x.storage_path).toBeNull();
    }
    const by = Object.fromEntries(p.map((x) => [x.entity_id as string, x]));
    expect(by['group:btob']).toMatchObject({ focal_x: 50, focal_y: 50, share_alike: true });
    expect(by['idol:iu']).toMatchObject({ focal_x: 50, focal_y: 30, share_alike: false });
    expect(await one(db, `select count(*) from cards_catalog where photo_id is null`)).toBe(0);
  });

  it('locks Era and Full Art with the reason "one" and keeps every card in packs', async () => {
    expect(await one(db, `select count(*) from cards_entities e where e.id in (select entity_id from cards_catalog) and e.lock_reasons = '{"SR":"one","L":"one"}'::jsonb`)).toBe(5);
    expect(await one(db, `select count(*) from cards_catalog where in_packs`)).toBe(20);
    expect(await one(db, `select count(*) from cards_catalog where rarity in ('SR', 'L')`)).toBe(0);
  });

  it('prints the Verify counts', () => {
    expect(notices).toContain('101-catalog: 5 subjects in, 54 left out, 0 already there');
    for (const r of ['C', 'U', 'R', 'UR']) expect(notices).toContain(`101-catalog: 5 cards ${r} in the catalog`);
    expect(notices).toContain('101-catalog: highest number BV1-0020');
  });

  it('is idempotent: a second run adds nothing', async () => {
    const second = await run101(db);
    expect(await one(db, `select count(*) from cards_catalog`)).toBe(20);
    expect(await one(db, `select count(*) from cards_photos`)).toBe(5);
    expect(second).toContain('101-catalog: 0 subjects in, 54 left out, 5 already there');
  });

  it('the rollback removes it all, and refuses while a player owns a card', async () => {
    const d2 = await fixtureDb();
    await run101(d2);
    await d2.exec(`insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001');
      insert into cards_owned (user_id, card_no) values ('00000000-0000-0000-0000-000000000001', 1);`);
    await expect(d2.exec(readCardsSql('101-catalog.rollback.sql'))).rejects.toThrow(/a player owns/);
    await d2.exec(`delete from cards_owned`);
    await d2.exec(readCardsSql('101-catalog.rollback.sql'));
    expect(await one(d2, `select count(*) from cards_catalog`)).toBe(0);
    expect(await one(d2, `select count(*) from cards_photos`)).toBe(0);
    expect(await one(d2, `select count(*) from cards_entities`)).toBe(0);
  });
});

describe('100-bucket-cards.sql', () => {
  it('sets the bucket to WebP only, 2 MB, public, idempotently, and the rollback restores 1 MB', async () => {
    const db = await freshCardsDb();
    await db.exec(readCardsSql('100-bucket-cards.sql'));
    await db.exec(readCardsSql('100-bucket-cards.sql'));
    const b = await rows<{ public: boolean; file_size_limit: string; allowed_mime_types: string[] }>(db, `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'cards'`);
    expect(b.length).toBe(1);
    expect(b[0]).toMatchObject({ public: true, allowed_mime_types: ['image/webp'] });
    expect(Number(b[0]!.file_size_limit)).toBe(2097152);
    await db.exec(readCardsSql('100-bucket-cards.rollback.sql'));
    expect(Number(await one(db, `select file_size_limit from storage.buckets where id = 'cards'`))).toBe(1048576);
  });
});

describe('the new cards files are ONE DO block each', () => {
  it.each([['100-bucket-cards.sql', 'c100'], ['100-bucket-cards.rollback.sql', 'c100r'], ['101-catalog.sql', 'c101'], ['101-catalog.rollback.sql', 'c101r']])('%s', (file, tag) => {
    const sql = readFileSync(path.join(CARDS_SQL, file), 'utf8');
    const outer = `$${tag}$`;
    const code = sql.split('\n').filter((l) => !l.startsWith('--')).join('\n').trim();
    expect(code.startsWith(`do ${outer}\ndeclare`) || code.startsWith(`do ${outer}\nbegin`)).toBe(true);
    expect(code.endsWith(`end ${outer};`)).toBe(true);
    expect(code.split(outer).length).toBe(3);
    expect(sql).not.toMatch(/\bcreate\s+(local\s+|global\s+)?temp(orary)?\b/i);
    expect(sql).not.toMatch(/[–—]/);
  });
});
