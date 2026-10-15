\set ON_ERROR_STOP on
-- Each check prints ok or raises.
create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if not coalesce(cond, false) then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$;

-- 1. quiz slug change records A->B
update public.quizzes set slug = 'bts-hard-v2' where slug = 'bts-hard';
select pg_temp.expect((select new_slug from seo_slug_redirects where kind='quiz' and old_slug='bts-hard') = 'bts-hard-v2', 'quiz rename records old -> new');

-- 2. second rename collapses the chain: A->C, B->C
update public.quizzes set slug = 'bts-hard-v3' where slug = 'bts-hard-v2';
select pg_temp.expect((select new_slug from seo_slug_redirects where kind='quiz' and old_slug='bts-hard') = 'bts-hard-v3', 'chain collapsed: first slug points at the newest');
select pg_temp.expect((select new_slug from seo_slug_redirects where kind='quiz' and old_slug='bts-hard-v2') = 'bts-hard-v3', 'middle slug points at the newest');
select pg_temp.expect((select count(*) from seo_slug_redirects where kind='quiz' and new_slug <> 'bts-hard-v3') = 0, 'no row points at a dead slug');

-- 3. renaming back to an old slug drops the redirect away from the live slug, no self loop
update public.quizzes set slug = 'bts-hard' where slug = 'bts-hard-v3';
select pg_temp.expect(not exists (select 1 from seo_slug_redirects where kind='quiz' and old_slug='bts-hard'), 'live slug never redirects');
select pg_temp.expect(not exists (select 1 from seo_slug_redirects where old_slug = new_slug), 'no self loop');
select pg_temp.expect((select count(*) from seo_slug_redirects where kind='quiz' and new_slug='bts-hard') = 2, 'both older slugs point at the live one');

-- 4. an update that does not touch the slug writes nothing
create temp table before_n as select count(*) n from seo_slug_redirects;
update public.quizzes set play_count = play_count + 1, title = 'BTS harder quiz' where slug = 'illit-one';
update public.quizzes set slug = slug where slug = 'illit-one';
select pg_temp.expect((select count(*) from seo_slug_redirects) = (select n from before_n), 'counter, title and same-slug updates write nothing');

-- 5. group slug change
update public.groups set slug = 'illit-new' where slug = 'illit';
select pg_temp.expect((select new_slug from seo_slug_redirects where kind='group' and old_slug='illit') = 'illit-new', 'group rename records old -> new');
select pg_temp.expect(not exists (select 1 from seo_slug_redirects where kind='quiz' and old_slug='illit'), 'kinds stay separate');

-- 6. merge path: the route records the deleted group's slug
set role service_role;
select public.seo_record_slug_redirect('group', 'old-dup', 'bts');
reset role;
select pg_temp.expect((select new_slug from seo_slug_redirects where kind='group' and old_slug='old-dup') = 'bts', 'service role records a merge redirect');

-- 7. a broken history table never blocks the rename
alter table seo_slug_redirects rename to seo_slug_redirects_parked;
update public.quizzes set slug = 'illit-one-b' where slug = 'illit-one';
select pg_temp.expect((select count(*) from public.quizzes where slug='illit-one-b') = 1, 'rename kept when the history table is missing');
alter table seo_slug_redirects_parked rename to seo_slug_redirects;

-- 8. roles: anon reads redirects, cannot write; nothing else is visible to anon
set role anon;
select pg_temp.expect((select count(*) from seo_slug_redirects) > 0, 'anon reads seo_slug_redirects');
do $$ begin
  begin insert into seo_slug_redirects (kind, old_slug, new_slug) values ('quiz', 'x-a', 'x-b'); raise exception 'FAIL: anon inserted';
  exception when insufficient_privilege then raise notice 'ok  anon cannot write seo_slug_redirects'; end;
  begin perform 1 from seo_ai_visits_daily; raise exception 'FAIL: anon read ai visits';
  exception when insufficient_privilege then raise notice 'ok  anon cannot read seo_ai_visits_daily'; end;
  begin perform public.seo_ai_visit_hit('chatgpt', '/'); raise exception 'FAIL: anon called hit';
  exception when insufficient_privilege then raise notice 'ok  anon cannot call seo_ai_visit_hit'; end;
  begin perform public.seo_record_slug_redirect('quiz', 'x-a', 'x-b'); raise exception 'FAIL: anon recorded';
  exception when insufficient_privilege then raise notice 'ok  anon cannot call seo_record_slug_redirect'; end;
  begin perform 1 from seo_watch_runs; raise exception 'FAIL: anon read runs';
  exception when insufficient_privilege then raise notice 'ok  anon cannot read seo_watch_runs'; end;
  begin perform 1 from seo_linked_urls; raise exception 'FAIL: anon read linked';
  exception when insufficient_privilege then raise notice 'ok  anon cannot read seo_linked_urls'; end;
end $$;
reset role;
set role authenticated;
do $$ begin
  begin perform public.seo_ai_visit_hit('chatgpt', '/'); raise exception 'FAIL: authenticated called hit';
  exception when insufficient_privilege then raise notice 'ok  authenticated cannot call seo_ai_visit_hit'; end;
end $$;
-- a signed-in user's own client renaming a quiz still records (definer trigger)
update public.quizzes set slug = 'illit-one-c' where slug = 'illit-one-b';
reset role;
select pg_temp.expect((select new_slug from seo_slug_redirects where kind='quiz' and old_slug='illit-one-b') = 'illit-one-c', 'rename by a non-service role still records');

-- 9. AI visits: counting, validation
set role service_role;
select public.seo_ai_visit_hit('chatgpt', '/bts-quiz');
select public.seo_ai_visit_hit('chatgpt', '/bts-quiz');
select public.seo_ai_visit_hit('perplexity', '/');
select public.seo_ai_visit_hit('bing', '/');
select public.seo_ai_visit_hit('gemini', 'not-a-path');
select public.seo_ai_visit_hit('gemini', '/a b');
select public.seo_ai_visit_hit('copilot', null);
reset role;
select pg_temp.expect((select visits from seo_ai_visits_daily where source='chatgpt' and path='/bts-quiz') = 2, 'hits counted per day, source and path');
select pg_temp.expect((select count(*) from seo_ai_visits_daily) = 2, 'unknown source and bad paths ignored');

-- 10. runs and linked URLs accept service role writes
set role service_role;
insert into seo_watch_runs (kind, ok, summary) values ('linked_urls', false, '1 linked URL failing');
insert into seo_linked_urls (path, source, expect_redirect) values ('/old-page', 'test', '/new-page');
reset role;
select pg_temp.expect((select count(*) from seo_watch_runs) = 1, 'service role logs a run');
