-- L19-l1-kpopdle-data-fixes.sql (lane kpopdle, run O1, owner 2026-11-09; audit 05 section 5, Part A items 0 to 8 and Part B as commented blocks)
--
-- What:   the data corrections of the audit of Kpopdle Idol, each keyed by id and name (K1) or Wikidata QID and name (K2) AND by the exact wrong value
--         the audit read in production on 2026-11-08, so a row that holds anything else is left alone and named in a notice:
--         1. status: dle_curation excluded for Taeil (74) and Mark (80), who left NCT (they stay in idols, active, for the public pages: Part B1 decides that);
--         2. agency (groups.record_label, the Korean company that formed and manages the group, never a US distribution label): BTS and TXT to BigHit Music,
--            IVE to Starship Entertainment, ATEEZ to KQ Entertainment, RIIZE and aespa to SM Entertainment, NewJeans to ADOR; the names go into public.agencies
--            (022) with the same strings so the slug matches. TWICE, Stray Kids, ITZY, (G)I-DLE, SEVENTEEN, KATSEYE and CORTIS were read in production on 2026-11-08
--            and are right: not in this file;
--         3. positions: Maknae added to 10 idols, Leader added to Taeyeon and Junkyu, Leader taken off Minji (NewJeans has no leader on Wikipedia). Hoshi and Woozi
--            are fixed by the view of L20, not here;
--         4. group cell: Go Won (Q58825794) gets Loossemble in idol_other_groups, like Hyunjin, Yeojin and Hyeju (Part B4 is the alternative);
--         5. debut year (the 021c rule: first official release as a member of a debuted group): Jay B and Jinyoung 2014 to 2012 (JJ Project), JiU, SuA, Siyeon,
--            Yoohyeon and Dami 2017 to 2014 (MINX);
--         6. nationality spelling: "People's Republic of China" to "China" on Ningning (33), Jun (42), Yuqi (58), Lay (170) and Qian Kun (89), the label the K2 rows
--            and the French words already use. Same fact, other spelling: their wikidata source rows stay valid and no row is added;
--         7. ASTRO groups.inception_date 2016-01-01 to 2016-02-23 (not shown by the game);
--         8. dle_refresh_entities('kpopdle-idol') when the game has a snapshot (never dle_build_bank: the nightly maintenance rebuilds when the pool changes).
--         One entity_sources row (source wikipedia, source_ref "rev <id>", source_url, fetched_at 2026-11-09 00:00 UTC) per corrected value: the revision of the
--         English Wikipedia page read on 2026-11-09. The debut-year rows of wikidata and musicbrainz that named the old year are replaced (one source per stored
--         year, as 021c does; the rollback puts them back). The old wikidata "record_label" rows of the seven groups (source_ref = the group QID) stay.
--         Not touched: any other column, any other idol, idols.active, needs_review, the bank, dle_daily_stats.
--         Sources read on 2026-11-09 (revision ids in the rows below): https://en.wikipedia.org/wiki/ pages BTS, Ive_(group), Ateez, Riize, Tomorrow_X_Together,
--         NewJeans, Aespa, NCT_(group), Hybe, Loossemble, JJ_Project, Dreamcatcher_(group), Astro_(South_Korean_band), Girls'_Generation, Treasure_(band),
--         Zerobaseone, P1Harmony, Jung_Kook, Lisa_(rapper), Tzuyu, Ningning, Sehun, Taemin.
-- Needs:  019, 020, 021a, 021c, 021d (the K2 rows), 022 (public.agencies), 011 (entity_sources.source_url and source wikipedia).
-- WHEN:   after a backup, at a day boundary: just after 00:30 UTC, never between 23:50 and 00:30 UTC, never during a build. Step 0 reads dle_schedule and
--         dle_daily_stats for today and the next 7 days and aborts the whole file if Taeil (74) or Mark (80), whom this file removes from the answers, is scheduled
--         in that window (the owner then swaps that dle_schedule row by hand; O1 adds a guarded statement only on the owner's word). On 2026-11-09 they are not.
--         Every guess is stored as an entity id and its colours are computed on read: a corrected value re-colours the past days (R12 of the audit), which is wanted
--         because the old value was wrong. The pool hash changes (2 idols leave the targets): the nightly maintenance rebuilds the bank and keeps today and the next 7 days.
-- Effect: kpopquiz.org (data only, no template change): the Label line of the Verse fact rail, the about page, the group hub and the answer-first text of BTS, TXT,
--         IVE, ATEEZ, RIIZE, NewJeans and aespa; the position tags of the idols in item 3 and the nationality of the five in item 6 on their member pages; the debut
--         year of the seven in item 5 where it is read; the ASTRO debut date. Taeil and Mark stay on the member counts until Part B1.
-- Undo:   L19-l1-kpopdle-data-fixes.rollback.sql (puts back the exact previous values, only where a row still holds the value this file wrote).
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

-- 0. Precheck, writes nothing: the structure, then the 8 served and kept days.
do $l19$
declare
  g public.dle_games;
  hit text;
begin
  if to_regclass('public.idols') is null or to_regclass('public.groups') is null or to_regclass('public.entity_sources') is null
     or to_regclass('public.agencies') is null or to_regclass('public.idol_other_groups') is null or to_regclass('public.dle_curation') is null then
    raise exception 'L19: public.idols, groups, entity_sources, agencies (022), idol_other_groups (020) and dle_curation (019) must all exist';
  end if;
  if (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'idols' and column_name in ('gender', 'debut_year')) <> 2 then
    raise exception 'L19: idols.gender or idols.debut_year is missing (apply 021a first)';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then
    raise exception 'L19: entity_sources.source_url is missing (apply 011 first)';
  end if;
  select * into g from public.dle_games where id = 'kpopdle-idol';
  if not found then
    raise exception 'L19: the game kpopdle-idol is missing (apply 020 first)';
  end if;
  if g.epoch is not null then
    select string_agg(distinct x.d::text || ' (id ' || x.entity_id || ')', ', ' order by x.d::text || ' (id ' || x.entity_id || ')') into hit
    from (
      select dd.d::date as d, coalesce(st.entity_id, s.entity_id) as entity_id
      from generate_series(public.dle_utc_date(now()), public.dle_utc_date(now()) + 7, interval '1 day') as dd(d)
      join public.dle_schedule s on s.game_id = g.id and s.bank_day = public.dle_bank_day(g.epoch, dd.d::date)
      left join public.dle_daily_stats st on st.game_id = g.id and st.play_date = dd.d::date
    ) x
    where x.entity_id in ('74', '80');
    if hit is not null then
      raise exception 'L19: Taeil (74) or Mark (80) is the answer of a served or kept day in the next 8 days: %. Nothing was changed. The owner chooses: leave that day as it is or swap its dle_schedule row, then apply this file.', hit;
    end if;
  end if;
end $l19$;

drop table if exists pg_temp.l19_log;
create temp table l19_log (cat text primary key, total integer not null, changed integer not null default 0);

-- 1. Status. The curation row is created, or flipped from excluded false; its weight is never touched. The note is the source.
do $l19$
declare
  n integer;
begin
  insert into l19_log (cat, total) values ('status', 2);
  insert into public.dle_curation as c (game_id, entity_id, excluded, note)
  select 'kpopdle-idol', v.id::text, true, v.note
  from (values
    (74, 'Taeil', 'L19: left NCT on 2024-08-28. https://en.wikipedia.org/wiki/NCT_(group) rev 1383941664 (read 2026-11-09)'),
    (80, 'Mark', 'L19: left NCT on 2026-04-08. https://en.wikipedia.org/wiki/NCT_(group) rev 1383941664 (read 2026-11-09)')
  ) as v(id, name, note)
  join public.idols i on i.id = v.id and i.name = v.name
  on conflict (game_id, entity_id) do update
    set excluded = true, note = coalesce(c.note, excluded.note), updated_at = now()
    where not c.excluded;
  get diagnostics n = row_count;
  update l19_log set changed = n where cat = 'status';
end $l19$;

-- 2. Agency. The new names go into public.agencies first (the slug rule of 022, the same strings as groups.record_label).
create temp table l19_labels (group_name text primary key, wrong text not null, fixed text not null, url text not null, rev text not null);
insert into l19_labels (group_name, wrong, fixed, url, rev) values
  ('BTS',       'Columbia Records', 'BigHit Music',          'https://en.wikipedia.org/wiki/BTS',                     '1383773245'),
  ('TXT',       'Republic Records', 'BigHit Music',          'https://en.wikipedia.org/wiki/Tomorrow_X_Together',     '1383806528'),
  ('IVE',       'Columbia Records', 'Starship Entertainment', 'https://en.wikipedia.org/wiki/Ive_(group)',            '1383782272'),
  ('ATEEZ',     'RCA Records',      'KQ Entertainment',      'https://en.wikipedia.org/wiki/Ateez',                   '1384518183'),
  ('RIIZE',     'RCA Records',      'SM Entertainment',      'https://en.wikipedia.org/wiki/Riize',                   '1383796393'),
  ('NewJeans',  'Geffen Records',   'ADOR',                  'https://en.wikipedia.org/wiki/NewJeans',                '1384548282'),
  ('aespa',     'Capitol Records',  'SM Entertainment',      'https://en.wikipedia.org/wiki/Aespa',                   '1384261942');

do $l19$
declare
  n integer;
  skipped text;
begin
  insert into public.agencies (slug, name)
  select distinct on (s.slug) s.slug, s.name
  from (select distinct l.fixed as name, left(btrim(regexp_replace(lower(btrim(l.fixed)), '[^a-z0-9]+', '-', 'g'), '-'), 60) as slug from l19_labels l) s
  where exists (select 1 from l19_labels l join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong and l.fixed = s.name)
  order by s.slug, s.name
  on conflict do nothing;
  select string_agg(distinct l.fixed, ', ') into skipped from l19_labels l
  where not exists (select 1 from public.agencies a where a.name = l.fixed)
    and exists (select 1 from public.groups g where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong);
  if skipped is not null then
    raise notice 'L19: agency name(s) not added (their slug is taken by another name): %', skipped;
  end if;

  insert into l19_log (cat, total) values ('agency', (select count(*) from l19_labels));
  update public.groups g set record_label = l.fixed
  from l19_labels l
  where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong;
  get diagnostics n = row_count;
  update l19_log set changed = n where cat = 'agency';
end $l19$;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
select 'group', g.id::text, 'record_label', 'wikipedia', 'rev ' || l.rev, l.url, timestamptz '2026-11-09 00:00:00+00'
from l19_labels l join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed
on conflict (entity_type, entity_id, field, source) do nothing;

-- 3. Positions. An element counts as the tag only when it is the whole element ("Performance Unit Leader" is not a leader).
create temp table l19_pos (idol_id integer, qid text, name text not null, tag text not null, url text not null, rev text not null, note text not null);
insert into l19_pos (idol_id, qid, name, tag, url, rev, note) values
  (7,   null,          'Jungkook',      'Maknae', 'https://en.wikipedia.org/wiki/Jung_Kook',  '1383784665', 'youngest of the 7 members by birth date (1997-09-01)'),
  (11,  null,          'Lisa',          'Maknae', 'https://en.wikipedia.org/wiki/Lisa_(rapper)', '1384421258', 'youngest of BLACKPINK by birth date (1997-03-27)'),
  (29,  null,          'Tzuyu',         'Maknae', 'https://en.wikipedia.org/wiki/Tzuyu',      '1383802214', 'youngest of TWICE by birth date (1999-06-14)'),
  (33,  null,          'Ningning',      'Maknae', 'https://en.wikipedia.org/wiki/Ningning',   '1383794016', 'youngest of aespa by birth date (2002-10-23)'),
  (151, null,          'Anton Lee',     'Maknae', 'https://en.wikipedia.org/wiki/Riize',      '1383796393', 'youngest of the 6 current members (birth date 2004-03-21 held in entity_sources)'),
  (176, null,          'Sehun',         'Maknae', 'https://en.wikipedia.org/wiki/Sehun',      '1383797221', 'youngest of EXO by birth date (1994-04-12)'),
  (196, null,          'Taemin',        'Maknae', 'https://en.wikipedia.org/wiki/Taemin',     '1384572525', 'youngest of SHINee by birth date (1993-07-18)'),
  (null, 'Q97352009',  'So Jung-hwan',  'Maknae', 'https://en.wikipedia.org/wiki/Treasure_(band)', '1383801988', 'youngest of the 10 current members (birth date 2005-02-18 held in entity_sources)'),
  (null, 'Q30006465',  'Jongseob',      'Maknae', 'https://en.wikipedia.org/wiki/P1Harmony',  '1384253679', 'youngest of the 6 current members (birth date 2005-11-19 held in entity_sources)'),
  (null, 'Q117818064', 'Park Gun-wook', 'Maknae', 'https://en.wikipedia.org/wiki/Zerobaseone', '1383804268', 'youngest of the current 5 (birth date 2005-01-10 held in entity_sources)'),
  (null, 'Q233371',    'Taeyeon',       'Leader', 'https://en.wikipedia.org/wiki/Girls%27_Generation', '1383778535', 'the group''s leader'),
  (null, 'Q97319986',  'Junkyu',        'Leader', 'https://en.wikipedia.org/wiki/Treasure_(band)', '1383801988', 'Junkyu and Asahi succeeded the leadership in 2025');

do $l19$
declare
  n integer;
  n2 integer;
begin
  insert into l19_log (cat, total) values ('positions', (select count(*) from l19_pos) + 1);
  update public.idols i set positions = array_append(i.positions, p.tag)
  from l19_pos p
  where i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
    and not exists (select 1 from unnest(i.positions) as e where e ~* ('^\s*' || p.tag || '\s*$'));
  get diagnostics n = row_count;
  -- Minji (34): NewJeans has no leader on Wikipedia. Guarded on the exact array of the roster seed, so the rollback restores it byte for byte.
  update public.idols i set positions = array['Vocalist']::text[]
  where i.id = 34 and i.name = 'Minji' and i.positions = array['Leader', 'Vocalist']::text[];
  get diagnostics n2 = row_count;
  update l19_log set changed = n + n2 where cat = 'positions';
end $l19$;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
select 'idol', i.id::text, 'positions', 'wikipedia', 'rev ' || p.rev || '; ' || p.tag || ': ' || p.note, p.url, timestamptz '2026-11-09 00:00:00+00'
from l19_pos p join public.idols i on i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
where exists (select 1 from unnest(i.positions) as e where e ~* ('^\s*' || p.tag || '\s*$'))
on conflict (entity_type, entity_id, field, source) do nothing;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
select 'idol', '34', 'positions', 'wikipedia', 'rev 1384548282; NewJeans has no leader (the member list names none)', 'https://en.wikipedia.org/wiki/NewJeans', timestamptz '2026-11-09 00:00:00+00'
from public.idols i where i.id = 34 and i.name = 'Minji' and i.positions = array['Vocalist']::text[]
on conflict (entity_type, entity_id, field, source) do nothing;

-- 4. Group cell: Go Won is in Loossemble as well (Part B4 is the alternative: drop the Loossemble links).
do $l19$
declare
  n integer;
begin
  insert into l19_log (cat, total) values ('group-cell', 1);
  insert into public.idol_other_groups (idol_id, group_id)
  select i.id, g2.id
  from public.idols i join public.groups g2 on g2.slug = 'loossemble'
  where i.wikidata_qid = 'Q58825794' and i.name = 'Go Won'
  on conflict do nothing;
  get diagnostics n = row_count;
  update l19_log set changed = n where cat = 'group-cell';
end $l19$;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
select 'idol', i.id::text, 'group', 'wikipedia', 'rev 1383791853; Loossemble lists Go Won as a member', 'https://en.wikipedia.org/wiki/Loossemble', timestamptz '2026-11-09 00:00:00+00'
from public.idols i join public.groups g2 on g2.slug = 'loossemble' join public.idol_other_groups og on og.idol_id = i.id and og.group_id = g2.id
where i.wikidata_qid = 'Q58825794' and i.name = 'Go Won'
on conflict (entity_type, entity_id, field, source) do nothing;

-- 5. Debut years. The rows of the old year in entity_sources (refs known from 021d) are replaced by the wikipedia row.
create temp table l19_years (qid text primary key, name text not null, old_year integer not null, new_year integer not null, old_wd text, old_mb text not null, url text not null, rev text not null, note text not null);
insert into l19_years (qid, name, old_year, new_year, old_wd, old_mb, url, rev, note) values
  ('Q491048',   'Jay B', 2014, 2012, 'Q23772001', '506745bd-d3e9-4844-a274-99974bef21b2', 'https://en.wikipedia.org/wiki/JJ_Project',       '1375298827', 'JJ Project debut single "Bounce", May 2012'),
  ('Q492313',   'Jinyoung', 2014, 2012, 'Q23772001', '506745bd-d3e9-4844-a274-99974bef21b2', 'https://en.wikipedia.org/wiki/JJ_Project',       '1375298827', 'JJ Project debut single "Bounce", May 2012'),
  ('Q59313184', 'JiU', 2017, 2014, null, '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de', 'https://en.wikipedia.org/wiki/Dreamcatcher_(group)', '1383776611', 'debuted as MINX in 2014'),
  ('Q59313270', 'SuA', 2017, 2014, null, '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de', 'https://en.wikipedia.org/wiki/Dreamcatcher_(group)', '1383776611', 'debuted as MINX in 2014'),
  ('Q59313326', 'Siyeon', 2017, 2014, null, '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de', 'https://en.wikipedia.org/wiki/Dreamcatcher_(group)', '1383776611', 'debuted as MINX in 2014'),
  ('Q59313479', 'Yoohyeon', 2017, 2014, null, '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de', 'https://en.wikipedia.org/wiki/Dreamcatcher_(group)', '1383776611', 'debuted as MINX in 2014'),
  ('Q59313527', 'Dami', 2017, 2014, null, '51dd3424-23f9-4f6b-bc7b-1218c9ebf3de', 'https://en.wikipedia.org/wiki/Dreamcatcher_(group)', '1383776611', 'debuted as MINX in 2014');

do $l19$
declare
  n integer;
begin
  insert into l19_log (cat, total) values ('debut', (select count(*) from l19_years));
  update public.idols i set debut_year = y.new_year
  from l19_years y
  where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.old_year;
  get diagnostics n = row_count;
  update l19_log set changed = n where cat = 'debut';
end $l19$;

-- One source row per stored year: the rows 021d wrote for the old year (the exact refs) go, the wikipedia row comes.
delete from public.entity_sources e
using l19_years y, public.idols i
where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year
  and e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'debut_year'
  and ((e.source = 'wikidata' and e.source_ref = y.old_wd) or (e.source = 'musicbrainz' and e.source_ref = y.old_mb));

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
select 'idol', i.id::text, 'debut_year', 'wikipedia', 'rev ' || y.rev || '; ' || y.note, y.url, timestamptz '2026-11-09 00:00:00+00'
from l19_years y join public.idols i on i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year
on conflict (entity_type, entity_id, field, source) do nothing;

-- 6. Nationality spelling. Same fact, the label the K2 rows and COUNTRY_FR use.
create temp table l19_nat (id integer primary key, name text not null, wrong text not null, fixed text not null);
insert into l19_nat (id, name, wrong, fixed) values
  (33,  'Ningning', 'People''s Republic of China', 'China'),
  (42,  'Jun',      'People''s Republic of China', 'China'),
  (58,  'Yuqi',     'People''s Republic of China', 'China'),
  (89,  'Qian Kun', 'People''s Republic of China', 'China'),
  (170, 'Lay',      'People''s Republic of China', 'China');

do $l19$
declare
  n integer;
  raw text;
begin
  insert into l19_log (cat, total) values ('nationality', (select count(*) from l19_nat));
  update public.idols i set nationality = x.fixed
  from l19_nat x
  where i.id = x.id and i.name = x.name and i.nationality = x.wrong;
  get diagnostics n = row_count;
  update l19_log set changed = n where cat = 'nationality';
  -- Raw Wikidata labels left on an active idol are named, not guessed.
  select string_agg(i.id::text || ' ' || i.name || ' (' || i.nationality || ')', ', ' order by i.id) into raw
  from public.idols i
  where i.active and i.nationality ~ '(People''s Republic of China|United States of America|Republic of Korea)';
  if raw is not null then
    raise notice 'L19: active idol(s) still on a raw Wikidata country label, left as they are: %', raw;
  end if;
end $l19$;

-- 7. ASTRO inception_date (not read by the game; the Verse debut line of /verse/astro).
do $l19$
declare
  n integer;
begin
  insert into l19_log (cat, total) values ('astro', 1);
  update public.groups set inception_date = date '2016-02-23'
  where name = 'ASTRO' and site_id = 'kpop' and inception_date = date '2016-01-01';
  get diagnostics n = row_count;
  update l19_log set changed = n where cat = 'astro';
end $l19$;

insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
select 'group', g.id::text, 'inception_date', 'wikipedia', 'rev 1382319710; debut EP "Spring Up" released 2016-02-23', 'https://en.wikipedia.org/wiki/Astro_(South_Korean_band)', timestamptz '2026-11-09 00:00:00+00'
from public.groups g where g.name = 'ASTRO' and g.site_id = 'kpop' and g.inception_date = date '2016-02-23'
on conflict (entity_type, entity_id, field, source) do nothing;

-- 8. The snapshot the players read, when the game already has one (otherwise the activation takes it). Never dle_build_bank here.
do $l19$ begin
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;
end $l19$;

-- Self-check. Every item is either in its fixed state or named in a notice (its guard did not match: another value, another name, a row gone).
do $l19$
declare
  c record;
  ok integer;
  who text;
  under18 integer;
begin
  for c in select * from l19_log loop
    if c.changed > c.total then
      raise exception 'L19: % changed % row(s), at most % expected', c.cat, c.changed, c.total;
    end if;
  end loop;

  select count(*) into ok from public.dle_curation where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and excluded;
  if ok = 0 then raise exception 'L19: neither Taeil (74) nor Mark (80) is excluded (rows missing or renamed?)'; end if;
  select string_agg(v.id::text, ', ') into who from (values ('74'), ('80')) as v(id)
    where not exists (select 1 from public.dle_curation where game_id = 'kpopdle-idol' and entity_id = v.id and excluded);
  if who is not null then raise notice 'L19 status: id(s) % not excluded (row gone or renamed)', who; end if;
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol' and entity_id in ('74', '80') and can_be_target) then
    raise exception 'L19: Taeil or Mark is still a target after the refresh';
  end if;

  select count(*) into ok from l19_labels l join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed;
  if ok = 0 then raise exception 'L19: no agency holds a corrected label (wrong database?)'; end if;
  select string_agg(l.group_name, ', ') into who from l19_labels l
    where not exists (select 1 from public.groups g where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed);
  if who is not null then raise notice 'L19 agency: group(s) % not corrected (they hold another label than the audited one, or are gone)', who; end if;
  if exists (select 1 from l19_labels l join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed
             where not exists (select 1 from public.agencies a where a.name = l.fixed)) then
    raise notice 'L19 agency: a corrected label has no public.agencies row (slug taken)';
  end if;

  select count(*) into ok from l19_pos p join public.idols i on i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
    where exists (select 1 from unnest(i.positions) as e where e ~* ('^\s*' || p.tag || '\s*$'));
  if ok = 0 then raise exception 'L19: no position tag was written or found (wrong database?)'; end if;
  select string_agg(p.name, ', ') into who from l19_pos p
    where not exists (select 1 from public.idols i where i.name = p.name and ((p.idol_id is not null and i.id = p.idol_id) or (p.qid is not null and i.wikidata_qid = p.qid))
      and exists (select 1 from unnest(i.positions) as e where e ~* ('^\s*' || p.tag || '\s*$')));
  if who is not null then raise notice 'L19 positions: % not set (row gone or renamed)', who; end if;
  if exists (select 1 from public.idols where id = 34 and name = 'Minji' and positions <> array['Vocalist']::text[]) then
    raise notice 'L19 positions: Minji (34) keeps her roster positions (not the audited array)';
  end if;

  select string_agg(y.name, ', ') into who from l19_years y
    where not exists (select 1 from public.idols i where i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year);
  if who is not null then raise notice 'L19 debut: % not corrected (another year, another name, or a row gone)', who; end if;
  if (select count(*) from l19_years y join public.idols i on i.wikidata_qid = y.qid and i.name = y.name and i.debut_year = y.new_year
        where (select count(*) from public.entity_sources e where e.entity_type = 'idol' and e.entity_id = i.id::text and e.field = 'debut_year') <> 1) > 0 then
    raise exception 'L19: a corrected debut year does not keep exactly one entity_sources row';
  end if;

  select string_agg(x.name, ', ') into who from l19_nat x where not exists (select 1 from public.idols i where i.id = x.id and i.name = x.name and i.nationality = x.fixed);
  if who is not null then raise notice 'L19 nationality: % not normalized (another value, or renamed)', who; end if;

  select count(*) into under18 from public.idols where active and birth_date > (current_date - interval '18 years')::date;
  if under18 > 0 then
    raise exception 'L19: % active idol(s) are under 18', under18;
  end if;
end $l19$;

-- ---------------------------------------------------------------------------------------------------------------------------
-- Part B: owner decisions. Commented and guarded; nothing below runs. Each block has the recommendation of the audit.
-- ---------------------------------------------------------------------------------------------------------------------------
--
-- B1. Taeil (74) and Mark (80) inactive (as seo-m2-idols-former-members.sql did for Heeseung and Danielle). RECOMMENDED (audit): yes.
--     It also removes them from the member counts of the NCT pages and the name-all games of kpopquiz.org (public, parity). Wikipedia: Taeil departed 2024-08-28,
--     Mark departed 2026-04-08 (https://en.wikipedia.org/wiki/NCT_(group) rev 1383941664). Same page lists WinWin (departed 2026-07-09) and Lucas (2023-05-10): the
--     read-only check docs/launch/o1/checks/V-kpopdle-members.sql tells whether they are active in the pool.
--     update public.idols set active = false, updated_at = now()
--     where ((id = 74 and name = 'Taeil') or (id = 80 and name = 'Mark')) and active;
--     insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
--     select 'idol', i.id::text, 'active', 'wikipedia', 'rev 1383941664; departed from NCT', 'https://en.wikipedia.org/wiki/NCT_(group)', timestamptz '2026-11-09 00:00:00+00'
--     from public.idols i where i.id in (74, 80) and not i.active on conflict (entity_type, entity_id, field, source) do nothing;
--
-- B2. AKMU agency (R3: current agency or the agency that formed the group). Wikipedia: AKMU left YG Entertainment in November 2025 and plans an independent label
--     (https://en.wikipedia.org/wiki/AKMU rev 1383771025, infobox label still "YG"); the new label's name is not given there, so no value is written.
--     RECOMMENDED: keep YG Entertainment with the rule "the company that formed the group" (GOT7 JYP, LOONA Blockberry Creative, BIGBANG YG stay), and state the rule in the help text.
--
-- B3. Dual nationality for the K1 idols whose group row holds one arbitrary Wikidata value (R6, S3 of the audit). RECOMMENDED: one rule, every citizenship in the English
--     Wikipedia lead or infobox, normalized labels, the pairs below only after the owner has read each page (the audit appendix lists them, this file did not verify them):
--     update public.idols set nationality = v.fixed from (values
--       (10, 'Rosé', 'New Zealand, South Korea'), (35, 'Hanni', 'Australia, Vietnam'), (50, 'Vernon', 'United States, South Korea'),
--       (69, 'Yunjin', 'United States, South Korea'), (126, 'Huening Kai', 'United States, South Korea'), (117, 'Jake', 'South Korea, Australia')
--     ) as v(id, name, fixed) where idols.id = v.id and idols.name = v.name and idols.nationality is not null and idols.nationality !~ '[,;/]' and idols.nationality <> v.fixed;
--     (Bang Chan 12, Felix 17, Joshua 41, Johnny 75 and Anton 151 also hold one value; the audit gives no second country for them.)
--
-- B4. Loossemble links (its CTDENM contract ended 2024-11-29; Wikipedia writes "was a South Korean girl group", https://en.wikipedia.org/wiki/Loossemble rev 1383791853).
--     Either keep the links and add Go Won (item 4 above, applied by default) or drop all of them. RECOMMENDED: drop, because the game compares current groups:
--     delete from public.idol_other_groups og using public.groups g where g.id = og.group_id and g.slug = 'loossemble';
--     (then run the rollback of item 4 first or in the same transaction; the rollback file restores nothing for links 021d wrote.)
--
-- B5. &TEAM generation: 089 maps "&TEAM" to 5th Gen, 021d writes 4th only when the column is empty, the published rule on the group's 2022 debut gives 4th.
--     RECOMMENDED: 4th. First read the value (select name, generation from public.groups where slug = 'team'), then:
--     update public.groups set generation = '4th generation' where slug = 'team' and generation = '5th Gen';
--
-- B6. TREASURE leaders. The audit (R-13, R-14) wants Leader off Yoon Jae-hyuk (Q98136886) and Haruto (Q97352003), because the prose says Junkyu and Asahi succeeded the
--     leadership in 2025. But the current-members list of the same page (rev 1383801988) still writes "leader" after Yoon Jae-hyuk and Haruto: Wikipedia contradicts itself,
--     so this file does not remove them (and adds Leader to Junkyu from the prose only). RECOMMENDED: keep them as they are until the page agrees, then:
--     update public.idols set positions = array_remove(positions, 'Leader') where name in ('Yoon Jae-hyuk', 'Haruto') and wikidata_qid in ('Q98136886', 'Q97352003') and 'Leader' = any(positions);
--
-- B7. The empty nationalities (6 rows in production; the audit lists Wendy 104 and Jay 116, the others are named by V-kpopdle-members.sql). Filling one can make an idol
--     complete and so a new possible answer (pool and bank change): the owner decides. Wikipedia: Wendy, "South Korean singer" born in Seoul
--     (https://en.wikipedia.org/wiki/Wendy_(singer) rev 1384573967; she grew up partly in Canada, the page names no citizenship other than South Korean). Jay (ENHYPEN):
--     no individual English Wikipedia page was reached, nothing is written. RECOMMENDED for Wendy only:
--     update public.idols set nationality = 'South Korea' where id = 104 and name = 'Wendy' and nationality is null;

drop table if exists pg_temp.l19_log, pg_temp.l19_labels, pg_temp.l19_pos, pg_temp.l19_years, pg_temp.l19_nat;

notify pgrst, 'reload schema';
