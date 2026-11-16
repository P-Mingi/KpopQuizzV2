// KpopCards file 114: the data of its proofs (catalog-append-sql.test.ts on PGlite, kpopcards/catalog-append-concurrency.test.ts on a real
// Postgres). Subjects with live and pending photos, the groups and idols they resolve against, and the SQL files in apply order. Test code only.
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { build3, type Catalog3Input, type Photo3, type Subject3 } from './catalog3-sql';
import { build, type Subject } from './rebuild-sql';
import { CARDS_SQL, readCardsSql } from './sql-harness';

const ALL = JSON.parse(readFileSync(path.join(CARDS_SQL, '../../design/cards/data/subjects.json'), 'utf8')) as Subject[];
const lot2 = (slug: string): Subject => ({ ...ALL.find((x) => x.slug === slug)!, age: { ok: true, reason: null, checked_on: '2026-11-12' } });

let pageN = 0;
const photo = (slot: number, o: Partial<Photo3> = {}): Photo3 => ({
  slot, status: 'auto', source: 'commons', page: `https://commons.wikimedia.org/wiki/File:Append_${++pageN}.jpg`, url: `https://upload.example/${pageN}.jpg`,
  width: 2000, height: 3000, sha1: `sha${pageN}`, author: 'A Photographer', author_url: null, licence: 'CC BY-SA 4.0',
  licence_url: 'https://creativecommons.org/licenses/by-sa/4.0', share_alike: true, date: `2024-0${(slot % 9) + 1}-10`, date_precision: 'day',
  event: `Event ${pageN}`, stage: false, quality: 3, focal: { x: 50, y: 30 }, source_path: null, news_only: false, review: [], ...o,
});
const lot2Photo = (slug: string, o: Partial<Photo3> = {}): Photo3 => {
  const s = ALL.find((x) => x.slug === slug)!;
  return photo(1, { status: 'approved', page: s.photo.commons_page, source_path: `${s.photo.bucket}/${s.photo.path}`, ...o });
};
const pending = (slot: number, o: Partial<Photo3> = {}): Photo3 => photo(slot, { status: 'pending', review: ['waits for the owner'], ...o });

// IU (person): 3 live photos now (C U R), 2 pending: the owner approves them later (SR, UR).
const IU: Subject3 = { slug: 'iu', kind: 'idol', end_year: null, photos: [
  lot2Photo('iu', { quality: 3 }), photo(2, { quality: 5 }), photo(3, { quality: 4, stage: true }),
  pending(4, { quality: 4 }), pending(5, { quality: 2 }),
] };
// JENNIE (person): 1 live photo and 1 pending: no edition now; once approved she enters with C and U.
const JENNIE: Subject3 = { slug: 'jennie', kind: 'idol', end_year: null, photos: [lot2Photo('jennie'), pending(2, { quality: 4 })] };
// BTOB (group): 2 live photos (C U), 1 pending (R, a pair with consecutive numbers).
const BTOB: Subject3 = { slug: 'btob', kind: 'group', end_year: null, photos: [
  lot2Photo('btob', { width: 4000, height: 2600, focal: { x: 50, y: 50 } }), photo(2, { width: 4000, height: 2600, focal: { x: 50, y: 50 } }),
  pending(3, { width: 4000, height: 2600, focal: { x: 50, y: 50 } }),
] };
// AKMU (group): one photo for good: it stays out of the packs.
const AKMU: Subject3 = { slug: 'akmu', kind: 'group', end_year: null, photos: [photo(1, { width: 4000, height: 2600, focal: { x: 50, y: 50 } })] };
// LISA-like new person with 2 live photos that arrive only as pending: a new subject from 2 approvals.
export const INPUT: Catalog3Input = { checked_on: '2026-11-13', subjects: [IU, JENNIE, BTOB, AKMU], left_out: [] };

export const FIXTURE = `
create table public.groups (id serial primary key, name text not null unique, slug text not null unique, inception_date date);
create table public.idols (id serial primary key, group_id integer not null references public.groups(id), name text not null, birth_date date,
  wikidata_qid text, active boolean not null default true, ord integer not null default 0);
create function gid(s text) returns integer language sql as $$ select id from public.groups where slug = s $$;
insert into public.groups (name, slug, inception_date) values ('IU', 'iu', '2008-09-18'), ('BLACKPINK', 'blackpink', '2016-08-08'),
  ('Jennie', 'jennie', '2018-11-12'), ('BTOB', 'btob', '2012-03-21'), ('AKMU', 'akmu', '2014-04-07');
insert into public.idols (group_id, name, birth_date) values
  (gid('iu'), 'IU', current_date - interval '30 years'), (gid('blackpink'), 'Jennie', current_date - interval '29 years'),
  (gid('btob'), 'Eunkwang', current_date - interval '33 years'), (gid('btob'), 'Minhyuk', current_date - interval '32 years'),
  (gid('akmu'), 'Chanhyuk', current_date - interval '30 years'), (gid('akmu'), 'Suhyun', current_date - interval '27 years');
`;
export const U1 = '00000000-0000-4000-8000-000000000001';


/** The SQL texts after the base schema files (001 to 003), in apply order: the groups and idols, 101, lot 2, then 103 for INPUT. */
export const catalogFiles = (): string[] => [FIXTURE, readCardsSql('101-catalog.sql'), build([lot2('iu'), lot2('jennie'), lot2('btob')]).sql, build3(INPUT).sql];

/** A player who holds cards and opened a pack: the catalog numbers are frozen. */
export const PLAYER = `insert into auth.users values ('${U1}');
  insert into cards_wallets (user_id, stock, anchor, paris_day) values ('${U1}', 3, now(), current_date);
  insert into cards_owned (user_id, card_no, copies) values ('${U1}', 1, 2), ('${U1}', 2, 1);
  insert into cards_packs (user_id, source, cards) values ('${U1}', 'stock', array[1, 2, 3, 1, 2]);`;

/** The owner approves every photo that waited in "To review". */
export const APPROVE_ALL = `update cards_photos set status = 'approved' where status = 'pending';`;

/** A second approved photo for AKMU, which had one: it enters the catalog as a new subject. */
export const AKMU_SECOND = `insert into cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at, event_name,
    event_date, event_date_precision, focal_x, focal_y, source_width, source_height, status, review_note, quality, stage, news_only, sha1)
  select entity_id, 2, source, source_page || '-b', file_url || '-b', author, licence, licence_url, share_alike, checked_at, event_name || 'b',
    event_date - 40, event_date_precision, focal_x, focal_y, source_width, source_height, 'approved', 'ok', quality, stage, news_only, sha1 || 'b'
    from cards_photos where entity_id = 'group:akmu' and slot = 1`;
