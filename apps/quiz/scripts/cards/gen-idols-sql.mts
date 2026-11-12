// Bunnyverse Cards lot 2, research lane: writes docs/pending-migrations/cards/099-idols-members.sql and its rollback.
//
// Input: a LOCAL lineups file (never in the repository: it holds birth dates), given as the first argument, no default:
//   tsx scripts/cards/gen-idols-sql.mts /Users/louis/kpq-o1/notes/cards-lot2/lineups.json
// Only the subjects whose verdict in docs/design/cards/data/age-check.json is ok are written (scripts/cards/age-check.mts applies the rule,
// once, for 099 and 102 alike). A subject that fails the rule gets no row in the SQL and none of its people appear in any committed file.
// Only the CURRENT members of an included subject are written, with a birth date only when the two sources agree on a full day. A person
// subject gets a row only when it is one of the ten soloists the integrator named (the other eight people of the run are members of
// another group, whose idols row already carries them). No network, no database.
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AGE_JSON, type AgeCheckFile } from './age-check.mts';

type Precision = 'day' | 'month' | 'year' | null;
type Person = {
  qid: string | null;
  name: string;
  birth_date: string | null;
  birth_precision: Precision;
  joined: string | null;
  joined_precision: Precision;
  left: string | null;
  left_precision: Precision;
  current: boolean;
  agree: boolean;
  note?: string;
};
type Lineup = {
  slug: string;
  kind: 'idol' | 'group';
  name: string;
  photo_date: string;
  qid: string | null;
  wikipedia: string | null;
  lineup_complete: boolean;
  people: Person[];
  note?: string;
};

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const OUT = path.join(REPO, 'docs/pending-migrations/cards');

const input = process.argv[2];
if (!input) {
  console.error('usage: tsx scripts/cards/gen-idols-sql.mts <path to the local lineups.json>');
  process.exit(2);
}
const lineups = JSON.parse(readFileSync(input, 'utf8')) as Lineup[];
const ages = JSON.parse(readFileSync(AGE_JSON, 'utf8')) as AgeCheckFile;
const verdict = new Map(ages.subjects.map((a) => [a.slug, a]));
const today = ages.checked_on;
/** The soloists of the 36 subjects without an idols row (integrator brief, 2026-11-12, point 1). */
const SOLOISTS = new Set(['iu', 'psy', 'sunmi', 'zico', 'chungha', 'heize', 'hyuna', 'jay-park', 'jeon-somi', 'bibi']);
/** Disbanded groups (English Wikipedia: miss A and SISTAR in 2017): no current member, so nothing to add as active (the brief asks for the
 *  current members). Without active idols rows 102 leaves them out (no_active_member); their place in the catalog is the integrator's call. */
const DISBANDED = new Set(['miss-a', 'sistar', 'purple-kiss', 'loossemble']);

type Row = { slug: string; kind: 'idol' | 'group'; members: { name: string; qid: string; birth_date: string | null; ord: number }[] };
const rows: Row[] = [];
for (const l of lineups) {
  // The verdict of age-check.json (the integrator's rule, age-rule.ts): every person of the photo 18 or older today and on its date.
  const v = verdict.get(l.slug);
  if (!v) throw new Error(`${l.slug}: no verdict in age-check.json (run age-check.mts first)`);
  if (!v.ok) {
    console.log(`out: ${l.slug} (${v.reason})`);
    continue;
  }
  if (DISBANDED.has(l.slug)) {
    console.log(`skipped: ${l.slug} (disbanded, no current member)`);
    continue;
  }
  if (l.kind === 'idol' && !SOLOISTS.has(l.slug)) {
    console.log(`skipped: ${l.slug} (a member of another group, already in idols there)`);
    continue;
  }
  const current = l.people.filter((p) => p.current);
  if (current.length === 0) continue;
  if (current.some((p) => !p.qid)) throw new Error(`${l.slug}: a current member has no wikidata id`);
  rows.push({
    slug: l.slug,
    kind: l.kind,
    members: current.map((p, i) => ({
      // a soloist keeps the subject's own name, so 101-catalog.sql finds the row by the name of the groups row
      name: l.kind === 'idol' ? l.name : p.name,
      qid: p.qid as string,
      birth_date: p.agree && p.birth_precision === 'day' && p.birth_date ? p.birth_date : null,
      ord: i + 1,
    })),
  });
}

const people = rows.reduce((n, r) => n + r.members.length, 0);
const slugList = rows.map((r) => `'${r.slug}'`).join(', ');
const TAG = '099-idols-members';

const literal = `[\n${rows.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n]`;
const plain = (s: string) => {
  if (/[–—]/.test(s)) throw new Error('dash character in generated text');
  return s;
};

const sql = `-- 099-idols-members.sql (Bunnyverse Cards lot 2, research lane, ${today}; the members of the card subjects that have none)
--
-- What:   adds the current members of ${rows.length} card subjects to public.idols, for the subjects whose groups row has no active idols row yet.
--         ${people} people in all. Only subjects that passed the age rule are here: every person of the photo is 18 or older today and was
--         18 or older on the photo date, from Wikidata and English Wikipedia (docs/design/cards/data/age-check.json, checked on ${today}; a
--         birth date held by one source only leaves a subject out, two agreeing sources are needed to keep it).
-- How:    one jsonb literal below (slug, kind, members). For each subject: the public.groups row by slug (none: a notice, skip);
--         ONLY when that group has zero active idols rows, its members are inserted (group_id, name, birth_date, wikidata_qid, active, ord)
--         with on conflict (group_id, name) do nothing. A soloist gets one row in its own groups row the same way, and nothing when an
--         active idols row of the same name already exists in another group (that row is the person). birth_date is only filled when both
--         sources agree on the full day, else it stays null. Inserted rows carry review_reason '${TAG}' (needs_review stays false), so the
--         rollback removes only what this file wrote. Existing rows are never updated or deleted.
-- Why:    36 of the 59 card subjects had no active idols row, so 101-catalog.sql left them out (integrator brief 2026-11-12, point 1). The age
--         rule of point 2 applies to them too: only those that pass it are here.
-- Rows:   at most ${people} rows in public.idols. The real count is the notice "099-idols-members: N rows added" (Messages tab).
-- Needs:  the tables public.groups and public.idols (supabase/migrations/124_verse_entity_foundation.sql). Run it just before 102-catalog-rebuild.sql.
-- Verify: select count(*) from public.idols where review_reason = '${TAG}';   expect the "N rows added" notice
-- Verify: select g.slug, count(*) from public.idols i join public.groups g on g.id = i.group_id where i.review_reason = '${TAG}' group by g.slug order by g.slug;   expect one line per subject with an "added" notice
-- Verify: select count(*) from public.idols where review_reason = '${TAG}' and (not active or needs_review);   expect 0
-- Refuses: when public.groups or public.idols is missing.
-- Undo:   099-idols-members.rollback.sql (refused while a player owns a card of one of these subjects).
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run adds nothing.

do $i099$
declare
  v_data constant jsonb := $members$${literal}$members$;
  s jsonb;
  m jsonb;
  g record;
  v_slug text;
  v_kind text;
  v_added int;
  v_total int := 0;
  v_subjects int := 0;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.groups') is null or to_regclass('public.idols') is null then
    raise exception '099-idols-members: public.groups or public.idols is missing';
  end if;

  for s in select value from jsonb_array_elements(v_data) loop
    v_slug := s->>'slug';
    v_kind := s->>'kind';
    select gr.id, gr.name into g from public.groups gr where gr.slug = v_slug;
    if g.id is null then
      raise notice '099-idols-members: % skipped, no groups row', v_slug;
      continue;
    end if;
    if exists (select 1 from public.idols x where x.group_id = g.id and x.active) then
      raise notice '099-idols-members: % skipped, the group has active members already', v_slug;
      continue;
    end if;
    if v_kind = 'idol' and exists (
      select 1 from public.idols x
       where x.active and x.group_id <> g.id
         and (lower(btrim(x.name)) = lower(btrim(s->'members'->0->>'name'))
              or x.wikidata_qid = s->'members'->0->>'qid')
    ) then
      raise notice '099-idols-members: % skipped, the person is an active member of another group already', v_slug;
      continue;
    end if;

    v_added := 0;
    for m in select value from jsonb_array_elements(s->'members') loop
      insert into public.idols (group_id, name, birth_date, wikidata_qid, active, ord, needs_review, review_reason)
      values (g.id, m->>'name', nullif(m->>'birth_date', '')::date, m->>'qid', true, (m->>'ord')::int, false, '${TAG}')
      on conflict (group_id, name) do nothing;
      if found then
        v_added := v_added + 1;
      end if;
    end loop;
    v_total := v_total + v_added;
    v_subjects := v_subjects + 1;
    raise notice '099-idols-members: % added % rows', v_slug, v_added;
  end loop;

  raise notice '099-idols-members: % rows added in % subjects', v_total, v_subjects;
end $i099$;
`;

const rollback = `-- 099-idols-members.rollback.sql (undo of 099-idols-members.sql)
--
-- What:   deletes the public.idols rows 099 can have inserted: same group slug, same name, same wikidata_qid, and review_reason '${TAG}'
--         (all four must match, so a row that existed before 099 is never touched).
-- Refuses: while a player owns a card (cards_owned) of one of these subjects, or has opened a pack: that would destroy a collection.
--         Undo 102-catalog-rebuild.rollback.sql first when the catalog was built on these rows.
-- Verify: select count(*) from public.idols where review_reason = '${TAG}';   expect 0
-- o1-transaction: single, ONE DO block. Idempotent.

do $i099r$
declare
  v_data constant jsonb := $members$${literal}$members$;
  v_slugs constant text[] := array[${slugList}];
  v_ents text[];
  v_deleted int;
begin
  perform set_config('lock_timeout', '5s', true);
  perform set_config('client_min_messages', 'notice', true);

  if to_regclass('public.idols') is null or to_regclass('public.groups') is null then
    return;
  end if;
  if to_regclass('public.cards_catalog') is not null and to_regclass('public.cards_owned') is not null then
    select coalesce(array_agg(x), '{}') into v_ents from (
      select 'idol:' || s as x from unnest(v_slugs) s union all select 'group:' || s from unnest(v_slugs) s) u;
    if exists (select 1 from public.cards_owned o join public.cards_catalog c on c.card_no = o.card_no where c.entity_id = any (v_ents)) then
      raise exception '099-idols-members rollback: a player owns a card of one of these subjects';
    end if;
  end if;
  if to_regclass('public.cards_packs') is not null and exists (select 1 from public.cards_packs) then
    raise exception '099-idols-members rollback: a pack was opened';
  end if;

  delete from public.idols i
   using public.groups g, jsonb_array_elements(v_data) s, jsonb_array_elements(s.value->'members') m
   where g.slug = s.value->>'slug'
     and i.group_id = g.id
     and i.name = m.value->>'name'
     and i.wikidata_qid = m.value->>'qid'
     and i.review_reason = '${TAG}';
  get diagnostics v_deleted = row_count;
  raise notice '099-idols-members rollback: % rows deleted', v_deleted;
end $i099r$;
`;

writeFileSync(path.join(OUT, '099-idols-members.sql'), plain(sql));
writeFileSync(path.join(OUT, '099-idols-members.rollback.sql'), plain(rollback));
console.log(`099-idols-members: ${rows.length} subjects, ${people} people`);
