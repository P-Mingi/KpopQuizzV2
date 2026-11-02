#!/usr/bin/env node
// Lot K2, step 3 of 3: write the SQL from data/k2-idols.json (offline).
//   node scripts/kpop/k2/k2-sql.mjs
// Writes docs/pending-migrations/multisite/021d-k2-idols.sql and its rollback, docs/launch/o1/checks/V-K2.sql and the rehearsal fixture
// docs/launch/o1/K2-rehearsal-fixture.sql. Nothing here touches a database.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { clean } from './lib.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const data = JSON.parse(await readFile(path.join(HERE, 'data/k2-idols.json'), 'utf8'));
const FETCHED = '2026-11-02 12:00:00+00';
const q = (s) => (s == null ? 'null' : `'${clean(String(s)).replace(/'/g, "''")}'`);
const arr = (a) => `array[${a.map(q).join(', ')}]::text[]`;
const idols = data.idols;
const groups = data.groups.filter((g) => idols.some((i) => i.group_slug === g.slug));
const act = data.activate_021b.filter((r) => r.ok);
const held = data.activate_021b.filter((r) => !r.ok);
const N = idols.length, M = act.length, G = groups.length;
const slugs = groups.map((g) => g.slug);
const otherRows = idols.flatMap((i) => (i.other_groups ?? []).map((s) => ({ qid: i.wikidata_qid, slug: s })));
const E = otherRows.length;
const otherSlugs = [...new Set(otherRows.map((o) => o.slug))];
const otherPersons = new Set(otherRows.map((o) => o.qid)).size;
const byGroup = Object.fromEntries(groups.map((g) => [g.slug, idols.filter((i) => i.group_slug === g.slug).length]));

const groupRows = groups.map((g) => `  (${q(g.slug)}, ${q(g.record_label)}, ${q(g.generation)}, ${g.inception_date ? `date ${q(g.inception_date)}` : 'null::date'})`).join(',\n');
const idolRows = idols.map((i) => `  (${q(i.group_slug)}, ${q(i.name)}, ${q(i.name_romanized)}, ${q(i.name_hangul)}, date ${q(i.birth_date)}, ${q(i.nationality)}, ${q(i.gender)}, ${i.debut_year}, ${arr(i.positions)}, ${q(i.wikidata_qid)}, ${i.ord})`).join(',\n');
const sourceRows = [];
for (const i of idols) {
  sourceRows.push(`  (${q(i.wikidata_qid)}, 'wikidata_qid', 'wikidata', ${q(i.wikidata_qid)})`);
  for (const [field, list] of Object.entries(i.sources)) for (const s of list) sourceRows.push(`  (${q(i.wikidata_qid)}, ${q(field)}, ${q(s.source)}, ${q(s.ref)})`);
}
const actRows = act.map((r) => `  (${r.id}, ${q(r.qid)})`).join(',\n');
const perGroupText = groups.map((g) => `${g.slug} ${byGroup[g.slug]}`).join(', ');

const header = `-- 021d-k2-idols.sql (lot K2, idols for Kpopdle Idol, owner brief of 2026-11-02; change request CR-022)
--
-- What:   (a) inserts ${N} new idol rows in ${G} groups that have no idol row today (${perGroupText}), active and reviewed
--             (active true, needs_review false), each with name, romanized and Hangul names, birth date, nationality, gender, debut year,
--             positions (Leader, Maknae), its Wikidata QID and origin 'wikidata'; one public.entity_sources row per stored fact and source
--             (fields wikidata_qid, birth_date, gender, nationality, debut_year; sources wikidata with the QID, musicbrainz with the artist
--             MBID or, for a group's first release, the release group MBID), like 021a and 021c. Only members the English Wikipedia lists as
--             current, whom Wikidata and MusicBrainz do not contradict, and whose birth date, gender and debut year two sources agree on.
--             Members of more than one group (${otherPersons} people: LOONA members who are now in ARTMS or Loossemble, as English Wikipedia lists them)
--             keep one row, in their first group; ${E} rows of public.idol_other_groups (created in 020) give the game's group cell their other
--             group (${otherSlugs.join(', ')}), so a guess of one of them is right or near by the engine's set rules, never a second idol.
--         (b) fills, on these ${G} groups only and only where the column is empty, groups.record_label (the main agency; an existing spelling
--             of the same label in another group is reused), groups.generation (the published rule on the debut year) and groups.inception_date
--             (a full date only when its year is the agreed debut year): the view dle_src_kpop_idol needs an agency and a generation.
--         (c) activates the ${M} idols of the 021b list that the owner marked "yes without reservation" and that today's sources still back
--             (K1 table, POUR-LE-PROPRIETAIRE.md section 2, empty "Douteux" column): ids ${act.map((r) => r.id).join(', ')}; same update as 021b.
--${held.length ? `\n--         Held back, not in this file (a source disagrees today): ${held.map((r) => `${r.id} ${clean(r.name)}`).join(', ')}.\n--` : ''}
--         Adults only, three times: the precheck refuses the whole file when a listed birth date is under 18 on the day it runs, the insert
--         and the activation filter on the cutoff, and the self-check fails when any active idol is under 18 or has no birth date.
--         Guarded, the whole file refused with nothing changed, when: a target group is missing or is not listed once; a target group already
--         holds an idol row this file does not know (it must be empty or hold only these rows); a listed QID sits on a row of another group;
--         a listed 021b id is unknown, carries another QID, is detached, is switched off on purpose (inactive and not waiting for review) or
--         is under 18; columns idols.gender and idols.debut_year are missing (021a not applied).
--         Idempotent: a second run inserts and updates nothing.
-- Why:    the owner wants 200 active, adult, complete, double-checked idols in Kpopdle Idol on launch day (150 at the very least); 112 were
--         in the pool. These idols also appear on the kpopquiz.org group pages and the member counts: that is wanted (owner, 2026-11-02).
-- Rows:   up to ${N} idols, ${sourceRows.length} entity_sources, ${E} idol_other_groups, ${G} group rows (empty columns only), ${M} activations.
-- Needs:  020 (view and table idol_other_groups), 021a (columns), 021c, 021b, and session G done. Run in its own small session: bash docs/launch/o1/session.sh K2,
--         after the backup line of the session (OWNER-NOW.md).
-- Verify: docs/launch/o1/checks/V-K2.sql (session.sh K2 runs it); the pool: select count(*) from public.dle_src_kpop_idol;
-- Undo:   021d-k2-idols.rollback.sql (refused while the game kpopdle-idol is active).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.
`;

const sql = `${header}
set lock_timeout = '5s';
set client_min_messages = warning;

do $$
begin
  if to_regclass('public.idols') is null or to_regclass('public.groups') is null or to_regclass('public.entity_sources') is null then
    raise exception '021d-k2-idols: public.idols, public.groups or public.entity_sources is missing';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year')) <> 2 then
    raise exception '021d-k2-idols: idols.gender or idols.debut_year is missing (apply 021a first)';
  end if;
  if to_regclass('public.idol_other_groups') is null then
    raise exception '021d-k2-idols: public.idol_other_groups is missing (020-dle-kpop-idol.sql creates it: apply 020 first)';
  end if;
end $$;

drop table if exists pg_temp.k2_before, pg_temp.k2_groups, pg_temp.k2_idols, pg_temp.k2_sources, pg_temp.k2_activate;
create temp table k2_before as select count(*) filter (where active) as active_n, count(*) as idol_n from public.idols;

create temp table k2_groups (slug text primary key, record_label text, generation text, inception_date date);
insert into k2_groups (slug, record_label, generation, inception_date) values
${groupRows};

create temp table k2_idols (group_slug text not null, name text not null, name_romanized text, name_hangul text, birth_date date not null, nationality text not null,
  gender text not null, debut_year integer not null, positions text[] not null, qid text primary key, ord integer not null, unique (group_slug, name));
insert into k2_idols (group_slug, name, name_romanized, name_hangul, birth_date, nationality, gender, debut_year, positions, qid, ord) values
${idolRows};

create temp table k2_sources (qid text not null, field text not null, source text not null, source_ref text not null);
insert into k2_sources (qid, field, source, source_ref) values
${sourceRows.join(',\n')};

create temp table k2_activate (id integer primary key, qid text not null);
insert into k2_activate (id, qid) values
${actRows};

create temp table k2_other (qid text not null, group_slug text not null, primary key (qid, group_slug));
${E ? `insert into k2_other (qid, group_slug) values\n${otherRows.map((o) => `  (${q(o.qid)}, ${q(o.slug)})`).join(',\n')};` : ''}

-- From here the file reports what it refuses or does.
set client_min_messages = notice;

-- 1. Precheck: nothing is written until every line below passes.
do $$
declare
  bad text;
begin
  select string_agg(k.name || ' (' || k.group_slug || ')', ', ' order by k.group_slug, k.name) into bad from k2_idols k where k.birth_date > (current_date - interval '18 years')::date;
  if bad is not null then
    raise exception '021d-k2-idols refused: under 18 on the day of the run: % (a minor is never inserted)', bad;
  end if;
  select string_agg(k.slug, ', ' order by k.slug) into bad from k2_groups k where (select count(*) from public.groups g where g.slug = k.slug) <> 1;
  if bad is not null then
    raise exception '021d-k2-idols refused: target group(s) missing or not unique: %', bad;
  end if;
  select string_agg(g.slug || ' (' || x.n || ' row(s))', ', ' order by g.slug) into bad
  from k2_groups k join public.groups g on g.slug = k.slug
  join lateral (select count(*) as n from public.idols i where i.group_id = g.id
    and not exists (select 1 from k2_idols z where z.group_slug = k.slug and z.name = i.name and z.qid = i.wikidata_qid)) x on x.n > 0;
  if bad is not null then
    raise exception '021d-k2-idols refused: target group(s) already hold idol rows this file does not know: % (the groups must have no idol row, or only these rows)', bad;
  end if;
  select string_agg(k.name || ' ' || k.qid, ', ' order by k.qid) into bad
  from k2_idols k join public.idols i on i.wikidata_qid = k.qid
  join public.groups g on g.id = i.group_id and g.slug <> k.group_slug;
  if bad is not null then
    raise exception '021d-k2-idols refused: QID already on a row of another group: %', bad;
  end if;
  select string_agg(distinct o.group_slug, ', ') into bad from k2_other o where (select count(*) from public.groups g where g.slug = o.group_slug) <> 1;
  if bad is not null then
    raise exception '021d-k2-idols refused: other group(s) of a member missing or not unique: %', bad;
  end if;
  select string_agg(o.qid, ', ') into bad from k2_other o join k2_idols k on k.qid = o.qid where k.group_slug = o.group_slug;
  if bad is not null then
    raise exception '021d-k2-idols refused: an idol lists its own group as an other group: %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a where not exists (select 1 from public.idols i where i.id = a.id);
  if bad is not null then
    raise exception '021d-k2-idols refused: unknown idol id(s) to activate: %', bad;
  end if;
  select string_agg(format('%s (list %s, row %s)', a.id, a.qid, coalesce(i.wikidata_qid, 'none')), ', ' order by a.id) into bad
  from k2_activate a join public.idols i on i.id = a.id where i.wikidata_qid is distinct from a.qid;
  if bad is not null then
    raise exception '021d-k2-idols refused: the QID differs for %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a join public.idols i on i.id = a.id where i.detached_at is not null;
  if bad is not null then
    raise exception '021d-k2-idols refused: detached idol(s) %', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a join public.idols i on i.id = a.id where not i.active and not i.needs_review;
  if bad is not null then
    raise exception '021d-k2-idols refused: idol(s) % are inactive and not waiting for review (switched off on purpose)', bad;
  end if;
  select string_agg(format('%s %s', a.id, i.name), ', ' order by a.id) into bad
  from k2_activate a join public.idols i on i.id = a.id where i.birth_date is null or i.birth_date > (current_date - interval '18 years')::date;
  if bad is not null then
    raise exception '021d-k2-idols refused: to activate but under 18 or without a birth date: % (a minor is never active)', bad;
  end if;
  select string_agg(a.id::text, ', ' order by a.id) into bad from k2_activate a join k2_idols k on k.qid = a.qid;
  if bad is not null then
    raise exception '021d-k2-idols refused: the same person is in the new rows and in the activation list: %', bad;
  end if;
  select string_agg(format('%s (same QID as active row %s)', a.id, o.id), ', ' order by a.id) into bad
  from k2_activate a join public.idols i on i.id = a.id join public.idols o on o.wikidata_qid = i.wikidata_qid and o.id <> i.id and o.active;
  if bad is not null then
    raise notice '021d-k2-idols: idol(s) to activate already active on another row: %', bad;
  end if;
end $$;

-- 2. The group rows: only empty columns (an existing value is never overwritten).
do $$
declare
  n_label integer;
  n_gen integer;
  n_inc integer;
begin
  update public.groups g
  set record_label = coalesce((select x.record_label from public.groups x where x.id <> g.id and lower(btrim(x.record_label)) = lower(k.record_label) limit 1), k.record_label)
  from k2_groups k
  where g.slug = k.slug and nullif(btrim(g.record_label), '') is null and k.record_label is not null;
  get diagnostics n_label = row_count;
  update public.groups g set generation = k.generation
  from k2_groups k
  where g.slug = k.slug and nullif(btrim(g.generation), '') is null and k.generation is not null;
  get diagnostics n_gen = row_count;
  update public.groups g set inception_date = k.inception_date
  from k2_groups k
  where g.slug = k.slug and g.inception_date is null and k.inception_date is not null;
  get diagnostics n_inc = row_count;
  raise notice '021d-k2-idols: group rows filled where empty: % record_label, % generation, % inception_date', n_label, n_gen, n_inc;
end $$;

-- 3. The new idols (adults only).
do $$
declare
  n integer;
begin
  insert into public.idols (group_id, name, name_romanized, name_hangul, birth_date, nationality, positions, wikidata_qid, active, ord, needs_review, review_reason, origin, gender, debut_year)
  select g.id, k.name, k.name_romanized, k.name_hangul, k.birth_date, k.nationality, k.positions, k.qid, true, k.ord, false, null, 'wikidata', k.gender, k.debut_year
  from k2_idols k join public.groups g on g.slug = k.group_slug
  where k.birth_date <= (current_date - interval '18 years')::date
  on conflict (group_id, name) do nothing;
  get diagnostics n = row_count;
  raise notice '021d-k2-idols: % new idol row(s) inserted', n;
end $$;

-- 4. One source row per stored fact and source; only when the row holds exactly the sourced value.
insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, fetched_at)
select 'idol', i.id::text, s.field, s.source, s.source_ref, timestamptz '${FETCHED}'
from k2_sources s
join k2_idols k on k.qid = s.qid
join public.groups g on g.slug = k.group_slug
join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
where s.field = 'wikidata_qid'
  or (s.field = 'birth_date' and i.birth_date = k.birth_date)
  or (s.field = 'gender' and i.gender = k.gender)
  or (s.field = 'nationality' and i.nationality = k.nationality)
  or (s.field = 'debut_year' and i.debut_year = k.debut_year)
on conflict (entity_type, entity_id, field, source) do nothing;

-- 4b. The other groups of the members who are in more than one (game only; the idol row stays in its first group).
insert into public.idol_other_groups (idol_id, group_id)
select i.id, g2.id
from k2_other o
join k2_idols k on k.qid = o.qid
join public.groups g on g.slug = k.group_slug
join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
join public.groups g2 on g2.slug = o.group_slug
on conflict (idol_id, group_id) do nothing;

-- 5. The unreserved yes of 021b: same update as 021b (what the admin "confirm" action does).
do $$
declare
  n integer;
begin
  update public.idols i
  set active = true, needs_review = false, review_reason = null, updated_at = now()
  from k2_activate a
  where i.id = a.id and i.wikidata_qid = a.qid and (not i.active or i.needs_review)
    and i.birth_date <= (current_date - interval '18 years')::date;
  get diagnostics n = row_count;
  raise notice '021d-k2-idols: % idol(s) activated from the 021b list', n;
end $$;

-- 6. Self-check.
do $$
declare
  n bigint;
begin
  select count(*) into n from k2_idols k join public.groups g on g.slug = k.group_slug
    join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
    where i.active and not i.needs_review and i.detached_at is null and i.gender = k.gender and i.debut_year = k.debut_year
      and i.birth_date = k.birth_date and i.nationality = k.nationality;
  if n <> (select count(*) from k2_idols) then
    raise exception '021d-k2-idols: % of % new idols are in place, active and reviewed', n, (select count(*) from k2_idols);
  end if;
  select count(*) into n from k2_activate a join public.idols i on i.id = a.id where not (i.active and not i.needs_review);
  if n > 0 then
    raise exception '021d-k2-idols: % listed idol(s) are not active after the update', n;
  end if;
  select count(*) into n from k2_other o
    join k2_idols k on k.qid = o.qid join public.groups g on g.slug = k.group_slug
    join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
    join public.groups g2 on g2.slug = o.group_slug
    where not exists (select 1 from public.idol_other_groups x where x.idol_id = i.id and x.group_id = g2.id);
  if n > 0 then
    raise exception '021d-k2-idols: % other-group link(s) are missing', n;
  end if;
  select count(*) into n from k2_idols k join public.groups g on g.slug = k.group_slug
    join public.idols i on i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid
    where not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'birth_date')
       or not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'gender')
       or not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'debut_year')
       or not exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'nationality');
  if n > 0 then
    raise exception '021d-k2-idols: % new idol(s) lack a source row for a stored fact', n;
  end if;
  select count(*) into n from public.idols where active and (birth_date is null or birth_date > (current_date - interval '18 years')::date)
    and wikidata_qid in (select qid from k2_idols union select qid from k2_activate);
  if n > 0 then
    raise exception '021d-k2-idols: % active idol(s) of this file are under 18 or without a birth date', n;
  end if;
  select count(*) into n from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if n > 0 then
    raise exception '021d-k2-idols: % active idol(s) are under 18', n;
  end if;
  raise notice '021d-k2-idols: % active idol(s) before, % now', (select active_n from k2_before), (select count(*) filter (where active) from public.idols);
end $$;

drop table if exists pg_temp.k2_before, pg_temp.k2_groups, pg_temp.k2_idols, pg_temp.k2_sources, pg_temp.k2_activate;

notify pgrst, 'reload schema';
`;

const rollback = `-- 021d-k2-idols.rollback.sql (lot K2): undo of 021d-k2-idols.sql.
--
-- What:   deletes the ${N} idol rows 021d inserted (matched by group slug, name AND QID, so a row someone changed is never touched) and
--         every entity_sources row of those idols (their idol_other_groups rows go with them, on delete cascade); puts the ${M} idols 021d activated back in the review queue (active false, needs_review
--         true, review_reason = the text they had before K1: "Wikidata lists this member but not in our name-all roster; confirm before
--         activating."). The group rows 021d filled (record_label, generation, inception_date, empty columns only) are left as they are:
--         the values are correct facts of the group and nothing can tell afterwards which of them were empty before.
--         Refused, with nothing changed, while the game kpopdle-idol is active (taking idols out of a live pool is a decision for the owner)
--         and when a listed id carries another QID.
-- Why:    the rollback of the K2 session.
-- Rows:   up to ${N} idols, their entity_sources, ${M} activations undone.
-- Verify: select count(*) from public.idols where wikidata_qid in (<the K2 QIDs>);   expect 0
-- Undo:   021d-k2-idols.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

drop table if exists pg_temp.k2_idols, pg_temp.k2_activate;
create temp table k2_idols (group_slug text not null, name text not null, qid text primary key);
insert into k2_idols (group_slug, name, qid) values
${idols.map((i) => `  (${q(i.group_slug)}, ${q(i.name)}, ${q(i.wikidata_qid)})`).join(',\n')};
create temp table k2_activate (id integer primary key, qid text not null);
insert into k2_activate (id, qid) values
${actRows};

set client_min_messages = notice;

do $$
declare
  bad text;
  live boolean := false;
begin
  if to_regclass('public.dle_games') is not null then
    execute 'select exists (select 1 from public.dle_games where id = ''kpopdle-idol'' and active)' into live;
  end if;
  if live then
    raise exception '021d-k2-idols rollback refused: the game kpopdle-idol is active (switch it off first)';
  end if;
  select string_agg(format('%s (list %s, row %s)', a.id, a.qid, coalesce(i.wikidata_qid, 'none')), ', ' order by a.id) into bad
  from k2_activate a left join public.idols i on i.id = a.id where i.id is null or i.wikidata_qid is distinct from a.qid;
  if bad is not null then
    raise exception '021d-k2-idols rollback refused: unknown id or other QID for %', bad;
  end if;
end $$;

delete from public.entity_sources e
using public.idols i, k2_idols k, public.groups g
where e.entity_type = 'idol' and e.entity_id = i.id::text
  and g.slug = k.group_slug and i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid;

delete from public.idols i
using k2_idols k, public.groups g
where g.slug = k.group_slug and i.group_id = g.id and i.name = k.name and i.wikidata_qid = k.qid;

update public.idols i
set active = false, needs_review = true,
  review_reason = 'Wikidata lists this member but not in our name-all roster; confirm before activating.', updated_at = now()
from k2_activate a
where i.id = a.id and i.wikidata_qid = a.qid and (i.active or not i.needs_review);

do $$
declare
  n bigint;
begin
  select count(*) into n from public.idols i join k2_idols k on k.qid = i.wikidata_qid;
  if n > 0 then
    raise exception '021d-k2-idols rollback: % K2 idol row(s) are still there', n;
  end if;
  select count(*) into n from k2_activate a join public.idols i on i.id = a.id where i.active;
  if n > 0 then
    raise exception '021d-k2-idols rollback: % listed idol(s) are still active', n;
  end if;
end $$;

drop table if exists pg_temp.k2_idols, pg_temp.k2_activate;

notify pgrst, 'reload schema';
`;

const qidList = idols.map((i) => `(${q(i.group_slug)}, ${q(i.wikidata_qid)})`).join(', ');
const check = `-- V-K2 (run O1, session.sh): after 021d-k2-idols.sql, lot K2 (new idols of the groups with none, and the unreserved yes of 021b).
-- Read only, in a read-only transaction. Each row is: ok or KO | what | the number found. Never a name, an e-mail or a row of a person.
-- Expected numbers come from scripts/kpop/k2/data/k2-idols.json: ${N} new idols in ${G} groups, ${M} activations.
begin transaction read only;
with k(group_slug, qid) as (values ${qidList}
), act(id, qid) as (values ${act.map((r) => `(${r.id}, ${q(r.qid)})`).join(', ')}
), mine as (
  select i.* from k join public.groups g on g.slug = k.group_slug join public.idols i on i.group_id = g.id and i.wikidata_qid = k.qid
), cap as (
  select s.*, (select count(*) from public.dle_attributes a where a.game_id = 'kpopdle-idol' and coalesce(cardinality(public.dle_values(s.attrs -> a.key -> 'v')), 0) = 0) as missing
  from public.dle_src_kpop_idol s
)
select case when ok is true then 'ok' else 'KO' end, what, coalesce(got, '-') from (values
  (1, 'idols K2 présentes : ${N}', (select count(*) = ${N} from mine), (select count(*)::text from mine)),
  (2, 'idols K2 actives et relues : ${N}', (select count(*) = ${N} from mine where active and not needs_review and detached_at is null), (select count(*)::text from mine where active and not needs_review and detached_at is null)),
  (3, 'idols K2 complètes (naissance, genre, début, nationalité) : ${N}', (select count(*) = ${N} from mine where birth_date is not null and gender in ('female', 'male') and debut_year is not null and nullif(btrim(nationality), '') is not null), (select count(*)::text from mine where birth_date is not null and gender in ('female', 'male') and debut_year is not null and nullif(btrim(nationality), '') is not null)),
  (4, 'idols K2 sans source de naissance, genre, début ou nationalité : 0', (select count(*) = 0 from mine m where not (exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'birth_date') and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'gender') and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'debut_year') and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'nationality'))), (select count(*)::text from mine m where not (exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'birth_date') and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'gender') and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'debut_year') and exists (select 1 from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = m.id::text and e.field = 'nationality')))),
  (5, 'mineurs ou sans date de naissance parmi les idols actives : 0', (select count(*) = 0 from public.idols where active and (birth_date is null or birth_date > current_date - interval '18 years')), (select count(*)::text from public.idols where active and (birth_date is null or birth_date > current_date - interval '18 years'))),
  (6, 'idols de 021b activées : ${M}', (select count(*) = ${M} from act a join public.idols i on i.id = a.id and i.wikidata_qid = a.qid where i.active and not i.needs_review), (select count(*)::text from act a join public.idols i on i.id = a.id and i.wikidata_qid = a.qid where i.active and not i.needs_review)),
  (7, 'groupes K2 avec une agence et une génération : ${G}', (select count(*) = ${G} from public.groups g where g.slug in (${slugs.map(q).join(', ')}) and nullif(btrim(g.record_label), '') is not null and nullif(btrim(g.generation), '') is not null), (select count(*)::text from public.groups g where g.slug in (${slugs.map(q).join(', ')}) and nullif(btrim(g.record_label), '') is not null and nullif(btrim(g.generation), '') is not null)),
  (10, 'groupes supplémentaires des membres de plusieurs groupes : ${E}', (select count(*) = ${E} from public.idol_other_groups x join mine m on m.id = x.idol_id), (select count(*)::text from public.idol_other_groups x join mine m on m.id = x.idol_id)),
  (8, 'idols K2 prêtes comme cible dans la vue du jeu : ${N}', (select count(*) = ${N} from cap c join mine m on m.id::text = c.entity_id where c.missing = 0), (select count(*)::text from cap c join mine m on m.id::text = c.entity_id where c.missing = 0)),
  (9, 'idols assez complètes pour être cible, au total (information)', true, (select count(*)::text from cap where missing = 0))
) as c(n, what, ok, got) order by n;
rollback;
`;

// Rehearsal fixture: what production holds that 021d needs (the ${G} groups without idols, the five groups of the 021b rows and those
// ${M + held.length} rows as 021a/021c leave them). Synthetic values, only for the local rehearsal (session-rehearsal.sh).
const yesGroups = { 'NCT (group)': ['NCT', 'nct', 'SM Entertainment'], 'Kep1er': ['Kep1er', 'kep1er', 'Wake One'], 'Babymonster': ['BABYMONSTER', 'babymonster', 'YG Entertainment'], 'Riize': ['RIIZE', 'riize', 'SM Entertainment'], 'Fifty Fifty (group)': ['FIFTY FIFTY', 'fifty-fifty', 'Attrakt'] };
const yesRows = data.activate_021b.map((r) => ({ ...r }));
const fixture = `-- K2-rehearsal-fixture.sql: rows that production holds and the local rehearsal does not (session-rehearsal.sh applies it before part K2).
-- Synthetic and only for the rehearsal: the ${G} target groups of 021d with no idol row and no agency, the five groups of the 021b rows, and
-- the ${yesRows.length} 021b rows as 021a and 021c leave them (inactive, waiting for review, with gender and debut year). Birth dates are
-- invented adult dates. Nothing here is a fact about a person.
set client_min_messages = warning;
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label, generation) values
${[...Object.values(yesGroups)].map(([n, s, l]) => `  (${q(n)}, ${q(s)}, 'fan', '#cccccc', '#111111', ${q(l)}, '4th generation')`).join(',\n')}
on conflict (slug) do nothing;
insert into public.groups (name, slug, fandom_name, display_color, text_color, record_label) values
${[...groups.map((g) => g.slug), ...otherSlugs.filter((s) => !groups.some((g) => g.slug === s))].map((s, k) => `  (${q(s)}, ${q(s)}, 'fan', '#cccccc', '#111111', ${k === 0 ? q(groups[0].record_label) : 'null'})`).join(',\n')}
on conflict (slug) do nothing;
${(() => {
  const gmap = { 82: 'nct', 89: 'nct', 133: 'kep1er', 143: 'babymonster', 144: 'babymonster', 145: 'babymonster', 146: 'babymonster', 148: 'babymonster', 151: 'riize', 152: 'riize', 153: 'riize', 163: 'fifty-fifty' };
  const rows = yesRows.map((r, k) => `  (${r.id}, (select id from public.groups where slug = ${q(gmap[r.id])}), ${q(r.name)}, date '${1994 + (k % 8)}-0${1 + (k % 9)}-1${k % 9}', 'South Korea', array[]::text[], ${q(r.qid)}, false, ${r.id}, true, 'Wikidata lists this member but not in our name-all roster; confirm before activating.', 'wikidata', '${k % 2 ? 'male' : 'female'}', ${2016 + (k % 8)})`);
  return `insert into public.idols (id, group_id, name, birth_date, nationality, positions, wikidata_qid, active, ord, needs_review, review_reason, origin, gender, debut_year) values\n${rows.join(',\n')}\non conflict (id) do nothing;\nselect setval(pg_get_serial_sequence('public.idols', 'id'), greatest((select max(id) from public.idols), 1));`;
})()}
`;

const out = [
  ['docs/pending-migrations/multisite/021d-k2-idols.sql', sql],
  ['docs/pending-migrations/multisite/021d-k2-idols.rollback.sql', rollback],
  ['docs/launch/o1/checks/V-K2.sql', check],
  ['docs/launch/o1/K2-rehearsal-fixture.sql', fixture],
];
for (const [f, text] of out) {
  if (/[\u2013\u2014]/.test(text)) throw new Error(`a dash reached ${f}`);
  await writeFile(path.join(ROOT, f), text);
  console.log(`written ${f} (${text.split('\n').length} lines)`);
}
