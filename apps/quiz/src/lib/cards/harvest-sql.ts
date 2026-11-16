// Bunnyverse Cards lot 6: the text of docs/pending-migrations/cards/116-photos-harvest.sql and its rollback, built from
// docs/design/cards/data/lot6/photos.json (scripts/cards/verify-harvest.mts) by scripts/cards/gen-harvest-sql.mts. Pure: no file, no network,
// no database. harvest-sql.test.ts runs both files on PGlite; kpopcards/harvest-sql-postgres.test.ts on a real Postgres.
//
// ADDITIVE: it never updates, renumbers or deletes an existing cards_photos row or status, never writes public.idols (Kpopdle must not
// move), adds the entities that are missing (member idols, a card-less group line, the groups of the lot, the age-locked pockets), the new
// photos in the next free slots, the column cards_entities.age_lock and the function cards_age_locks() that computes the lock at READ time
// from public.idols. The lot's data carries no birth date: a locked subject is only a name and a flag.
import type { HarvestPhotosFile } from './harvest-checks';

export interface HarvestPhotoRow {
  status: 'auto' | 'pending'; source: string; page: string; url: string; width: number; height: number; sha1: string | null; author: string;
  author_url: string | null; licence: string; licence_url: string; share_alike: boolean; date: string; date_precision: 'day' | 'month';
  event: string | null; stage: boolean; quality: number; focal: { x: number; y: number }; news_only: boolean; review: string[];
}
export interface HarvestSqlSubject {
  slug: string; kind: 'idol' | 'group'; name: string; qid: string | null; group: string | null; locked: boolean; photos: HarvestPhotoRow[];
}
export interface HarvestSqlInput { checked_on: string; subjects: HarvestSqlSubject[] }
export interface HarvestSql { sql: string; rollback: string }

/** lot6/photos.json to the builder's input: the photos that are not out; a subject with none stays (its entity is still added). */
export function harvestInputOf(file: HarvestPhotosFile): HarvestSqlInput {
  return {
    checked_on: file.checked_on,
    subjects: file.subjects.map((s) => ({
      slug: s.slug, kind: s.kind, name: s.name, qid: s.qid, group: s.group, locked: s.locked,
      photos: s.locked ? [] : s.photos.filter((p) => p.status !== 'out').map((p) => ({
        status: p.status as 'auto' | 'pending', source: p.source, page: p.page, url: p.url, width: p.width, height: p.height, sha1: p.sha1, author: p.author,
        author_url: p.author_url, licence: p.licence, licence_url: p.licence_url, share_alike: p.share_alike, date: p.date, date_precision: p.date_precision,
        event: p.event, stage: p.stage, quality: p.quality, focal: p.focal, news_only: p.news_only, review: p.review,
      })),
    })),
  };
}

/** JSON text for a jsonb literal with no dash character in the source file (a Commons author or title can hold one): escaped as the JSON escapes of the en dash and the em dash. */
const jsonText = (v: unknown): string => JSON.stringify(v).replace(/[\u2013\u2014]/g, (c) => (c === '\u2013' ? '\\u2013' : '\\u2014'));

export const idOf = (s: { kind: 'idol' | 'group'; slug: string }): string => `${s.kind}:${s.slug}`;

export function buildHarvest(input: HarvestSqlInput): HarvestSql {
  const { subjects, checked_on: checked } = input;
  const seen = new Set<string>();
  for (const s of subjects) {
    if (seen.has(s.slug)) throw new Error(`${s.slug}: repeated subject`);
    seen.add(s.slug);
    if (s.kind === 'idol' && !s.qid) throw new Error(`${s.slug}: an idol subject needs a Wikidata id (people resolve by QID)`);
    if (s.locked && s.photos.length) throw new Error(`${s.slug}: a locked subject has no photo`);
    for (const p of s.photos) {
      if (!(p.quality >= 1 && p.quality <= 5)) throw new Error(`${s.slug}: quality ${p.quality}`);
      if (p.status === 'pending' && p.review.length === 0) throw new Error(`${s.slug}: pending without a reason`);
    }
  }
  const photos = subjects.flatMap((s) => s.photos);
  const locked = subjects.filter((s) => s.locked);
  const people = subjects.filter((s) => s.kind === 'idol');
  const entityIds = [...new Set([
    ...subjects.map(idOf),
    ...subjects.filter((s) => s.kind === 'idol' && s.group).map((s) => `group:${s.group}`),
  ])].sort();
  const pages = photos.map((p) => p.page);
  const sqlText = (x: string): string => `'${x.replace(/'/g, "''").replace(/\u2013/g, "' || chr(8211) || '").replace(/\u2014/g, "' || chr(8212) || '")}'`;
  const sqlList = (xs: string[]): string => (xs.length ? xs.map((x) => (/[\u2013\u2014]/.test(x) ? `(${sqlText(x)})` : sqlText(x))).join(', ') : "''");
  const literal = `[\n${subjects.map((s) => `  ${jsonText({
    slug: s.slug, kind: s.kind, name: s.name, qid: s.qid, group: s.group, locked: s.locked,
    photos: s.photos.map((p) => ({
      status: p.status, source: p.source, page: p.page, url: p.url, width: p.width, height: p.height, sha1: p.sha1, author: p.author, author_url: p.author_url,
      licence: p.licence, licence_url: p.licence_url, share_alike: p.share_alike, date: p.date, date_precision: p.date_precision, event: p.event,
      stage: p.stage, quality: p.quality, fx: p.focal.x, fy: p.focal.y, news_only: p.news_only, review: p.review.join('; '),
    })),
  })}`).join(',\n')}\n]`;

  const sql = `-- 116-photos-harvest.sql (Bunnyverse Cards lot 6, ${checked}; the photo harvest, integrator brief 2026-11-16)
--
-- What:   ADDS to the cards, in ONE DO block, and never changes what is there:
--         1. the entities that are missing: the member idols of the lot (kind idol, qid, group_id 'group:<slug>'), a card-less group line when a
--            member's group has no entity yet (decision 27), the groups of the lot, and the age-locked pockets (a minor member, a group with a
--            minor or with a member whose birth date is unknown: no photo, no card). sort_key puts a member inside its group's section, before
--            the group's own cards (decision 2). A person who already has an entity (same slug, or the same Wikidata id) keeps it and gains photos;
--         2. the new photos (auto or pending, as verify-harvest.mts decided on ${checked}) in the next free slots of their subject, with the
--            credit; a source page or a sha1 already in cards_photos is skipped with a notice (a photo the owner refused stays out);
--         3. the age lock, computed AT READ TIME from the database, never from this repository: the column cards_entities.age_lock (true for the
--            pockets above) and the function public.cards_age_locks(), which returns entity_id, locked and opens_month for them: a person is
--            locked while public.idols has no birth date for that Wikidata id or the person is under 18; a group while any current member
--            (public.idols of that group, active, or a locked member entity of it) is. opens_month (the first day of the month the person, or
--            the group's youngest member, turns 18; null when unknown) is for the admin only: the function runs for service_role. After the
--            opening the entity is a normal entity without a photo, until a photo goes through the circuit;
--         4. a log table (cards_harvest_log) of the entities and photos THIS file added, so the rollback removes only those.
--         It writes no cards_catalog row (the owner presses "Reconstruire le catalogue" afterwards) and never public.idols: the Kpopdle source
--         view is counted before and after, and the file refuses if it moved.
-- How:    one jsonb literal below (${subjects.length} subjects: ${people.length} people, ${subjects.length - people.length} groups, ${locked.length} locked, ${photos.length} photos).
--         People resolve at apply time by Wikidata id from public.idols (no row, or two: skipped with a notice); groups by slug from public.groups.
--         Photos get the smallest free slot of 1 to 6 among the live and pending ones.
-- Why:    goal of 1,000 cards (lot 6): every Kpopdle idol becomes a subject of its own, the groups get up to six photos, and the groups with a minor
--         show locked pockets instead of a photo.
-- Rows:   at most ${entityIds.length} entities, ${photos.length} photos, 1 column, 1 table, 2 functions. The real counts are the notices (Messages tab).
-- Needs:  001 to 003, 102, 103 and 110 applied before (cards_build_catalog, the photo columns of lot 3), public.groups and public.idols.
--         Apply after a backup, never between 23:50 and 00:30 UTC, then "Reconstruire le catalogue", then pnpm --filter quiz owner:cards.
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_entities' and column_name = 'age_lock';   expect 1
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname = 'cards_age_locks';   expect 1
-- Verify: select has_function_privilege('anon', 'public.cards_age_locks(date)', 'execute') or has_function_privilege('authenticated', 'public.cards_age_locks(date)', 'execute');   expect f
-- Verify: select has_function_privilege('service_role', 'public.cards_age_locks(date)', 'execute');   expect t
-- Verify: select count(*) from public.cards_entities where age_lock;   expect at most ${locked.length} (the notice "locked pockets"; a locked subject with cards, or without a row to resolve, is not set)
-- Verify: select count(*) from public.cards_harvest_log where kind = 'photo';   expect the notice "photos added" (at most ${photos.length})
-- Verify: select count(*) from public.cards_photos p where not exists (select 1 from public.cards_entities e where e.id = p.entity_id);   expect 0
-- Verify: select count(*) from public.cards_photos where status in ('auto', 'approved') group by entity_id, slot having count(*) > 1;   expect no row
-- Verify: select count(*) from public.cards_age_locks() where locked;   expect at most ${locked.length} (the pockets still locked today; fewer when public.idols holds an adult birth date)
-- Refuses: between 23:50 and 00:30 UTC; when a cards table, public.groups, public.idols, a column of 103 or cards_build_catalog() is missing; when the Kpopdle source would change.
-- Undo:   116-photos-harvest.rollback.sql (removes only what the log says this file added; refused while a player owns a card of these subjects).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run adds nothing.

do $c116$
declare
  v_subjects constant jsonb := $subjects$${literal}$subjects$::jsonb;
  v_checked constant date := date '${checked}';
  v_utc time := (now() at time zone 'UTC')::time;
  v_debut_col text;
  v_debut_expr text;
  v_dle_before bigint;
  v_dle_after bigint;
  sj jsonb;
  ph jsonb;
  g record;
  lg record;
  v_slug text;
  v_kind text;
  v_group text;
  v_ent text;
  v_gent text;
  v_qid text;
  v_name text;
  v_section text;
  v_year integer;
  v_n integer;
  v_slot integer;
  v_pid bigint;
  v_locked boolean;
  c_entities integer := 0;
  c_lines integer := 0;
  c_locked integer := 0;
  c_photos integer := 0;
  c_pending integer := 0;
  c_skipped integer := 0;
  c_subjects integer := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  -- The owner's rule: never between 23:50 and 00:30 UTC (the Paris day and the quiz of the day turn around midnight).
  if v_utc >= time '23:50' or v_utc < time '00:30' then
    raise exception '116-photos-harvest: refused between 23:50 and 00:30 UTC (it is % UTC now), nothing changed', to_char(v_utc, 'HH24:MI');
  end if;
  if to_regclass('public.cards_entities') is null or to_regclass('public.cards_photos') is null or to_regclass('public.cards_catalog') is null then
    raise exception '116-photos-harvest: the cards tables are missing (run 001 to 003 first)';
  end if;
  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '116-photos-harvest: public.groups or public.idols is missing';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_photos'
        and column_name in ('sha1', 'quality', 'stage', 'event_date_precision', 'news_only')) < 5
     or to_regprocedure('public.cards_build_catalog()') is null then
    raise exception '116-photos-harvest: file 103 is missing (cards_build_catalog and the photo columns of lot 3), apply 103-catalog-photos.sql first';
  end if;

  -- Kpopdle must not move: this file never writes public.idols, and the source view is counted before and after (as 099).
  if to_regclass('public.dle_src_kpop_idol') is not null then
    execute 'select count(*) from public.dle_src_kpop_idol' into v_dle_before;
  end if;

  -- 1. The column, the log, the debut year of a group (a debut column when groups has one, else the year of inception_date, as 103).
  alter table public.cards_entities add column if not exists age_lock boolean not null default false;
  create table if not exists public.cards_harvest_log (
    kind text not null constraint cards_harvest_log_kind_check check (kind in ('entity', 'photo')),
    ref text not null,
    added_on date not null default current_date,
    constraint cards_harvest_log_pkey primary key (kind, ref)
  );
  alter table public.cards_harvest_log enable row level security;
  revoke all on table public.cards_harvest_log from public, anon, authenticated;
  grant all on table public.cards_harvest_log to service_role;
  select column_name into v_debut_col from information_schema.columns
    where table_schema = 'public' and table_name = 'groups' and column_name in ('debut_year', 'debut_date')
    order by (column_name = 'debut_year') desc limit 1;
  v_debut_expr := case v_debut_col
    when 'debut_year' then 'debut_year::integer'
    when 'debut_date' then 'extract(year from debut_date)::integer'
    else 'extract(year from inception_date)::integer' end;

  -- 2. The subjects.
  for sj in select x.value from jsonb_array_elements(v_subjects) x loop
    v_slug := sj ->> 'slug';
    v_kind := sj ->> 'kind';
    v_group := nullif(sj ->> 'group', '');
    v_qid := nullif(sj ->> 'qid', '');
    v_locked := coalesce((sj ->> 'locked')::boolean, false);
    v_ent := null;
    v_gent := null;
    g := null;
    lg := null;

    if v_kind = 'group' then
      select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = v_slug;
      if g.id is null then
        raise notice '116-photos-harvest: skipped % (no public.groups row with that slug)', v_slug;
        c_skipped := c_skipped + 1;
        continue;
      end if;
      v_ent := 'group:' || v_slug;
      execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using g.id;
      insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
      values (v_ent, 'group', g.name, null, v_year, null, lower(g.name) || '|1|' || lower(g.name), '{}'::jsonb, true)
      on conflict (id) do nothing;
      get diagnostics v_n = row_count;
      if v_n > 0 then
        insert into public.cards_harvest_log (kind, ref) values ('entity', v_ent) on conflict do nothing;
        c_entities := c_entities + 1;
      end if;
    else
      -- The person, by Wikidata id: one public.idols row, no more, no less.
      select count(*) into v_n from public.idols x where v_qid is not null and x.wikidata_qid = v_qid;
      if v_n <> 1 then
        raise notice '116-photos-harvest: skipped % (% public.idols rows for its Wikidata id)', v_slug, v_n;
        c_skipped := c_skipped + 1;
        continue;
      end if;
      select coalesce(nullif(btrim(x.name), ''), sj ->> 'name') into v_name from public.idols x where x.wikidata_qid = v_qid;
      -- the group, or the person's own groups row for a soloist
      select gr.id, gr.name, gr.slug into g from public.groups gr where gr.slug = coalesce(v_group, v_slug);
      if g.id is null then
        raise notice '116-photos-harvest: skipped % (no public.groups row for %)', v_slug, coalesce(v_group, v_slug);
        c_skipped := c_skipped + 1;
        continue;
      end if;
      -- the entity: this slug's, or the one that already carries this Wikidata id
      select e.id into v_ent from public.cards_entities e where e.id = 'idol:' || v_slug;
      if v_ent is null then
        select count(*), min(e.id) into v_n, v_ent from public.cards_entities e where e.kind = 'idol' and e.qid = v_qid;
        if v_n > 1 then
          raise notice '116-photos-harvest: skipped % (% entities carry its Wikidata id)', v_slug, v_n;
          c_skipped := c_skipped + 1;
          continue;
        end if;
      end if;
      if v_ent is null then
        execute format('select %s from public.groups where id = $1', v_debut_expr) into v_year using g.id;
        if v_group is not null then
          -- a member: the group's line (no cards of its own when it has no photo yet), the section is the group's name
          v_gent := 'group:' || v_group;
          v_section := g.name;
          insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
          values (v_gent, 'group', g.name, null, v_year, null, lower(g.name) || '|1|' || lower(g.name), '{}'::jsonb, true)
          on conflict (id) do nothing;
          get diagnostics v_n = row_count;
          if v_n > 0 then
            insert into public.cards_harvest_log (kind, ref) values ('entity', v_gent) on conflict do nothing;
            c_lines := c_lines + 1;
          end if;
        else
          v_section := v_name;
        end if;
        v_ent := 'idol:' || v_slug;
        insert into public.cards_entities (id, kind, name, group_id, debut_year, qid, sort_key, lock_reasons, active)
        values (v_ent, 'idol', v_name, v_gent, v_year, v_qid, lower(v_section) || '|0|' || lower(v_name), '{}'::jsonb, true);
        insert into public.cards_harvest_log (kind, ref) values ('entity', v_ent) on conflict do nothing;
        c_entities := c_entities + 1;
      end if;
    end if;
    c_subjects := c_subjects + 1;

    -- 3. The lock: only an entity with no photo and no card (a subject that already has cards is never hidden).
    if v_locked then
      if exists (select 1 from public.cards_photos p where p.entity_id = v_ent) or exists (select 1 from public.cards_catalog c where c.entity_id = v_ent) then
        raise notice '116-photos-harvest: % has photos or cards, the age lock is not set', v_slug;
      else
        update public.cards_entities set age_lock = true where id = v_ent and not age_lock;
        get diagnostics v_n = row_count;
        c_locked := c_locked + v_n;
      end if;
      continue;
    end if;

    -- 4. The photos, in the next free slots.
    for ph in select y.value from jsonb_array_elements(sj -> 'photos') y loop
      if exists (select 1 from public.cards_photos p where p.source_page = ph ->> 'page') then
        raise notice '116-photos-harvest: % photo skipped (the page is already in cards_photos)', v_slug;
        c_skipped := c_skipped + 1;
        continue;
      end if;
      if nullif(ph ->> 'sha1', '') is not null and exists (select 1 from public.cards_photos p where p.sha1 = ph ->> 'sha1') then
        raise notice '116-photos-harvest: % photo skipped (the sha1 is already in cards_photos)', v_slug;
        c_skipped := c_skipped + 1;
        continue;
      end if;
      select min(s) into v_slot from generate_series(1, 6) s
       where not exists (select 1 from public.cards_photos p where p.entity_id = v_ent and p.slot = s and p.status in ('auto', 'approved', 'pending'));
      if v_slot is null then
        raise notice '116-photos-harvest: % photo skipped (the six slots are taken)', v_slug;
        c_skipped := c_skipped + 1;
        continue;
      end if;
      insert into public.cards_photos (entity_id, slot, source, source_page, file_url, author, author_url, licence, licence_url, share_alike,
                                       checked_at, event_name, event_date, event_date_precision, focal_x, focal_y, source_path, source_width,
                                       source_height, small_2x, status, review_note, sha1, quality, stage, news_only)
      values (v_ent, v_slot, ph ->> 'source', ph ->> 'page', ph ->> 'url', ph ->> 'author', ph ->> 'author_url', ph ->> 'licence', ph ->> 'licence_url',
              (ph ->> 'share_alike')::boolean, v_checked, ph ->> 'event',
              case when ph ->> 'date_precision' = 'month' then (ph ->> 'date' || '-01')::date else (ph ->> 'date')::date end, ph ->> 'date_precision',
              (ph ->> 'fx')::integer, (ph ->> 'fy')::integer, null, (ph ->> 'width')::integer, (ph ->> 'height')::integer,
              case when v_kind = 'group'
                   then floor(least((ph ->> 'width')::numeric, (ph ->> 'height')::numeric * 11 / 8.5))::integer / 2 < 640
                   else floor(least((ph ->> 'width')::numeric, (ph ->> 'height')::numeric * 5.5 / 8.5))::integer < 640 end,
              ph ->> 'status',
              case when ph ->> 'status' = 'pending' then 'To review: ' || (ph ->> 'review')
                   else 'Commons licence, author, file and deletion requests checked by verify-harvest.mts on ' || v_checked || '; age rule passed on its date.' end,
              nullif(ph ->> 'sha1', ''), (ph ->> 'quality')::smallint, (ph ->> 'stage')::boolean, (ph ->> 'news_only')::boolean)
      returning id into v_pid;
      insert into public.cards_harvest_log (kind, ref) values ('photo', v_pid::text);
      c_photos := c_photos + 1;
      if ph ->> 'status' = 'pending' then c_pending := c_pending + 1; end if;
    end loop;
  end loop;

  -- 5. The age lock, at read time: the day a person turns 18 (29 February: 1 March of a common year, as age-rule.ts) and the function.
  create or replace function public.cards_age_day(p_birth date)
    returns date
    language sql immutable set search_path = public
    as $f$
    select case
      when p_birth is null then null
      when extract(month from p_birth) = 2 and extract(day from p_birth) = 29 and extract(day from (p_birth + interval '18 years')) = 28
        then (p_birth + interval '18 years')::date + 1
      else (p_birth + interval '18 years')::date end
  $f$;

  create or replace function public.cards_age_locks(p_today date default current_date)
    returns table (entity_id text, locked boolean, opens_month date)
    language sql stable security definer set search_path = public
    as $f$
    with ent as (
      select e.id, e.kind, e.qid, e.group_id from public.cards_entities e where e.age_lock
    ), person as (
      -- a person is locked while public.idols has no birth date for the Wikidata id (no row, two rows, or a null date) or the date is under 18 years back
      select e.id, e.group_id, case when c.n = 1 then c.b end as b
        from ent e
        cross join lateral (select count(*) as n, min(i.birth_date) as b from public.idols i where e.qid is not null and i.wikidata_qid = e.qid) c
       where e.kind = 'idol'
    ), members as (
      -- the current members of a locked group: the active rows of public.idols of that group, and the locked member entities that name it
      select e.id as gid, i.birth_date as b
        from ent e
        join public.groups g on 'group:' || g.slug = e.id
        join public.idols i on i.group_id = g.id and i.active
       where e.kind = 'group'
      union all
      select p.group_id, p.b from person p where p.group_id in (select x.id from ent x where x.kind = 'group')
    ), grp as (
      select e.id, count(m.gid) as n, coalesce(bool_or(m.b is null), false) as unknown, max(public.cards_age_day(m.b)) as latest
        from ent e left join members m on m.gid = e.id
       where e.kind = 'group'
       group by e.id
    )
    select p.id, (p.b is null or public.cards_age_day(p.b) > p_today),
           case when p.b is not null and public.cards_age_day(p.b) > p_today then date_trunc('month', public.cards_age_day(p.b))::date end
      from person p
    union all
    select g.id, (g.n = 0 or g.unknown or g.latest > p_today),
           case when g.n > 0 and not g.unknown and g.latest > p_today then date_trunc('month', g.latest)::date end
      from grp g
  $f$;

  revoke all on function public.cards_age_day(date) from public, anon, authenticated;
  revoke all on function public.cards_age_locks(date) from public, anon, authenticated;
  grant execute on function public.cards_age_day(date) to service_role;
  grant execute on function public.cards_age_locks(date) to service_role;
  if has_function_privilege('anon', 'public.cards_age_locks(date)', 'execute') or has_function_privilege('authenticated', 'public.cards_age_locks(date)', 'execute') then
    raise exception '116-photos-harvest: a browser role can execute cards_age_locks';
  end if;

  -- 6. Checks and the Verify output.
  if to_regclass('public.dle_src_kpop_idol') is not null then
    execute 'select count(*) from public.dle_src_kpop_idol' into v_dle_after;
    if v_dle_after is distinct from v_dle_before then
      raise exception '116-photos-harvest: the Kpopdle source would go from % to % entities, nothing written', v_dle_before, v_dle_after;
    end if;
    raise notice '116-photos-harvest: Kpopdle source % entities before and after (this file never writes public.idols)', v_dle_after;
  end if;
  if exists (select 1 from public.cards_photos p where not exists (select 1 from public.cards_entities e where e.id = p.entity_id)) then
    raise exception '116-photos-harvest: a photo has no entity';
  end if;
  notify pgrst, 'reload schema';
  raise notice '116-photos-harvest: % subjects, % entities added (% of them group lines of a member), % locked pockets, photos added % (% to review), % skipped',
    c_subjects, c_entities + c_lines, c_lines, c_locked, c_photos, c_pending, c_skipped;
  raise notice '116-photos-harvest: now press "Reconstruire le catalogue" in the admin, then pnpm --filter quiz owner:cards';
end $c116$;
`;

  const rollback = `-- 116-photos-harvest.rollback.sql (undo of 116-photos-harvest.sql)
--
-- What:   removes ONLY what 116 added, as its own log (public.cards_harvest_log) says, inside the explicit lists below: the photos it added
--         (${pages.length} pages at most), the entities it created (${entityIds.length} ids at most), the log, the column cards_entities.age_lock, the
--         functions cards_age_locks and cards_age_day. An entity that existed before 116 stays; a photo that existed before stays.
--         When the catalog already holds cards of these subjects it is built again with cards_build_catalog() (so the numbers stay contiguous),
--         which is only possible while no pack was opened.
-- Refuses: while a player owns a card of these subjects; while a pack was opened and the catalog holds a card of these subjects (the numbers cannot change then).
-- Verify: select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'cards_entities' and column_name = 'age_lock';   expect 0
-- Verify: select count(*) from pg_proc where pronamespace = 'public'::regnamespace and proname in ('cards_age_locks', 'cards_age_day');   expect 0
-- Verify: select to_regclass('public.cards_harvest_log') is null;   expect t
-- Verify: select count(*) from public.cards_photos where source_page in (${sqlList(pages.slice(0, 3))});   expect 0 (the photos 116 added; a photo that existed before stays)
-- o1-transaction: single, ONE DO block. Idempotent: a second run changes nothing.

do $c116r$
declare
  v_entities constant text[] := array[${sqlList(entityIds)}];
  v_pages constant text[] := array[${sqlList(pages)}];
  v_photo_ids bigint[];
  v_entity_ids text[];
  v_subject_ids text[];
  v_touched boolean;
  v_n integer;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.cards_harvest_log') is not null then
    select coalesce(array_agg(l.ref::bigint), '{}') into v_photo_ids
      from public.cards_harvest_log l join public.cards_photos p on p.id = l.ref::bigint
     where l.kind = 'photo' and p.source_page = any (v_pages);
    select coalesce(array_agg(l.ref), '{}') into v_entity_ids
      from public.cards_harvest_log l where l.kind = 'entity' and l.ref = any (v_entities);
    -- the subjects: the listed ids, and every entity that received a photo of this file (a person found by Wikidata id keeps another id)
    select coalesce(array_agg(distinct x), '{}') into v_subject_ids
      from unnest(v_entities || coalesce((select array_agg(distinct p.entity_id) from public.cards_photos p where p.id = any (v_photo_ids)), '{}')) x;
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
                where c.entity_id = any (v_subject_ids) or c.photo_id = any (v_photo_ids)) then
      raise exception '116-photos-harvest.rollback: a player owns a card of these subjects, nothing changed';
    end if;
    v_touched := exists (select 1 from public.cards_catalog c where c.entity_id = any (v_subject_ids) or c.photo_id = any (v_photo_ids));
    if v_touched and exists (select 1 from public.cards_packs) then
      raise exception '116-photos-harvest.rollback: a pack was opened and the catalog holds cards of these subjects, the numbers cannot change, nothing changed';
    end if;

    delete from public.cards_photos p where p.id = any (v_photo_ids);
    get diagnostics v_n = row_count;
    raise notice '116-photos-harvest.rollback: % photos removed', v_n;
    -- an entity this file created goes only when no photo is left on it: the people first, then the group lines no member needs any more
    delete from public.cards_entities e
     where e.kind = 'idol' and e.id = any (v_entity_ids) and not exists (select 1 from public.cards_photos p where p.entity_id = e.id);
    get diagnostics v_n = row_count;
    delete from public.cards_entities e
     where e.kind = 'group' and e.id = any (v_entity_ids) and not exists (select 1 from public.cards_photos p where p.entity_id = e.id)
       and not exists (select 1 from public.cards_entities m where m.group_id = e.id);
    raise notice '116-photos-harvest.rollback: % people removed (then the group lines no member needs)', v_n;
    drop table public.cards_harvest_log;
    if v_touched then
      perform public.cards_build_catalog();
      raise notice '116-photos-harvest.rollback: the catalog was built again without these subjects';
    end if;
  end if;

  drop function if exists public.cards_age_locks(date);
  drop function if exists public.cards_age_day(date);
  alter table public.cards_entities drop column if exists age_lock;

  notify pgrst, 'reload schema';
end $c116r$;
`;
  return { sql, rollback };
}
