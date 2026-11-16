// Bunnyverse Cards lot 6: the data of the proofs of 116-photos-harvest.sql (harvest-sql.test.ts on PGlite, kpopcards/harvest-sql-postgres.test.ts
// on a real Postgres). Invented people and groups; the catalog state of lot 3 (catalog-append-fixture.ts) is the starting point. Test code only.
import { INPUT, catalogFiles } from './catalog-append-fixture';
import { buildHarvest, type HarvestPhotoRow, type HarvestSqlInput, type HarvestSqlSubject } from './harvest-sql';

/** Groups and idols the lot 6 subjects resolve against, added to the lot 3 fixture (groups iu, blackpink, jennie, btob, akmu). */
export const EXTRA = `
-- the columns and the key of the real public.idols (supabase/migrations/124_verse_entity_foundation.sql) that 116 needs
alter table public.idols add column if not exists needs_review boolean not null default false, add column if not exists review_reason text;
alter table public.idols add constraint idols_group_id_name_key unique (group_id, name);
update public.idols set wikidata_qid = 'Q500' where name = 'Jennie';
update public.idols set wikidata_qid = 'Q601' where name = 'Eunkwang';
insert into public.groups (name, slug, inception_date) values ('TRIO', 'trio', '2024-05-01'), ('DUPS', 'dups', '2020-01-01');
insert into public.idols (group_id, name, birth_date, wikidata_qid, active) values
  (gid('trio'), 'Ada', '1999-04-04', 'Q1', true),
  (gid('trio'), 'Bea', '2000-05-05', 'Q2', true),
  (gid('trio'), 'Cleo', '2010-03-15', 'Q3', true),
  (gid('dups'), 'Dup One', '1995-01-01', 'Q700', true),
  (gid('dups'), 'Dup Two', '1995-01-01', 'Q700', true);
-- a Kpopdle idol whose Wikidata id has two rows (as Kai or DK in production): found by its id
insert into public.idols (id, group_id, name, birth_date, wikidata_qid, active) values (9001, gid('dups'), 'Dup Kpopdle', '1996-01-01', 'Q701', true),
  (9002, gid('trio'), 'Dup Kpopdle', '1996-01-01', 'Q701', true);
-- the table of the group types (file 110, in production since 2026-11-15), empty here
create table if not exists public.cards_group_types (
  entity_id text constraint cards_group_types_pkey primary key constraint cards_group_types_entity_id_fkey references public.cards_entities(id) on delete cascade,
  gender text not null constraint cards_group_types_gender_check check (gender in ('girl', 'boy', 'mixed')),
  source_a text not null, source_b text not null, checked_on date not null);
-- the Kpopdle source view reads no row with needs_review (as in production, file 099)
create view public.dle_src_kpop_idol as select id::text as entity_id from public.idols where active and not needs_review;
`;

let n = 0;
export const photo = (o: Partial<HarvestPhotoRow> = {}): HarvestPhotoRow => ({
  status: 'auto', source: 'commons', page: `https://commons.wikimedia.org/wiki/File:Harvest_${++n}.jpg`, url: `https://upload.example/h${n}.jpg`, width: 2000,
  height: 3000, sha1: `harvest-sha-${n}`, author: 'A Photographer \u2013 Seoul', author_url: null, licence: 'CC BY 4.0', licence_url: 'https://creativecommons.org/licenses/by/4.0',
  share_alike: false, date: `2025-0${(n % 9) + 1}-10`, date_precision: 'day', event: `Harvest event ${n}`, stage: false, quality: 3, focal: { x: 50, y: 30 },
  news_only: false, review: [], ...o,
});
const person = (slug: string, qid: string, group: string | null, photos: HarvestPhotoRow[] = [], locked = false): HarvestSqlSubject =>
  ({ slug, kind: 'idol', name: slug, qid, group, locked, photos });

/** A page and a sha1 that lot 3's fixture already holds (the second photo of IU). */
export const EXISTING_PAGE = INPUT.subjects[0]!.photos[1]!.page;
export const EXISTING_SHA1 = INPUT.subjects[0]!.photos[1]!.sha1!;

export const HARVEST: HarvestSqlInput = {
  checked_on: '2026-11-16',
  subjects: [
    person('ada-trio', 'Q1', 'trio', [photo({ quality: 5 }), photo({ stage: true }), photo()]),
    person('bea-trio', 'Q2', 'trio', [photo(), photo({ status: 'pending', review: ['2 people are in the frame'] })]),
    person('cleo-trio', 'Q3', 'trio', [], true),
    { slug: 'trio', kind: 'group', name: 'TRIO', qid: null, group: null, locked: true, photos: [] },
    // an existing person (Jennie, entity idol:jennie, carries Q500) under a new slug: the entity is kept, the photos come in
    person('jennie-blackpink', 'Q500', 'blackpink', [photo(), photo()]),
    // a new member of an existing group, and a photo the game already holds (page and sha1), skipped
    person('eunkwang-btob', 'Q601', 'btob', [photo(), photo(), photo({ page: EXISTING_PAGE }), photo({ sha1: EXISTING_SHA1 })]),
    { slug: 'btob', kind: 'group', name: 'BTOB', qid: null, group: null, locked: false, photos: [photo({ width: 4000, height: 2600 })] },
    // no public.idols row: 116 adds one (inactive, flagged, no birth date), and the adult's photos wait as pending (integrator, 2026-11-16)
    person('ghost-trio', 'Q999', 'trio', [photo(), photo()]),
    // two rows for a Wikidata id: skipped with a notice; a Kpopdle idol with the same problem is found by its public.idols id
    person('dup-dups', 'Q700', 'dups', [photo()]),
    { ...person('dup-kpopdle-dups', 'Q701', 'dups', [photo(), photo()]), idol_id: 9001 },
  ],
};
export const HARVEST_SQL = buildHarvest(HARVEST);

/** The files after the schema files (001 to 003), in apply order, with the extra people before 101 and 103. */
export const harvestBase = (): string[] => {
  const f = catalogFiles();
  return [f[0]!, EXTRA, ...f.slice(1)];
};

/** The SQL with its clock fixed (the file reads now() once, for the 23:50 to 00:30 UTC window). */
export const at = (sql: string, hhmm: string): string => sql.replace("(now() at time zone 'UTC')::time", `time '${hhmm}'`);
