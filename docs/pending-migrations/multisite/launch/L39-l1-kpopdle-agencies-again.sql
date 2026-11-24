-- L39-l1-kpopdle-agencies-again.sql (owner, 2026-11-24: "jimin agency is not the good one, double check them all and fix them"; ORCH of run O1)
--
-- What:   in ONE DO block, the agency (groups.record_label, the Korean company that formed and manages the group, never a US distribution label) of
--         the 8 groups whose correction the weekly Verse refresh of Monday 2026-11-23 07:00 UTC undid, keyed by name AND by the exact wrong value read
--         in production on 2026-11-24, so a row that holds anything else is left alone and named in a notice:
--           BTS        Columbia Records   to BigHit Music            (L19, https://en.wikipedia.org/wiki/BTS rev 1383773245)
--           TXT        Republic Records   to BigHit Music            (L19, https://en.wikipedia.org/wiki/Tomorrow_X_Together rev 1383806528)
--           IVE        Columbia Records   to Starship Entertainment  (L19, https://en.wikipedia.org/wiki/Ive_(group) rev 1383782272)
--           ATEEZ      RCA Records        to KQ Entertainment        (L19, https://en.wikipedia.org/wiki/Ateez rev 1384518183)
--           RIIZE      RCA Records        to SM Entertainment        (L19, https://en.wikipedia.org/wiki/Riize rev 1383796393)
--           NewJeans   Geffen Records     to ADOR                    (L19, https://en.wikipedia.org/wiki/NewJeans rev 1384548282)
--           aespa      Capitol Records    to SM Entertainment        (L19, https://en.wikipedia.org/wiki/Aespa rev 1384261942)
--           FIFTY FIFTY Lapone Entertainment to Attrakt              (L34, https://en.wikipedia.org/wiki/Fifty_Fifty_(group) rev 1386705560)
--         The Wikipedia source row of each (written by L19 and L34) is kept, or put back when it is gone; the six agency names are already in
--         public.agencies (read 2026-11-24). Then dle_refresh_entities('kpopdle-idol') so the game shows them (never dle_build_bank, no redraw: no
--         answer leaves the pool). Each changed group is written first to public.o1_l39_agencies (its id, the label before), a table with RLS on and
--         no grant to the browser roles, so the rollback restores exactly those rows.
--         The other 34 groups of the Kpopdle pool were checked on 2026-11-24 and are right (AKMU "Cemter of Inspiration" is the official spelling, L37;
--         &TEAM "YX LABELS" L20; KATSEYE "Hybe UMG" 021d): not in this file.
-- Why:    the refresh (lib/verse/refresh.ts) wrote the first label Wikidata lists (P264, in no fixed order) over every group with a Wikidata id. The
--         code of the same PR stops that: a field another source corrected is never written again, and a label the group holds stays while Wikidata
--         lists it. Apply this file AFTER that PR is deployed (before Monday 07:00 UTC), or the next run undoes it again.
-- Rows:   updates up to 8 rows of public.groups (record_label only); inserts as many rows into the new log table; inserts a Wikipedia source row only
--         where one is missing; refreshes the Kpopdle snapshot. No other column, group, idol or game is touched.
-- Effect: Kpopdle (bunnyverse.org/kpopdle): the Agency cell of the 63 idols of these groups (past days are coloured again on read, wanted: the old
--         value was wrong). kpopquiz.org: the Label line of the Verse fact rail, the about page, the group hub and the answer-first text of these 8 groups.
-- Needs:  019, 020, 022 (public.agencies), 011 (entity_sources.source_url), L19, L34.
-- WHEN:   apply by the owner after the PR is merged and deployed, never between 23:50 and 00:30 UTC, the Verify lines run after it.
-- Verify: select count(*) from public.groups where site_id = 'kpop' and (name, record_label) in (('BTS', 'BigHit Music'), ('TXT', 'BigHit Music'), ('IVE', 'Starship Entertainment'), ('ATEEZ', 'KQ Entertainment'), ('RIIZE', 'SM Entertainment'), ('NewJeans', 'ADOR'), ('aespa', 'SM Entertainment'), ('FIFTY FIFTY', 'Attrakt'));   expect 8
-- Verify: select e.attrs->'agency'->'v'->>0 from public.dle_entities e where e.game_id = 'kpopdle-idol' and e.name = 'Jimin';   expect BigHit Music
-- Verify: select count(*) from public.dle_entities e where e.game_id = 'kpopdle-idol' and e.attrs->'agency'->'v'->>0 in ('Columbia Records', 'Republic Records', 'RCA Records', 'Geffen Records', 'Capitol Records', 'Lapone Entertainment');   expect 0
-- Verify: select count(*) from public.groups g where g.site_id = 'kpop' and g.name in ('BTS', 'TXT', 'IVE', 'ATEEZ', 'RIIZE', 'NewJeans', 'aespa', 'FIFTY FIFTY') and exists (select 1 from public.entity_sources s where s.entity_type = 'group' and s.entity_id = g.id::text and s.field = 'record_label' and s.source = 'wikipedia');   expect 8
-- Verify: select has_table_privilege('anon', 'public.o1_l39_agencies', 'select'), has_table_privilege('authenticated', 'public.o1_l39_agencies', 'select');   expect f, f
-- Undo:   L39-l1-kpopdle-agencies-again.rollback.sql (puts back the label of every logged row that still holds the value this file wrote, refreshes the
--         snapshot, then drops the log table)
-- o1-transaction: single, ONE DO block (atomic on its own, in psql and in the Supabase SQL Editor). Idempotent: a second run changes nothing.

do $l39$
begin
  perform set_config('lock_timeout', '5s', true);

  declare
    v_labels jsonb := '[
{"group_name":"BTS","wrong":"Columbia Records","fixed":"BigHit Music","url":"https://en.wikipedia.org/wiki/BTS","rev":"1383773245","read":"2026-11-09"},
{"group_name":"TXT","wrong":"Republic Records","fixed":"BigHit Music","url":"https://en.wikipedia.org/wiki/Tomorrow_X_Together","rev":"1383806528","read":"2026-11-09"},
{"group_name":"IVE","wrong":"Columbia Records","fixed":"Starship Entertainment","url":"https://en.wikipedia.org/wiki/Ive_(group)","rev":"1383782272","read":"2026-11-09"},
{"group_name":"ATEEZ","wrong":"RCA Records","fixed":"KQ Entertainment","url":"https://en.wikipedia.org/wiki/Ateez","rev":"1384518183","read":"2026-11-09"},
{"group_name":"RIIZE","wrong":"RCA Records","fixed":"SM Entertainment","url":"https://en.wikipedia.org/wiki/Riize","rev":"1383796393","read":"2026-11-09"},
{"group_name":"NewJeans","wrong":"Geffen Records","fixed":"ADOR","url":"https://en.wikipedia.org/wiki/NewJeans","rev":"1384548282","read":"2026-11-09"},
{"group_name":"aespa","wrong":"Capitol Records","fixed":"SM Entertainment","url":"https://en.wikipedia.org/wiki/Aespa","rev":"1384261942","read":"2026-11-09"},
{"group_name":"FIFTY FIFTY","wrong":"Lapone Entertainment","fixed":"Attrakt","url":"https://en.wikipedia.org/wiki/Fifty_Fifty_(group)","rev":"1386705560","read":"2026-11-22"}
]';
    v_done integer := 0;
    v_who text;
  begin
  -- Prerequisites.
  if to_regclass('public.groups') is null or to_regclass('public.entity_sources') is null then raise exception 'L39: public.groups or public.entity_sources is missing'; end if;
  if to_regclass('public.dle_entities') is null then raise exception 'L39: public.dle_entities is missing (019)'; end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'entity_sources' and column_name = 'source_url') then
    raise exception 'L39: entity_sources.source_url is missing (011)';
  end if;

  -- The log of the groups this file changes (the rollback reads it). Never readable by the browser roles.
  if to_regclass('public.o1_l39_agencies') is null then
    create table public.o1_l39_agencies (
      group_id bigint primary key references public.groups(id) on delete cascade,
      old_label text,
      new_label text not null,
      changed_at timestamptz not null default now()
    );
  end if;
  alter table public.o1_l39_agencies enable row level security;
  revoke all on table public.o1_l39_agencies from public, anon, authenticated;

  -- Log, then change, the groups that still hold the wrong label.
  insert into public.o1_l39_agencies (group_id, old_label, new_label)
  select g.id, g.record_label, l.fixed
    from jsonb_to_recordset(v_labels) as l(group_name text, wrong text, fixed text, url text, rev text, read text)
    join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong
  on conflict (group_id) do nothing;

  update public.groups g set record_label = l.fixed
    from jsonb_to_recordset(v_labels) as l(group_name text, wrong text, fixed text, url text, rev text, read text)
   where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.wrong;
  get diagnostics v_done = row_count;

  -- The Wikipedia source of each corrected label (L19 and L34 wrote it; put back only where it is gone). The refresh never writes a field that has one.
  insert into public.entity_sources (entity_type, entity_id, field, source, source_ref, source_url, fetched_at)
  select 'group', g.id::text, 'record_label', 'wikipedia', 'rev ' || l.rev, l.url, (l.read || ' 00:00:00+00')::timestamptz
    from jsonb_to_recordset(v_labels) as l(group_name text, wrong text, fixed text, url text, rev text, read text)
    join public.groups g on g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed
  on conflict (entity_type, entity_id, field, source) do nothing;

  -- The snapshot the players read, when the game already has one. Never dle_build_bank here; no answer leaves the pool, so no redraw.
  if exists (select 1 from public.dle_entities where game_id = 'kpopdle-idol') then
    perform public.dle_refresh_entities('kpopdle-idol');
  end if;

  select string_agg(l.group_name, ', ' order by l.group_name) into v_who
    from jsonb_to_recordset(v_labels) as l(group_name text, wrong text, fixed text, url text, rev text, read text)
   where not exists (select 1 from public.groups g where g.name = l.group_name and g.site_id = 'kpop' and g.record_label = l.fixed);
  if v_who is not null then raise notice 'L39: group(s) % not corrected (they hold another label than the one read on 2026-11-24, or are gone)', v_who; end if;
  raise notice 'L39: % group label(s) corrected of 8', v_done;
  end;
end $l39$;
