-- Lot (e) part 1, lane K1: behaviour of the 011 to 015 objects on o1-scratch (011 anime series and user tables, 012 review
-- batches, 013 formats, 014 daily openings, 015 spoilers) through the roles that will really call them.
--
-- Everything runs inside BEGIN ... ROLLBACK, nothing persists. Output: lines "CHK <name> ok" or "CHK <name> FAIL <detail>",
-- then "CHK TOTAL pass=<n> fail=<n>". The daily quiz of 010 has its own batch (daily.sql).
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset footer off
set client_min_messages = warning;

begin;

create temp table chk_results (n serial, name text, ok boolean, detail text);
create function pg_temp.chk(p_name text, p_ok boolean, p_detail text default null) returns void language sql as $$
  insert into chk_results (name, ok, detail) values (p_name, coalesce(p_ok, false), p_detail);
$$;
-- runs one statement (one text column, one row) as a role with a JWT subject, returns the text or 'ERR:<sqlstate>:<message>'
create function pg_temp.as_role(p_role text, p_sub uuid, p_sql text) returns text language plpgsql as $$
declare v text;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub::text, ''), true);
  execute format('set local role %I', p_role);
  begin
    execute p_sql into v;
  exception when others then
    v := 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return coalesce(v, 'null');
end $$;
-- runs one DML statement as a role with a JWT subject, returns the row count or 'ERR:<sqlstate>:<message>'
create function pg_temp.dml(p_role text, p_sub uuid, p_sql text) returns text language plpgsql as $$
declare v text; n bigint;
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_sub::text, ''), true);
  execute format('set local role %I', p_role);
  begin
    execute p_sql;
    get diagnostics n = row_count;
    v := n::text;
  exception when others then
    v := 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  return v;
end $$;
create function pg_temp.raises(p_sql text) returns boolean language plpgsql as $$
begin
  execute p_sql;
  return false;
exception when others then
  return true;
end $$;

-- ---------------------------------------------------------------- fixtures
-- 34 users: A, B, C, D, E plus 29 more (the view threshold needs 30 pickers)
create temp table u as
  select i, md5('chk-k1-user-' || i)::uuid as id, 'chk_k1_' || i as username from generate_series(1, 34) i;
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select id, 'authenticated', 'authenticated', username || '@chk-k1.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now() from u;
insert into public.profiles (id, username, avatar_bg, avatar_text) select id, username, '#222222', 'C' from u;
create function pg_temp.uid(p_i integer) returns uuid language sql as $$ select id from u where i = p_i $$;

-- three anime series (one and two published, three not; four has no series row), one kpop group with a series row (never an anime pick)
insert into public.groups (name, slug, display_color, text_color, site_id) values
  ('Chk K1 One', 'chk-k1-one', '#111111', '#ffffff', 'anime'),
  ('Chk K1 Two', 'chk-k1-two', '#111111', '#ffffff', 'anime'),
  ('Chk K1 Three', 'chk-k1-three', '#111111', '#ffffff', 'anime'),
  ('Chk K1 Four', 'chk-k1-four', '#111111', '#ffffff', 'anime');
insert into public.groups (name, slug, display_color, text_color) values ('Chk K1 Kpop', 'chk-k1-kpop', '#111111', '#ffffff');
create temp table g as select row_number() over (order by slug)::integer as gi, id, slug from public.groups where slug like 'chk-k1-%';
insert into public.series (group_id, type, title_en, status, published)
select id, 'anime_manga', 'Chk K1 ' || slug, 'finished', slug in ('chk-k1-one', 'chk-k1-two', 'chk-k1-kpop') from g where slug <> 'chk-k1-four';

-- arcs, characters, episodes, themes (published and not)
insert into public.arcs (group_id, ord, name, kind, status)
select id, o, 'Chk K1 arc ' || o, 'arc', case when o = 1 then 'published' else 'draft' end from g cross join generate_series(1, 2) o where slug = 'chk-k1-one';
insert into public.characters (group_id, slug, name, role, status)
select id, 'chk-k1-' || s, 'Chk K1 character ' || s, 'main', case when s = 'pub' then 'published' else 'hidden' end from g cross join unnest(array['pub', 'hid']) s where slug = 'chk-k1-one';
insert into public.episodes (group_id, number, status)
select id, n, case when n = 1 then 'published' else 'draft' end from g cross join generate_series(1, 2) n where slug = 'chk-k1-one';
-- themes: one (kind, number) per row; playable and published unless noted
insert into public.series_themes (group_id, kind, number, title, artist, deezer_playable, status)
select g.id, t.kind, t.number, 'Chk K1 ' || g.slug || ' ' || t.kind || t.number, 'Chk artist', t.playable, t.status
  from g join (values
    ('chk-k1-one', 'op', 1, true, 'published'), ('chk-k1-one', 'op', 2, true, 'published'),
    ('chk-k1-one', 'ed', 1, false, 'published'), ('chk-k1-one', 'ed', 2, true, 'draft'),
    ('chk-k1-two', 'op', 1, true, 'published'), ('chk-k1-two', 'op', 2, true, 'published'),
    ('chk-k1-three', 'op', 1, true, 'published'),
    ('chk-k1-kpop', 'op', 1, true, 'published')
  ) t(slug, kind, number, playable, status) on t.slug = g.slug;

-- ---------------------------------------------------------------- 011: table shapes, RLS and policies
select pg_temp.chk('011 the seven tables exist with RLS on',
  (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity
      and relname in ('series', 'arcs', 'characters', 'episodes', 'series_themes', 'series_progress', 'favourite_characters')) = 7);
select pg_temp.chk('011 13 policies: 5 public reads, 4 + 4 own rows',
  (select count(*) from pg_policy where polrelid in ('public.series'::regclass, 'public.arcs'::regclass, 'public.characters'::regclass, 'public.episodes'::regclass,
      'public.series_themes'::regclass, 'public.series_progress'::regclass, 'public.favourite_characters'::regclass)) = 13);
select pg_temp.chk('011 anon reads only the published series (2 of 3 fixtures; the kpop group row is published too)',
  pg_temp.as_role('anon', null, $q$select count(*)::text from public.series where title_en like 'Chk K1 %'$q$) = '3');
select pg_temp.chk('011 anon reads only published arcs, characters, episodes and themes',
  pg_temp.as_role('anon', null, $q$select count(*)::text from public.arcs where name like 'Chk K1 %'$q$) = '1'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.characters where name like 'Chk K1 %'$q$) = '1'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.episodes e join public.groups g on g.id = e.group_id where g.slug = 'chk-k1-one'$q$) = '1'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.series_themes where title like 'Chk K1 %'$q$) = '7');
select pg_temp.chk('011 anon and authenticated cannot write the catalogue (no write policy)',
  pg_temp.dml('anon', null, $q$insert into public.series (group_id, type, title_en, status) values (1, 'manga', 'x', 'ongoing')$q$) like 'ERR:%'
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$update public.series set title_en = 'hacked' where title_en like 'Chk K1 %'$q$) = '0'
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$delete from public.characters where name like 'Chk K1 %'$q$) = '0'
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$insert into public.arcs (group_id, ord, name, kind) values (1, 9, 'x', 'arc')$q$) like 'ERR:%');
create temp table g3 as select id from g where slug = 'chk-k1-four';
select pg_temp.chk('011 series.type, status, tier, wikidata_qid and the json array checks refuse bad values',
  pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status) values (%s, 'bogus', 'x', 'ongoing')$f$, (select id from g3)))
  and pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status) values (%s, 'manga', 'x', 'bogus')$f$, (select id from g3)))
  and pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status, tier) values (%s, 'manga', 'x', 'ongoing', 'Z')$f$, (select id from g3)))
  and pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status, wikidata_qid) values (%s, 'manga', 'x', 'ongoing', 'Z12')$f$, (select id from g3)))
  and pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status, studios) values (%s, 'manga', 'x', 'ongoing', '{}'::jsonb)$f$, (select id from g3)))
  and not pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status, tier, wikidata_qid) values (%s, 'manga', 'x', 'ongoing', 'B', 'Q42')$f$, (select id from g3))));
delete from public.series where group_id = (select id from g3);
select pg_temp.chk('011 one series row per group (the key is group_id)',
  pg_temp.raises(format($f$insert into public.series (group_id, type, title_en, status) values (%s, 'manga', 'dup', 'ongoing')$f$, (select id from g where slug = 'chk-k1-one'))));

-- own rows: series_progress
select pg_temp.chk('011 series_progress: a user inserts, reads, updates and deletes their own row',
  pg_temp.dml('authenticated', pg_temp.uid(1), format($f$insert into public.series_progress (user_id, group_id, arc_ord) values ('%s', %s, 3)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one'))) = '1'
  and pg_temp.as_role('authenticated', pg_temp.uid(1), $q$select arc_ord::text from public.series_progress$q$) = '3'
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$update public.series_progress set arc_ord = 5$q$) = '1'
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$delete from public.series_progress$q$) = '1');
select pg_temp.chk('011 series_progress: no insert for another user, no read or write of another user''s row, anon sees none',
  pg_temp.dml('authenticated', pg_temp.uid(2), format($f$insert into public.series_progress (user_id, group_id) values ('%s', %s)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one'))) like 'ERR:42501:%'
  and (select pg_temp.dml('authenticated', pg_temp.uid(1), format($f$insert into public.series_progress (user_id, group_id) values ('%s', %s)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one')))) = '1'
  and pg_temp.as_role('authenticated', pg_temp.uid(2), $q$select count(*)::text from public.series_progress$q$) = '0'
  and pg_temp.dml('authenticated', pg_temp.uid(2), $q$update public.series_progress set arc_ord = 9$q$) = '0'
  and pg_temp.dml('authenticated', pg_temp.uid(2), $q$delete from public.series_progress$q$) = '0'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.series_progress$q$) = '0');
select pg_temp.chk('011 series_progress: medium and arc_ord checks',
  pg_temp.raises(format($f$insert into public.series_progress (user_id, group_id, medium) values ('%s', %s, 'novel')$f$, pg_temp.uid(3), (select id from g where slug = 'chk-k1-one')))
  and pg_temp.raises(format($f$insert into public.series_progress (user_id, group_id, arc_ord) values ('%s', %s, -1)$f$, pg_temp.uid(3), (select id from g where slug = 'chk-k1-one'))));

-- own rows: favourite_characters and the 30-pick view
create temp table c as select id from public.characters where slug = 'chk-k1-pub';
select pg_temp.chk('011 favourite_characters: own rows only (insert, read, update, delete), one oshi per series',
  pg_temp.dml('authenticated', pg_temp.uid(1), format($f$insert into public.favourite_characters (user_id, group_id, character_id) values ('%s', %s, %s)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one'), (select id from c))) = '1'
  and pg_temp.dml('authenticated', pg_temp.uid(2), format($f$insert into public.favourite_characters (user_id, group_id, character_id) values ('%s', %s, %s)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one'), (select id from c))) like 'ERR:42501:%'
  and pg_temp.as_role('authenticated', pg_temp.uid(2), $q$select count(*)::text from public.favourite_characters$q$) = '0'
  and pg_temp.as_role('authenticated', pg_temp.uid(1), $q$select count(*)::text from public.favourite_characters$q$) = '1'
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.favourite_characters$q$) = '0'
  and pg_temp.raises(format($f$insert into public.favourite_characters (user_id, group_id, character_id) values ('%s', %s, %s)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one'), (select id from c)))
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$delete from public.favourite_characters$q$) = '1');
-- 29 picks: no row in the view; 30 picks: one row with 30
insert into public.favourite_characters (user_id, group_id, character_id)
select id, (select id from g where slug = 'chk-k1-one'), (select id from c) from u where i <= 29;
select pg_temp.chk('011 favourite_character_counts shows nothing under 30 picks (29)',
  pg_temp.as_role('anon', null, format($f$select count(*)::text from public.favourite_character_counts where character_id = %s$f$, (select id from c))) = '0');
insert into public.favourite_characters (user_id, group_id, character_id)
select id, (select id from g where slug = 'chk-k1-one'), (select id from c) from u where i = 30;
select pg_temp.chk('011 favourite_character_counts shows the pick count from 30 picks, to anon, authenticated and service_role; no write',
  pg_temp.as_role('anon', null, format($f$select picks::text from public.favourite_character_counts where character_id = %s$f$, (select id from c))) = '30'
  and pg_temp.as_role('authenticated', pg_temp.uid(31), format($f$select picks::text from public.favourite_character_counts where character_id = %s$f$, (select id from c))) = '30'
  and pg_temp.as_role('service_role', null, format($f$select picks::text from public.favourite_character_counts where character_id = %s$f$, (select id from c))) = '30'
  and pg_temp.dml('authenticated', pg_temp.uid(31), $q$delete from public.favourite_character_counts$q$) like 'ERR:%'
  and not has_table_privilege('anon', 'public.favourite_character_counts', 'insert')
  and not has_table_privilege('authenticated', 'public.favourite_character_counts', 'update'));
delete from public.favourite_characters;

select pg_temp.chk('011 widened checks: trivia kinds series/character/arc/theme and entity_sources types accept; bad values refused',
  (select pg_get_constraintdef(oid) like '%series%character%arc%theme%' from pg_constraint where conname = 'trivia_entity_kind_check' and conrelid = 'public.trivia'::regclass)
  and (select pg_get_constraintdef(oid) like '%series_theme%' from pg_constraint where conname = 'entity_sources_entity_type_check')
  and (select pg_get_constraintdef(oid) like '%wikipedia%official%' from pg_constraint where conname = 'entity_sources_source_check')
  and pg_temp.raises($q$insert into public.trivia (entity_kind, entity_id, fact) values ('bogus', 1, 'x')$q$));
select pg_temp.chk('011 quizzes spoiler_arc_ord and spoiler_scope exist with their checks',
  (select count(*) from pg_attribute where attrelid = 'public.quizzes'::regclass and attname in ('spoiler_arc_ord', 'spoiler_scope', 'spoiler_cover_until') and not attisdropped) = 3
  and pg_temp.raises(format($f$insert into public.quizzes (creator_id, group_id, title, slug, questions, spoiler_scope) values ('%s', %s, 'Spoiler scope test', 'chk-k1-scope', '[1,2,3]'::jsonb, 'novel')$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one')))
  and pg_temp.raises(format($f$insert into public.quizzes (creator_id, group_id, title, slug, questions, spoiler_arc_ord) values ('%s', %s, 'Spoiler arc test', 'chk-k1-arc', '[1,2,3]'::jsonb, -1)$f$, pg_temp.uid(1), (select id from g where slug = 'chk-k1-one'))));

-- ---------------------------------------------------------------- 012: review batches
select pg_temp.chk('012 review_batches: RLS on, no policy, closed to anon and authenticated',
  (select relrowsecurity from pg_class where oid = 'public.review_batches'::regclass)
  and (select count(*) from pg_policy where polrelid = 'public.review_batches'::regclass) = 0
  and pg_temp.as_role('anon', null, $q$select count(*)::text from public.review_batches$q$) like 'ERR:42501:%'
  and pg_temp.as_role('authenticated', pg_temp.uid(1), $q$select count(*)::text from public.review_batches$q$) like 'ERR:42501:%'
  and pg_temp.as_role('service_role', null, $q$select count(*)::text from public.review_batches$q$) is not null);
select pg_temp.chk('012 review_batches: size 1 to 50, status values, reviewed_by and reviewed_at required once not open',
  pg_temp.raises($q$insert into public.review_batches (site_id, lane, label, size) values ('anime', 'e1b', 'x', 0)$q$)
  and pg_temp.raises($q$insert into public.review_batches (site_id, lane, label, size) values ('anime', 'e1b', 'x', 51)$q$)
  and pg_temp.raises($q$insert into public.review_batches (site_id, lane, label, size, status) values ('anime', 'e1b', 'x', 10, 'done')$q$)
  and pg_temp.raises($q$insert into public.review_batches (site_id, lane, label, size, status) values ('anime', 'e1b', 'x', 10, 'approved')$q$)
  and pg_temp.raises($q$insert into public.review_batches (site_id, lane, label, size) values ('nosuchsite', 'e1b', 'x', 10)$q$)
  and (select pg_temp.dml('service_role', null, $q$insert into public.review_batches (site_id, lane, label, size) values ('anime', 'e1b', 'Chk K1 batch', 10)$q$)) = '1'
  and (select pg_temp.dml('service_role', null, format($f$update public.review_batches set status = 'approved', reviewed_by = '%s', reviewed_at = now() where label = 'Chk K1 batch'$f$, pg_temp.uid(1)))) = '1');
insert into public.editorial_accounts (user_id, display_name, beat, site_id)
select pg_temp.uid(1), 'Chk K1 desk', 'anime', 'anime';
select pg_temp.chk('012 editorial_drafts: a quiz draft needs an object payload and takes a review batch; thread, debate and blog drafts stay as they were',
  not pg_temp.raises(format($f$insert into public.editorial_drafts (account_id, kind, title, payload, review_batch_id, site_id) values ('%s', 'quiz', 'Chk K1 quiz draft', '{"questions":[]}'::jsonb, (select id from public.review_batches where label = 'Chk K1 batch'), 'anime')$f$, pg_temp.uid(1)))
  and pg_temp.raises(format($f$insert into public.editorial_drafts (account_id, kind, title, site_id) values ('%s', 'quiz', 'Chk K1 quiz no payload', 'anime')$f$, pg_temp.uid(1)))
  and pg_temp.raises(format($f$insert into public.editorial_drafts (account_id, kind, title, payload, site_id) values ('%s', 'quiz', 'Chk K1 quiz array payload', '[]'::jsonb, 'anime')$f$, pg_temp.uid(1)))
  and not pg_temp.raises(format($f$insert into public.editorial_drafts (account_id, kind, title, site_id) values ('%s', 'thread', 'Chk K1 thread draft', 'anime')$f$, pg_temp.uid(1)))
  and not pg_temp.raises(format($f$insert into public.editorial_drafts (account_id, kind, title, site_id) values ('%s', 'blog', 'Chk K1 blog draft', 'anime')$f$, pg_temp.uid(1)))
  and pg_temp.raises(format($f$insert into public.editorial_drafts (account_id, kind, title, site_id) values ('%s', 'poll', 'Chk K1 poll draft', 'anime')$f$, pg_temp.uid(1))));
create temp table del_batch as select pg_temp.dml('service_role', null, $q$delete from public.review_batches where label = 'Chk K1 batch'$q$) as r;
select pg_temp.chk('012 a deleted review batch clears the batch id of its drafts (on delete set null)',
  (select r from del_batch) = '1'
  and (select review_batch_id is null from public.editorial_drafts where title = 'Chk K1 quiz draft'));

-- ---------------------------------------------------------------- 013: formats
select pg_temp.chk('013 personality_profiles.character_id references characters and clears on delete; games_game_type_check holds the eight types',
  (select confdeltype = 'n' from pg_constraint where conname = 'personality_profiles_character_id_fkey')
  and (select convalidated from pg_constraint where conname = 'games_game_type_check')
  and (select bool_and(pg_get_constraintdef(c.oid) like '%''' || t || '''%')
         from pg_constraint c, unnest(array['this_or_that', 'blind_test', 'name_all_members', 'name_all_songs', 'name_top_songs', 'name_all_groups', 'name_all_idols', 'name_all_characters']) t
        where c.conname = 'games_game_type_check'));
insert into public.personality_profiles (group_id, member_name, member_slug, axes, trait_lines, ord, active, site_id, character_id)
select (select id from g where slug = 'chk-k1-one'), 'Chk K1', 'chk-k1', '{}'::jsonb, array['a'], 1, true, 'anime', (select id from c);
delete from public.characters where id = (select id from c);
select pg_temp.chk('013 deleting a character sets personality_profiles.character_id to null',
  (select character_id is null from public.personality_profiles where member_slug = 'chk-k1'));

-- ---------------------------------------------------------------- 009: quiz_bank category check and per-site keys
select pg_temp.chk('009 quiz_bank_category_check accepts the twelve categories and refuses others',
  (select convalidated from pg_constraint where conname = 'quiz_bank_category_check')
  and pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status) values ('Chk K1 bad category', 'bogus', '[1,2,3]'::jsonb, 'draft')$q$)
  and not pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status) values ('Chk K1 crossover', 'crossover', '[1,2,3]'::jsonb, 'draft')$q$)
  and not pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status) values ('Chk K1 era', 'era', '[1,2,3]'::jsonb, 'draft')$q$));
select pg_temp.chk('009 the same date is allowed for two sites and refused twice for one (quiz_bank and qotd_log)',
  not pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status, scheduled_date, site_id) values ('Chk K1 a', 'fun', '[1,2,3]'::jsonb, 'draft', '2033-01-01', 'kpop')$q$)
  and not pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status, scheduled_date, site_id) values ('Chk K1 b', 'series_specific', '[1,2,3]'::jsonb, 'draft', '2033-01-01', 'anime')$q$)
  and pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status, scheduled_date, site_id) values ('Chk K1 c', 'fun', '[1,2,3]'::jsonb, 'draft', '2033-01-01', 'kpop')$q$)
  and not pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status, scheduled_date, site_id) values ('Chk K1 d', 'fun', '[1,2,3]'::jsonb, 'draft', null, 'kpop')$q$)
  and not pg_temp.raises($q$insert into public.quiz_bank (title, category, questions, status, scheduled_date, site_id) values ('Chk K1 e', 'fun', '[1,2,3]'::jsonb, 'draft', null, 'kpop')$q$));
select pg_temp.chk('009 sites: kpop carries the system author and the fallback group, the others nothing; the author foreign key holds',
  (select system_user_id = '00000000-0000-0000-0000-000000000001' and fallback_group_slug = 'general-kpop' from public.sites where id = 'kpop')
  and pg_temp.raises($q$update public.sites set system_user_id = '99999999-9999-9999-9999-999999999999' where id = 'hub'$q$));

-- ---------------------------------------------------------------- 014: daily openings
create temp table op (d date primary key, theme integer, series integer);
do $$
declare
  r date;
  t integer;
begin
  for r in select (date '2033-03-01' + i) from generate_series(0, 9) i loop
    t := public.ensure_daily_opening(r, 'anime');
    insert into op select r, t, (select group_id from public.series_themes where id = t);
  end loop;
end $$;
select pg_temp.chk('014 ten days of openings: every day files a theme',
  (select count(theme) from op) = 10);
select pg_temp.chk('014 the first four days file four different themes (never filed first), the series changes every day',
  (select count(distinct theme) from op where d <= '2033-03-04') = 4
  and (select count(*) from op a join op b on b.d = a.d + 1 where a.series = b.series) = 0);
select pg_temp.chk('014 only published, playable themes of published anime series are filed (no draft, no unplayable, no unpublished series, no kpop group)',
  (select count(*) from op o join public.series_themes t on t.id = o.theme join public.series s on s.group_id = t.group_id join public.groups g on g.id = s.group_id
    where t.status <> 'published' or t.deezer_playable is not true or not s.published or g.site_id <> 'anime') = 0);
select pg_temp.chk('014 days 5 to 8 file the four themes again (the one filed longest ago first) before any theme repeats within them',
  (select count(distinct theme) from op where d between '2033-03-05' and '2033-03-08') = 4
  and (select array_agg(theme order by d) from op where d between '2033-03-05' and '2033-03-08') = (select array_agg(theme order by d) from op where d between '2033-03-01' and '2033-03-04'));
select pg_temp.chk('014 a second call returns the stored theme and files nothing more; daily_openings holds one row a day',
  (select public.ensure_daily_opening('2033-03-02', 'anime')) = (select theme from op where d = '2033-03-02')
  and (select count(*) from public.daily_openings where site_id = 'anime' and date between '2033-03-01' and '2033-03-10') = 10);
select pg_temp.chk('014 an unknown site, a site without themes (hub) and null arguments return null',
  public.ensure_daily_opening('2033-03-01', 'nosuchsite') is null
  and public.ensure_daily_opening('2033-03-20', 'hub') is null
  and public.ensure_daily_opening(null, 'anime') is null
  and public.ensure_daily_opening('2033-03-20', null) is null);
select pg_temp.chk('014 daily_openings: anon and authenticated read, nobody writes but the service role; the function is service role only',
  pg_temp.as_role('anon', null, $q$select count(*)::text from public.daily_openings where date between '2033-03-01' and '2033-03-10'$q$) = '10'
  and pg_temp.dml('authenticated', pg_temp.uid(1), $q$delete from public.daily_openings$q$) = '0'
  and pg_temp.dml('anon', null, $q$insert into public.daily_openings (site_id, date, theme_id) values ('anime', '2033-04-01', 1)$q$) like 'ERR:42501:%'
  and pg_temp.as_role('anon', null, $q$select public.ensure_daily_opening('2033-04-01', 'anime')::text$q$) like 'ERR:42501:%'
  and pg_temp.as_role('authenticated', pg_temp.uid(1), $q$select public.ensure_daily_opening('2033-04-01', 'anime')::text$q$) like 'ERR:42501:%'
  and has_function_privilege('service_role', 'public.ensure_daily_opening(date, text)', 'execute')
  and not has_function_privilege('public', 'public.ensure_daily_opening(date, text)', 'execute')
  and (select proacl::text from pg_proc where oid = 'public.ensure_daily_opening(date, text)'::regprocedure) = '{postgres=X/postgres,service_role=X/postgres}');
delete from public.daily_openings where date >= '2033-01-01';

-- ---------------------------------------------------------------- 015: spoiler reports
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status, site_id)
select md5('chk-k1-spoiler-quiz')::uuid, pg_temp.uid(1), g.id, 'Chk K1 spoiler quiz', 'chk-k1-spoiler-quiz', '[1, 2, 3]'::jsonb, 'published', 'anime' from g where slug = 'chk-k1-one';
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status, site_id)
select md5('chk-k1-spoiler-draft')::uuid, pg_temp.uid(1), g.id, 'Chk K1 spoiler draft', 'chk-k1-spoiler-draft', '[1, 2, 3]'::jsonb, 'draft', 'anime' from g where slug = 'chk-k1-one';
create function pg_temp.rs(p_i integer) returns text language sql as $$
  select pg_temp.as_role('authenticated', pg_temp.uid(p_i), $q$select public.report_spoiler(md5('chk-k1-spoiler-quiz')::uuid)::text$q$)
$$;
create temp table rs_out (step text, v text);
insert into rs_out values ('u1', pg_temp.rs(1));
insert into rs_out values ('u1 again', pg_temp.rs(1));
insert into rs_out values ('u2', pg_temp.rs(2));
insert into rs_out values ('cover before third', (select coalesce(spoiler_cover_until::text, 'none') from public.quizzes where id = md5('chk-k1-spoiler-quiz')::uuid));
insert into rs_out values ('u3', pg_temp.rs(3));
insert into rs_out values ('cover after third', (select (spoiler_cover_until > now() + interval '6 days' and spoiler_cover_until <= now() + interval '7 days')::text from public.quizzes where id = md5('chk-k1-spoiler-quiz')::uuid));
insert into rs_out values ('u3 again', pg_temp.rs(3));
insert into rs_out values ('u4', pg_temp.rs(4));
select pg_temp.chk('015 report_spoiler counts distinct reporters: 1, repeat unchanged (1), 2, then 3, repeat 3, then 4',
  (select array_agg(v order by ord) from (select v, row_number() over () as ord from rs_out where step in ('u1', 'u1 again', 'u2', 'u3', 'u3 again', 'u4')) s) = array['1', '1', '2', '3', '3', '4']);
select pg_temp.chk('015 the cover is set at the third distinct reporter only (7 days), the quiz stays published',
  (select v from rs_out where step = 'cover before third') = 'none'
  and (select v from rs_out where step = 'cover after third') = 'true'
  and (select status from public.quizzes where id = md5('chk-k1-spoiler-quiz')::uuid) = 'published');
select pg_temp.chk('015 one spoiler_reports row per reader (the quiz''s site), no reports row, report_count untouched (D-073)',
  (select count(*) from public.spoiler_reports where quiz_id = md5('chk-k1-spoiler-quiz')::uuid and site_id = 'anime' and status = 'pending') = 4
  and (select count(*) from public.reports where quiz_id = md5('chk-k1-spoiler-quiz')::uuid) = 0
  and (select report_count from public.quizzes where id = md5('chk-k1-spoiler-quiz')::uuid) = 0);
select pg_temp.chk('015 no session raises (28000), an unknown or unpublished quiz raises (P0002)',
  pg_temp.as_role('service_role', null, $q$select public.report_spoiler(md5('chk-k1-spoiler-quiz')::uuid)::text$q$) like 'ERR:28000:%'
  and pg_temp.as_role('authenticated', pg_temp.uid(5), $q$select public.report_spoiler(md5('chk-k1-no-such-quiz')::uuid)::text$q$) like 'ERR:P0002:%'
  and pg_temp.as_role('authenticated', pg_temp.uid(5), $q$select public.report_spoiler(md5('chk-k1-spoiler-draft')::uuid)::text$q$) like 'ERR:P0002:%');
select pg_temp.chk('015 report_spoiler is for authenticated (anon refused); reason_valid keeps its five reasons; spoiler_reports has RLS and one row per quiz and reader (D-073)',
  pg_temp.as_role('anon', null, $q$select public.report_spoiler(md5('chk-k1-spoiler-quiz')::uuid)::text$q$) like 'ERR:42501:%'
  and has_function_privilege('authenticated', 'public.report_spoiler(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.report_spoiler(uuid)', 'execute')
  and not has_function_privilege('public', 'public.report_spoiler(uuid)', 'execute')
  and (select pg_get_constraintdef(oid) not like '%spoiler%' from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass)
  and to_regclass('public.reports_spoiler_once') is null
  and (select relrowsecurity from pg_class where oid = 'public.spoiler_reports'::regclass)
  and (select pg_get_constraintdef(oid) = 'UNIQUE (quiz_id, reporter_id)' from pg_constraint where conname = 'spoiler_reports_quiz_reporter_key')
  and (select pg_get_constraintdef(oid) = 'PRIMARY KEY (id)' from pg_constraint where conname = 'spoiler_reports_pkey'));
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status)
select md5('chk-k1-kpop-quiz')::uuid, pg_temp.uid(1), g.id, 'Chk K1 kpop quiz', 'chk-k1-kpop-quiz', '[1, 2, 3]'::jsonb, 'published' from g where slug = 'chk-k1-kpop';
insert into rs_out values ('kpop u6', pg_temp.as_role('authenticated', pg_temp.uid(6), $q$select public.report_spoiler(md5('chk-k1-kpop-quiz')::uuid)::text$q$));
select pg_temp.chk('015 a kpop quiz can be reported too: the report carries the quiz''s own site, and no cover below three reporters',
  (select v from rs_out where step = 'kpop u6') = '1'
  and (select site_id from public.spoiler_reports where quiz_id = md5('chk-k1-kpop-quiz')::uuid) = 'kpop'
  and (select spoiler_cover_until is null from public.quizzes where id = md5('chk-k1-kpop-quiz')::uuid));
select pg_temp.chk('015 verse_threads.spoiler_flair takes 0 and up',
  (select count(*) from pg_constraint where conname = 'verse_threads_spoiler_flair_check') = 1);

-- ---------------------------------------------------------------- result
select 'CHK ' || name || case when ok then ' ok' else ' FAIL' || coalesce(' (' || detail || ')', '') end from chk_results order by n;
select 'CHK TOTAL pass=' || count(*) filter (where ok) || ' fail=' || count(*) filter (where not ok) from chk_results;

rollback;
