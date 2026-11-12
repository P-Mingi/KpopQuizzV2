// Bunnyverse Cards lot 2: writes docs/pending-migrations/cards/102-catalog-rebuild.sql and its rollback from docs/design/cards/data/subjects.json
// (with the age verdicts of age-check.json and the pairs of the group photos). No network, no database.
//   tsx scripts/cards/gen-subjects.mts && tsx scripts/cards/gen-rebuild-sql.mts
// Refuses to write while a subject has no age verdict (the age rule decides first, every time).
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUBJECTS_JSON, type Subject } from './gen-subjects.mts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');

export interface RebuildSql { sql: string; rollback: string; kept: Subject[]; left: Array<{ slug: string; reason: string }> }

export function build(subjects: Subject[]): RebuildSql {
  const missing = subjects.filter((s) => !s.age);
  if (missing.length) throw new Error(`no age verdict for ${missing.map((s) => s.slug).join(', ')} (run age-check.mts, then gen-subjects.mts)`);
  const kept = subjects.filter((s) => s.age?.ok);
  const left = subjects.filter((s) => !s.age?.ok).map((s) => ({ slug: s.slug, reason: s.age?.reason ?? 'unknown' }));
  const checkedOn = subjects[0]?.age?.checked_on ?? '';
  const people = kept.filter((s) => s.kind === 'idol').length;
  const groups = kept.length - people;
  const allSlugs = subjects.map((s) => `'${s.slug}'`).join(', ');
  const leftEntities = left.map((l) => `'${subjects.find((s) => s.slug === l.slug)?.kind === 'group' ? 'group' : 'idol'}:${l.slug}'`).join(', ');

  // One object per line, only what the SQL reads; dollar-quoted, so an apostrophe in a name needs no escape.
  const literal = `[\n${kept
    .map((s) => {
      const halves = s.pair?.halves ?? [];
      return `  ${JSON.stringify({
        slug: s.slug, kind: s.kind, small_2x: s.small_2x,
        small_2x_h1: s.kind === 'group' ? (halves.find((h) => h.part === 1)?.small_2x ?? true) : null,
        small_2x_h2: s.kind === 'group' ? (halves.find((h) => h.part === 2)?.small_2x ?? true) : null,
        url: s.photo.url, bucket: s.photo.bucket, path: s.photo.path, width: s.photo.width, height: s.photo.height,
        commons_page: s.photo.commons_page, author: s.photo.author, licence: s.photo.licence, licence_url: s.photo.licence_url,
        share_alike: s.photo.share_alike,
      })}`;
    })
    .join(',\n')}\n]`;
  const leftLiteral = `[\n${left.map((l) => `  ${JSON.stringify(l)}`).join(',\n')}\n]`;

  const sql = `-- 102-catalog-rebuild.sql (Bunnyverse Cards lot 2, 2026-11-12; integrator brief points 2 to 4)
--
-- What:   rebuilds cards_entities, cards_photos and cards_catalog from the ${subjects.length} October photos, with two changes:
--         1. the age rule (priority): a subject is in only when every person in its photo is 18 or older today AND was on the photo date
--            (for a group, its lineup on that date), and every current member is an adult today. Checked on ${checkedOn} from Wikidata and
--            English Wikipedia (docs/design/cards/data/age-check.json, verdicts only): ${kept.length} subjects pass, ${left.length} do not and get no card here.
--            At apply time the rule of decision 17 runs again on public.idols (every ACTIVE member with a known birth date 18 years back).
--         2. a group photo gives a PAIR of cards per edition: part 1 the left half and part 2 the right half of its 11:8.5 window, with
--            consecutive numbers (C 1/2, C 2/2, U 1/2, U 2/2, R 1/2, R 2/2, UR 1/2, UR 2/2). A person keeps one card per edition (part 0).
--         Adds to cards_catalog: part (0, 1, 2) and small_2x (per card: each half of a pair is checked for 2x on its own), and replaces the
--         unique key (entity_id, rarity) with (entity_id, rarity, part).
-- How:    names, debut years, group lines and the adult check resolve AT APPLY TIME by slug from public.groups and public.idols, exactly as
--         101 did (decisions 2, 17, 18; review 1 finding 11). Numbers start again at BV1-0001: the subjects in, ordered by section name A to Z,
--         the people of a section before its group, 4 numbers a person (C, U, R, UR) and 8 a group (each edition 1/2 then 2/2).
--         The published files of a PERSON are kept (storage_path, file focal point, focal point): their card does not change. A group
--         keeps its focal point (the owner's choice now places the pair's window) and loses its files (they were whole cards): the site
--         shows the CSS crop of each half until the owner's script cuts the halves (publish-card-files.mjs --publish).
-- Why:    integrator brief 2026-11-12 (Cards, lot 2): no card of a person who is a minor today or was one on the photo date; the owner's idea
--         of the group photo in two cards.
-- Rows:   ${people} people x 4 + ${groups} groups x 8 = ${people * 4 + groups * 8} cards at most (fewer when the apply-time check leaves a subject out),
--         the same subjects in cards_entities plus the group lines of the people, one photo a subject. The real counts are the notices.
-- Needs:  001 to 003, 101 applied before (this file replaces its rows); 099-idols-members.sql applied just before (the members of the
--         subjects that had none in public.idols).
-- Verify: select count(*) from public.cards_owned;   expect 0
-- Verify: select part, count(*) from public.cards_catalog group by part order by part;   expect part 0: 4 x the people in, parts 1 and 2: 4 x the groups in each (the notice "102-catalog-rebuild: N people and M groups in")
-- Verify: select min(card_no), max(card_no), count(*) from public.cards_catalog;   expect 1, N, N (contiguous)
-- Verify: select count(*) from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2 where a.part = 1 and b.card_no <> a.card_no + 1;   expect 0 (every pair has consecutive numbers)
-- Verify: select count(*) from public.cards_entities where id = any (array[${leftEntities || "''"}]);   expect 0 (the subjects the age rule leaves out)
-- Verify: select s from unnest(array[${allSlugs}]) s where not exists (select 1 from public.cards_photos p where p.source_path = 'images/group-photos/' || s || '.jpg');   expect exactly the slugs of the "left out" notices
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs), or while a photo report is open (cards_reports):
--         the numbers change, so nothing is touched then. A photo the owner refused or removed stays out (reason photo_removed).
-- Undo:   102-catalog-rebuild.rollback.sql (empties the catalog and restores the columns and key of 001; refused while a player owns a card).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). A second run gives the same catalog.

do $c102$
declare
  v_subjects constant jsonb := $subjects$${literal}$subjects$::jsonb;
  v_left_by_age constant jsonb := $left$${leftLiteral}$left$::jsonb;
  v_cutoff constant date := (current_date - interval '18 years')::date;
  v_debut_col text;
  v_debut_expr text;
  v_keep jsonb;
  v_gone text[];
  sj record;
  g record;
  i record;
  lg record;
  r record;
  e jsonb;
  v_slug text;
  v_kind text;
  v_ent text;
  v_reason text;
  v_n integer;
  v_known integer;
  v_adult integer;
  v_year integer;
  v_name text;
  v_section text;
  v_group_ent text;
  v_qid text;
  v_in jsonb := '[]'::jsonb;
  v_out jsonb := '[]'::jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_no integer := 0;
  v_photo bigint;
  v_kept_files integer := 0;
  v_closed integer;
  v_people integer;
  v_groups integer;
  v_max integer;
  v_count integer;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.cards_catalog') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_packs') is null or to_regclass('public.cards_reports') is null then
    raise exception '102-catalog-rebuild: the cards tables are missing (run 001 to 003 first)';
  end if;
  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '102-catalog-rebuild: public.groups or public.idols is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'source_path') then
    raise exception '102-catalog-rebuild: cards_photos has no source_path (001 without the photo columns of amendment 1)';
  end if;

  -- The guard (integrator brief point 4): the numbers change, so only while no player holds anything.
  if exists (select 1 from public.cards_owned) then
    raise exception '102-catalog-rebuild: a player owns a card (cards_owned is not empty), nothing changed';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '102-catalog-rebuild: a pack was opened (cards_packs is not empty), nothing changed';
  end if;
  if exists (select 1 from public.cards_reports where status = 'open') then
    raise exception '102-catalog-rebuild: a photo report is open (cards_reports), close it in the admin first, nothing changed';
  end if;
  select count(*) into v_closed from public.cards_reports where photo_id is not null;

  -- 1. The columns of the pairs (idempotent).
  alter table public.cards_catalog add column if not exists part smallint not null default 0;
  alter table public.cards_catalog add column if not exists small_2x boolean not null default false;
  if not exists (select 1 from pg_constraint where conname = 'cards_catalog_part_check' and conrelid = 'public.cards_catalog'::regclass) then
    alter table public.cards_catalog add constraint cards_catalog_part_check check (part between 0 and 2);
  end if;
  alter table public.cards_catalog drop constraint if exists cards_catalog_entity_rarity_key;
  if not exists (select 1 from pg_constraint where conname = 'cards_catalog_entity_rarity_part_key' and conrelid = 'public.cards_catalog'::regclass) then
    alter table public.cards_catalog add constraint cards_catalog_entity_rarity_part_key unique (entity_id, rarity, part);
  end if;

  -- 2. What a person keeps (its card does not change) and every subject's focal point, by source photo.
  select coalesce(jsonb_object_agg(p.source_path, jsonb_build_object(
           'kind', en.kind, 'focal_x', p.focal_x, 'focal_y', p.focal_y,
           'storage_path', p.storage_path, 'file_focal_x', p.file_focal_x, 'file_focal_y', p.file_focal_y)), '{}'::jsonb)
    into v_keep
    from public.cards_photos p join public.cards_entities en on en.id = p.entity_id
   where p.status in ('auto', 'approved') and p.source_path like 'images/group-photos/%' and p.slot = 1;
  -- A photo the owner refused or removed (a report, the admin) stays out: the rebuild never brings it back.
  select coalesce(array_agg(distinct p.source_path), '{}') into v_gone
    from public.cards_photos p
   where p.status in ('rejected', 'removed') and p.source_path is not null
     and not exists (select 1 from public.cards_photos q where q.source_path = p.source_path and q.status in ('auto', 'approved'));

  -- 3. Empty the three tables (cards_owned and cards_packs are empty, checked above).
  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  -- The debut year of a group, from the database: a debut column when groups has one, else the year of inception_date (as 101).
  select column_name into v_debut_col from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name in ('debut_year', 'debut_date')
    order by (column_name = 'debut_year') desc limit 1;
  v_debut_expr := case v_debut_col
    when 'debut_year' then 'debut_year::integer'
    when 'debut_date' then 'extract(year from debut_date)::integer'
    else 'extract(year from inception_date)::integer' end;

  -- 4. Resolve every subject that passed the age rule, exactly as 101: in (with its fields) or out (with the reason).
  for sj in select x.value as v from jsonb_array_elements(v_subjects) x loop
    v_slug := sj.v ->> 'slug';
    v_kind := sj.v ->> 'kind';
    v_ent := case when v_kind = 'group' then 'group:' else 'idol:' end || v_slug;
    v_reason := null;
    v_qid := null;
    g := null; i := null; lg := null;
    select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i from public.idols x where false;

    select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = v_slug;
    if ((sj.v ->> 'bucket') || '/' || (sj.v ->> 'path')) = any (v_gone) then
      v_reason := 'photo_removed';
    elsif g.id is null then
      v_reason := 'no_groups_row';
    elsif v_kind = 'group' then
      select count(*), count(x.birth_date), count(*) filter (where x.birth_date <= v_cutoff)
        into v_n, v_known, v_adult from public.idols x where x.group_id = g.id and x.active;
      if v_n = 0 then v_reason := 'no_active_member';
      elsif v_known < v_n then v_reason := 'unknown_birth_date';
      elsif v_adult < v_n then v_reason := 'minor_member';
      end if;
    else
      select count(*) into v_n from public.idols x where x.group_id = g.id and x.active;
      if v_n = 0 then
        select count(*) into v_n from public.idols x where x.group_id <> g.id and x.active and lower(btrim(x.name)) = lower(btrim(g.name));
        if v_n = 1 then
          select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i
            from public.idols x where x.group_id <> g.id and x.active and lower(btrim(x.name)) = lower(btrim(g.name));
        end if;
      elsif v_n = 1 then
        select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i
          from public.idols x where x.group_id = g.id and x.active;
      end if;
      if v_n > 1 then v_reason := 'ambiguous';
      elsif i.id is null then v_reason := 'no_idol_row';
      elsif i.birth_date is null then v_reason := 'unknown_birth_date';
      elsif i.birth_date > v_cutoff then v_reason := 'minor';
      end if;
    end if;

    if v_reason is not null then
      v_out := v_out || jsonb_build_array(jsonb_build_object('slug', v_slug, 'reason', v_reason));
      continue;
    end if;

    v_group_ent := null;
    if v_kind = 'group' then
      v_name := g.name;
      v_section := g.name;
      execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using g.id;
    else
      v_name := coalesce(nullif(btrim(i.name), ''), g.name);
      v_qid := nullif(btrim(i.wikidata_qid), '');
      if i.group_id <> g.id then
        select gr.id, gr.name, gr.slug into lg from public.groups gr where gr.id = i.group_id;
        v_section := lg.name;
        v_group_ent := 'group:' || lg.slug;
        execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using lg.id;
        v_lines := v_lines || jsonb_build_array(jsonb_build_object('id', v_group_ent, 'name', lg.name, 'debut_year', v_year));
      else
        v_section := v_name;
        execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using g.id;
      end if;
    end if;

    v_in := v_in || jsonb_build_array(sj.v || jsonb_build_object(
      'entity', v_ent, 'name', v_name, 'section', v_section, 'group_entity', v_group_ent, 'debut_year', v_year, 'qid', v_qid,
      'idol_id', case when v_kind = 'group' then null else i.id end));
  end loop;

  -- 5. Order (decision 2): section A to Z, the people of a section before its group, then the name and the slug.
  select coalesce(jsonb_agg(x.y order by x.pos), '[]'::jsonb) into v_in
    from (select y, row_number() over (
            order by lower(y ->> 'section') collate "C", (y ->> 'kind' = 'group'), lower(y ->> 'name') collate "C", y ->> 'slug') as pos
          from jsonb_array_elements(v_in) y) x;

  -- 6. Entities: the group cards, the group lines of the people (no cards of their own), then the people.
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select x ->> 'entity', 'group', x ->> 'name', null, nullif(x ->> 'debut_year', '')::integer, null,
         lower(x ->> 'section') || '|1|' || lower(x ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) x where x ->> 'kind' = 'group';
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select distinct on (l ->> 'id') l ->> 'id', 'group', l ->> 'name', null, nullif(l ->> 'debut_year', '')::integer, null,
         lower(l ->> 'name') || '|1|' || lower(l ->> 'name'), '{}'::jsonb, true
    from jsonb_array_elements(v_lines) l
  on conflict (id) do nothing;
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select x ->> 'entity', 'idol', x ->> 'name', x ->> 'group_entity', nullif(x ->> 'debut_year', '')::integer, x ->> 'qid',
         lower(x ->> 'section') || '|0|' || lower(x ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) x where x ->> 'kind' = 'idol';

  -- 7. One approved photo a subject, then its cards, numbered in order.
  for e in select x.value from jsonb_array_elements(v_in) x loop
    insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at,
                                     focal_x, focal_y, source_path, source_width, source_height, small_2x, storage_path, file_focal_x,
                                     file_focal_y, status, review_note)
    values (e ->> 'entity', 1, 'commons', e ->> 'commons_page', e ->> 'url', e ->> 'author', e ->> 'licence', e ->> 'licence_url',
            (e ->> 'share_alike')::boolean, date '2026-10-06',
            coalesce((v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'focal_x')::integer, 50),
            coalesce((v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'focal_y')::integer, case when e ->> 'kind' = 'group' then 50 else 30 end),
            (e ->> 'bucket') || '/' || (e ->> 'path'), (e ->> 'width')::integer, (e ->> 'height')::integer,
            case when e ->> 'kind' = 'group' then (e ->> 'small_2x_h1')::boolean or (e ->> 'small_2x_h2')::boolean else (e ->> 'small_2x')::boolean end,
            -- a person keeps its published files (same card); a group's files were whole cards, so it has none until the halves are cut
            case when e ->> 'kind' = 'idol' then v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'storage_path' end,
            case when e ->> 'kind' = 'idol' then (v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'file_focal_x')::integer end,
            case when e ->> 'kind' = 'idol' then (v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'file_focal_y')::integer end,
            'approved', 'Commons photo of the October 2026 run, checked by eye (amendment 1); age rule of lot 2 passed.')
    returning id into v_photo;
    if e ->> 'kind' = 'idol' and (v_keep -> ((e ->> 'bucket') || '/' || (e ->> 'path')) ->> 'storage_path') is not null then
      v_kept_files := v_kept_files + 1;
    end if;

    if e ->> 'kind' = 'group' then
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
      select v_no + k.n, 'BV1-' || lpad((v_no + k.n)::text, 4, '0'), e ->> 'entity', k.rarity, k.edition, v_photo, true, k.part,
             case when k.part = 1 then (e ->> 'small_2x_h1')::boolean else (e ->> 'small_2x_h2')::boolean end
        from (values (1, 'C', 'std', 1), (2, 'C', 'std', 2), (3, 'U', 'stage', 1), (4, 'U', 'stage', 2),
                     (5, 'R', 'holo', 1), (6, 'R', 'holo', 2), (7, 'UR', 'gold', 1), (8, 'UR', 'gold', 2)) as k(n, rarity, edition, part);
      v_no := v_no + 8;
    else
      insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
      select v_no + k.n, 'BV1-' || lpad((v_no + k.n)::text, 4, '0'), e ->> 'entity', k.rarity, k.edition, v_photo, true, 0,
             (e ->> 'small_2x')::boolean
        from (values (1, 'C', 'std'), (2, 'U', 'stage'), (3, 'R', 'holo'), (4, 'UR', 'gold')) as k(n, rarity, edition);
      v_no := v_no + 4;
    end if;
  end loop;

  -- 8. Checks, then the Verify output.
  select count(*) filter (where x.value ->> 'kind' = 'idol'), count(*) filter (where x.value ->> 'kind' = 'group')
    into v_people, v_groups from jsonb_array_elements(v_in) x;
  select coalesce(max(card_no), 0), count(*) into v_max, v_count from public.cards_catalog;
  if v_max <> v_count or v_count <> 4 * v_people + 8 * v_groups then
    raise exception '102-catalog-rebuild: the numbers are not contiguous (highest %, % cards, expected %)', v_max, v_count, 4 * v_people + 8 * v_groups;
  end if;
  if exists (select 1 from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2
             where a.part = 1 and b.card_no <> a.card_no + 1) then
    raise exception '102-catalog-rebuild: a pair does not have consecutive numbers';
  end if;
  raise notice '102-catalog-rebuild: % people and % groups in, % cards, highest number BV1-%', v_people, v_groups, v_count, lpad(v_max::text, 4, '0');
  for r in select c.part, count(*) as n from public.cards_catalog c group by c.part order by c.part loop
    raise notice '102-catalog-rebuild: % cards of part % (0 a whole card, 1 a left half, 2 a right half)', r.n, r.part;
  end loop;
  raise notice '102-catalog-rebuild: % people kept their published files; the groups need their halves cut (publish-card-files.mjs)', v_kept_files;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'reason' as reason from jsonb_array_elements(v_left_by_age) x loop
    raise notice '102-catalog-rebuild: left out % (age rule: %)', r.slug, r.reason;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'reason' as reason from jsonb_array_elements(v_out) x loop
    raise notice '102-catalog-rebuild: left out % (%)', r.slug, r.reason;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'idol_id' as idol from jsonb_array_elements(v_in) x where x.value ->> 'kind' = 'idol' order by x.value ->> 'slug' loop
    raise notice '102-catalog-rebuild: person % is idols.id %', r.slug, r.idol;
  end loop;
  if v_closed > 0 then
    raise notice '102-catalog-rebuild: % closed photo reports lost their photo link (the photo rows were rebuilt)', v_closed;
  end if;
end $c102$;
`;

  const rollback = `-- 102-catalog-rebuild.rollback.sql (undo of 102-catalog-rebuild.sql)
--
-- What:   empties cards_catalog, cards_photos and cards_entities, then gives cards_catalog back the shape of 001: drops part and small_2x,
--         and the unique key (entity_id, rarity, part) returns to (entity_id, rarity). The catalog stays EMPTY: 101 is not re-run here,
--         because 101 predates the age rule of lot 2 (it would bring back the subjects that rule leaves out). Apply 102 again to refill it.
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs).
-- Verify: select count(*) from public.cards_catalog;   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_catalog' and column_name in ('part', 'small_2x');   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $c102r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null then
    return;
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '102-catalog-rebuild rollback: a player owns a card';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '102-catalog-rebuild rollback: a pack was opened';
  end if;

  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  alter table public.cards_catalog drop constraint if exists cards_catalog_entity_rarity_part_key;
  alter table public.cards_catalog drop constraint if exists cards_catalog_part_check;
  alter table public.cards_catalog drop column if exists part;
  alter table public.cards_catalog drop column if exists small_2x;
  if not exists (select 1 from pg_constraint where conname = 'cards_catalog_entity_rarity_key' and conrelid = 'public.cards_catalog'::regclass) then
    alter table public.cards_catalog add constraint cards_catalog_entity_rarity_key unique (entity_id, rarity);
  end if;
end $c102r$;
`;
  return { sql, rollback, kept, left };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const subjects = JSON.parse(readFileSync(SUBJECTS_JSON, 'utf8')) as Subject[];
  const out = build(subjects);
  writeFileSync(path.join(OUT, '102-catalog-rebuild.sql'), out.sql);
  writeFileSync(path.join(OUT, '102-catalog-rebuild.rollback.sql'), out.rollback);
  console.log(`wrote 102 (${out.kept.length} subjects pass the age rule, ${out.left.length} left out: ${out.left.map((l) => `${l.slug} (${l.reason})`).join(', ') || 'none'})`);
}
