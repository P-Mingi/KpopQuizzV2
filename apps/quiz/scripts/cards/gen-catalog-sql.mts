// Bunnyverse Cards, lane D (second brief): writes docs/pending-migrations/cards/101-catalog.sql and its rollback from
// docs/design/cards/data/subjects.json (review 1 finding 15: the bucket file 100 is gone, 003-rls.sql creates the bucket at 2 MB).
// No network, no database. Run gen-subjects.mts first.
//   tsx scripts/cards/gen-catalog-sql.mts
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUBJECTS_JSON, type Subject } from './gen-subjects.mts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');

const subjects = JSON.parse(readFileSync(SUBJECTS_JSON, 'utf8')) as Subject[];
const slugList = subjects.map((s) => `'${s.slug}'`).join(', ');
const people = subjects.filter((s) => s.kind === 'idol').length;
const groups = subjects.length - people;
const small = subjects.filter((s) => s.small_2x).length;

// One object per line, only what the SQL reads. dollar-quoted below, so an apostrophe in a file name needs no escape.
const literal = `[\n${subjects
  .map((s) => `  ${JSON.stringify({
    slug: s.slug, kind: s.kind, focal_x: s.focal.x, focal_y: s.focal.y, small_2x: s.small_2x,
    url: s.photo.url, bucket: s.photo.bucket, path: s.photo.path, width: s.photo.width, height: s.photo.height,
    commons_page: s.photo.commons_page, author: s.photo.author, licence: s.photo.licence, licence_url: s.photo.licence_url,
    share_alike: s.photo.share_alike,
  })}`)
  .join(',\n')}\n]`;

const catalog = `-- 101-catalog.sql (Bunnyverse Cards, lane DATA, 2026-11-12; the catalog of the ${subjects.length} October photos)
--
-- What:   fills the card catalog from the ${subjects.length} free Wikimedia Commons photos of docs/design/growth-v12/run/group-photos.json (${groups} groups,
--         ${people} soloists or members; owner decision CARDS-AMEND-1, 2026-11-12). One photo per subject, so 4 cards per subject: Standard (C),
--         Stage (U), Holo (R), Gold (UR). Era (SR) and Full Art (L) are locked pockets, lock reason "one" ("Only one free photo of this idol
--         exists so far."). Writes cards_entities, cards_photos (status approved: checked by eye in October), cards_catalog (in_packs true).
-- How:    names, debut years and ages are resolved AT APPLY TIME, by slug, from public.groups and public.idols:
--         - a group: its groups row (official name); the debut year from the database (a debut_year or debut_date column of groups if
--           it has one, else the year of inception_date). IN only when ALL its active idols rows have a known birth date at least 18 years
--           before today (current_date - interval '18 years'); no active member, an unknown date or a minor means OUT (decision 17).
--         - a soloist or member: the idols row = the one active row of the person's own group, else the one active idol of another group
--           whose name equals the group's name; two or more candidates on that path leave it OUT as ambiguous (review 1 finding 11). IN
--           only when its birth_date is known and at least 18 years back.
--           Its group line is that other group when it is one (its entity is created without cards when it is not a subject), else none
--           ("Soloist", decision 18); the debut year is the group line's.
--         - numbering (decision 2): the included subjects are ordered by section name A to Z (a person's section is its group line, a
--           soloist's its own name); inside a section the people, then the group card; each subject takes 4 consecutive numbers in the
--           order C, U, R, UR, BV1-0001 onward (after the highest number already there, so a second run adds nothing).
--         - focal point: 50/30 for a person, 50/50 for a group; small_2x true when the widest 5.5:8.5 crop of the 1,200 px file is under
--           640 px (${small} of ${subjects.length}).
--         Entity ids are 'idol:<slug>' and 'group:<slug>' (the Wikidata id, when the idols row has one, goes to qid).
-- Why:    amendment 1: the photos of the October run are the only photos of the game. docs/design/cards/CARDS-PLAN-v3.md for the rest.
-- Rows:   at most ${subjects.length * 4} cards (${subjects.length} subjects x 4), the same number of entities and ${subjects.length} photos at most, plus the group-line entities of
--         the soloists. The real counts are the Verify output below (Messages tab): subjects in, cards per edition, the highest number, and
--         every left-out slug with its reason (no_groups_row, no_active_member, no_idol_row, ambiguous, unknown_birth_date, minor_member,
--         minor), and for every person of the run the idols row it is bound to ("person <slug> is idols.id <id>").
-- Needs:  001 to 003 (with the photo columns of amendment 1) and the tables public.groups and public.idols.
-- Verify: select count(*) from public.cards_catalog;   expect 4 x the subjects in (the notice "101-catalog: N subjects in")
-- Verify: select rarity, count(*) from public.cards_catalog group by rarity order by rarity;   expect C, R, U, UR with the same count each
-- Verify: select min(card_no), max(card_no), count(*) from public.cards_catalog;   expect 1, 4N, 4N (contiguous)
-- Verify: select s from unnest(array[${slugList}]) s where not exists (select 1 from public.cards_photos p where p.source_path = 'images/group-photos/' || s || '.jpg');   expect exactly the slugs of the "left out" notices
-- Refuses: while cards_entities, cards_catalog or cards_photos holds a row that is not one of these subjects (review 1 finding 2).
-- Undo:   101-catalog.rollback.sql (refused while a player owns a card or opened a pack).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $c101$
declare
  v_subjects constant jsonb := $subjects$${literal}$subjects$::jsonb;
  v_cutoff constant date := (current_date - interval '18 years')::date;
  v_debut_col text;
  v_debut_expr text;
  sj record;
  g record;
  i record;
  lg record;
  r record;
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
  v_already integer := 0;
  v_base integer;
  v_total integer;
  v_max integer;
  v_ids text[];
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.cards_catalog') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_entities') is null then
    raise exception '101-catalog: the cards tables are missing (run 001 to 003 first)';
  end if;
  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '101-catalog: public.groups or public.idols is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name = 'source_path') then
    raise exception '101-catalog: cards_photos has no source_path (001 without the photo columns of amendment 1)';
  end if;

  -- Review 1 finding 2: this file fills a catalog that holds its own subjects only. Refused, with nothing changed, while cards_entities,
  -- cards_catalog or cards_photos holds a row of anything else: an id outside its slug list (a group line it made for one of its people
  -- excepted) or a photo outside images/group-photos/.
  select array_agg(case when e.value ->> 'kind' = 'group' then 'group:' else 'idol:' end || (e.value ->> 'slug')) into v_ids
    from jsonb_array_elements(v_subjects) e;
  select count(*) into v_n from public.cards_entities e
   where e.id <> all (v_ids)
     and not (e.kind = 'group' and not exists (select 1 from public.cards_catalog c where c.entity_id = e.id)
              and exists (select 1 from public.cards_entities x where x.group_id = e.id and x.id = any (v_ids)));
  if v_n > 0 then
    raise exception '101-catalog: cards_entities holds % rows that are not subjects of this file, refusing', v_n;
  end if;
  select count(*) into v_n from public.cards_catalog c
   where c.entity_id <> all (v_ids)
      or (c.photo_id is not null and not exists (
            select 1 from public.cards_photos p where p.id = c.photo_id and p.source_path like 'images/group-photos/%'));
  if v_n > 0 then
    raise exception '101-catalog: cards_catalog holds % cards that are not subjects of this file, refusing', v_n;
  end if;
  select count(*) into v_n from public.cards_photos p
   where p.entity_id <> all (v_ids) or p.source_path is null or p.source_path not like 'images/group-photos/%';
  if v_n > 0 then
    raise exception '101-catalog: cards_photos holds % photos of another subject or outside images/group-photos/, refusing', v_n;
  end if;

  -- The debut year of a group, from the database: a debut column when groups has one, else the year of inception_date.
  select column_name into v_debut_col from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name in ('debut_year', 'debut_date')
    order by (column_name = 'debut_year') desc limit 1;
  v_debut_expr := case v_debut_col
    when 'debut_year' then 'debut_year::integer'
    when 'debut_date' then 'extract(year from debut_date)::integer'
    else 'extract(year from inception_date)::integer' end;

  -- 1. Resolve every subject: in (with its resolved fields) or out (with the reason).
  for sj in select e.value as v from jsonb_array_elements(v_subjects) e loop
    v_slug := sj.v ->> 'slug';
    v_kind := sj.v ->> 'kind';
    v_ent := case when v_kind = 'group' then 'group:' else 'idol:' end || v_slug;
    v_reason := null;
    v_qid := null;
    g := null; i := null; lg := null;
    -- i starts as an all-null row of the idols columns (a record a select has not filled cannot be read)
    select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i from public.idols x where false;

    select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      v_reason := 'no_groups_row';
    elsif v_kind = 'group' then
      select count(*), count(x.birth_date), count(*) filter (where x.birth_date <= v_cutoff)
        into v_n, v_known, v_adult from public.idols x where x.group_id = g.id and x.active;
      if v_n = 0 then v_reason := 'no_active_member';
      elsif v_known < v_n then v_reason := 'unknown_birth_date';
      elsif v_adult < v_n then v_reason := 'minor_member';
      end if;
    else
      -- Review 1 finding 11: the person must be ONE active idols row: of the person's own group, else of another group under the same
      -- name. Two or more candidates on the path taken leave the subject out as ambiguous (never a guess between two people).
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

    if v_reason is null and exists (select 1 from public.cards_catalog c where c.entity_id = v_ent) then
      v_already := v_already + 1;
      continue;
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

  -- 2. Order and number (decision 2): section A to Z, the people of a section before its group card, then the slug.
  select coalesce(jsonb_agg(x.e || jsonb_build_object('pos', x.pos) order by x.pos), '[]'::jsonb) into v_in
    from (select e, row_number() over (
            order by lower(e ->> 'section') collate "C", (e ->> 'kind' = 'group'), lower(e ->> 'name') collate "C", e ->> 'slug') as pos
          from jsonb_array_elements(v_in) e) x;
  v_total := jsonb_array_length(v_in);
  select coalesce(max(card_no), 0) into v_base from public.cards_catalog;

  -- 3. Entities: the group cards, the group lines of the people (no cards of their own), then the people.
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select e ->> 'entity', 'group', e ->> 'name', null, nullif(e ->> 'debut_year', '')::integer, null,
         lower(e ->> 'section') || '|1|' || lower(e ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) e where e ->> 'kind' = 'group'
  on conflict (id) do update set name = excluded.name, debut_year = excluded.debut_year, sort_key = excluded.sort_key,
    lock_reasons = excluded.lock_reasons, active = true;

  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select distinct on (l ->> 'id') l ->> 'id', 'group', l ->> 'name', null, nullif(l ->> 'debut_year', '')::integer, null,
         lower(l ->> 'name') || '|1|' || lower(l ->> 'name'), '{}'::jsonb, true
    from jsonb_array_elements(v_lines) l
  on conflict (id) do nothing;

  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select e ->> 'entity', 'idol', e ->> 'name', e ->> 'group_entity', nullif(e ->> 'debut_year', '')::integer, e ->> 'qid',
         lower(e ->> 'section') || '|0|' || lower(e ->> 'name'), '{"SR":"one","L":"one"}'::jsonb, true
    from jsonb_array_elements(v_in) e where e ->> 'kind' = 'idol'
  on conflict (id) do update set name = excluded.name, group_id = excluded.group_id, debut_year = excluded.debut_year, qid = excluded.qid,
    sort_key = excluded.sort_key, lock_reasons = excluded.lock_reasons, active = true;

  -- 4. One approved photo per subject (slot 1).
  insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, licence, licence_url, share_alike, checked_at,
                                   focal_x, focal_y, source_path, source_width, source_height, small_2x, status, review_note)
  select e ->> 'entity', 1, 'commons', e ->> 'commons_page', e ->> 'url', e ->> 'author', e ->> 'licence', e ->> 'licence_url',
         (e ->> 'share_alike')::boolean, date '2026-10-06', (e ->> 'focal_x')::integer, (e ->> 'focal_y')::integer,
         (e ->> 'bucket') || '/' || (e ->> 'path'), (e ->> 'width')::integer, (e ->> 'height')::integer, (e ->> 'small_2x')::boolean,
         'approved', 'Commons photo of the October 2026 run, checked by eye (amendment 1).'
    from jsonb_array_elements(v_in) e
   where not exists (select 1 from public.cards_photos p where p.entity_id = e ->> 'entity' and p.slot = 1 and p.status in ('auto', 'approved'));

  -- 5. Four cards per subject, four consecutive numbers, in the order C, U, R, UR.
  insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs)
  select v_base + ((e ->> 'pos')::integer - 1) * 4 + k.n, 'BV1-' || lpad((v_base + ((e ->> 'pos')::integer - 1) * 4 + k.n)::text, 4, '0'),
         e ->> 'entity', k.rarity, k.edition,
         (select p.id from public.cards_photos p where p.entity_id = e ->> 'entity' and p.slot = 1 and p.status in ('auto', 'approved') limit 1),
         true
    from jsonb_array_elements(v_in) e
   cross join (values (1, 'C', 'std'), (2, 'U', 'stage'), (3, 'R', 'holo'), (4, 'UR', 'gold')) as k(n, rarity, edition)
  on conflict do nothing;

  -- 6. Checks and the Verify output.
  select coalesce(max(card_no), 0) into v_max from public.cards_catalog;
  if v_max <> v_base + 4 * v_total then
    raise exception '101-catalog: the numbers are not contiguous (highest %, expected %)', v_max, v_base + 4 * v_total;
  end if;
  raise notice '101-catalog: % subjects in, % left out, % already there', v_total, jsonb_array_length(v_out), v_already;
  for r in select c.rarity, count(*) as n from public.cards_catalog c group by c.rarity order by array_position(array['C','U','R','SR','UR','L'], c.rarity) loop
    raise notice '101-catalog: % cards % in the catalog', r.n, r.rarity;
  end loop;
  raise notice '101-catalog: highest number BV1-%', lpad(v_max::text, 4, '0');
  for r in select o.value ->> 'slug' as slug, o.value ->> 'reason' as reason from jsonb_array_elements(v_out) o loop
    raise notice '101-catalog: left out % (%)', r.slug, r.reason;
  end loop;
  -- Review 1 finding 11: which idols row each person of this run is (for the owner to check against the subject).
  for r in select e.value ->> 'slug' as slug, e.value ->> 'idol_id' as idol from jsonb_array_elements(v_in) e where e.value ->> 'kind' = 'idol' order by e.value ->> 'slug' loop
    raise notice '101-catalog: person % is idols.id %', r.slug, r.idol;
  end loop;
end $c101$;
`;

const catalogRb = `-- 101-catalog.rollback.sql (undo of 101-catalog.sql)
--
-- What:   removes what 101 wrote for the ${subjects.length} subjects: their catalog rows, their photos (by source_path) and their entities, then the
--         group-line entities that are left without any card or any person pointing at them.
-- Refuses: while a player owns one of these cards (cards_owned) or has opened a pack (cards_packs): that would destroy a collection.
-- Verify: select count(*) from public.cards_catalog;   expect 0 (when only 101 filled it)
-- o1-transaction: single, ONE DO block. Idempotent.

do $c101r$
declare
  v_slugs constant text[] := array[${slugList}];
  v_ents text[];
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null then
    return;
  end if;
  select coalesce(array_agg(x), '{}') into v_ents from (
    select 'idol:' || s as x from unnest(v_slugs) s union all select 'group:' || s from unnest(v_slugs) s) u;

  if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where c.entity_id = any (v_ents)) then
    raise exception '101-catalog rollback: a player owns one of these cards';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '101-catalog rollback: a pack was opened';
  end if;

  delete from public.cards_catalog where entity_id = any (v_ents);
  delete from public.cards_photos where entity_id = any (v_ents) and source_path = any (select 'images/group-photos/' || s || '.jpg' from unnest(v_slugs) s);
  delete from public.cards_entities where id = any (v_ents) and kind = 'idol';
  delete from public.cards_entities e where e.id = any (v_ents) and e.kind = 'group';
  -- The group lines made for the people: group entities without any card, photo or person left.
  delete from public.cards_entities e
   where e.kind = 'group' and e.lock_reasons = '{}'::jsonb
     and not exists (select 1 from public.cards_catalog c where c.entity_id = e.id)
     and not exists (select 1 from public.cards_photos p where p.entity_id = e.id)
     and not exists (select 1 from public.cards_entities x where x.group_id = e.id);
end $c101r$;
`;

writeFileSync(path.join(OUT, '101-catalog.sql'), catalog);
writeFileSync(path.join(OUT, '101-catalog.rollback.sql'), catalogRb);
console.log(`wrote 101 (${subjects.length} subjects, ${small} small_2x)`);
