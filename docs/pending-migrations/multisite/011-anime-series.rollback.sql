-- 011-anime-series.rollback.sql (run O1, lane K1): undo of 011-anime-series.sql.
--
-- What:   drops the view favourite_character_counts and the seven tables (favourite_characters, series_progress, series_themes,
--         episodes, characters, arcs, series; their policies, indexes and keys go with them), drops quizzes.spoiler_arc_ord and
--         quizzes.spoiler_scope and entity_sources.source_url, and puts back today's three check constraints (trivia_entity_kind_check,
--         entity_sources_entity_type_check, entity_sources_source_check), copied verbatim from the production schema dump
--         (~/kpq-o1/prod-public.sql, lines 6101, 6102 and 6191).
-- Why:    the rollback of manifest.md row 15. Rollbacks run in reverse order: 015, 014 and 013 first (014 and 013 point at
--         series_themes and characters; the drop fails, changing nothing, while they exist), then this file, then 010.
-- Rows:   7 tables, 1 view and 3 columns dropped. Refused, with nothing changed, while any of the seven tables holds a row, any
--         quiz carries a spoiler column, any entity_sources row carries a source_url or a new type or source, or any trivia row
--         carries a new kind (the launch rows would be lost).
-- Verify: select count(*) from pg_class where relnamespace = 'public'::regnamespace and relname in ('series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters', 'favourite_character_counts');   expect 0
--         select pg_get_constraintdef(oid) from pg_constraint where conname = 'trivia_entity_kind_check';   expect the six kinds of today
--         a catalog dump (pg_dump --schema-only) of public equals the one taken before 009
-- Undo:   run 011-anime-series.sql again.
-- o1-transaction: single (psql --single-transaction). Idempotent: a second run changes nothing.

set lock_timeout = '5s';
set client_min_messages = warning;

do $$
declare
  t text;
  n bigint;
  msg text := '';
begin
  foreach t in array array['series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters'] loop
    if to_regclass('public.' || t) is not null then
      execute format('select count(*) from public.%I', t) into n;
      if n > 0 then msg := msg || t || ' (' || n || ' rows) '; end if;
    end if;
  end loop;
  if exists (select 1 from pg_attribute where attrelid = 'public.quizzes'::regclass and attname = 'spoiler_arc_ord' and not attisdropped) then
    select count(*) into n from public.quizzes where spoiler_arc_ord is not null or spoiler_scope is not null;
    if n > 0 then msg := msg || 'quizzes spoiler columns (' || n || ' rows) '; end if;
  end if;
  select count(*) into n from public.trivia where entity_kind not in ('group', 'idol', 'album', 'track', 'era', 'award');
  if n > 0 then msg := msg || 'trivia with a new kind (' || n || ' rows) '; end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.entity_sources'::regclass and attname = 'source_url' and not attisdropped) then
    select count(*) into n from public.entity_sources
     where source_url is not null or entity_type not in ('group', 'group_unit', 'idol', 'album', 'album_track', 'song') or source not in ('wikidata', 'musicbrainz');
  else
    select count(*) into n from public.entity_sources
     where entity_type not in ('group', 'group_unit', 'idol', 'album', 'album_track', 'song') or source not in ('wikidata', 'musicbrainz');
  end if;
  if n > 0 then msg := msg || 'entity_sources with a source_url, a new type or a new source (' || n || ' rows) '; end if;
  if msg <> '' then
    raise exception '011-anime-series rollback refused: launch data would be lost: %; remove it deliberately first', msg;
  end if;
end $$;

drop view if exists public.favourite_character_counts;
drop table if exists public.favourite_characters;
drop table if exists public.series_progress;
drop table if exists public.series_themes;
drop table if exists public.episodes;
drop table if exists public.characters;
drop table if exists public.arcs;
drop table if exists public.series;

alter table public.quizzes drop column if exists spoiler_arc_ord;
alter table public.quizzes drop column if exists spoiler_scope;
alter table public.entity_sources drop column if exists source_url;

-- today's checks (verbatim from the production dump)
alter table only public.trivia drop constraint if exists trivia_entity_kind_check;
ALTER TABLE ONLY public.trivia ADD CONSTRAINT trivia_entity_kind_check CHECK ((entity_kind = ANY (ARRAY['group'::text, 'idol'::text, 'album'::text, 'track'::text, 'era'::text, 'award'::text])));
alter table only public.entity_sources drop constraint if exists entity_sources_entity_type_check;
ALTER TABLE ONLY public.entity_sources ADD CONSTRAINT entity_sources_entity_type_check CHECK ((entity_type = ANY (ARRAY['group'::text, 'group_unit'::text, 'idol'::text, 'album'::text, 'album_track'::text, 'song'::text])));
alter table only public.entity_sources drop constraint if exists entity_sources_source_check;
ALTER TABLE ONLY public.entity_sources ADD CONSTRAINT entity_sources_source_check CHECK ((source = ANY (ARRAY['wikidata'::text, 'musicbrainz'::text])));
