-- V-kpopdle-members (run O1, lane kpopdle, audit 05 Part C4, rules R6 R7 R9): read only. Run it before and after L19 and L20 with psql -At -F ' | ' -f.
-- Part 1: lines "ok or KO | what | the number found" (an information line is always ok). Part 2: the idols of the pool, one JSON line per group, to give to
-- apps/quiz/scripts/kpopdle-members.mjs, which compares them with the current-member list of each group on English Wikipedia (R9: a former member stays a target
-- until somebody flips the flag; Taeil and Mark were found this way, WinWin and Lucas of NCT are on the same Wikipedia table).
-- Never a target of a day, never a play: only the public idol rows. In a read-only transaction.
begin transaction read only;

with pool as (
  select i.id, i.name, i.nationality, i.positions, i.birth_date, g.id as gid, g.name as gname, g.record_label
  from public.idols i join public.groups g on g.id = i.group_id
  where i.active and not i.needs_review and i.detached_at is null and g.site_id = 'kpop'
)
select case when c.ok then 'ok' else 'KO' end as ok, c.what, c.got from (values
  (1, 'Taeil (74) and Mark (80) are possible answers (0 after L19)',
      (select count(*) = 0 from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and can_be_target),
      (select count(*)::text from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and can_be_target)),
  (2, 'active idols under 18 (0)', (select count(*) = 0 from pool where birth_date > (current_date - interval '18 years')::date),
      (select count(*)::text from pool where birth_date > (current_date - interval '18 years')::date)),
  (3, 'groups of the pool citing a US or Japanese distribution label as the agency (0 after L19)',
      (select count(*) = 0 from public.groups g where g.site_id = 'kpop' and exists (select 1 from pool p where p.gid = g.id)
         and btrim(g.record_label) in ('Columbia Records', 'Republic Records', 'RCA Records', 'Geffen Records', 'Capitol Records', 'Warner Records', 'Universal Music Japan', 'Def Jam Recordings', 'Interscope Records', 'Atlantic Records', 'Epic Records')),
      (select count(*)::text from public.groups g where g.site_id = 'kpop' and exists (select 1 from pool p where p.gid = g.id)
         and btrim(g.record_label) in ('Columbia Records', 'Republic Records', 'RCA Records', 'Geffen Records', 'Capitol Records', 'Warner Records', 'Universal Music Japan', 'Def Jam Recordings', 'Interscope Records', 'Atlantic Records', 'Epic Records'))),
  (4, 'active idols on a raw Wikidata country label (0 after L19)', (select count(*) = 0 from pool where nationality ~ '(People''s Republic of China|United States of America|Republic of Korea)'),
      (select count(*)::text from pool where nationality ~ '(People''s Republic of China|United States of America|Republic of Korea)')),
  (5, 'active idols with no nationality (information; B7 of L19 lists the ones sourced)', true, (select count(*)::text from pool where nullif(btrim(nationality), '') is null)),
  (6, 'pool idols with a position that mentions leader but is not the whole element "Leader": they stop being Leader with L20 (information)', true,
      (select count(*)::text from pool p where exists (select 1 from unnest(p.positions) e where e ~* 'leader' and e !~* '^\s*leader\s*$'))),
  (7, 'pool idols with a position that mentions maknae but is not the whole element "Maknae" (information)', true,
      (select count(*)::text from pool p where exists (select 1 from unnest(p.positions) e where e ~* 'maknae' and e !~* '^\s*maknae\s*$'))),
  (8, 'groups of the pool with more than one idol tagged Leader as a whole element (information; a group has one leader, TREASURE shows 3 with L19 and B6)', true,
      (select count(*)::text from (select gid from pool p where exists (select 1 from unnest(p.positions) e where e ~* '^\s*leader\s*$') group by gid having count(*) > 1) x)),
  (9, 'groups of the pool with no idol tagged Maknae as a whole element (information)', true,
      (select count(*)::text from (select gid from pool p group by gid having not bool_or(exists (select 1 from unnest(p.positions) e where e ~* '^\s*maknae\s*$'))) x)),
  (10, 'agencies used by a group of the pool with no mother company (information; HYBE labels need parent_id for Close)', true,
      (select count(distinct btrim(p.record_label))::text from pool p left join public.agencies a on a.name = btrim(p.record_label) where a.parent_id is null and nullif(btrim(p.record_label), '') is not null))
) as c(n, what, ok, got) order by c.n;

-- Lists behind the information lines 5 to 7 (id | name | group | value): the owner reads them, nothing is written.
select 'no nationality | ' || p.id || ' | ' || p.name || ' | ' || p.gname from (
  select i.id, i.name, g.name as gname from public.idols i join public.groups g on g.id = i.group_id
  where i.active and not i.needs_review and i.detached_at is null and g.site_id = 'kpop' and nullif(btrim(i.nationality), '') is null
) p order by p.id;
select 'leader-like, not whole | ' || i.id || ' | ' || i.name || ' | ' || array_to_string(i.positions, ', ') from public.idols i
where i.active and not i.needs_review and i.detached_at is null and exists (select 1 from unnest(i.positions) e where e ~* 'leader' and e !~* '^\s*leader\s*$') order by i.id;
select 'maknae-like, not whole | ' || i.id || ' | ' || i.name || ' | ' || array_to_string(i.positions, ', ') from public.idols i
where i.active and not i.needs_review and i.detached_at is null and exists (select 1 from unnest(i.positions) e where e ~* 'maknae' and e !~* '^\s*maknae\s*$') order by i.id;

-- Part 2: the pool by group, one JSON line each: {"group": ..., "idols": [{"id": ..., "name": ..., "name_romanized": ..., "name_hangul": ...}]}.
select json_build_object('group', g.name, 'slug', g.slug, 'idols', json_agg(json_build_object('id', i.id, 'name', i.name, 'romanized', i.name_romanized, 'hangul', i.name_hangul) order by i.id))::text
from public.idols i join public.groups g on g.id = i.group_id
where i.active and not i.needs_review and i.detached_at is null and g.site_id = 'kpop' and i.birth_date is not null and i.birth_date <= (current_date - interval '18 years')::date
group by g.id, g.name, g.slug order by g.name;
rollback;
