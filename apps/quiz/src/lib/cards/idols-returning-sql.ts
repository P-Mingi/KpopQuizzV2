// Bunnyverse Cards lot 3: the text of docs/pending-migrations/cards/099b-idols-returning.sql and its rollback (scripts/cards/
// gen-idols-returning-sql.mts writes them). Pure: no file, no network, no database. The same guards as 099-idols-members.sql: a group gets
// rows only while it has no active idols row; every active row waits out of Kpopdle (needs_review); the Kpopdle source count must not move.

export interface ReturningRow {
  slug: string;
  members: Array<{ name: string; qid: string; ord: number; birth_date: string | null }>;
}

const TAG = '099b-idols-returning';
const KPOPDLE_WAIT = 'Kpopdle clues not filled yet (gender, nationality, debut year, leader or maknae)';

export function buildReturningSql(rows: ReturningRow[], checkedOn: string): { sql: string; rollback: string } {
  const people = rows.reduce((n, r) => n + r.members.length, 0);
  const literal = `[\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n]`;
  const slugs = rows.map((r) => `'${r.slug}'`).join(', ') || "''";
  const sql = `-- 099b-idols-returning.sql (Bunnyverse Cards lot 3, ${checkedOn}; the members of the groups that come back with a newer photo)
--
-- What:   adds the current members of ${rows.length} groups to public.idols (${people} people at most): ${rows.map((r) => r.slug).join(', ') || 'none'}. Lot 2 left
--         these groups out only because someone was under 18 on their old photo's date; lot 3 found newer photos where everyone is an adult
--         (docs/design/cards/data/photos.json). 103-catalog-photos.sql checks every group's active members in public.idols at apply time
--         (decision 17): without rows it leaves the group out ("no_active_member").
--         The rows are active with needs_review TRUE and the reason "${KPOPDLE_WAIT}": the Kpopdle source view reads only rows without
--         needs_review, so none of them enters Kpopdle until the owner fills those columns (as 099).
-- How:    one jsonb literal below. For each group: the public.groups row by slug (none: a notice, skip); ONLY when that group has zero active
--         idols rows, its members are inserted with on conflict (group_id, name) do nothing. birth_date only when two permitted sources give
--         it to the day (lot 2's Wikidata and English Wikipedia, lot 3's Korean or English Wikipedia second sources); a member without it
--         makes 103 leave the group out ("unknown_birth_date"), never in. Every inserted row carries a review_reason starting with '${TAG}'.
--         Existing rows are never updated or deleted. The Kpopdle source view is counted before and after: the file refuses if it moved.
-- Why:    integrator brief lot 3, part A: a newer photo can bring back the groups left out for the age on the photo.
-- Rows:   at most ${people} rows in public.idols. The real count is the notice "${TAG}: N rows added".
-- Needs:  public.groups and public.idols. Run it after 099 and before 103 (a companion of 099, numbered so: review 1 finding 15 keeps 100 unused).
-- Verify: select count(*) from public.idols where review_reason like '${TAG}%';   expect the "N rows added" notice
-- Verify: select count(*) from public.idols where review_reason like '${TAG}%' and active and not needs_review;   expect 0
-- Verify: select g.slug, count(*) from public.idols i join public.groups g on g.id = i.group_id where i.review_reason like '${TAG}%' group by g.slug order by g.slug;   expect one line per group with an "added" notice
-- Refuses: when public.groups or public.idols is missing; when the Kpopdle source would change.
-- Undo:   099b-idols-returning.rollback.sql (refused while a player owns a card of one of these groups).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run adds nothing.

do $i099b$
declare
  v_data constant jsonb := $members$${literal}$members$;
  s jsonb;
  m jsonb;
  g record;
  v_slug text;
  v_added int;
  v_total int := 0;
  v_groups int := 0;
  v_dle_before bigint;
  v_dle_after bigint;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '${TAG}: public.groups or public.idols is missing';
  end if;
  if to_regclass('public.dle_src_kpop_idol') is not null then
    execute 'select count(*) from public.dle_src_kpop_idol' into v_dle_before;
  end if;

  for s in select value from jsonb_array_elements(v_data) loop
    v_slug := s->>'slug';
    select gr.id, gr.name into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      raise notice '${TAG}: % skipped, no groups row', v_slug;
      continue;
    end if;
    if exists (select 1 from public.idols x where x.group_id = g.id and x.active) then
      raise notice '${TAG}: % skipped, the group has active members already', v_slug;
      continue;
    end if;
    v_added := 0;
    for m in select value from jsonb_array_elements(s->'members') loop
      insert into public.idols (group_id, name, birth_date, wikidata_qid, active, ord, needs_review, review_reason)
      values (g.id, m->>'name', nullif(m->>'birth_date', '')::date, m->>'qid', true, (m->>'ord')::int, true, '${TAG}: ${KPOPDLE_WAIT}')
      on conflict (group_id, name) do nothing;
      if found then v_added := v_added + 1; end if;
    end loop;
    v_total := v_total + v_added;
    v_groups := v_groups + 1;
    raise notice '${TAG}: % added % rows', v_slug, v_added;
  end loop;

  raise notice '${TAG}: % rows added in % groups', v_total, v_groups;
  if v_dle_before is not null then
    execute 'select count(*) from public.dle_src_kpop_idol' into v_dle_after;
    if v_dle_after <> v_dle_before then
      raise exception '${TAG}: the Kpopdle source would go from % to % entities, nothing written', v_dle_before, v_dle_after;
    end if;
    raise notice '${TAG}: Kpopdle source % entities before and after (no row of this file enters Kpopdle)', v_dle_after;
  end if;
end $i099b$;
`;
  const rollback = `-- 099b-idols-returning.rollback.sql (undo of 099b-idols-returning.sql)
--
-- What:   deletes the public.idols rows 099b can have inserted: same group slug, same name, same wikidata_qid, and a review_reason starting
--         with '${TAG}' (all four must match, so a row that existed before 099b is never touched).
-- Refuses: while a player owns a card of one of these groups, or has opened a pack.
-- Verify: select count(*) from public.idols where review_reason like '${TAG}%';   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $i099br$
declare
  v_data constant jsonb := $members$${literal}$members$;
  v_deleted int;
begin
  perform set_config('lock_timeout', '5s', true);
  if to_regclass('public.idols') is null then
    return;
  end if;
  -- nested: PL/pgSQL plans a condition whole, so a table is named only once it is known to exist
  if to_regclass('public.cards_owned') is not null and to_regclass('public.cards_catalog') is not null then
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no
                where c.entity_id in (select 'group:' || x from unnest(array[${slugs}]) x)) then
      raise exception '${TAG} rollback: a player owns a card of one of these groups';
    end if;
  end if;
  if to_regclass('public.cards_packs') is not null then
    if exists (select 1 from public.cards_packs) then
      raise exception '${TAG} rollback: a pack was opened';
    end if;
  end if;
  delete from public.idols i
   using public.groups g, jsonb_array_elements(v_data) s, jsonb_array_elements(s.value->'members') m
   where g.id = i.group_id and g.slug = s.value->>'slug' and i.name = m.value->>'name' and i.wikidata_qid = m.value->>'qid'
     and i.review_reason like '${TAG}%';
  get diagnostics v_deleted = row_count;
  raise notice '${TAG} rollback: % rows deleted', v_deleted;
end $i099br$;
`;
  for (const t of [sql, rollback]) if (/[\u2013\u2014]/.test(t)) throw new Error('dash character in generated text');
  return { sql, rollback };
}
