// Bunnyverse Cards lot 3: the text of docs/pending-migrations/cards/103-catalog-photos.sql and its rollback, built from the photos of
// docs/design/cards/data/photos.json (scripts/cards/verify-photos.mts writes it: every photo checked on Commons, its age verdict, its
// review reasons). Pure: no file, no network, no database. scripts/cards/gen-catalog3-sql.mts writes the two files;
// catalog3-sql.test.ts runs them in pglite.
//
// Owner decision 2026-11-13, "one edition, one photo": two editions of a subject never share a photo (another file AND another event or
// date, checked by verify-photos.mts); editions open from the bottom (C, U, R, SR, UR, L): a subject with n approved photos has its n
// lowest editions, and enters the packs from 2 photos; the best photo goes on the highest edition, Stage takes a stage photo when there is
// one, Full Art needs an honest 2x of the whole card. A group follows the same rule, each edition with its own group photo cut into a
// pair. The assignment lives in ONE place, the SQL function cards_build_catalog() that 103 creates and runs, so the admin can run it again
// after the owner's review (photos waiting in the "To review" tab), while no player holds a card.

export type PhotoStatus = 'approved' | 'auto' | 'pending';

/** One photo of a subject as the SQL reads it (photos.json, without the photos left out). */
export interface Photo3 {
  /** 1 to 6, stable for the subject: 1 is the photo of lots 1 and 2. */
  slot: number;
  status: PhotoStatus;
  source: 'commons' | 'koreanet' | 'flickr' | 'dvids';
  /** The source page (a Commons file page): the key that keeps the owner's focal point, files and approval across rebuilds. */
  page: string;
  /** The original file the owner's script cuts the cards from. */
  url: string;
  width: number;
  height: number;
  sha1: string | null;
  author: string;
  author_url: string | null;
  licence: string;
  licence_url: string;
  share_alike: boolean;
  date: string;
  date_precision: 'day' | 'month';
  event: string | null;
  stage: boolean;
  /** 1 to 5, the researcher's rating; the best photo goes to the highest edition. */
  quality: number;
  focal: { x: number; y: number };
  /** The 1,200 px copy in the bucket 'images' (lot 1 photos only): the site's CSS crop until the owner's script cuts the card files. */
  source_path: string | null;
  news_only: boolean;
  /** Why the photo waits for the owner (status pending); empty otherwise. */
  review: string[];
}

export interface Subject3 {
  slug: string;
  kind: 'idol' | 'group';
  /** A disbanded group kept in the game (owner decision 2026-11-12): the year it disbanded. */
  end_year: number | null;
  photos: Photo3[];
}

export interface Catalog3Input {
  checked_on: string;
  subjects: Subject3[];
  /** Subjects with no photo the rule lets in (all their photos left out), for the header only. */
  left_out: Array<{ slug: string; reason: string }>;
}

export interface Catalog3Sql { sql: string; rollback: string }

const LADDER = ['C', 'U', 'R', 'SR', 'UR', 'L'] as const;

/** docs/design/cards/data/photos.json as verify-photos.mts writes it (the fields the SQL needs). */
export interface PhotosFile {
  checked_on: string;
  subjects: Array<{ slug: string; kind: 'idol' | 'group'; end_year: number | null; photos: Array<Omit<Photo3, 'status'> & { status: PhotoStatus | 'out' }> }>;
  left_out: Array<{ slug: string; reason: string }>;
}

/** photos.json to the builder's input: the photos that are not out, with their review reasons; a subject with none is not passed. */
export function inputOf(file: PhotosFile): Catalog3Input {
  return {
    checked_on: file.checked_on,
    left_out: file.left_out,
    subjects: file.subjects
      .map((s) => ({
        slug: s.slug, kind: s.kind, end_year: s.end_year,
        photos: s.photos.filter((p): p is Photo3 => p.status !== 'out').map((p) => ({
          slot: p.slot, status: p.status, source: p.source, page: p.page, url: p.url, width: p.width, height: p.height, sha1: p.sha1,
          author: p.author, author_url: p.author_url, licence: p.licence, licence_url: p.licence_url, share_alike: p.share_alike,
          date: p.date, date_precision: p.date_precision, event: p.event, stage: p.stage, quality: p.quality, focal: p.focal,
          source_path: p.source_path, news_only: p.news_only, review: p.review,
        })),
      }))
      .filter((s) => s.photos.length > 0),
  };
}

/** The editions a subject would open with these photos, the same rule as cards_build_catalog (for the header and the tests). */
export function plannedEditions(kind: 'idol' | 'group', photos: Photo3[]): string[] {
  const live = photos.filter((p) => p.status !== 'pending');
  const n = Math.min(live.length, 6);
  if (n < 2) return [];
  const open: string[] = LADDER.slice(0, n);
  if (open.includes('L') && !live.some((p) => fullOk(kind, p.width, p.height))) open.pop();
  return open;
}

/** The width of the widest window (5.5:8.5 for a person, 11:8.5 for a group pair), as card-geometry.mjs windowBox. */
export function windowWidth(kind: 'idol' | 'group', w: number, h: number): number {
  return Math.floor(Math.min(w, (h * (kind === 'group' ? 11 : 5.5)) / 8.5));
}

/** Full Art needs an honest 2x: the window 640 px wide for a person, each half of the pair 640 px for a group. */
export function fullOk(kind: 'idol' | 'group', w: number, h: number): boolean {
  const cw = windowWidth(kind, w, h);
  return kind === 'group' ? Math.floor(cw / 2) >= 640 : cw >= 640;
}

export function build3(input: Catalog3Input): Catalog3Sql {
  const { subjects, checked_on: checkedOn } = input;
  for (const s of subjects) {
    const slots = new Set<number>();
    for (const p of s.photos) {
      if (!Number.isInteger(p.slot) || p.slot < 1 || p.slot > 6 || slots.has(p.slot)) throw new Error(`${s.slug}: bad or repeated photo slot ${p.slot}`);
      slots.add(p.slot);
      if (!(p.quality >= 1 && p.quality <= 5)) throw new Error(`${s.slug} photo ${p.slot}: quality ${p.quality}`);
      if (p.status === 'pending' && p.review.length === 0) throw new Error(`${s.slug} photo ${p.slot}: pending without a reason`);
    }
  }
  const all = subjects.flatMap((s) => s.photos);
  const live = all.filter((p) => p.status !== 'pending').length;
  const pending = all.length - live;
  const planned = subjects.map((s) => ({ s, ed: plannedEditions(s.kind, s.photos) }));
  const inPacks = planned.filter((x) => x.ed.length > 0);
  const cardsPlanned = inPacks.reduce((n, x) => n + x.ed.length * (x.s.kind === 'group' ? 2 : 1), 0);
  const byEdition = LADDER.map((r) => `${r} ${inPacks.filter((x) => x.ed.includes(r)).length}`).join(', ');
  const people = inPacks.filter((x) => x.s.kind === 'idol').length;
  const groups = inPacks.length - people;
  const waiting = planned.filter((x) => x.ed.length === 0).map((x) => x.s.slug);
  const allSlugs = subjects.map((s) => `'${s.slug}'`).join(', ') || "''";

  const literal = `[\n${subjects
    .map((s) => `  ${JSON.stringify({
      slug: s.slug, kind: s.kind, end_year: s.end_year,
      photos: s.photos.map((p) => ({
        slot: p.slot, status: p.status, source: p.source, page: p.page, url: p.url, width: p.width, height: p.height, sha1: p.sha1,
        author: p.author, author_url: p.author_url, licence: p.licence, licence_url: p.licence_url, share_alike: p.share_alike,
        date: p.date, date_precision: p.date_precision, event: p.event, stage: p.stage, quality: p.quality, fx: p.focal.x, fy: p.focal.y,
        source_path: p.source_path, news_only: p.news_only, review: p.review.join('; '),
      })),
    })}`)
    .join(',\n')}\n]`;
  const leftLiteral = `[\n${input.left_out.map((l) => `  ${JSON.stringify(l)}`).join(',\n')}\n]`;

  const sql = `-- 103-catalog-photos.sql (Bunnyverse Cards lot 3, 2026-11-13; owner decision "one edition, one photo", integrator brief part A)
--
-- What:   rebuilds cards_entities, cards_photos and cards_catalog with SEVERAL photos a subject, one photo per edition:
--         1. two editions of a subject never share a photo: another file AND another event or date (checked by verify-photos.mts on ${checkedOn});
--         2. editions open from the bottom (C, U, R, SR, UR, L): a subject with n approved photos has its n lowest editions, and enters the
--            packs from 2 photos; the best photo (the researcher's quality, then the pixels of the crop) goes on the highest edition, Stage
--            takes a stage photo when the subject has one (the lowest rated, so the best stay on top), Full Art needs an honest 2x of the
--            whole card (the 5.5:8.5 window 640 px wide; for a group each half of the 11:8.5 pair 640 px wide), else it stays locked;
--         3. a group follows the same ladder, each edition with its own group photo cut into a pair (part 1 the left half, part 2 the right
--            half, consecutive numbers); the six editions are open to groups too (amendment 1 limited them to C, U, R, UR);
--         4. every photo passed the age rule of lot 2 on its own date (everyone in it 18 or older on that date and today) and comes from an
--            allowed source with an allowed licence and a named author, with no deletion request. A photo the script approved is 'auto';
--            one that needs the owner's eye (Flickr or Korea.net, a licence review still open on Commons, a group photo without the whole
--            lineup, a month-only date, a date the sources disagree on) is 'pending': it waits in the admin "To review" tab and opens no
--            edition until the owner approves it and runs cards_build_catalog() again (the admin's "Rebuild the catalog").
--         Adds to cards_photos: sha1, quality, stage, event_date_precision, news_only; widens slot to 1..6. Creates cards_build_catalog()
--         (the edition rule, guarded: refused once a player owns a card or opened a pack) and the trigger cards_photos_ready (a card is in
--         the packs only while its photo is live and has something to show: the owner's cut files or the lot 1 bucket copy).
-- How:    names, debut years, group lines and the apply-time adult check resolve AT APPLY TIME by slug from public.groups and public.idols,
--         exactly as 102. The owner's focal point, published files and approvals are kept by source page; a photo the owner refused or
--         removed stays out. Numbers start again at BV1-0001 (section A to Z, the people of a section before its group, each subject's
--         editions in ladder order, a group's 1/2 then 2/2).
-- Why:    owner decision 2026-11-13 (WAX audit, 13 November 2026): one photo per edition instead of four finishes of the same photo.
-- Rows:   ${subjects.length} subjects with photos, ${all.length} photos (${live} approved or auto, ${pending} to review). With the approved ones:
--         ${inPacks.length} subjects in the packs (${people} people, ${groups} groups), ${cardsPlanned} cards; subjects per edition: ${byEdition}.
--         Waiting for a second approved photo: ${waiting.length ? waiting.join(', ') : 'none'}. The real counts are the notices (the apply-time check can leave a subject out).
-- Needs:  001 to 003, 099 and 102 applied before (this file replaces 102's rows).
-- Verify: select count(*) from public.cards_owned;   expect 0
-- Verify: select min(card_no), max(card_no), count(*) from public.cards_catalog;   expect 1, N, N (contiguous; N in the notice "103-catalog-photos: ... cards")
-- Verify: select count(*) from (select entity_id, photo_id from public.cards_catalog group by entity_id, photo_id having count(distinct rarity) > 1) x;   expect 0 (no photo on two editions)
-- Verify: select count(*) from public.cards_catalog c join public.cards_photos p on p.id = c.photo_id where p.status not in ('auto', 'approved');   expect 0
-- Verify: select count(*) from (select entity_id from public.cards_catalog group by entity_id having count(distinct rarity) < 2) x;   expect 0 (2 editions at least)
-- Verify: select count(*) from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2 where a.part = 1 and b.card_no <> a.card_no + 1;   expect 0
-- Verify: select status, count(*) from public.cards_photos group by status order by status;   expect the notice "103-catalog-photos: photos ..."
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs), or while a photo report is open (cards_reports).
-- Undo:   103-catalog-photos.rollback.sql (empties the catalog and gives cards_photos back the shape of 102; apply 102 again to refill it).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). A second run gives the same catalog.

do $c103$
declare
  v_subjects constant jsonb := $subjects$${literal}$subjects$::jsonb;
  v_left_out constant jsonb := $left$${leftLiteral}$left$::jsonb;
  v_checked constant date := date '${checkedOn}';
  v_cutoff constant date := (current_date - interval '18 years')::date;
  v_debut_col text;
  v_debut_expr text;
  v_keep jsonb;
  v_gone text[];
  v_summary jsonb;
  sj record;
  g record;
  i record;
  lg record;
  r record;
  e jsonb;
  ph jsonb;
  k jsonb;
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
  v_status text;
  v_kept_files integer := 0;
  v_kept_approved integer := 0;
  v_dropped integer := 0;
  v_closed integer;
  v_max integer;
  v_count integer;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.cards_catalog') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_entities') is null
     or to_regclass('public.cards_owned') is null or to_regclass('public.cards_packs') is null or to_regclass('public.cards_reports') is null then
    raise exception '103-catalog-photos: the cards tables are missing (run 001 to 003 first)';
  end if;
  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '103-catalog-photos: public.groups or public.idols is missing';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'cards_catalog' and column_name = 'part') then
    raise exception '103-catalog-photos: cards_catalog has no part column (apply 102-catalog-rebuild.sql first)';
  end if;

  -- The guard: the numbers change, so only while no player holds anything.
  if exists (select 1 from public.cards_owned) then
    raise exception '103-catalog-photos: a player owns a card (cards_owned is not empty), nothing changed';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '103-catalog-photos: a pack was opened (cards_packs is not empty), nothing changed';
  end if;
  if exists (select 1 from public.cards_reports where status = 'open') then
    raise exception '103-catalog-photos: a photo report is open (cards_reports), close it in the admin first, nothing changed';
  end if;
  select count(*) into v_closed from public.cards_reports where photo_id is not null;

  -- 1. The columns of the photos (idempotent).
  alter table public.cards_photos drop constraint if exists cards_photos_slot_check;
  alter table public.cards_photos add constraint cards_photos_slot_check check (slot between 1 and 6);
  alter table public.cards_photos add column if not exists sha1 text;
  alter table public.cards_photos add column if not exists quality smallint;
  alter table public.cards_photos add column if not exists stage boolean not null default false;
  alter table public.cards_photos add column if not exists event_date_precision text;
  alter table public.cards_photos add column if not exists news_only boolean not null default false;
  if not exists (select 1 from pg_constraint where conname = 'cards_photos_quality_check' and conrelid = 'public.cards_photos'::regclass) then
    alter table public.cards_photos add constraint cards_photos_quality_check check (quality is null or quality between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'cards_photos_event_date_precision_check' and conrelid = 'public.cards_photos'::regclass) then
    alter table public.cards_photos add constraint cards_photos_event_date_precision_check check (event_date_precision is null or event_date_precision in ('day', 'month'));
  end if;

  -- 2. What the owner set, by source page: the focal point, the published files, an approval. A refused or removed photo stays out.
  select coalesce(jsonb_object_agg(p.source_page, jsonb_build_object(
           'focal_x', p.focal_x, 'focal_y', p.focal_y, 'storage_path', p.storage_path, 'file_focal_x', p.file_focal_x,
           'file_focal_y', p.file_focal_y, 'status', p.status)), '{}'::jsonb)
    into v_keep
    from public.cards_photos p
   where p.status in ('auto', 'approved', 'pending');
  select coalesce(array_agg(distinct p.source_page), '{}') into v_gone
    from public.cards_photos p
   where p.status in ('rejected', 'removed')
     and not exists (select 1 from public.cards_photos q where q.source_page = p.source_page and q.status in ('auto', 'approved'));

  -- 3. Empty the three tables (cards_owned and cards_packs are empty, checked above).
  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  -- The debut year of a group, from the database: a debut column when groups has one, else the year of inception_date (as 101 and 102).
  select column_name into v_debut_col from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name in ('debut_year', 'debut_date')
    order by (column_name = 'debut_year') desc limit 1;
  v_debut_expr := case v_debut_col
    when 'debut_year' then 'debut_year::integer'
    when 'debut_date' then 'extract(year from debut_date)::integer'
    else 'extract(year from inception_date)::integer' end;

  -- 4. Resolve every subject, exactly as 102: in (with its fields) or out (with the reason).
  for sj in select x.value as v from jsonb_array_elements(v_subjects) x loop
    v_slug := sj.v ->> 'slug';
    v_kind := sj.v ->> 'kind';
    v_ent := case when v_kind = 'group' then 'group:' else 'idol:' end || v_slug;
    v_reason := null;
    v_qid := null;
    g := null; i := null; lg := null;
    select x.id, x.name, x.group_id, x.birth_date, x.wikidata_qid into i from public.idols x where false;

    select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      v_reason := 'no_groups_row';
    elsif v_kind = 'group' then
      -- A disbanded group has no active member: every row of the group is read (its former members); any other group, its active rows.
      select count(*), count(x.birth_date), count(*) filter (where x.birth_date <= v_cutoff)
        into v_n, v_known, v_adult from public.idols x
       where x.group_id = g.id and (x.active or (sj.v ->> 'end_year') is not null);
      if v_n = 0 then v_reason := case when (sj.v ->> 'end_year') is not null then 'no_member' else 'no_active_member' end;
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
      'entity', v_ent, 'name', v_name, 'section', v_section, 'group_entity', v_group_ent, 'debut_year', v_year, 'qid', v_qid));
  end loop;

  -- 5. Entities (decision 2 order: section A to Z, the people of a section before its group, then the name): the subjects, the group lines
  --    of the people (no cards of their own). A group line that is also a subject is the subject's row. lock_reasons and active are set by
  --    cards_build_catalog below.
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active, end_year)
  select x ->> 'entity', 'group', x ->> 'name', null, nullif(x ->> 'debut_year', '')::integer, null,
         lower(x ->> 'section') || '|1|' || lower(x ->> 'name'), '{}'::jsonb, true, nullif(x ->> 'end_year', '')::integer
    from jsonb_array_elements(v_in) x where x ->> 'kind' = 'group';
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select distinct on (l ->> 'id') l ->> 'id', 'group', l ->> 'name', null, nullif(l ->> 'debut_year', '')::integer, null,
         lower(l ->> 'name') || '|1|' || lower(l ->> 'name'), '{}'::jsonb, true
    from jsonb_array_elements(v_lines) l
  on conflict (id) do nothing;
  insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
  select x ->> 'entity', 'idol', x ->> 'name', x ->> 'group_entity', nullif(x ->> 'debut_year', '')::integer, x ->> 'qid',
         lower(x ->> 'section') || '|0|' || lower(x ->> 'name'), '{}'::jsonb, true
    from jsonb_array_elements(v_in) x where x ->> 'kind' = 'idol';

  -- 6. The photos of the subjects in, with what the owner set (focal point, files, approval).
  for e in select x.value from jsonb_array_elements(v_in) x loop
    for ph in select y.value from jsonb_array_elements(e -> 'photos') y loop
      if (ph ->> 'page') = any (v_gone) then
        v_dropped := v_dropped + 1;
        continue;
      end if;
      k := v_keep -> (ph ->> 'page');
      v_status := case when k ->> 'status' = 'approved' then 'approved' else ph ->> 'status' end;
      if k ->> 'status' = 'approved' and ph ->> 'status' = 'pending' then v_kept_approved := v_kept_approved + 1; end if;
      if k ->> 'storage_path' is not null then v_kept_files := v_kept_files + 1; end if;
      insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, author_url, licence, licence_url, share_alike,
                                       checked_at, event_name, event_date, event_date_precision, focal_x, focal_y, source_path, source_width,
                                       source_height, small_2x, storage_path, file_focal_x, file_focal_y, status, review_note, sha1, quality,
                                       stage, news_only)
      values (e ->> 'entity', (ph ->> 'slot')::integer, ph ->> 'source', ph ->> 'page', ph ->> 'url', ph ->> 'author', ph ->> 'author_url',
              ph ->> 'licence', ph ->> 'licence_url', (ph ->> 'share_alike')::boolean, v_checked, ph ->> 'event',
              case when ph ->> 'date_precision' = 'month' then (ph ->> 'date' || '-01')::date else (ph ->> 'date')::date end,
              ph ->> 'date_precision',
              coalesce((k ->> 'focal_x')::integer, (ph ->> 'fx')::integer), coalesce((k ->> 'focal_y')::integer, (ph ->> 'fy')::integer),
              ph ->> 'source_path', (ph ->> 'width')::integer, (ph ->> 'height')::integer,
              -- the photo's own flag (the admin's 2x list): a person's window, or either half of a group's pair, under 640 px
              case when e ->> 'kind' = 'group'
                   then floor(least((ph ->> 'width')::numeric, (ph ->> 'height')::numeric * 11 / 8.5))::integer / 2 < 640
                   else floor(least((ph ->> 'width')::numeric, (ph ->> 'height')::numeric * 5.5 / 8.5))::integer < 640 end,
              k ->> 'storage_path', (k ->> 'file_focal_x')::integer, (k ->> 'file_focal_y')::integer,
              v_status,
              case when v_status = 'pending' then 'To review: ' || (ph ->> 'review')
                   when v_status = 'approved' and ph ->> 'status' = 'pending' then 'Approved by the owner in the admin.'
                   when (ph ->> 'slot')::integer = 1 and ph ->> 'status' = 'approved' then 'Commons photo of the October 2026 run, checked by eye (amendment 1); age rule of lot 2 passed on its date.'
                   else 'Commons licence, author, file and deletion requests checked by verify-photos.mts on ' || v_checked || '; age rule passed on its date.' end,
              ph ->> 'sha1', (ph ->> 'quality')::smallint, (ph ->> 'stage')::boolean, (ph ->> 'news_only')::boolean);
    end loop;
  end loop;

  -- 7. The edition rule, in one place (the admin runs it again after the owner's review).
  create or replace function public.cards_build_catalog()
    returns jsonb
    language plpgsql security definer set search_path = public
    as $f$
  declare
    c_ladder constant text[] := array['C', 'U', 'R', 'SR', 'UR', 'L'];
    c_edition constant jsonb := '{"C": "std", "U": "stage", "R": "holo", "SR": "era", "UR": "gold", "L": "full"}'::jsonb;
    e record;
    v_ids bigint[];
    v_full boolean[];
    v_stage boolean[];
    v_cw integer[];
    v_shown boolean[];
    v_open text[];
    v_pick jsonb;
    v_used bigint[];
    v_lock jsonb;
    v_old jsonb;
    v_n integer;
    v_i integer;
    v_j integer;
    v_r text;
    v_id bigint;
    v_cwi integer;
    v_no integer := 0;
    v_subjects integer := 0;
    v_waiting integer := 0;
  begin
    if exists (select 1 from public.cards_owned) then
      raise exception 'cards_build_catalog: a player owns a card, the catalog numbers cannot change';
    end if;
    if exists (select 1 from public.cards_packs) then
      raise exception 'cards_build_catalog: a pack was opened, the catalog numbers cannot change';
    end if;
    delete from public.cards_catalog;
    for e in select en.id, en.kind, en.lock_reasons from public.cards_entities en
              where en.kind in ('idol', 'group') and exists (select 1 from public.cards_photos p where p.entity_id = en.id)
              order by en.sort_key, en.id loop
      -- The live photos, best first: the researcher's quality, then the pixels of the crop window, then the most recent, then the slot.
      select array_agg(x.id order by x.rk), array_agg(x.full_ok order by x.rk), array_agg(x.stage order by x.rk),
             array_agg(x.cw order by x.rk), array_agg(x.shown order by x.rk)
        into v_ids, v_full, v_stage, v_cw, v_shown
        from (select p.id, p.stage, w.cw,
                     case when e.kind = 'group' then w.cw / 2 >= 640 else w.cw >= 640 end as full_ok,
                     (p.storage_path is not null or p.source_path is not null) as shown,
                     row_number() over (order by coalesce(p.quality, 3) desc, w.cw desc, p.event_date desc nulls last, p.slot) as rk
                from public.cards_photos p
                cross join lateral (select floor(least(p.source_width::numeric,
                                      p.source_height::numeric * (case when e.kind = 'group' then 11 else 5.5 end) / 8.5))::integer as cw) w
               where p.entity_id = e.id and p.status in ('auto', 'approved')
                 and p.source_width is not null and p.source_height is not null) x;
      v_n := least(coalesce(cardinality(v_ids), 0), 6);
      if v_n < 2 then
        -- One approved photo (or none yet): no edition, the subject waits for a second photo (owner decision: packs from 2 photos).
        update public.cards_entities set active = false, lock_reasons = '{}'::jsonb where id = e.id;
        v_waiting := v_waiting + 1;
        continue;
      end if;
      v_open := c_ladder[1:v_n];
      v_pick := '{}'::jsonb;
      v_used := '{}';
      v_lock := '{}'::jsonb;
      -- Full Art: the best photo that gives an honest 2x of the whole card; none, and Full Art stays locked.
      if 'L' = any (v_open) then
        v_id := null;
        for v_i in 1 .. cardinality(v_ids) loop
          if v_full[v_i] then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is null then
          v_open := array_remove(v_open, 'L');
          v_lock := v_lock || '{"L": "size"}'::jsonb;
        else
          v_pick := v_pick || jsonb_build_object('L', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      -- Stage: a stage photo when there is one, the lowest rated, so the best photos stay on the higher editions.
      if 'U' = any (v_open) then
        v_id := null;
        for v_i in reverse cardinality(v_ids) .. 1 loop
          if v_stage[v_i] and not (v_ids[v_i] = any (v_used)) then v_id := v_ids[v_i]; exit; end if;
        end loop;
        if v_id is not null then
          v_pick := v_pick || jsonb_build_object('U', v_id);
          v_used := v_used || v_id;
        end if;
      end if;
      -- The other editions, from the highest down, take the remaining photos best first.
      for v_i in reverse cardinality(v_open) .. 1 loop
        v_r := v_open[v_i];
        continue when v_pick ->> v_r is not null;
        v_id := null;
        for v_j in 1 .. cardinality(v_ids) loop
          if not (v_ids[v_j] = any (v_used)) then v_id := v_ids[v_j]; exit; end if;
        end loop;
        v_pick := v_pick || jsonb_build_object(v_r, v_id);
        v_used := v_used || v_id;
      end loop;
      -- Why an edition is missing: no photo for it yet, or (Full Art) no photo large enough; an owner's 'hiatus' stays.
      v_old := coalesce(e.lock_reasons, '{}'::jsonb);
      foreach v_r in array c_ladder loop
        if not (v_r = any (v_open)) then
          v_lock := v_lock || jsonb_build_object(v_r, case when v_old ->> v_r = 'hiatus' then 'hiatus' else coalesce(v_lock ->> v_r, 'photo') end);
        end if;
      end loop;
      -- The cards, in ladder order; a group gives a pair with consecutive numbers.
      foreach v_r in array v_open loop
        v_id := (v_pick ->> v_r)::bigint;
        v_i := array_position(v_ids, v_id);
        v_cwi := v_cw[v_i];
        if e.kind = 'group' then
          insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
          values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 1, v_cwi / 2 < 640),
                 (v_no + 2, 'BV1-' || lpad((v_no + 2)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 2, (v_cwi - v_cwi / 2) < 640);
          v_no := v_no + 2;
        else
          insert into public.cards_catalog (card_no, num, entity_id, rarity, edition, photo_id, in_packs, part, small_2x)
          values (v_no + 1, 'BV1-' || lpad((v_no + 1)::text, 4, '0'), e.id, v_r, c_edition ->> v_r, v_id, v_shown[v_i], 0, v_cwi < 640);
          v_no := v_no + 1;
        end if;
      end loop;
      update public.cards_entities set active = true, lock_reasons = v_lock where id = e.id;
      v_subjects := v_subjects + 1;
    end loop;
    return jsonb_build_object('subjects', v_subjects, 'waiting', v_waiting, 'cards', v_no,
      'by_rarity', coalesce((select jsonb_object_agg(x.rarity, x.n) from (select rarity, count(*) as n from public.cards_catalog group by rarity) x), '{}'::jsonb),
      'not_shown', (select count(*) from public.cards_catalog where not in_packs));
  end
  $f$;

  -- 8. A card is in the packs only while its photo is live and has something to show (the owner's cut files, or the lot 1 bucket copy):
  --    a photo cut by the owner's script after this file enters the packs then; a refused or removed one leaves them (as cards_photo_retire).
  create or replace function public.cards_photo_ready()
    returns trigger
    language plpgsql security definer set search_path = public
    as $f$
  begin
    update public.cards_catalog c
       set in_packs = (new.status in ('auto', 'approved') and (new.storage_path is not null or new.source_path is not null))
     where c.photo_id = new.id
       and c.in_packs is distinct from (new.status in ('auto', 'approved') and (new.storage_path is not null or new.source_path is not null));
    return new;
  end
  $f$;
  drop trigger if exists cards_photos_ready on public.cards_photos;
  create trigger cards_photos_ready after update of status, storage_path, source_path on public.cards_photos
    for each row execute function public.cards_photo_ready();

  revoke all on function public.cards_build_catalog() from public, anon, authenticated;
  revoke all on function public.cards_photo_ready() from public, anon, authenticated;
  grant execute on function public.cards_build_catalog() to service_role;
  grant execute on function public.cards_photo_ready() to service_role;

  v_summary := public.cards_build_catalog();

  -- 9. Checks, then the Verify output.
  select coalesce(max(card_no), 0), count(*) into v_max, v_count from public.cards_catalog;
  if v_max <> v_count then
    raise exception '103-catalog-photos: the numbers are not contiguous (highest %, % cards)', v_max, v_count;
  end if;
  if exists (select 1 from public.cards_catalog group by entity_id, photo_id having count(distinct rarity) > 1) then
    raise exception '103-catalog-photos: a photo is on two editions';
  end if;
  if exists (select 1 from public.cards_catalog a join public.cards_catalog b on b.entity_id = a.entity_id and b.rarity = a.rarity and b.part = 2
             where a.part = 1 and b.card_no <> a.card_no + 1) then
    raise exception '103-catalog-photos: a pair does not have consecutive numbers';
  end if;
  raise notice '103-catalog-photos: % subjects in the packs, % waiting for a second approved photo, % cards, highest number BV1-%',
    v_summary ->> 'subjects', v_summary ->> 'waiting', v_count, lpad(v_max::text, 4, '0');
  for r in select c.rarity, count(*) as n, count(distinct c.entity_id) as s from public.cards_catalog c
            group by c.rarity order by array_position(array['C', 'U', 'R', 'SR', 'UR', 'L'], c.rarity) loop
    raise notice '103-catalog-photos: edition % has % cards (% subjects)', r.rarity, r.n, r.s;
  end loop;
  for r in select p.status, count(*) as n from public.cards_photos p group by p.status order by p.status loop
    raise notice '103-catalog-photos: photos % %', r.status, r.n;
  end loop;
  raise notice '103-catalog-photos: % cards wait for their files (publish-card-files.mjs --publish), % photos kept their published files, % approvals of the owner kept, % photos left out because the owner refused or removed them',
    v_summary ->> 'not_shown', v_kept_files, v_kept_approved, v_dropped;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'end_year' as y from jsonb_array_elements(v_in) x where x.value ->> 'end_year' is not null order by 1 loop
    raise notice '103-catalog-photos: % is in as a disbanded group (%)', r.slug, r.y;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'reason' as reason from jsonb_array_elements(v_left_out) x loop
    raise notice '103-catalog-photos: left out % (%)', r.slug, r.reason;
  end loop;
  for r in select x.value ->> 'slug' as slug, x.value ->> 'reason' as reason from jsonb_array_elements(v_out) x loop
    raise notice '103-catalog-photos: left out % (%)', r.slug, r.reason;
  end loop;
  if v_closed > 0 then
    raise notice '103-catalog-photos: % closed photo reports lost their photo link (the photo rows were rebuilt)', v_closed;
  end if;
  if (select count(*) from public.cards_entities where id in (select 'idol:' || s from unnest(array[${allSlugs}]) s union all select 'group:' || s from unnest(array[${allSlugs}]) s)) = 0 then
    raise notice '103-catalog-photos: no subject resolved (public.groups has none of the slugs)';
  end if;
end $c103$;
`;

  const rollback = `-- 103-catalog-photos.rollback.sql (undo of 103-catalog-photos.sql)
--
-- What:   empties cards_catalog, cards_photos and cards_entities, drops cards_build_catalog(), cards_photo_ready() and its trigger, and gives
--         cards_photos back the shape of 102 (no sha1, quality, stage, event_date_precision, news_only; slot 1 to 3). The catalog stays
--         EMPTY: apply 102-catalog-rebuild.sql again to get the one-photo catalog of lot 2 back.
-- Refuses: while a player owns a card (cards_owned) or has opened a pack (cards_packs).
-- Verify: select count(*) from public.cards_catalog;   expect 0
-- Verify: select count(*) from pg_proc where proname in ('cards_build_catalog', 'cards_photo_ready');   expect 0
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos' and column_name in ('sha1', 'quality', 'stage', 'event_date_precision', 'news_only');   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $c103r$
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'warning', true);

  if to_regclass('public.cards_catalog') is null then
    return;
  end if;
  if exists (select 1 from public.cards_owned) then
    raise exception '103-catalog-photos rollback: a player owns a card';
  end if;
  if exists (select 1 from public.cards_packs) then
    raise exception '103-catalog-photos rollback: a pack was opened';
  end if;

  delete from public.cards_catalog;
  delete from public.cards_photos;
  delete from public.cards_entities;

  drop trigger if exists cards_photos_ready on public.cards_photos;
  drop function if exists public.cards_photo_ready();
  drop function if exists public.cards_build_catalog();
  alter table public.cards_photos drop constraint if exists cards_photos_quality_check;
  alter table public.cards_photos drop constraint if exists cards_photos_event_date_precision_check;
  alter table public.cards_photos drop column if exists sha1;
  alter table public.cards_photos drop column if exists quality;
  alter table public.cards_photos drop column if exists stage;
  alter table public.cards_photos drop column if exists event_date_precision;
  alter table public.cards_photos drop column if exists news_only;
  alter table public.cards_photos drop constraint if exists cards_photos_slot_check;
  alter table public.cards_photos add constraint cards_photos_slot_check check (slot between 1 and 3);
end $c103r$;
`;
  return { sql, rollback };
}
