-- Run O1, lane O1 (lot a, finishing): the spoiler reports of 015 do not feed the report trigger. Runs on o1-scratch inside
-- BEGIN ... ROLLBACK (nothing persists): five spoiler reports leave quizzes.report_count and the quiz status untouched, a normal
-- report still counts, spoiler reporters do not count toward the five reporters that flag a quiz, the roles are right, and a
-- database that has the first version of 015 (spoiler rows in public.reports) is moved to the table by running the file again.
-- Output: lines "CHK <name> ok" or "CHK <name> FAIL <detail>", then "CHK TOTAL pass=<n> fail=<n>".
-- Run with:  psql "$O1_DB_URL" -X -q -v ON_ERROR_STOP=1 -v migration=<path of 015-spoilers.sql> -f spoiler-reports.sql
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

-- fixtures: 8 readers, one anime group, four published quizzes (spoiler, normal, mixed, transition) and one draft
create temp table u as
  select i, md5('chk-o1-user-' || i)::uuid as id, 'chk_o1_' || i as username from generate_series(1, 8) i;
insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
select id, 'authenticated', 'authenticated', username || '@chk-o1.invalid', now(), '{}'::jsonb, '{}'::jsonb, now(), now() from u;
insert into public.profiles (id, username, avatar_bg, avatar_text) select id, username, '#222222', 'C' from u;
create function pg_temp.uid(p_i integer) returns uuid language sql as $$ select id from u where i = p_i $$;
insert into public.groups (name, slug, display_color, text_color, site_id) values ('Chk O1 One', 'chk-o1-one', '#111111', '#ffffff', 'anime');
insert into public.quizzes (id, creator_id, group_id, title, slug, questions, status, site_id)
select md5('chk-o1-' || s.slug)::uuid, pg_temp.uid(1), g.id, 'Chk O1 ' || s.slug, 'chk-o1-' || s.slug, '[1, 2, 3]'::jsonb, s.st, 'anime'
  from public.groups g cross join (values ('spoiler', 'published'), ('normal', 'published'), ('mixed', 'published'), ('move', 'published'), ('draft', 'draft')) s(slug, st)
 where g.slug = 'chk-o1-one';
create function pg_temp.qid(p_slug text) returns uuid language sql as $$ select md5('chk-o1-' || p_slug)::uuid $$;
create function pg_temp.rs(p_slug text, p_i integer) returns text language sql as $$
  select pg_temp.as_role('authenticated', pg_temp.uid(p_i), format($q$select public.report_spoiler(%L::uuid)::text$q$, pg_temp.qid(p_slug)))
$$;

-- 1. five spoiler reports on a young quiz: the count is returned, the cover comes at the third, nothing else moves
create temp table rs_out (step text, v text);
insert into rs_out values ('u1', pg_temp.rs('spoiler', 1));
insert into rs_out values ('u2', pg_temp.rs('spoiler', 2));
insert into rs_out values ('u3', pg_temp.rs('spoiler', 3));
insert into rs_out values ('u4', pg_temp.rs('spoiler', 4));
insert into rs_out values ('u5', pg_temp.rs('spoiler', 5));
insert into rs_out values ('u5 again', pg_temp.rs('spoiler', 5));
select pg_temp.chk('five spoiler reports count 1 to 5, a repeat by the same reader changes nothing',
  (select array_agg(v order by ord) from (select v, row_number() over () as ord from rs_out) s) = array['1', '2', '3', '4', '5', '5']);
select pg_temp.chk('five spoiler reports leave report_count at 0 and the quiz published',
  (select report_count = 0 and status = 'published' from public.quizzes where id = pg_temp.qid('spoiler')));
select pg_temp.chk('the five reports are rows of spoiler_reports (pending, the quiz''s site), and public.reports has none',
  (select count(*) from public.spoiler_reports where quiz_id = pg_temp.qid('spoiler') and status = 'pending' and site_id = 'anime') = 5
  and (select count(*) from public.reports where quiz_id = pg_temp.qid('spoiler')) = 0);
select pg_temp.chk('the cover is set (about 7 days) and the quiz is still published',
  (select spoiler_cover_until > now() + interval '6 days' and spoiler_cover_until <= now() + interval '7 days' and status = 'published' from public.quizzes where id = pg_temp.qid('spoiler')));

-- 2. a normal report still counts through the existing trigger
insert into public.reports (quiz_id, reporter_id, reason) values (pg_temp.qid('normal'), pg_temp.uid(1), 'spam');
select pg_temp.chk('a normal report still adds 1 to report_count (the trigger is untouched)',
  (select report_count = 1 and status = 'published' from public.quizzes where id = pg_temp.qid('normal')));

-- 3. spoiler reporters do not count toward the five reporters that flag a quiz: 4 spoiler readers + 1 normal reporter stay published
insert into rs_out values ('mixed 1', pg_temp.rs('mixed', 1));
insert into rs_out values ('mixed 2', pg_temp.rs('mixed', 2));
insert into rs_out values ('mixed 3', pg_temp.rs('mixed', 3));
insert into rs_out values ('mixed 4', pg_temp.rs('mixed', 4));
insert into public.reports (quiz_id, reporter_id, reason) values (pg_temp.qid('mixed'), pg_temp.uid(5), 'wrong_answers');
select pg_temp.chk('4 spoiler readers and 1 normal reporter: report_count is 1 and the quiz stays published',
  (select report_count = 1 and status = 'published' from public.quizzes where id = pg_temp.qid('mixed')));

-- 4. roles and arguments
select pg_temp.chk('no session raises 28000; an unknown quiz and a draft raise P0002',
  pg_temp.as_role('service_role', null, format($q$select public.report_spoiler(%L::uuid)::text$q$, pg_temp.qid('spoiler'))) like 'ERR:28000:%'
  and pg_temp.rs('nope', 6) like 'ERR:P0002:%'
  and pg_temp.rs('draft', 6) like 'ERR:P0002:%');
select pg_temp.chk('anon cannot call report_spoiler; authenticated can; PUBLIC cannot',
  pg_temp.as_role('anon', null, format($q$select public.report_spoiler(%L::uuid)::text$q$, pg_temp.qid('spoiler'))) like 'ERR:42501:%'
  and has_function_privilege('authenticated', 'public.report_spoiler(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.report_spoiler(uuid)', 'execute')
  and not has_function_privilege('public', 'public.report_spoiler(uuid)', 'execute'));
select pg_temp.chk('spoiler_reports is closed to anon and authenticated (RLS on, no grant)',
  (select relrowsecurity from pg_class where oid = 'public.spoiler_reports'::regclass)
  and not has_table_privilege('anon', 'public.spoiler_reports', 'select')
  and not has_table_privilege('authenticated', 'public.spoiler_reports', 'select')
  and pg_temp.as_role('authenticated', pg_temp.uid(1), $q$select count(*)::text from public.spoiler_reports$q$) like 'ERR:42501:%');
select pg_temp.chk('reason_valid is today''s five reasons and reports_spoiler_once does not exist',
  (select pg_get_constraintdef(oid) not like '%spoiler%' from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass)
  and (select count(*) from pg_indexes where indexname = 'reports_spoiler_once') = 0);

-- 5. a database with the first version of 015: spoiler rows in public.reports move to the table when the file is run again
alter table public.reports drop constraint reason_valid;
alter table public.reports add constraint reason_valid check (reason in ('wrong_answers', 'spam', 'inappropriate', 'duplicate', 'other', 'spoiler'));
create unique index reports_spoiler_once on public.reports (quiz_id, reporter_id) where reason = 'spoiler';
insert into public.reports (quiz_id, reporter_id, reason, site_id) values
  (pg_temp.qid('move'), pg_temp.uid(1), 'spoiler', 'anime'), (pg_temp.qid('move'), pg_temp.uid(2), 'spoiler', 'anime');
select pg_temp.chk('first version simulated: the two spoiler rows had added 2 to report_count',
  (select report_count = 2 from public.quizzes where id = pg_temp.qid('move')));
\i :migration
select pg_temp.chk('the file moves them: 2 rows in spoiler_reports, none in reports, report_count back to 0, five reasons, no index',
  (select count(*) from public.spoiler_reports where quiz_id = pg_temp.qid('move')) = 2
  and (select count(*) from public.reports where quiz_id = pg_temp.qid('move')) = 0
  and (select report_count = 0 and status = 'published' from public.quizzes where id = pg_temp.qid('move'))
  and (select pg_get_constraintdef(oid) not like '%spoiler%' from pg_constraint where conname = 'reason_valid' and conrelid = 'public.reports'::regclass)
  and (select count(*) from pg_indexes where indexname = 'reports_spoiler_once') = 0);
\i :migration
select pg_temp.chk('run again it changes nothing (idempotent)',
  (select count(*) from public.spoiler_reports where quiz_id = pg_temp.qid('move')) = 2
  and (select report_count = 0 from public.quizzes where id = pg_temp.qid('move'))
  and (select count(*) from public.spoiler_reports where quiz_id = pg_temp.qid('spoiler')) = 5);

select 'CHK ' || name || case when ok then ' ok' else ' FAIL' || coalesce(' (' || detail || ')', '') end from chk_results order by n;
select 'CHK TOTAL pass=' || count(*) filter (where ok) || ' fail=' || count(*) filter (where not ok) from chk_results;

rollback;
